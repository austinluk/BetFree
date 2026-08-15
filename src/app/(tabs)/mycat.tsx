import { View, Text, Pressable, ScrollView, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { CatAvatar } from '@/components/ui/CatAvatar';
import { useAvatarStore, SHOP_ITEMS } from '@/store/useAvatarStore';
import { useStreakStore } from '@/store/useStreakStore';
import { Colors, Spacing, Radius, BottomTabInset } from '@/constants/theme';

const POINT_ACTIONS = [
  { action: 'Daily check-in', points: '+10', emoji: '✅' },
  { action: 'Complete SOS protocol', points: '+25', emoji: '🆘' },
  { action: '7-day streak badge', points: '+50', emoji: '🏅' },
  { action: '30-day streak badge', points: '+100', emoji: '🏆' },
  { action: '$100 saved milestone', points: '+50', emoji: '💰' },
];

export default function MyCatScreen() {
  const currentStreak = useStreakStore((s) => s.currentStreak);
  const { equipped, recoveryPoints, ownedItems } = useAvatarStore();

  const unlockedCount = ownedItems.length;
  const totalItems = SHOP_ITEMS.length;

  const catMessage =
    currentStreak >= 90 ? "Your cat is legendary. 👑" :
    currentStreak >= 30 ? "Your cat is thriving! 😸" :
    currentStreak >= 14 ? "Your cat is proud of you! 😺" :
    currentStreak >= 7 ? "Your cat is happy! 😺" :
    currentStreak >= 1 ? "Your cat believes in you! 🐱" :
    "Your cat is waiting for you. 😿\nStart your streak today.";

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>My Cat</Text>
          <View style={styles.pointsBadge}>
            <Text style={styles.pointsText}>⚡ {recoveryPoints} pts</Text>
          </View>
        </View>

        {/* Cat showcase */}
        <View style={styles.showcase}>
          <CatAvatar
            equipped={equipped}
            recoveryPoints={recoveryPoints}
            streak={currentStreak}
            size="large"
            onPress={() => router.push('/avatar-shop' as any)}
          />
          <Text style={styles.catMessage}>{catMessage}</Text>
          <Text style={styles.streakLabel}>
            {currentStreak > 0 ? `Day ${currentStreak} streak` : 'No active streak'}
          </Text>
        </View>

        {/* Customize button */}
        <Pressable
          style={styles.customizeBtn}
          onPress={() => router.push('/avatar-shop' as any)}
        >
          <Text style={styles.customizeBtnText}>🎨  Customize your cat</Text>
        </Pressable>

        {/* Progress */}
        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Items unlocked</Text>
            <Text style={styles.progressValue}>{unlockedCount} / {totalItems}</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${(unlockedCount / totalItems) * 100}%` as any }]} />
          </View>
        </View>

        {/* How to earn points */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How to earn recovery points</Text>
          <View style={styles.actionsList}>
            {POINT_ACTIONS.map((a) => (
              <View key={a.action} style={styles.actionRow}>
                <Text style={styles.actionEmoji}>{a.emoji}</Text>
                <Text style={styles.actionLabel}>{a.action}</Text>
                <Text style={styles.actionPoints}>{a.points}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : Spacing.lg,
    gap: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 28, fontWeight: '800', color: Colors.light.text, letterSpacing: -0.3 },
  pointsBadge: {
    backgroundColor: Colors.light.purpleLight,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  pointsText: { color: Colors.light.purple, fontSize: 14, fontWeight: '700' },
  showcase: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  catMessage: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
  },
  streakLabel: {
    color: Colors.light.textSecondary,
    fontSize: 13,
  },
  customizeBtn: {
    backgroundColor: Colors.light.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
  },
  customizeBtnText: { color: '#0A0A0F', fontSize: 16, fontWeight: '700' },
  progressCard: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
    gap: Spacing.sm,
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { color: Colors.light.text, fontSize: 15, fontWeight: '600' },
  progressValue: { color: Colors.light.textSecondary, fontSize: 15 },
  progressBarBg: {
    height: 8,
    backgroundColor: Colors.light.backgroundMuted,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    backgroundColor: Colors.light.purple,
    borderRadius: Radius.full,
  },
  section: { gap: Spacing.md },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.light.text },
  actionsList: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    gap: Spacing.md,
  },
  actionEmoji: { fontSize: 20 },
  actionLabel: { flex: 1, color: Colors.light.text, fontSize: 14 },
  actionPoints: { color: Colors.light.primary, fontSize: 14, fontWeight: '700' },
});
