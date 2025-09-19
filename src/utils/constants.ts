export const COLORS = {
  primary: '#007AFF',
  secondary: '#5856D6',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  gray: '#8E8E93',
  lightGray: '#F2F2F7',
  darkGray: '#3A3A3C',
  background: '#FFFFFF',
  text: '#000000',
  textSecondary: '#6D6D80',
  border: '#E5E5EA',
} as const;

export const FONT_SIZES = {
  small: 12,
  medium: 16,
  large: 18,
  xlarge: 24,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const SYNC_CONFIG = {
  retryDelayMs: 1000,
  maxRetryDelayMs: 30000,
  maxRetries: 5,
  syncIntervalMs: 30000, // 30 seconds
} as const;