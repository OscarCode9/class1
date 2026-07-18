import { Pressable, View } from 'react-native';
import { Button } from '@/atoms/Button';
import { Text } from '@/atoms/Text';
import { FormField } from '@/molecules/FormField';
import { useLogin } from '@/hooks/useLogin';
import { useThemeColors } from '@/hooks/useThemeColors';
import { styles } from './LoginForm.styles';

export const LoginForm = () => {
  const c = useThemeColors();
  const {
    email,
    password,
    setEmail,
    setPassword,
    submit,
    goToRegister,
    isLoading,
    error,
    fieldErrors,
  } = useLogin();

  return (
    <View style={[styles.root, { backgroundColor: c.surfaceGlass }]}>
      <Text variant="headlineMd" color={c.onSurface} style={styles.headline}>
        Inicia Sesión
      </Text>
      <Text variant="bodySm" color={c.onSurfaceVariant} style={styles.support}>
        Ingresa tus credenciales para acceder al sistema de gestión de tareas.
      </Text>

      <FormField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="tu@email.com"
        autoCapitalize="none"
        keyboardType="email-address"
        errorText={fieldErrors.email}
        borderColor={c.outline}
        focusColor={c.secondary}
        backgroundColor={c.surface}
        textColor={c.onSurface}
        placeholderColor={c.onSurfaceVariant}
        labelColor={c.onSurface}
        errorColor={c.error}
      />
      <FormField
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry
        errorText={fieldErrors.password}
        borderColor={c.outline}
        focusColor={c.secondary}
        backgroundColor={c.surface}
        textColor={c.onSurface}
        placeholderColor={c.onSurfaceVariant}
        labelColor={c.onSurface}
        errorColor={c.error}
      />

      {error ? (
        <View style={[styles.alert, { backgroundColor: 'rgba(186, 26, 26, 0.1)' }]}>
          <Text variant="bodySm" color={c.error}>
            {error}
          </Text>
        </View>
      ) : null}

      <Button
        label="Iniciar Sesión"
        onPress={submit}
        loading={isLoading}
        color={c.primary}
        textColor={c.onPrimary}
      />

      <View style={styles.footer}>
        <Text variant="bodySm" color={c.onSurfaceVariant}>
          ¿No tienes una cuenta?
        </Text>
        <Pressable onPress={goToRegister}>
          <Text variant="bodySm" color={c.primary} style={styles.link}>
            Registrarse
          </Text>
        </Pressable>
      </View>
    </View>
  );
};
