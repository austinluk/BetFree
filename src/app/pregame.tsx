import { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/useUserStore';
import { useStreakStore } from '@/store/useStreakStore';
import { Analytics } from '@/lib/analytics';
import { Colors, Spacing, Radius } from '@/constants/theme';

type GameState = 'preview' | 'active' | 'halftime' | 'completed';

export default function PregameScreen() {
  const { eventName, eventDate } = useLocalSearchParams<{ eventName: string; eventDate: string }>();

  const [gameState, setGameState] = useState<GameState>('preview');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [minutesLeft, setMinutesLeft] = useState(180);
  const [quickUrgeLogged, setQuickUrgeLogged] = useState<number | null>(null);
  const [showUrgeConfirm, setShowUrgeConfirm] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const profile = useUserStore((s) => s.profile);
  const currentStreak = useStreakStore((s) => s.currentStreak);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (gameState === 'active') {
      intervalRef.current = setInterval(() => {
        setMinutesLeft((prev) => {
          if (prev <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setGameState('completed');
            return 0;
          }
          return prev - 1;
        });
      }, 60000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [gameState]);

  async function handleActivate() {
    if (!profile) return;
    const { data } = await supabase
      .from('pregame_sessions')
      .insert({
        user_id: profile.id,
        event_name: eventName ?? 'Game',
        event_date: eventDate ?? new Date().toISOString().split('T')[0],
      })
      .select('id')
      .single();

    if (data) setSessionId(data.id);
    setGameState('active');
    Analytics.pregameActivated(eventName ?? 'Game').catch(() => {});
  }

  async function handleHalftimeGood() {
    if (sessionId) {
      await supabase
        .from('pregame_sessions')
        .update({ halftime_checkin: 3 })
        .eq('id', sessionId);
    }
    setGameState('active');
  }

  async function handleComplete() {
    if (sessionId) {
      await supabase
        .from('pregame_sessions')
        .update({ completed: true })
        .eq('id', sessionId);
    }
    Analytics.pregameCompleted(eventName ?? 'Game').catch(() => {});
    router.push('/checkin' as any);
  }

  function handleQuickUrge(level: number) {
    setQuickUrgeLogged(level);
    setShowUrgeConfirm(true);
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    confirmTimerRef.current = setTimeout(() => setShowUrgeConfirm(false), 2000);
  }

  const hoursLeft = Math.floor(minutesLeft / 60);
  const minsLeft = minutesLeft % 60;

  // ── PREVIEW ─────────────────────────────────────────────────────────────────
  if (gameState === 'preview') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Pre-Game Mode</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.previewContent}>
          <Text style={styles.previewEmoji}>🏟️</Text>
          <Text style={styles.previewEventName}>{eventName}</Text>
          <Text style={styles.previewDescription}>
            Activate Pre-Game Mode to stay protected during the game.
          </Text>

          <View style={styles.featureList}>
            {[
              '✓  Quick check-ins during the game',
              '✓  Countdown so you know when it ends',
              '✓  One-tap SOS if things get hard',
            ].map((f) => (
              <Text key={f} style={styles.featureItem}>{f}</Text>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable style={styles.activateBtn} onPress={handleActivate}>
            <Text style={styles.activateBtnText}>Activate Pre-Game Mode</Text>
          </Pressable>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.notTodayText}>Not today</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── ACTIVE ──────────────────────────────────────────────────────────────────
  if (gameState === 'active') {
    return (
      <View style={[styles.container, styles.activeContainer]}>
        <View style={styles.activeHeader}>
          <Text style={styles.activeEventName}>{eventName}</Text>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>PRE-GAME MODE</Text>
          </View>
        </View>

        <View style={styles.activeContent}>
          <Text style={styles.activeStreakNumber}>{currentStreak}</Text>
          <Text style={styles.activeStreakLabel}>DAYS CLEAN</Text>

          <View style={styles.countdownCard}>
            <Text style={styles.countdownLabel}>Game ends in ~</Text>
            <Text style={styles.countdownValue}>
              {hoursLeft}h {minsLeft}m
            </Text>
          </View>

          <Text style={styles.quickCheckinLabel}>How are you right now?</Text>
          <View style={styles.urgeRow}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <Pressable
                key={n}
                style={[
                  styles.urgeBtn,
                  quickUrgeLogged === n && styles.urgeBtnActive,
                ]}
                onPress={() => handleQuickUrge(n)}
              >
                <Text style={[styles.urgeBtnText, quickUrgeLogged === n && styles.urgeBtnTextActive]}>
                  {n}
                </Text>
              </Pressable>
            ))}
          </View>

          {showUrgeConfirm && (
            <Text style={styles.urgeConfirm}>Logged.</Text>
          )}
        </View>

        <View style={styles.footer}>
          <Pressable style={styles.halftimeBtn} onPress={() => setGameState('halftime')}>
            <Text style={styles.halftimeBtnText}>Halftime?</Text>
          </Pressable>
          <Pressable style={styles.sosBtn} onPress={() => router.push('/sos' as any)}>
            <Text style={styles.sosBtnText}>🆘  Need help right now</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── HALFTIME ─────────────────────────────────────────────────────────────────
  if (gameState === 'halftime') {
    return (
      <View style={[styles.container, styles.activeContainer]}>
        <View style={styles.halftimeContent}>
          <Text style={styles.halftimeTitle}>Halftime.</Text>
          <Text style={styles.halftimeBody}>Still going?</Text>
        </View>
        <View style={styles.footer}>
          <Pressable style={styles.goodBtn} onPress={handleHalftimeGood}>
            <Text style={styles.goodBtnText}>👍  Still good</Text>
          </Pressable>
          <Pressable style={styles.sosBtn} onPress={() => router.push('/sos' as any)}>
            <Text style={styles.sosBtnText}>🆘  Need help</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── COMPLETED ────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, styles.activeContainer]}>
      <View style={styles.completedContent}>
        <Text style={styles.completedEmoji}>🏆</Text>
        <Text style={styles.completedTitle}>
          You made it through {eventName}.
        </Text>
        <Text style={styles.completedBody}>
          That's one of the hardest moments. You stayed.
        </Text>
      </View>
      <View style={styles.footer}>
        <Pressable style={styles.activateBtn} onPress={handleComplete}>
          <Text style={styles.activateBtnText}>Log the win →</Text>
        </Pressable>
        <Pressable onPress={() => router.replace('/(tabs)' as any)}>
          <Text style={styles.notTodayText}>Go home</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  activeContainer: { backgroundColor: '#0D1B2A' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.light.border,
  },
  backText: { color: Colors.light.primary, fontSize: 15, fontWeight: '600', width: 60 },
  headerTitle: { color: Colors.light.text, fontSize: 17, fontWeight: '700' },
  activeHeader: {
    alignItems: 'center', gap: Spacing.sm,
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  activeEventName: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  activeBadge: {
    backgroundColor: Colors.dark.accent, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 4,
  },
  activeBadgeText: { color: '#0A0A0F', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  previewContent: {
    flex: 1, paddingHorizontal: Spacing.xl, paddingTop: Spacing.xxl,
    gap: Spacing.lg, alignItems: 'center',
  },
  previewEmoji: { fontSize: 64 },
  previewEventName: { fontSize: 24, fontWeight: '800', color: Colors.light.text, textAlign: 'center' },
  previewDescription: { fontSize: 16, color: Colors.light.textSecondary, textAlign: 'center', lineHeight: 24 },
  featureList: { gap: Spacing.sm, alignSelf: 'stretch' },
  featureItem: { fontSize: 15, color: Colors.light.textSecondary },
  activeContent: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.lg, gap: Spacing.lg,
  },
  activeStreakNumber: { color: '#FFFFFF', fontSize: 80, fontWeight: '800', letterSpacing: -3 },
  activeStreakLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 13, letterSpacing: 2, marginTop: -Spacing.lg },
  countdownCard: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: Radius.xl,
    padding: Spacing.lg, alignItems: 'center', gap: 4,
  },
  countdownLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  countdownValue: { color: '#FFFFFF', fontSize: 28, fontWeight: '800' },
  quickCheckinLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' },
  urgeRow: { flexDirection: 'row', gap: 4 },
  urgeBtn: {
    flex: 1, height: 36, borderRadius: Radius.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  urgeBtnActive: { backgroundColor: Colors.dark.accent },
  urgeBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600' },
  urgeBtnTextActive: { color: '#0A0A0F' },
  urgeConfirm: { color: Colors.dark.primary, fontSize: 13, fontWeight: '600' },
  halftimeContent: {
    flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md,
  },
  halftimeTitle: { color: '#FFFFFF', fontSize: 48, fontWeight: '800', letterSpacing: -1 },
  halftimeBody: { color: 'rgba(255,255,255,0.6)', fontSize: 22 },
  completedContent: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: Spacing.xl, gap: Spacing.lg,
  },
  completedEmoji: { fontSize: 72 },
  completedTitle: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', textAlign: 'center', lineHeight: 34 },
  completedBody: { color: 'rgba(255,255,255,0.6)', fontSize: 16, textAlign: 'center', lineHeight: 24 },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.lg,
    paddingTop: Spacing.md, gap: Spacing.md, alignItems: 'center',
  },
  activateBtn: {
    width: '100%', backgroundColor: Colors.light.primary, borderRadius: Radius.lg,
    paddingVertical: Spacing.md + 2, alignItems: 'center',
  },
  activateBtnText: { color: '#0A0A0F', fontSize: 17, fontWeight: '700' },
  notTodayText: { color: Colors.light.textSecondary, fontSize: 15, textDecorationLine: 'underline' },
  halftimeBtn: {
    width: '100%', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: Radius.lg,
    paddingVertical: Spacing.md + 2, alignItems: 'center',
  },
  halftimeBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  goodBtn: {
    width: '100%', backgroundColor: Colors.dark.primary, borderRadius: Radius.lg,
    paddingVertical: Spacing.md + 2, alignItems: 'center',
  },
  goodBtnText: { color: '#0A0A0F', fontSize: 17, fontWeight: '700' },
  sosBtn: {
    width: '100%', backgroundColor: Colors.dark.accent, borderRadius: Radius.lg,
    paddingVertical: Spacing.md + 2, alignItems: 'center',
  },
  sosBtnText: { color: '#0A0A0F', fontSize: 17, fontWeight: '700' },
});
