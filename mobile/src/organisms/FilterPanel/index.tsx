import { View } from 'react-native';
import { Text } from '@/atoms/Text';
import { SearchField } from '@/molecules/SearchField';
import { FilterSelect } from '@/molecules/FilterSelect';
import { SortDirection } from '@/molecules/SortDirection';
import { useThemeColors } from '@/hooks/useThemeColors';
import {
  PRIORITY_OPTIONS,
  SORT_OPTIONS,
  STATUS_OPTIONS,
} from '@/utils/status';
import type { TaskFilters } from '@/types/task.types';
import { styles } from './FilterPanel.styles';

interface FilterPanelProps {
  filters: TaskFilters;
  tagOptions: { value: string; label: string }[];
  onChange: (partial: Partial<TaskFilters>) => void;
  onToggleSortOrder: () => void;
}

export const FilterPanel = ({
  filters,
  tagOptions,
  onChange,
  onToggleSortOrder,
}: FilterPanelProps) => {
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
      <Text variant="labelMd" color={c.onSurfaceVariant} style={styles.sectionLabel}>
        Buscar por título/desc...
      </Text>

      <SearchField
        value={filters.search}
        onChangeText={(search) => onChange({ search })}
        borderColor={c.outline}
        backgroundColor={c.mode === 'light' ? '#ffffff' : c.backgroundMid}
        textColor={c.onSurface}
        placeholderColor={c.onSurfaceVariant}
        iconColor={c.onSurfaceVariant}
      />

      <View style={styles.row}>
        <FilterSelect
          label="Filtrar por etiqueta"
          value={filters.tag}
          options={tagOptions}
          onChange={(tag) => onChange({ tag })}
          borderColor={c.outline}
          backgroundColor={c.mode === 'light' ? '#ffffff' : c.backgroundMid}
          textColor={c.onSurface}
          captionColor={c.onSurfaceVariant}
          menuBackground={c.surface}
        />
        <FilterSelect
          label="Estado"
          value={filters.status}
          options={STATUS_OPTIONS}
          onChange={(status) => onChange({ status })}
          borderColor={c.outline}
          backgroundColor={c.mode === 'light' ? '#ffffff' : c.backgroundMid}
          textColor={c.onSurface}
          captionColor={c.onSurfaceVariant}
          menuBackground={c.surface}
        />
      </View>

      <View style={styles.row}>
        <FilterSelect
          label="Prioridad"
          value={filters.priority}
          options={PRIORITY_OPTIONS}
          onChange={(priority) => onChange({ priority })}
          borderColor={c.outline}
          backgroundColor={c.mode === 'light' ? '#ffffff' : c.backgroundMid}
          textColor={c.onSurface}
          captionColor={c.onSurfaceVariant}
          menuBackground={c.surface}
        />
        <View style={styles.sortRow}>
          <FilterSelect
            label="Ordenar por"
            value={filters.sortBy}
            options={SORT_OPTIONS}
            onChange={(sortBy) => onChange({ sortBy })}
            borderColor={c.outline}
            backgroundColor={c.mode === 'light' ? '#ffffff' : c.backgroundMid}
            textColor={c.onSurface}
            captionColor={c.onSurfaceVariant}
            menuBackground={c.surface}
          />
          <SortDirection
            value={filters.sortOrder}
            onToggle={onToggleSortOrder}
            color={c.primary}
          />
        </View>
      </View>
    </View>
  );
};
