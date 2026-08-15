import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { Colors, Spacing, Radius } from '@/constants/theme';

const STATS = [
  { value: '15,000,000', label: 'Americans with gambling disorder right now' },
  { value: '$30,000', label: 'average total lost before someone seeks help' },
  { value: '1 in 10', label: 'problem gamblers ever get formal treatment' },
  { value: '87%', label: 'of people using a structured recovery tool stay clean longer' },
];

function StatCard({ stat, index }: { stat: typeof STATS[0]; index: number }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    const delay = index * 700;
    opacity.value = withDelay(delay, withTiming(1, { duration: 500 }));
    translateY.value = withDelay(delay, withSpring(0, { damping: 14 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.statCard, style]}>
      <Text style={styles.statValue}>{stat.value}</Text>
      <Text style={styles.statLabel}>{stat.label}</Text>
    </Animated.View>
  );
}

export default function StatsScreen() {
  const taglineOpacity = useSharedValue(0);
  const ctaOpacity = useSharedValue(0);

  useEffect(() => {
    taglineOpacity.value = withDelay(3200, withTiming(1, { duration: 600 }));
    ctaOpacity.value = withDelay(3900, withTiming(1, { duration: 600 }));
  }, []);

  const taglineStyle = useAnimatedStyle(() => ({ opacity: taglineOpacity.value }));
  const ctaStyle = useAnimatedStyle(() => ({ opacity: ctaOpacity.value }));

  return (
    <View style={styles.container}>
      <View style={styles.statsGrid}>
        {STATS.map((stat, i) => (
          <StatCard key={i} stat={stat} index={i} />
        ))}
      </View>

      <Animated.Text style={[styles.tagline, taglineStyle]}>
        The ones who make it don't have more willpower.{'\n'}They have better tools.
      </Animated.Text>

      <Animated.View style={ctaStyle}>
        <Pressable style={styles.cta} onPress={() => router.push('/(auth)/pitch' as any)}>
          <Text style={styles.ctaText}>Get the tools →</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 80 : Platform.OS === 'android' ? 60 : 24,
    paddingBottom: Spacing.xxl,
    justifyContent: 'space-between',
  },
  statsGrid: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.md,
  },
  statCard: {
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  statValue: {
    color: Colors.dark.primary,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  tagline: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 28,
    textAlign: 'center',
    marginVertical: Spacing.xl,
  },
  cta: {
    backgroundColor: Colors.dark.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
  },
  ctaText: {
    color: '#0A0A0F',
    fontSize: 17,
    fontWeight: '700',
  },
});
