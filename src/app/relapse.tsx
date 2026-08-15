import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  Platform,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/useUserStore';
import { useStreakStore } from '@/store/useStreakStore';
import { Analytics } from '@/lib/analytics';
import { Colors, Spacing, Radius } from '@/constants/theme';

type ScreenPhase = 'pre' | 'compassion' | 'ask' | 'debrief' | 'done';

const AUTOPSY_TRIGGERS = [
  { id: 'boredom', label: 'Boredom' },
  { id: 'bad_day_at_work', label: 'Bad day at work' },
  { id: 'after_a_game', label: 'After a game' },
  { id: 'drinking', label: 'Drinking' },
  { id: 'financial_stress', label: 'Financial stress' },
  { id: 'other', label: 'Other' },
];

const AUTOPSY_TIMES = [
  { id: 'morning', label: 'Morning', time: '08:00:00' },
  { id: 'afternoon', label: 'Afternoon', time: '13:00:00' },
  { id: 'evening', label: 'Evening', time: '18:00:00' },
  { id: 'night', label: 'Night', time: '22:00:00' },
];

function mapTimeOfDay(selection: string): string {
  const found = AUTOPSY_TIMES.find((t) => t.id === selection);
  return found ? found.time : '12:00:00';
}

export default function RelapseScreen() {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<ScreenPhase>('pre');
  const [relapseId, setRelapseId] = useState<string | null>(null);

  // Autopsy state
  const [autopsyStep, setAutopsyStep] = useState(0);
  const [autopsyTrigger, setAutopsyTrigger] = useState('');
  const [autopsyTimeOfDay, setAutopsyTimeOfDay] = useState('');
  const [wasAlone, setWasAlone] = useState(false);
  const [substanceInvolved, setSubstanceInvolved] = useState(false);
  const [selfTalk, setSelfTalk] = useState('');
  const [submittingAutopsy, setSubmittingAutopsy] = useState(false);

  const profile = useUserStore((s) => s.profile);
  const totalCleanDays = useStreakStore((s) => s.totalCleanDays);
  const motivation = profile?.onboarding_data?.motivation;
  const { setFromServer } = useStreakStore();

  async function handleRelapse() {
    if (!profile) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('handle_relapse', {
        p_user_id: profile.id,
        p_notes: notes.trim() || null,
      });

      if (error) throw error;

      setFromServer(data);
      setRelapseId(data?.id ?? null);
      Analytics.relapseLogged().catch(() => {});

      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      setPhase('compassion');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSkipAutopsy() {
    Analytics.relapseAutopsySkipped().catch(() => {});
    router.replace('/(tabs)' as any);
  }

  async function handleSubmitAutopsy() {
    if (!profile || !relapseId) {
      router.replace('/(tabs)' as any);
      return;
    }
    setSubmittingAutopsy(true);

    try {
      await supabase.from('relapse_autopsies').insert({
        user_id: profile.id,
        relapse_id: relapseId,
        trigger: autopsyTrigger,
        time_of_day: mapTimeOfDay(autopsyTimeOfDay),
        was_alone: wasAlone,
        substance_involved: substanceInvolved,
        self_talk: selfTalk.trim() || null,
      });
      Analytics.relapseAutopsyCompleted().catch(() => {});
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingAutopsy(false);
      setPhase('done');
      setTimeout(() => router.replace('/(tabs)' as any), 1200);
    }
  }

  // ── PRE phase (initial form) ────────────────────────────────────────────────
  if (phase === 'pre') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>I slipped up</Text>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.content}>
          <Text style={styles.supportText}>
            This takes courage to log. Relapse is part of recovery — not the end of it.
          </Text>

          <View style={styles.lifetimeCard}>
            <Text style={styles.lifetimeNumber}>{totalCleanDays}</Text>
            <Text style={styles.lifetimeLabel}>lifetime clean {totalCleanDays === 1 ? 'day' : 'days'}</Text>
            <Text style={styles.lifetimeNote}>This number never resets.</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              Want to add a note? <Text style={styles.optional}>(optional)</Text>
            </Text>
            <TextInput
              style={styles.notesInput}
              multiline
              numberOfLines={4}
              placeholder="What happened..."
              placeholderTextColor={Colors.light.textMuted}
              value={notes}
              onChangeText={setNotes}
              textAlignVertical="top"
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable
            style={[styles.relapseBtn, loading && styles.relapseBtnDisabled]}
            onPress={handleRelapse}
            disabled={loading}
          >
            <Text style={styles.relapseBtnText}>
              {loading ? 'Logging...' : 'Log it and restart'}
            </Text>
          </Pressable>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.cancelText}>I changed my mind</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── COMPASSION phase ────────────────────────────────────────────────────────
  if (phase === 'compassion') {
    return (
      <View style={styles.container}>
        <View style={styles.confirmedContent}>
          <Text style={styles.confirmedEmoji}>🌱</Text>
          <Text style={styles.confirmedTitle}>Setbacks are part of recovery.</Text>
          <Text style={styles.confirmedSubtext}>
            You still have {totalCleanDays} lifetime clean {totalCleanDays === 1 ? 'day' : 'days'}.
            That never goes away.
          </Text>
          {motivation ? (
            <View style={styles.motivationCard}>
              <Text style={styles.motivationLabel}>You said you're doing this for:</Text>
              <Text style={styles.motivationText}>"{motivation}"</Text>
            </View>
          ) : null}
          <Text style={styles.confirmedNote}>
            Your streak has been reset. Tomorrow is day 1 again.
          </Text>
        </View>
        <View style={styles.footer}>
          <Pressable style={styles.primaryBtn} onPress={() => setPhase('ask')}>
            <Text style={styles.primaryBtnText}>Continue →</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── ASK phase ───────────────────────────────────────────────────────────────
  if (phase === 'ask') {
    return (
      <View style={styles.container}>
        <View style={styles.confirmedContent}>
          <Text style={styles.confirmedEmoji}>💬</Text>
          <Text style={styles.confirmedTitle}>One more thing.</Text>
          <Text style={styles.confirmedSubtext}>
            Can we spend 2 minutes understanding what happened? This is just for you.
          </Text>
        </View>
        <View style={styles.footer}>
          <Pressable style={styles.primaryBtn} onPress={() => setPhase('debrief')}>
            <Text style={styles.primaryBtnText}>Yes, let's understand it</Text>
          </Pressable>
          <Pressable onPress={handleSkipAutopsy}>
            <Text style={styles.cancelText}>Skip for now</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── DEBRIEF phase ───────────────────────────────────────────────────────────
  if (phase === 'debrief') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.debriefStepText}>Step {autopsyStep + 1} of 5</Text>
          <Pressable onPress={handleSkipAutopsy} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.debriefContent}>

          {autopsyStep === 0 && (
            <View style={styles.debriefSection}>
              <Text style={styles.debriefQuestion}>What triggered it?</Text>
              <View style={styles.chipGrid}>
                {AUTOPSY_TRIGGERS.map((t) => (
                  <Pressable
                    key={t.id}
                    style={[styles.chip, autopsyTrigger === t.id && styles.chipActive]}
                    onPress={() => {
                      setAutopsyTrigger(t.id);
                      setAutopsyStep(1);
                    }}
                  >
                    <Text style={[styles.chipText, autopsyTrigger === t.id && styles.chipTextActive]}>
                      {t.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {autopsyStep === 1 && (
            <View style={styles.debriefSection}>
              <Text style={styles.debriefQuestion}>What time did it happen?</Text>
              <View style={styles.chipGrid}>
                {AUTOPSY_TIMES.map((t) => (
                  <Pressable
                    key={t.id}
                    style={[styles.chip, styles.chipWide, autopsyTimeOfDay === t.id && styles.chipActive]}
                    onPress={() => {
                      setAutopsyTimeOfDay(t.id);
                      setAutopsyStep(2);
                    }}
                  >
                    <Text style={[styles.chipText, autopsyTimeOfDay === t.id && styles.chipTextActive]}>
                      {t.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {autopsyStep === 2 && (
            <View style={styles.debriefSection}>
              <Text style={styles.debriefQuestion}>Were you alone?</Text>
              <View style={styles.boolRow}>
                <Pressable
                  style={[styles.boolBtn, wasAlone && styles.chipActive]}
                  onPress={() => { setWasAlone(true); setAutopsyStep(3); }}
                >
                  <Text style={[styles.chipText, wasAlone && styles.chipTextActive]}>Yes</Text>
                </Pressable>
                <Pressable
                  style={[styles.boolBtn, !wasAlone && autopsyStep >= 2 && styles.chipActive]}
                  onPress={() => { setWasAlone(false); setAutopsyStep(3); }}
                >
                  <Text style={[styles.chipText, !wasAlone && autopsyStep >= 2 && styles.chipTextActive]}>No</Text>
                </Pressable>
              </View>
            </View>
          )}

          {autopsyStep === 3 && (
            <View style={styles.debriefSection}>
              <Text style={styles.debriefQuestion}>Had you been drinking or using anything?</Text>
              <View style={styles.boolRow}>
                <Pressable
                  style={[styles.boolBtn, substanceInvolved && styles.chipActive]}
                  onPress={() => { setSubstanceInvolved(true); setAutopsyStep(4); }}
                >
                  <Text style={[styles.chipText, substanceInvolved && styles.chipTextActive]}>Yes</Text>
                </Pressable>
                <Pressable
                  style={[styles.boolBtn, !substanceInvolved && autopsyStep >= 3 && styles.chipActive]}
                  onPress={() => { setSubstanceInvolved(false); setAutopsyStep(4); }}
                >
                  <Text style={[styles.chipText, !substanceInvolved && autopsyStep >= 3 && styles.chipTextActive]}>No</Text>
                </Pressable>
              </View>
            </View>
          )}

          {autopsyStep === 4 && (
            <View style={styles.debriefSection}>
              <Text style={styles.debriefQuestion}>What were you telling yourself right before?</Text>
              <Text style={styles.optional}>Optional — be honest with yourself</Text>
              <TextInput
                style={styles.selfTalkInput}
                multiline
                numberOfLines={4}
                placeholder="'Just this once...' or 'I deserve it...' or leave blank"
                placeholderTextColor={Colors.light.textMuted}
                value={selfTalk}
                onChangeText={setSelfTalk}
                textAlignVertical="top"
              />
            </View>
          )}
        </ScrollView>

        {autopsyStep === 4 && (
          <View style={styles.footer}>
            <Pressable
              style={[styles.primaryBtn, submittingAutopsy && styles.submitBtnDisabled]}
              onPress={handleSubmitAutopsy}
              disabled={submittingAutopsy}
            >
              <Text style={styles.primaryBtnText}>
                {submittingAutopsy ? 'Saving...' : 'Submit'}
              </Text>
            </Pressable>
            <Pressable onPress={handleSkipAutopsy}>
              <Text style={styles.cancelText}>Skip</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  // ── DONE phase ──────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, styles.doneContainer]}>
      <Text style={styles.confirmedEmoji}>✓</Text>
      <Text style={styles.confirmedTitle}>Got it. That helps.</Text>
      <Text style={styles.confirmedSubtext}>This data is yours. We'll use it to protect you next time.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : 0,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.light.border,
  },
  title: { color: Colors.light.text, fontSize: 20, fontWeight: '700' },
  debriefStepText: { color: Colors.light.textSecondary, fontSize: 15, fontWeight: '600' },
  closeBtn: {
    width: 32, height: 32, borderRadius: Radius.full,
    backgroundColor: Colors.light.backgroundMuted,
    justifyContent: 'center', alignItems: 'center',
  },
  closeBtnText: { color: Colors.light.textSecondary, fontSize: 14, fontWeight: '600' },
  content: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, gap: Spacing.xl },
  scroll: { flex: 1 },
  debriefContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.xl },
  debriefSection: { gap: Spacing.lg },
  debriefQuestion: { color: Colors.light.text, fontSize: 22, fontWeight: '700', lineHeight: 30 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderRadius: Radius.full, backgroundColor: Colors.light.backgroundMuted,
    borderWidth: 1.5, borderColor: Colors.light.border,
  },
  chipWide: { paddingHorizontal: Spacing.xl },
  chipActive: { borderColor: Colors.light.primary, backgroundColor: Colors.light.primaryLight },
  chipText: { color: Colors.light.textSecondary, fontSize: 15, fontWeight: '500' },
  chipTextActive: { color: Colors.light.primaryDark, fontWeight: '700' },
  boolRow: { flexDirection: 'row', gap: Spacing.md },
  boolBtn: {
    flex: 1, paddingVertical: Spacing.md + 4, alignItems: 'center',
    borderRadius: Radius.lg, backgroundColor: Colors.light.backgroundMuted,
    borderWidth: 1.5, borderColor: Colors.light.border,
  },
  selfTalkInput: {
    backgroundColor: Colors.light.backgroundElement, borderRadius: Radius.lg,
    padding: Spacing.md, color: Colors.light.text, fontSize: 15, lineHeight: 22,
    borderWidth: 1, borderColor: Colors.light.border, minHeight: 100,
  },
  supportText: { color: Colors.light.textSecondary, fontSize: 16, lineHeight: 24 },
  lifetimeCard: {
    backgroundColor: Colors.light.primaryLight, borderRadius: Radius.xl,
    padding: Spacing.xl, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.light.primary,
  },
  lifetimeNumber: { color: Colors.light.primaryDark, fontSize: 64, fontWeight: '800', letterSpacing: -2 },
  lifetimeLabel: { color: Colors.light.primaryDark, fontSize: 16, fontWeight: '600' },
  lifetimeNote: { color: Colors.light.textSecondary, fontSize: 13, marginTop: Spacing.xs },
  section: { gap: Spacing.sm },
  sectionLabel: { color: Colors.light.text, fontSize: 16, fontWeight: '700' },
  optional: { color: Colors.light.textMuted, fontWeight: '400', fontSize: 13 },
  notesInput: {
    backgroundColor: Colors.light.backgroundElement, borderRadius: Radius.lg,
    padding: Spacing.md, color: Colors.light.text, fontSize: 15, lineHeight: 22,
    borderWidth: 1, borderColor: Colors.light.border, minHeight: 100,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.lg,
    paddingTop: Spacing.md, gap: Spacing.md, alignItems: 'center',
    borderTopWidth: 1, borderTopColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  relapseBtn: {
    width: '100%', backgroundColor: Colors.light.dangerLight, borderRadius: Radius.lg,
    paddingVertical: Spacing.md + 2, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.light.danger,
  },
  relapseBtnDisabled: { opacity: 0.5 },
  relapseBtnText: { color: Colors.light.danger, fontSize: 17, fontWeight: '700' },
  cancelText: { color: Colors.light.textSecondary, fontSize: 15, textDecorationLine: 'underline' },
  confirmedContent: {
    flex: 1, paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 80 : Platform.OS === 'android' ? 60 : 24,
    gap: Spacing.lg, alignItems: 'center',
  },
  confirmedEmoji: { fontSize: 64 },
  confirmedTitle: { color: Colors.light.text, fontSize: 26, fontWeight: '700', textAlign: 'center', letterSpacing: -0.3 },
  confirmedSubtext: { color: Colors.light.textSecondary, fontSize: 16, lineHeight: 24, textAlign: 'center' },
  motivationCard: {
    backgroundColor: Colors.light.backgroundElement, borderRadius: Radius.lg,
    padding: Spacing.lg, width: '100%',
    borderWidth: 1, borderColor: Colors.light.border, gap: Spacing.xs,
  },
  motivationLabel: { color: Colors.light.textSecondary, fontSize: 13 },
  motivationText: { color: Colors.light.text, fontSize: 16, fontWeight: '600', fontStyle: 'italic' },
  confirmedNote: { color: Colors.light.textMuted, fontSize: 14, textAlign: 'center' },
  primaryBtn: {
    width: '100%', backgroundColor: Colors.light.primary, borderRadius: Radius.lg,
    paddingVertical: Spacing.md + 2, alignItems: 'center',
  },
  primaryBtnText: { color: '#0A0A0F', fontSize: 17, fontWeight: '700' },
  submitBtnDisabled: { opacity: 0.5 },
  doneContainer: { justifyContent: 'center', alignItems: 'center', gap: Spacing.lg, paddingHorizontal: Spacing.xl },
});
