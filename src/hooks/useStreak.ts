import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/useUserStore';
import { useStreakStore } from '@/store/useStreakStore';
import { useAvatarStore } from '@/store/useAvatarStore';
import { scheduleMilestoneAlert } from '@/lib/notifications';

const MILESTONE_DAYS = [1, 3, 7, 14, 30, 90, 180, 365];

export function useStreak() {
  const profile = useUserStore((s) => s.profile);
  const { setFromServer } = useStreakStore();
  const { checkAndAwardBadges } = useAvatarStore();

  const fetchStreak = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('streaks')
      .select('*')
      .eq('user_id', profile.id)
      .single();
    if (data) setFromServer(data);
  }, [profile]);

  const checkIn = useCallback(async (params: {
    urgeLevel: number;
    mood: string;
    triggers: string[];
    notes: string | null;
    amount_spent?: number;
  }) => {
    if (!profile) throw new Error('Not logged in');

    const { data, error } = await supabase.rpc('handle_checkin', {
      p_user_id: profile.id,
      p_urge_level: params.urgeLevel,
      p_mood: params.mood,
      p_triggers: params.triggers,
      p_notes: params.notes,
      p_amount_spent: params.amount_spent ?? 0,
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    setFromServer(data);

    if (params.triggers.length > 0) {
      void supabase.from('trigger_journal').insert({
        user_id: profile.id,
        triggers: params.triggers,
        urge_level: params.urgeLevel,
        notes: params.notes,
      });
    }

    const days = data.current_streak_days;
    if (MILESTONE_DAYS.includes(days)) {
      const saved = Math.floor((days * data.weekly_bet_estimate) / 7);
      await scheduleMilestoneAlert(days, saved).catch(() => {});
    }

    void (async () => {
      const saved = Math.floor((data.total_clean_days * data.weekly_bet_estimate) / 7);
      const [{ count: sosCount }, { count: postCount }] = await Promise.all([
        supabase.from('sos_sessions').select('*', { count: 'exact', head: true }).eq('user_id', profile.id).eq('completed', true),
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', profile.id),
      ]);
      await checkAndAwardBadges(profile.id, data, saved, sosCount ?? 0, (postCount ?? 0) > 0);
    })();

    return data;
  }, [profile]);

  const logRelapse = useCallback(async (notes: string | null) => {
    if (!profile) throw new Error('Not logged in');

    const { data, error } = await supabase.rpc('handle_relapse', {
      p_user_id: profile.id,
      p_notes: notes,
    });

    if (error) throw error;
    setFromServer(data);
    return data;
  }, [profile]);

  return { fetchStreak, checkIn, logRelapse };
}
