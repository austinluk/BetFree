import { create } from 'zustand';
import type { Streak } from '@/types';

interface StreakState {
  currentStreak: number;
  longestStreak: number;
  totalCleanDays: number;
  weeklyBetEstimate: number;
  lastCheckinAt: string | null;
  startDate: string | null;
  setFromServer: (streak: Streak) => void;
  setWeeklyBetEstimate: (amount: number) => void;
  reset: () => void;
}

export const useStreakStore = create<StreakState>((set) => ({
  currentStreak: 0,
  longestStreak: 0,
  totalCleanDays: 0,
  weeklyBetEstimate: 0,
  lastCheckinAt: null,
  startDate: null,

  setFromServer: (streak) => {
    set({
      currentStreak: streak.current_streak_days,
      longestStreak: streak.longest_streak_days,
      totalCleanDays: streak.total_clean_days,
      weeklyBetEstimate: streak.weekly_bet_estimate,
      lastCheckinAt: streak.last_checkin_at,
      startDate: streak.start_date,
    });
  },

  setWeeklyBetEstimate: (amount) => {
    set({ weeklyBetEstimate: amount });
  },

  reset: () => {
    set({
      currentStreak: 0,
      longestStreak: 0,
      totalCleanDays: 0,
      weeklyBetEstimate: 0,
      lastCheckinAt: null,
      startDate: null,
    });
  },
}));

// Selector — call this in components: useMoneySaved()
export const useMoneySaved = () =>
  useStreakStore((s) => Math.floor((s.totalCleanDays * s.weeklyBetEstimate) / 7));
