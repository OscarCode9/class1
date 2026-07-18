import type { ReactNode } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/organisms/AppHeader';
import { useThemeColors } from '@/hooks/useThemeColors';
import { styles } from './MainTemplate.styles';

interface MainTemplateProps {
  children: ReactNode;
  showHeader?: boolean;
}

export const MainTemplate = ({
  children,
  showHeader = true,
}: MainTemplateProps) => {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={[c.background, c.backgroundMid, c.backgroundEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.root}
    >
      <View style={[styles.washTop, { backgroundColor: c.primaryLight }]} />
      <View style={[styles.washBottom, { backgroundColor: c.secondaryLight }]} />

      <View style={{ paddingTop: insets.top }}>
        {showHeader ? <AppHeader /> : null}
      </View>

      <View style={styles.body}>{children}</View>
    </LinearGradient>
  );
};
