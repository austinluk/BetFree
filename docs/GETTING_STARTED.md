# Getting Started

## Prerequisites

- Node.js (LTS)
- Expo CLI: `npm install -g expo-cli`
- iOS: Mac with Xcode
- Android: Android Studio + emulator or physical device

## Setup

```bash
npm install
npm start
```

## Platform Targets

```bash
npm run android    # Android emulator/device
npm run ios        # iOS Simulator (Mac only)
npm run web        # Browser
```

## Tests & Lint

```bash
npm test
npm run lint
```

## Production Builds (EAS)

```bash
eas build --platform android
eas build --platform ios
```

## Environment Variables

`.env` is already committed with everything needed to run locally:

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_REVENUECAT_IOS_KEY=...       # sandbox key
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=...   # sandbox key
EXPO_PUBLIC_ONESIGNAL_APP_ID=placeholder
EXPO_PUBLIC_MIXPANEL_TOKEN=placeholder
EXPO_PUBLIC_SENTRY_DSN=placeholder
EXPO_PUBLIC_SPORTS_API_KEY=placeholder
```

All `EXPO_PUBLIC_` variables are bundled at build time. **Never put secrets here.**

Before App Store / Play Store submission, replace the RevenueCat sandbox keys with production keys.
