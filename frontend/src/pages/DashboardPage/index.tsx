import { useState, useEffect, useCallback, useOptimistic, startTransition } from "react";
import {
  AddRounded,
  LogoutRounded,
  DeleteOutlineRounded,
  EditRounded,
  CheckCircleOutlineRounded,
  CancelOutlined,
  PlayArrowRounded,
  HourglassEmptyRounded,
  SearchRounded,
  LabelRounded,
  RefreshRounded,
  DarkModeRounded,
  LightModeRounded,
} from "@mui/icons-material";
import {
  Container,
  Box,
  Typography,
  Button,
  IconButton,
  Card,
  CardContent,
  CardActions,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Pagination,
  Stack,
  Alert,
  Tooltip,
  useTheme,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { listTasks, createTask, updateTask, deleteTask } from "../../api/tasks";
import type { Task, TaskStatus, TaskPriority } from "../../types/tasks";
import type { RegisteredUser } from "../../types/auth";

const DashboardRoot = styled(Box)(({ theme }) => ({
  minHeight: "100vh",
  padding: theme.spacing(4, 0),
  background: theme.palette.mode === "light"
    ? `
      radial-gradient(circle at top right, rgba(127, 181, 190, 0.4), transparent 30%),
      radial-gradient(circle at bottom left, rgba(241, 179, 139, 0.3), transparent 35%),
      linear-gradient(135deg, #f5efe6 0%, #fffbf7 100%)
    `
    : `
      radial-gradient(circle at top right, rgba(127, 181, 190, 0.15), transparent 30%),
      radial-gradient(circle at bottom left, rgba(199, 92, 42, 0.1), transparent 35%),
      linear-gradient(135deg, #121212 0%, #1e1e1e 100%)
    `,
}));

const AppHeader = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: theme.spacing(4),
  padding: theme.spacing(2, 3),
  borderRadius: 24,
  background: theme.palette.mode === "light" ? "rgba(255, 250, 244, 0.8)" : "rgba(30, 30, 30, 0.8)",
  border: theme.palette.mode === "light" ? "1px solid rgba(18, 76, 90, 0.08)" : "1px solid rgba(255, 255, 255, 0.08)",
  backdropFilter: "blur(12px)",
  boxShadow: theme.palette.mode === "light" ? "0 10px 30px rgba(35, 22, 15, 0.04)" : "0 10px 30px rgba(0, 0, 0, 0.3)",
}));

const ControlPanel = styled(Card)(({ theme }) => ({
  borderRadius: 20,
  padding: theme.spacing(3),
  marginBottom: theme.spacing(4),
  background: theme.palette.mode === "light" ? "rgba(255, 255, 255, 0.7)" : "rgba(30, 30, 30, 0.7)",
  border: theme.palette.mode === "light" ? "1px solid rgba(18, 76, 90, 0.05)" : "1px solid rgba(255, 255, 255, 0.05)",
  backdropFilter: "blur(12px)",
  boxShadow: theme.palette.mode === "light" ? "0 10px 30px rgba(35, 22, 15, 0.04)" : "0 10px 30px rgba(0, 0, 0, 0.3)",
}));

const TaskCard = styled(Card, {
  shouldForwardProp: (prop) => prop !== "status",
})<{ status: TaskStatus }>(({ theme, status }) => {
  const statusBorders: Record<TaskStatus, string> = {
    pending: theme.palette.mode === "light" ? "rgba(35, 22, 15, 0.1)" : "rgba(255, 255, 255, 0.1)",
    in_progress: "rgba(199, 92, 42, 0.25)",
    completed: "rgba(18, 76, 90, 0.25)",
    cancelled: theme.palette.mode === "light" ? "rgba(0, 0, 0, 0.15)" : "rgba(255, 255, 255, 0.15)",
  };

  return {
    borderRadius: 20,
    background: theme.palette.mode === "light" ? "rgba(255, 250, 244, 0.85)" : "rgba(30, 30, 30, 0.85)",
    backdropFilter: "blur(10px)",
    border: `1px solid ${statusBorders[status]}`,
    borderLeft: `6px solid ${
      status === "in_progress"
        ? theme.palette.primary.main
        : status === "completed"
        ? theme.palette.secondary.main
        : status === "cancelled"
        ? "#777"
        : "#9c8c82"
    }`,
    boxShadow: theme.palette.mode === "light" ? "0 12px 24px rgba(35, 22, 15, 0.05)" : "0 12px 24px rgba(0, 0, 0, 0.3)",
    transition: "transform 200ms ease, box-shadow 200ms ease",
    "&:hover": {
      transform: "translateY(-3px)",
      boxShadow: theme.palette.mode === "light" ? "0 16px 36px rgba(35, 22, 15, 0.09)" : "0 16px 36px rgba(0, 0, 0, 0.4)",
    },
  };
});

interface DashboardPageProps {
  user: RegisteredUser;
  token: string;
  onLogout: () => void;
  onToggleTheme: () => void;
}

const statusOptions: { value: TaskStatus; label: string; icon: any }[] = [
  { value: "pending", label: "Pendiente", icon: HourglassEmptyRounded },
  { value: "in_progress", label: "En Progreso", icon: PlayArrowRounded },
  { value: "completed", label: "Completada", icon: CheckCircleOutlineRounded },
  { value: "cancelled", label: "Cancelada", icon: CancelOutlined },
];

const priorityOptions: { value: TaskPriority; label: string; color: "default" | "primary" | "secondary" | "error" }[] = [
  { value: "low", label: "Baja", color: "default" },
  { value: "medium", label: "Media", color: "secondary" },
  { value: "high", label: "Alta", color: "primary" },
  { value: "critical", label: "Crítica", color: "error" },
];

export function DashboardPage({ user, token, onLogout, onToggleTheme }: DashboardPageProps) {
  const theme = useTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [optimisticTasks, addOptimisticTask] = useOptimistic<
    Task[],
    { type: "update" | "delete"; id: string; status?: TaskStatus }
  >(tasks, (state, action) => {
    if (action.type === "update") {
      return state.map((t) =>
        t.id === action.id ? { ...t, status: action.status! } : t
      );
    }
    if (action.type === "delete") {
      return state.filter((t) => t.id !== action.id);
    }
    return state;
  });
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters & Sorting & Pagination State
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<string>("desc");
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(6);

  // Modal Dialogs State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Task Form State
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPriority, setFormPriority] = useState<TaskPriority>("medium");
  const [formTags, setFormTags] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const fetchTasksList = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await listTasks(token, {
        page,
        limit,
        status: statusFilter,
        priority: priorityFilter,
        search: searchQuery,
        tag: tagFilter,
        sortBy,
        sortOrder,
      });
      setTasks(response.data);
      setMeta(response.meta);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al cargar las tareas.");
    } finally {
      setLoading(false);
    }
  }, [token, page, limit, statusFilter, priorityFilter, searchQuery, tagFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchTasksList();
  }, [fetchTasksList]);

  const handleOpenCreateDialog = () => {
    setDialogMode("create");
    setEditingTask(null);
    setFormTitle("");
    setFormDescription("");
    setFormPriority("medium");
    setFormTags("");
    setFormDueDate("");
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (task: Task) => {
    setDialogMode("edit");
    setEditingTask(task);
    setFormTitle(task.title);
    setFormDescription(task.description);
    setFormPriority(task.priority);
    setFormTags(task.tags.join(", "));
    setFormDueDate(task.dueDate ? task.dueDate.substring(0, 16) : "");
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    // Client-side validations
    const errors: Record<string, string> = {};
    if (!formTitle.trim()) {
      errors.title = "El título es obligatorio.";
    } else if (formTitle.length > 200) {
      errors.title = "El título no puede exceder 200 caracteres.";
    }

    if (formDescription.length > 2000) {
      errors.description = "La descripción no puede exceder 2000 caracteres.";
    }

    const tagsArray = formTags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (tagsArray.length > 10) {
      errors.tags = "No puedes agregar más de 10 etiquetas.";
    }
    for (const tag of tagsArray) {
      if (tag.length < 1 || tag.length > 30) {
        errors.tags = "Cada etiqueta debe tener entre 1 y 30 caracteres.";
        break;
      }
      if (!/^[\p{L}\p{N}]+$/u.test(tag)) {
        errors.tags = "Las etiquetas deben ser alfanuméricas.";
        break;
      }
    }

    if (formDueDate) {
      const selectedDate = new Date(formDueDate);
      if (isNaN(selectedDate.getTime())) {
        errors.dueDate = "La fecha no tiene un formato válido.";
      } else if (selectedDate <= new Date() && dialogMode === "create") {
        errors.dueDate = "La fecha límite debe ser en el futuro.";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const payload = {
        title: formTitle,
        description: formDescription,
        priority: formPriority,
        tags: tagsArray,
        dueDate: formDueDate ? new Date(formDueDate).toISOString() : null,
      };

      if (dialogMode === "create") {
        await createTask(token, payload);
      } else if (dialogMode === "edit" && editingTask) {
        await updateTask(token, editingTask.id, payload);
      }

      setDialogOpen(false);
      fetchTasksList();
    } catch (err: any) {
      if (err.details && Array.isArray(err.details)) {
        const backErrors: Record<string, string> = {};
        err.details.forEach((detail: any) => {
          const path = detail.path || detail.field;
          if (path) {
            backErrors[path] = detail.message;
          }
        });
        setFormErrors(backErrors);
      } else {
        setFormErrors({ general: err.message || "Error al procesar la tarea." });
      }
    }
  };

  const handleUpdateStatus = (task: Task, newStatus: TaskStatus) => {
    // Validate transitions locally according to RF-07
    const currentStatus = task.status;
    let allowed = false;

    if (currentStatus === "pending") {
      allowed = newStatus === "in_progress" || newStatus === "cancelled";
    } else if (currentStatus === "in_progress") {
      allowed = newStatus === "completed" || newStatus === "cancelled";
    } else if (currentStatus === "completed") {
      allowed = newStatus === "cancelled";
    }

    if (!allowed && currentStatus !== newStatus) {
      setErrorMsg(
        `Transición inválida: No está permitido cambiar de "${currentStatus}" a "${newStatus}".`
      );
      return;
    }

    startTransition(async () => {
      addOptimisticTask({ type: "update", id: task.id, status: newStatus });
      try {
        await updateTask(token, task.id, { status: newStatus });
        fetchTasksList();
      } catch (err: any) {
        setErrorMsg(err.message || "No se pudo actualizar el estado de la tarea.");
      }
    });
  };

  const handleDeleteTask = (id: string) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar esta tarea?")) {
      return;
    }
    startTransition(async () => {
      addOptimisticTask({ type: "delete", id });
      try {
        await deleteTask(token, id);
        fetchTasksList();
      } catch (err: any) {
        setErrorMsg(err.message || "No se pudo eliminar la tarea.");
      }
    });
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const getStatusIcon = (status: TaskStatus) => {
    const option = statusOptions.find((o) => o.value === status);
    if (!option) return <HourglassEmptyRounded fontSize="small" />;
    const Icon = option.icon;
    return <Icon fontSize="small" />;
  };

  const isTransitionAllowed = (current: TaskStatus, target: TaskStatus): boolean => {
    if (current === target) return true;
    if (current === "pending") return target === "in_progress" || target === "cancelled";
    if (current === "in_progress") return target === "completed" || target === "cancelled";
    if (current === "completed") return target === "cancelled";
    return false;
  };

  return (
    <DashboardRoot>
      <Container maxWidth="lg">
        {/* Top App Header */}
        <AppHeader>
          <Box>
            <Typography variant="h5" color="secondary" sx={{ fontWeight: 800 }}>
              Task Manager
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Conectado como: <strong>{user.name}</strong> ({user.email})
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
            <Tooltip title={theme.palette.mode === "light" ? "Modo Oscuro" : "Modo Claro"}>
              <IconButton onClick={onToggleTheme} color="primary">
                {theme.palette.mode === "light" ? <DarkModeRounded /> : <LightModeRounded />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Recargar lista">
              <IconButton onClick={fetchTasksList} color="secondary">
                <RefreshRounded />
              </IconButton>
            </Tooltip>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<LogoutRounded />}
              onClick={onLogout}
              sx={{ borderRadius: 999 }}
            >
              Cerrar Sesión
            </Button>
          </Box>
        </AppHeader>

        {/* Global Error Banner */}
        {errorMsg && (
          <Alert
            severity="error"
            onClose={() => setErrorMsg(null)}
            sx={{ marginBottom: 3, borderRadius: 4 }}
          >
            {errorMsg}
          </Alert>
        )}

        {/* Filters and Search Control Panel */}
        <ControlPanel>
          <Box sx={{
            display: "grid",
            gap: 2,
            alignItems: "center",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(12, 1fr)" }
          }}>
            <Box sx={{ gridColumn: { xs: "span 12", sm: "span 3" } }}>
              <TextField
                fullWidth
                label="Buscar por título/desc..."
                variant="outlined"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                slotProps={{
                  input: {
                    startAdornment: <SearchRounded color="action" sx={{ mr: 1 }} />,
                  }
                }}
                size="small"
              />
            </Box>
            <Box sx={{ gridColumn: { xs: "span 12", sm: "span 2" } }}>
              <TextField
                fullWidth
                label="Filtrar por etiqueta"
                variant="outlined"
                value={tagFilter}
                onChange={(e) => {
                  setTagFilter(e.target.value);
                  setPage(1);
                }}
                slotProps={{
                  input: {
                    startAdornment: <LabelRounded color="action" sx={{ mr: 1 }} />,
                  }
                }}
                size="small"
              />
            </Box>
            <Box sx={{ gridColumn: { xs: "span 12", sm: "span 2" } }}>
              <FormControl fullWidth size="small">
                <InputLabel>Estado</InputLabel>
                <Select
                  value={statusFilter}
                  label="Estado"
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {statusOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ gridColumn: { xs: "span 12", sm: "span 2" } }}>
              <FormControl fullWidth size="small">
                <InputLabel>Prioridad</InputLabel>
                <Select
                  value={priorityFilter}
                  label="Prioridad"
                  onChange={(e) => {
                    setPriorityFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <MenuItem value="">Todas</MenuItem>
                  {priorityOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{
              gridColumn: { xs: "span 12", sm: "span 3" },
              display: "flex",
              gap: 1
            }}>
              <FormControl fullWidth size="small">
                <InputLabel>Ordenar por</InputLabel>
                <Select
                  value={sortBy}
                  label="Ordenar por"
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <MenuItem value="createdAt">Creación</MenuItem>
                  <MenuItem value="updatedAt">Actualización</MenuItem>
                  <MenuItem value="dueDate">Fecha Límite</MenuItem>
                  <MenuItem value="priority">Prioridad</MenuItem>
                  <MenuItem value="title">Título</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="text"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                sx={{ minWidth: 50 }}
              >
                {sortOrder === "asc" ? "ASC" : "DESC"}
              </Button>
            </Box>
          </Box>
        </ControlPanel>

        {/* Task Grid Top bar with Create Button */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h6" color="secondary.dark" sx={{ fontWeight: 700 }}>
            Tareas ({meta.total})
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddRounded />}
            onClick={handleOpenCreateDialog}
            sx={{ borderRadius: 999, px: 3, py: 1.2 }}
          >
            Nueva Tarea
          </Button>
        </Box>

        {/* Tasks List */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <Typography variant="body1" color="text.secondary">
              Cargando tareas...
            </Typography>
          </Box>
        ) : optimisticTasks.length === 0 ? (
          <Card sx={{ borderRadius: 5, textAlign: "center", py: 8, background: "rgba(255,255,255,0.4)" }}>
            <Typography variant="h6" color="text.secondary">
              No se encontraron tareas.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Comienza creando una tarea usando el botón "Nueva Tarea".
            </Typography>
          </Card>
        ) : (
          <Box sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 3
          }}>
            {optimisticTasks.map((task) => (
              <Box key={task.id}>
                <TaskCard status={task.status}>
                  <CardContent sx={{ pb: 1 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                      <Typography variant="h6" color="text.primary" sx={{ flex: 1, fontWeight: 700 }}>
                        {task.title}
                      </Typography>
                      <Chip
                        size="small"
                        label={
                          statusOptions.find((o) => o.value === task.status)?.label ??
                          task.status
                        }
                        color={
                          task.status === "completed"
                            ? "secondary"
                            : task.status === "in_progress"
                            ? "primary"
                            : "default"
                        }
                        icon={getStatusIcon(task.status)}
                        sx={{ borderRadius: 2 }}
                      />
                    </Box>

                    {task.description && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mt: 1.5,
                          whiteSpace: "pre-line",
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {task.description}
                      </Typography>
                    )}

                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 2 }}>
                      <Chip
                        size="small"
                        label={`Prioridad: ${
                          priorityOptions.find((o) => o.value === task.priority)?.label ??
                          task.priority
                        }`}
                        color={priorityOptions.find((o) => o.value === task.priority)?.color}
                        variant="outlined"
                      />
                      {task.dueDate && (
                        <Chip
                          size="small"
                          label={`Vence: ${new Date(task.dueDate).toLocaleDateString()}`}
                          variant="outlined"
                          color={new Date(task.dueDate) < new Date() && task.status !== "completed" ? "error" : "default"}
                        />
                      )}
                    </Box>

                    {task.tags && task.tags.length > 0 && (
                      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 1.5 }}>
                        {task.tags.map((t) => (
                          <Chip key={t} label={`#${t}`} size="small" variant="outlined" />
                        ))}
                      </Box>
                    )}
                  </CardContent>

                  <CardActions sx={{ px: 2, pb: 2, display: "flex", justifyContent: "space-between" }}>
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                      {/* State transitions selectors */}
                      {statusOptions.map((opt) => {
                        const allowed = isTransitionAllowed(task.status, opt.value);
                        return (
                          <Tooltip key={opt.value} title={allowed ? `Mover a ${opt.label}` : `Transición prohibida`}>
                            <span>
                              <IconButton
                                size="small"
                                aria-label={`Mover a ${opt.label}`}
                                disabled={!allowed || task.status === opt.value}
                                onClick={() => handleUpdateStatus(task, opt.value)}
                                color={
                                  task.status === opt.value
                                    ? "primary"
                                    : allowed
                                    ? "secondary"
                                    : "default"
                                }
                              >
                                {opt.value === "in_progress" && <PlayArrowRounded />}
                                {opt.value === "completed" && <CheckCircleOutlineRounded />}
                                {opt.value === "cancelled" && <CancelOutlined />}
                                {opt.value === "pending" && <HourglassEmptyRounded />}
                              </IconButton>
                            </span>
                          </Tooltip>
                        );
                      })}
                    </Box>

                    <Box sx={{ display: "flex", gap: 0.5 }}>
                      <Tooltip title="Editar tarea">
                        <IconButton size="small" aria-label="Editar tarea" onClick={() => handleOpenEditDialog(task)} color="info">
                          <EditRounded />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar tarea">
                        <IconButton size="small" aria-label="Eliminar tarea" onClick={() => handleDeleteTask(task.id)} color="error">
                          <DeleteOutlineRounded />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </CardActions>
                </TaskCard>
              </Box>
            ))}
          </Box>
        )}

        {/* Pagination at Bottom */}
        {!loading && meta.totalPages > 1 && (
          <Stack spacing={2} sx={{ mt: 5, alignItems: "center" }}>
            <Pagination
              count={meta.totalPages}
              page={meta.page}
              onChange={handlePageChange}
              color="primary"
            />
          </Stack>
        )}
      </Container>

      {/* Create / Edit Dialog Modal */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {dialogMode === "create" ? "Crear Nueva Tarea" : "Editar Tarea"}
        </DialogTitle>
        <form onSubmit={handleFormSubmit}>
          <DialogContent dividers>
            {formErrors.general && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formErrors.general}
              </Alert>
            )}
            <Stack spacing={3}>
              <TextField
                required
                fullWidth
                label="Título"
                placeholder="Título de la tarea"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                error={Boolean(formErrors.title)}
                helperText={formErrors.title}
              />

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Descripción"
                placeholder="Detalla de qué trata la tarea..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                error={Boolean(formErrors.description)}
                helperText={formErrors.description}
              />

              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Prioridad</InputLabel>
                  <Select
                    value={formPriority}
                    label="Prioridad"
                    onChange={(e) => setFormPriority(e.target.value as TaskPriority)}
                  >
                    {priorityOptions.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="Fecha límite"
                  type="datetime-local"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  error={Boolean(formErrors.dueDate)}
                  helperText={formErrors.dueDate || "Opcional"}
                />
              </Box>

              <TextField
                fullWidth
                label="Etiquetas (separadas por comas)"
                placeholder="urgente, desarrollo, ui"
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                error={Boolean(formErrors.tags)}
                helperText={formErrors.tags || "Ejemplo: diseño, bug, backend (máx. 10)"}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setDialogOpen(false)} color="inherit">
              Cancelar
            </Button>
            <Button type="submit" variant="contained" color="primary">
              Guardar
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </DashboardRoot>
  );
}
