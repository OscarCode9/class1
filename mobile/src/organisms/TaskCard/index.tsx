import { View } from 'react-native';
import { Badge } from '@/atoms/Badge';
import { Chip } from '@/atoms/Chip';
import { IconButton } from '@/atoms/IconButton';
import { Text } from '@/atoms/Text';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { Task, TaskStatus } from '@/types/task.types';
import { formatDueDate } from '@/utils/dates';
import { ENABLED_STATUS_ACTIONS, PRIORITY_LABELS, STATUS_LABELS } from '@/utils/status';
import { styles } from './TaskCard.styles';

interface TaskCardProps {
  task: Task;
  onStatusChange: (task: Task, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

function statusBadgeStyle(
  status: TaskStatus,
  c: ReturnType<typeof useThemeColors>,
) {
  switch (status) {
    case 'in_progress':
      return {
        backgroundColor: c.primary,
        textColor: c.onPrimary,
        icon: 'play' as const,
      };
    case 'completed':
      return {
        backgroundColor: c.secondary,
        textColor: c.onPrimary,
        icon: 'checkmark' as const,
      };
    case 'cancelled':
      return {
        backgroundColor: c.cancelledBg,
        textColor: c.onSurfaceVariant,
        icon: 'close' as const,
      };
    default:
      return {
        backgroundColor: c.pendingBg,
        textColor: c.onSurfaceVariant,
        icon: 'time-outline' as const,
      };
  }
}

function priorityColors(
  priority: Task['priority'],
  c: ReturnType<typeof useThemeColors>,
) {
  if (priority === 'critical') {
    return { borderColor: c.error, textColor: c.error };
  }
  if (priority === 'high') {
    return { borderColor: c.primary, textColor: c.primary };
  }
  return { borderColor: c.outline, textColor: c.onSurfaceVariant };
}

export const TaskCard = ({
  task,
  onStatusChange,
  onEdit,
  onDelete,
}: TaskCardProps) => {
  const c = useThemeColors();
  const actions = ENABLED_STATUS_ACTIONS[task.status];
  const badge = statusBadgeStyle(task.status, c);
  const prio = priorityColors(task.priority, c);
  const due = formatDueDate(task.dueDate);

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
      {task.status === 'in_progress' ? (
        <View style={[styles.accent, { backgroundColor: c.primary }]} />
      ) : null}

      <View style={styles.header}>
        <Text color={c.onSurface} style={styles.title} numberOfLines={2}>
          {task.title}
        </Text>
        <Badge
          label={STATUS_LABELS[task.status]}
          backgroundColor={badge.backgroundColor}
          textColor={badge.textColor}
          icon={badge.icon}
        />
      </View>

      {task.description ? (
        <Text
          variant="bodySm"
          color={c.onSurfaceVariant}
          style={styles.description}
          numberOfLines={2}
        >
          {task.description}
        </Text>
      ) : null}

      <View style={styles.chips}>
        <Chip
          label={`Prioridad ${PRIORITY_LABELS[task.priority]}`}
          borderColor={prio.borderColor}
          textColor={prio.textColor}
        />
        {due ? (
          <Chip
            label={`Vence: ${due}`}
            borderColor={c.outline}
            textColor={c.onSurfaceVariant}
            icon="calendar-outline"
          />
        ) : null}
        {task.tags.map((tag) => (
          <Chip
            key={tag}
            label={tag}
            borderColor={c.outline}
            textColor={c.onSurfaceVariant}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <View style={styles.actionsLeft}>
          <IconButton
            name="person-outline"
            color={c.onSurfaceVariant}
            size={18}
            compact
            disabled
          />
          <IconButton
            name="play"
            color={c.primary}
            size={18}
            compact
            disabled={!actions.play}
            onPress={
              actions.play
                ? () => onStatusChange(task, 'in_progress')
                : undefined
            }
          />
          <IconButton
            name="checkmark"
            color={c.secondary}
            size={18}
            compact
            disabled={!actions.complete}
            onPress={
              actions.complete
                ? () => onStatusChange(task, 'completed')
                : undefined
            }
          />
          <IconButton
            name="close"
            color={c.onSurfaceVariant}
            size={18}
            compact
            disabled={!actions.cancel}
            onPress={
              actions.cancel
                ? () => onStatusChange(task, 'cancelled')
                : undefined
            }
          />
        </View>

        <View style={styles.actionsRight}>
          <IconButton
            name="create-outline"
            color={c.secondary}
            size={18}
            compact
            onPress={() => onEdit(task)}
          />
          <IconButton
            name="trash-outline"
            color={c.error}
            size={18}
            compact
            onPress={() => onDelete(task)}
          />
        </View>
      </View>
    </View>
  );
};
