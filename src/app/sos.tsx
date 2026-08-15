import { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Linking, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/useUserStore';
import { useStreakStore } from '@/store/useStreakStore';
import { useAvatarStore } from '@/store/useAvatarStore';
import { Analytics } from '@/lib/analytics';
import { Colors, Spacing, Radius } from '@/constants/theme';
import type { CommitmentVaultEntry } from '@/types';

const STEPS = [
  {
    title: 'Take a breath.',
    body: 'Breathe in for 4 seconds.\nHold for 4.\nOut for 4.',
    cta: "I'm breathing",
    duration: null,
  },
  {
    title: 'Name it.',
    body: "You're feeling the urge.\nThat's okay.\nIt will pass.",
    cta: 'I see it',
    duration: null,
  },
  {
    title: 'Remember why.',
    body: null, // filled with user motivation
    cta: "I remember",
    duration: null,
  },
  {
    title: 'Wait 10 minutes.',
    body: 'Urges peak and fade.\nJust wait it out.',
    cta: null, // countdown timer
    duration: 600, // 10 minutes — intentional, not a test value
  },
  {
    title: 'You did it.',
    body: "You fought the urge and won.\nThat's real strength.",
    cta: 'Log the win',
    duration: null,
  },
];

function BreathingCircle() {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.4, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: 0.15 + (scale.value - 1) * 0.3,
  }));

  return <Animated.View style={[styles.breathCircle, style]} />;
}

function CountdownTimer({ seconds, onComplete }: { seconds: number; onComplete: () => void }) {
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const progress = 1 - remaining / seconds;

  return (
    <View style={styles.timerContainer}>
      <Text style={styles.timerText}>
        {mins}:{secs.toString().padStart(2, '0')}
      </Text>
      <View style={styles.timerBarBg}>
        <View style={[styles.timerBarFill, { width: `${progress * 100}%` as any }]} />
      </View>
      <Text style={styles.timerHint}>You can do this.</Text>
    </View>
  );
}

export default function SOSScreen() {
  const [sosPhase, setSosPhase] = useState<'loading' | 'vault' | 'protocol'>('loading');
  const [vaultEntry, setVaultEntry] = useState<CommitmentVaultEntry | null>(null);
  const [step, setStep] = useState(0);
  const [timerDone, setTimerDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const profile = useUserStore((s) => s.profile);
  const currentStreak = useStreakStore((s) => s.currentStreak);
  const motivation = profile?.onboarding_data?.motivation ?? "the people you love and the life you deserve.";
  const { addRecoveryPoints } = useAvatarStore();

  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(16);

  function animateIn() {
    titleOpacity.value = 0;
    titleTranslateY.value = 16;
    titleOpacity.value = withTiming(1, { duration: 400 });
    titleTranslateY.value = withSpring(0, { damping: 14 });
  }

  // Load vault entry on mount
  useEffect(() => {
    if (!profile) {
      setSosPhase('protocol');
      return;
    }
    supabase
      .from('commitment_vault')
      .select('*')
      .eq('user_id', profile.id)
      .eq('is_active', true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setVaultEntry(data as CommitmentVaultEntry);
          setSosPhase('vault');
        } else {
          setSosPhase('protocol');
        }
      });
  }, []);

  useEffect(() => {
    if (sosPhase !== 'protocol') return;
    animateIn();
    if (step === 0 && profile) {
      supabase.from('sos_sessions').insert({
        user_id: profile.id,
        step_reached: 1,
      }).then(() => {});
      Analytics.sosStarted().catch(() => {});
    }
  }, [step, sosPhase]); // profile intentionally excluded — only fire on step/phase change

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  async function handleComplete() {
    if (!profile) { router.back(); return; }
    setSaving(true);
    await addRecoveryPoints(25, profile.id);
    Analytics.sosCompleted(STEPS.length).catch(() => {});
    await supabase
      .from('sos_sessions')
      .update({ completed: true, completed_at: new Date().toISOString(), step_reached: 5 })
      .eq('user_id', profile.id)
      .is('completed_at', null);
    setSaving(false);
    router.back();
  }

  function handleVaultContinue() {
    Analytics.commitmentVaultPlayedback().catch(() => {});
    setSosPhase('protocol');
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (sosPhase === 'loading') {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator color={Colors.dark.text} size="large" />
      </View>
    );
  }

  // ── Vault pre-step ──────────────────────────────────────────────────────────
  if (sosPhase === 'vault' && vaultEntry) {
    const daysSince = currentStreak - vaultEntry.streak_at_recording;
    const daysLabel = daysSince < 0 ? 'recently' : `${daysSince} day${daysSince !== 1 ? 's' : ''}`;

    return (
      <View style={styles.container}>
        <View style={styles.vaultContent}>
          <Text style={styles.vaultPre}>Before we start —</Text>
          <Text style={styles.vaultSub}>You recorded this {daysLabel} ago.</Text>
          <View style={styles.vaultCard}>
            <Text style={styles.vaultText}>{vaultEntry.content}</Text>
          </View>
        </View>
        <View style={styles.footer}>
          <Pressable style={styles.ctaBtn} onPress={handleVaultContinue}>
            <Text style={styles.ctaBtnText}>I remember. Let's get through this. →</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} style={styles.skipBtn}>
            <Text style={styles.skipBtnText}>I need a moment — exit</Text>
          </Pressable>
          <Pressable
            onPress={() => Linking.openURL('tel:18005224700').catch(() => {})}
            style={styles.crisisBtn}
          >
            <Text style={styles.crisisBtnText}>📞 Crisis line: 1-800-522-4700</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Protocol ──────────────────────────────────────────────────────────────
  const currentStep = STEPS[step];
  const body = step === 2 ? `You're doing this for:\n"${motivation}"` : currentStep.body;
  const isLastStep = step === STEPS.length - 1;
  const isTimerStep = currentStep.duration !== null;
  const canAdvance = !isTimerStep || timerDone;

  return (
    <View style={styles.container}>
      {step === 0 && <BreathingCircle />}

      <View style={styles.header}>
        <Text style={styles.stepIndicator}>{step + 1} / {STEPS.length}</Text>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotDone]}
          />
        ))}
      </View>

      <View style={styles.content}>
        <Animated.Text style={[styles.title, titleStyle]}>
          {currentStep.title}
        </Animated.Text>

        {body ? (
          <Animated.Text style={[styles.body, titleStyle]}>
            {body}
          </Animated.Text>
        ) : null}

        {isTimerStep && (
          <CountdownTimer
            seconds={currentStep.duration!}
            onComplete={() => setTimerDone(true)}
          />
        )}
      </View>

      <View style={styles.footer}>
        {isLastStep ? (
          <Pressable
            style={[styles.ctaBtn, styles.ctaBtnWin, saving && styles.ctaBtnDisabled]}
            onPress={handleComplete}
            disabled={saving}
          >
            <Text style={styles.ctaBtnText}>
              {saving ? 'Saving...' : '✓  Log the win  +25 pts'}
            </Text>
          </Pressable>
        ) : canAdvance ? (
          <Pressable
            style={styles.ctaBtn}
            onPress={() => { setTimerDone(false); setStep((s) => s + 1); }}
          >
            <Text style={styles.ctaBtnText}>{currentStep.cta} →</Text>
          </Pressable>
        ) : (
          <View style={[styles.ctaBtn, styles.ctaBtnDisabled]}>
            <Text style={styles.ctaBtnText}>Wait for the timer...</Text>
          </View>
        )}

        {!isLastStep && (
          <Pressable onPress={() => router.back()} style={styles.skipBtn}>
            <Text style={styles.skipBtnText}>I need a moment — exit</Text>
          </Pressable>
        )}

        <Pressable
          onPress={() => Linking.openURL('tel:18005224700').catch(() => {})}
          style={styles.crisisBtn}
        >
          <Text style={styles.crisisBtnText}>📞 Crisis line: 1-800-522-4700</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  breathCircle: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: Colors.dark.accent, alignSelf: 'center', top: '30%',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  stepIndicator: { color: Colors.dark.textMuted, fontSize: 14, fontWeight: '600', letterSpacing: 1 },
  closeBtn: {
    width: 32, height: 32, borderRadius: Radius.full,
    backgroundColor: Colors.dark.backgroundElement,
    justifyContent: 'center', alignItems: 'center',
  },
  closeBtnText: { color: Colors.dark.textSecondary, fontSize: 14 },
  dots: { flexDirection: 'row', gap: 6, marginBottom: Spacing.xl },
  dot: { flex: 1, height: 3, borderRadius: 2, backgroundColor: Colors.dark.border },
  dotActive: { backgroundColor: Colors.dark.accent },
  dotDone: { backgroundColor: Colors.dark.primary },
  content: { flex: 1, justifyContent: 'center', gap: Spacing.xl },
  title: { color: Colors.dark.text, fontSize: 36, fontWeight: '800', letterSpacing: -0.5, lineHeight: 44 },
  body: { color: Colors.dark.textSecondary, fontSize: 20, lineHeight: 32, fontWeight: '400' },
  timerContainer: { gap: Spacing.md, alignItems: 'center' },
  timerText: { color: Colors.dark.text, fontSize: 72, fontWeight: '800', letterSpacing: -2 },
  timerBarBg: {
    width: '100%', height: 6, backgroundColor: Colors.dark.border,
    borderRadius: Radius.full, overflow: 'hidden',
  },
  timerBarFill: { height: 6, backgroundColor: Colors.dark.primary, borderRadius: Radius.full },
  timerHint: { color: Colors.dark.textMuted, fontSize: 14 },
  footer: { gap: Spacing.md },
  ctaBtn: {
    backgroundColor: Colors.dark.accent, borderRadius: Radius.lg,
    paddingVertical: Spacing.md + 4, alignItems: 'center',
  },
  ctaBtnWin: { backgroundColor: Colors.dark.primary },
  ctaBtnDisabled: { opacity: 0.4 },
  ctaBtnText: { color: '#0A0A0F', fontSize: 17, fontWeight: '700' },
  skipBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
  skipBtnText: { color: Colors.dark.textMuted, fontSize: 14, textDecorationLine: 'underline' },
  crisisBtn: { alignItems: 'center', paddingVertical: Spacing.xs },
  crisisBtnText: { color: Colors.dark.textMuted, fontSize: 13 },
  // Vault pre-step styles
  vaultContent: {
    flex: 1, justifyContent: 'center', gap: Spacing.xl,
  },
  vaultPre: { color: Colors.dark.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  vaultSub: { color: Colors.dark.textSecondary, fontSize: 17, marginTop: -Spacing.md },
  vaultCard: {
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: Radius.xl, padding: Spacing.xl,
    borderWidth: 1, borderColor: Colors.dark.border,
  },
  vaultText: {
    color: Colors.dark.text, fontSize: 18, lineHeight: 28,
    fontWeight: '500', fontStyle: 'italic',
  },
});
