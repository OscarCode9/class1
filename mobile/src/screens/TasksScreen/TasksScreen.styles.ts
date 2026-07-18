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
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#23160f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
});
