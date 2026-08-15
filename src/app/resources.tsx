import {
  View, Text, Pressable, ScrollView, StyleSheet, Platform, Linking,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Radius } from '@/constants/theme';

interface Resource {
  emoji: string;
  title: string;
  subtitle: string;
  action: string;
  actionLabel: string;
  alwaysFree?: boolean;
}

const RESOURCES: Resource[] = [
  {
    emoji: '📞',
    title: 'National Problem Gambling Helpline',
    subtitle: 'Free, confidential 24/7 support. Call or text.',
    action: 'tel:18005224700',
    actionLabel: 'Call 1-800-522-4700',
    alwaysFree: true,
  },
  {
    emoji: '💬',
    title: 'NCPG Crisis Chat',
    subtitle: 'Chat online with a trained counselor right now.',
    action: 'https://www.ncpgambling.org/help-treatment/national-helpline-1-800-522-4700/',
    actionLabel: 'Open chat',
    alwaysFree: true,
  },
  {
    emoji: '🤝',
    title: 'Gamblers Anonymous',
    subtitle: 'Find a local GA meeting near you.',
    action: 'https://www.gamblersanonymous.org/ga/content/find-meeting',
    actionLabel: 'Find a meeting',
    alwaysFree: true,
  },
  {
    emoji: '🧠',
    title: 'SAMHSA National Helpline',
    subtitle: 'Free mental health & addiction treatment referrals. 24/7.',
    action: 'tel:18006624357',
    actionLabel: 'Call 1-800-662-4357',
    alwaysFree: true,
  },
  {
    emoji: '🛡️',
    title: 'BetBlocker',
    subtitle: 'Free app to block gambling sites across all your devices.',
    action: 'https://betblocker.org',
    actionLabel: 'Get BetBlocker (free)',
    alwaysFree: true,
  },
  {
    emoji: '📖',
    title: 'Gambling Therapy',
    subtitle: 'Online support forums, self-help tools, and therapy.',
    action: 'https://www.gamblingtherapy.org',
    actionLabel: 'Visit site',
    alwaysFree: true,
  },
];

export default function ResourcesScreen() {
  function open(action: string) {
    Linking.openURL(action).catch(() => {});
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Crisis Resources</Text>
        <Text style={styles.subtitle}>
          All resources below are free and available 24/7.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {RESOURCES.map((r) => (
          <View key={r.title} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.cardEmoji}>{r.emoji}</Text>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{r.title}</Text>
                <Text style={styles.cardSub}>{r.subtitle}</Text>
              </View>
            </View>
            <Pressable style={styles.actionBtn} onPress={() => open(r.action)}>
              <Text style={styles.actionBtnText}>{r.actionLabel}</Text>
            </Pressable>
          </View>
        ))}

        <Text style={styles.footer}>
          If you are in immediate danger, call 911 or your local emergency number.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backBtn: { alignSelf: 'flex-start', marginBottom: Spacing.xs },
  backText: { color: Colors.light.primary, fontSize: 15, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '800', color: Colors.light.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: Colors.light.textSecondary, lineHeight: 20 },
  list: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: 48,
  },
  card: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
    gap: Spacing.md,
  },
  cardTop: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  cardEmoji: { fontSize: 32, lineHeight: 38 },
  cardInfo: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.light.text },
  cardSub: { fontSize: 13, color: Colors.light.textSecondary, lineHeight: 18 },
  actionBtn: {
    backgroundColor: Colors.light.primaryLight,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.primary,
  },
  actionBtnText: { color: Colors.light.primaryDark, fontSize: 15, fontWeight: '700' },
  footer: {
    color: Colors.light.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
});
