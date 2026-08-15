# Signature Features

Features unique to BetFree — not found in any competing anti-gambling or recovery app.

---

## Feature Index

| Feature | Status | Doc Section |
|---|---|---|
| The Ledger | Implemented | [#the-ledger](#the-ledger) |
| Pre-Game Mode | Implemented | [#pre-game-mode](#pre-game-mode) |
| Urge Pattern Intelligence | Implemented | [#urge-pattern-intelligence](#urge-pattern-intelligence) |
| Relapse Autopsy | Implemented | [#relapse-autopsy](#relapse-autopsy) |
| Commitment Vault | Implemented | [#commitment-vault](#commitment-vault) |

---

## The Ledger

### What it is
A monthly financial recovery statement that looks and feels like a bank statement — showing the user exactly what they kept by not gambling.

### Why it's different
Every competitor either ignores money entirely or shows a generic running number. The Ledger makes recovery feel like *getting money back* by presenting it in a format the user already understands and trusts: a statement. Gambling's core shame is financial. This turns that shame into visible, monthly proof of progress.

### Screen flow
1. On the 1st of each month, user receives a push notification: "Your October statement is ready."
2. Opens to a full-screen statement view styled like a bank document:

```
OCTOBER — WHAT YOU KEPT
─────────────────────────────────
Days clean this month:       31
Money not lost:            $412
Running total:           $1,840

That's equivalent to:
  ✓ 2 months of groceries
  ✓ Your kid's school trip
  ✓ 18 tanks of gas
```

3. Equivalents are calculated from the user's weekly bet estimate and a small set of relatable real-world anchors (groceries ~$200/mo, tank of gas ~$60, etc.)
4. User can optionally set a **savings goal** during onboarding or from profile: "I'm saving to get my car back / pay off my credit card / take my family on a trip"
5. When a savings goal is set, the statement shows: "You're **74% of the way** to your goal."
6. Statement is shareable as an image (privacy-safe — no name, no app branding visible on share, just the numbers)

### Data required
- `streaks.total_clean_days` and `streaks.weekly_bet_estimate` (already in schema)
- New field: `profiles.savings_goal_amount` (NUMERIC, nullable)
- New field: `profiles.savings_goal_label` (TEXT, nullable) — e.g. "Family vacation"
- New table: `monthly_statements` — generated server-side on 1st of month via cron job

### Schema addition
```sql
-- Add to profiles table
savings_goal_amount  NUMERIC   -- user's target savings amount
savings_goal_label   TEXT      -- what they're saving for

-- New table
monthly_statements
  id              UUID        PK
  user_id         UUID        FK → profiles
  month           DATE        -- first day of the month
  days_clean      INT
  amount_saved    NUMERIC
  running_total   NUMERIC
  created_at      TIMESTAMPTZ
```

### Premium gating
- Running total and current month: **Free**
- Full statement history + savings goal tracking + shareable card: **Premium**

---

## Pre-Game Mode

### What it is
An active protective experience the user enters before a high-risk sporting event — not just a notification, but a focused app state that surrounds the user during the game.

### Why it's different
Every competitor sends a passive warning notification and stops there. Pre-Game Mode turns that warning into an active, time-bounded protective experience. The user opts in, which creates a pre-commitment effect. The app stays with them through the entire event.

### Screen flow
1. **48h before event:** Push notification — "The Super Bowl is in 2 days. Do you want to activate Pre-Game Mode for Sunday?"
2. **Day of, 2h before:** Reminder — "Pre-Game Mode starts in 2 hours. You're ready."
3. **On activation:** App enters Pre-Game Mode UI:
   - Simplified home screen — streak counter large, SOS button prominent, soft background color change (dark blue)
   - Countdown: "Game ends in ~3h 20m"
   - One-tap check-in pinned to screen: "How are you feeling right now?" (1-tap urge level, no full check-in required)
4. **Halftime push:** "Halftime. Still clean. Quick check-in?" — one tap: 👍 Still good / 🆘 Need help
5. **Game ends:** "You made it through the [Super Bowl]. That's one of the hardest moments of the year. Log the win." → auto-opens a micro check-in
6. **Next morning:** "Yesterday was hard. You didn't gamble. That matters." — shows urge level logged vs. outcome

### Events sourced from
`src/lib/sports-calendar.ts` — already pulls major events. Pre-Game Mode activates for any event the user's sport preferences match.

### Data required
- New field: `profiles.sport_preferences` (TEXT[], e.g. `['nfl', 'ufc', 'nba']`) — set during onboarding
- New table: `pregame_sessions`

```sql
pregame_sessions
  id            UUID        PK
  user_id       UUID        FK → profiles
  event_name    TEXT
  event_date    DATE
  activated_at  TIMESTAMPTZ
  halftime_checkin INT      -- urge level 1-10, nullable
  completed     BOOLEAN
  outcome_note  TEXT
  created_at    TIMESTAMPTZ
```

### Premium gating
- Basic Pre-Game Mode (activation + halftime check-in): **Free**
- Full session history + pattern analysis across events: **Premium**

---

## Urge Pattern Intelligence

### What it is
After 2–3 weeks of check-ins, BetFree analyzes the user's own data and surfaces their personal danger window — the specific time, day, and context when they are most at risk — then automatically schedules protective interventions around it.

### Why it's different
Generic apps show you a urge history graph and leave interpretation to the user. Urge Pattern Intelligence *acts* on the pattern. It tells the user something about themselves they didn't consciously know, which creates a feeling that the app genuinely understands them. That feeling is what drives long-term retention and premium conversion — users don't want to leave something that knows them.

### How it works
**Trigger:** After 14+ check-ins with urge data.

**Analysis (server-side, runs weekly):**
1. Group check-ins by day of week + time block (morning/afternoon/evening/night)
2. Calculate average urge level per slot
3. Identify the highest-risk slot (day + time block with avg urge ≥ 6.0 and ≥ 3 data points)
4. Identify contextual correlations: alone vs. not alone, post-game vs. not, mood preceding

**Output shown to user:**
```
YOUR DANGER WINDOW
──────────────────────────────────
Highest risk:   Sunday evenings (7–10pm)
Average urge:   7.4 / 10
Occurrences:    8 of your last 11 Sundays

Pattern detected:
  • Follows NFL games 6/8 times
  • You were alone 7/8 times
  • Preceded by "bad" or "neutral" mood

You have never relapsed outside this window.
```

**Auto-action:** BetFree automatically schedules a pre-emptive check-in notification for 15 minutes before the danger window every week. User can adjust or disable from profile.

### Data required
No new tables — computed from existing `checkins` data.

New server-side function:
```sql
-- Runs weekly via cron, writes to user_insights
compute_urge_patterns(user_id UUID)
```

New table:
```sql
user_insights
  id               UUID        PK
  user_id          UUID        FK → profiles
  insight_type     TEXT        -- 'danger_window' | 'trigger_correlation' | 'streak_risk'
  computed_at      TIMESTAMPTZ
  data             JSONB       -- { day, time_block, avg_urge, occurrences, correlations[] }
  shown_at         TIMESTAMPTZ -- null until user has seen it
```

### Premium gating
- Danger window detection + auto-scheduled notification: **Free** (this is a hook — seeing your pattern is what converts users)
- Full correlation breakdown (alone, post-game, mood) + export: **Premium**

---

## Relapse Autopsy

### What it is
When a user relapses, instead of just resetting the streak, BetFree walks them through a short structured debrief that builds a personal relapse map over time — ultimately predicting and preventing the next one.

### Why it's different
Every app treats relapse as an endpoint (streak resets, shame, done). The Relapse Autopsy treats it as data. After 2+ relapses, the app can show the user their exact pattern — and build a specific prevention plan for the next time those conditions appear. This is CBT's functional analysis, automated.

### Screen flow
**Immediately after relapse is logged:**
1. Compassionate message first (current behavior — no change)
2. Then: "Before we move forward — can we spend 2 minutes understanding what happened? This is just for you."
3. Short structured debrief (5 questions max, one per screen):
   - "What triggered it?" — dropdown (boredom / bad day at work / after a game / drinking / financial stress / other)
   - "What time did it happen?" — time picker
   - "Were you alone?" — yes / no
   - "Had you been drinking or using anything?" — yes / no
   - "What were you telling yourself right before?" — optional free text

**After 2+ relapses with autopsy data:**
```
YOUR RELAPSE PATTERN
──────────────────────────────
Every relapse has been on a Friday or Saturday.
You were alone each time.
Alcohol was involved 3 of 4 times.
The trigger was "bad week at work" or "boredom" every time.

NEXT FRIDAY PLAN
──────────────────────────────
We'll check in at 6pm.
If you're alone and had a bad week, we'll activate
your Commitment Vault message automatically.
```

### Data required
New table:
```sql
relapse_autopsies
  id              UUID        PK
  user_id         UUID        FK → profiles
  relapse_id      UUID        FK → relapses
  trigger         TEXT
  time_of_day     TIME
  was_alone       BOOLEAN
  substance_involved BOOLEAN
  self_talk       TEXT        -- free text, nullable
  created_at      TIMESTAMPTZ
```

### Premium gating
- Relapse debrief form: **Free**
- Pattern analysis + automated next-relapse prevention plan: **Premium**

---

## Commitment Vault

### What it is
Before a high-risk event, the user records a voice memo or types a message to their future self — their reason for stopping, in their own words, from a moment of clarity. When they tap SOS during a crisis, their own message plays back before anything else.

### Why it's different
Pre-commitment via temporal self-distancing is one of the most evidence-backed interventions in behavioral psychology. Hearing your own voice from a calm moment is significantly more powerful than reading a note or seeing a generic motivational quote. No recovery app does this. The moment a user hears themselves say "I'm doing this for my kids" in their own voice while in the grip of an urge — that's the intervention.

### Screen flow
**Recording (during onboarding or from Tools tab):**
1. "Record a message to yourself for when things get hard."
2. Prompt shown: "Tell future-you why you're stopping. Be specific. No one else will hear this."
3. User records audio (30 seconds max) OR types a message
4. Stored encrypted, labeled with date recorded
5. Can be updated any time — old versions are kept ("recorded 47 days ago when you had a 30-day streak")

**Playback (triggered by SOS button):**
1. User taps SOS
2. Before the 5-step protocol, full screen:
   > "Before we start — you recorded this 23 days ago."
3. Their message plays (audio) or displays (text) — their own words, their own voice
4. Single CTA: "I remember. Let's get through this." → enters SOS protocol

**Vault screen (Tools tab):**
- List of all recorded messages with date and days-clean at time of recording
- Can play back any message
- "Add a new message" button

### Data required
New table:
```sql
commitment_vault
  id              UUID        PK
  user_id         UUID        FK → profiles
  type            TEXT        -- 'audio' | 'text'
  content         TEXT        -- text message OR storage path for audio file
  streak_at_recording INT     -- days clean when recorded
  created_at      TIMESTAMPTZ
  is_active       BOOLEAN     -- which message plays during SOS (default: most recent)
```

Audio files stored in Supabase Storage, encrypted at rest. Never sent to any third party.

### Premium gating
- One active text message in vault: **Free**
- Audio recording + multiple messages + full vault history: **Premium**

---

## Implementation Status

### Shipped — 2024-08-14

All 5 signature features have been implemented:

| Feature | Screen | Entry Point |
|---|---|---|
| The Ledger | `/ledger` (modal) | Home screen Monthly Statement card |
| Pre-Game Mode | `/pregame` (modal) | Home screen Activate button (high-risk days only) |
| Urge Pattern Intelligence | `/urge-pattern` | Progress tab card |
| Relapse Autopsy | Integrated into `relapse.tsx` | Auto-shown after relapse is logged |
| Commitment Vault | `/commitment-vault` (modal) | Tools tab → Vault section |

### Deferred to Next Release

- **Commitment Vault — audio recording:** `expo-av` requires additional App Store permission review. The premium gate is in place and the UI shows the audio option as "coming soon". Text recording is fully functional.
- **Ledger — server-side monthly cron:** The `monthly_statements` table exists. The Supabase Edge Function cron job that populates it monthly needs to be configured in the Supabase dashboard (not in code).
- **Urge Pattern Intelligence — full correlation breakdown:** The basic danger window (free) ships. The Premium correlation breakdown (alone/not alone, post-game, preceding mood) is deferred to the next sprint.
- **Relapse Autopsy — pattern analysis:** The debrief form (free) ships. Pattern analysis after 2+ autopsies (Premium) is deferred.
