import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from '@/atoms/IconButton';
import { Text } from '@/atoms/Text';
import { useAppDispatch, useAppSelector } from '@/hooks/useAppStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { toggleTheme } from '@/store/slices/themeSlice';
import { styles } from './AuthTemplate.styles';

interface AuthTemplateProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export const AuthTemplate = ({
  children,
  title = 'Task Manager',
  subtitle = 'Organiza tus tareas con calma.',
}: AuthTemplateProps) => {
  const c = useThemeColors();
  const mode = useAppSelector((s) => s.theme.mode);
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={[c.background, c.backgroundMid, c.backgroundEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.root}
    >
      <View
        style={[
          styles.washTop,
          { backgroundColor: c.primaryLight },
        ]}
      />
      <View
        style={[
          styles.washBottom,
          { backgroundColor: c.secondaryLight },
        ]}
      />

      <View style={[styles.themeToggle, { top: insets.top + 4 }]}>
        <IconButton
          name={mode === 'light' ? 'moon' : 'sunny'}
          color={c.primary}
          backgroundColor={c.surfaceGlass}
          onPress={() => dispatch(toggleTheme())}
        />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <Text variant="headlineLg" color={c.secondary}>
              {title}
            </Text>
            <Text variant="bodyMd" color={c.onSurfaceVariant}>
              {subtitle}
            </Text>
          </View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};
