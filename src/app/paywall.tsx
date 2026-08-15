import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { startFreeTrial, TrialResult } from '@/lib/revenuecat';
import { useUserStore } from '@/store/useUserStore';
import { Analytics } from '@/lib/analytics';
import { Colors, Spacing, Radius } from '@/constants/theme';
import type { PaywallGate } from '@/hooks/usePremium';

const GATE_COPY: Record<PaywallGate, { headline: string; sub: string }> = {
  sos: {
    headline: "You're fighting this.",
    sub: "Get unlimited SOS sessions and every tool we have.",
  },
  urge_log: {
    headline: "See your patterns.",
    sub: "Your full urge history helps you understand your triggers.",
  },
  community: {
    headline: "You're not alone.",
    sub: "Post and connect with others on the same journey.",
  },
  partner: {
    headline: "Stay accountable.",
    sub: "Match with an accountability partner who gets it.",
  },
};

const FEATURES = [
  '✓  Unlimited SOS sessions',
  '✓  Full urge log history',
  '✓  CBT workbook modules',
  '✓  Unlimited community posts',
  '✓  Accountability partner matching',
];

export default function PaywallScreen() {
  const { gate } = useLocalSearchParams<{ gate: PaywallGate }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [annual, setAnnual] = useState(true);

  const { setPremium } = useUserStore();

  const copy = GATE_COPY[gate ?? 'sos'];

  // Track paywall shown
  useEffect(() => {
    Analytics.paywallShown(gate ?? 'sos').catch(() => {});
  }, [gate]);

  async function handleSubscribe() {
    if (Platform.OS === 'web') {
      setError('Subscriptions are only available on iOS and Android.');
      return;
    }
    setLoading(true);
    setError('');

    const result: TrialResult = await startFreeTrial();
    setLoading(false);

    if (result.success) {
      setPremium(true);
      Analytics.paywallConverted(annual ? 'annual' : 'monthly').catch(() => {});
      router.back();
    } else if (!result.cancelled) {
      setError(result.error);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        <Text style={styles.badge}>BETFREE PREMIUM</Text>
        <Text style={styles.headline}>{copy.headline}</Text>
        <Text style={styles.sub}>{copy.sub}</Text>

        <View style={styles.featureList}>
          {FEATURES.map((f) => (
            <Text key={f} style={styles.feature}>{f}</Text>
          ))}
        </View>

        {/* Plan toggle */}
        <View style={styles.planToggle}>
          <Pressable
            style={[styles.planBtn, annual && styles.planBtnActive]}
            onPress={() => setAnnual(true)}
          >
            <Text style={[styles.planBtnTitle, annual && styles.planBtnTitleActive]}>Annual</Text>
            <Text style={[styles.planBtnPrice, annual && styles.planBtnPriceActive]}>$59.99 / yr</Text>
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>SAVE 50%</Text>
            </View>
          </Pressable>
          <Pressable
            style={[styles.planBtn, !annual && styles.planBtnActive]}
            onPress={() => setAnnual(false)}
          >
            <Text style={[styles.planBtnTitle, !annual && styles.planBtnTitleActive]}>Monthly</Text>
            <Text style={[styles.planBtnPrice, !annual && styles.planBtnPriceActive]}>$9.99 / mo</Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[styles.subscribeBtn, loading && styles.subscribeBtnDisabled]}
          onPress={handleSubscribe}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#0A0A0F" />
            : <Text style={styles.subscribeBtnText}>Start 7-day free trial</Text>
          }
        </Pressable>
        <Text style={styles.legalText}>
          Then {annual ? '$59.99/year' : '$9.99/month'}. Cancel anytime.
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.skipText}>No thanks, continue free</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : Spacing.lg,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    alignItems: 'flex-end',
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: Radius.full,
    backgroundColor: Colors.light.backgroundMuted,
    justifyContent: 'center', alignItems: 'center',
  },
  closeBtnText: { color: Colors.light.textSecondary, fontSize: 14 },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  badge: {
    color: Colors.light.purple,
    fontSize: 12,
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
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  sub: {
    color: Colors.light.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    marginTop: -Spacing.sm,
  },
  featureList: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  feature: { color: Colors.light.text, fontSize: 15 },
  planToggle: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  planBtn: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.backgroundElement,
    gap: 4,
    position: 'relative',
  },
  planBtnActive: {
    borderColor: Colors.light.purple,
    backgroundColor: Colors.light.purpleLight,
  },
  planBtnTitle: { color: Colors.light.textSecondary, fontSize: 14, fontWeight: '600' },
  planBtnTitleActive: { color: Colors.light.purple },
  planBtnPrice: { color: Colors.light.text, fontSize: 17, fontWeight: '700' },
  planBtnPriceActive: { color: Colors.light.purple },
  saveBadge: {
    position: 'absolute',
    top: -10, right: 8,
    backgroundColor: Colors.light.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  saveBadgeText: { fontSize: 9, fontWeight: '800', color: '#0A0A0F' },
  errorText: { color: Colors.light.danger, fontSize: 14, textAlign: 'center' },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.lg,
    gap: Spacing.md,
    alignItems: 'center',
  },
  subscribeBtn: {
    width: '100%',
    backgroundColor: Colors.light.purple,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
  },
  subscribeBtnDisabled: { opacity: 0.5 },
  subscribeBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  legalText: { color: Colors.light.textMuted, fontSize: 12, textAlign: 'center' },
  skipText: { color: Colors.light.textSecondary, fontSize: 14, textDecorationLine: 'underline' },
});
