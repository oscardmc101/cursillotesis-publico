import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { evaluacionesService } from '@/services/evaluacionesService';
import { useCurrentUsuario } from './useCurrentUsuario';

export interface Evaluacion {
  id_evaluacion: string;
  id_leccion: string;
  titulo: string;
  descripcion: string | null;
  tiempo_limite_min: number | null;
  intentos_max: number;
  fecha_creacion: string;
}

export interface Pregunta {
  id_pregunta: string;
  id_evaluacion: string;
  enunciado: string;
  tipo: 'OPCION_MULTIPLE' | 'ABIERTA';
  puntaje: number;
  opciones?: Opcion[];
}

export interface Opcion {
  id_opcion: string;
  id_pregunta: string;
  texto: string;
  es_correcta: boolean;
}

export type EstadoIntento = 'EN_PROGRESO' | 'COMPLETADO' | 'CORREGIDO' | 'AUTOCORREGIDO' | 'RECLAMADO';

export interface IntentoEvaluacion {
  id_intento: string;
  id_evaluacion: string;
  id_usuario: string;
  estado: EstadoIntento;
  puntaje_obtenido: number;
  fecha_inicio: string;
  fecha_envio: string | null;
  usuario?: {
    nombres: string;
    apellidos: string;
    correo: string;
  };
}

export interface RespuestaIntento {
  id_respuesta: string;
  id_intento: string;
  id_pregunta: string;
  id_opcion: string | null;
  respuesta_texto: string | null;
  es_correcta: boolean | null;
  puntaje_obtenido: number;
}

// Hook para obtener evaluaciones de una lección
export function useEvaluacionesLeccion(idLeccion: string) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['evaluaciones', 'leccion', idLeccion],
    queryFn: () => evaluacionesService.getEvaluacionesLeccion(idLeccion),
    enabled: !!idLeccion,
  });

  return { evaluaciones: data || [], loading: isLoading, refetch };
}

// Hook para obtener una evaluación específica
export function useEvaluacion(idEvaluacion: string, enabled = true) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['evaluacion', idEvaluacion],
    queryFn: () => evaluacionesService.getEvaluacion(idEvaluacion),
    enabled: enabled && !!idEvaluacion,
  });

  return { evaluacion: data || null, loading: isLoading, refetch };
}

// Hook para obtener preguntas de una evaluación con opciones
export function usePreguntasEvaluacion(idEvaluacion: string, enabled = true) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['preguntas', idEvaluacion],
    queryFn: () => evaluacionesService.getPreguntasEvaluacion(idEvaluacion),
    enabled: enabled && !!idEvaluacion,
  });

  return { preguntas: data || [], loading: isLoading, refetch };
}

// Hook para los intentos del usuario actual en una evaluación
export function useMisIntentos(idEvaluacion: string, enabled = true) {
  const { idUsuario } = useCurrentUsuario();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['intentos', 'mis', idEvaluacion, idUsuario],
    queryFn: () => evaluacionesService.getMisIntentos(idEvaluacion, idUsuario!),
    enabled: enabled && !!idEvaluacion && !!idUsuario,
  });

  return { intentos: data || [], loading: isLoading, refetch };
}

// Hook para obtener todos los intentos de una evaluación (docente)
export function useIntentosEvaluacion(idEvaluacion: string, enabled = true) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['intentos', 'todos', idEvaluacion],
    queryFn: () => evaluacionesService.getIntentosEvaluacion(idEvaluacion),
    enabled: enabled && !!idEvaluacion,
  });

  return { intentos: data || [], loading: isLoading, refetch };
}

// Hook para obtener el intento activo del usuario
export function useIntentoActivo(idEvaluacion: string) {
  const { idUsuario } = useCurrentUsuario();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['intento', 'activo', idEvaluacion, idUsuario],
    queryFn: () => evaluacionesService.getIntentoActivo(idEvaluacion, idUsuario!),
    enabled: !!idEvaluacion && !!idUsuario,
  });

  return { intento: data || null, loading: isLoading, refetch };
}

// Hook para obtener respuestas de un intento
export function useRespuestasIntento(idIntento: string) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['respuestas', idIntento],
    queryFn: () => evaluacionesService.getRespuestasIntento(idIntento),
    enabled: !!idIntento,
  });

  return { respuestas: data || [], loading: isLoading, refetch };
}

// Hook para evaluaciones pendientes del estudiante (Dashboard)
export function useEvaluacionesPendientes() {
  const { idUsuario } = useCurrentUsuario();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['evaluaciones', 'pendientes', idUsuario],
    queryFn: () => evaluacionesService.getEvaluacionesPendientes(idUsuario!),
    enabled: !!idUsuario,
  });

  return { evaluaciones: data || [], loading: isLoading, refetch };
}

// Hook para intentos por revisar (docente) - preguntas abiertas sin calificar
export function useIntentosPorRevisar(idCursillo: string | null, enabled = true) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['intentos', 'revisar', idCursillo],
    queryFn: () => evaluacionesService.getIntentosPorRevisar(idCursillo!),
    enabled: enabled && !!idCursillo,
  });

  return { intentos: data || [], loading: isLoading, refetch };
}
