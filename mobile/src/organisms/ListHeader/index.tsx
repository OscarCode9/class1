import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/atoms/Button';
import { Text } from '@/atoms/Text';
import { useThemeColors } from '@/hooks/useThemeColors';
import { styles } from './ListHeader.styles';

interface ListHeaderProps {
  count: number;
  onCreate: () => void;
}

export const ListHeader = ({ count, onCreate }: ListHeaderProps) => {
  const c = useThemeColors();

  return (
    <View style={styles.root}>
      <Text variant="headlineSm" color={c.onSurface} style={styles.title}>
        Tareas ({count})
      </Text>
      <Button
        label="Nueva Tarea"
        onPress={onCreate}
        size="toolbar"
        color={c.primary}
        textColor={c.onPrimary}
        leftIcon={<Ionicons name="add" size={18} color={c.onPrimary} />}
      />
    </View>
  );
};
