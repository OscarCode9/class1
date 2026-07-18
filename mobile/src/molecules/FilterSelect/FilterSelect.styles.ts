import { StyleSheet } from 'react-native';
import { radii, spacing, typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: 6,
  },
  caption: {
    ...typography.labelMd,
  },
  control: {
    minHeight: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: {
    ...typography.bodySm,
    flex: 1,
  },
  menu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    borderRadius: radii.md,
    borderWidth: 1,
    zIndex: 20,
    elevation: 6,
    overflow: 'hidden',
  },
  option: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  optionText: {
    ...typography.bodySm,
  },
});
