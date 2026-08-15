import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { supabase } from '@/lib/supabase';
import { setupRevenueCat, checkPremium, identifyUser } from '@/lib/revenuecat';
import { useUserStore } from '@/store/useUserStore';
import { useStreakStore } from '@/store/useStreakStore';
import { identify } from '@/lib/analytics';

SplashScreen.preventAutoHideAsync();

// Fallback: always hide splash after 5s even if Supabase never responds
setTimeout(() => SplashScreen.hideAsync(), 5000);

export default function RootLayout() {
  const setProfile = useUserStore((s) => s.setProfile);
  const setLoading = useUserStore((s) => s.setLoading);
  const setPremium = useUserStore((s) => s.setPremium);
  const isLoading = useUserStore((s) => s.isLoading);
  const profile = useUserStore((s) => s.profile);
  const isOnboarded = useUserStore((s) => s.isOnboarded);
  const skipAuthRedirect = useUserStore((s) => s.skipAuthRedirect);
  const setFromServer = useStreakStore((s) => s.setFromServer);

  useEffect(() => {
    setupRevenueCat().catch(console.error);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        setProfile(null);
        setLoading(false);
        SplashScreen.hideAsync();
        return;
      }

      const skip = useUserStore.getState().skipAuthRedirect;
      if (skip) {
        setLoading(false);
        SplashScreen.hideAsync();
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      setProfile(profileData ?? null);

      // Load streak so dashboard has data on first render
      const { data: streakData } = await supabase
        .from('streaks')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      if (streakData) setFromServer(streakData);

      await identifyUser(session.user.id);
      const premium = await checkPremium();
      setPremium(premium);

      // Identify in analytics
      await identify(session.user.id, {
        premium_status: premium,
        onboarding_complete: profileData?.onboarding_complete ?? false,
      }).catch(() => {});

      setLoading(false);
      SplashScreen.hideAsync();
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (skipAuthRedirect) return;

    if (!profile) {
      router.replace('/(auth)/discovery' as any);
    } else if (!isOnboarded) {
      router.replace('/(auth)/onboarding' as any);
    } else {
      router.replace('/(tabs)' as any);
    }
  }, [isLoading, profile, isOnboarded, skipAuthRedirect]);

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="checkin" options={{ presentation: 'modal' }} />
        <Stack.Screen name="sos" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="relapse" options={{ presentation: 'modal' }} />
        <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
        <Stack.Screen name="avatar-shop" />
        <Stack.Screen name="partner-chat" />
        <Stack.Screen name="commitment-vault" options={{ presentation: 'modal' }} />
        <Stack.Screen name="ledger" options={{ presentation: 'modal' }} />
        <Stack.Screen name="urge-pattern" />
        <Stack.Screen name="pregame" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
