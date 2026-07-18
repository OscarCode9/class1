import { View, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './SearchField.styles';

interface SearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  borderColor: string;
  backgroundColor: string;
  textColor: string;
  placeholderColor: string;
  iconColor: string;
}

export const SearchField = ({
  value,
  onChangeText,
  placeholder = 'Buscar tarea...',
  borderColor,
  backgroundColor,
  textColor,
  placeholderColor,
  iconColor,
}: SearchFieldProps) => (
  <View style={[styles.root, { borderColor, backgroundColor }]}>
    <Ionicons name="search" size={18} color={iconColor} />
    <TextInput
      style={[styles.input, { color: textColor }]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={placeholderColor}
      autoCapitalize="none"
      returnKeyType="search"
    />
  </View>
);
