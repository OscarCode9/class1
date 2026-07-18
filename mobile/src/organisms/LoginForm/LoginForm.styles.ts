import { StyleSheet } from 'react-native';
import { radii, shadows, spacing, typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  root: {
    borderRadius: radii.card,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.authCard,
  },
  headline: {
    ...typography.headlineMd,
  },
  support: {
    ...typography.bodySm,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: spacing.sm,
  },
  link: {
    fontWeight: '700',
  },
  alert: {
    borderRadius: radii.md,
    padding: spacing.md,
  },
});
