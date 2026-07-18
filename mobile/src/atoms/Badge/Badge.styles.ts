import { StyleSheet } from 'react-native';
import { radii, spacing, typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  label: {
    ...typography.chip,
  },
});
