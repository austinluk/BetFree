import { useCallback } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { useUserStore } from '@/store/useUserStore';
import { supabase } from '@/lib/supabase';

export type PaywallGate = 'sos' | 'urge_log' | 'community' | 'partner' | 'vault' | 'ledger_history';

export function usePremium() {
  const isPremium = useUserStore((s) => s.isPremium);
  const setPremium = useUserStore((s) => s.setPremium);
  const profile = useUserStore((s) => s.profile);

  const showPaywall = useCallback((gate: PaywallGate) => {
    router.push({ pathname: '/paywall' as any, params: { gate } });
  }, []);

  const refreshPremium = useCallback(async () => {
    if (Platform.OS === 'web') return;
    const { checkPremium } = await import('@/lib/revenuecat');
    const premium = await checkPremium();
    setPremium(premium);

    if (profile && premium) {
      await supabase
        .from('profiles')
        .update({ premium_status: true })
        .eq('id', profile.id);
    }
  }, [profile]);

  return { isPremium, showPaywall, refreshPremium };
}
