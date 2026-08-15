import Purchases, { LOG_LEVEL, PURCHASES_ERROR_CODE } from 'react-native-purchases';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY!;
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY!;

const isNative = Platform.OS !== 'web';
// Expo Go reports executionEnvironment as 'storeClient' — RevenueCat requires a real build
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export async function setupRevenueCat() {
  if (!isNative || isExpoGo) return;
  Purchases.setLogLevel(LOG_LEVEL.ERROR);
  const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;
  await Purchases.configure({ apiKey });
}

export async function checkPremium(): Promise<boolean> {
  if (!isNative || isExpoGo) return false;
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active['premium'] !== undefined;
  } catch {
    return false;
  }
}

export type TrialResult =
  | { success: true }
  | { success: false; cancelled: boolean; error: string };

export async function startFreeTrial(): Promise<TrialResult> {
  if (!isNative || isExpoGo) {
    return { success: false, cancelled: false, error: 'Subscriptions are only available in the full app.' };
  }
  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) return { success: false, cancelled: false, error: 'No offerings available' };

    const pkg = current.annual ?? current.monthly ?? current.availablePackages[0];
    if (!pkg) return { success: false, cancelled: false, error: 'No packages available' };

    await Purchases.purchasePackage(pkg);
    return { success: true };
  } catch (e: any) {
    if (e?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return { success: false, cancelled: true, error: 'Cancelled' };
    }
    const message = e?.message ?? 'Failed to start trial. Please try again.';
    return { success: false, cancelled: false, error: message };
  }
}

export async function identifyUser(userId: string) {
  if (!isNative || isExpoGo) return;
  await Purchases.logIn(userId);
}
