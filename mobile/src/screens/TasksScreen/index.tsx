import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MainTemplate } from '@/templates/MainTemplate';
import { FilterPanel } from '@/organisms/FilterPanel';
import { ListHeader } from '@/organisms/ListHeader';
import { TaskCard } from '@/organisms/TaskCard';
import { TaskFormModal } from '@/organisms/TaskFormModal';
import { EmptyTasks } from '@/organisms/EmptyTasks';
import { useTasks } from '@/hooks/useTasks';
import { useThemeColors } from '@/hooks/useThemeColors';
import { styles } from './TasksScreen.styles';

export const TasksScreen = () => {
  const c = useThemeColors();
  const {
    items,
    meta,
    filters,
    loading,
    mutating,
    error,
    formOpen,
    editingTask,
    tagOptions,
    refresh,
    updateFilter,
    toggleSortOrder,
    openCreate,
    openEdit,
    closeForm,
    saveTask,
    changeStatus,
    confirmDelete,
  } = useTasks();

  return (
    <MainTemplate>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={loading && items.length > 0}
            onRefresh={refresh}
            tintColor={c.primary}
          />
        }
        ListHeaderComponent={
          <View>
            <FilterPanel
              filters={filters}
              tagOptions={tagOptions}
              onChange={updateFilter}
              onToggleSortOrder={toggleSortOrder}
            />
            <ListHeader count={meta.total} onCreate={openCreate} />
            {error ? (
              <Text style={[styles.error, { color: c.error }]}>{error}</Text>
            ) : null}
            {meta.total > 50 ? (
              <Text style={[styles.banner, { color: c.onSurfaceVariant }]}>
                Mostrando 50 de {meta.total}
              </Text>
            ) : null}
            {loading && items.length === 0 ? (
              <ActivityIndicator color={c.primary} style={styles.footerLoader} />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !loading ? <EmptyTasks onCreate={openCreate} /> : null
        }
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onStatusChange={changeStatus}
            onEdit={openEdit}
            onDelete={confirmDelete}
          />
        )}
      />

      <TaskFormModal
        visible={formOpen}
        task={editingTask}
        loading={mutating}
        onClose={closeForm}
        onSave={saveTask}
      />

      {/* Floating Action Button (FAB) for Chat Agent */}
      <Pressable
        style={[styles.fab, { backgroundColor: c.primary }]}
        onPress={() => router.push('/agent')}
        accessibilityRole="button"
        accessibilityLabel="Abrir chat con el agente"
      >
        <Ionicons name="chatbubble-ellipses" size={24} color="#ffffff" />
      </Pressable>
    </MainTemplate>
  );
};
