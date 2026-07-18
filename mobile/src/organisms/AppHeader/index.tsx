import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/atoms/Button';
import { IconButton } from '@/atoms/IconButton';
import { Text } from '@/atoms/Text';
import { useAppHeader } from '@/hooks/useAppHeader';
import { useThemeColors } from '@/hooks/useThemeColors';
import { styles } from './AppHeader.styles';

export const AppHeader = () => {
  const c = useThemeColors();
  const { user, mode, onToggleTheme, onLogout } = useAppHeader();

  return (
    <View style={styles.root}>
      <IconButton name="menu" color={c.secondary} onPress={() => undefined} />

      <View style={styles.brand}>
        <Text variant="brand" color={c.secondary} style={styles.title}>
          Task Manager
        </Text>
        <Text variant="bodySm" color={c.onSurfaceVariant} style={styles.subtitle}>
          Conectado como: {user?.name ?? '—'}
        </Text>
        <Text color={c.onSurfaceVariant} style={styles.email}>
          ({user?.email ?? '—'})
        </Text>
      </View>

      <View style={styles.actions}>
        <IconButton
          name={mode === 'light' ? 'moon' : 'sunny'}
          color={c.primary}
          onPress={onToggleTheme}
        />
        <Button
          label="Cerrar Sesión"
          onPress={onLogout}
          variant="outline"
          size="toolbar"
          color={c.primary}
          textColor={c.primary}
          leftIcon={
            <Ionicons name="log-out-outline" size={16} color={c.primary} />
          }
        />
      </View>
    </View>
  );
};
