# Expo Snack demo (for embedding on the docs page)

This directory is a **self-contained [Expo Snack](https://snack.expo.dev)** project
that shows the same demo as `../` (the full `apps/expo-demo`), used to power the
embedded live demo on the `react-native.html` docs page.

## How it resolves dependencies

The snack depends on the **published npm packages** `@spirograph/core`,
`@spirograph/anim` and `@spirograph/react-native` (all version `0.1.1`), plus the
standard Expo / React Native platform deps. Snack installs them automatically
from `package.json` — there is **no inlined `src/lib/`** to keep in sync.

`App.tsx` is a compact, self-contained version of the demo UI.

## Publishing / updating the snack & wiring up the page

1. Open <https://snack.expo.dev/> and create a new project (you need an Expo
   account).
2. Drag these files into the editor (or use the "Upload files" in the left
   panel):
   - `App.tsx`
   - `package.json`
3. Snack installs `@spirograph/core` / `@spirograph/anim` /
   `@spirograph/react-native` / `react-native-svg` automatically from the
   `package.json`. Wait for it to resolve (no red errors in the bottom bar).
4. Save / Publish the snack and copy its **id** (the URL slug after
   `snack.expo.dev/`, e.g. `@yourname/spirograph` or a short id).
5. Paste it into **`src/demos/react-native/snackConfig.ts`** as `SNACK_ID` and
   rebuild the web app (`npm run build`).

To update an already-published snack, open its `snack.expo.dev/<id>` page, edit,
and Save — the id stays the same and the page picks up the latest automatically.

## Manual run (no Snack)

You don't need a Snack to run the demo — from `apps/expo-demo`:
`npx expo start` (scan with Expo Go) or `npx expo start --web`.
