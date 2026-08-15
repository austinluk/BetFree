import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { AvatarEquipped } from '@/components/ui/CatAvatar';

export interface ShopItem {
  id: string;
  category: 'hat' | 'outfit' | 'background' | 'accessory';
  name: string;
  emoji: string;
  cost: number; // 0 = free
  unlockCondition: string; // 'free', 'points:500', 'badge:day_7'
}

export const SHOP_ITEMS: ShopItem[] = [
  // Backgrounds — first is free
  { id: 'bg_white', category: 'background', name: 'Clean', emoji: '⬜', cost: 0, unlockCondition: 'free' },
  { id: 'bg_sky', category: 'background', name: 'Sky', emoji: '🌤️', cost: 50, unlockCondition: 'points:50' },
  { id: 'bg_sunset', category: 'background', name: 'Sunset', emoji: '🌅', cost: 100, unlockCondition: 'points:100' },
  { id: 'bg_forest', category: 'background', name: 'Forest', emoji: '🌿', cost: 150, unlockCondition: 'badge:day_7' },
  { id: 'bg_night', category: 'background', name: 'Night', emoji: '🌙', cost: 300, unlockCondition: 'badge:day_30' },

  // Hats
  { id: 'hat_party', category: 'hat', name: 'Party', emoji: '🎉', cost: 0, unlockCondition: 'free' },
  { id: 'hat_cap', category: 'hat', name: 'Cap', emoji: '🧢', cost: 50, unlockCondition: 'points:50' },
  { id: 'hat_tophat', category: 'hat', name: 'Top Hat', emoji: '🎩', cost: 150, unlockCondition: 'points:150' },
  { id: 'hat_crown', category: 'hat', name: 'Crown', emoji: '👑', cost: 0, unlockCondition: 'badge:day_30' },
  { id: 'hat_halo', category: 'hat', name: 'Halo', emoji: '😇', cost: 0, unlockCondition: 'badge:day_90' },

  // Outfits
  { id: 'outfit_bowtie', category: 'outfit', name: 'Bow Tie', emoji: '🎀', cost: 0, unlockCondition: 'free' },
  { id: 'outfit_shield', category: 'outfit', name: 'Shield', emoji: '🛡️', cost: 0, unlockCondition: 'badge:day_7' },
  { id: 'outfit_medal', category: 'outfit', name: 'Medal', emoji: '🏅', cost: 0, unlockCondition: 'badge:day_14' },
  { id: 'outfit_heart', category: 'outfit', name: 'Heart', emoji: '❤️', cost: 75, unlockCondition: 'points:75' },
  { id: 'outfit_star', category: 'outfit', name: 'Star', emoji: '⭐', cost: 0, unlockCondition: 'badge:day_30' },

  // Accessories
  { id: 'acc_sparkle', category: 'accessory', name: 'Sparkle', emoji: '✨', cost: 0, unlockCondition: 'free' },
  { id: 'acc_fire', category: 'accessory', name: 'Fire', emoji: '🔥', cost: 0, unlockCondition: 'badge:day_3' },
  { id: 'acc_trophy', category: 'accessory', name: 'Trophy', emoji: '🏆', cost: 0, unlockCondition: 'badge:day_30' },
  { id: 'acc_rainbow', category: 'accessory', name: 'Rainbow', emoji: '🌈', cost: 200, unlockCondition: 'points:200' },
  { id: 'acc_muscle', category: 'accessory', name: 'Strong', emoji: '💪', cost: 0, unlockCondition: 'badge:day_90' },
];

interface AvatarState {
  recoveryPoints: number;
  ownedItems: string[];
  equipped: AvatarEquipped;
  earnedBadges: string[];
  setFromServer: (data: { recovery_points: number; owned_items: string[]; equipped: AvatarEquipped }) => void;
  setEarnedBadges: (badges: string[]) => void;
  checkAndAwardBadges: (userId: string, streak: { current_streak_days: number }, moneySaved: number, sosCompletions: number, hasCommunityPost: boolean) => Promise<string[]>;
  equipItem: (category: keyof AvatarEquipped, itemId: string | null) => Promise<void>;
  purchaseItem: (item: ShopItem, userId: string) => Promise<boolean>;
  addRecoveryPoints: (points: number, userId: string) => Promise<void>;
  canUnlock: (item: ShopItem) => boolean;
  reset: () => void;
}

const DEFAULT_EQUIPPED: AvatarEquipped = {
  hat: null,
  outfit: 'outfit_bowtie',
  background: 'bg_white',
  accessory: 'acc_sparkle',
};

const FREE_ITEMS = SHOP_ITEMS.filter((i) => i.unlockCondition === 'free').map((i) => i.id);

export const useAvatarStore = create<AvatarState>((set, get) => ({
  recoveryPoints: 0,
  ownedItems: FREE_ITEMS,
  equipped: DEFAULT_EQUIPPED,
  earnedBadges: [],

  setFromServer: (data) => set({
    recoveryPoints: data.recovery_points,
    ownedItems: data.owned_items ?? FREE_ITEMS,
    equipped: data.equipped ?? DEFAULT_EQUIPPED,
  }),

  setEarnedBadges: (badges) => set({ earnedBadges: badges }),

  checkAndAwardBadges: async (userId: string, streak: { current_streak_days: number }, moneySaved: number, sosCompletions: number, hasCommunityPost: boolean) => {
    const { earnedBadges } = get();
    const earned = new Set(earnedBadges);
    const newBadges: string[] = [];

    const days = streak.current_streak_days;
    for (const d of [1, 3, 7, 14, 30, 90, 180, 365]) {
      const id = `day_${d}`;
      if (days >= d && !earned.has(id)) newBadges.push(id);
    }
    if (moneySaved >= 100 && !earned.has('saved_100')) newBadges.push('saved_100');
    if (moneySaved >= 1000 && !earned.has('saved_1000')) newBadges.push('saved_1000');
    if (sosCompletions >= 10 && !earned.has('urge_slayer')) newBadges.push('urge_slayer');
    if (hasCommunityPost && !earned.has('not_alone')) newBadges.push('not_alone');

    if (newBadges.length === 0) return [];

    const allBadges = [...earnedBadges, ...newBadges];
    set({ earnedBadges: allBadges });

    // Unlock badge-gated shop items automatically
    const { ownedItems } = get();
    const newUnlocks = SHOP_ITEMS
      .filter((item) => {
        if (ownedItems.includes(item.id)) return false;
        if (!item.unlockCondition.startsWith('badge:')) return false;
        const badgeId = item.unlockCondition.split(':')[1];
        return newBadges.includes(badgeId);
      })
      .map((i) => i.id);

    if (newUnlocks.length > 0) {
      const updatedOwned = [...ownedItems, ...newUnlocks];
      set({ ownedItems: updatedOwned });
      await supabase.from('user_avatar').upsert({ user_id: userId, owned_items: updatedOwned }).eq('user_id', userId);
    }

    return newBadges;
  },

  canUnlock: (item) => {
    const { ownedItems, recoveryPoints, earnedBadges } = get();
    if (ownedItems.includes(item.id)) return true;
    if (item.unlockCondition === 'free') return true;
    if (item.unlockCondition.startsWith('points:')) {
      return recoveryPoints >= parseInt(item.unlockCondition.split(':')[1]);
    }
    if (item.unlockCondition.startsWith('badge:')) {
      return earnedBadges.includes(item.unlockCondition.split(':')[1]);
    }
    return false;
  },

  equipItem: async (category, itemId) => {
    const newEquipped = { ...get().equipped, [category]: itemId };
    set({ equipped: newEquipped });
    // Sync to Supabase in background
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase
        .from('user_avatar')
        .upsert({ user_id: session.user.id, equipped: newEquipped })
        .eq('user_id', session.user.id);
    }
  },

  purchaseItem: async (item, userId) => {
    const { recoveryPoints, ownedItems } = get();
    if (ownedItems.includes(item.id)) return true;
    if (recoveryPoints < item.cost) return false;

    const newPoints = recoveryPoints - item.cost;
    const newOwned = [...ownedItems, item.id];

    set({ recoveryPoints: newPoints, ownedItems: newOwned });

    await supabase
      .from('user_avatar')
      .upsert({
        user_id: userId,
        recovery_points: newPoints,
        owned_items: newOwned,
      })
      .eq('user_id', userId);

    return true;
  },

  addRecoveryPoints: async (points, userId) => {
    const newPoints = get().recoveryPoints + points;
    set({ recoveryPoints: newPoints });
    await supabase
      .from('user_avatar')
      .upsert({ user_id: userId, recovery_points: newPoints })
      .eq('user_id', userId);
  },

  reset: () => set({
    recoveryPoints: 0,
    ownedItems: FREE_ITEMS,
    equipped: DEFAULT_EQUIPPED,
    earnedBadges: [],
  }),
}));
