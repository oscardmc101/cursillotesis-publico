import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tareasService } from '@/services/tareasService';
import { useCurrentUsuario } from './useCurrentUsuario';

export interface Tarea {
  id_tarea: string;
  id_leccion: string;
  titulo: string;
  descripcion: string | null;
  fecha_limite: string | null;
  permite_reintentos: boolean;
  max_reintentos: number;
  puntaje_maximo: number;
  fecha_creacion: string;
}

export interface Entrega {
  id_entrega: string;
  id_tarea: string;
  id_usuario: string;
  comentario_estudiante: string | null;
  estado: string;
  calificacion: number | null;
  comentario_docente: string | null;
  retroalimentacion_archivo_url: string | null;
  fecha_entrega: string;
  usuario?: {
    nombres: string;
    apellidos: string;
    correo: string;
  };
  archivos?: ArchivoEntrega[];
}

export interface ArchivoEntrega {
  id_archivo: string;
  id_entrega: string;
  nombre_archivo: string;
  tipo_mime: string | null;
  tamano_bytes: number | null;
  ruta_storage: string;
  bucket: string;
  fecha_subida: string;
}

// Hook para obtener tareas de una lección
export function useTareasLeccion(idLeccion: string) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['tareas', 'leccion', idLeccion],
    queryFn: () => tareasService.getTareasLeccion(idLeccion),
    enabled: !!idLeccion,
  });

  return { tareas: data || [], loading: isLoading, refetch };
}

// Hook para obtener una tarea específica
export function useTarea(idTarea: string, enabled = true) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['tarea', idTarea],
    queryFn: () => tareasService.getTarea(idTarea),
    enabled: enabled && !!idTarea,
  });

  return { tarea: data || null, loading: isLoading, refetch };
}

// Hook para obtener entregas de una tarea
export function useEntregasTarea(idTarea: string) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['entregas', 'tarea', idTarea],
    queryFn: () => tareasService.getEntregasTarea(idTarea),
    enabled: !!idTarea,
  });

  return { entregas: data || [], loading: isLoading, refetch };
}

// Hook para la entrega del usuario actual en una tarea
export function useMiEntrega(idTarea: string) {
  const { idUsuario } = useCurrentUsuario();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['entrega', 'mi', idTarea, idUsuario],
    queryFn: () => tareasService.getMiEntrega(idTarea, idUsuario!),
    enabled: !!idTarea && !!idUsuario,
  });

  return { entrega: data || null, loading: isLoading, refetch };
}

// Hook para contar entregas del usuario en una tarea (para verificar reintentos)
export function useContarEntregas(idTarea: string) {
  const { idUsuario } = useCurrentUsuario();
  const { data, isLoading } = useQuery({
    queryKey: ['entregas', 'count', idTarea, idUsuario],
    queryFn: () => tareasService.countEntregas(idTarea, idUsuario!),
    enabled: !!idTarea && !!idUsuario,
  });

  return { count: data || 0, loading: isLoading };
}

// Hook para tareas pendientes del estudiante (Dashboard)
export function useTareasPendientes(idCursillo?: string | null, enabled = true) {
  const { idUsuario } = useCurrentUsuario();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['tareas', 'pendientes', idUsuario, idCursillo],
    queryFn: () => tareasService.getTareasPendientes(idUsuario!, idCursillo ?? undefined),
    enabled: enabled && !!idUsuario,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return { tareas: data || [], loading: isLoading, refetch };
}

// Hook para entregas por calificar (docente) - filtrado por cursillo activo
export function useEntregasPorCalificar(idCursillo: string | null, enabled = true) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['entregas', 'calificar', idCursillo],
    queryFn: () => tareasService.getEntregasPorCalificar(idCursillo!),
    enabled: enabled && !!idCursillo,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return { entregas: data || [], loading: isLoading, refetch };
}
