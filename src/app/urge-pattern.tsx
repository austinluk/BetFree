import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet, Switch, ActivityIndicator, Platform,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/useUserStore';
import { Analytics } from '@/lib/analytics';
import { Colors, Spacing, Radius } from '@/constants/theme';
import type { DangerWindowData, UserInsight } from '@/types';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface RawCheckin {
  date: string;
  urge_level: number;
  triggers: string[];
  created_at: string;
}

interface SlotData {
  dow: number;
  block: string;
  sum: number;
  count: number;
  triggers: string[];
}

function getTimeBlock(hour: number): string {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

function computeDangerWindow(checkins: RawCheckin[]): DangerWindowData | null {
  if (!checkins || checkins.length < 14) return null;

  const slotMap: Record<string, SlotData> = {};

  for (const c of checkins) {
    const dow = new Date(c.date + 'T12:00:00').getDay();
    const hour = new Date(c.created_at).getHours();
    const block = getTimeBlock(hour);
    const key = `${dow}_${block}`;

    if (!slotMap[key]) {
      slotMap[key] = { dow, block, sum: 0, count: 0, triggers: [] };
    }
    slotMap[key].sum += c.urge_level;
    slotMap[key].count += 1;
    if (c.triggers) slotMap[key].triggers.push(...c.triggers);
  }

  let best: SlotData | null = null;
  for (const slot of Object.values(slotMap)) {
    const avg = slot.sum / slot.count;
    if (avg >= 6.0 && slot.count >= 3) {
      if (!best || avg > best.sum / best.count) best = slot;
    }
  }

  if (!best) return null;

  const avg_urge = parseFloat((best.sum / best.count).toFixed(1));

  const triggerCounts: Record<string, number> = {};
  for (const t of best.triggers) {
    triggerCounts[t] = (triggerCounts[t] ?? 0) + 1;
  }
  const correlations = Object.entries(triggerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([factor, count]) => ({ factor, count }));

  return {
    day_of_week: best.dow,
    time_block: best.block as DangerWindowData['time_block'],
    avg_urge,
    occurrences: best.count,
    total_checkins: checkins.length,
    correlations,
  };
}

function mapBlockToHour(block: string): { hour: number; minute: number } {
  const map: Record<string, number> = { morning: 8, afternoon: 12, evening: 17, night: 21 };
  const baseHour = map[block] ?? 12;
  const minute = baseHour === 0 ? 45 : 45;
  const hour = minute === 45 && baseHour > 0 ? baseHour - 1 : baseHour;
  return { hour, minute: 45 };
}

export default function UrgePatternScreen() {
  const [checkins, setCheckins] = useState<RawCheckin[]>([]);
  const [insight, setInsight] = useState<DangerWindowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [protectionEnabled, setProtectionEnabled] = useState(true);

  const profile = useUserStore((s) => s.profile);

  const scheduleProtection = useCallback((data: DangerWindowData, enabled: boolean) => {
    if (Platform.OS === 'web') return;
    Notifications.cancelScheduledNotificationAsync('danger-window-protection').catch(() => {});
    if (!enabled) return;
    const { hour, minute } = mapBlockToHour(data.time_block);
    Notifications.scheduleNotificationAsync({
      identifier: 'danger-window-protection',
      content: {
        title: 'Heads up',
        body: 'Your check-in reminder — just for today.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: data.day_of_week + 1,
        hour,
        minute,
      },
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!profile) return;
    Analytics.urgePatternViewed().catch(() => {});
    loadData();
  }, [profile]);

  async function loadData() {
    if (!profile) return;
    setLoading(true);

    const [checkinsRes, insightRes] = await Promise.all([
      supabase
        .from('checkins')
        .select('date, urge_level, triggers, created_at')
        .eq('user_id', profile.id)
        .order('date', { ascending: false })
        .limit(30),
      supabase
        .from('user_insights')
        .select('*')
        .eq('user_id', profile.id)
        .eq('insight_type', 'danger_window')
        .maybeSingle(),
    ]);

    const rawCheckins = (checkinsRes.data ?? []) as RawCheckin[];
    setCheckins(rawCheckins);

    let computed: DangerWindowData | null = null;

    if (insightRes.data) {
      const serverInsight = insightRes.data as UserInsight;
      const ageMs = Date.now() - new Date(serverInsight.computed_at).getTime();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      if (ageMs < sevenDaysMs) {
        computed = serverInsight.data as DangerWindowData;
        if (!serverInsight.shown_at) {
          supabase
            .from('user_insights')
            .update({ shown_at: new Date().toISOString() })
            .eq('id', serverInsight.id)
            .then(() => {});
        }
      }
    }

    if (!computed) {
      computed = computeDangerWindow(rawCheckins);
    }

    setInsight(computed);
    if (computed) scheduleProtection(computed, true);
    setLoading(false);
  }

  function handleProtectionToggle(value: boolean) {
    setProtectionEnabled(value);
    if (insight) scheduleProtection(insight, value);
    Analytics.dangerWindowProtectionToggled(value).catch(() => {});
  }

  const urgeColor = (avg: number) =>
    avg >= 7 ? Colors.light.danger : avg >= 5 ? Colors.light.warning : Colors.light.primary;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Your Risk Pattern</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.light.primary} size="large" />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

          {checkins.length < 14 ? (
            <View style={styles.progressCard}>
              <Text style={styles.progressTitle}>Keep checking in.</Text>
              <Text style={styles.progressBody}>
                After 14 days, we'll show you your personal risk pattern.
              </Text>
              <Text style={styles.progressCount}>{checkins.length} / 14 check-ins logged</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${(checkins.length / 14) * 100}%` as any }]} />
              </View>
            </View>
          ) : insight ? (
            <>
              <View style={styles.insightCard}>
                <Text style={styles.insightLabel}>YOUR DANGER WINDOW</Text>
                <Text style={styles.insightWindow}>
                  {DAY_NAMES[insight.day_of_week]} {insight.time_block}s
                </Text>
                <View style={styles.insightRow}>
                  <View style={styles.insightStat}>
                    <Text style={[styles.insightStatValue, { color: urgeColor(insight.avg_urge) }]}>
                      {insight.avg_urge}/10
                    </Text>
                    <Text style={styles.insightStatLabel}>Avg urge</Text>
                  </View>
                  <View style={styles.insightStat}>
                    <Text style={styles.insightStatValue}>{insight.occurrences}</Text>
                    <Text style={styles.insightStatLabel}>Occurrences</Text>
                  </View>
                  <View style={styles.insightStat}>
                    <Text style={styles.insightStatValue}>{insight.total_checkins}</Text>
                    <Text style={styles.insightStatLabel}>Check-ins</Text>
                  </View>
                </View>
              </View>

              {insight.correlations.length > 0 && (
                <View style={styles.correlationsCard}>
                  <Text style={styles.correlationsTitle}>Top factors in your risk window</Text>
                  {insight.correlations.map((c, i) => (
                    <View key={c.factor} style={styles.correlationRow}>
                      <Text style={styles.correlationRank}>#{i + 1}</Text>
                      <Text style={styles.correlationFactor}>{c.factor}</Text>
                      <View style={styles.correlationBarBg}>
                        <View style={[
                          styles.correlationBarFill,
                          { width: `${(c.count / (insight.correlations[0]?.count || 1)) * 100}%` as any }
                        ]} />
                      </View>
                      <Text style={styles.correlationCount}>{c.count}×</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.protectionCard}>
                <View style={styles.protectionTop}>
                  <Text style={styles.protectionTitle}>Auto-protection</Text>
                  <Switch
                    value={protectionEnabled}
                    onValueChange={handleProtectionToggle}
                    trackColor={{ false: Colors.light.border, true: Colors.light.primary }}
                    thumbColor="#fff"
                  />
                </View>
                <Text style={styles.protectionBody}>
                  Weekly check-in reminder 15 min before your {DAY_NAMES[insight.day_of_week]} {insight.time_block} risk window.
                </Text>
              </View>

              <Text style={styles.dataBasis}>
                Based on your last {insight.total_checkins} check-ins.
              </Text>
            </>
          ) : (
            <View style={styles.progressCard}>
              <Text style={styles.progressTitle}>No strong pattern detected yet.</Text>
              <Text style={styles.progressBody}>
                Your urge levels have been consistent — that's actually a good sign. Keep logging.
              </Text>
              <Text style={styles.progressCount}>Based on {checkins.length} check-ins</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.light.border,
  },
  backBtn: { width: 60 },
  backBtnText: { color: Colors.light.primary, fontSize: 15, fontWeight: '600' },
  headerTitle: { color: Colors.light.text, fontSize: 17, fontWeight: '700' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, gap: Spacing.lg },
  progressCard: {
    backgroundColor: Colors.light.backgroundElement, borderRadius: Radius.xl,
    padding: Spacing.xl, gap: Spacing.md,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  progressTitle: { fontSize: 20, fontWeight: '700', color: Colors.light.text },
  progressBody: { fontSize: 15, color: Colors.light.textSecondary, lineHeight: 22 },
  progressCount: { fontSize: 13, color: Colors.light.textMuted, fontWeight: '600' },
  progressBarBg: {
    height: 6, backgroundColor: Colors.light.backgroundMuted,
    borderRadius: Radius.full, overflow: 'hidden',
  },
  progressBarFill: { height: 6, backgroundColor: Colors.light.primary, borderRadius: Radius.full },
  insightCard: {
    backgroundColor: Colors.light.backgroundElement, borderRadius: Radius.xl,
    padding: Spacing.xl, gap: Spacing.lg,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  insightLabel: { color: Colors.light.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  insightWindow: { color: Colors.light.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.3 },
  insightRow: { flexDirection: 'row', gap: Spacing.md },
  insightStat: { flex: 1, alignItems: 'center', gap: 4 },
  insightStatValue: { fontSize: 22, fontWeight: '800', color: Colors.light.text },
  insightStatLabel: { fontSize: 11, color: Colors.light.textSecondary, textAlign: 'center' },
  correlationsCard: {
    backgroundColor: Colors.light.backgroundElement, borderRadius: Radius.xl,
    padding: Spacing.lg, gap: Spacing.md,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  correlationsTitle: { fontSize: 15, fontWeight: '700', color: Colors.light.text },
  correlationRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  correlationRank: { fontSize: 12, fontWeight: '700', color: Colors.light.textMuted, width: 20 },
  correlationFactor: { fontSize: 13, color: Colors.light.text, fontWeight: '600', width: 100 },
  correlationBarBg: { flex: 1, height: 6, backgroundColor: Colors.light.backgroundMuted, borderRadius: 3, overflow: 'hidden' },
  correlationBarFill: { height: 6, backgroundColor: Colors.light.accent, borderRadius: 3 },
  correlationCount: { fontSize: 12, color: Colors.light.textSecondary, width: 24, textAlign: 'right' },
  protectionCard: {
    backgroundColor: Colors.light.primaryLight, borderRadius: Radius.xl,
    padding: Spacing.lg, gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.light.primary,
  },
  protectionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  protectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.light.primaryDark },
  protectionBody: { fontSize: 13, color: Colors.light.primaryDark, lineHeight: 20 },
  dataBasis: { color: Colors.light.textMuted, fontSize: 12, textAlign: 'center' },
});
