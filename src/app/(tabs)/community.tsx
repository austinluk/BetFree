import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, FlatList, TextInput,
  StyleSheet, Platform, KeyboardAvoidingView, Modal, ScrollView,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/useUserStore';
import { usePremium } from '@/hooks/usePremium';
import { Colors, Spacing, Radius, BottomTabInset } from '@/constants/theme';

type Category = 'need_help' | 'won_today' | 'tips';

interface Post {
  id: string;
  user_id: string;
  content: string;
  category: Category;
  upvotes: number;
  created_at: string;
  has_upvoted?: boolean;
  display_name?: string;
}

const CATEGORY_LABELS: Record<Category, { label: string; emoji: string; color: string }> = {
  need_help: { label: 'Need help', emoji: '🆘', color: Colors.light.danger },
  won_today: { label: 'Won today', emoji: '🎉', color: Colors.light.primary },
  tips: { label: 'Tips', emoji: '💡', color: Colors.light.purple },
};

const FREE_POST_LIMIT = 3;

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function anonymizeName(displayName: string | null | undefined): string {
  if (!displayName) return 'Anonymous';
  const parts = displayName.trim().split(' ');
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0]}.`;
}

export default function CommunityScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [showCompose, setShowCompose] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [newCategory, setNewCategory] = useState<Category>('won_today');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');
  const [loading, setLoading] = useState(true);
  const [monthlyPostCount, setMonthlyPostCount] = useState(0);

  const profile = useUserStore((s) => s.profile);
  const profileId = profile?.id;
  const { isPremium, showPaywall } = usePremium();

  const loadPosts = useCallback(async () => {
    let query = supabase
      .from('posts')
      .select('id, user_id, content, category, upvotes, flagged, created_at')
      .eq('flagged', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (activeCategory !== 'all') {
      query = query.eq('category', activeCategory);
    }

    const { data, error: fetchError } = await query;
    if (fetchError) { console.error('[community] loadPosts error:', fetchError.message); }
    if (!data) { setLoading(false); return; }

    // Check which posts the current user has upvoted
    let upvotedIds = new Set<string>();
    if (profileId) {
      const { data: upvotes } = await supabase
        .from('post_upvotes')
        .select('post_id')
        .eq('user_id', profileId);
      upvotedIds = new Set(upvotes?.map((u) => u.post_id) ?? []);
    }

    // Fetch display names separately to avoid FK join issues
    const userIds = [...new Set(data.map((p: any) => p.user_id))];
    let nameMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds);
      nameMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p.display_name]));
    }

    setPosts(data.map((p: any) => ({
      ...p,
      display_name: nameMap[p.user_id] ?? null,
      has_upvoted: upvotedIds.has(p.id),
    })));
    setLoading(false);
  }, [activeCategory, profileId]);

  const loadMonthlyCount = useCallback(async () => {
    if (!profileId || isPremium) return;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profileId)
      .gte('created_at', startOfMonth.toISOString());
    setMonthlyPostCount(count ?? 0);
  }, [profileId, isPremium]);

  useEffect(() => {
    loadPosts();
    loadMonthlyCount();

    // Real-time subscription
    const channel = supabase
      .channel('posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => {
        loadPosts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadPosts]);

  async function handleUpvote(post: Post) {
    if (!profileId) return;

    if (post.has_upvoted) {
      await supabase.from('post_upvotes').delete()
        .eq('user_id', profileId).eq('post_id', post.id);
      // Atomic decrement — avoids race condition
      await supabase.rpc('decrement_post_upvotes', { post_id: post.id });
      setPosts((prev) => prev.map((p) =>
        p.id === post.id ? { ...p, upvotes: Math.max(0, p.upvotes - 1), has_upvoted: false } : p
      ));
    } else {
      await supabase.from('post_upvotes').insert({ user_id: profileId, post_id: post.id });
      // Atomic increment — avoids race condition
      await supabase.rpc('increment_post_upvotes', { post_id: post.id });
      setPosts((prev) => prev.map((p) =>
        p.id === post.id ? { ...p, upvotes: p.upvotes + 1, has_upvoted: true } : p
      ));
    }
  }

  async function handlePost() {
    if (!profileId || !newPost.trim()) return;
    setPosting(true);
    setPostError('');

    // Gate: free users limited to 3 posts/month
    if (!isPremium && monthlyPostCount >= FREE_POST_LIMIT) {
      setPosting(false);
      setShowCompose(false);
      showPaywall('community');
      return;
    }

    // Basic profanity filter (bad-words package)
    let content = newPost.trim();
    try {
      const { Filter } = await import('bad-words');
      const filter = new Filter();
      content = filter.clean(content);
    } catch { /* skip if package unavailable */ }

    const { error } = await supabase.from('posts').insert({
      user_id: profileId,
      content,
      category: newCategory,
    });

    if (error) {
      setPostError(`Failed to post: ${error.message}`);
    } else {
      setNewPost('');
      setShowCompose(false);
      loadPosts();
      loadMonthlyCount();
    }
    setPosting(false);
  }

  const filtered = activeCategory === 'all' ? posts : posts.filter((p) => p.category === activeCategory);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Community</Text>
        <View style={styles.headerRight}>
          {!isPremium && monthlyPostCount > 0 && monthlyPostCount < FREE_POST_LIMIT && (
            <Text style={styles.postCountLabel}>
              {FREE_POST_LIMIT - monthlyPostCount} post{FREE_POST_LIMIT - monthlyPostCount !== 1 ? 's' : ''} left
            </Text>
          )}
          <Pressable
            style={[styles.composeBtn, !isPremium && monthlyPostCount >= FREE_POST_LIMIT && styles.composeBtnLocked]}
            onPress={() => {
              if (!isPremium && monthlyPostCount >= FREE_POST_LIMIT) {
                showPaywall('community');
              } else {
                setShowCompose(true);
              }
            }}
          >
            <Text style={styles.composeBtnText}>
              {!isPremium && monthlyPostCount >= FREE_POST_LIMIT ? '🔒 Post' : '+ Post'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Category filter */}
      <View style={styles.categories}>
        {(['all', 'need_help', 'won_today', 'tips'] as const).map((cat) => (
          <Pressable
            key={cat}
            style={[styles.catTab, activeCategory === cat && styles.catTabActive]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text style={[styles.catTabText, activeCategory === cat && styles.catTabTextActive]}>
              {cat === 'all' ? 'All' : CATEGORY_LABELS[cat].emoji + ' ' + CATEGORY_LABELS[cat].label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Posts */}
      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: BottomTabInset + 20, gap: Spacing.md }}
        refreshing={loading}
        onRefresh={loadPosts}
        renderItem={({ item: post }) => {
          const cat = CATEGORY_LABELS[post.category];
          return (
            <View style={styles.postCard}>
              <View style={styles.postHeader}>
                <View style={[styles.catBadge, { backgroundColor: cat.color + '20' }]}>
                  <Text style={[styles.catBadgeText, { color: cat.color }]}>
                    {cat.emoji} {cat.label}
                  </Text>
                </View>
                <Text style={styles.postTime}>{timeAgo(post.created_at)}</Text>
              </View>
              <Text style={styles.postContent}>{post.content}</Text>
              <View style={styles.postFooter}>
                <Text style={styles.postAuthor}>{anonymizeName(post.display_name)}</Text>
                <Pressable style={styles.upvoteBtn} onPress={() => handleUpvote(post)}>
                  <Text style={[styles.upvoteText, post.has_upvoted && styles.upvoteTextActive]}>
                    {post.has_upvoted ? '❤️' : '🤍'} {post.upvotes}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No posts yet. Be the first to share.</Text>
            </View>
          ) : null
        }
      />

      {/* Compose modal */}
      <Modal visible={showCompose} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
        >
          <ScrollView
            style={styles.composeModal}
            contentContainerStyle={styles.composeModalContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.composeHeader}>
              <Text style={styles.composeTitle}>New post</Text>
              <Pressable onPress={() => setShowCompose(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            {/* Category selector */}
            <View style={styles.composeCats}>
              {(['need_help', 'won_today', 'tips'] as Category[]).map((cat) => (
                <Pressable
                  key={cat}
                  style={[styles.composeCat, newCategory === cat && styles.composeCatActive]}
                  onPress={() => setNewCategory(cat)}
                >
                  <Text style={styles.composeCatText}>
                    {CATEGORY_LABELS[cat].emoji} {CATEGORY_LABELS[cat].label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              style={styles.composeInput}
              multiline
              placeholder="What's on your mind? (max 500 chars)"
              placeholderTextColor={Colors.light.textMuted}
              value={newPost}
              onChangeText={(t) => setNewPost(t.slice(0, 500))}
              autoFocus
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{newPost.length}/500</Text>

            {postError ? <Text style={styles.errorText}>{postError}</Text> : null}

            <View style={styles.composeFooter}>
              <Text style={styles.anonymousNote}>Posted anonymously (first name + initial only)</Text>
              <Pressable
                style={[styles.submitBtn, (!newPost.trim() || posting) && styles.submitBtnDisabled]}
                onPress={handlePost}
                disabled={!newPost.trim() || posting}
              >
                <Text style={styles.submitBtnText}>{posting ? 'Posting...' : 'Post'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: { fontSize: 28, fontWeight: '800', color: Colors.light.text, letterSpacing: -0.3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  postCountLabel: { color: Colors.light.textMuted, fontSize: 12, fontWeight: '600' },
  composeBtn: {
    backgroundColor: Colors.light.primary, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2,
  },
  composeBtnLocked: { backgroundColor: Colors.light.backgroundMuted },
  composeBtnText: { color: '#0A0A0F', fontSize: 14, fontWeight: '700' },
  categories: {
    flexDirection: 'row', gap: Spacing.xs,
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, flexWrap: 'wrap',
  },
  catTab: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full, backgroundColor: Colors.light.backgroundMuted,
    borderWidth: 1.5, borderColor: Colors.light.border,
  },
  catTabActive: { backgroundColor: Colors.light.primaryLight, borderColor: Colors.light.primary },
  catTabText: { color: Colors.light.textSecondary, fontSize: 13, fontWeight: '600' },
  catTabTextActive: { color: Colors.light.primaryDark },
  postCard: {
    backgroundColor: Colors.light.backgroundElement, borderRadius: Radius.lg,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.light.border, gap: Spacing.sm,
  },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catBadge: { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  catBadgeText: { fontSize: 12, fontWeight: '600' },
  postTime: { color: Colors.light.textMuted, fontSize: 12 },
  postContent: { color: Colors.light.text, fontSize: 15, lineHeight: 22 },
  postFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  postAuthor: { color: Colors.light.textSecondary, fontSize: 13 },
  upvoteBtn: { padding: 4 },
  upvoteText: { fontSize: 14, color: Colors.light.textSecondary },
  upvoteTextActive: { color: Colors.light.danger },
  empty: { alignItems: 'center', paddingTop: Spacing.xxl },
  emptyText: { color: Colors.light.textMuted, fontSize: 15 },
  // Compose modal
  composeModal: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  composeModalContent: {
    paddingTop: Platform.OS === 'ios' ? 24 : Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 40,
    gap: Spacing.md,
  },
  composeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  composeTitle: { fontSize: 20, fontWeight: '700', color: Colors.light.text },
  closeBtn: {
    width: 32, height: 32, borderRadius: Radius.full,
    backgroundColor: Colors.light.backgroundMuted,
    justifyContent: 'center', alignItems: 'center',
  },
  closeBtnText: { color: Colors.light.textSecondary, fontSize: 14 },
  composeCats: { flexDirection: 'row', gap: Spacing.sm },
  composeCat: {
    flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.lg,
    backgroundColor: Colors.light.backgroundMuted, alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.light.border,
  },
  composeCatActive: { borderColor: Colors.light.primary, backgroundColor: Colors.light.primaryLight },
  composeCatText: { fontSize: 12, fontWeight: '600', color: Colors.light.text },
  composeInput: {
    backgroundColor: Colors.light.backgroundElement, borderRadius: Radius.lg,
    padding: Spacing.md, color: Colors.light.text, fontSize: 16, lineHeight: 24,
    borderWidth: 1, borderColor: Colors.light.border,
    height: 120,
  },
  charCount: { color: Colors.light.textMuted, fontSize: 12, textAlign: 'right' },
  errorText: { color: Colors.light.danger, fontSize: 14 },
  composeFooter: { gap: Spacing.sm },
  anonymousNote: { color: Colors.light.textMuted, fontSize: 12, textAlign: 'center' },
  submitBtn: {
    backgroundColor: Colors.light.primary, borderRadius: Radius.lg,
    paddingVertical: Spacing.md, alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: '#0A0A0F', fontSize: 16, fontWeight: '700' },
});
