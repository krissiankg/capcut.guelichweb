import { io } from "socket.io-client";
import { readFileSync, writeFileSync, chmodSync } from "fs";
import { randomBytes } from "crypto";

const KUMA_URL = process.env.KUMA_URL || "http://127.0.0.1:3001";
const ENV_PATH =
  process.env.PORTAL_ENV || "/www/wwwroot/capcut.guelichweb.store-portal/.env";
const ALERT_EMAIL = process.env.KUMA_ALERT_EMAIL || "christ@guelichweb.online";
const CREDENTIALS_FILE =
  process.env.KUMA_CREDENTIALS_FILE ||
  "/www/wwwroot/capcut.guelichweb.store-portal/deploy/monitoring/.kuma-admin.env";

function loadEnv(path) {
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

function emitWithCallback(socket, event, ...args) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout on ${event}`)), 20000);
    socket.emit(event, ...args, (res) => {
      clearTimeout(timer);
      resolve(res);
    });
  });
}

function waitForEvent(socket, event) {
  return new Promise((resolve) => {
    socket.once(event, resolve);
  });
}

function extractEmail(from) {
  const m = from.match(/<([^>]+)>/);
  return m ? m[1] : from;
}

function generatePassword() {
  return `Kuma${randomBytes(12).toString("base64url")}9`;
}

const monitors = [
  {
    name: "CapCut — Accueil",
    url: "https://capcut.guelichweb.store/",
    interval: 60,
  },
  {
    name: "CapCut — Health API",
    url: "https://capcut.guelichweb.store/api/health",
    interval: 60,
    keyword: '"status":"ok"',
  },
  {
    name: "CapCut — Connexion",
    url: "https://capcut.guelichweb.store/connexion",
    interval: 120,
  },
];

async function main() {
  const env = loadEnv(ENV_PATH);
  const resendKey = env.RESEND_API_KEY;
  const smtpFrom = extractEmail(env.EMAIL_FROM || "noreply@guelichweb.store");
  if (!resendKey) throw new Error("RESEND_API_KEY missing in portal .env");

  const socket = io(KUMA_URL, { transports: ["websocket"], reconnection: false });
  await new Promise((resolve, reject) => {
    socket.on("connect", resolve);
    socket.on("connect_error", reject);
  });

  const needsSetup = await emitWithCallback(socket, "needSetup");
  let adminPassword = process.env.KUMA_ADMIN_PASSWORD;

  if (needsSetup) {
    adminPassword = adminPassword || generatePassword();
    const setup = await emitWithCallback(socket, "setup", "admin", adminPassword);
    if (!setup?.ok) throw new Error(`Setup failed: ${setup?.msg || "unknown"}`);

    writeFileSync(CREDENTIALS_FILE, `KUMA_ADMIN_USER=admin\nKUMA_ADMIN_PASSWORD=${adminPassword}\n`, {
      mode: 0o600,
    });
    chmodSync(CREDENTIALS_FILE, 0o600);
    console.log("SETUP_OK");
    console.log(`CREDENTIALS_FILE=${CREDENTIALS_FILE}`);
  } else if (!adminPassword) {
    try {
      const creds = loadEnv(CREDENTIALS_FILE);
      adminPassword = creds.KUMA_ADMIN_PASSWORD;
    } catch {
      adminPassword = undefined;
    }
    if (!adminPassword) {
      throw new Error(
        "KUMA_ADMIN_PASSWORD or credentials file required (instance already initialized)",
      );
    }
  }

  const notificationPromise = waitForEvent(socket, "notificationList");
  const monitorPromise = waitForEvent(socket, "monitorList");

  const login = await emitWithCallback(socket, "login", {
    username: "admin",
    password: adminPassword,
    token: "",
  });
  if (!login?.ok) throw new Error(`Login failed: ${login?.msg || "unknown"}`);
  console.log("LOGIN_OK");

  const [notificationList, monitorList] = await Promise.all([
    notificationPromise,
    monitorPromise,
  ]);

  let notificationId = notificationList.find((n) => n.name === "CapCut Alerts")?.id;

  if (!notificationId) {
    const notif = await emitWithCallback(
      socket,
      "addNotification",
      {
        name: "CapCut Alerts",
        type: "smtp",
        isDefault: true,
        applyExisting: true,
        smtpHost: "smtp.resend.com",
        smtpPort: 465,
        smtpSecure: true,
        smtpIgnoreTLSError: false,
        smtpUsername: "resend",
        smtpPassword: resendKey,
        smtpFrom,
        smtpTo: ALERT_EMAIL,
      },
      null,
    );
    if (!notif?.ok) {
      throw new Error(`Notification failed: ${notif?.msg || JSON.stringify(notif)}`);
    }
    notificationId = notif.id;
    console.log(`NOTIFICATION_ID=${notificationId}`);

    const test = await emitWithCallback(socket, "testNotification", {
      name: "CapCut Alerts",
      type: "smtp",
      smtpHost: "smtp.resend.com",
      smtpPort: 465,
      smtpSecure: true,
      smtpIgnoreTLSError: false,
      smtpUsername: "resend",
      smtpPassword: resendKey,
      smtpFrom,
      smtpTo: ALERT_EMAIL,
    });
    if (!test?.ok) {
      console.warn(`TEST_NOTIFICATION_WARN=${test?.msg || "failed"}`);
    } else {
      console.log("TEST_NOTIFICATION_OK");
    }
  } else {
    console.log(`NOTIFICATION_EXISTS=${notificationId}`);
  }

  const existingNames = new Set(Object.values(monitorList).map((m) => m.name));

  for (const m of monitors) {
    if (existingNames.has(m.name)) {
      console.log(`MONITOR_SKIP=${m.name}`);
      continue;
    }

    const payload = {
      type: "http",
      name: m.name,
      url: m.url,
      method: "GET",
      interval: m.interval,
      retryInterval: 60,
      maxretries: 3,
      active: true,
      accepted_statuscodes: ["200-299"],
      notificationIDList: { [String(notificationId)]: true },
    };
    if (m.keyword) payload.keyword = m.keyword;

    const created = await emitWithCallback(socket, "add", payload);
    if (!created?.ok) {
      throw new Error(`Monitor ${m.name} failed: ${created?.msg || JSON.stringify(created)}`);
    }
    console.log(`MONITOR_OK=${m.name} id=${created.monitorID}`);
  }

  socket.disconnect();
  console.log("DONE");
}

main().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
