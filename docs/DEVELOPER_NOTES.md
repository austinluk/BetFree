# Critical Developer Notes

Rules every contributor must know before touching this codebase.

---

**1. Streak is always server-side.**
Never write `current_streak_days` from the client. Always call the `handle_checkin()` RPC. It owns all streak math and prevents client clock manipulation.

**2. Relapse is compassionate.**
On relapse, `current_streak_days` resets to 0 but `total_clean_days` is preserved and shown prominently. Users must always see their lifetime effort — never zero it out.

**3. No variable rewards.**
Milestones and badges use fixed, predictable thresholds (Day 1/3/7/14/30/90/180/365). Do not add randomised rewards. This is intentional — it avoids mimicking slot-machine psychology.

**4. Push notification copy never mentions gambling.**
From the device lock screen, BetFree must look like a generic wellness app. Every notification message must pass that test before shipping.

**5. RLS is non-negotiable.**
Every new Supabase table must have Row-Level Security policies. Users must never be able to read or write another user's data.

**6. First paywall is Day 3–7.**
Never add a paywall to onboarding or the login screen. The user needs to experience value before being asked to pay.

**7. RevenueCat `.env` keys are sandbox.**
Replace `EXPO_PUBLIC_REVENUECAT_IOS_KEY` and `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` with production keys before App Store / Play Store submission.

**8. Community posts are auto-flagged by `bad-words`.**
Flagged posts (`flagged = true`) require admin review. At MVP scale this is a manual daily check.

**9. No site-blocking in MVP.**
BetFree complements tools like BetBlocker — it does not replace them. Do not build URL or app blocking features.

**10. Expo version pinning.**
The project targets Expo ~54. Always check https://docs.expo.dev/versions/v54.0.0/ before installing or upgrading packages — the Expo SDK has breaking changes between versions.

**11. Commitment Vault content is user-private.**
Never log vault content, include it in analytics event payloads, or transmit it to any third party. Text content stays in Supabase only. Future audio files will use Supabase Storage with server-side encryption. Never reference vault content in crash reports or error logs.

**12. `amount_spent` does not feed the savings calculator.**
The savings calculator always uses `weekly_bet_estimate × total_clean_days / 7`. The `amount_spent` field on `checkins` is raw user-reported data for future analysis only. Never update `weekly_bet_estimate` from `amount_spent` values. Never show `amount_spent` aggregates as "total lost" — that framing is harmful.

**13. Urge Pattern Intelligence must use client-side fallback.**
The `compute_user_insight()` RPC runs weekly server-side. The `urge-pattern.tsx` screen always re-computes client-side from the last 30 check-ins when no server insight exists OR when `computed_at` is older than 7 days. Never show a stale danger window without re-computing. The 14-check-in minimum is a guard in both the client function and the RPC.

**14. Pre-Game Mode is opt-in only.**
Never auto-activate Pre-Game Mode. Always require explicit user tap on "Activate Pre-Game Mode". Sport preferences in Profile determine which events are surfaced, but the user must choose to activate for each individual event. Do not activate silently on app open or via push notification.

**15. Relapse Autopsy is always optional.**
Never block the post-relapse flow on autopsy completion. The "Skip for now" button must always be prominently visible (never hidden, disabled, or delayed). Autopsy data is for the user's benefit only — never used in marketing, segmentation, or external reporting.

---

## Documentation Rule

Every code change must update the relevant file in `docs/` before the task is marked complete:

- New/modified feature → [FEATURES.md](FEATURES.md)
- New screen, component, store, hook → directory structure in [ARCHITECTURE.md](ARCHITECTURE.md)
- Schema change → [DATABASE.md](DATABASE.md)
- New integration → [INTEGRATIONS.md](INTEGRATIONS.md)
- New constraint or rule → this file
