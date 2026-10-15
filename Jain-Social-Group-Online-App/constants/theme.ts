export const Colors = {
  // Primary palette
  primary: '#007AFF',
  primaryDark: '#0055CC',
  primaryLight: '#4DA3FF',

  // Secondary
  secondary: '#FF6B35',
  secondaryLight: '#FF8C5A',

  // Accent
  accent: '#00C896',
  accentLight: '#33D9A8',

  // Success / Warning / Error
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  // Dark mode
  dark: {
    bg: '#0A0A0F',
    surface: '#13131A',
    surfaceSecondary: '#1C1C27',
    border: '#2A2A3A',
    text: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
  },

  // Light mode
  light: {
    bg: '#F9FAFB',
    surface: '#FFFFFF',
    surfaceSecondary: '#F3F4F6',
    border: '#E5E7EB',
    text: '#111827',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
  },

  // Gradients (as arrays for use with LinearGradient)
  gradients: {
    primary: ['#007AFF', '#0055CC'] as const,
    secondary: ['#FF6B35', '#FF3D00'] as const,
    accent: ['#00C896', '#00957A'] as const,
    warm: ['#FF6B35', '#FF9A3C'] as const,
    cool: ['#007AFF', '#00C8FF'] as const,
    dark: ['#13131A', '#0A0A0F'] as const,
    premium: ['#F59E0B', '#D97706'] as const,
    story1: ['#FF6B35', '#FF3D00'] as const,
    story2: ['#007AFF', '#00C8FF'] as const,
    story3: ['#00C896', '#007AFF'] as const,
    story4: ['#F59E0B', '#EF4444'] as const,
  },
};

export const Typography = {
  fontSizes: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 40,
  },
  fontWeights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const Spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
};

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 24,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  primary: {
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
};
