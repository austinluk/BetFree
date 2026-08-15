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
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useUserStore } from '@/store/useUserStore';
import { useStreak } from '@/hooks/useStreak';
import { Colors, Spacing, Radius } from '@/constants/theme';
import type { Mood } from '@/types';

const TRIGGERS = [
  'Sports event',
  'Boredom',
  'Stress',
  'Financial pressure',
  'Social pressure',
  'Loneliness',
  'Celebration',
  'Other',
];

const MOODS: { id: Mood; emoji: string; label: string }[] = [
  { id: 'great', emoji: '😊', label: 'Great' },
  { id: 'good', emoji: '🙂', label: 'Good' },
  { id: 'neutral', emoji: '😐', label: 'Neutral' },
  { id: 'bad', emoji: '😔', label: 'Bad' },
  { id: 'terrible', emoji: '😞', label: 'Terrible' },
];

export default function CheckInScreen() {
  const [urgeLevel, setUrgeLevel] = useState(1);
  const [mood, setMood] = useState<Mood>('neutral');
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [amountSpent, setAmountSpent] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const profile = useUserStore((s) => s.profile);
  const { checkIn } = useStreak();

  function toggleTrigger(trigger: string) {
    setSelectedTriggers((prev) =>
      prev.includes(trigger) ? prev.filter((t) => t !== trigger) : [...prev, trigger]
    );
  }

  async function handleSubmit() {
    if (!profile) return;
    setLoading(true);
    setError('');

    try {
      await checkIn({
        urgeLevel,
        mood,
        triggers: selectedTriggers,
        notes: notes.trim() || null,
        amount_spent: parseFloat(amountSpent) || 0,
      });

      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      router.back();
    } catch (e: any) {
      setError(e.message ?? 'Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const urgeColor =
    urgeLevel <= 3 ? Colors.light.primary :
    urgeLevel <= 6 ? Colors.light.warning :
    Colors.light.danger;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Daily check-in</Text>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {/* Urge level */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Urge level today</Text>
          <View style={styles.urgeRow}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <Pressable
                key={n}
                style={[styles.urgeBtn, urgeLevel === n && { backgroundColor: urgeColor }]}
                onPress={() => setUrgeLevel(n)}
              >
                <Text style={[styles.urgeBtnText, urgeLevel === n && styles.urgeBtnTextActive]}>
                  {n}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.urgeLabel, { color: urgeColor }]}>
            {urgeLevel <= 3 ? 'Low — feeling in control' :
             urgeLevel <= 6 ? 'Moderate — staying aware' :
             'High — use the SOS button if needed'}
          </Text>
        </View>

        {/* Mood */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>How are you feeling?</Text>
          <View style={styles.moodRow}>
            {MOODS.map((m) => (
              <Pressable
                key={m.id}
                style={[styles.moodBtn, mood === m.id && styles.moodBtnActive]}
                onPress={() => setMood(m.id)}
              >
                <Text style={styles.moodEmoji}>{m.emoji}</Text>
                <Text style={[styles.moodLabel, mood === m.id && styles.moodLabelActive]}>
                  {m.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Triggers */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Any triggers today? <Text style={styles.optional}>(optional)</Text></Text>
          <View style={styles.triggerGrid}>
            {TRIGGERS.map((t) => (
              <Pressable
                key={t}
                style={[styles.triggerChip, selectedTriggers.includes(t) && styles.triggerChipActive]}
                onPress={() => toggleTrigger(t)}
              >
                <Text style={[styles.triggerText, selectedTriggers.includes(t) && styles.triggerTextActive]}>
                  {t}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Anything else? <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput
            style={styles.notesInput}
            multiline
            numberOfLines={3}
            placeholder="How was your day..."
            placeholderTextColor={Colors.light.textMuted}
            value={notes}
            onChangeText={setNotes}
            textAlignVertical="top"
          />
        </View>

        {/* Amount spent */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Amount spent today <Text style={styles.optional}>(optional)</Text></Text>
          <Text style={styles.amountSublabel}>Enter $0 if you stayed clean</Text>
          <View style={styles.amountRow}>
            <View style={styles.amountPrefix}>
              <Text style={styles.amountPrefixText}>$</Text>
            </View>
            <TextInput
              style={styles.amountInput}
              keyboardType="decimal-pad"
              value={amountSpent}
              onChangeText={setAmountSpent}
              placeholder="0"
              placeholderTextColor={Colors.light.textMuted}
              returnKeyType="done"
            />
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitBtnText}>
            {loading ? 'Saving...' : 'Log today ✓'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : 0,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  title: { color: Colors.light.text, fontSize: 20, fontWeight: '700' },
  closeBtn: {
    width: 32, height: 32, borderRadius: Radius.full,
    backgroundColor: Colors.light.backgroundMuted,
    justifyContent: 'center', alignItems: 'center',
  },
  closeBtnText: { color: Colors.light.textSecondary, fontSize: 14, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, gap: Spacing.xl },
  section: { gap: Spacing.md },
  sectionLabel: { color: Colors.light.text, fontSize: 16, fontWeight: '700' },
  optional: { color: Colors.light.textMuted, fontWeight: '400', fontSize: 14 },
  urgeRow: { flexDirection: 'row', gap: Spacing.xs },
  urgeBtn: {
    flex: 1, height: 40, borderRadius: Radius.md,
    backgroundColor: Colors.light.backgroundMuted,
    justifyContent: 'center', alignItems: 'center',
  },
  urgeBtnText: { color: Colors.light.textSecondary, fontSize: 13, fontWeight: '600' },
  urgeBtnTextActive: { color: '#FFFFFF' },
  urgeLabel: { fontSize: 13, fontWeight: '500', marginTop: -Spacing.xs },
  moodRow: { flexDirection: 'row', gap: Spacing.sm },
  moodBtn: {
    flex: 1, alignItems: 'center', padding: Spacing.sm,
    borderRadius: Radius.lg, backgroundColor: Colors.light.backgroundMuted,
    borderWidth: 2, borderColor: 'transparent',
  },
  moodBtnActive: { borderColor: Colors.light.primary, backgroundColor: Colors.light.primaryLight },
  moodEmoji: { fontSize: 24 },
  moodLabel: { color: Colors.light.textSecondary, fontSize: 11, marginTop: 4, fontWeight: '500' },
  moodLabelActive: { color: Colors.light.primaryDark },
  triggerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  triggerChip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full, backgroundColor: Colors.light.backgroundMuted,
    borderWidth: 1.5, borderColor: Colors.light.border,
  },
  triggerChipActive: { borderColor: Colors.light.primary, backgroundColor: Colors.light.primaryLight },
  triggerText: { color: Colors.light.textSecondary, fontSize: 14, fontWeight: '500' },
  triggerTextActive: { color: Colors.light.primaryDark, fontWeight: '600' },
  notesInput: {
    backgroundColor: Colors.light.backgroundElement, borderRadius: Radius.lg,
    padding: Spacing.md, color: Colors.light.text, fontSize: 15, lineHeight: 22,
    borderWidth: 1, borderColor: Colors.light.border, minHeight: 90,
  },
  amountSublabel: { color: Colors.light.textSecondary, fontSize: 13, marginTop: -Spacing.xs },
  amountRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.light.border,
    overflow: 'hidden',
  },
  amountPrefix: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    backgroundColor: Colors.light.backgroundMuted,
    borderRightWidth: 1, borderRightColor: Colors.light.border,
  },
  amountPrefixText: { color: Colors.light.textSecondary, fontSize: 16, fontWeight: '600' },
  amountInput: {
    flex: 1, padding: Spacing.md, color: Colors.light.text, fontSize: 16,
  },
  errorText: { color: Colors.light.danger, fontSize: 14, textAlign: 'center' },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  submitBtn: {
    backgroundColor: Colors.light.primary, borderRadius: Radius.lg,
    paddingVertical: Spacing.md + 2, alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#0A0A0F', fontSize: 17, fontWeight: '700' },
});
