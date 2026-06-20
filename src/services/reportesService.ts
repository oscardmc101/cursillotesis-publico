import { supabase } from '@/integrations/supabase/client';
import { handleQueryError } from '@/lib/handleQueryError';

export interface ProgresoEstudianteItem {
    tipo: string;
    id: string;
    titulo: string;
    modulo: string;
    estado: string;
    fecha_entrega: string | null;
    fecha_limite: string | null;
    calificacion: number | null;
    puntaje_maximo: number | null;
    intentos: number | null;
    intentos_max: number | null;
}

export interface ParticipacionEstudiante {
    id_usuario: string;
    nombres: string;
    apellidos: string;
    lecciones_completadas: number;
    total_lecciones: number;
    tareas_entregadas: number;
    total_tareas: number;
    tareas_a_tiempo: number;
    evaluaciones_completadas: number;
    total_evaluaciones: number;
    promedio_tareas: number | null;
    promedio_evaluaciones: number | null;
    ultima_actividad: string | null;
}

export interface CursoOption {
    id_curso: string;
    titulo: string;
    id_grupo_curso: string | null;
    nombre_grupo: string | null;
}

export interface EstudianteOption {
    id_usuario: string;
    nombres: string;
    apellidos: string;
}

export interface CertificadoEstudiosItem {
    id_curso: string;
    curso_titulo: string;
    id_grupo_curso: string | null;
    grupo_nombre: string | null;
    modulo_titulo: string;
    leccion_titulo: string;
    tipo_actividad: 'TAREA' | 'EVALUACION';
    id_actividad: string;
    actividad_titulo: string;
    estado: string;
    puntaje_obtenido: number | null;
    puntaje_maximo: number | null;
    porcentaje: number | null;
    fecha_resultado: string | null;
    incluye_promedio: boolean;
}

export interface EvaluacionReporteOption {
    id_evaluacion: string;
    titulo: string;
    id_leccion: string;
    leccion_titulo: string;
    modulo_titulo: string;
    total_preguntas: number;
    total_intentos_finales: number;
}

export interface RendimientoPreguntaItem {
    id_pregunta: string;
    numero_pregunta: number;
    pregunta: string;
    tipo_pregunta: string;
    total_respuestas: number;
    respuestas_correctas: number;
    respuestas_incorrectas: number;
    porcentaje_aciertos: number;
    porcentaje_errores: number;
    nivel_dificultad: string;
}

export const reportesService = {
    async getCursosReporte(idCursillo: string): Promise<CursoOption[]> {
        try {
            const { data, error } = await supabase
                .rpc('rpc_get_cursos_reporte', { p_id_cursillo: idCursillo });

            if (error) throw error;
            return (data || []).map((c) => ({
                id_curso: c.id_curso,
                titulo: c.titulo,
                id_grupo_curso: c.id_grupo_curso,
                nombre_grupo: c.nombre_grupo,
            }));
        } catch (error) {
            handleQueryError('fetching cursos reporte', error);
            throw error;
        }
    },

    async getEstudiantesCurso(idCurso: string): Promise<EstudianteOption[]> {
        try {
            // Trying to use rpc_list_inscritos_curso. 
            // If it fails, fallback to raw query in future.
            const { data, error } = await supabase
                .rpc('rpc_list_inscritos_curso', { p_id_curso: idCurso });

            if (error) throw error;

            return (data || []).map((e) => ({
                id_usuario: e.id_usuario,
                nombres: e.nombres,
                apellidos: e.apellidos
            }));
        } catch (error) {
            handleQueryError('fetching estudiantes curso', error);
            throw error;
        }
    },

    async getProgresoEstudiante(idCurso: string, idUsuario: string): Promise<ProgresoEstudianteItem[]> {
        try {
            const { data, error } = await supabase
                .rpc('rpc_reporte_progreso_estudiante', {
                    p_id_curso: idCurso,
                    p_id_usuario: idUsuario
                });

            if (error) throw error;
            return data || [];
        } catch (error) {
            handleQueryError('fetching progreso estudiante', error);
            throw error;
        }
    },

    async getParticipacionCurso(idCurso: string): Promise<ParticipacionEstudiante[]> {
        try {
            const { data, error } = await supabase
                .rpc('rpc_reporte_participacion_curso', { p_id_curso: idCurso });

            if (error) throw error;
            return data || [];
        } catch (error) {
            handleQueryError('fetching participacion curso', error);
            throw error;
        }
    },

    async getCertificadoEstudios(idCursillo: string, idCurso?: string | null): Promise<CertificadoEstudiosItem[]> {
        try {
            const { data, error } = await supabase
                .rpc('rpc_certificado_estudios', {
                    p_id_cursillo: idCursillo,
                    p_id_curso: idCurso || null,
                });

            if (error) throw error;
            return (data || []).map((item: any) => ({
                ...item,
                puntaje_obtenido: item.puntaje_obtenido !== null ? Number(item.puntaje_obtenido) : null,
                puntaje_maximo: item.puntaje_maximo !== null ? Number(item.puntaje_maximo) : null,
                porcentaje: item.porcentaje !== null ? Number(item.porcentaje) : null,
                incluye_promedio: Boolean(item.incluye_promedio),
            }));
        } catch (error) {
            handleQueryError('fetching certificado estudios', error);
            throw error;
        }
    },

    async getEvaluacionesReporte(idCurso: string): Promise<EvaluacionReporteOption[]> {
        try {
            const { data, error } = await supabase
                .rpc('rpc_get_evaluaciones_reporte', { p_id_curso: idCurso });

            if (error) throw error;
            return (data || []).map((item: any) => ({
                ...item,
                total_preguntas: Number(item.total_preguntas || 0),
                total_intentos_finales: Number(item.total_intentos_finales || 0),
            }));
        } catch (error) {
            handleQueryError('fetching evaluaciones reporte', error);
            throw error;
        }
    },

    async getRendimientoPorPregunta(idEvaluacion: string): Promise<RendimientoPreguntaItem[]> {
        try {
            const { data, error } = await supabase
                .rpc('rpc_reporte_rendimiento_pregunta', { p_id_evaluacion: idEvaluacion });

            if (error) throw error;
            return (data || []).map((item: any) => ({
                ...item,
                numero_pregunta: Number(item.numero_pregunta || 0),
                total_respuestas: Number(item.total_respuestas || 0),
                respuestas_correctas: Number(item.respuestas_correctas || 0),
                respuestas_incorrectas: Number(item.respuestas_incorrectas || 0),
                porcentaje_aciertos: Number(item.porcentaje_aciertos || 0),
                porcentaje_errores: Number(item.porcentaje_errores || 0),
            }));
        } catch (error) {
            handleQueryError('fetching rendimiento por pregunta', error);
            throw error;
        }
    }
};
