import { Platform } from 'react-native';

export const Colors = {
  light: {
    background: '#F7F9FC',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#EEF4FF',
    backgroundMuted: '#F0F4F8',
    text: '#1A1D23',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    primary: '#4ADE80',
    primaryDark: '#16A34A',
    primaryLight: '#DCFCE7',
    accent: '#FB923C',
    accentLight: '#FFF7ED',
    purple: '#A78BFA',
    purpleLight: '#F5F3FF',
    success: '#4ADE80',
    warning: '#FBBF24',
    danger: '#F87171',
    dangerLight: '#FEF2F2',
    border: '#E5E7EB',
    shadow: 'rgba(0,0,0,0.06)',
    tabBar: '#FFFFFF',
  },
  dark: {
    background: '#111318',
    backgroundElement: '#1C1F26',
    backgroundSelected: '#252A35',
    backgroundMuted: '#161920',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    primary: '#4ADE80',
    primaryDark: '#22C55E',
    primaryLight: '#052E16',
    accent: '#FB923C',
    accentLight: '#431407',
    purple: '#A78BFA',
    purpleLight: '#2E1065',
    success: '#4ADE80',
    warning: '#FBBF24',
    danger: '#F87171',
    dangerLight: '#450A0A',
    border: '#2D3748',
    shadow: 'rgba(0,0,0,0.3)',
    tabBar: '#1C1F26',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Palette = {
  streak: Colors.light.primary,
  money: Colors.light.primary,
  sos: Colors.light.accent,
  badge: Colors.light.purple,
  premium: Colors.light.purple,
  danger: Colors.light.danger,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
