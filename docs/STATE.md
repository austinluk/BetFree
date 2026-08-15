# State Management & Auth

## Zustand Stores

Three global stores live in `src/store/`.

### useUserStore (`src/store/useUserStore.ts`)
```ts
profile           // Logged-in user's profile row from Supabase
isLoading         // True during the initial auth check on app launch
isOnboarded       // Whether the user has completed onboarding
isPremium         // RevenueCat entitlement status
skipAuthRedirect  // Prevents redirect loop while onboarding is in progress
```

### useStreakStore (`src/store/useStreakStore.ts`)
```ts
currentStreak       // Days clean — resets to 0 on relapse
longestStreak       // Best streak ever achieved — never decreases
totalCleanDays      // Cumulative clean days across all streaks — never resets
weeklyBetEstimate   // User's self-reported weekly betting amount (set in onboarding)

// Derived selector (not stored, computed on read):
useMoneySaved()     // totalCleanDays * weeklyBetEstimate / 7
```

### useAvatarStore (`src/store/useAvatarStore.ts`)
```ts
recoveryPoints  // Points earned from milestones and badges
ownedItems      // Array of unlocked avatar item IDs
equipped        // { hat, outfit, background, accessory } — currently equipped items
```

---

## Authentication Flow

1. **Supabase Auth** — Email + Apple Sign-In + Google Sign-In
2. **Token storage:**
   - iOS/Android: `expo-secure-store` (encrypted, hardware-backed)
   - Web: `localStorage`
3. **Session persistence:** Supabase `onAuthStateChange` listener auto-refreshes tokens
4. **RevenueCat sync:** User is identified to RevenueCat immediately after sign-in so subscription entitlements sync correctly across devices
