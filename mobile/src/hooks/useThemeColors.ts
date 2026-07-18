import { colors, type ThemeColors } from '@/constants/theme';
import { useAppSelector } from '@/hooks/useAppStore';

export const useThemeColors = (): ThemeColors & { mode: 'light' | 'dark' } => {
  const mode = useAppSelector((s) => s.theme.mode);
  return { ...colors[mode], mode };
};
