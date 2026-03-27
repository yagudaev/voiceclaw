// VoiceClaw Brand Identity
// A voice AI assistant — modern, clean, techy with a nod to OpenClaw heritage

export const BRAND = {
  name: 'VoiceClaw',

  // Primary palette — deep purple to electric blue gradient
  colors: {
    // Primary: deep indigo-purple — the core brand color
    primary: '#6C3CE0',
    primaryLight: '#8B5CF6',
    primaryDark: '#4C1D95',

    // Accent: electric cyan-blue — energy and tech feel
    accent: '#22D3EE',
    accentLight: '#67E8F9',
    accentDark: '#0891B2',

    // Background tones
    backgroundDark: '#0F0B1E',
    backgroundMid: '#1A1333',
    backgroundLight: '#FFFFFF',

    // Foreground / text
    foregroundLight: '#F8FAFC',
    foregroundDark: '#0F172A',
    foregroundMuted: '#94A3B8',

    // Status colors
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',

    // Gradient stops (for icon and branding materials)
    gradientStart: '#6C3CE0',  // deep purple
    gradientMid: '#7C3AED',    // vibrant purple
    gradientEnd: '#22D3EE',    // electric cyan
  },

  // Typography guidance
  typography: {
    fontFamily: 'System', // uses platform default (SF Pro on iOS, Roboto on Android)
    weights: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
    },
  },

  // Icon metadata
  icon: {
    size: 1024,
    cornerRadius: 0, // iOS applies its own mask; Android uses adaptive icon
    backgroundColor: '#0F0B1E',
  },
} as const

export type BrandColors = typeof BRAND.colors
