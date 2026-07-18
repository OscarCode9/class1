import { ActivityIndicator, Pressable, Text } from 'react-native';
import { styles } from './Button.styles';

interface ButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'auth' | 'toolbar';
  color?: string;
  textColor?: string;
  leftIcon?: React.ReactNode;
}

export const Button = ({
  label,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  size = 'auth',
  color,
  textColor,
  leftIcon,
}: ButtonProps) => {
  const isPrimary = variant === 'primary';
  const sizeStyle = size === 'toolbar' ? styles.toolbar : styles.primary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.root,
        sizeStyle,
        isPrimary && color ? { backgroundColor: color } : null,
        variant === 'outline' && styles.outline,
        variant === 'outline' && color ? { borderColor: color } : null,
        variant === 'ghost' && styles.ghost,
        (disabled || loading) && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor ?? '#fff'} />
      ) : (
        <>
          {leftIcon}
          <Text
            style={[
              styles.label,
              size === 'toolbar' && styles.labelSm,
              { color: textColor ?? (isPrimary ? '#ffffff' : color) },
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
};
