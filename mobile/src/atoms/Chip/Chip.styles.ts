import { StyleSheet } from 'react-native';
import { radii, spacing, typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  label: {
    ...typography.chip,
  },
});
