import { useEffect, useState, useRef } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { StreakCounter } from '@/components/streak/StreakCounter';
import { MoneySaved } from '@/components/streak/MoneySaved';
import { SOSButton } from '@/components/ui/SOSButton';
import { useUserStore } from '@/store/useUserStore';
import { useStreak } from '@/hooks/useStreak';
import { useStreakStore } from '@/store/useStreakStore';
import { supabase } from '@/lib/supabase';
import {
  scheduleStreakReminder, scheduleWeeklySummary,
  cancelReEngagement, scheduleReEngagement,
} from '@/lib/notifications';
import { fetchUpcomingEvents, getHighRiskMessage, type SportEvent } from '@/lib/sports-calendar';
import { Analytics, trackScreen } from '@/lib/analytics';
import { Colors, Spacing, Radius, BottomTabInset } from '@/constants/theme';

interface CheckInDay {
  date: string;
  urge_level: number;
}

function getFirstOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
}

function getMonthShortName(): string {
  return new Date().toLocaleDateString('en-US', { month: 'long' });
}

export default function DashboardScreen() {
  const profile = useUserStore((s) => s.profile);
  const firstName = profile?.display_name?.split(' ')[0] ?? 'there';
  const weeklyBetEstimate = useStreakStore((s) => s.weeklyBetEstimate);
  const [recentCheckins, setRecentCheckins] = useState<CheckInDay[]>([]);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<SportEvent[]>([]);
  const [daysThisMonth, setDaysThisMonth] = useState(0);
  const { fetchStreak } = useStreak();

  const recentCheckinsRef = useRef<CheckInDay[]>([]);

  useEffect(() => {
    if (!profile) return;
    trackScreen('Dashboard').catch(() => {});

    // Reset re-engagement timer on every open
    cancelReEngagement().then(() => scheduleReEngagement()).catch(() => {});

    async function init() {
      await Promise.all([fetchStreak(), loadRecentCheckins(), loadThisMonthCount()]);
      const { totalCleanDays, weeklyBetEstimate: wbe } = useStreakStore.getState();
      const saved = Math.floor((totalCleanDays * wbe) / 7);
      scheduleStreakReminder().catch(() => {});
      scheduleWeeklySummary(recentCheckinsRef.current.length, 0, saved).catch(() => {});
    }

    init();
    loadSportsEvents();
  }, [profile]);

  async function loadRecentCheckins() {
    if (!profile) return;
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data } = await supabase
      .from('checkins')
      .select('date, urge_level')
      .eq('user_id', profile.id)
      .gte('date', sevenDaysAgo)
      .order('date', { ascending: false });

    if (data) {
      setRecentCheckins(data);
      recentCheckinsRef.current = data;
      setCheckedInToday(data.some((c) => c.date === today));
    }
  }

  async function loadThisMonthCount() {
    if (!profile) return;
    const firstOfMonth = getFirstOfMonth();
    const { count } = await supabase
      .from('checkins')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .gte('date', firstOfMonth);
    setDaysThisMonth(count ?? 0);
  }

  async function loadSportsEvents() {
    const events = await fetchUpcomingEvents();
    setUpcomingEvents(events);
    if (events.length > 0) {
      Analytics.highRiskEventWarningShown(events[0].name).catch(() => {});
    }
  }

  const highRiskMessage = getHighRiskMessage(upcomingEvents);
  const thisMonthAmount = Math.floor((daysThisMonth * weeklyBetEstimate) / 7);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: BottomTabInset + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hey, {firstName}</Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>

        {/* High-risk event warning */}
        {highRiskMessage ? (
          <>
            <Pressable style={styles.warningCard} onPress={() => router.push('/sos' as any)}>
              <Text style={styles.warningEmoji}>⚠️</Text>
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>High-risk day</Text>
                <Text style={styles.warningBody}>{highRiskMessage}</Text>
              </View>
              <Text style={styles.warningCta}>SOS →</Text>
            </Pressable>
            {/* Pre-Game Mode button */}
            <Pressable
              style={styles.pregameBtn}
              onPress={() => router.push({
                pathname: '/pregame' as any,
                params: { eventName: upcomingEvents[0]?.name ?? 'Game', eventDate: upcomingEvents[0]?.date ?? '' },
              })}
            >
              <Text style={styles.pregameBtnText}>
                Activate Pre-Game Mode for {upcomingEvents[0]?.name ?? 'today'}
              </Text>
            </Pressable>
          </>
        ) : null}

        {/* Streak counter */}
        <StreakCounter />

        {/* Check in card */}
        <Pressable
          style={[styles.checkinCard, checkedInToday && styles.checkinCardDone]}
          onPress={() => {
            if (!checkedInToday) router.push('/checkin' as any);
          }}
        >
          <View style={styles.checkinLeft}>
            <Text style={styles.checkinTitle}>
              {checkedInToday ? 'Checked in today ✓' : 'Daily check-in'}
            </Text>
            <Text style={styles.checkinSubtitle}>
              {checkedInToday ? 'Great work. See you tomorrow.' : 'How are you feeling today?'}
            </Text>
          </View>
          {!checkedInToday && (
            <View style={styles.checkinArrow}>
              <Text style={styles.checkinArrowText}>→</Text>
            </View>
          )}
        </Pressable>

        {/* Last 7 days urge trend */}
        {recentCheckins.length > 0 && (
          <View style={styles.trendCard}>
            <Text style={styles.trendTitle}>Last 7 days</Text>
            <View style={styles.trendBars}>
              {recentCheckins.slice(0, 7).reverse().map((c, i) => {
                const barColor =
                  c.urge_level <= 3 ? Colors.light.primary :
                  c.urge_level <= 6 ? Colors.light.warning :
                  Colors.light.danger;
                return (
                  <View key={i} style={styles.trendBarWrapper}>
                    <View style={[styles.trendBar, {
                      height: (c.urge_level / 10) * 48 + 4,
                      backgroundColor: barColor,
                    }]} />
                    <Text style={styles.trendBarLabel}>
                      {new Date(c.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'narrow', timeZone: 'UTC' })}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Money saved */}
        <MoneySaved />

        {/* Monthly statement card */}
        <Pressable style={styles.statementCard} onPress={() => router.push('/ledger' as any)}>
          <View style={styles.statementLeft}>
            <Text style={styles.statementMonth}>{getMonthShortName()}</Text>
            <Text style={styles.statementAmount}>${thisMonthAmount.toLocaleString()} saved this month</Text>
          </View>
          <Text style={styles.statementCta}>View statement →</Text>
        </Pressable>

        {/* Relapse link */}
        <Pressable style={styles.relapseLink} onPress={() => router.push('/relapse' as any)}>
          <Text style={styles.relapseLinkText}>I slipped up today</Text>
        </Pressable>
      </ScrollView>

      <SOSButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : 0,
    gap: Spacing.md,
  },
  header: { marginBottom: Spacing.sm },
  greeting: { color: Colors.light.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.3 },
  date: { color: Colors.light.textSecondary, fontSize: 15, marginTop: 2 },
  warningCard: {
    backgroundColor: '#FFF7ED', borderRadius: Radius.xl, padding: Spacing.lg,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderWidth: 1, borderColor: Colors.light.accent,
  },
  warningEmoji: { fontSize: 24 },
  warningContent: { flex: 1, gap: 2 },
  warningTitle: { color: Colors.light.accent, fontSize: 14, fontWeight: '700' },
  warningBody: { color: Colors.light.text, fontSize: 13, lineHeight: 18 },
  warningCta: { color: Colors.light.accent, fontSize: 14, fontWeight: '700' },
  pregameBtn: {
    borderWidth: 1, borderColor: Colors.light.primary, borderRadius: Radius.xl,
    paddingVertical: Spacing.sm + 2, paddingHorizontal: Spacing.lg,
    alignItems: 'center', backgroundColor: 'transparent',
  },
  pregameBtnText: { color: Colors.light.primary, fontSize: 13, fontWeight: '600' },
  checkinCard: {
    backgroundColor: Colors.light.backgroundElement, borderRadius: Radius.xl,
    padding: Spacing.lg, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', borderWidth: 1, borderColor: Colors.light.border,
  },
  checkinCardDone: { backgroundColor: Colors.light.primaryLight, borderColor: Colors.light.primary },
  checkinLeft: { gap: 4 },
  checkinTitle: { color: Colors.light.text, fontSize: 17, fontWeight: '700' },
  checkinSubtitle: { color: Colors.light.textSecondary, fontSize: 14 },
  checkinArrow: {
    width: 36, height: 36, borderRadius: Radius.full,
    backgroundColor: Colors.light.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  checkinArrowText: { color: Colors.light.primaryDark, fontSize: 18, fontWeight: '700' },
  trendCard: {
    backgroundColor: Colors.light.backgroundElement, borderRadius: Radius.xl,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.light.border,
  },
  trendTitle: { color: Colors.light.text, fontSize: 15, fontWeight: '700', marginBottom: Spacing.md },
  trendBars: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.xs, height: 60 },
  trendBarWrapper: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  trendBar: { width: '100%', borderRadius: Radius.sm, minHeight: 4 },
  trendBarLabel: { color: Colors.light.textMuted, fontSize: 10 },
  statementCard: {
    backgroundColor: Colors.light.backgroundElement, borderRadius: Radius.xl,
    padding: Spacing.lg, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', borderWidth: 1, borderColor: Colors.light.border,
  },
  statementLeft: { gap: 2 },
  statementMonth: { color: Colors.light.textSecondary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  statementAmount: { color: Colors.light.text, fontSize: 15, fontWeight: '700' },
  statementCta: { color: Colors.light.primary, fontSize: 13, fontWeight: '600' },
  relapseLink: { alignItems: 'center', paddingVertical: Spacing.sm },
  relapseLinkText: { color: Colors.light.textMuted, fontSize: 14, textDecorationLine: 'underline' },
});
