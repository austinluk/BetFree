// ─── Enums ────────────────────────────────────────────────────────────────────

export type BetType = 'sports' | 'casino' | 'poker' | 'scratch' | 'all';
export type Mood = 'great' | 'good' | 'neutral' | 'bad' | 'terrible';
export type PostCategory = 'need_help' | 'won_today' | 'tips';
export type PremiumTier = 'free' | 'monthly' | 'annual' | 'lifetime';
export type AvatarCategory = 'background' | 'shirt' | 'hat' | 'accessory';

// ─── Supabase DB types ────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  created_at: string;
  display_name: string | null;
  onboarding_complete: boolean;
  premium_status: boolean;
  notification_prefs: NotificationPrefs;
  onboarding_data: OnboardingData | null;
  savings_goal_amount: number | null;
  savings_goal_label: string | null;
  sport_preferences: string[] | null;
}

export interface OnboardingData {
  bet_type: BetType;
  weekly_bet_amount: number;
  last_bet_date: string;
  motivation: string;
}

export interface NotificationPrefs {
  daily_checkin: boolean;
  streak_alerts: boolean;
  high_risk: boolean;
}

export interface Streak {
  id: string;
  user_id: string;
  start_date: string;
  last_checkin_at: string | null;
  current_streak_days: number;
  longest_streak_days: number;
  total_clean_days: number;
  weekly_bet_estimate: number;
}

export interface CheckIn {
  id: string;
  user_id: string;
  date: string;
  urge_level: number;
  mood: Mood;
  triggers: string[];
  notes: string | null;
  created_at: string;
  amount_spent: number | null;
}

export interface Badge {
  id: string;
  user_id: string;
  badge_id: BadgeId;
  earned_at: string;
}

export type BadgeId =
  | 'day_1' | 'day_3' | 'day_7' | 'day_14' | 'day_30' | 'day_90' | 'day_180' | 'day_365'
  | 'saved_100' | 'saved_1000' | 'urge_slayer' | 'not_alone';

export interface AvatarItem {
  id: string;
  category: AvatarCategory;
  name: string;
  recovery_points_cost: number;
  unlock_condition: string;
}

export interface UserAvatar {
  user_id: string;
  recovery_points: number;
  owned_items: string[];
  equipped: EquippedAvatar;
}

export interface EquippedAvatar {
  background: string | null;
  shirt: string | null;
  hat: string | null;
  accessory: string | null;
}

export interface QuizAnswer {
  question: string;
  answer: boolean;
}

export interface SportEvent {
  id: string;
  name: string;
  sport: string;
  date: string;
  league: string;
}

// ─── Signature Feature Types ──────────────────────────────────────────────────

export interface MonthlyStatement {
  id: string;
  user_id: string;
  month: string;
  days_clean: number;
  amount_saved: number;
  running_total: number;
  created_at: string;
}

export interface DangerWindowData {
  day_of_week: number;
  time_block: 'morning' | 'afternoon' | 'evening' | 'night';
  avg_urge: number;
  occurrences: number;
  total_checkins: number;
  correlations: Array<{ factor: string; count: number }>;
}

export interface TriggerCorrelationData {
  top_triggers: Array<{ trigger: string; avg_urge: number; count: number }>;
}

export interface UserInsight {
  id: string;
  user_id: string;
  insight_type: 'danger_window' | 'trigger_correlation' | 'streak_risk';
  computed_at: string;
  data: DangerWindowData | TriggerCorrelationData;
  shown_at: string | null;
}

export interface RelapseAutopsy {
  id: string;
  user_id: string;
  relapse_id: string;
  trigger: string;
  time_of_day: string;
  was_alone: boolean;
  substance_involved: boolean;
  self_talk: string | null;
  created_at: string;
}

export type RelapseAutopsyTrigger =
  | 'boredom' | 'bad_day_at_work' | 'after_a_game' | 'drinking' | 'financial_stress' | 'other';

export interface CommitmentVaultEntry {
  id: string;
  user_id: string;
  type: 'text' | 'audio';
  content: string;
  streak_at_recording: number;
  created_at: string;
  is_active: boolean;
}

export interface PregameSession {
  id: string;
  user_id: string;
  event_name: string;
  event_date: string;
  activated_at: string;
  halftime_checkin: number | null;
  completed: boolean;
  outcome_note: string | null;
  created_at: string;
}
