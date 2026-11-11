# apilagame.com

Landing page, privacy policy and support page for **Apila: Flower Friends**, built with Next.js (App Router). Every page is prerendered as static HTML.

| Route | File |
|---|---|
| `/` | `src/app/page.tsx` |
| `/privacy` | `src/app/privacy/page.tsx` |
| `/support` | `src/app/support/page.tsx` |

Shared details (owner, contact email, site URL) are in `src/lib/site.ts`. Images are in `public/assets`, copied from the app's asset catalog.

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
```

The privacy policy mirrors `Design/AppStore/privacy-policy.md` in the Apila app repo. When you change one, update the other and bump `LAST_UPDATED` in the privacy page.

## Deploy

Import this repo into Vercel (it detects Next.js automatically), then add `apilagame.com` under Project → Settings → Domains.

## The 3D Apila

The hero shows Apila's real 3D model from the app, drawn live with three.js (`src/components/avatar/`): her mesh is skinned on the GPU and shaded with a port of the app's `AvatarShaders.metal`, and `animator.ts` is a port of the app's `AvatarAnimator` (idle, glances, blinking, ear flicks, nod). Drag to turn her, tap to make her nod; her eyes follow the mouse. Until it loads, or with reduced motion or no WebGL, the still `public/assets/apila-hero.png` shows instead.

The model and every still render come from the app itself. To regenerate them after changing her in the app:

1. Copy `scripts/AvatarExportTests.swift.txt` into the app's `ApilaTests/` as `LandingRenderTests.swift`.
2. Run it on a simulator: `xcodebuild test -project Apila.xcodeproj -scheme Apila -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -only-testing:ApilaTests/LandingRenderTests`. It writes to `/private/tmp/apila-landing-renders/`.
3. `python3 scripts/pack-avatar.py /private/tmp/apila-landing-renders/model apila public/models` and copy `skeleton.json` into `public/models/`.
4. Delete the test file from the app again.

Keep `animator.ts` in step with `AvatarSkeleton.swift` if her motion changes there.

## The 3D planet

The privacy section shows the app's plain, unpainted planet (no account or garden needed): its ground and ground cover exported from the app and drawn with a port of `PlanetShaders.metal` (`src/components/planet/`), including the grass swaying and the water shimmering, and the tone curve the app's camera applies so the colours match. It turns slowly; drag to spin it. It loads only as the section comes near. To regenerate: copy `scripts/PlanetExportTests.swift.txt` into the app's `ApilaTests/` as `LandingRenderTests.swift`, run it as above (it writes `/private/tmp/apila-landing-renders/planet/`, including `reference.png`, a render with the app's own shader to compare against), then `python3 scripts/pack-planet.py /private/tmp/apila-landing-renders/planet public/models 0.4` (the last number is the share of grass clumps kept), and delete the test from the app.
