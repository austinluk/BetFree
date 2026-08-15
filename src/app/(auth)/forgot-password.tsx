import { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, TextInput,
  Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/constants/theme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleReset() {
    if (!email.trim()) return;
    setLoading(true);
    setError('');

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim()
    );

    setLoading(false);
    if (resetError) {
      setError(resetError.message);
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <View style={styles.container}>
        <View style={styles.successContent}>
          <Text style={styles.successEmoji}>📬</Text>
          <Text style={styles.successTitle}>Check your email</Text>
          <Text style={styles.successBody}>
            We sent a password reset link to{'\n'}
            <Text style={styles.emailHighlight}>{email.trim()}</Text>
          </Text>
          <Pressable style={styles.backBtn} onPress={() => router.replace('/(auth)/login' as any)}>
            <Text style={styles.backBtnText}>Back to sign in</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={() => router.back()} style={styles.backLink}>
        <Text style={styles.backLinkText}>← Back</Text>
      </Pressable>

      <Text style={styles.title}>Reset password</Text>
      <Text style={styles.subtitle}>
        Enter your email and we'll send you a reset link.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email address"
        placeholderTextColor={Colors.light.textMuted}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        autoFocus
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable
        style={[styles.submitBtn, (!email.trim() || loading) && styles.submitBtnDisabled]}
        onPress={handleReset}
        disabled={!email.trim() || loading}
      >
        <Text style={styles.submitBtnText}>{loading ? 'Sending...' : 'Send reset link'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : Spacing.lg,
    paddingBottom: 48,
    gap: Spacing.lg,
  },
  backLink: { alignSelf: 'flex-start' },
  backLinkText: { color: Colors.light.primary, fontSize: 15, fontWeight: '600' },
  title: { fontSize: 30, fontWeight: '800', color: Colors.light.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 15, color: Colors.light.textSecondary, marginTop: -Spacing.sm, lineHeight: 22 },
  input: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    color: Colors.light.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    height: 52,
  },
  errorText: { color: Colors.light.danger, fontSize: 14, marginTop: -Spacing.sm },
  submitBtn: {
    backgroundColor: Colors.light.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: '#0A0A0F', fontSize: 17, fontWeight: '700' },
  // Success state
  successContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  successEmoji: { fontSize: 64 },
  successTitle: { fontSize: 26, fontWeight: '800', color: Colors.light.text, textAlign: 'center' },
  successBody: { fontSize: 16, color: Colors.light.textSecondary, textAlign: 'center', lineHeight: 24 },
  emailHighlight: { fontWeight: '700', color: Colors.light.text },
  backBtn: {
    backgroundColor: Colors.light.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  backBtnText: { color: '#0A0A0F', fontSize: 16, fontWeight: '700' },
});
