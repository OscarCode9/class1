import { StyleSheet } from 'react-native';
import { radii, shadows, spacing, typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  root: {
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: 12,
    marginBottom: 18,
    ...shadows.header,
  },
  sectionLabel: {
    ...typography.labelMd,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end',
  },
  sortRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
});
