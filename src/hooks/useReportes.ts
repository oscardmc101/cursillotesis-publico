import { useQuery } from '@tanstack/react-query';
import {
  reportesService,
  ProgresoEstudianteItem,
  ParticipacionEstudiante,
  CursoOption,
  EstudianteOption,
  CertificadoEstudiosItem,
  EvaluacionReporteOption,
  RendimientoPreguntaItem
} from '@/services/reportesService';

export type {
  ProgresoEstudianteItem,
  ParticipacionEstudiante,
  CursoOption,
  EstudianteOption,
  CertificadoEstudiosItem,
  EvaluacionReporteOption,
  RendimientoPreguntaItem
};

// Hook para obtener lista de cursos disponibles para reportes (filtrado por cursillo activo)
export function useCursosReporte(idCursillo: string | null) {
  const { data, isLoading } = useQuery({
    queryKey: ['reportes', 'cursos', idCursillo],
    queryFn: () => reportesService.getCursosReporte(idCursillo!),
    enabled: !!idCursillo,
  });

  return { cursos: data || [], loading: isLoading };
}

// Hook para obtener estudiantes inscritos en un curso
export function useEstudiantesCurso(idCurso: string | null) {
  const { data, isLoading } = useQuery({
    queryKey: ['reportes', 'estudiantes', idCurso],
    queryFn: () => reportesService.getEstudiantesCurso(idCurso!),
    enabled: !!idCurso,
  });

  return { estudiantes: data || [], loading: isLoading };
}

// Hook para obtener progreso detallado de un estudiante
export function useProgresoEstudiante(idCurso: string | null, idUsuario: string | null) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['reportes', 'progreso', idCurso, idUsuario],
    queryFn: () => reportesService.getProgresoEstudiante(idCurso!, idUsuario!),
    enabled: !!idCurso && !!idUsuario,
  });

  return {
    progreso: data || [],
    loading: isLoading,
    error: error ? (error as Error).message : null
  };
}

// Hook para obtener participación de todos los estudiantes de un curso
export function useParticipacionCurso(idCurso: string | null) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['reportes', 'participacion', idCurso],
    queryFn: () => reportesService.getParticipacionCurso(idCurso!),
    enabled: !!idCurso,
  });

  return {
    participacion: data || [],
    loading: isLoading,
    error: error ? (error as Error).message : null
  };
}

// Hook para generar certificado de estudios del estudiante actual
export function useCertificadoEstudios(idCursillo: string | null, idCurso: string | null) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['reportes', 'certificado-estudios', idCursillo, idCurso],
    queryFn: () => reportesService.getCertificadoEstudios(idCursillo!, idCurso),
    enabled: !!idCursillo,
  });

  return {
    certificado: data || [],
    loading: isLoading,
    error: error ? (error as Error).message : null
  };
}

// Hook para obtener evaluaciones disponibles para reportes docentes
export function useEvaluacionesReporte(idCurso: string | null) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['reportes', 'evaluaciones', idCurso],
    queryFn: () => reportesService.getEvaluacionesReporte(idCurso!),
    enabled: !!idCurso,
  });

  return {
    evaluaciones: data || [],
    loading: isLoading,
    error: error ? (error as Error).message : null
  };
}

// Hook para obtener rendimiento por pregunta de una evaluacion
export function useRendimientoPorPregunta(idEvaluacion: string | null) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['reportes', 'rendimiento-pregunta', idEvaluacion],
    queryFn: () => reportesService.getRendimientoPorPregunta(idEvaluacion!),
    enabled: !!idEvaluacion,
  });

  return {
    rendimiento: data || [],
    loading: isLoading,
    error: error ? (error as Error).message : null
  };
}
