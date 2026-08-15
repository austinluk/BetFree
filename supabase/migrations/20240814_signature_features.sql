-- BetFree Signature Features Migration
-- Adds columns and tables for: The Ledger, Pre-Game Mode, Urge Pattern Intelligence,
-- Relapse Autopsy, Commitment Vault, and amount_spent tracking.

-- ─── Column additions to existing tables ─────────────────────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS savings_goal_amount NUMERIC;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS savings_goal_label TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sport_preferences TEXT[];
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS amount_spent NUMERIC DEFAULT 0;

-- ─── monthly_statements ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS monthly_statements (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month           DATE        NOT NULL,
  days_clean      INT         NOT NULL DEFAULT 0,
  amount_saved    NUMERIC     NOT NULL DEFAULT 0,
  running_total   NUMERIC     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, month)
);

ALTER TABLE monthly_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "monthly_statements_select_own"
  ON monthly_statements FOR SELECT
  USING (auth.uid() = user_id);

-- ─── user_insights ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_insights (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  insight_type    TEXT        NOT NULL,
  computed_at     TIMESTAMPTZ DEFAULT now(),
  data            JSONB       NOT NULL DEFAULT '{}'::jsonb,
  shown_at        TIMESTAMPTZ,
  UNIQUE(user_id, insight_type)
);

ALTER TABLE user_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_insights_select_own"
  ON user_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_insights_update_own"
  ON user_insights FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "user_insights_insert_own"
  ON user_insights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ─── relapse_autopsies ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS relapse_autopsies (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  relapse_id          UUID        NOT NULL REFERENCES relapses(id) ON DELETE CASCADE,
  trigger             TEXT        NOT NULL,
  time_of_day         TIME        NOT NULL,
  was_alone           BOOLEAN     NOT NULL DEFAULT false,
  substance_involved  BOOLEAN     NOT NULL DEFAULT false,
  self_talk           TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE relapse_autopsies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "relapse_autopsies_insert_own"
  ON relapse_autopsies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "relapse_autopsies_select_own"
  ON relapse_autopsies FOR SELECT
  USING (auth.uid() = user_id);

-- ─── commitment_vault ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS commitment_vault (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type                 TEXT        NOT NULL CHECK (type IN ('text', 'audio')),
  content              TEXT        NOT NULL,
  streak_at_recording  INT         NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ DEFAULT now(),
  is_active            BOOLEAN     NOT NULL DEFAULT true
);

ALTER TABLE commitment_vault ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commitment_vault_select_own"
  ON commitment_vault FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "commitment_vault_insert_own"
  ON commitment_vault FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "commitment_vault_update_own"
  ON commitment_vault FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "commitment_vault_delete_own"
  ON commitment_vault FOR DELETE
  USING (auth.uid() = user_id);

-- ─── pregame_sessions ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pregame_sessions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_name       TEXT        NOT NULL,
  event_date       DATE        NOT NULL,
  activated_at     TIMESTAMPTZ DEFAULT now(),
  halftime_checkin INT,
  completed        BOOLEAN     NOT NULL DEFAULT false,
  outcome_note     TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pregame_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pregame_sessions_select_own"
  ON pregame_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "pregame_sessions_insert_own"
  ON pregame_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pregame_sessions_update_own"
  ON pregame_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- ─── compute_user_insight RPC ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION compute_user_insight(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_slot_key TEXT;
  v_dow INT;
  v_block TEXT;
  v_sum NUMERIC;
  v_count INT;
  v_avg NUMERIC;
  v_best_key TEXT;
  v_best_avg NUMERIC := 0;
  v_best_count INT := 0;
  v_best_dow INT;
  v_best_block TEXT;
  v_insight JSONB;
BEGIN
  -- Build slot aggregates from checkins
  FOR v_dow, v_block, v_sum, v_count IN
    SELECT
      EXTRACT(DOW FROM date)::INT AS dow,
      CASE
        WHEN EXTRACT(HOUR FROM created_at) >= 5 AND EXTRACT(HOUR FROM created_at) < 12 THEN 'morning'
        WHEN EXTRACT(HOUR FROM created_at) >= 12 AND EXTRACT(HOUR FROM created_at) < 17 THEN 'afternoon'
        WHEN EXTRACT(HOUR FROM created_at) >= 17 AND EXTRACT(HOUR FROM created_at) < 22 THEN 'evening'
        ELSE 'night'
      END AS time_block,
      SUM(urge_level) AS urge_sum,
      COUNT(*) AS urge_count
    FROM checkins
    WHERE user_id = p_user_id
    GROUP BY dow, time_block
  LOOP
    v_avg := v_sum / NULLIF(v_count, 0);
    IF v_avg >= 6.0 AND v_count >= 3 AND v_avg > v_best_avg THEN
      v_best_avg := v_avg;
      v_best_count := v_count;
      v_best_dow := v_dow;
      v_best_block := v_block;
    END IF;
  END LOOP;

  IF v_best_count > 0 THEN
    SELECT COUNT(*) INTO v_count FROM checkins WHERE user_id = p_user_id;
    v_insight := jsonb_build_object(
      'day_of_week', v_best_dow,
      'time_block', v_best_block,
      'avg_urge', ROUND(v_best_avg::NUMERIC, 1),
      'occurrences', v_best_count,
      'total_checkins', v_count,
      'correlations', '[]'::jsonb
    );

    INSERT INTO user_insights (user_id, insight_type, data)
    VALUES (p_user_id, 'danger_window', v_insight)
    ON CONFLICT (user_id, insight_type)
    DO UPDATE SET data = EXCLUDED.data, computed_at = now();
  END IF;
END;
$$;
