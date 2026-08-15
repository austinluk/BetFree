# Features

## Streak Counter
Large visible day count on the Home screen. `current_streak_days` resets on relapse; `total_clean_days` never decreases so users always see their lifetime progress alongside the current streak.

## Money Saved Calculator
```
moneySaved = totalCleanDays × weeklyBetEstimate / 7
```
`weeklyBetEstimate` is set during onboarding via the weekly bet amount slider.

## Daily Check-In (~30 seconds)
- Urge level slider (1–10)
- Mood picker (5 icons: great → terrible)
- Trigger multi-select
- Optional free-text notes
- **Amount spent today** — optional `$` decimal input at bottom of form; defaults to `0`; passed as `amount_spent` to the `checkIn` hook; users enter `$0` if they stayed clean
- Always written via the `handle_checkin()` RPC — never written directly by the client

## SOS Protocol
Full-screen modal (dark theme). Loads a **Commitment Vault pre-step** before the 5-step protocol if the user has an active vault entry:
- Shows the vault entry text and how many days ago it was recorded
- CTA: "I remember. Let's get through this." → proceeds to protocol
- Skip: exits back to home

5-step timed urge response:
1. Breathe — box breathing animation (breathing circle)
2. Name it — label the urge out loud
3. Recall your reason — show the user's personal motivation
4. Delay 10 minutes — countdown timer (locked advance until complete)
5. Log the win — mark the urge as survived (+25 recovery points)

Completing all 5 steps awards 25 recovery points via `useAvatarStore.addRecoveryPoints`. Session tracked in `sos_sessions` table.

## CBT Modules (4 lessons)
Located in `src/constants/cbt-modules.ts`:
1. Understanding your triggers
2. Cognitive distortions
3. Urge surfing
4. Relapse prevention planning

## Trigger Journal
Standalone logging of triggers outside of the daily check-in. Feeds the urge trend graphs on the Progress screen.

## Milestones & Badges
Fixed thresholds — Day 1, 3, 7, 14, 30, 90, 180, 365 — plus savings milestones ($100, $1,000). No randomized rewards. See [DEVELOPER_NOTES.md](DEVELOPER_NOTES.md).

## Community Feed
Three post categories: `need_help`, `won_today`, `tips`. `bad-words` npm package auto-flags profanity on post creation. Flagged posts require admin review. Upvotes are atomic via `increment_post_upvotes()` / `decrement_post_upvotes()` RPC.

## Avatar Shop (MyCat)
Customizable cat avatar. Users earn **recovery points** from milestones and badges and spend them on hats, outfits, backgrounds, and accessories. State lives in `useAvatarStore`.

## Sports Calendar
`src/lib/sports-calendar.ts` fetches upcoming major sporting events (Super Bowl, UFC cards, etc.) and surfaces an in-app warning 24 hours before high-risk moments.

When a high-risk event is active on the Home screen, a **Pre-Game Mode** button appears below the warning card. Tapping it navigates to `/pregame` with `eventName` and `eventDate` route params so the screen can prepare the user with targeted coping tools.

## Commitment Vault (Tools screen — CBT tab)
The top section of the CBT tab shows the user's active vault entry (from `commitment_vault` table, `is_active = true`). If a vault entry exists:
- A card shows a truncated 60-char preview, the number of days since recording (derived from `currentStreak - streak_at_recording`), and two actions: **Read Message** (opens a bottom-sheet Modal with the full text) and **Update** (navigates to `/commitment-vault`).

If no entry exists a dashed empty-state card prompts the user to record one.

## Monthly Statement Card (Home screen)
Below `MoneySaved`, a `statementCard` shows `$X saved this month` computed as `Math.floor((daysThisMonthClean × weeklyBetEstimate) / 7)`. Month name is shown as a label. Tapping navigates to `/ledger`.

`daysThisMonth` is loaded on mount via a `count` query to `checkins` filtered by `date >= first day of current month`.

## Savings Goal (Profile screen)
Users can set a dollar target (`savings_goal_amount`) and a label (`savings_goal_label`) stored in `profiles`. When a goal is set, the section shows a percentage progress based on `runningTotal / goalAmount`.

## Sport Preferences (Profile screen)
A chip-grid of 10 sports (NFL, NBA, MLB, NHL, UFC, Soccer, College Football, Horse Racing, Boxing, Other). Selections are toggled and stored immediately to `profiles.sport_preferences` (text array). Used by the sports-calendar module to filter high-risk alerts.

## Re-engagement Notification Reset
`cancelReEngagement()` + `scheduleReEngagement()` are called on every mount of the Home screen (`DashboardScreen`) so the re-engagement timer resets each time the user opens the app.

## Accountability Partner
Manual matching by region and bet type. Direct messaging stored in the `partner_messages` table. Matching status tracked in `accountability_pairs`.

## Relapse Flow
Compassionate by design: `current_streak_days` resets to 0, `total_clean_days` is preserved and prominently shown. The user's personal motivation from onboarding is displayed during the relapse screen.

Flow phases (all in `src/app/relapse.tsx`):
1. **pre** — log note + confirm; calls `handle_relapse` RPC; captures returned `relapse_id`
2. **compassion** — lifetime days card + motivation recall + streak reset notice
3. **ask** — offers the optional Relapse Autopsy debrief
4. **debrief** — 5-step wizard written to `relapse_autopsies` table:
   - Step 1: trigger (boredom, bad day at work, after a game, drinking, financial stress, other)
   - Step 2: time of day (morning / afternoon / evening / night → stored as `HH:MM:SS`)
   - Step 3: were you alone? (boolean)
   - Step 4: substance involved? (boolean)
   - Step 5: self-talk free text (optional)
5. **done** — confirmation screen, auto-navigates to home after 1.2 s

## Amount Spent Tracking (Check-In)
Optional numeric field at the bottom of the daily check-in form. Users can log how much they spent if they had a lapse that day. Defaults to $0 (clean day). Stored as `amount_spent` on the `checkins` table (NUMERIC DEFAULT 0). **Does NOT affect the savings calculator** — the calculator always uses `weekly_bet_estimate × total_clean_days / 7`. This field is raw data for future relapse cost analysis.

## The Ledger
Monthly financial recovery statement at `/ledger` (modal). Launched from a "Monthly Statement" card on the Home screen.

- **Current month:** days clean, money not lost, real-world equivalents (groceries ~$200/mo, gas ~$60/tank, streaming ~$15/mo)
- **Running total:** all-time savings (Premium only — free shows a lock overlay)
- **Savings goal:** set in Profile settings — shows progress bar toward goal
- **Share:** text-only share via `Share.share()` — privacy-safe, no name or app branding (Premium only)
- **History:** past monthly statements from `monthly_statements` table (Premium only)
- **Free tier:** current month stats. **Premium:** running total + history.

## Pre-Game Mode
Active protective experience for high-risk sporting events at `/pregame` (modal). Entry point: "Activate Pre-Game Mode" button on Home screen, visible when a high-risk event is detected.

Four states: `preview → active → halftime → completed`.
- **Preview:** event name, feature description, Activate / Not today
- **Active:** streak counter, 3-hour countdown, 1–10 urge quick-log row, SOS button, Halftime button
- **Halftime:** "Still good" or "Need help" (routes to SOS)
- **Completed:** congratulation screen, "Log the win" (opens check-in), "Go home"

Sessions tracked in `pregame_sessions`. Sport preferences set in Profile → used to surface relevant events.
**Free:** activation + halftime check-in. **Premium:** session history (planned).

## Urge Pattern Intelligence
After 14+ check-ins, identifies the user's personal danger window — the specific day + time block (morning/afternoon/evening/night) with the highest average urge level (≥6.0, count ≥3).

- **Computation:** client-side from last 30 check-ins. Falls back to server `compute_user_insight()` RPC result if available and < 7 days old.
- **Display:** danger window card with day name, time block, avg urge (color-coded), occurrences count
- **Auto-protection:** toggleable weekly notification 15 minutes before the risk window (`identifier: "danger-window-protection"`)
- **Entry points:** Progress tab card (preview) and `/urge-pattern` screen (full analysis)
- **Free:** danger window + protective notification. **Premium:** full correlation breakdown (planned).

## Relapse Autopsy
Optional 5-question structured debrief offered immediately after a relapse is logged. Always skippable — compassion comes first.

**Phase flow:** `pre → compassion → ask → debrief → done`

Questions (tap-to-advance on steps 0–3, text input on step 4):
1. What triggered it? (chip: Boredom / Bad day at work / After a game / Drinking / Financial stress / Other)
2. What time did it happen? (chip: Morning / Afternoon / Evening / Night)
3. Were you alone? (Yes / No)
4. Had you been drinking or using anything? (Yes / No)
5. What were you telling yourself right before? (optional free text)

Data stored in `relapse_autopsies` table. `self_talk` is `null` if blank.
**Free:** debrief form. **Premium:** pattern analysis after 2+ autopsies (planned).

## Commitment Vault
Users write a text message to their future self during a moment of clarity. The message plays back as a pre-step before every SOS session.

- **Record:** `/commitment-vault` modal, entry from Tools tab. Multiline text input, max 500 chars.
- **SOS integration:** on SOS open, queries `commitment_vault` for `is_active=true` entry. If found, shows vault pre-step before the 5-step breathing protocol. Shows days since recording.
- **Management:** Tools tab shows preview (first 60 chars) + "Read Message" + "Update". Full screen has list/record modes with Make Active and Delete.
- **Premium gate:** free users get 1 text message; premium gets unlimited + audio (planned).

## Motivational Notifications
Two new notification types:
- **Daily motivational:** `identifier: "motivational-daily"` — fires at 9am by default. Quote rotates daily by `dayOfYear % quotes.length` (deterministic per day). Source: `MOTIVATIONAL_PUSH_QUOTES` array.
- **Re-engagement:** `identifier: "re-engagement"` — fires 72h after last app open (TIME_INTERVAL, `repeats: false`). Timer resets on every app open via `cancelReEngagement()` + `scheduleReEngagement()` in the Home screen `useEffect`. Source: `RE_ENGAGEMENT_PUSH_QUOTES` array.

All copy passes lock-screen safety (no gambling-related words visible on the lock screen).
