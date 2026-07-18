import { Pressable, View } from 'react-native';
import { Button } from '@/atoms/Button';
import { Text } from '@/atoms/Text';
import { FormField } from '@/molecules/FormField';
import { useRegister } from '@/hooks/useRegister';
import { useThemeColors } from '@/hooks/useThemeColors';
import { styles } from './RegisterForm.styles';

export const RegisterForm = () => {
  const c = useThemeColors();
  const {
    name,
    email,
    password,
    setName,
    setEmail,
    setPassword,
    submit,
    goToLogin,
    isLoading,
    error,
    fieldErrors,
  } = useRegister();

  return (
    <View style={[styles.root, { backgroundColor: c.surfaceGlass }]}>
      <Text variant="headlineMd" color={c.onSurface} style={styles.headline}>
        Crear cuenta
      </Text>
      <Text variant="bodySm" color={c.onSurfaceVariant} style={styles.support}>
        Regístrate para gestionar tus tareas desde el móvil.
      </Text>

      <FormField
        label="Nombre"
        value={name}
        onChangeText={setName}
        placeholder="Tu nombre"
        autoCapitalize="words"
        errorText={fieldErrors.name}
        borderColor={c.outline}
        focusColor={c.secondary}
        backgroundColor={c.surface}
        textColor={c.onSurface}
        placeholderColor={c.onSurfaceVariant}
        labelColor={c.onSurface}
        errorColor={c.error}
      />
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
        placeholder="Mínimo 8 caracteres"
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
        label="Registrarse"
        onPress={submit}
        loading={isLoading}
        color={c.primary}
        textColor={c.onPrimary}
      />

      <View style={styles.footer}>
        <Text variant="bodySm" color={c.onSurfaceVariant}>
          ¿Ya tienes cuenta?
        </Text>
        <Pressable onPress={goToLogin}>
          <Text variant="bodySm" color={c.primary} style={styles.link}>
            Iniciar Sesión
          </Text>
        </Pressable>
      </View>
    </View>
  );
};
