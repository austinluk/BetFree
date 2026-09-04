# External Integrations

## Supabase (`src/lib/supabase.ts`)
- Email + OAuth (Apple, Google) authentication
- PostgreSQL database with Row-Level Security
- RPC functions for streak/relapse logic (`handle_checkin`, `handle_relapse`)
- Real-time subscriptions (planned: live community feed updates)
- Env vars: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Edge Functions
| Function | File | Purpose |
|---|---|---|
| `delete-account` | `supabase/functions/delete-account/index.ts` | Deletes the caller's `auth.users` record using the service role key. Called by `doDeleteAccount()` in `profile.tsx` after all data rows are deleted. Requires `SUPABASE_SERVICE_ROLE_KEY` set in Supabase dashboard → Project Settings → Edge Functions. **Must be deployed via `supabase functions deploy delete-account` before launch.** |

## RevenueCat (`src/lib/revenuecat.ts`)
- Subscription offerings fetched on app launch
- Purchase flow triggered from the paywall screen
- Entitlements stored in `useUserStore.isPremium`
- Webhook updates `profiles.premium_status` in Supabase after purchase
- Env vars: `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`

## Mixpanel (`src/lib/analytics.ts`)
- Event tracking on all major user actions
- Key funnels: install → onboarding → first check-in → paywall → conversion
- Env var: `EXPO_PUBLIC_MIXPANEL_TOKEN`

## Sentry
- Crash reporting and error tracking in production builds
- Env var: `EXPO_PUBLIC_SENTRY_DSN`

## Expo Notifications (`src/lib/notifications.ts`)
- Scheduled daily check-in reminders
- Streak milestone alerts
- All notification preview text is generic — must never mention gambling (see [DEVELOPER_NOTES.md](DEVELOPER_NOTES.md))

## OneSignal (planned)
- Segmented push notification campaigns
- High-engagement user targeting
- Currently a placeholder — set up segmentation before launch
- Env var: `EXPO_PUBLIC_ONESIGNAL_APP_ID`

## Sports Calendar API (`src/lib/sports-calendar.ts`)
- Fetches upcoming major sporting events
- Triggers an in-app warning 24 hours before high-risk moments (Super Bowl, UFC cards, etc.)
- Env var: `EXPO_PUBLIC_SPORTS_API_KEY`
