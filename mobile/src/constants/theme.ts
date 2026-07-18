export const colors = {
  light: {
    primary: '#c75c2a',
    primaryDark: '#923d18',
    primaryLight: '#f1b38b',
    secondary: '#124c5a',
    secondaryDark: '#0b333d',
    secondaryLight: '#7fb5be',
    background: '#f5efe6',
    backgroundMid: '#f1e2d3',
    backgroundEnd: '#fff8f0',
    surface: '#fffaf4',
    surfaceGlass: 'rgba(255, 250, 244, 0.82)',
    surfaceMuted: 'rgba(255, 255, 255, 0.7)',
    onSurface: '#23160f',
    onSurfaceVariant: '#5f4a3d',
    outline: 'rgba(35, 22, 15, 0.12)',
    outlineSoft: 'rgba(18, 76, 90, 0.1)',
    outlineHeader: 'rgba(18, 76, 90, 0.08)',
    error: '#ba1a1a',
    onPrimary: '#ffffff',
    onError: '#ffffff',
    shadow: 'rgb(35, 22, 15)',
    tabActiveBg: 'rgba(241, 179, 139, 0.45)',
    pendingBg: 'rgba(35, 22, 15, 0.08)',
    cancelledBg: 'rgba(0, 0, 0, 0.08)',
  },
  dark: {
    primary: '#e28657',
    primaryDark: '#c75c2a',
    primaryLight: '#fcd8c4',
    secondary: '#7fb5be',
    secondaryDark: '#124c5a',
    secondaryLight: '#afdbe2',
    background: '#121212',
    backgroundMid: '#1c1c1c',
    backgroundEnd: '#242424',
    surface: '#1e1e1e',
    surfaceGlass: 'rgba(30, 30, 30, 0.8)',
    surfaceMuted: 'rgba(40, 40, 40, 0.7)',
    onSurface: '#f5efe6',
    onSurfaceVariant: '#a89b93',
    outline: 'rgba(255, 255, 255, 0.08)',
    outlineSoft: 'rgba(255, 255, 255, 0.08)',
    outlineHeader: 'rgba(255, 255, 255, 0.08)',
    error: '#ba1a1a',
    onPrimary: '#ffffff',
    onError: '#ffffff',
    shadow: 'rgb(0, 0, 0)',
    tabActiveBg: 'rgba(226, 134, 87, 0.25)',
    pendingBg: 'rgba(255, 255, 255, 0.08)',
    cancelledBg: 'rgba(255, 255, 255, 0.08)',
  },
} as const;

export type ColorScheme = keyof typeof colors;
export type ThemeColors = {
  [K in keyof (typeof colors)['light']]: string;
};

export const radii = {
  sm: 12,
  md: 18,
  lg: 20,
  xl: 24,
  card: 28,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  screen: 16,
  buttonMinHeight: 56,
  buttonToolbarHeight: 42,
  inputMinHeight: 52,
  searchMinHeight: 46,
  tabBarHeight: 64,
  cardGap: 12,
} as const;

export const typography = {
  display: {
    fontSize: 36,
    fontWeight: '800' as const,
    letterSpacing: -1.2,
  },
  headlineLg: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.8,
  },
  headlineMd: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
  },
  headlineSm: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  brand: {
    fontSize: 20,
    fontWeight: '800' as const,
  },
  bodyLg: {
    fontSize: 17,
    fontWeight: '400' as const,
  },
  bodyMd: {
    fontSize: 16,
    fontWeight: '400' as const,
  },
  bodySm: {
    fontSize: 14,
    fontWeight: '400' as const,
  },
  labelLg: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  labelMd: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  button: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  chip: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  tab: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
} as const;

export const shadows = {
  card: {
    shadowColor: '#23160f',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 3,
  },
  header: {
    shadowColor: '#23160f',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 30,
    elevation: 2,
  },
  button: {
    shadowColor: '#c75c2a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 4,
  },
  authCard: {
    shadowColor: '#23160f',
    shadowOffset: { width: 0, height: 30 },
    shadowOpacity: 0.12,
    shadowRadius: 80,
    elevation: 8,
  },
  tabBar: {
    shadowColor: '#23160f',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;
