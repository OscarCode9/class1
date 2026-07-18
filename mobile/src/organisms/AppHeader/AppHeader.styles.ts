import { StyleSheet } from 'react-native';
import { spacing, typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.screen,
    paddingVertical: 10,
    gap: spacing.sm,
  },
  brand: {
    flex: 1,
    gap: 2,
    paddingTop: 2,
  },
  title: {
    ...typography.brand,
  },
  subtitle: {
    ...typography.bodySm,
  },
  email: {
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
