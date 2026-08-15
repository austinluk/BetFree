# Database

Supabase PostgreSQL. Row-Level Security (RLS) is enabled on every table — users can only read/write their own data.

---

## Tables

### profiles
```sql
id                  UUID        PK, FK → auth.users
created_at          TIMESTAMPTZ
display_name        TEXT
onboarding_complete BOOLEAN
premium_status      BOOLEAN
notification_prefs  JSONB
onboarding_data     JSONB       -- bet_type, weekly_bet_amount, last_bet_date, motivation
```

### streaks
```sql
id                  UUID        PK
user_id             UUID        FK → profiles
start_date          DATE
current_streak_days INT         -- resets on relapse
longest_streak_days INT         -- never decreases
total_clean_days    INT         -- cumulative, never resets
weekly_bet_estimate NUMERIC     -- drives savings calculator
last_checkin_at     TIMESTAMPTZ
```

### checkins
```sql
id          UUID        PK
user_id     UUID        FK → profiles
date        DATE        UNIQUE per user per day
urge_level  INT         -- 1-10
mood        TEXT        -- great | good | neutral | bad | terrible
triggers    TEXT[]
notes       TEXT
created_at  TIMESTAMPTZ
```

### relapses
```sql
id           UUID        PK
user_id      UUID        FK → profiles
relapsed_at  TIMESTAMPTZ
notes        TEXT
```

### user_avatar
```sql
user_id         UUID    PK, FK → profiles
recovery_points INT
owned_items     TEXT[]
equipped        JSONB   -- { hat, outfit, background, accessory }
```

### posts
```sql
id          UUID    PK
user_id     UUID    FK → profiles
content     TEXT    -- max 500 chars
category    TEXT    -- need_help | won_today | tips
upvotes     INT
flagged     BOOLEAN
created_at  TIMESTAMPTZ
```

### post_upvotes
```sql
user_id  UUID    FK → profiles
post_id  UUID    FK → posts
PRIMARY KEY (user_id, post_id)
```

### trigger_journal
```sql
id          UUID    PK
user_id     UUID    FK → profiles
triggers    TEXT[]
urge_level  INT     -- 1-10
notes       TEXT
created_at  TIMESTAMPTZ
```

### sos_sessions
```sql
id           UUID        PK
user_id      UUID        FK → profiles
step_reached INT         -- 1-5
completed    BOOLEAN
completed_at TIMESTAMPTZ
created_at   TIMESTAMPTZ
```

### accountability_pairs
```sql
id          UUID    PK
user_a      UUID    FK → profiles
user_b      UUID    FK → profiles
bet_type    TEXT
region      TEXT
status      TEXT    -- waiting | matched | ended
created_at  TIMESTAMPTZ
```

### partner_messages
```sql
id          UUID        PK
pair_id     UUID        FK → accountability_pairs
sender_id   UUID        FK → profiles
content     TEXT
sent_at     TIMESTAMPTZ
```

---

## Column Additions
*(Migration: `supabase/migrations/20240814_signature_features.sql`)*

```sql
profiles.savings_goal_amount  NUMERIC          -- optional savings target amount
profiles.savings_goal_label   TEXT             -- label (e.g. "Family vacation")
profiles.sport_preferences    TEXT[]           -- sports followed, used by Pre-Game Mode
checkins.amount_spent         NUMERIC DEFAULT 0 -- optional: amount spent that day
```

---

## Signature Feature Tables

### monthly_statements
```sql
id              UUID        PK
user_id         UUID        FK → profiles (CASCADE)
month           DATE        -- first day of the month
days_clean      INT
amount_saved    NUMERIC
running_total   NUMERIC
created_at      TIMESTAMPTZ
UNIQUE(user_id, month)
```
RLS: `SELECT` own rows only. INSERT is server-only (via cron/Edge Function).

### user_insights
```sql
id              UUID        PK
user_id         UUID        FK → profiles (CASCADE)
insight_type    TEXT        -- "danger_window" | "trigger_correlation" | "streak_risk"
computed_at     TIMESTAMPTZ
data            JSONB       -- DangerWindowData | TriggerCorrelationData
shown_at        TIMESTAMPTZ -- null until user has seen it
UNIQUE(user_id, insight_type)
```
RLS: `SELECT` own, `UPDATE` own (for `shown_at`), `INSERT` own.

### relapse_autopsies
```sql
id                  UUID        PK
user_id             UUID        FK → profiles (CASCADE)
relapse_id          UUID        FK → relapses (CASCADE)
trigger             TEXT
time_of_day         TIME        -- "08:00:00" | "13:00:00" | "18:00:00" | "22:00:00"
was_alone           BOOLEAN
substance_involved  BOOLEAN
self_talk           TEXT        nullable
created_at          TIMESTAMPTZ
```
RLS: `INSERT` own, `SELECT` own.

### commitment_vault
```sql
id                   UUID        PK
user_id              UUID        FK → profiles (CASCADE)
type                 TEXT        -- "text" | "audio" (CHECK constraint)
content              TEXT
streak_at_recording  INT
created_at           TIMESTAMPTZ
is_active            BOOLEAN     DEFAULT true
```
RLS: Full access own rows (`SELECT`, `INSERT`, `UPDATE`, `DELETE`).

### pregame_sessions
```sql
id               UUID        PK
user_id          UUID        FK → profiles (CASCADE)
event_name       TEXT
event_date       DATE
activated_at     TIMESTAMPTZ DEFAULT now()
halftime_checkin INT         nullable (urge level 1–10)
completed        BOOLEAN     DEFAULT false
outcome_note     TEXT        nullable
created_at       TIMESTAMPTZ DEFAULT now()
```
RLS: `SELECT`, `INSERT`, `UPDATE` own rows.

---

## Server-Side RPC Functions

| Function | Purpose |
|---|---|
| `handle_checkin()` | Deduplicates daily check-ins, calculates streak server-side, prevents client clock manipulation |
| `handle_relapse()` | Resets `current_streak_days` to 0, preserves `total_clean_days` |
| `increment_post_upvotes()` | Atomic upvote increment |
| `decrement_post_upvotes()` | Atomic upvote decrement |
| `compute_user_insight(p_user_id UUID)` | Groups checkins by day+time block, finds danger window (avg ≥6.0, count ≥3), upserts into `user_insights` |

> The client **never** writes `current_streak_days` directly. Always go through `handle_checkin()`.
