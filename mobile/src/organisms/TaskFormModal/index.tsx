import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { Button } from '@/atoms/Button';
import { Text } from '@/atoms/Text';
import { FormField } from '@/molecules/FormField';
import { FilterSelect } from '@/molecules/FilterSelect';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { Task, TaskPriority } from '@/types/task.types';
import { fromInputDate, toInputDate } from '@/utils/dates';
import { styles } from './TaskFormModal.styles';

const PRIORITY_FORM_OPTIONS = [
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'critical', label: 'Crítica' },
];

interface TaskFormModalProps {
  visible: boolean;
  task: Task | null;
  loading?: boolean;
  onClose: () => void;
  onSave: (payload: {
    title: string;
    description: string;
    priority: TaskPriority;
    tags: string[];
    dueDate: string | null;
  }) => void;
}

export const TaskFormModal = ({
  visible,
  task,
  loading,
  onClose,
  onSave,
}: TaskFormModalProps) => {
  const c = useThemeColors();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [tags, setTags] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [titleError, setTitleError] = useState<string | undefined>();

  useEffect(() => {
    if (!visible) return;
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? '');
      setPriority(task.priority);
      setTags(task.tags.join(', '));
      setDueDate(toInputDate(task.dueDate));
    } else {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setTags('');
      setDueDate('');
    }
    setTitleError(undefined);
  }, [visible, task]);

  const handleSave = () => {
    if (!title.trim()) {
      setTitleError('El título es obligatorio.');
      return;
    }
    onSave({
      title: title.trim(),
      description: description.trim(),
      priority,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      dueDate: fromInputDate(dueDate),
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: c.surface }]}>
          <Text variant="headlineSm" color={c.onSurface} style={styles.title}>
            {task ? 'Editar Tarea' : 'Nueva Tarea'}
          </Text>

          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={{ gap: 14 }}>
              <FormField
                label="Título"
                value={title}
                onChangeText={setTitle}
                placeholder="Título de la tarea"
                errorText={titleError}
                borderColor={c.outline}
                focusColor={c.secondary}
                backgroundColor={c.mode === 'light' ? '#ffffff' : c.backgroundMid}
                textColor={c.onSurface}
                placeholderColor={c.onSurfaceVariant}
                labelColor={c.onSurface}
                errorColor={c.error}
              />
              <FormField
                label="Descripción"
                value={description}
                onChangeText={setDescription}
                placeholder="Descripción opcional"
                borderColor={c.outline}
                focusColor={c.secondary}
                backgroundColor={c.mode === 'light' ? '#ffffff' : c.backgroundMid}
                textColor={c.onSurface}
                placeholderColor={c.onSurfaceVariant}
                labelColor={c.onSurface}
                errorColor={c.error}
              />
              <FilterSelect
                label="Prioridad"
                value={priority}
                options={PRIORITY_FORM_OPTIONS}
                onChange={(v) => setPriority(v as TaskPriority)}
                borderColor={c.outline}
                backgroundColor={c.mode === 'light' ? '#ffffff' : c.backgroundMid}
                textColor={c.onSurface}
                captionColor={c.onSurfaceVariant}
                menuBackground={c.surface}
              />
              <FormField
                label="Etiquetas"
                value={tags}
                onChangeText={setTags}
                placeholder="Backend, Docs (separadas por coma)"
                borderColor={c.outline}
                focusColor={c.secondary}
                backgroundColor={c.mode === 'light' ? '#ffffff' : c.backgroundMid}
                textColor={c.onSurface}
                placeholderColor={c.onSurfaceVariant}
                labelColor={c.onSurface}
                errorColor={c.error}
              />
              <FormField
                label="Fecha de vencimiento"
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="YYYY-MM-DD"
                borderColor={c.outline}
                focusColor={c.secondary}
                backgroundColor={c.mode === 'light' ? '#ffffff' : c.backgroundMid}
                textColor={c.onSurface}
                placeholderColor={c.onSurfaceVariant}
                labelColor={c.onSurface}
                errorColor={c.error}
              />
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <View style={styles.actionFlex}>
              <Button
                label="Cancelar"
                onPress={onClose}
                variant="outline"
                size="toolbar"
                color={c.onSurfaceVariant}
                textColor={c.onSurfaceVariant}
              />
            </View>
            <View style={styles.actionFlex}>
              <Button
                label={task ? 'Guardar' : 'Crear'}
                onPress={handleSave}
                loading={loading}
                size="toolbar"
                color={c.primary}
                textColor={c.onPrimary}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
