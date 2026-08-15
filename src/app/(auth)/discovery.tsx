import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';


const LINES = [
  "Most people don't think",
  "they have a problem.",
  "",
  "Until they do the math.",
];

function AnimatedLine({ text, delay }: { text: string; delay: number }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 700, easing: Easing.out(Easing.ease) })
    );
    translateY.value = withDelay(
      delay,
      withTiming(0, { duration: 700, easing: Easing.out(Easing.ease) })
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.Text style={[styles.line, text === '' && styles.spacer, style]}>
      {text}
    </Animated.Text>
  );
}

export default function DiscoveryScreen() {
  const ctaOpacity = useSharedValue(0);

  useEffect(() => {
    ctaOpacity.value = withDelay(
      2800,
      withTiming(1, { duration: 600 })
    );
  }, []);

  const ctaStyle = useAnimatedStyle(() => ({ opacity: ctaOpacity.value }));

  return (
    <Pressable style={styles.container} onPress={() => router.push('/(auth)/quiz' as any)}>
      <View style={styles.content}>
        {LINES.map((line, i) => (
          <AnimatedLine key={i} text={line} delay={i * 600} />
        ))}
      </View>

      <Animated.View style={[styles.ctaContainer, ctaStyle]}>
        <Text style={styles.cta}>Tap anywhere to continue</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  content: {
    alignItems: 'center',
  },
  line: {
    color: Colors.dark.text,
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  spacer: {
    height: Spacing.md,
  },
  ctaContainer: {
    position: 'absolute',
    bottom: Spacing.xxl,
  },
  cta: {
    color: Colors.dark.textMuted,
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
