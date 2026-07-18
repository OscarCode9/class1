import { StyleSheet } from 'react-native';
import { spacing, typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  listContent: {
    paddingBottom: spacing.xl,
  },
  banner: {
    marginBottom: spacing.sm,
    ...typography.bodySm,
  },
  error: {
    marginBottom: spacing.sm,
    ...typography.bodySm,
  },
  footerLoader: {
    paddingVertical: spacing.md,
  },
});
