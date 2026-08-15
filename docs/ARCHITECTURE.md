# Architecture

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Mobile Framework | React Native (Expo ~54) | Cross-platform iOS/Android/Web |
| Language | TypeScript 5.9 | Type safety throughout |
| Backend/DB | Supabase (PostgreSQL + Auth) | Auth, real-time data, RLS security |
| Navigation | Expo Router 6 | File-based routing (like Next.js) |
| State | Zustand | Global app state (user, streak, avatar) |
| Subscriptions | RevenueCat | App Store/Play Store billing |
| Notifications | Expo Notifications + OneSignal (planned) | Scheduled alerts, segmentation |
| Analytics | Mixpanel | Event tracking, funnel analysis |
| Error Tracking | Sentry | Crash reporting |
| Testing | Jest + jest-expo | Unit/integration tests |

> Always reference the exact versioned Expo docs: https://docs.expo.dev/versions/v54.0.0/

---

## Directory Structure

```
BetFree/
├── src/
│   ├── app/                        # Expo Router pages (file-based routing)
│   │   ├── (auth)/                 # Unauthenticated flow
│   │   │   ├── _layout.tsx
│   │   │   ├── discovery.tsx       # Pre-onboarding intro
│   │   │   ├── quiz.tsx            # 8-question symptom quiz
│   │   │   ├── result.tsx          # Quiz result reveal
│   │   │   ├── stats.tsx           # Data visualization
│   │   │   ├── pitch.tsx           # Feature pitch (3-card swipe)
│   │   │   ├── onboarding.tsx      # Bet type, amount, last bet date
│   │   │   ├── trial-offer.tsx     # 7-day free trial offer
│   │   │   ├── login.tsx           # Email/Apple/Google sign-in
│   │   │   └── forgot-password.tsx
│   │   ├── (tabs)/                 # Authenticated bottom tab navigation
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx           # Home: streak + money saved
│   │   │   ├── progress.tsx        # Streak history, badges, urge trends
│   │   │   ├── community.tsx       # Community feed
│   │   │   ├── tools.tsx           # CBT modules, trigger journal
│   │   │   ├── mycat.tsx           # Avatar customization
│   │   │   └── profile.tsx         # Settings, subscription
│   │   ├── _layout.tsx             # Root layout (auth state + routing)
│   │   ├── checkin.tsx             # Modal: daily check-in
│   │   ├── sos.tsx                 # Modal: urge response protocol
│   │   ├── relapse.tsx             # Modal: relapse flow
│   │   ├── paywall.tsx             # Modal: subscription upsell
│   │   ├── resources.tsx           # Crisis hotline + GA finder
│   │   ├── partner-chat.tsx        # Accountability partner messaging
│   │   ├── avatar-shop.tsx         # Avatar item store
│   │   ├── commitment-vault.tsx    # Modal: record/manage vault messages
│   │   ├── ledger.tsx              # Modal: monthly financial statement
│   │   ├── urge-pattern.tsx        # Urge pattern intelligence analysis
│   │   └── pregame.tsx             # Modal: pre-game mode for high-risk events
│   ├── components/
│   │   ├── streak/
│   │   │   ├── StreakCounter.tsx
│   │   │   └── MoneySaved.tsx
│   │   ├── quiz/
│   │   │   └── QuizQuestion.tsx
│   │   └── ui/
│   │       ├── SOSButton.tsx
│   │       └── CatAvatar.tsx
│   ├── store/
│   │   ├── useUserStore.ts         # Auth state, profile, onboarding status
│   │   ├── useStreakStore.ts        # Streak data + savings calculator
│   │   └── useAvatarStore.ts       # Avatar items, recovery points
│   ├── hooks/
│   │   ├── useStreak.ts            # fetchStreak, checkIn, logRelapse
│   │   └── usePremium.ts           # Subscription status
│   ├── lib/
│   │   ├── supabase.ts             # Supabase client
│   │   ├── revenuecat.ts           # RevenueCat setup + entitlement checks
│   │   ├── notifications.ts        # Expo Notifications scheduling
│   │   ├── analytics.ts            # Mixpanel event tracking
│   │   └── sports-calendar.ts      # Upcoming sports events (high-risk warnings)
│   ├── constants/
│   │   ├── theme.ts                # Colors, spacing, radius, fonts
│   │   ├── notification-copy.ts    # Notification message templates
│   │   └── cbt-modules.ts          # CBT lesson content
│   ├── types/
│   │   └── index.ts                # Shared types: Profile, Streak, CheckIn, etc.
│   └── __tests__/
│       ├── streak.test.ts
│       ├── notifications.test.ts
│       ├── sports-calendar.test.ts
│       ├── ledger.test.ts
│       ├── urge-pattern.test.ts
│       ├── motivational-notifications.test.ts
│       ├── checkin-amount-spent.test.ts
│       ├── relapse-autopsy.test.ts
│       └── commitment-vault.test.ts
├── supabase/                       # Database schema and migrations
├── assets/                         # Icons, splash screens, images
├── docs/                           # Developer documentation
├── android/                        # Native Android config
├── app.json                        # Expo config (bundle IDs, plugins, EAS project ID)
├── eas.json                        # EAS build config
├── babel.config.js
├── tsconfig.json
└── package.json
```

---

## Navigation Architecture

Expo Router uses file-based routing — the folder/file name is the route.

```
Root _layout.tsx
├── (auth)/                         — Unauthenticated users
│   ├── discovery                   — Cinematic intro hook
│   ├── quiz → result → stats       — Symptom quiz sequence (DSM-5 criteria)
│   ├── pitch                       — Feature overview (3-card swipe)
│   ├── onboarding                  — Bet type, weekly amount, last bet date
│   ├── trial-offer                 — Free trial CTA
│   ├── login                       — Email / Apple / Google sign-in
│   └── forgot-password
│
└── (tabs)/                         — Authenticated users (bottom tab nav)
    ├── index (Home)                — Streak counter, money saved, check-in CTA
    ├── progress                    — Streak history, badges, urge trend graphs
    ├── community                   — Feed, upvotes, post creation
    ├── tools                       — CBT modules, trigger journal
    ├── mycat                       — Cat avatar shop + customization
    └── profile                     — Settings, subscription, privacy, data export

Modal overlays (stack on top of tabs):
├── checkin                         — Daily check-in form
├── sos                             — Full-screen 5-step urge response
├── relapse                         — Compassionate relapse reset flow
├── paywall                         — Subscription upsell
├── resources                       — Crisis hotline + GA meeting finder
├── partner-chat                    — Accountability partner DMs
├── avatar-shop                     — Avatar item store
├── commitment-vault                — Vault message management
├── ledger                          — Monthly financial statement
└── pregame                         — Pre-game mode activation + game state UI

Standard push screens (not modals):
└── urge-pattern                    — Urge pattern intelligence analysis (pushed from Progress tab)
```
