import { StyleSheet } from 'react-native';
import { spacing, typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: spacing.sm,
  },
  title: {
    ...typography.headlineSm,
    flex: 1,
  },
});
