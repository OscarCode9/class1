import { StyleSheet } from 'react-native';
import { spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  washTop: {
    position: 'absolute',
    top: -100,
    left: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    opacity: 0.4,
  },
  washBottom: {
    position: 'absolute',
    bottom: 80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.25,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.screen,
  },
});
