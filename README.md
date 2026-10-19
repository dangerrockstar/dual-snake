# Dual Snake

A retro, Nokia-inspired snake game for iOS and Android, built with Expo SDK 57 and React Native. The game is offline and has no ads, analytics, accounts, or networked gameplay. Best score and sound preference are stored locally on the device.

## Play

- Use the directional pad to steer the active end of the snake.
- Tap **REVERSE** to switch control to the other end.
- Collect apples to grow and score. After five or six apples, a bonus item appears; collect it before its six-second timer expires to earn 30 bonus points.
- Choose slow, normal, or fast speed. The snake gets faster as your score climbs.
- Turn sound on or off with the sound button. Original, synthesized arcade cues play for starting, eating, reversing, and game over.

Sound assets are generated locally from the source in `assets/generate-sounds.mjs`; they are original effects, not sampled songs or meme clips. Regenerate them with `node assets/generate-sounds.mjs`.

## Develop and verify

```sh
npm ci
npx expo start --clear
```

Before a release, run:

```sh
npm test
npm run typecheck
npx expo install --check
npx expo-doctor
```

The game rules for reversal, bonus timing and points, speed, and collision behavior have focused automated tests in `src/game.test.ts`.

## Prepare store accounts

You need an Expo account and separate developer accounts for the stores:

- [Expo](https://expo.dev/signup)
- [Apple Developer Program](https://developer.apple.com/programs/)
- [Google Play Console](https://play.google.com/console/)

Create the app records in App Store Connect and Play Console using the identifiers in `app.json` (`com.dualsnake.game`). Identifiers cannot be changed after an app is published, so confirm them before the first store release.

## Build for both stores

Install EAS CLI through `npx` and sign in:

```sh
npx eas-cli@latest login
npx eas-cli@latest init
npm run build:production
```

`eas init` links this repository to a new or existing EAS project under the Expo account you choose. The production profile in `eas.json` produces an Android App Bundle (`.aab`) and an iOS App Store build. EAS prompts you to create or select signing credentials. Keep credentials private; do not commit them. The production profile automatically increments the remote native build numbers.

For a test build before production, run `npm run build:preview`. Android receives an installable APK; iOS internal distribution requires registered test devices. Alternatively, use TestFlight and a Play Console testing track with production-signed builds.

## Submit and publish

### iOS

1. Create the app in App Store Connect with bundle ID `com.dualsnake.game`.
2. Build with `npm run build:production`, then upload the latest iOS build:

   ```sh
   npx eas-cli@latest submit --platform ios --latest
   ```

3. In App Store Connect, complete the listing, age rating, privacy details, screenshots, pricing, and availability. Test with TestFlight, select the processed build, and submit it for App Review.
4. After approval, release it manually or use the release option selected in App Store Connect.

### Android

1. Create the app in Play Console with package name `com.dualsnake.game`.
2. Build with `npm run build:production`. Upload the `.aab` to a Play testing track, either from the EAS build page or with EAS Submit:

   ```sh
   npx eas-cli@latest submit --platform android --latest
   ```

   EAS Submit needs a Google Play service-account key configured through EAS credentials. You can also download the `.aab` and upload it in Play Console.
3. Complete the store listing, screenshots, content rating, Data safety form, privacy details, and any testing requirements shown in Play Console. Test the release, then promote it to production and submit it for review.

Prepare original store screenshots and listing copy for both stores. Report data collection accurately: this game currently has no account, advertising, analytics, or network features, and saves its best score and sound setting locally. Revisit the privacy disclosures if you add services or collect data later.

Store approval and publication are controlled by Apple and Google. You will need your own store accounts, app records, and signing credentials to complete those steps.
