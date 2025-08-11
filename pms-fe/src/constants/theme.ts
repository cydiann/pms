import { MD3LightTheme } from 'react-native-paper';

// Color palette based on the plan
export const Colors = {
  // Primary brand colors
  primary: '#3B82F6', // Blue
  primaryDark: '#1E40AF',
  secondary: '#10B981', // Green
  secondaryDark: '#059669',
  
  // Status colors for requests
  status: {
    draft: '#6B7280',         // Gray
    pending: '#F59E0B',       // Orange
    in_review: '#3B82F6',     // Blue
    approved: '#10B981',      // Green
    rejected: '#EF4444',      // Red
    revision_requested: '#8B5CF6', // Purple
    purchasing: '#14B8A6',    // Teal
    ordered: '#6366F1',       // Indigo
    delivered: '#059669',     // Emerald
    completed: '#22C55E',     // Green
  },
  
  // UI colors
  background: '#FFFFFF',
  surface: '#F9FAFB',
  surfaceVariant: '#F3F4F6',
  
  // Text colors
  text: '#111827',
  textSecondary: '#6B7280',
  textOnPrimary: '#FFFFFF',
  
  // Border and divider
  border: '#E5E7EB',
  divider: '#F3F4F6',
  
  // Feedback colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Additional grays
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  }
};

// Typography
export const Typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System-Medium',
    bold: 'System-Bold',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  }
};

// Spacing
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
};

// Dimensions for worksite-friendly touch targets
export const Dimensions = {
  touchTarget: {
    min: 44,
    comfortable: 48,
    large: 56,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 999,
  },
  input: {
    height: 48,
    heightLarge: 56,
  },
  button: {
    height: 48,
    heightSmall: 36,
    heightLarge: 56,
  }
};

// React Native Paper theme customization
export const PaperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.primary,
    secondary: Colors.secondary,
    surface: Colors.surface,
    background: Colors.background,
    error: Colors.error,
    onSurface: Colors.text,
    onBackground: Colors.text,
  },
};

// Animation durations
export const Animation = {
  fast: 150,
  normal: 250,
  slow: 400,
};

// Shadow styles for elevation
export const Shadow = {
  small: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  }
};