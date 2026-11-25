# apilagame.com

Landing page, privacy policy and support page for **Apila: Flower Friends**, built with Next.js (App Router). Every page is prerendered as static HTML.

| Route | File |
|---|---|
| `/` | `src/app/page.tsx` |
| `/privacy` | `src/app/privacy/page.tsx` |
| `/support` | `src/app/support/page.tsx` |
| `/terms` | `src/app/terms/page.tsx` |

Shared details (owner, contact email, site URL) are in `src/lib/site.ts`. Images are in `public/assets`, copied from the app's asset catalog.

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
```

The privacy policy mirrors `Design/AppStore/privacy-policy.md` in the Apila app repo. When you change one, update the other and bump `LAST_UPDATED` in the privacy page. The same goes for `Design/AppStore/terms.md` and the terms page.

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

### Its plants

The plants and friendship trees growing over it are the app's own models (`src/components/planet/flora.ts`): sakura, jacaranda, maple, ginkgo and the other trees, flowers from the species catalog, and cacti on the beaches, built by the app's `PlantBuilder` exactly as on the phone. They're drawn instanced, with the app's `plantSway` and `plantSurface` light ported to GLSL, sprouting from the side facing you, filling the planet, then withering, in a loop. The camera stands back far enough to fit the tallest of them. To regenerate (say after a model changes in the app):

1. Copy `scripts/PlantExportTests.swift.txt` into the app's `ApilaTests/` as `LandingRenderTests.swift` (the list of models is at its top) and run it as above. It writes `/private/tmp/apila-landing-renders/plants/`.
2. `node scripts/pack-plants.mjs /private/tmp/apila-landing-renders/plants public/models`. The app's meshes are made for close-ups (a grown tree is ~200k vertices), so this simplifies each to a triangle budget and turns massed leaves into flat cards so crowns stay full.
3. Delete the test from the app again.
