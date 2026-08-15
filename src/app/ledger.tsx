import { useState, useEffect } from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet, Share, ActivityIndicator, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/useUserStore';
import { useStreakStore } from '@/store/useStreakStore';
import { usePremium } from '@/hooks/usePremium';
import { Analytics } from '@/lib/analytics';
import { Colors, Spacing, Radius } from '@/constants/theme';
import type { MonthlyStatement } from '@/types';

function getFirstOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
}

function getMonthName(): string {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function calcEquivalents(amount: number): Array<{ label: string; count: number }> {
  const items: Array<{ label: string; count: number }> = [];
  const groceries = Math.floor(amount / 200);
  if (groceries >= 1) items.push({ label: 'month of groceries (~$200)', count: groceries });
  const gas = Math.floor(amount / 60);
  if (gas >= 1) items.push({ label: 'tank of gas (~$60)', count: gas });
  const streaming = Math.floor(amount / 15);
  if (streaming >= 1) items.push({ label: 'streaming subscription (~$15)', count: streaming });
  return items.slice(0, 3);
}

export default function LedgerScreen() {
  const [daysThisMonth, setDaysThisMonth] = useState(0);
  const [history, setHistory] = useState<MonthlyStatement[]>([]);
  const [loading, setLoading] = useState(true);

  const profile = useUserStore((s) => s.profile);
  const { totalCleanDays, weeklyBetEstimate } = useStreakStore();
  const { isPremium, showPaywall } = usePremium();

  const amountThisMonth = Math.floor((daysThisMonth * weeklyBetEstimate) / 7);
  const runningTotal = Math.floor((totalCleanDays * weeklyBetEstimate) / 7);
  const savingsGoal = profile?.savings_goal_amount ?? null;
  const goalLabel = profile?.savings_goal_label ?? null;
  const goalProgress = savingsGoal && savingsGoal > 0
    ? Math.min(100, Math.floor((runningTotal / savingsGoal) * 100))
    : null;
  const equivalents = calcEquivalents(amountThisMonth);
  const monthName = getMonthName();

  useEffect(() => {
    if (!profile) return;
    Analytics.ledgerViewed().catch(() => {});
    loadData();
  }, [profile]);

  async function loadData() {
    if (!profile) return;
    setLoading(true);

    const firstOfMonth = getFirstOfMonth();
    const [countResult, historyResult] = await Promise.all([
      supabase
        .from('checkins')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .gte('date', firstOfMonth),
      isPremium
        ? supabase
            .from('monthly_statements')
            .select('*')
            .eq('user_id', profile.id)
            .order('month', { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);

    setDaysThisMonth(countResult.count ?? 0);
    setHistory((historyResult.data ?? []) as MonthlyStatement[]);
    setLoading(false);
  }

  async function handleShare() {
    try {
      await Share.share({
        message: `${monthName} — ${daysThisMonth} days clean. $${amountThisMonth} saved this month. $${runningTotal} total.`,
      });
      Analytics.ledgerShared().catch(() => {});
    } catch (e) {
      // user cancelled
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>
        <View style={styles.headerTitles}>
          <Text style={styles.headerMonth}>{monthName.toUpperCase()}</Text>
          <Text style={styles.headerSub}>WHAT YOU KEPT</Text>
        </View>
        {isPremium ? (
          <Pressable style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareBtnText}>Share</Text>
          </Pressable>
        ) : (
          <View style={{ width: 50 }} />
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.light.primary} size="large" />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

          {/* Statement card */}
          <View style={styles.statementCard}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Days clean this month</Text>
              <Text style={styles.statValue}>{daysThisMonth}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Money not lost</Text>
              <Text style={[styles.statValue, styles.moneyGreen]}>${amountThisMonth.toLocaleString()}</Text>
            </View>

            <View style={styles.separator} />

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Running total</Text>
              {isPremium ? (
                <Text style={[styles.statValue, styles.moneyGreen]}>${runningTotal.toLocaleString()}</Text>
              ) : (
                <Pressable style={styles.lockedRow} onPress={() => showPaywall('ledger_history')}>
                  <Text style={styles.lockedText}>🔒 Premium</Text>
                </Pressable>
              )}
            </View>

            {equivalents.length > 0 && (
              <>
                <View style={styles.separator} />
                <Text style={styles.equivalentsLabel}>That's equivalent to:</Text>
                {equivalents.map((eq) => (
                  <Text key={eq.label} style={styles.equivalentItem}>
                    ✓  {eq.count > 1 ? `${eq.count}× ` : ''}{eq.label}
                  </Text>
                ))}
              </>
            )}
          </View>

          {/* Savings goal */}
          {savingsGoal !== null && goalProgress !== null && (
            <View style={styles.goalCard}>
              <Text style={styles.goalTitle}>
                You're {goalProgress}% of the way to:
              </Text>
              <Text style={styles.goalLabel}>{goalLabel ?? 'your goal'}</Text>
              <View style={styles.goalBarBg}>
                <View style={[styles.goalBarFill, { width: `${goalProgress}%` as any }]} />
              </View>
              <Text style={styles.goalProgress}>${runningTotal.toLocaleString()} of ${savingsGoal.toLocaleString()}</Text>
            </View>
          )}

          {/* History */}
          <Text style={styles.sectionTitle}>Statement History</Text>
          {isPremium ? (
            history.length === 0 ? (
              <Text style={styles.historyEmpty}>
                Statements generate on the 1st of each month.
              </Text>
            ) : (
              history.map((stmt) => (
                <View key={stmt.id} style={styles.historyCard}>
                  <Text style={styles.historyMonth}>
                    {new Date(stmt.month + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </Text>
                  <View style={styles.historyRow}>
                    <Text style={styles.historyLabel}>{stmt.days_clean} days clean</Text>
                    <Text style={styles.historyValue}>${stmt.amount_saved.toLocaleString()}</Text>
                  </View>
                </View>
              ))
            )
          ) : (
            <Pressable style={styles.lockedCard} onPress={() => showPaywall('ledger_history')}>
              <Text style={styles.lockedCardEmoji}>🔒</Text>
              <Text style={styles.lockedCardTitle}>Full history with Premium</Text>
              <Text style={styles.lockedCardSub}>See every month since you started.</Text>
            </Pressable>
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
  closeBtn: {
    width: 32, height: 32, borderRadius: Radius.full,
    backgroundColor: Colors.light.backgroundMuted,
    justifyContent: 'center', alignItems: 'center',
  },
  closeBtnText: { color: Colors.light.textSecondary, fontSize: 14, fontWeight: '600' },
  headerTitles: { alignItems: 'center', gap: 2 },
  headerMonth: { color: Colors.light.text, fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  headerSub: { color: Colors.light.textSecondary, fontSize: 11, letterSpacing: 2 },
  shareBtn: {
    backgroundColor: Colors.light.primaryLight, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2,
    borderWidth: 1, borderColor: Colors.light.primary,
  },
  shareBtnText: { color: Colors.light.primaryDark, fontSize: 13, fontWeight: '700' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, gap: Spacing.lg },
  statementCard: {
    backgroundColor: Colors.light.backgroundElement, borderRadius: Radius.xl,
    padding: Spacing.xl, gap: Spacing.md,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { color: Colors.light.textSecondary, fontSize: 15 },
  statValue: { color: Colors.light.text, fontSize: 15, fontWeight: '700' },
  moneyGreen: { color: Colors.light.primary, fontSize: 17 },
  separator: { height: 1, backgroundColor: Colors.light.border, marginVertical: Spacing.xs },
  lockedRow: {
    backgroundColor: Colors.light.backgroundMuted, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 4,
  },
  lockedText: { color: Colors.light.textMuted, fontSize: 13, fontWeight: '600' },
  equivalentsLabel: { color: Colors.light.textSecondary, fontSize: 13, fontWeight: '600' },
  equivalentItem: { color: Colors.light.primaryDark, fontSize: 14, paddingLeft: Spacing.sm },
  goalCard: {
    backgroundColor: Colors.light.primaryLight, borderRadius: Radius.xl,
    padding: Spacing.lg, gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.light.primary,
  },
  goalTitle: { color: Colors.light.primaryDark, fontSize: 15, fontWeight: '700' },
  goalLabel: { color: Colors.light.primaryDark, fontSize: 18, fontWeight: '800' },
  goalBarBg: {
    height: 8, backgroundColor: Colors.light.primary,
    borderRadius: Radius.full, opacity: 0.2, overflow: 'hidden',
  },
  goalBarFill: { height: 8, backgroundColor: Colors.light.primary, borderRadius: Radius.full, opacity: 5 },
  goalProgress: { color: Colors.light.primaryDark, fontSize: 12, opacity: 0.7 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.light.text },
  historyEmpty: { color: Colors.light.textMuted, fontSize: 14, lineHeight: 22 },
  historyCard: {
    backgroundColor: Colors.light.backgroundElement, borderRadius: Radius.lg,
    padding: Spacing.lg, gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  historyMonth: { color: Colors.light.text, fontSize: 15, fontWeight: '700' },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between' },
  historyLabel: { color: Colors.light.textSecondary, fontSize: 13 },
  historyValue: { color: Colors.light.primary, fontSize: 13, fontWeight: '700' },
  lockedCard: {
    backgroundColor: Colors.light.purpleLight, borderRadius: Radius.xl,
    padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.light.purple,
  },
  lockedCardEmoji: { fontSize: 32 },
  lockedCardTitle: { color: Colors.light.purple, fontSize: 16, fontWeight: '700' },
  lockedCardSub: { color: Colors.light.purple, fontSize: 13, opacity: 0.8, textAlign: 'center' },
});
