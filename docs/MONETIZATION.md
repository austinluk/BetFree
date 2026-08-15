# Monetization

## Pricing Tiers

| Tier | Price | What's included |
|---|---|---|
| Free Forever | $0 | Streak, savings calculator, 7-day urge log, 3 community posts/month |
| Premium Monthly | $9.99/mo | All features, unlimited |
| Premium Annual | $59.99/yr | All features, unlimited (~50% savings) |
| Lifetime | $149 one-time | All features, unlimited |

## Paywall Gates

| Gate | Trigger | What's gated |
|---|---|---|
| Gate 1 | Day 3–7 (urge log fills up) | Full urge log history — free tier shows 7 days only |
| Gate 2 | Crisis moment | SOS button — free tier gets 3 uses/month |
| Gate 3 | Day 14 | Unlimited community posts — free tier gets 3/month |
| Gate 4 | Any time | Accountability partner matching |
| Gate 5 | Commitment Vault | Multiple vault messages (free: 1 text message; premium: unlimited + audio) |
| Gate 6 | Ledger History | Full statement history + running total (current month always free) |

**Rule: Never gate at onboarding or login. First paywall is Day 3–7.**

> All 5 signature features (Ledger, Pre-Game Mode, Urge Pattern Intelligence, Relapse Autopsy, Commitment Vault) have a meaningful free tier. The premium version of each feature is gated, but the core value — the thing that drives retention — is always accessible to free users.

## RevenueCat Integration

- Subscription offerings are fetched on app launch via `src/lib/revenuecat.ts`
- Purchase flow is triggered from `src/app/paywall.tsx`
- Entitlements are checked and stored in `useUserStore.isPremium`
- A RevenueCat webhook updates `premium_status` in Supabase after a successful purchase

### Keys
The `.env` file currently contains **sandbox** keys. Replace before App Store / Play Store submission:
```
EXPO_PUBLIC_REVENUECAT_IOS_KEY=<production key>
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=<production key>
```
