import { StyleSheet } from 'react-native';
import { spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  washTop: {
    position: 'absolute',
    top: -80,
    left: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.55,
  },
  washBottom: {
    position: 'absolute',
    bottom: -40,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.35,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.lg,
  },
  themeToggle: {
    position: 'absolute',
    top: 8,
    right: 12,
    zIndex: 10,
  },
  brand: {
    marginBottom: spacing.lg,
    gap: 4,
  },
});
