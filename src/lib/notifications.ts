import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  NOTIFICATION_COPY,
  MOTIVATIONAL_PUSH_QUOTES,
  RE_ENGAGEMENT_PUSH_QUOTES,
  buildMilestoneTitle,
  buildMilestoneBody,
  buildWeeklySummaryBody,
} from '@/constants/notification-copy';

const isNative = Platform.OS !== 'web';

if (isNative) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNative) return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleStreakReminder(hour = 20, minute = 0) {
  if (!isNative) return;
  await cancelNotification('streak-reminder');
  await Notifications.scheduleNotificationAsync({
    identifier: 'streak-reminder',
    content: {
      title: NOTIFICATION_COPY.streakReminder.title,
      body: NOTIFICATION_COPY.streakReminder.body,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function scheduleStreakAtRiskReminder() {
  if (!isNative) return;
  await cancelNotification('streak-at-risk');
  await Notifications.scheduleNotificationAsync({
    identifier: 'streak-at-risk',
    content: {
      title: NOTIFICATION_COPY.streakAtRisk.title,
      body: NOTIFICATION_COPY.streakAtRisk.body,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 20 * 60 * 60,
      repeats: false,
    },
  });
}

export async function scheduleMilestoneAlert(days: number, moneySaved: number) {
  if (!isNative) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: buildMilestoneTitle(days),
      body: buildMilestoneBody(moneySaved),
    },
    trigger: null,
  });
}

export async function scheduleWeeklySummary(
  checkins: number,
  urgesResisted: number,
  moneySaved: number
) {
  if (!isNative) return;
  await cancelNotification('weekly-summary');
  await Notifications.scheduleNotificationAsync({
    identifier: 'weekly-summary',
    content: {
      title: NOTIFICATION_COPY.weeklySummary.title,
      body: buildWeeklySummaryBody(checkins, urgesResisted, moneySaved),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 9,
      minute: 0,
    },
  });
}

export async function scheduleMotivationalReminder(hour = 9, minute = 0) {
  if (!isNative) return;
  await cancelNotification('motivational-daily');
  const idx = getDayOfYear() % MOTIVATIONAL_PUSH_QUOTES.length;
  await Notifications.scheduleNotificationAsync({
    identifier: 'motivational-daily',
    content: {
      title: 'BetFree',
      body: MOTIVATIONAL_PUSH_QUOTES[idx],
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function scheduleReEngagement() {
  if (!isNative) return;
  await cancelNotification('re-engagement');
  const idx = getDayOfYear() % RE_ENGAGEMENT_PUSH_QUOTES.length;
  await Notifications.scheduleNotificationAsync({
    identifier: 're-engagement',
    content: {
      title: 'BetFree',
      body: RE_ENGAGEMENT_PUSH_QUOTES[idx],
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 72 * 60 * 60,
      repeats: false,
    },
  });
}

export async function cancelReEngagement() {
  if (!isNative) return;
  await cancelNotification('re-engagement');
}

export async function cancelNotification(identifier: string) {
  if (!isNative) return;
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
}

export async function cancelAllNotifications() {
  if (!isNative) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
