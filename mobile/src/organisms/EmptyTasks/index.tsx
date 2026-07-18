import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/atoms/Button';
import { Text } from '@/atoms/Text';
import { useThemeColors } from '@/hooks/useThemeColors';
import { styles } from './EmptyTasks.styles';

interface EmptyTasksProps {
  onCreate: () => void;
}

export const EmptyTasks = ({ onCreate }: EmptyTasksProps) => {
  const c = useThemeColors();

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: c.outlineSoft,
        },
      ]}
    >
      <Text variant="bodyMd" color={c.onSurfaceVariant} style={styles.text}>
        No hay tareas con estos filtros. Crea una nueva para empezar.
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
