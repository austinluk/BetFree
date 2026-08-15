import { useState, useEffect } from 'react';
import {
  View, Text, Pressable, ScrollView, FlatList,
  StyleSheet, Platform, Modal,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/useUserStore';
import { useStreakStore } from '@/store/useStreakStore';
import { usePremium } from '@/hooks/usePremium';
import { CBT_MODULES } from '@/constants/cbt-modules';
import { Colors, Spacing, Radius, BottomTabInset } from '@/constants/theme';
import type { CommitmentVaultEntry } from '@/types';

interface JournalEntry {
  id: string;
  triggers: string[];
  urge_level: number;
  notes: string | null;
  created_at: string;
}

type ActiveTab = 'cbt' | 'journal';

// ─── CBT Module Reader ────────────────────────────────────────────────────────

function CBTReader({ moduleId, onClose }: { moduleId: string; onClose: () => void }) {
  const [cardIndex, setCardIndex] = useState(0);
  const { isPremium, showPaywall } = usePremium();
  const mod = CBT_MODULES.find((m) => m.id === moduleId)!;
  const card = mod.cards[cardIndex];
  const isLocked = !isPremium && cardIndex >= mod.freeCards;

  if (isLocked) {
    return (
      <View style={styles.lockedCard}>
        <Text style={styles.lockedEmoji}>🔒</Text>
        <Text style={styles.lockedTitle}>Premium content</Text>
        <Text style={styles.lockedSub}>Unlock all CBT modules with BetFree Premium.</Text>
        <Pressable style={styles.unlockBtn} onPress={() => showPaywall('urge_log')}>
          <Text style={styles.unlockBtnText}>Unlock Premium</Text>
        </Pressable>
        <Pressable onPress={onClose}>
          <Text style={styles.backLink}>← Back to modules</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.readerContainer}>
      <View style={styles.readerHeader}>
        <Pressable onPress={onClose}>
          <Text style={styles.backLink}>← {mod.title}</Text>
        </Pressable>
        <Text style={styles.readerProgress}>{cardIndex + 1} / {mod.cards.length}</Text>
      </View>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((cardIndex + 1) / mod.cards.length) * 100}%` as any }]} />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.cardContent}>
        <Text style={styles.cardTitle}>{card.title}</Text>
        <Text style={styles.cardBody}>{card.body}</Text>
        {card.reflection && (
          <View style={styles.reflectionBox}>
            <Text style={styles.reflectionLabel}>💭 Reflect</Text>
            <Text style={styles.reflectionText}>{card.reflection}</Text>
          </View>
        )}
        {!isPremium && cardIndex === mod.freeCards - 1 && (
          <View style={styles.premiumTeaser}>
            <Text style={styles.premiumTeaserText}>
              {mod.cards.length - mod.freeCards} more cards in Premium
            </Text>
          </View>
        )}
      </ScrollView>
      <View style={styles.readerFooter}>
        {cardIndex > 0 && (
          <Pressable style={styles.prevBtn} onPress={() => setCardIndex((i) => i - 1)}>
            <Text style={styles.prevBtnText}>← Previous</Text>
          </Pressable>
        )}
        {cardIndex < mod.cards.length - 1 ? (
          <Pressable style={styles.nextBtn} onPress={() => setCardIndex((i) => i + 1)}>
            <Text style={styles.nextBtnText}>Next →</Text>
          </Pressable>
        ) : (
          <Pressable style={[styles.nextBtn, { backgroundColor: Colors.light.primary }]} onPress={onClose}>
            <Text style={styles.nextBtnText}>Done ✓</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── Main Tools Screen ────────────────────────────────────────────────────────

export default function ToolsScreen() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('cbt');
  const [openModuleId, setOpenModuleId] = useState<string | null>(null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loadingJournal, setLoadingJournal] = useState(false);
  const [vaultEntry, setVaultEntry] = useState<CommitmentVaultEntry | null>(null);
  const [showVaultModal, setShowVaultModal] = useState(false);

  const profile = useUserStore((s) => s.profile);
  const currentStreak = useStreakStore((s) => s.currentStreak);
  const { isPremium, showPaywall } = usePremium();

  useEffect(() => {
    if (profile) {
      loadVaultEntry();
    }
  }, [profile]);

  useEffect(() => {
    if (activeTab === 'journal' && profile) loadJournal();
  }, [activeTab, profile]);

  async function loadVaultEntry() {
    if (!profile) return;
    const { data } = await supabase
      .from('commitment_vault')
      .select('*')
      .eq('user_id', profile.id)
      .eq('is_active', true)
      .maybeSingle();
    setVaultEntry(data as CommitmentVaultEntry | null);
  }

  async function loadJournal() {
    if (!profile) return;
    setLoadingJournal(true);
    let query = supabase
      .from('trigger_journal')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });

    // Free users see last 7 days only
    if (!isPremium) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('created_at', sevenDaysAgo);
    }

    const { data } = await query.limit(100);
    setJournalEntries(data ?? []);
    setLoadingJournal(false);
  }

  function getVaultDaysSince(): string {
    if (!vaultEntry) return '';
    const diff = currentStreak - vaultEntry.streak_at_recording;
    return diff < 0 ? 'recently' : `${diff} day${diff !== 1 ? 's' : ''} ago`;
  }

  function truncateVaultPreview(content: string): string {
    if (content.length <= 60) return content;
    return content.slice(0, 60) + '...';
  }

  if (openModuleId) {
    return <CBTReader moduleId={openModuleId} onClose={() => setOpenModuleId(null)} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tools</Text>
        <View style={styles.tabToggle}>
          <Pressable
            style={[styles.toggleBtn, activeTab === 'cbt' && styles.toggleBtnActive]}
            onPress={() => setActiveTab('cbt')}
          >
            <Text style={[styles.toggleBtnText, activeTab === 'cbt' && styles.toggleBtnTextActive]}>
              CBT Modules
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggleBtn, activeTab === 'journal' && styles.toggleBtnActive]}
            onPress={() => setActiveTab('journal')}
          >
            <Text style={[styles.toggleBtnText, activeTab === 'journal' && styles.toggleBtnTextActive]}>
              Trigger Journal
            </Text>
          </Pressable>
        </View>
      </View>

      {activeTab === 'cbt' ? (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + 20 }]}>

          {/* Commitment Vault section */}
          <View style={styles.vaultSection}>
            <Text style={styles.sectionHeader}>Commitment Vault</Text>
            {vaultEntry ? (
              <View style={styles.vaultCard}>
                <Text style={styles.vaultMeta}>Recorded {getVaultDaysSince()}</Text>
                <Text style={styles.vaultPreview}>{truncateVaultPreview(vaultEntry.content)}</Text>
                <View style={styles.vaultActions}>
                  <Pressable style={styles.vaultBtn} onPress={() => setShowVaultModal(true)}>
                    <Text style={styles.vaultBtnText}>Read Message</Text>
                  </Pressable>
                  <Pressable style={styles.vaultBtn} onPress={() => router.push('/commitment-vault' as any)}>
                    <Text style={styles.vaultBtnText}>Update</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.vaultEmpty}>
                <Text style={styles.vaultEmptyText}>
                  Record a message to your future self for when it gets hard.
                </Text>
                <Pressable style={styles.vaultRecordBtn} onPress={() => router.push('/commitment-vault' as any)}>
                  <Text style={styles.vaultRecordBtnText}>Record Now</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* CBT Modules */}
          <Text style={styles.sectionHeader}>CBT Modules</Text>
          {CBT_MODULES.map((mod) => (
            <Pressable
              key={mod.id}
              style={styles.moduleCard}
              onPress={() => setOpenModuleId(mod.id)}
            >
              <Text style={styles.moduleEmoji}>{mod.emoji}</Text>
              <View style={styles.moduleInfo}>
                <Text style={styles.moduleTitle}>{mod.title}</Text>
                <Text style={styles.moduleDesc} numberOfLines={2}>{mod.description}</Text>
                <Text style={styles.moduleCardCount}>
                  {mod.cards.length} cards
                  {!isPremium && ` · ${mod.freeCards} free`}
                </Text>
              </View>
              {!isPremium && mod.freeCards < mod.cards.length && (
                <View style={styles.lockBadge}>
                  <Text style={styles.lockBadgeText}>🔒</Text>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          {!isPremium && (
            <Pressable style={styles.premiumBanner} onPress={() => showPaywall('urge_log')}>
              <Text style={styles.premiumBannerText}>
                🔒 Showing last 7 days · Upgrade for full history
              </Text>
            </Pressable>
          )}
          <FlatList
            data={journalEntries}
            keyExtractor={(e) => e.id}
            contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: BottomTabInset + 20, gap: Spacing.md }}
            refreshing={loadingJournal}
            onRefresh={loadJournal}
            renderItem={({ item: entry }) => (
              <View style={styles.journalCard}>
                <View style={styles.journalHeader}>
                  <View style={[
                    styles.urgePill,
                    { backgroundColor: entry.urge_level <= 3 ? Colors.light.primaryLight :
                      entry.urge_level <= 6 ? '#FFF7ED' : Colors.light.dangerLight }
                  ]}>
                    <Text style={[
                      styles.urgePillText,
                      { color: entry.urge_level <= 3 ? Colors.light.primaryDark :
                        entry.urge_level <= 6 ? Colors.light.accent : Colors.light.danger }
                    ]}>
                      Urge {entry.urge_level}/10
                    </Text>
                  </View>
                  <Text style={styles.journalDate}>
                    {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                {entry.triggers.length > 0 && (
                  <View style={styles.triggerChips}>
                    {entry.triggers.map((t) => (
                      <View key={t} style={styles.triggerChip}>
                        <Text style={styles.triggerChipText}>{t}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {entry.notes && (
                  <Text style={styles.journalNotes}>{entry.notes}</Text>
                )}
              </View>
            )}
            ListEmptyComponent={
              !loadingJournal ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>
                    No journal entries yet.{'\n'}Your check-ins build this automatically.
                  </Text>
                </View>
              ) : null
            }
          />
        </View>
      )}

      {/* Vault read modal */}
      <Modal
        visible={showVaultModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowVaultModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView>
              <Text style={styles.modalText}>{vaultEntry?.content ?? ''}</Text>
            </ScrollView>
            <Pressable style={styles.modalClose} onPress={() => setShowVaultModal(false)}>
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  title: { fontSize: 28, fontWeight: '800', color: Colors.light.text, letterSpacing: -0.3 },
  tabToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.light.backgroundMuted,
    borderRadius: Radius.lg,
    padding: 3,
  },
  toggleBtn: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: Radius.md },
  toggleBtnActive: { backgroundColor: Colors.light.backgroundElement },
  toggleBtnText: { color: Colors.light.textSecondary, fontSize: 14, fontWeight: '600' },
  toggleBtnTextActive: { color: Colors.light.text },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  sectionHeader: { fontSize: 17, fontWeight: '700', color: Colors.light.text },
  vaultSection: { gap: Spacing.md },
  vaultCard: {
    backgroundColor: Colors.light.backgroundElement, borderRadius: Radius.xl,
    padding: Spacing.lg, gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  vaultMeta: { fontSize: 12, color: Colors.light.textMuted },
  vaultPreview: { fontSize: 14, color: Colors.light.text, lineHeight: 20, fontStyle: 'italic' },
  vaultActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  vaultBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primaryLight,
  },
  vaultBtnText: { color: Colors.light.primaryDark, fontSize: 12, fontWeight: '600' },
  vaultEmpty: {
    backgroundColor: Colors.light.backgroundElement, borderRadius: Radius.xl,
    padding: Spacing.lg, gap: Spacing.md,
    borderWidth: 1, borderColor: Colors.light.border, borderStyle: 'dashed',
  },
  vaultEmptyText: { fontSize: 14, color: Colors.light.textSecondary, lineHeight: 20 },
  vaultRecordBtn: {
    backgroundColor: Colors.light.primary, borderRadius: Radius.lg,
    paddingVertical: Spacing.sm + 2, alignItems: 'center',
  },
  vaultRecordBtnText: { color: '#0A0A0F', fontSize: 14, fontWeight: '700' },
  moduleCard: {
    backgroundColor: Colors.light.backgroundElement, borderRadius: Radius.xl,
    padding: Spacing.lg, flexDirection: 'row', gap: Spacing.md,
    borderWidth: 1, borderColor: Colors.light.border, alignItems: 'center',
  },
  moduleEmoji: { fontSize: 36 },
  moduleInfo: { flex: 1, gap: 4 },
  moduleTitle: { fontSize: 16, fontWeight: '700', color: Colors.light.text },
  moduleDesc: { fontSize: 13, color: Colors.light.textSecondary, lineHeight: 18 },
  moduleCardCount: { fontSize: 12, color: Colors.light.textMuted, marginTop: 2 },
  lockBadge: { padding: 4 },
  lockBadgeText: { fontSize: 16 },
  premiumBanner: {
    backgroundColor: Colors.light.purpleLight, marginHorizontal: Spacing.lg,
    borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.light.purple,
  },
  premiumBannerText: { color: Colors.light.purple, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  journalCard: {
    backgroundColor: Colors.light.backgroundElement, borderRadius: Radius.lg,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.light.border, gap: Spacing.sm,
  },
  journalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  urgePill: { borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 3 },
  urgePillText: { fontSize: 12, fontWeight: '700' },
  journalDate: { color: Colors.light.textMuted, fontSize: 13 },
  triggerChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  triggerChip: {
    backgroundColor: Colors.light.backgroundMuted, borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 2,
  },
  triggerChipText: { color: Colors.light.textSecondary, fontSize: 12 },
  journalNotes: { color: Colors.light.text, fontSize: 14, lineHeight: 20, fontStyle: 'italic' },
  empty: { alignItems: 'center', paddingTop: Spacing.xxl, paddingHorizontal: Spacing.lg },
  emptyText: { color: Colors.light.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 24 },
  // CBT Reader styles
  readerContainer: {
    flex: 1, backgroundColor: Colors.light.background,
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : Spacing.lg,
  },
  readerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, marginBottom: Spacing.md,
  },
  backLink: { color: Colors.light.primary, fontSize: 15, fontWeight: '600' },
  readerProgress: { color: Colors.light.textMuted, fontSize: 14 },
  progressBar: {
    height: 4, backgroundColor: Colors.light.border,
    marginHorizontal: Spacing.lg, borderRadius: Radius.full, marginBottom: Spacing.xl,
  },
  progressFill: { height: 4, backgroundColor: Colors.light.primary, borderRadius: Radius.full },
  cardContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, gap: Spacing.xl },
  cardTitle: { fontSize: 26, fontWeight: '800', color: Colors.light.text, letterSpacing: -0.3 },
  cardBody: { fontSize: 17, color: Colors.light.text, lineHeight: 28 },
  reflectionBox: {
    backgroundColor: Colors.light.primaryLight, borderRadius: Radius.lg,
    padding: Spacing.lg, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.light.primary,
  },
  reflectionLabel: { fontSize: 14, fontWeight: '700', color: Colors.light.primaryDark },
  reflectionText: { fontSize: 15, color: Colors.light.primaryDark, lineHeight: 22 },
  premiumTeaser: {
    backgroundColor: Colors.light.purpleLight, borderRadius: Radius.lg,
    padding: Spacing.md, alignItems: 'center',
  },
  premiumTeaserText: { color: Colors.light.purple, fontSize: 14, fontWeight: '600' },
  readerFooter: {
    flexDirection: 'row', gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.light.border,
  },
  prevBtn: {
    flex: 1, backgroundColor: Colors.light.backgroundMuted, borderRadius: Radius.lg,
    paddingVertical: Spacing.md, alignItems: 'center',
  },
  prevBtnText: { color: Colors.light.text, fontSize: 16, fontWeight: '600' },
  nextBtn: {
    flex: 2, backgroundColor: Colors.light.primaryDark, borderRadius: Radius.lg,
    paddingVertical: Spacing.md, alignItems: 'center',
  },
  nextBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  lockedCard: {
    flex: 1, backgroundColor: Colors.light.background,
    justifyContent: 'center', alignItems: 'center',
    padding: Spacing.xl, gap: Spacing.lg,
  },
  lockedEmoji: { fontSize: 48 },
  lockedTitle: { fontSize: 22, fontWeight: '700', color: Colors.light.text },
  lockedSub: { fontSize: 16, color: Colors.light.textSecondary, textAlign: 'center', lineHeight: 24 },
  unlockBtn: {
    backgroundColor: Colors.light.purple, borderRadius: Radius.lg,
    paddingVertical: Spacing.md + 2, paddingHorizontal: Spacing.xl, alignItems: 'center',
  },
  unlockBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.light.background, borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl, padding: Spacing.xl, maxHeight: '65%', gap: Spacing.lg,
  },
  modalText: { fontSize: 18, color: Colors.light.text, lineHeight: 28, fontStyle: 'italic' },
  modalClose: {
    backgroundColor: Colors.light.backgroundMuted, borderRadius: Radius.lg,
    paddingVertical: Spacing.md, alignItems: 'center',
  },
  modalCloseText: { color: Colors.light.text, fontSize: 16, fontWeight: '600' },
});
