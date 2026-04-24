export const BRAND = {
  name: 'VoiceClaw',
  colors: {
    light: {
      paper: '#F1E8DA',
      paperStrong: '#E8DDCD',
      panel: '#FDF9F1',
      panelStrong: '#FFFFFF',
      ink: '#191511',
      muted: '#665F58',
      accent: '#B4492F',
      accentHover: '#963A25',
      sage: '#697668',
      line: 'rgba(25, 21, 17, 0.1)',
      lineStrong: 'rgba(25, 21, 17, 0.2)',
      destructive: '#EF4444',
    },
    dark: {
      paper: '#171310',
      paperStrong: '#211B16',
      panel: '#211B16',
      panelStrong: '#2C251F',
      ink: '#F5EADC',
      muted: '#B9AA98',
      accent: '#D86A4D',
      accentHover: '#EF8668',
      sage: '#9CAC99',
      line: 'rgba(245, 234, 220, 0.1)',
      lineStrong: 'rgba(245, 234, 220, 0.2)',
      destructive: '#F87171',
    },
  },
  typography: {
    fontFamily: 'System',
    weights: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
    },
  },
  icon: {
    size: 1024,
    cornerRadius: 0,
    backgroundColor: '#171310',
  },
} as const

export type BrandPalette = typeof BRAND.colors.light
