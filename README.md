# Dual Snake

A retro, Nokia-inspired snake game built with Expo SDK 57 and React Native for iOS and Android.

## Play

- Use the directional pad to steer the active end of the snake.
- Tap **REVERSE** to switch control to the other end. The new head continues outward from that end.
- Collect apples to grow and score points. Avoid the walls and your own body.

## Run on a device

Install dependencies, then start Expo:

```sh
npm install
npx expo start --clear
```

Scan the QR code with the current Expo Go app on iOS or Android. The `--clear` option removes any cached SDK 54 bundle. You can also run `npm run ios` or `npm run android` with the matching native development environment installed.
