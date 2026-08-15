import { useRef } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/useUserStore';
import { Colors, Radius, Spacing, BottomTabInset } from '@/constants/theme';

const FREE_SOS_LIMIT = 3;

export function SOSButton() {
  const isPremium = useUserStore((s) => s.isPremium);
  const profile = useUserStore((s) => s.profile);
  const inFlight = useRef(false);

  async function handlePress() {
    if (inFlight.current) return;
    inFlight.current = true;

    try {
      if (isPremium || !profile) {
        router.push('/sos' as any);
        return;
      }

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from('sos_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .gte('started_at', startOfMonth.toISOString());

      if ((count ?? 0) >= FREE_SOS_LIMIT) {
        router.push({ pathname: '/paywall' as any, params: { gate: 'sos' } });
      } else {
        router.push('/sos' as any);
      }
    } finally {
      // Reset after short delay so back-navigation doesn't re-lock
      setTimeout(() => { inFlight.current = false; }, 500);
    }
  }

  return (
    <Pressable
      style={styles.button}
      onPress={handlePress}
      accessibilityLabel="SOS - I need help right now"
      accessibilityRole="button"
    >
      <Text style={styles.text}>SOS</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: BottomTabInset + Spacing.lg,
    right: Spacing.lg,
    width: 60,
    height: 60,
    borderRadius: Radius.full,
    backgroundColor: Colors.light.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.light.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    // @ts-ignore — web only
    boxShadow: '0 4px 16px rgba(251,146,60,0.4)',
    zIndex: 999,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
