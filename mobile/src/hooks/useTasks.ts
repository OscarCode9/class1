import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useAppDispatch, useAppSelector } from '@/hooks/useAppStore';
import {
  createTask,
  deleteTask,
  fetchTasks,
  setFilters,
  updateTask,
} from '@/store/slices/tasksSlice';
import type {
  CreateTaskPayload,
  Task,
  TaskPriority,
  TaskStatus,
  UpdateTaskPayload,
} from '@/types/task.types';

export const useTasks = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const { items, meta, filters, status, mutating, error } = useAppSelector(
    (s) => s.tasks,
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const assigneeId = user?.id;

  const refresh = useCallback(() => {
    if (!assigneeId) return;
    void dispatch(fetchTasks({ assigneeId }));
  }, [dispatch, assigneeId]);

  useEffect(() => {
    refresh();
  }, [refresh, filters]);

  const updateFilter = useCallback(
    (partial: Partial<typeof filters>) => {
      dispatch(setFilters(partial));
    },
    [dispatch],
  );

  const toggleSortOrder = useCallback(() => {
    dispatch(
      setFilters({
        sortOrder: filters.sortOrder === 'desc' ? 'asc' : 'desc',
      }),
    );
  }, [dispatch, filters.sortOrder]);

  const openCreate = useCallback(() => {
    setEditingTask(null);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((task: Task) => {
    setEditingTask(task);
    setFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditingTask(null);
  }, []);

  const saveTask = useCallback(
    async (payload: {
      title: string;
      description: string;
      priority: TaskPriority;
      tags: string[];
      dueDate: string | null;
    }) => {
      if (editingTask) {
        const result = await dispatch(
          updateTask({
            id: editingTask.id,
            payload: payload as UpdateTaskPayload,
          }),
        );
        if (updateTask.fulfilled.match(result)) {
          closeForm();
          refresh();
        }
        return;
      }

      const createPayload: CreateTaskPayload = {
        ...payload,
        assigneeId: assigneeId ?? null,
      };
      const result = await dispatch(createTask(createPayload));
      if (createTask.fulfilled.match(result)) {
        closeForm();
        refresh();
      }
    },
    [dispatch, editingTask, assigneeId, closeForm, refresh],
  );

  const changeStatus = useCallback(
    async (task: Task, next: TaskStatus) => {
      const result = await dispatch(
        updateTask({ id: task.id, payload: { status: next } }),
      );
      if (updateTask.rejected.match(result)) {
        Alert.alert(
          'No se pudo cambiar el estado',
          (result.payload as string) ?? 'Error',
        );
      }
    },
    [dispatch],
  );

  const confirmDelete = useCallback(
    (task: Task) => {
      Alert.alert(
        'Eliminar tarea',
        `¿Eliminar “${task.title}”? Esta acción no se puede deshacer.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: () => {
              void dispatch(deleteTask(task.id));
            },
          },
        ],
      );
    },
    [dispatch],
  );

  const tagOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((t) => t.tags.forEach((tag) => set.add(tag)));
    return [
      { value: '', label: 'Todas' },
      ...Array.from(set)
        .sort()
        .map((tag) => ({ value: tag, label: tag })),
    ];
  }, [items]);

  return {
    items,
    meta,
    filters,
    loading: status === 'loading',
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
  };
};
