import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './Chip.styles';

interface ChipProps {
  label: string;
  borderColor: string;
  textColor: string;
  icon?: keyof typeof Ionicons.glyphMap;
  backgroundColor?: string;
}

export const Chip = ({
  label,
  borderColor,
  textColor,
  icon,
  backgroundColor = 'transparent',
}: ChipProps) => (
  <View style={[styles.root, { borderColor, backgroundColor }]}>
    {icon ? <Ionicons name={icon} size={12} color={textColor} /> : null}
    <Text style={[styles.label, { color: textColor }]}>{label}</Text>
  </View>
);
