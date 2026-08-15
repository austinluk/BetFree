import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useStreakStore } from '@/store/useStreakStore';
import { Colors, Spacing, Radius } from '@/constants/theme';

export function StreakCounter() {
  const currentStreak = useStreakStore((s) => s.currentStreak);
  const prevRef = useRef(currentStreak);

  const scale = useSharedValue(1);

  useEffect(() => {
    if (currentStreak !== prevRef.current) {
      scale.value = withSequence(
        withSpring(1.12, { damping: 8 }),
        withSpring(1, { damping: 12 })
      );
      // Only haptic on streak increment — not on relapse reset
      if (Platform.OS !== 'web' && currentStreak > prevRef.current) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
      prevRef.current = currentStreak;
    }
  }, [currentStreak]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.number, animStyle]}>{currentStreak}</Animated.Text>
      <Text style={styles.label}>DAYS CLEAN</Text>
      <View style={styles.pill}>
        <Text style={styles.pillText}>
          {currentStreak === 0 ? 'Start your streak today' : currentStreak === 1 ? 'First day — keep going' : `${currentStreak} day streak 🔥`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  number: {
    fontSize: 96,
    fontWeight: '800',
    color: Colors.light.primary,
    letterSpacing: -4,
    lineHeight: 100,
  },
  label: {
    color: Colors.light.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: Spacing.xs,
  },
  pill: {
    marginTop: Spacing.md,
    backgroundColor: Colors.light.primaryLight,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
  },
  pillText: {
    color: Colors.light.primaryDark,
    fontSize: 14,
    fontWeight: '600',
  },
});
