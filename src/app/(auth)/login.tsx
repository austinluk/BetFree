import { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, TextInput,
  Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/constants/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!email.trim() || !password) return;
    setLoading(true);
    setError('');

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(
        signInError.message.toLowerCase().includes('invalid login')
          ? 'Incorrect email or password.'
          : signInError.message
      );
      setLoading(false);
      return;
    }

    // Success — _layout.tsx onAuthStateChange fetches profile and navigates to /(tabs)
    // Keep loading=true so the button stays disabled while the redirect happens
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>Sign in to continue your recovery.</Text>

      <View style={styles.inputGroup}>
        <TextInput
          style={styles.input}
          placeholder="Email address"
          placeholderTextColor={Colors.light.textMuted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={Colors.light.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable
        style={[styles.loginBtn, (!email.trim() || !password || loading) && styles.loginBtnDisabled]}
        onPress={handleLogin}
        disabled={!email.trim() || !password || loading}
      >
        <Text style={styles.loginBtnText}>{loading ? 'Signing in...' : 'Sign in'}</Text>
      </Pressable>

      <Pressable onPress={() => router.push('/(auth)/forgot-password' as any)} style={styles.forgotLink}>
        <Text style={styles.forgotLinkText}>Forgot password?</Text>
      </Pressable>

      <Pressable onPress={() => router.back()} style={styles.createLink}>
        <Text style={styles.createLinkText}>New here? Create an account →</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : Spacing.lg,
    paddingBottom: 48,
    gap: Spacing.lg,
  },
  backBtn: { alignSelf: 'flex-start' },
  backText: { color: Colors.light.primary, fontSize: 15, fontWeight: '600' },
  title: { fontSize: 30, fontWeight: '800', color: Colors.light.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 15, color: Colors.light.textSecondary, marginTop: -Spacing.sm },
  inputGroup: { gap: Spacing.sm },
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
  errorText: {
    color: Colors.light.danger,
    fontSize: 14,
    marginTop: -Spacing.sm,
  },
  loginBtn: {
    backgroundColor: Colors.light.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
  },
  loginBtnDisabled: { opacity: 0.4 },
  loginBtnText: { color: '#0A0A0F', fontSize: 17, fontWeight: '700' },
  forgotLink: { alignItems: 'center' },
  forgotLinkText: { color: Colors.light.primary, fontSize: 14, fontWeight: '600' },
  createLink: { alignItems: 'center' },
  createLinkText: {
    color: Colors.light.textSecondary,
    fontSize: 15,
    textDecorationLine: 'underline',
  },
});
