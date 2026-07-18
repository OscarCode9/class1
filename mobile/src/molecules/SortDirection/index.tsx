import { Pressable, Text, View } from 'react-native';
import { styles } from './SortDirection.styles';

interface SortDirectionProps {
  value: 'asc' | 'desc';
  onToggle: () => void;
  color: string;
}

export const SortDirection = ({ value, onToggle, color }: SortDirectionProps) => (
  <View style={styles.root}>
    <Pressable onPress={onToggle} hitSlop={8}>
      <Text style={[styles.label, { color }]}>
        {value === 'desc' ? 'DESC' : 'ASC'}
      </Text>
    </Pressable>
  </View>
);
