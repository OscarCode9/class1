import { StyleSheet } from 'react-native';
import { radii, shadows, spacing, typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  root: {
    borderRadius: radii.lg,
    padding: 14,
    gap: 8,
    marginBottom: spacing.cardGap,
    overflow: 'hidden',
    ...shadows.card,
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  description: {
    ...typography.bodySm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  actionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
