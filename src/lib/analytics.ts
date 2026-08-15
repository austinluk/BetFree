import { Platform } from 'react-native';

const MIXPANEL_TOKEN = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN;
const isEnabled = !!MIXPANEL_TOKEN && MIXPANEL_TOKEN !== 'placeholder';

let mixpanel: any = null;
let initPromise: Promise<any> | null = null;

async function getMixpanel() {
  if (!isEnabled) return null;
  if (mixpanel) return mixpanel;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const { Mixpanel } = await import('mixpanel-react-native');
        mixpanel = await Mixpanel.init(MIXPANEL_TOKEN!, false);
        return mixpanel;
      } catch {
        initPromise = null;
        return null;
      }
    })();
  }
  return initPromise;
}

export async function identify(userId: string, props?: Record<string, any>) {
  const mp = await getMixpanel();
  if (!mp) return;
  mp.identify(userId);
  if (props) mp.getPeople().set(props);
}

export async function track(event: string, props?: Record<string, any>) {
  const mp = await getMixpanel();
  if (!mp) return;
  mp.track(event, { platform: Platform.OS, ...props });
}

export async function trackScreen(name: string) {
  await track('Screen View', { screen: name });
}

export async function reset() {
  const mp = await getMixpanel();
  if (!mp) return;
  mp.reset();
}

// ─── Typed event helpers ─────────────────────────────────────────────────────

export const Analytics = {
  onboardingCompleted: (betType: string, weeklyAmount: number) =>
    track('onboarding_completed', { bet_type: betType, weekly_amount: weeklyAmount }),

  checkinSubmitted: (urgeLevel: number, mood: string, triggerCount: number) =>
    track('checkin_submitted', { urge_level: urgeLevel, mood, trigger_count: triggerCount }),

  sosStarted: () => track('sos_started'),
  sosCompleted: (stepReached: number) => track('sos_completed', { step_reached: stepReached }),
  sosAbandoned: (stepReached: number) => track('sos_abandoned', { step_reached: stepReached }),

  paywallShown: (gate: string) => track('paywall_shown', { gate }),
  paywallConverted: (plan: 'annual' | 'monthly') => track('paywall_converted', { plan }),

  badgeEarned: (badgeId: string) => track('badge_earned', { badge_id: badgeId }),
  avatarItemEquipped: (itemId: string, category: string) =>
    track('avatar_item_equipped', { item_id: itemId, category }),

  relapseLogged: () => track('relapse_logged'),
  postCreated: (category: string) => track('post_created', { category }),
  cbtModuleStarted: (moduleId: string) => track('cbt_module_started', { module_id: moduleId }),
  cbtModuleCompleted: (moduleId: string) => track('cbt_module_completed', { module_id: moduleId }),
  highRiskEventWarningShown: (eventName: string) =>
    track('high_risk_event_warning_shown', { event_name: eventName }),

  // Signature feature events
  ledgerViewed: () => track('ledger_viewed'),
  ledgerShared: () => track('ledger_shared'),
  savingsGoalSet: (amount: number) => track('savings_goal_set', { amount }),
  pregameActivated: (eventName: string) => track('pregame_activated', { event_name: eventName }),
  pregameCompleted: (eventName: string) => track('pregame_completed', { event_name: eventName }),
  urgePatternViewed: () => track('urge_pattern_viewed'),
  dangerWindowProtectionToggled: (enabled: boolean) =>
    track('danger_window_protection_toggled', { enabled }),
  relapseAutopsyCompleted: () => track('relapse_autopsy_completed'),
  relapseAutopsySkipped: () => track('relapse_autopsy_skipped'),
  commitmentVaultRecorded: () => track('commitment_vault_recorded'),
  commitmentVaultPlayedback: () => track('commitment_vault_playedback'),
};
