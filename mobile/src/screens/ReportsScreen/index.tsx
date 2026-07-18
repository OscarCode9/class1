import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { MainTemplate } from '@/templates/MainTemplate';
import { Text } from '@/atoms/Text';
import { useAppSelector } from '@/hooks/useAppStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { STATUS_LABELS } from '@/utils/status';
import type { TaskStatus } from '@/types/task.types';

export const ReportsScreen = () => {
  const c = useThemeColors();
  const items = useAppSelector((s) => s.tasks.items);
  const meta = useAppSelector((s) => s.tasks.meta);

  const counts = useMemo(() => {
    const base: Record<TaskStatus, number> = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    };
    items.forEach((t) => {
      base[t.status] += 1;
    });
    return base;
  }, [items]);

  const rows: { key: TaskStatus; color: string }[] = [
    { key: 'pending', color: c.onSurfaceVariant },
    { key: 'in_progress', color: c.primary },
    { key: 'completed', color: c.secondary },
    { key: 'cancelled', color: c.onSurfaceVariant },
  ];

  return (
    <MainTemplate>
      <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 16 }}>
        <Text variant="headlineSm" color={c.onSurface}>
          Reportes
        </Text>
        <Text variant="bodySm" color={c.onSurfaceVariant}>
          Contadores del snapshot actual de tareas (hasta 50). Total filtrado en
          servidor: {meta.total}.
        </Text>

        <View
          style={{
            backgroundColor: c.surface,
            borderRadius: 20,
            padding: 16,
            borderWidth: 1,
            borderColor: c.outlineSoft,
            gap: 14,
          }}
        >
          {rows.map(({ key, color }) => (
            <View
              key={key}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text variant="bodyMd" color={c.onSurface}>
                {STATUS_LABELS[key]}
              </Text>
              <Text variant="headlineSm" color={color}>
                {counts[key]}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </MainTemplate>
  );
};
