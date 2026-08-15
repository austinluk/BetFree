import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, TextInput,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/useUserStore';
import { useStreakStore } from '@/store/useStreakStore';
import { usePremium } from '@/hooks/usePremium';
import { Analytics } from '@/lib/analytics';
import { Colors, Spacing, Radius } from '@/constants/theme';
import type { CommitmentVaultEntry } from '@/types';

const MAX_CHARS = 500;

export default function CommitmentVaultScreen() {
  const [mode, setMode] = useState<'list' | 'record'>('list');
  const [entries, setEntries] = useState<CommitmentVaultEntry[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [readModalEntry, setReadModalEntry] = useState<CommitmentVaultEntry | null>(null);

  const profile = useUserStore((s) => s.profile);
  const currentStreak = useStreakStore((s) => s.currentStreak);
  const { isPremium, showPaywall } = usePremium();

  const loadEntries = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase
      .from('commitment_vault')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });
    setEntries((data ?? []) as CommitmentVaultEntry[]);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  async function handleSave() {
    if (!profile || newMessage.trim().length < 10) return;

    if (entries.length >= 1 && !isPremium) {
      showPaywall('vault');
      return;
    }

    setSaving(true);
    try {
      await supabase
        .from('commitment_vault')
        .update({ is_active: false })
        .eq('user_id', profile.id);

      await supabase.from('commitment_vault').insert({
        user_id: profile.id,
        type: 'text',
        content: newMessage.trim(),
        streak_at_recording: currentStreak,
        is_active: true,
      });

      Analytics.commitmentVaultRecorded().catch(() => {});
      setNewMessage('');
      setMode('list');
      await loadEntries();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entry: CommitmentVaultEntry) {
    const confirm = await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Delete message?',
        'This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
        ]
      );
    });
    if (!confirm || !profile) return;

    await supabase.from('commitment_vault').delete().eq('id', entry.id);

    if (entry.is_active) {
      const remaining = entries.filter((e) => e.id !== entry.id);
      if (remaining.length > 0) {
        await supabase
          .from('commitment_vault')
          .update({ is_active: true })
          .eq('id', remaining[0].id);
      }
    }
    await loadEntries();
  }

  async function handleMakeActive(entry: CommitmentVaultEntry) {
    if (!profile) return;
    await supabase
      .from('commitment_vault')
      .update({ is_active: false })
      .eq('user_id', profile.id);
    await supabase
      .from('commitment_vault')
      .update({ is_active: true })
      .eq('id', entry.id);
    await loadEntries();
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    });
  }

  function daysSince(entry: CommitmentVaultEntry): string {
    const diff = currentStreak - entry.streak_at_recording;
    return diff < 0 ? 'recently' : `${diff} day${diff !== 1 ? 's' : ''}`;
  }

  // ── Record mode ─────────────────────────────────────────────────────────────
  if (mode === 'record') {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable onPress={() => setMode('list')} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Message to Future You</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.recordContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.prompt}>
            Tell future-you why you're stopping. Be specific. No one else will hear this.
          </Text>

          <TextInput
            style={styles.messageInput}
            multiline
            value={newMessage}
            onChangeText={(t) => setNewMessage(t.slice(0, MAX_CHARS))}
            placeholder="I'm doing this because..."
            placeholderTextColor={Colors.light.textMuted}
            textAlignVertical="top"
            autoFocus
          />

          <Text style={styles.charCount}>{newMessage.length}/{MAX_CHARS}</Text>

          {entries.length >= 1 && !isPremium && (
            <View style={styles.premiumNote}>
              <Text style={styles.premiumNoteText}>
                🔒 Free plan includes 1 message. Upgrade for unlimited.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[
              styles.saveBtn,
              (newMessage.trim().length < 10 || saving) && styles.saveBtnDisabled,
            ]}
            onPress={handleSave}
            disabled={newMessage.trim().length < 10 || saving}
          >
            <Text style={styles.saveBtnText}>
              {saving ? 'Saving...' : 'Save Message'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ── List mode ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Close</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Your Vault</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.light.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.listContent}>
          {entries.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyTitle}>No messages yet.</Text>
              <Text style={styles.emptySubtext}>
                Record a message to your future self for when it gets hard.
              </Text>
            </View>
          ) : (
            entries.map((entry) => (
              <Pressable
                key={entry.id}
                style={styles.entryCard}
                onPress={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              >
                <View style={styles.entryHeader}>
                  <Text style={styles.entryDate}>{formatDate(entry.created_at)}</Text>
                  {entry.is_active && (
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>Active</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.entryMeta}>
                  Recorded when you had {entry.streak_at_recording} days
                </Text>

                {expandedId === entry.id ? (
                  <Text style={styles.entryContentFull}>{entry.content}</Text>
                ) : (
                  <Text style={styles.entryContentPreview} numberOfLines={2}>
                    {entry.content}
                  </Text>
                )}

                <View style={styles.entryActions}>
                  <Pressable
                    style={styles.actionBtn}
                    onPress={() => setReadModalEntry(entry)}
                  >
                    <Text style={styles.actionBtnText}>Read</Text>
                  </Pressable>
                  {!entry.is_active && (
                    <Pressable
                      style={styles.actionBtn}
                      onPress={() => handleMakeActive(entry)}
                    >
                      <Text style={styles.actionBtnText}>Make Active</Text>
                    </Pressable>
                  )}
                  <Pressable
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => handleDelete(entry)}
                  >
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </Pressable>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}

      <View style={styles.footer}>
        <Pressable style={styles.saveBtn} onPress={() => setMode('record')}>
          <Text style={styles.saveBtnText}>Write New Message</Text>
        </Pressable>
      </View>

      {/* Read modal */}
      <Modal
        visible={readModalEntry !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setReadModalEntry(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView>
              <Text style={styles.modalDate}>
                {readModalEntry ? formatDate(readModalEntry.created_at) : ''}
              </Text>
              <Text style={styles.modalText}>
                {readModalEntry?.content ?? ''}
              </Text>
            </ScrollView>
            <Pressable style={styles.modalClose} onPress={() => setReadModalEntry(null)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.light.border,
  },
  backBtn: { width: 60 },
  backBtnText: { color: Colors.light.primary, fontSize: 15, fontWeight: '600' },
  headerTitle: { color: Colors.light.text, fontSize: 17, fontWeight: '700' },
  scroll: { flex: 1 },
  listContent: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, gap: Spacing.md },
  recordContent: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, gap: Spacing.lg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingTop: Spacing.xxl, gap: Spacing.md },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.light.text },
  emptySubtext: { fontSize: 15, color: Colors.light.textSecondary, textAlign: 'center', lineHeight: 22 },
  entryCard: {
    backgroundColor: Colors.light.backgroundElement, borderRadius: Radius.xl,
    padding: Spacing.lg, gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entryDate: { fontSize: 13, color: Colors.light.textSecondary, fontWeight: '600' },
  activeBadge: {
    backgroundColor: Colors.light.primaryLight, borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 2,
    borderWidth: 1, borderColor: Colors.light.primary,
  },
  activeBadgeText: { color: Colors.light.primaryDark, fontSize: 11, fontWeight: '700' },
  entryMeta: { fontSize: 12, color: Colors.light.textMuted },
  entryContentPreview: { fontSize: 14, color: Colors.light.text, lineHeight: 20 },
  entryContentFull: { fontSize: 14, color: Colors.light.text, lineHeight: 22, fontStyle: 'italic' },
  entryActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  actionBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.light.border,
    backgroundColor: Colors.light.backgroundMuted,
  },
  actionBtnText: { color: Colors.light.textSecondary, fontSize: 12, fontWeight: '600' },
  deleteBtn: { borderColor: Colors.light.danger, backgroundColor: Colors.light.dangerLight },
  deleteBtnText: { color: Colors.light.danger, fontSize: 12, fontWeight: '600' },
  prompt: { fontSize: 16, color: Colors.light.textSecondary, lineHeight: 24 },
  messageInput: {
    backgroundColor: Colors.light.backgroundElement, borderRadius: Radius.lg,
    padding: Spacing.md, color: Colors.light.text, fontSize: 16, lineHeight: 24,
    borderWidth: 1, borderColor: Colors.light.border, minHeight: 160,
  },
  charCount: { color: Colors.light.textMuted, fontSize: 12, textAlign: 'right' },
  premiumNote: {
    backgroundColor: Colors.light.purpleLight, borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.light.purple,
  },
  premiumNoteText: { color: Colors.light.purple, fontSize: 13 },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.light.border,
  },
  saveBtn: {
    backgroundColor: Colors.light.primary, borderRadius: Radius.lg,
    paddingVertical: Spacing.md + 2, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#0A0A0F', fontSize: 16, fontWeight: '700' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.light.background, borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl, padding: Spacing.xl,
    maxHeight: '70%', gap: Spacing.lg,
  },
  modalDate: { fontSize: 13, color: Colors.light.textMuted, marginBottom: Spacing.sm },
  modalText: { fontSize: 18, color: Colors.light.text, lineHeight: 28, fontStyle: 'italic' },
  modalClose: {
    backgroundColor: Colors.light.backgroundMuted, borderRadius: Radius.lg,
    paddingVertical: Spacing.md, alignItems: 'center',
    marginTop: Spacing.md,
  },
  modalCloseText: { color: Colors.light.text, fontSize: 16, fontWeight: '600' },
});
