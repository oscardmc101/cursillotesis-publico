import { supabase } from '@/integrations/supabase/client';
import { handleQueryError } from '@/lib/handleQueryError';

// Define types locally to avoid circular dependency with useEvaluaciones hook
interface Evaluacion {
    id_evaluacion: string;
    id_leccion: string;
    titulo: string;
    descripcion: string | null;
    tiempo_limite_min: number | null;
    intentos_max: number;
    fecha_creacion: string;
}

interface Pregunta {
    id_pregunta: string;
    id_evaluacion: string;
    enunciado: string;
    tipo: 'OPCION_MULTIPLE' | 'ABIERTA';
    puntaje: number;
    orden: number;
    opciones?: Opcion[];
}

interface Opcion {
    id_opcion: string;
    id_pregunta: string;
    texto: string;
    es_correcta: boolean;
}

interface IntentoEvaluacion {
    id_intento: string;
    id_evaluacion: string;
    id_usuario: string;
    fecha_inicio: string;
    fecha_envio: string | null;
    calificacion_final: number | null;
    estado: EstadoIntento;
    usuario?: {
        nombres: string;
        apellidos: string;
        correo: string;
    };
}

type EstadoIntento = 'EN_PROGRESO' | 'COMPLETADO' | 'CORREGIDO' | 'AUTOCORREGIDO' | 'RECLAMADO';

interface RespuestaIntento {
    id_respuesta: string;
    id_intento: string;
    id_pregunta: string;
    id_opcion_seleccionada: string | null;
    respuesta_texto: string | null;
    es_correcta: boolean | null;
    puntaje_obtenido: number | null;
}

export const evaluacionesService = {
    async getEvaluacionesLeccion(idLeccion: string): Promise<Evaluacion[]> {
        try {
            const { data, error } = await supabase
                .from('evaluaciones')
                .select('*')
                .eq('id_leccion', idLeccion)
                .order('fecha_creacion', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            handleQueryError('fetching evaluaciones', error);
            throw error;
        }
    },

    async getEvaluacion(idEvaluacion: string): Promise<Evaluacion | null> {
        try {
            const { data, error } = await supabase
                .from('evaluaciones')
                .select('*')
                .eq('id_evaluacion', idEvaluacion)
                .maybeSingle();

            if (error) throw error;
            return data;
        } catch (error) {
            handleQueryError('fetching evaluacion', error);
            throw error;
        }
    },

    async getPreguntasEvaluacion(idEvaluacion: string): Promise<Pregunta[]> {
        try {
            const { data: preguntasData, error: preguntasError } = await supabase
                .from('preguntas_evaluacion')
                .select('*')
                .eq('id_evaluacion', idEvaluacion)
                .order('id_pregunta');

            if (preguntasError) throw preguntasError;
            if (!preguntasData || preguntasData.length === 0) return [];

            const preguntaIds = preguntasData.map(p => p.id_pregunta);
            const { data: opcionesData } = await supabase
                .from('opciones_pregunta')
                .select('*')
                .in('id_pregunta', preguntaIds);

            return preguntasData.map(p => ({
                ...p,
                tipo: p.tipo as 'OPCION_MULTIPLE' | 'ABIERTA',
                opciones: (opcionesData || []).filter(o => o.id_pregunta === p.id_pregunta),
            }));
        } catch (error) {
            handleQueryError('fetching preguntas', error);
            throw error;
        }
    },

    async getMisIntentos(idEvaluacion: string, idUsuario: string): Promise<IntentoEvaluacion[]> {
        try {
            const { data, error } = await supabase
                .from('intentos_evaluacion')
                .select('*')
                .eq('id_evaluacion', idEvaluacion)
                .eq('id_usuario', idUsuario)
                .order('fecha_inicio', { ascending: false });

            if (error) throw error;
            return (data || []).map(i => ({
                ...i,
                estado: i.estado as EstadoIntento,
            }));
        } catch (error) {
            handleQueryError('fetching mis intentos', error);
            throw error;
        }
    },

    async getIntentosEvaluacion(idEvaluacion: string): Promise<IntentoEvaluacion[]> {
        try {
            const { data: intentosData, error } = await supabase
                .from('intentos_evaluacion')
                .select('*')
                .eq('id_evaluacion', idEvaluacion)
                .order('fecha_inicio', { ascending: false });

            if (error) throw error;
            if (!intentosData || intentosData.length === 0) return [];

            const userIds = [...new Set(intentosData.map(i => i.id_usuario))];

            // ✅ Los usuarios se obtienen directamente, no hay otra dependencia
            const { data: usuarios } = await supabase
                .from('usuarios')
                .select('id_usuario, nombres, apellidos, correo')
                .in('id_usuario', userIds);

            return intentosData.map(i => ({
                ...i,
                estado: i.estado as EstadoIntento,
                usuario: usuarios?.find(u => u.id_usuario === i.id_usuario) || undefined,
            }));
        } catch (error) {
            handleQueryError('fetching intentos evaluacion', error);
            throw error;
        }
    },

    async getIntentoActivo(idEvaluacion: string, idUsuario: string): Promise<IntentoEvaluacion | null> {
        try {
            const { data, error } = await supabase
                .from('intentos_evaluacion')
                .select('*')
                .eq('id_evaluacion', idEvaluacion)
                .eq('id_usuario', idUsuario)
                .eq('estado', 'EN_PROGRESO')
                .maybeSingle();

            if (error) throw error;
            return data ? {
                ...data,
                estado: data.estado as EstadoIntento,
            } : null;
        } catch (error) {
            handleQueryError('fetching intento activo', error);
            throw error;
        }
    },

    async getRespuestasIntento(idIntento: string): Promise<RespuestaIntento[]> {
        try {
            const { data, error } = await supabase
                .from('respuestas_intento')
                .select('*')
                .eq('id_intento', idIntento);

            if (error) throw error;
            return data || [];
        } catch (error) {
            handleQueryError('fetching respuestas', error);
            throw error;
        }
    },

    async getEvaluacionesPendientes(idUsuario: string): Promise<(Evaluacion & { curso_titulo?: string; leccion_titulo?: string; intentos_realizados?: number })[]> {
        try {
            const { data: inscripciones } = await supabase
                .from('inscripciones')
                .select('id_curso')
                .eq('id_usuario', idUsuario);

            if (!inscripciones || inscripciones.length === 0) return [];

            const cursoIds = inscripciones.map(i => i.id_curso);

            const { data: evaluacionesData } = await supabase
                .from('evaluaciones')
                .select(`
                    *,
                    lecciones!inner (
                        id_leccion,
                        titulo,
                        modulos!inner (
                            id_modulo,
                            cursos!inner (
                                id_curso,
                                titulo,
                                es_publicado
                            )
                        )
                    )
                `)
                .in('lecciones.modulos.cursos.id_curso', cursoIds)
                .eq('lecciones.modulos.cursos.es_publicado', true);

            if (!evaluacionesData || evaluacionesData.length === 0) return [];

            const evaluacionIds = evaluacionesData.map(e => e.id_evaluacion);
            const { data: intentosData } = await supabase
                .from('intentos_evaluacion')
                .select('id_evaluacion, estado')
                .eq('id_usuario', idUsuario)
                .in('id_evaluacion', evaluacionIds);

            const intentosPorEvaluacion: Record<string, { total: number; completados: number }> = {};
            (intentosData || []).forEach(i => {
                if (!intentosPorEvaluacion[i.id_evaluacion]) {
                    intentosPorEvaluacion[i.id_evaluacion] = { total: 0, completados: 0 };
                }
                intentosPorEvaluacion[i.id_evaluacion].total++;
                if (i.estado !== 'EN_PROGRESO') {
                    intentosPorEvaluacion[i.id_evaluacion].completados++;
                }
            });

            return evaluacionesData
                .filter(e => {
                    const intentos = intentosPorEvaluacion[e.id_evaluacion];
                    if (!intentos) return true;
                    return intentos.total < e.intentos_max;
                })
                .map(e => ({
                    ...e,
                    curso_titulo: (e.lecciones as any)?.modulos?.cursos?.titulo,
                    leccion_titulo: (e.lecciones as any)?.titulo,
                    intentos_realizados: intentosPorEvaluacion[e.id_evaluacion]?.total || 0,
                }));
        } catch (error) {
            handleQueryError('fetching evaluaciones pendientes', error);
            throw error;
        }
    },

    async getIntentosPorRevisar(idCursillo: string): Promise<(IntentoEvaluacion & { evaluacion_titulo?: string; curso_titulo?: string; preguntas_pendientes?: number })[]> {
        try {
            const { data: intentosData, error } = await supabase
                .from('intentos_evaluacion')
                .select(`
                    *,
                    evaluaciones!inner (
                        id_evaluacion,
                        titulo,
                        lecciones!inner (
                            id_leccion,
                            modulos!inner (
                                id_modulo,
                                cursos!inner (
                                    id_curso,
                                    titulo,
                                    id_cursillo
                                )
                            )
                        )
                    )
                `)
                .eq('evaluaciones.lecciones.modulos.cursos.id_cursillo', idCursillo)
                .in('estado', ['COMPLETADO', 'CORREGIDO', 'RECLAMADO'])
                .order('fecha_envio', { ascending: true });

            if (error) throw error;
            if (!intentosData || intentosData.length === 0) return [];

            const intentoIds = intentosData.map(i => i.id_intento);
            const userIds = [...new Set(intentosData.map(i => i.id_usuario))];

            const [{ data: respuestasPendientes }, { data: usuarios }] = await Promise.all([
                supabase
                    .from('respuestas_intento')
                    .select('id_intento, id_pregunta')
                    .in('id_intento', intentoIds)
                    .is('es_correcta', null),
                supabase
                    .from('usuarios')
                    .select('id_usuario, nombres, apellidos, correo')
                    .in('id_usuario', userIds),
            ]);

            const pendientesPorIntento: Record<string, number> = {};
            (respuestasPendientes || []).forEach(r => {
                pendientesPorIntento[r.id_intento] = (pendientesPorIntento[r.id_intento] || 0) + 1;
            });

            return intentosData.map(i => ({
                ...i,
                estado: i.estado as EstadoIntento,
                evaluacion_titulo: (i.evaluaciones as any)?.titulo,
                curso_titulo: (i.evaluaciones as any)?.lecciones?.modulos?.cursos?.titulo,
                preguntas_pendientes: pendientesPorIntento[i.id_intento] || 0,
                usuario: usuarios?.find(u => u.id_usuario === i.id_usuario) || undefined,
            }));
        } catch (error) {
            handleQueryError('fetching intentos por revisar', error);
            throw error;
        }
    }
};
