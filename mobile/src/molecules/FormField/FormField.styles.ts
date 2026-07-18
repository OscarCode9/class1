import { StyleSheet } from 'react-native';
import { spacing, typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  root: {
    gap: spacing.sm,
  },
  label: {
    ...typography.labelLg,
  },
  error: {
    ...typography.bodySm,
  },
});
