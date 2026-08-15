import { useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { router } from 'expo-router';
import { Colors, Spacing, Radius } from '@/constants/theme';

const QUESTIONS = [
  "Have you ever bet more than you planned to?",
  "Have you tried to quit or cut back — and failed?",
  "Do you think about gambling when you're not doing it?",
  "Have you bet to win back money you lost?",
  "Have you lied to someone about how much you gamble?",
  "Has gambling caused problems with money, work, or relationships?",
  "Do you feel restless or irritable when you try to stop?",
  "Have you borrowed money or sold something to fund gambling?",
];

export default function QuizScreen() {
  const [current, setCurrent] = useState(0);
  // Use a ref so answer() always reads the latest count, never a stale closure
  const yesCountRef = useRef(0);
  const [, forceRender] = useState(0);

  const cardOpacity = useSharedValue(1);
  const cardTranslateX = useSharedValue(0);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateX: cardTranslateX.value }],
  }));

  function advanceQuestion(score: number, isLast: boolean) {
    if (isLast) {
      router.push({ pathname: '/(auth)/result' as any, params: { score } });
      return;
    }
    setCurrent((c) => c + 1);
    forceRender((n) => n + 1);
  }

  function answer(yes: boolean) {
    if (yes) yesCountRef.current += 1;
    const score = yesCountRef.current;
    const isLast = current + 1 >= QUESTIONS.length;

    // Skip Reanimated callbacks on web — they recurse infinitely
    if (Platform.OS === 'web') {
      advanceQuestion(score, isLast);
      return;
    }

    cardOpacity.value = withTiming(0, { duration: 200 });
    cardTranslateX.value = withTiming(yes ? -40 : 40, { duration: 200 }, () => {
      'worklet';
      cardTranslateX.value = 40;
      cardOpacity.value = 0;
      cardTranslateX.value = withTiming(0, { duration: 250 });
      cardOpacity.value = withTiming(1, { duration: 250 });
      scheduleOnRN(advanceQuestion, score, isLast);
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Answer honestly.</Text>
        <Text style={styles.subHeaderText}>No one sees this but you.</Text>
      </View>

      <View style={styles.dots}>
        {QUESTIONS.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === current && styles.dotActive, i < current && styles.dotDone]}
          />
        ))}
      </View>

      <Animated.View style={[styles.card, cardStyle]}>
        <Text style={styles.questionNumber}>{current + 1} of {QUESTIONS.length}</Text>
        <Text style={styles.question}>{QUESTIONS[current]}</Text>
      </Animated.View>

      <View style={styles.buttons}>
        <Pressable style={[styles.btn, styles.btnNo]} onPress={() => answer(false)}>
          <Text style={styles.btnNoText}>No</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.btnYes]} onPress={() => answer(true)}>
          <Text style={styles.btnYesText}>Yes</Text>
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
    paddingTop: 80,
    paddingBottom: Spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  headerText: {
    color: Colors.dark.text,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subHeaderText: {
    color: Colors.dark.textSecondary,
    fontSize: 15,
    marginTop: Spacing.xs,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: Spacing.xl,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.dark.border },
  dotActive: { backgroundColor: Colors.dark.accent, width: 20 },
  dotDone: { backgroundColor: Colors.dark.primary },
  card: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  questionNumber: {
    color: Colors.dark.textMuted,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: Spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  question: {
    color: Colors.dark.text,
    fontSize: 26,
    fontWeight: '600',
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  buttons: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xl },
  btn: { flex: 1, height: 60, borderRadius: Radius.lg, justifyContent: 'center', alignItems: 'center' },
  btnNo: { backgroundColor: Colors.dark.backgroundElement, borderWidth: 1, borderColor: Colors.dark.border },
  btnYes: { backgroundColor: Colors.dark.accent },
  btnNoText: { color: Colors.dark.textSecondary, fontSize: 17, fontWeight: '600' },
  btnYesText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
