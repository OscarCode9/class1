import { View } from 'react-native';
import { MainTemplate } from '@/templates/MainTemplate';
import { Button } from '@/atoms/Button';
import { Text } from '@/atoms/Text';
import { useAppHeader } from '@/hooks/useAppHeader';
import { useThemeColors } from '@/hooks/useThemeColors';

export const ProfileScreen = () => {
  const c = useThemeColors();
  const { user, onLogout, onToggleTheme, mode } = useAppHeader();

  return (
    <MainTemplate>
      <View style={{ gap: 16 }}>
        <Text variant="headlineSm" color={c.onSurface}>
          Perfil
        </Text>

        <View
          style={{
            backgroundColor: c.surface,
            borderRadius: 20,
            padding: 16,
            borderWidth: 1,
            borderColor: c.outlineSoft,
            gap: 8,
          }}
        >
          <Text variant="labelLg" color={c.onSurfaceVariant}>
            Nombre
          </Text>
          <Text variant="bodyLg" color={c.onSurface}>
            {user?.name ?? '—'}
          </Text>

          <Text variant="labelLg" color={c.onSurfaceVariant} style={{ marginTop: 8 }}>
            Email
          </Text>
          <Text variant="bodyLg" color={c.onSurface}>
            {user?.email ?? '—'}
          </Text>
        </View>

        <Button
          label={mode === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
          onPress={onToggleTheme}
          variant="outline"
          color={c.secondary}
          textColor={c.secondary}
        />

        <Button
          label="Cerrar Sesión"
          onPress={onLogout}
          color={c.primary}
          textColor={c.onPrimary}
        />
      </View>
    </MainTemplate>
  );
};
