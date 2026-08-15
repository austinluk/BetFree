import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Radius } from '@/constants/theme';

const CARDS = [
  {
    icon: '🔥',
    title: 'Track your streak',
    body: 'Every day clean is a day you keep. Watch your streak grow.',
  },
  {
    icon: '💰',
    title: 'See your money come back',
    body: "Watch what you're no longer losing — in real time.",
  },
  {
    icon: '🆘',
    title: 'Beat urges in real time',
    body: 'When the urge hits, we walk you through it. Step by step.',
  },
];

export default function PitchScreen() {
  const [current, setCurrent] = useState(0);

  function next() {
    if (current < CARDS.length - 1) {
      setCurrent((c) => c + 1);
    } else {
      router.push('/(auth)/onboarding' as any);
    }
  }

  const card = CARDS[current];
  const isLast = current === CARDS.length - 1;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.icon}>{card.icon}</Text>
        <Text style={styles.title}>{card.title}</Text>
        <Text style={styles.body}>{card.body}</Text>
      </View>

      {/* Dots */}
      <View style={styles.dots}>
        {CARDS.map((_, i) => (
          <View key={i} style={[styles.dot, i === current && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerNote}>Free to start. No credit card.</Text>
        <Pressable style={styles.cta} onPress={next}>
          <Text style={styles.ctaText}>{isLast ? 'Start for free →' : 'Next →'}</Text>
        </Pressable>
      </View>
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
  card: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  icon: {
    fontSize: 64,
    marginBottom: Spacing.xl,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.md,
    letterSpacing: -0.3,
  },
  body: {
    color: Colors.dark.textSecondary,
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 26,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: Spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.border,
  },
  dotActive: {
    backgroundColor: Colors.dark.primary,
    width: 24,
  },
  footer: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  footerNote: {
    color: Colors.dark.textMuted,
    fontSize: 14,
  },
  cta: {
    width: '100%',
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
