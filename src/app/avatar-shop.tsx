import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { CatAvatar, BACKGROUND_ITEMS } from '@/components/ui/CatAvatar';
import { useAvatarStore, SHOP_ITEMS, ShopItem } from '@/store/useAvatarStore';
import { useUserStore } from '@/store/useUserStore';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useStreakStore } from '@/store/useStreakStore';

const CATEGORIES = [
  { id: 'background', label: 'Backgrounds' },
  { id: 'hat', label: 'Hats' },
  { id: 'outfit', label: 'Outfits' },
  { id: 'accessory', label: 'Accessories' },
] as const;

export default function AvatarShopScreen() {
  const [activeCategory, setActiveCategory] = useState<'background' | 'hat' | 'outfit' | 'accessory'>('hat');
  const profile = useUserStore((s) => s.profile);
  const currentStreak = useStreakStore((s) => s.currentStreak);
  const {
    equipped,
    recoveryPoints,
    ownedItems,
    equipItem,
    purchaseItem,
    canUnlock,
  } = useAvatarStore();

  const filteredItems = SHOP_ITEMS.filter((i) => i.category === activeCategory);

  async function handleItemPress(item: ShopItem) {
    if (!profile) return;

    if (ownedItems.includes(item.id)) {
      // Already owned — equip it
      await equipItem(item.category, item.id);
      return;
    }

    if (canUnlock(item) && item.cost > 0) {
      // Purchase with recovery points
      await purchaseItem(item, profile.id);
      await equipItem(item.category, item.id);
      return;
    }

    if (item.unlockCondition === 'free') {
      await equipItem(item.category, item.id);
    }
  }

  function getItemStatus(item: ShopItem): 'equipped' | 'owned' | 'unlockable' | 'locked' {
    const isEquipped =
      (item.category === 'hat' && equipped.hat === item.id) ||
      (item.category === 'outfit' && equipped.outfit === item.id) ||
      (item.category === 'background' && equipped.background === item.id) ||
      (item.category === 'accessory' && equipped.accessory === item.id);

    if (isEquipped) return 'equipped';
    if (ownedItems.includes(item.id)) return 'owned';
    if (canUnlock(item)) return 'unlockable';
    return 'locked';
  }

  function getUnlockLabel(item: ShopItem): string {
    if (item.unlockCondition === 'free') return 'Free';
    if (item.unlockCondition.startsWith('points:')) return `⚡ ${item.cost} pts`;
    if (item.unlockCondition.startsWith('badge:')) {
      const badge = item.unlockCondition.split(':')[1];
      const labels: Record<string, string> = {
        day_3: '3 day streak',
        day_7: '7 day streak',
        day_14: '14 day streak',
        day_30: '30 day streak',
        day_90: '90 day streak',
      };
      return `🏅 ${labels[badge] ?? badge}`;
    }
    return '';
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </Pressable>
        <Text style={styles.title}>Your Cat</Text>
        <View style={styles.pointsBadge}>
          <Text style={styles.pointsText}>⚡ {recoveryPoints}</Text>
        </View>
      </View>

      {/* Avatar preview */}
      <View style={styles.previewSection}>
        <CatAvatar
          equipped={equipped}
          recoveryPoints={recoveryPoints}
          streak={currentStreak}
          size="large"
          onPress={() => {}}
        />
        <Text style={styles.previewHint}>
          {currentStreak >= 30 ? 'Your cat is thriving! 😸' :
           currentStreak >= 7 ? 'Looking good! 😺' :
           currentStreak >= 1 ? 'Keep going! 🐱' :
           'Start your streak to level up your cat 😿'}
        </Text>
      </View>

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContent}
      >
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat.id}
            style={[styles.categoryTab, activeCategory === cat.id && styles.categoryTabActive]}
            onPress={() => setActiveCategory(cat.id)}
          >
            <Text style={[styles.categoryTabText, activeCategory === cat.id && styles.categoryTabTextActive]}>
              {cat.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Items grid */}
      <ScrollView style={styles.itemsScroll} contentContainerStyle={styles.itemsGrid}>
        {filteredItems.map((item) => {
          const status = getItemStatus(item);
          return (
            <Pressable
              key={item.id}
              style={[
                styles.itemCard,
                status === 'equipped' && styles.itemCardEquipped,
                status === 'locked' && styles.itemCardLocked,
              ]}
              onPress={() => handleItemPress(item)}
              disabled={status === 'locked'}
            >
              {/* Background preview */}
              {item.category === 'background' ? (
                <View style={[styles.bgPreview, {
                  backgroundColor: BACKGROUND_ITEMS[item.id.replace('bg_', '')] ?? Colors.light.backgroundMuted
                }]} />
              ) : (
                <Text style={[styles.itemEmoji, status === 'locked' && styles.itemEmojiLocked]}>
                  {item.emoji}
                </Text>
              )}

              <Text style={[styles.itemName, status === 'locked' && styles.itemNameLocked]}>
                {item.name}
              </Text>

              {status === 'equipped' && (
                <View style={styles.equippedBadge}>
                  <Text style={styles.equippedBadgeText}>ON</Text>
                </View>
              )}
              {status === 'owned' && (
                <Text style={styles.ownedLabel}>Tap to wear</Text>
              )}
              {status === 'unlockable' && item.cost > 0 && (
                <View style={styles.costBadge}>
                  <Text style={styles.costBadgeText}>⚡ {item.cost}</Text>
                </View>
              )}
              {status === 'locked' && (
                <Text style={styles.lockedLabel}>{getUnlockLabel(item)}</Text>
              )}
              {(status === 'unlockable' && item.cost === 0) && (
                <Text style={styles.freeLabel}>Free</Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: Radius.full,
    backgroundColor: Colors.light.backgroundMuted,
    justifyContent: 'center', alignItems: 'center',
  },
  backBtnText: { fontSize: 18, color: Colors.light.text },
  title: { fontSize: 20, fontWeight: '700', color: Colors.light.text },
  pointsBadge: {
    backgroundColor: Colors.light.purpleLight,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  pointsText: { color: Colors.light.purple, fontSize: 14, fontWeight: '700' },
  previewSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  previewHint: { color: Colors.light.textSecondary, fontSize: 14 },
  categoryScroll: { flexGrow: 0 },
  categoryContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  categoryTab: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.light.backgroundMuted,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
  },
  categoryTabActive: {
    backgroundColor: Colors.light.primaryLight,
    borderColor: Colors.light.primary,
  },
  categoryTabText: { color: Colors.light.textSecondary, fontSize: 14, fontWeight: '600' },
  categoryTabTextActive: { color: Colors.light.primaryDark },
  itemsScroll: { flex: 1 },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  itemCard: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.light.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    position: 'relative',
    padding: Spacing.sm,
  },
  itemCardEquipped: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primaryLight,
  },
  itemCardLocked: {
    opacity: 0.5,
  },
  bgPreview: {
    width: 40, height: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  itemEmoji: { fontSize: 32 },
  itemEmojiLocked: { opacity: 0.4 },
  itemName: { fontSize: 11, fontWeight: '600', color: Colors.light.text, textAlign: 'center' },
  itemNameLocked: { color: Colors.light.textMuted },
  equippedBadge: {
    position: 'absolute',
    top: 4, right: 4,
    backgroundColor: Colors.light.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  equippedBadgeText: { fontSize: 8, fontWeight: '800', color: '#0A0A0F' },
  ownedLabel: { fontSize: 9, color: Colors.light.textSecondary },
  costBadge: {
    backgroundColor: Colors.light.purpleLight,
    borderRadius: Radius.full,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  costBadgeText: { fontSize: 9, fontWeight: '700', color: Colors.light.purple },
  lockedLabel: { fontSize: 9, color: Colors.light.textMuted, textAlign: 'center' },
  freeLabel: { fontSize: 9, color: Colors.light.primaryDark, fontWeight: '600' },
});
