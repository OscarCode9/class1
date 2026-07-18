import { StyleSheet } from 'react-native';
import { radii, spacing, typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: spacing.searchMinHeight,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.bodyMd,
    paddingVertical: spacing.sm,
  },
});
