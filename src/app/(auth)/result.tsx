import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Radius } from '@/constants/theme';

interface ResultTier {
  headline: string;
  subtext: string;
  color: string;
}

function getTier(score: number): ResultTier {
  if (score <= 1) return {
    headline: "You seem in control.",
    subtext: "But you're here for a reason. Keep reading.",
    color: Colors.dark.primary,
  };
  if (score <= 3) return {
    headline: "You may be developing a problem.",
    subtext: "2-3 of these signs is an early warning. The earlier you act, the easier it is.",
    color: Colors.dark.warning,
  };
  if (score <= 5) return {
    headline: "You have a gambling problem.",
    subtext: "4+ signs meet the clinical definition of problem gambling. You're not alone — 15 million Americans are in the same place.",
    color: Colors.dark.accent,
  };
  return {
    headline: "This is serious.",
    subtext: "6+ signs indicate gambling disorder. This isn't about willpower. Your brain has been rewired. It can be unwired.",
    color: Colors.dark.danger,
  };
}

export default function ResultScreen() {
  const { score } = useLocalSearchParams<{ score: string }>();
  const numScore = parseInt(score ?? '0', 10);
  const tier = getTier(numScore);

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.92);
  const subtextOpacity = useSharedValue(0);
  const ctaOpacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 600 });
    scale.value = withSpring(1, { damping: 14 });
    subtextOpacity.value = withDelay(800, withTiming(1, { duration: 600 }));
    ctaOpacity.value = withDelay(1600, withTiming(1, { duration: 500 }));
  }, []);

  const headlineStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const subtextStyle = useAnimatedStyle(() => ({ opacity: subtextOpacity.value }));
  const ctaStyle = useAnimatedStyle(() => ({ opacity: ctaOpacity.value }));

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.Text style={[styles.headline, { color: tier.color }, headlineStyle]}>
          {tier.headline}
        </Animated.Text>

        <Animated.Text style={[styles.subtext, subtextStyle]}>
          {tier.subtext}
        </Animated.Text>

        <Animated.Text style={[styles.honesty, subtextStyle]}>
          You took the first step by being honest.
        </Animated.Text>
      </View>

      <Animated.View style={ctaStyle}>
        <Pressable style={styles.cta} onPress={() => router.push('/(auth)/stats' as any)}>
          <Text style={styles.ctaText}>Show me what to do about it →</Text>
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
    paddingTop: Platform.OS === 'ios' ? 100 : Platform.OS === 'android' ? 80 : 24,
    paddingBottom: Spacing.xxl,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  headline: {
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 42,
    letterSpacing: -0.5,
    marginBottom: Spacing.lg,
  },
  subtext: {
    color: Colors.dark.textSecondary,
    fontSize: 18,
    lineHeight: 28,
    marginBottom: Spacing.xl,
  },
  honesty: {
    color: Colors.dark.textMuted,
    fontSize: 15,
    fontStyle: 'italic',
  },
  cta: {
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: 'center',
  },
  ctaText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
