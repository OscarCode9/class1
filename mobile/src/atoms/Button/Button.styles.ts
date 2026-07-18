import { StyleSheet } from 'react-native';
import { radii, spacing, typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  root: {
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  primary: {
    minHeight: spacing.buttonMinHeight,
  },
  toolbar: {
    minHeight: spacing.buttonToolbarHeight,
    paddingHorizontal: spacing.md,
  },
  outline: {
    minHeight: 38,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  ghost: {
    minHeight: 40,
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.sm,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    ...typography.button,
    textTransform: 'none',
  },
  labelSm: {
    fontSize: 14,
    fontWeight: '700',
  },
});
