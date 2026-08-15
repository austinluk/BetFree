import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useStreakStore, useMoneySaved } from '@/store/useStreakStore';
import { Colors, Spacing, Radius } from '@/constants/theme';

type Period = 'total' | 'monthly' | 'weekly';

export function MoneySaved() {
  const [period, setPeriod] = useState<Period>('total');
  const totalCleanDays = useStreakStore((s) => s.totalCleanDays);
  const weeklyBetEstimate = useStreakStore((s) => s.weeklyBetEstimate);
  const totalSaved = useMoneySaved();

  // Derive from actual clean days, not a fixed multiplier
  const weeklySaved = Math.floor((totalCleanDays * weeklyBetEstimate) / 7);
  const monthlySaved = Math.floor((totalCleanDays * weeklyBetEstimate) / 7 / 4.33);

  const amounts: Record<Period, number> = {
    total: totalSaved,
    monthly: monthlySaved,
    weekly: weeklySaved,
  };

  const labels: Record<Period, string> = {
    total: 'Total saved',
    monthly: 'Saved this month (est.)',
    weekly: 'Saved this week (est.)',
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Money Saved</Text>
        <View style={styles.tabs}>
          {(['total', 'monthly', 'weekly'] as Period[]).map((p) => (
            <Pressable
              key={p}
              style={[styles.tab, period === p && styles.tabActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.tabText, period === p && styles.tabTextActive]}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Text style={styles.amount}>
        ${amounts[period].toLocaleString()}
      </Text>
      <Text style={styles.label}>{labels[period]}</Text>

      {totalSaved >= 100 && (
        <View style={styles.equivalent}>
          <Text style={styles.equivalentText}>
            {totalSaved >= 1000
              ? `That's ${Math.floor(totalSaved / 1000)}k — a real financial reset`
              : totalSaved >= 500
              ? "That's enough for a weekend trip"
              : "That's a month of groceries"}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: '700',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.light.backgroundMuted,
    borderRadius: Radius.md,
    padding: 2,
  },
  tab: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  tabActive: {
    backgroundColor: Colors.light.backgroundElement,
  },
  tabText: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  tabTextActive: {
    color: Colors.light.text,
    fontWeight: '700',
  },
  amount: {
    color: Colors.light.primary,
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: -1,
  },
  label: {
    color: Colors.light.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  equivalent: {
    marginTop: Spacing.md,
    backgroundColor: Colors.light.primaryLight,
    borderRadius: Radius.md,
    padding: Spacing.sm,
  },
  equivalentText: {
    color: Colors.light.primaryDark,
    fontSize: 13,
    fontWeight: '500',
  },
});
