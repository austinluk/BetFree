import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { router } from 'expo-router';
import { startFreeTrial } from '@/lib/revenuecat';
import { useUserStore } from '@/store/useUserStore';
import { Colors, Spacing, Radius } from '@/constants/theme';

export default function TrialOfferScreen() {
  const [loading, setLoading] = useState(false);
  const [trialError, setTrialError] = useState('');
  const { setPremium, setSkipAuthRedirect } = useUserStore();

  async function handleStartTrial() {
    setLoading(true);
    setTrialError('');
    const result = await startFreeTrial();
    setLoading(false);

    if (result.success) {
      setPremium(true);
      setSkipAuthRedirect(false);
      router.replace('/(tabs)' as any);
    } else if (result.cancelled) {
      // User backed out of the payment sheet — stay on screen
    } else {
      setTrialError(result.error);
    }
  }

  function handleSkip() {
    setSkipAuthRedirect(false);
    router.replace('/(tabs)' as any);
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.badge}>7-DAY FREE TRIAL</Text>
        <Text style={styles.headline}>Get every tool.{'\n'}No credit card.</Text>
        <Text style={styles.subtext}>
          Try BetFree Premium free for 7 days. Cancel anytime — no questions asked.
        </Text>

        <View style={styles.featureList}>
          {[
            '✓  Full urge log history',
            '✓  CBT workbook modules',
            '✓  Unlimited community posts',
            '✓  Accountability partner matching',
            '✓  Advanced trigger analysis',
          ].map((f) => (
            <Text key={f} style={styles.feature}>{f}</Text>
          ))}
        </View>

        <View style={styles.pricing}>
          <Text style={styles.pricingMain}>Then $9.99 / month</Text>
          <Text style={styles.pricingAlt}>or $59.99 / year — save 50%</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.trialBtn} onPress={handleStartTrial} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={styles.trialBtnText}>Start free trial</Text>
          }
        </Pressable>

        {trialError ? <Text style={styles.errorText}>{trialError}</Text> : null}

        <Pressable onPress={handleSkip}>
          <Text style={styles.skipText}>No thanks, continue with free</Text>
        </Pressable>

        <Text style={styles.legalText}>
          Cancel anytime in App Store / Google Play settings.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 80 : Platform.OS === 'android' ? 60 : 24,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  content: { gap: Spacing.lg },
  badge: {
    color: Colors.light.purple,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    backgroundColor: Colors.light.purpleLight,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  headline: {
    color: Colors.light.text,
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  subtext: {
    color: Colors.light.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
  featureList: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  feature: {
    color: Colors.light.text,
    fontSize: 15,
    lineHeight: 22,
  },
  pricing: { gap: Spacing.xs },
  pricingMain: {
    color: Colors.light.text,
    fontSize: 17,
    fontWeight: '600',
  },
  pricingAlt: {
    color: Colors.light.textSecondary,
    fontSize: 14,
  },
  footer: {
    gap: Spacing.md,
    alignItems: 'center',
  },
  trialBtn: {
    width: '100%',
    backgroundColor: Colors.light.purple,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
  },
  trialBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  skipText: {
    color: Colors.light.textSecondary,
    fontSize: 15,
    textDecorationLine: 'underline',
  },
  legalText: {
    color: Colors.light.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  errorText: {
    color: Colors.light.danger,
    fontSize: 14,
    textAlign: 'center',
  },
});
