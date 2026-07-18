import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './IconButton.styles';

interface IconButtonProps {
  name: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  color?: string;
  size?: number;
  disabled?: boolean;
  compact?: boolean;
  backgroundColor?: string;
}

export const IconButton = ({
  name,
  onPress,
  color = '#23160f',
  size = 22,
  disabled,
  compact,
  backgroundColor,
}: IconButtonProps) => (
  <Pressable
    onPress={onPress}
    disabled={disabled || !onPress}
    hitSlop={8}
    style={[
      styles.root,
      compact && styles.sm,
      backgroundColor ? { backgroundColor } : null,
      disabled && styles.disabled,
    ]}
  >
    <Ionicons name={name} size={size} color={color} />
  </Pressable>
);
