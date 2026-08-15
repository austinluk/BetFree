import { useState, useEffect } from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet,
  TextInput, Platform, Alert, Switch,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/useUserStore';
import { useStreakStore } from '@/store/useStreakStore';
import { useAvatarStore } from '@/store/useAvatarStore';
import { usePremium } from '@/hooks/usePremium';
import { requestNotificationPermission, scheduleStreakReminder, cancelNotification } from '@/lib/notifications';
import { Colors, Spacing, Radius, BottomTabInset } from '@/constants/theme';

type PartnerStatus = 'none' | 'waiting' | 'matched';

interface Partner {
  pairId: string;
  partnerId: string;
  partnerName: string | null;
  partnerStreak: number;
  status: PartnerStatus;
}

const SPORTS = ['NFL', 'NBA', 'MLB', 'NHL', 'UFC', 'Soccer', 'College Football', 'Horse Racing', 'Boxing', 'Other'];

export default function ProfileScreen() {
  const profile = useUserStore((s) => s.profile);
  const { reset: resetUser } = useUserStore();
  const { reset: resetStreak } = useStreakStore();
  const { reset: resetAvatar } = useAvatarStore();
  const { isPremium, showPaywall } = usePremium();
  const currentStreak = useStreakStore((s) => s.currentStreak);
  const recoveryPoints = useAvatarStore((s) => s.recoveryPoints);
  const totalCleanDays = useStreakStore((s) => s.totalCleanDays);
  const weeklyBetEstimate = useStreakStore((s) => s.weeklyBetEstimate);
  const runningTotal = Math.floor((totalCleanDays * weeklyBetEstimate) / 7);

  const [partner, setPartner] = useState<Partner | null>(null);
  const [loadingPartner, setLoadingPartner] = useState(true);
  const [joiningQueue, setJoiningQueue] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [savingName, setSavingName] = useState(false);
  const [notifDailyCheckin, setNotifDailyCheckin] = useState(
    profile?.notification_prefs?.daily_checkin ?? true
  );
  const [notifStreakAlerts, setNotifStreakAlerts] = useState(
    profile?.notification_prefs?.streak_alerts ?? true
  );
  const [notifHighRisk, setNotifHighRisk] = useState(
    profile?.notification_prefs?.high_risk ?? true
  );
  const [goalAmount, setGoalAmount] = useState(profile?.savings_goal_amount?.toString() ?? '');
  const [goalLabel, setGoalLabel] = useState(profile?.savings_goal_label ?? '');
  const [savingGoal, setSavingGoal] = useState(false);
  const [sportPrefs, setSportPrefs] = useState<string[]>(profile?.sport_preferences ?? []);

  useEffect(() => {
    if (profile) loadPartner();
  }, [profile]);

  async function loadPartner() {
    if (!profile) return;
    setLoadingPartner(true);

    const { data } = await supabase
      .from('accountability_pairs')
      .select('*')
      .or(`user_a.eq.${profile.id},user_b.eq.${profile.id}`)
      .neq('status', 'ended')
      .single();

    if (data) {
      const isUserA = data.user_a === profile.id;
      const partnerId = isUserA ? data.user_b : data.user_a;

      // Fetch partner's profile and streak separately to avoid FK join issues
      let partnerName: string | null = null;
      let partnerStreak = 0;

      if (partnerId) {
        const [profileRes, streakRes] = await Promise.all([
          supabase.from('profiles').select('display_name').eq('id', partnerId).single(),
          supabase.from('streaks').select('current_streak_days').eq('user_id', partnerId).single(),
        ]);
        partnerName = profileRes.data?.display_name ?? null;
        partnerStreak = streakRes.data?.current_streak_days ?? 0;
      }

      setPartner({
        pairId: data.id,
        partnerId,
        partnerName,
        partnerStreak,
        status: data.status,
      });
    }
    setLoadingPartner(false);
  }

  async function joinPartnerQueue() {
    if (!isPremium) { showPaywall('partner'); return; }
    if (!profile) return;
    setJoiningQueue(true);

    await supabase.from('accountability_pairs').insert({
      user_a: profile.id,
      bet_type: profile.onboarding_data?.bet_type ?? null,
      status: 'waiting',
    });

    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    await loadPartner();
    setJoiningQueue(false);
  }

  async function leavePartnerQueue() {
    if (!partner || !profile) return;
    await supabase
      .from('accountability_pairs')
      .update({ status: 'ended' })
      .eq('id', partner.pairId);
    setPartner(null);
  }

  async function saveDisplayName() {
    if (!profile || !displayName.trim()) return;
    setSavingName(true);
    await supabase
      .from('profiles')
      .update({ display_name: displayName.trim() })
      .eq('id', profile.id);
    setSavingName(false);
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }

  async function handleNotifToggle(key: 'daily_checkin' | 'streak_alerts' | 'high_risk', value: boolean) {
    if (!profile) return;
    if (value) await requestNotificationPermission();

    const newPrefs = {
      daily_checkin: key === 'daily_checkin' ? value : notifDailyCheckin,
      streak_alerts: key === 'streak_alerts' ? value : notifStreakAlerts,
      high_risk: key === 'high_risk' ? value : notifHighRisk,
    };

    if (key === 'daily_checkin') setNotifDailyCheckin(value);
    if (key === 'streak_alerts') setNotifStreakAlerts(value);
    if (key === 'high_risk') setNotifHighRisk(value);

    // Update DB
    await supabase.from('profiles').update({ notification_prefs: newPrefs }).eq('id', profile.id);

    // Apply scheduling change
    if (key === 'daily_checkin') {
      if (value) { await scheduleStreakReminder().catch(() => {}); }
      else { await cancelNotification('streak-reminder').catch(() => {}); }
    }
  }

  async function saveGoal() {
    if (!profile) return;
    setSavingGoal(true);
    const amount = parseFloat(goalAmount) || null;
    await supabase.from('profiles').update({
      savings_goal_amount: amount,
      savings_goal_label: goalLabel.trim() || null,
    }).eq('id', profile.id);
    setSavingGoal(false);
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }

  async function toggleSport(sport: string) {
    if (!profile) return;
    const newPrefs = sportPrefs.includes(sport)
      ? sportPrefs.filter((s) => s !== sport)
      : [...sportPrefs, sport];
    setSportPrefs(newPrefs);
    await supabase.from('profiles').update({ sport_preferences: newPrefs }).eq('id', profile.id);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    resetUser();
    resetStreak();
    resetAvatar();
  }

  async function handleDeleteAccount() {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        'Delete your account? This permanently removes all your data and cannot be undone.'
      );
      if (!confirmed) return;
      await doDeleteAccount();
    } else {
      Alert.alert(
        'Delete account',
        'This permanently removes all your data. This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDeleteAccount },
        ]
      );
    }
  }

  async function doDeleteAccount() {
    if (!profile) return;
    // Delete all user data rows — auth.users record requires admin API (server-side)
    await Promise.all([
      supabase.from('checkins').delete().eq('user_id', profile.id),
      supabase.from('streaks').delete().eq('user_id', profile.id),
      supabase.from('relapses').delete().eq('user_id', profile.id),
      supabase.from('user_avatar').delete().eq('user_id', profile.id),
      supabase.from('posts').delete().eq('user_id', profile.id),
      supabase.from('sos_sessions').delete().eq('user_id', profile.id),
      supabase.from('trigger_journal').delete().eq('user_id', profile.id),
    ]);
    await supabase.from('profiles').delete().eq('id', profile.id);
    await supabase.auth.signOut();
    resetUser();
    resetStreak();
    resetAvatar();
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + 20 }]}
    >
      <Text style={styles.title}>Profile</Text>

      {/* Stats summary */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{currentStreak}</Text>
          <Text style={styles.statLabel}>Day streak</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>⚡{recoveryPoints}</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{isPremium ? '⭐' : '🆓'}</Text>
          <Text style={styles.statLabel}>{isPremium ? 'Premium' : 'Free'}</Text>
        </View>
      </View>

      {/* Display name */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Display name</Text>
        <Text style={styles.sectionSub}>Shown as first name + initial in the community</Text>
        <View style={styles.nameRow}>
          <TextInput
            style={styles.nameInput}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            placeholderTextColor={Colors.light.textMuted}
            autoCapitalize="words"
          />
          <Pressable
            style={[styles.saveBtn, savingName && styles.saveBtnDisabled]}
            onPress={saveDisplayName}
            disabled={savingName}
          >
            <Text style={styles.saveBtnText}>{savingName ? '...' : 'Save'}</Text>
          </Pressable>
        </View>
      </View>

      {/* Accountability partner */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Accountability Partner</Text>
        {!isPremium ? (
          <Pressable style={styles.premiumCard} onPress={() => showPaywall('partner')}>
            <Text style={styles.premiumCardText}>🔒 Premium feature — get matched with someone on the same journey</Text>
          </Pressable>
        ) : loadingPartner ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : !partner ? (
          <View style={styles.partnerEmpty}>
            <Text style={styles.partnerEmptyText}>No partner yet. Join the queue and we'll match you with someone fighting the same battle.</Text>
            <Pressable
              style={[styles.joinBtn, joiningQueue && styles.joinBtnDisabled]}
              onPress={joinPartnerQueue}
              disabled={joiningQueue}
            >
              <Text style={styles.joinBtnText}>{joiningQueue ? 'Joining...' : 'Find a partner'}</Text>
            </Pressable>
          </View>
        ) : partner.status === 'waiting' ? (
          <View style={styles.partnerWaiting}>
            <Text style={styles.partnerWaitingText}>🔍 Looking for your match...</Text>
            <Text style={styles.partnerWaitingSub}>We'll notify you when someone is matched.</Text>
            <Pressable style={styles.leaveBtn} onPress={leavePartnerQueue}>
              <Text style={styles.leaveBtnText}>Leave queue</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.partnerCard}>
            <Text style={styles.partnerName}>{partner.partnerName ?? 'Your partner'}</Text>
            <Text style={styles.partnerStreak}>🔥 {partner.partnerStreak} day streak</Text>
            <Pressable
              style={styles.messageBtn}
              onPress={() => router.push({ pathname: '/partner-chat' as any, params: { pairId: partner.pairId } })}
            >
              <Text style={styles.messageBtnText}>Send message →</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Upgrade prompt */}
      {!isPremium && (
        <Pressable style={styles.upgradeCard} onPress={() => showPaywall('sos')}>
          <Text style={styles.upgradeTitle}>Upgrade to Premium</Text>
          <Text style={styles.upgradeSub}>Unlock all features · $9.99/month or $59.99/year</Text>
        </Pressable>
      )}

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.settingsList}>
          <View style={styles.settingsRow}>
            <View style={styles.notifLabelGroup}>
              <Text style={styles.settingsRowText}>Daily check-in reminder</Text>
              <Text style={styles.notifSub}>8pm every day</Text>
            </View>
            <Switch
              value={notifDailyCheckin}
              onValueChange={(v) => handleNotifToggle('daily_checkin', v)}
              trackColor={{ false: Colors.light.border, true: Colors.light.primary }}
              thumbColor="#fff"
            />
          </View>
          <View style={styles.settingsRow}>
            <View style={styles.notifLabelGroup}>
              <Text style={styles.settingsRowText}>Streak alerts</Text>
              <Text style={styles.notifSub}>When your streak is at risk</Text>
            </View>
            <Switch
              value={notifStreakAlerts}
              onValueChange={(v) => handleNotifToggle('streak_alerts', v)}
              trackColor={{ false: Colors.light.border, true: Colors.light.primary }}
              thumbColor="#fff"
            />
          </View>
          <View style={[styles.settingsRow, { borderBottomWidth: 0 }]}>
            <View style={styles.notifLabelGroup}>
              <Text style={styles.settingsRowText}>High-risk day alerts</Text>
              <Text style={styles.notifSub}>Big games, match days</Text>
            </View>
            <Switch
              value={notifHighRisk}
              onValueChange={(v) => handleNotifToggle('high_risk', v)}
              trackColor={{ false: Colors.light.border, true: Colors.light.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>
      </View>

      {/* Savings Goal */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Savings Goal</Text>
        <Text style={styles.sectionSub}>What are you saving for?</Text>
        <View style={styles.nameRow}>
          <View style={[styles.nameInput, { paddingHorizontal: 0, paddingVertical: 0, overflow: 'hidden', flexDirection: 'row', alignItems: 'center' }]}>
            <Text style={{ paddingLeft: Spacing.md, color: Colors.light.textSecondary, fontSize: 16 }}>$</Text>
            <TextInput
              style={{ flex: 1, padding: Spacing.md, color: Colors.light.text, fontSize: 16 }}
              value={goalAmount}
              onChangeText={setGoalAmount}
              placeholder="0"
              placeholderTextColor={Colors.light.textMuted}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
        <TextInput
          style={styles.nameInput}
          value={goalLabel}
          onChangeText={setGoalLabel}
          placeholder="Family vacation, pay off debt..."
          placeholderTextColor={Colors.light.textMuted}
        />
        {goalAmount && parseFloat(goalAmount) > 0 && (
          <Text style={styles.sectionSub}>
            You're {Math.min(100, Math.floor((runningTotal / parseFloat(goalAmount)) * 100))}% there — ${runningTotal.toLocaleString()} of ${parseFloat(goalAmount).toLocaleString()}
          </Text>
        )}
        <Pressable
          style={[styles.saveBtn, savingGoal && styles.saveBtnDisabled]}
          onPress={saveGoal}
          disabled={savingGoal}
        >
          <Text style={styles.saveBtnText}>{savingGoal ? '...' : 'Save Goal'}</Text>
        </Pressable>
      </View>

      {/* Sport Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sport Preferences</Text>
        <Text style={styles.sectionSub}>Which sports do you follow? We'll alert you before high-risk games.</Text>
        <View style={styles.sportGrid}>
          {SPORTS.map((sport) => {
            const selected = sportPrefs.includes(sport);
            return (
              <Pressable
                key={sport}
                style={[styles.sportChip, selected && styles.sportChipActive]}
                onPress={() => toggleSport(sport)}
              >
                <Text style={[styles.sportChipText, selected && styles.sportChipTextActive]}>
                  {sport}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.settingsList}>
          <Pressable style={styles.settingsRow} onPress={() => router.push('/resources' as any)}>
            <Text style={styles.settingsRowText}>Crisis Resources</Text>
            <Text style={styles.settingsRowArrow}>→</Text>
          </Pressable>
          <Pressable style={styles.settingsRow} onPress={handleSignOut}>
            <Text style={styles.settingsRowText}>Sign out</Text>
            <Text style={styles.settingsRowArrow}>→</Text>
          </Pressable>
          <Pressable style={[styles.settingsRow, styles.settingsRowDanger]} onPress={handleDeleteAccount}>
            <Text style={styles.settingsRowTextDanger}>Delete account</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.version}>BetFree · Sprint 6 build</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : Spacing.lg,
    gap: Spacing.lg,
  },
  title: { fontSize: 28, fontWeight: '800', color: Colors.light.text, letterSpacing: -0.3 },
  statsCard: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: Radius.xl, padding: Spacing.lg,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.light.border,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statNumber: { fontSize: 22, fontWeight: '800', color: Colors.light.text },
  statLabel: { fontSize: 11, color: Colors.light.textSecondary },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.light.border },
  section: { gap: Spacing.sm },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.light.text },
  sectionSub: { fontSize: 13, color: Colors.light.textSecondary, marginTop: -Spacing.xs },
  nameRow: { flexDirection: 'row', gap: Spacing.sm },
  nameInput: {
    flex: 1, backgroundColor: Colors.light.backgroundElement,
    borderRadius: Radius.lg, padding: Spacing.md,
    color: Colors.light.text, fontSize: 16,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  saveBtn: {
    backgroundColor: Colors.light.primary, borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg, justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#0A0A0F', fontWeight: '700', fontSize: 15 },
  premiumCard: {
    backgroundColor: Colors.light.purpleLight, borderRadius: Radius.lg,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.light.purple,
  },
  premiumCardText: { color: Colors.light.purple, fontSize: 14, lineHeight: 20 },
  loadingText: { color: Colors.light.textMuted, fontSize: 14 },
  partnerEmpty: { gap: Spacing.md },
  partnerEmptyText: { color: Colors.light.textSecondary, fontSize: 15, lineHeight: 22 },
  joinBtn: {
    backgroundColor: Colors.light.primary, borderRadius: Radius.lg,
    paddingVertical: Spacing.md, alignItems: 'center',
  },
  joinBtnDisabled: { opacity: 0.5 },
  joinBtnText: { color: '#0A0A0F', fontSize: 16, fontWeight: '700' },
  partnerWaiting: {
    backgroundColor: Colors.light.backgroundElement, borderRadius: Radius.lg,
    padding: Spacing.lg, gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  partnerWaitingText: { color: Colors.light.text, fontSize: 16, fontWeight: '600' },
  partnerWaitingSub: { color: Colors.light.textSecondary, fontSize: 13 },
  leaveBtn: { alignSelf: 'flex-start', marginTop: Spacing.xs },
  leaveBtnText: { color: Colors.light.danger, fontSize: 14, textDecorationLine: 'underline' },
  partnerCard: {
    backgroundColor: Colors.light.primaryLight, borderRadius: Radius.lg,
    padding: Spacing.lg, gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.light.primary,
  },
  partnerName: { fontSize: 18, fontWeight: '700', color: Colors.light.text },
  partnerStreak: { fontSize: 14, color: Colors.light.primaryDark },
  messageBtn: {
    backgroundColor: Colors.light.primary, borderRadius: Radius.md,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    alignSelf: 'flex-start', marginTop: Spacing.xs,
  },
  messageBtnText: { color: '#0A0A0F', fontSize: 14, fontWeight: '700' },
  upgradeCard: {
    backgroundColor: Colors.light.purpleLight, borderRadius: Radius.xl,
    padding: Spacing.lg, gap: 4,
    borderWidth: 1, borderColor: Colors.light.purple,
  },
  upgradeTitle: { color: Colors.light.purple, fontSize: 16, fontWeight: '700' },
  upgradeSub: { color: Colors.light.purple, fontSize: 13, opacity: 0.8 },
  settingsList: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: Radius.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.light.border,
  },
  settingsRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.light.border,
  },
  settingsRowDanger: { borderBottomWidth: 0 },
  settingsRowText: { color: Colors.light.text, fontSize: 16 },
  settingsRowTextDanger: { color: Colors.light.danger, fontSize: 16 },
  settingsRowArrow: { color: Colors.light.textMuted, fontSize: 16 },
  notifLabelGroup: { flex: 1, gap: 2 },
  notifSub: { color: Colors.light.textMuted, fontSize: 12 },
  sportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  sportChip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full, backgroundColor: Colors.light.backgroundMuted,
    borderWidth: 1.5, borderColor: Colors.light.border,
  },
  sportChipActive: { borderColor: Colors.light.primary, backgroundColor: Colors.light.primaryLight },
  sportChipText: { color: Colors.light.textSecondary, fontSize: 13, fontWeight: '500' },
  sportChipTextActive: { color: Colors.light.primaryDark, fontWeight: '700' },
  version: { color: Colors.light.textMuted, fontSize: 12, textAlign: 'center', paddingVertical: Spacing.sm },
});
