import { StyleSheet } from 'react-native';
import { radii, spacing, typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  root: {
    minHeight: spacing.inputMinHeight,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    ...typography.bodyMd,
  },
  focused: {
    borderWidth: 2,
  },
});
