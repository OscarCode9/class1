import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './Badge.styles';

interface BadgeProps {
  label: string;
  backgroundColor: string;
  textColor: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const Badge = ({ label, backgroundColor, textColor, icon }: BadgeProps) => (
  <View style={[styles.root, { backgroundColor }]}>
    {icon ? <Ionicons name={icon} size={12} color={textColor} /> : null}
    <Text style={[styles.label, { color: textColor }]}>{label}</Text>
  </View>
);
