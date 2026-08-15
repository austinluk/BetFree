import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { router } from 'expo-router';import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/useUserStore';
import { useStreakStore } from '@/store/useStreakStore';
import { Colors, Spacing, Radius } from '@/constants/theme';
import type { BetType, OnboardingData } from '@/types';

const BET_TYPES: { id: BetType; label: string; icon: string }[] = [
  { id: 'sports', label: 'Sports Betting', icon: '🏈' },
  { id: 'casino', label: 'Casino', icon: '🎰' },
  { id: 'poker', label: 'Poker', icon: '🃏' },
  { id: 'scratch', label: 'Scratch Tickets', icon: '🎟️' },
  { id: 'all', label: 'All of the above', icon: '⚡' },
];

const WEEKLY_AMOUNTS = [50, 100, 200, 500, 1000, 2000];

const TOTAL_STEPS = 4;

export default function OnboardingScreen() {
  const [step, setStep] = useState(1);
  const [betType, setBetType] = useState<BetType | null>(null);
  const [weeklyAmount, setWeeklyAmount] = useState<number>(100);
  const [motivation, setMotivation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { setProfile, setOnboarded, setSkipAuthRedirect } = useUserStore();
  const { setFromServer, setWeeklyBetEstimate } = useStreakStore();

  function canAdvance() {
    if (step === 1) return betType !== null;
    if (step === 2) return weeklyAmount > 0;
    if (step === 3) return motivation.trim().length > 0;
    if (step === 4) return email.trim().length > 0 && password.length >= 6;
    return false;
  }

  async function handleComplete() {
    if (!betType) return;
    setLoading(true);
    setError('');
    setSkipAuthRedirect(true);

    try {
      // Try sign up; if account exists fall back to sign in
      let userId: string;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (authError?.code === 'user_already_exists' || authError?.message?.includes('already registered')) {
        // Account exists — sign in instead
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        if (!signInData.user) throw new Error('Sign in failed');
        userId = signInData.user.id;

        // Fetch existing profile and go straight to tabs
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (existingProfile) {
          setProfile(existingProfile);
          setOnboarded(true);
          setSkipAuthRedirect(false);
          router.replace('/(tabs)' as any);
          return;
        }
        // No profile yet — continue to create one below
      } else {
        if (authError) throw authError;
        if (!authData.user) throw new Error('No user returned');
        userId = authData.user.id;
      }
      const onboardingData: OnboardingData = {
        bet_type: betType,
        weekly_bet_amount: weeklyAmount,
        last_bet_date: new Date().toISOString().split('T')[0],
        motivation: motivation.trim(),
      };

      // Create profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          onboarding_complete: true,
          onboarding_data: onboardingData,
        })
        .select()
        .single();
      if (profileError) throw profileError;

      // Create streak row
      const { data: streak, error: streakError } = await supabase
        .from('streaks')
        .insert({
          user_id: userId,
          start_date: new Date().toISOString().split('T')[0],
          weekly_bet_estimate: weeklyAmount,
        })
        .select()
        .single();
      if (streakError) throw streakError;

      setProfile(profile);
      setOnboarded(true);
      setFromServer(streak);
      setWeeklyBetEstimate(weeklyAmount);

      // Track onboarding completion
      import('@/lib/analytics').then(({ Analytics }) =>
        Analytics.onboardingCompleted(betType!, weeklyAmount).catch(() => {})
      );

      router.replace('/(auth)/trial-offer' as any);
    } catch (e: any) {
      // Keep skipAuthRedirect=true so _layout doesn't eject the user while they fix the error
      setError(e.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function next() {
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
    else handleComplete();
  }

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(step / TOTAL_STEPS) * 100}%` }]} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>What are you trying to stop?</Text>
            <Text style={styles.stepSubtitle}>Select all that apply</Text>
            <View style={styles.betTypeGrid}>
              {BET_TYPES.map((type) => (
                <Pressable
                  key={type.id}
                  style={[styles.betTypeCard, betType === type.id && styles.betTypeCardActive]}
                  onPress={() => setBetType(type.id)}
                >
                  <Text style={styles.betTypeIcon}>{type.icon}</Text>
                  <Text style={[styles.betTypeLabel, betType === type.id && styles.betTypeLabelActive]}>
                    {type.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>How much did you bet per week?</Text>
            <Text style={styles.stepSubtitle}>This calculates your money saved</Text>
            <View style={styles.amountGrid}>
              {WEEKLY_AMOUNTS.map((amount) => (
                <Pressable
                  key={amount}
                  style={[styles.amountChip, weeklyAmount === amount && styles.amountChipActive]}
                  onPress={() => setWeeklyAmount(amount)}
                >
                  <Text style={[styles.amountText, weeklyAmount === amount && styles.amountTextActive]}>
                    ${amount}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Why are you stopping?</Text>
            <Text style={styles.stepSubtitle}>This stays private. We'll show it to you when it matters most.</Text>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={5}
              placeholder="My family, my health, my future..."
              placeholderTextColor={Colors.light.textMuted}
              value={motivation}
              onChangeText={setMotivation}
              textAlignVertical="top"
            />
          </View>
        )}

        {step === 4 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Create your account</Text>
            <Text style={styles.stepSubtitle}>Your data stays private. We never share it.</Text>
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={Colors.light.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              <TextInput
                style={styles.input}
                placeholder="Password (6+ characters)"
                placeholderTextColor={Colors.light.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
              />
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Pressable
              onPress={() => router.push('/(auth)/login' as any)}
              style={styles.signInLink}
            >
              <Text style={styles.signInLinkText}>Already have an account? Sign in →</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.nextBtn, !canAdvance() && styles.nextBtnDisabled]}
          onPress={next}
          disabled={!canAdvance() || loading}
        >
          <Text style={styles.nextBtnText}>
            {loading ? 'Creating account...' : step === TOTAL_STEPS ? 'Get started' : 'Continue'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    paddingTop: 60,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.light.border,
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    marginBottom: Spacing.xl,
  },
  progressFill: {
    height: 4,
    backgroundColor: Colors.light.primary,
    borderRadius: Radius.full,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  stepContainer: { gap: Spacing.lg },
  stepTitle: {
    color: Colors.light.text,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  stepSubtitle: {
    color: Colors.light.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginTop: -Spacing.sm,
  },
  betTypeGrid: { gap: Spacing.sm },
  betTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.light.border,
    gap: Spacing.md,
  },
  betTypeCardActive: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primaryLight,
  },
  betTypeIcon: { fontSize: 24 },
  betTypeLabel: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: '500',
  },
  betTypeLabelActive: { color: Colors.light.primaryDark, fontWeight: '700' },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  amountChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.light.backgroundElement,
    borderWidth: 2,
    borderColor: Colors.light.border,
  },
  amountChipActive: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primaryLight,
  },
  amountText: {
    color: Colors.light.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  amountTextActive: { color: Colors.light.primaryDark },
  textArea: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    color: Colors.light.text,
    fontSize: 16,
    lineHeight: 24,
    borderWidth: 1,
    borderColor: Colors.light.border,
    minHeight: 140,
  },
  inputGroup: { gap: Spacing.sm },
  input: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    color: Colors.light.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    height: 52,
  },
  errorText: {
    color: Colors.light.danger,
    fontSize: 14,
    marginTop: Spacing.xs,
  },
  signInLink: { alignItems: 'center', marginTop: Spacing.sm },
  signInLinkText: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  nextBtn: {
    backgroundColor: Colors.light.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: {
    color: '#0A0A0F',
    fontSize: 17,
    fontWeight: '700',
  },
});
