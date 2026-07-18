import { StyleSheet } from 'react-native';
import { radii, spacing, typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  root: {
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  text: {
    ...typography.bodyMd,
    textAlign: 'center',
  },
});
