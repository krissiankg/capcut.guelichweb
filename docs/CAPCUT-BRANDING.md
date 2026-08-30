# Personnalisations CapCut Studio (apps/web)

Fichiers modifiés par rapport au fork upstream OpenReel pour le branding **CapCut Studio · GUELICHWEB** :

## Interface & marque

- `apps/web/index.html` — titre, meta, favicon
- `apps/web/public/manifest.json` — PWA name/short_name
- `apps/web/public/sw.js` — cache name
- `apps/web/src/components/welcome/WelcomeScreen.tsx` — écran d'accueil
- `apps/web/src/desktop/brand/OpenReelMark.tsx` — logo/marque
- `apps/web/src/motion/components/MotionBrandMark.tsx` — marque motion
- `apps/web/src/desktop/shell/DesktopTitleBar.tsx` — barre de titre
- `apps/web/src/desktop/UpdateBanner.tsx` — bannière mise à jour
- `apps/web/src/pages/SharePage.tsx` — page partage

## Paramètres & textes

- `apps/web/src/components/editor/settings/GeneralPanel.tsx`
- `apps/web/src/components/editor/settings/McpPanel.tsx`
- `apps/web/src/components/editor/tour/tour-steps.ts`
- `apps/web/src/components/MobileBlocker.tsx`
- `apps/web/src/components/editor/chat/ChatErrorCard.tsx`
- `apps/web/src/components/editor/chat/ProviderModelPicker.tsx`
- `apps/web/src/components/editor/inspector/TextAnimationSection.tsx`
- `apps/web/src/components/editor/inspector/TextAnimationSection.preview.test.tsx`
- `apps/web/src/components/editor/inspector/TextToSpeechPanel.tsx`
- `apps/web/src/services/keyboard-shortcuts.ts`
- `apps/web/src/services/project-manager.ts`

## Packages (agent / core)

- `packages/agent/src/gen-docs.ts`
- `packages/agent/src/registry.ts`
- `packages/agent/src/system-prompt.ts`
- `packages/core/src/editing-templates/built-in-templates.ts`
- `packages/core/src/motion/motion-presets.ts`
- `packages/core/src/multicam/orma.ts`
- `packages/core/src/multicam/otio.ts`
- `packages/core/src/storage/project-serializer.ts`

## Build

```bash
pnpm install
pnpm build   # produit apps/web/dist → déployé vers /www/wwwroot/capcut.guelichweb.store
```

Les changements sont principalement des remplacements de texte « OpenReel » → « CapCut Studio » et ajustements de marque GUELICHWEB.
