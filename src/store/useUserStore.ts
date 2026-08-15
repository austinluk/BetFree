import { create } from 'zustand';
import type { Profile, OnboardingData } from '@/types';

interface UserState {
  profile: Profile | null;
  isLoading: boolean;
  isOnboarded: boolean;
  isPremium: boolean;
  // Prevents _layout from redirecting while onboarding flow is in progress
  skipAuthRedirect: boolean;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  setOnboarded: (onboarded: boolean) => void;
  setPremium: (premium: boolean) => void;
  setSkipAuthRedirect: (skip: boolean) => void;
  updateOnboardingData: (data: OnboardingData) => void;
  reset: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  isLoading: true,
  isOnboarded: false,
  isPremium: false,
  skipAuthRedirect: false,

  setProfile: (profile) =>
    set({
      profile,
      isOnboarded: profile?.onboarding_complete ?? false,
      isPremium: profile?.premium_status ?? false,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  setOnboarded: (isOnboarded) =>
    set((s) => ({
      isOnboarded,
      profile: s.profile ? { ...s.profile, onboarding_complete: isOnboarded } : null,
    })),

  setPremium: (isPremium) =>
    set((s) => ({
      isPremium,
      profile: s.profile ? { ...s.profile, premium_status: isPremium } : null,
    })),

  setSkipAuthRedirect: (skipAuthRedirect) => set({ skipAuthRedirect }),

  updateOnboardingData: (data) =>
    set((s) => ({
      profile: s.profile ? { ...s.profile, onboarding_data: data } : null,
    })),

  reset: () =>
    set({
      profile: null,
      isLoading: false,
      isOnboarded: false,
      isPremium: false,
      skipAuthRedirect: false,
    }),
}));
