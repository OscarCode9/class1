import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { MainTemplate } from '@/templates/MainTemplate';
import { Text } from '@/atoms/Text';
import { Chip } from '@/atoms/Chip';
import { useAppSelector } from '@/hooks/useAppStore';
import { useThemeColors } from '@/hooks/useThemeColors';

export const TagsScreen = () => {
  const c = useThemeColors();
  const items = useAppSelector((s) => s.tasks.items);

  const tags = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((task) => {
      task.tags.forEach((tag) => {
        map.set(tag, (map.get(tag) ?? 0) + 1);
      });
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [items]);

  return (
    <MainTemplate>
      <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 16 }}>
        <Text variant="headlineSm" color={c.onSurface}>
          Etiquetas
        </Text>
        <Text variant="bodySm" color={c.onSurfaceVariant}>
          Resumen a partir de las tareas cargadas en esta sesión (snapshot
          local).
        </Text>

        <View
          style={{
            backgroundColor: c.surface,
            borderRadius: 20,
            padding: 16,
            borderWidth: 1,
            borderColor: c.outlineSoft,
            gap: 12,
          }}
        >
          {tags.length === 0 ? (
            <Text variant="bodyMd" color={c.onSurfaceVariant}>
              Aún no hay etiquetas en tus tareas.
            </Text>
          ) : (
            tags.map(([tag, count]) => (
              <View
                key={tag}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Chip
                  label={tag}
                  borderColor={c.outline}
                  textColor={c.onSurface}
                />
                <Text variant="labelLg" color={c.secondary}>
                  {count}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </MainTemplate>
  );
};
