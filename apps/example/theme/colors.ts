/**
 * Stripe-inspired color palette
 * Clean, professional blues and indigos with excellent contrast
 */

export const colors = {
  // Primary brand colors (Stripe-inspired indigo)
  primary: {
    50: '#f5f5ff',
    100: '#ececff',
    200: '#d9d9ff',
    300: '#b3b3ff',
    400: '#8080ff',
    500: '#635BFF', // Primary brand color
    600: '#4d46cc',
    700: '#3a3599',
    800: '#292466',
    900: '#1a1733',
  },

  // Accent blue (for highlights and CTAs)
  accent: {
    50: '#e6f9ff',
    100: '#b3edff',
    200: '#80e0ff',
    300: '#4dd4ff',
    400: '#1ac7ff',
    500: '#00A5FF', // Accent color
    600: '#0084cc',
    700: '#006399',
    800: '#004266',
    900: '#002133',
  },

  // Neutral grays
  gray: {
    50: '#F7F9FC',
    100: '#EFF2F7',
    200: '#E3E8EF',
    300: '#CBD2D9',
    400: '#9AA5B1',
    500: '#7B8794',
    600: '#616E7C',
    700: '#52606D',
    800: '#3E4C59',
    900: '#1F2933',
  },

  // Semantic colors
  success: {
    50: '#e6f9f2',
    100: '#b3eed9',
    200: '#80e3c0',
    300: '#4dd8a7',
    400: '#1acd8e',
    500: '#00C483', // Success green
    600: '#009d69',
    700: '#00764f',
    800: '#004f35',
    900: '#00281a',
  },

  error: {
    50: '#ffe6e6',
    100: '#ffb3b3',
    200: '#ff8080',
    300: '#ff4d4d',
    400: '#ff1a1a',
    500: '#F04950', // Error red
    600: '#cc3a40',
    700: '#992b30',
    800: '#661d20',
    900: '#330e10',
  },

  warning: {
    50: '#fff8e6',
    100: '#ffecb3',
    200: '#ffe080',
    300: '#ffd44d',
    400: '#ffc81a',
    500: '#FFB800', // Warning yellow
    600: '#cc9300',
    700: '#996e00',
    800: '#664a00',
    900: '#332500',
  },

  // Background and surface colors
  background: {
    light: '#FFFFFF',
    lightAlt: '#F7F9FC',
    dark: '#0A0D14',
    darkAlt: '#141821',
  },

  surface: {
    light: '#FFFFFF',
    lightElevated: '#FFFFFF',
    dark: '#1A1F2E',
    darkElevated: '#242B3D',
  },

  // Text colors
  text: {
    light: {
      primary: '#1F2933',
      secondary: '#52606D',
      tertiary: '#7B8794',
      disabled: '#CBD2D9',
      inverse: '#FFFFFF',
    },
    dark: {
      primary: '#FFFFFF',
      secondary: '#CBD2D9',
      tertiary: '#9AA5B1',
      disabled: '#52606D',
      inverse: '#1F2933',
    },
  },

  // Border colors
  border: {
    light: '#E3E8EF',
    lightHover: '#CBD2D9',
    dark: '#2E3648',
    darkHover: '#3E4C59',
  },
}

// Convenience exports
export const lightThemeColors = {
  primary: colors.primary[500],
  accent: colors.accent[500],
  background: colors.background.light,
  backgroundAlt: colors.background.lightAlt,
  surface: colors.surface.light,
  surfaceElevated: colors.surface.lightElevated,
  text: colors.text.light.primary,
  textSecondary: colors.text.light.secondary,
  textTertiary: colors.text.light.tertiary,
  textDisabled: colors.text.light.disabled,
  border: colors.border.light,
  borderHover: colors.border.lightHover,
  success: colors.success[500],
  error: colors.error[500],
  warning: colors.warning[500],
}

export const darkThemeColors = {
  primary: colors.primary[400],
  accent: colors.accent[400],
  background: colors.background.dark,
  backgroundAlt: colors.background.darkAlt,
  surface: colors.surface.dark,
  surfaceElevated: colors.surface.darkElevated,
  text: colors.text.dark.primary,
  textSecondary: colors.text.dark.secondary,
  textTertiary: colors.text.dark.tertiary,
  textDisabled: colors.text.dark.disabled,
  border: colors.border.dark,
  borderHover: colors.border.darkHover,
  success: colors.success[400],
  error: colors.error[400],
  warning: colors.warning[400],
}
