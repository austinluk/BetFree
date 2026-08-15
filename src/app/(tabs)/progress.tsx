import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { useStreakStore, useMoneySaved } from '@/store/useStreakStore';
import { useAvatarStore } from '@/store/useAvatarStore';
import { useUserStore } from '@/store/useUserStore';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius, BottomTabInset } from '@/constants/theme';

interface BadgeDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  requirement: string;
}

const BADGES: BadgeDef[] = [
  { id: 'day_1', name: 'First Step', emoji: '🌱', description: 'One day clean', requirement: '1 day streak' },
  { id: 'day_3', name: '72 Hours', emoji: '⚡', description: 'Three days clean', requirement: '3 day streak' },
  { id: 'day_7', name: 'One Week', emoji: '🔥', description: 'Seven days clean', requirement: '7 day streak' },
  { id: 'day_14', name: 'Fortnight', emoji: '💪', description: 'Two weeks clean', requirement: '14 day streak' },
  { id: 'day_30', name: 'One Month', emoji: '🏅', description: 'Thirty days clean', requirement: '30 day streak' },
  { id: 'day_90', name: 'Three Months', emoji: '🏆', description: 'Ninety days clean', requirement: '90 day streak' },
  { id: 'day_180', name: 'Half Year', emoji: '💎', description: 'Six months clean', requirement: '180 day streak' },
  { id: 'day_365', name: 'One Year', emoji: '👑', description: 'One year clean', requirement: '365 day streak' },
  { id: 'saved_100', name: 'Hundred Back', emoji: '💰', description: '$100 saved', requirement: '$100 saved' },
  { id: 'saved_1000', name: 'Grand Recovered', emoji: '💵', description: '$1,000 saved', requirement: '$1,000 saved' },
  { id: 'urge_slayer', name: 'Urge Slayer', emoji: '🛡️', description: '10 urges defeated', requirement: '10 SOS completions' },
  { id: 'not_alone', name: 'Not Alone', emoji: '🤝', description: 'First community post', requirement: 'Post in community' },
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// What the money saved is equivalent to — emotional anchoring
const MONEY_MILESTONES = [
  { amount: 50, label: 'a nice dinner out' },
  { amount: 100, label: 'a full tank of gas × 3' },
  { amount: 250, label: 'a weekend trip' },
  { amount: 500, label: 'a new phone' },
  { amount: 1000, label: 'a vacation' },
  { amount: 2500, label: 'a month of rent' },
  { amount: 5000, label: 'a used car down payment' },
  { amount: 10000, label: 'a dream trip abroad' },
];

function getMoneyEquivalent(amount: number): string {
  const sorted = [...MONEY_MILESTONES].sort((a, b) => b.amount - a.amount);
  const match = sorted.find((m) => amount >= m.amount);
  return match ? match.label : 'your first milestone';
}

interface TriggerInsights {
  topTriggers: { name: string; count: number }[];
  worstDay: string | null;
  avgUrge: number;
  totalCheckins: number;
  urgeByDay: number[]; // index 0=Sun
}

async function loadInsights(userId: string): Promise<TriggerInsights> {
  const { data } = await supabase
    .from('checkins')
    .select('urge_level, triggers, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(90);

  if (!data || data.length === 0) {
    return { topTriggers: [], worstDay: null, avgUrge: 0, totalCheckins: 0, urgeByDay: [0,0,0,0,0,0,0] };
  }

  const triggerCounts: Record<string, number> = {};
  const urgeSumByDay: number[] = [0,0,0,0,0,0,0];
  const urgeCountByDay: number[] = [0,0,0,0,0,0,0];
  let urgeTotal = 0;

  for (const row of data) {
    const day = new Date(row.created_at).getDay();
    urgeSumByDay[day] += row.urge_level ?? 0;
    urgeCountByDay[day] += 1;
    urgeTotal += row.urge_level ?? 0;
    for (const t of (row.triggers ?? [])) {
      triggerCounts[t] = (triggerCounts[t] ?? 0) + 1;
    }
  }

  const urgeByDay = urgeSumByDay.map((sum, i) =>
    urgeCountByDay[i] > 0 ? sum / urgeCountByDay[i] : 0
  );

  const worstDayIdx = urgeByDay.indexOf(Math.max(...urgeByDay));
  const worstDay = urgeByDay[worstDayIdx] > 0 ? DAY_LABELS[worstDayIdx] : null;

  const topTriggers = Object.entries(triggerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return {
    topTriggers,
    worstDay,
    avgUrge: urgeTotal / data.length,
    totalCheckins: data.length,
    urgeByDay,
  };
}

export default function ProgressScreen() {
  const currentStreak = useStreakStore((s) => s.currentStreak);
  const longestStreak = useStreakStore((s) => s.longestStreak);
  const totalCleanDays = useStreakStore((s) => s.totalCleanDays);
  const moneySaved = useMoneySaved();
  const { earnedBadges } = useAvatarStore();
  const profile = useUserStore((s) => s.profile);

  const [insights, setInsights] = useState<TriggerInsights | null>(null);
  const [checkinCount, setCheckinCount] = useState(0);
  const [hasInsight, setHasInsight] = useState(false);
  const [insightPreview, setInsightPreview] = useState<{ day: number; block: string; avg: number } | null>(null);

  useEffect(() => {
    if (!profile) return;
    loadInsights(profile.id).then(setInsights);

    supabase
      .from('checkins')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .then(({ count: c }) => setCheckinCount(c ?? 0));

    supabase
      .from('user_insights')
      .select('data, insight_type')
      .eq('user_id', profile.id)
      .eq('insight_type', 'danger_window')
      .maybeSingle()
      .then(({ data: ins }) => {
        if (ins) {
          setHasInsight(true);
          const d = ins.data;
          setInsightPreview({ day: d.day_of_week, block: d.time_block, avg: d.avg_urge });
        }
      });
  }, [profile]);

  const earnedSet = new Set(earnedBadges);
  const moneyEquivalent = getMoneyEquivalent(moneySaved);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + 20 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Progress</Text>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{currentStreak}</Text>
          <Text style={styles.statLabel}>Current streak</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{longestStreak}</Text>
          <Text style={styles.statLabel}>Longest streak</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalCleanDays}</Text>
          <Text style={styles.statLabel}>Total clean days</Text>
        </View>
      </View>

      {/* Money saved with emotional anchor */}
      <View style={styles.moneyCard}>
        <Text style={styles.moneyAmount}>${moneySaved.toLocaleString()}</Text>
        <Text style={styles.moneyLabel}>Total saved</Text>
        {moneySaved > 0 && (
          <Text style={styles.moneyEquivalent}>That's enough for {moneyEquivalent} 🎯</Text>
        )}
      </View>

      {/* Trigger insights */}
      {insights && insights.totalCheckins >= 3 && (
        <>
          <Text style={styles.sectionTitle}>Your patterns</Text>

          {/* Urge by day bar chart */}
          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>⚡ Urge intensity by day</Text>
            <Text style={styles.insightSub}>Your hardest day: <Text style={styles.insightHighlight}>{insights.worstDay ?? '—'}</Text></Text>
            <View style={styles.barChart}>
              {insights.urgeByDay.map((val, i) => {
                const max = Math.max(...insights.urgeByDay, 1);
                const height = Math.max(4, (val / max) * 60);
                const isWorst = DAY_LABELS[i] === insights.worstDay;
                return (
                  <View key={i} style={styles.barCol}>
                    <View style={[styles.bar, { height }, isWorst && styles.barWorst]} />
                    <Text style={[styles.barLabel, isWorst && styles.barLabelWorst]}>{DAY_LABELS[i]}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Top triggers */}
          {insights.topTriggers.length > 0 && (
            <View style={styles.insightCard}>
              <Text style={styles.insightTitle}>🎯 Your top triggers</Text>
              <Text style={styles.insightSub}>Based on {insights.totalCheckins} check-ins</Text>
              <View style={styles.triggerList}>
                {insights.topTriggers.map((t, i) => (
                  <View key={t.name} style={styles.triggerRow}>
                    <Text style={styles.triggerRank}>#{i + 1}</Text>
                    <Text style={styles.triggerName}>{t.name}</Text>
                    <View style={styles.triggerBarBg}>
                      <View style={[
                        styles.triggerBarFill,
                        { width: `${(t.count / insights.topTriggers[0].count) * 100}%` as any }
                      ]} />
                    </View>
                    <Text style={styles.triggerCount}>{t.count}×</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Avg urge */}
          <View style={styles.insightRow}>
            <View style={styles.insightMini}>
              <Text style={styles.insightMiniValue}>{insights.avgUrge.toFixed(1)}</Text>
              <Text style={styles.insightMiniLabel}>Avg urge level</Text>
            </View>
            <View style={styles.insightMini}>
              <Text style={styles.insightMiniValue}>{insights.totalCheckins}</Text>
              <Text style={styles.insightMiniLabel}>Total check-ins</Text>
            </View>
          </View>
        </>
      )}

      {/* Badges */}
      <Text style={styles.sectionTitle}>
        Badges — {earnedBadges.length} / {BADGES.length}
      </Text>

      <View style={styles.badgeGrid}>
        {BADGES.map((badge) => {
          const earned = earnedSet.has(badge.id);
          return (
            <View
              key={badge.id}
              style={[styles.badgeCard, !earned && styles.badgeCardLocked]}
            >
              <Text style={[styles.badgeEmoji, !earned && styles.badgeEmojiLocked]}>
                {earned ? badge.emoji : '🔒'}
              </Text>
              <Text style={[styles.badgeName, !earned && styles.badgeNameLocked]}>
                {badge.name}
              </Text>
              <Text style={[styles.badgeReq, !earned && styles.badgeReqLocked]}>
                {badge.requirement}
              </Text>
              {earned && (
                <View style={styles.earnedDot} />
              )}
            </View>
          );
        })}
      </View>

      {/* Urge Pattern Intelligence */}
      <Text style={styles.sectionTitle}>Your Risk Pattern</Text>
      <Pressable
        style={styles.patternCard}
        onPress={() => router.push('/urge-pattern' as any)}
      >
        {checkinCount < 14 ? (
          <>
            <Text style={styles.patternTitle}>🧠 Pattern detection</Text>
            <Text style={styles.patternBody}>Keep logging — your pattern appears after 14 days.</Text>
            <Text style={styles.patternCount}>{checkinCount} / 14 check-ins logged</Text>
            <View style={styles.patternBarBg}>
              <View style={[styles.patternBarFill, { width: `${(checkinCount / 14) * 100}%` as any }]} />
            </View>
          </>
        ) : hasInsight && insightPreview ? (
          <>
            <Text style={styles.patternTitle}>🧠 Danger window detected</Text>
            <Text style={styles.patternBody}>
              {DAY_NAMES[insightPreview.day]} {insightPreview.block}s — avg urge {insightPreview.avg.toFixed(1)}/10
            </Text>
            <Text style={styles.patternCta}>View full analysis →</Text>
          </>
        ) : (
          <>
            <Text style={styles.patternTitle}>🧠 Analysis ready</Text>
            <Text style={styles.patternBody}>Based on {checkinCount} check-ins. Tap to view your pattern.</Text>
            <Text style={styles.patternCta}>View analysis →</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : Spacing.lg,
    gap: Spacing.lg,
  },
  title: { fontSize: 28, fontWeight: '800', color: Colors.light.text, letterSpacing: -0.3 },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
    gap: 4,
  },
  statNumber: { fontSize: 28, fontWeight: '800', color: Colors.light.primary, letterSpacing: -1 },
  statLabel: { fontSize: 11, color: Colors.light.textSecondary, textAlign: 'center' },
  moneyCard: {
    backgroundColor: Colors.light.primaryLight,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.primary,
    gap: 4,
  },
  moneyAmount: { fontSize: 44, fontWeight: '800', color: Colors.light.primaryDark, letterSpacing: -1 },
  moneyLabel: { fontSize: 14, color: Colors.light.primaryDark, fontWeight: '600' },
  moneyEquivalent: { fontSize: 13, color: Colors.light.primaryDark, opacity: 0.7, textAlign: 'center', marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.light.text },
  // Insights
  insightCard: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: Radius.xl, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.light.border, gap: Spacing.md,
  },
  insightTitle: { fontSize: 15, fontWeight: '700', color: Colors.light.text },
  insightSub: { fontSize: 13, color: Colors.light.textSecondary, marginTop: -Spacing.sm },
  insightHighlight: { color: Colors.light.danger, fontWeight: '700' },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 80 },
  barCol: { flex: 1, alignItems: 'center', gap: 4, justifyContent: 'flex-end' },
  bar: { width: '100%', backgroundColor: Colors.light.primaryLight, borderRadius: 4, borderWidth: 1, borderColor: Colors.light.primary },
  barWorst: { backgroundColor: Colors.light.danger, borderColor: Colors.light.danger },
  barLabel: { fontSize: 9, color: Colors.light.textMuted, fontWeight: '600' },
  barLabelWorst: { color: Colors.light.danger, fontWeight: '800' },
  triggerList: { gap: Spacing.sm },
  triggerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  triggerRank: { fontSize: 12, fontWeight: '700', color: Colors.light.textMuted, width: 20 },
  triggerName: { fontSize: 13, color: Colors.light.text, fontWeight: '600', width: 90 },
  triggerBarBg: { flex: 1, height: 6, backgroundColor: Colors.light.backgroundMuted, borderRadius: 3, overflow: 'hidden' },
  triggerBarFill: { height: 6, backgroundColor: Colors.light.accent, borderRadius: 3 },
  triggerCount: { fontSize: 12, color: Colors.light.textSecondary, width: 24, textAlign: 'right' },
  insightRow: { flexDirection: 'row', gap: Spacing.sm },
  insightMini: {
    flex: 1, backgroundColor: Colors.light.backgroundElement,
    borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.light.border, gap: 4,
  },
  insightMiniValue: { fontSize: 26, fontWeight: '800', color: Colors.light.text, letterSpacing: -0.5 },
  insightMiniLabel: { fontSize: 11, color: Colors.light.textSecondary, textAlign: 'center' },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  badgeCard: {
    width: '30%',
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.light.primary,
    gap: 4,
    position: 'relative',
  },
  badgeCardLocked: {
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.backgroundMuted,
  },
  badgeEmoji: { fontSize: 28 },
  badgeEmojiLocked: { opacity: 0.3 },
  badgeName: { fontSize: 11, fontWeight: '700', color: Colors.light.text, textAlign: 'center' },
  badgeNameLocked: { color: Colors.light.textMuted },
  badgeReq: { fontSize: 9, color: Colors.light.textSecondary, textAlign: 'center' },
  badgeReqLocked: { color: Colors.light.textMuted },
  earnedDot: {
    position: 'absolute',
    top: 6, right: 6,
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.primary,
  },
  // Risk Pattern
  patternCard: {
    backgroundColor: Colors.light.backgroundElement, borderRadius: Radius.xl,
    padding: Spacing.lg, gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  patternTitle: { fontSize: 15, fontWeight: '700', color: Colors.light.text },
  patternBody: { fontSize: 13, color: Colors.light.textSecondary, lineHeight: 20 },
  patternCount: { fontSize: 12, color: Colors.light.textMuted, fontWeight: '600' },
  patternBarBg: { height: 4, backgroundColor: Colors.light.backgroundMuted, borderRadius: Radius.full, overflow: 'hidden' },
  patternBarFill: { height: 4, backgroundColor: Colors.light.primary, borderRadius: Radius.full },
  patternCta: { color: Colors.light.primary, fontSize: 13, fontWeight: '600' },
});
