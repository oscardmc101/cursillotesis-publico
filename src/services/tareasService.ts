import { supabase } from '@/integrations/supabase/client';
import { handleQueryError } from '@/lib/handleQueryError';

interface Tarea {
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

interface Entrega {
    id_entrega: string;
    id_tarea: string;
    id_usuario: string;
    comentario_estudiante: string | null;
    estado: string;
    calificacion: number | null;
    comentario_docente: string | null;
    retroalimentacion_archivo_url?: string | null;
    fecha_entrega: string;
    usuario?: {
        nombres: string;
        apellidos: string;
        correo: string;
    };
    archivos?: ArchivoEntrega[];
}

interface ArchivoEntrega {
    id_archivo: string;
    id_entrega: string;
    nombre_archivo: string;
    tipo_mime: string | null;
    tamano_bytes: number | null;
    ruta_storage: string;
    bucket: string;
    fecha_subida: string;
}

export const tareasService = {
    async getTareasLeccion(idLeccion: string): Promise<Tarea[]> {
        try {
            const { data, error } = await supabase
                .from('tareas')
                .select('*')
                .eq('id_leccion', idLeccion)
                .order('fecha_creacion', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            handleQueryError('fetching tareas', error);
            throw error;
        }
    },

    async getTarea(idTarea: string): Promise<Tarea | null> {
        try {
            const { data, error } = await supabase
                .from('tareas')
                .select('*')
                .eq('id_tarea', idTarea)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            handleQueryError('fetching tarea', error);
            throw error;
        }
    },

    async getEntregasTarea(idTarea: string): Promise<Entrega[]> {
        try {
            const { data: entregasData, error: entregasError } = await supabase
                .from('entregas_tareas')
                .select('*')
                .eq('id_tarea', idTarea)
                .order('fecha_entrega', { ascending: false });

            if (entregasError) throw entregasError;
            if (!entregasData || entregasData.length === 0) return [];

            const userIds = [...new Set(entregasData.map(e => e.id_usuario))];
            const entregaIds = entregasData.map(e => e.id_entrega);

            const [{ data: usuarios }, { data: archivos }] = await Promise.all([
                supabase
                    .from('usuarios')
                    .select('id_usuario, nombres, apellidos, correo')
                    .in('id_usuario', userIds),
                supabase
                    .from('archivos_entregas_tareas')
                    .select('*')
                    .in('id_entrega', entregaIds),
            ]);

            return entregasData.map(e => ({
                ...e,
                usuario: usuarios?.find(u => u.id_usuario === e.id_usuario) || undefined,
                archivos: archivos?.filter(a => a.id_entrega === e.id_entrega) || [],
            }));
        } catch (error) {
            handleQueryError('fetching entregas', error);
            throw error;
        }
    },

    async getMiEntrega(idTarea: string, idUsuario: string): Promise<Entrega | null> {
        try {
            const { data: entregaData, error } = await supabase
                .from('entregas_tareas')
                .select('*')
                .eq('id_tarea', idTarea)
                .eq('id_usuario', idUsuario)
                .order('fecha_entrega', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            if (!entregaData) return null;

            const { data: archivos } = await supabase
                .from('archivos_entregas_tareas')
                .select('*')
                .eq('id_entrega', entregaData.id_entrega);

            return {
                ...entregaData,
                archivos: archivos || [],
            };
        } catch (error) {
            handleQueryError('fetching mi entrega', error);
            throw error;
        }
    },

    async countEntregas(idTarea: string, idUsuario: string): Promise<number> {
        try {
            const { count: entregas, error } = await supabase
                .from('entregas_tareas')
                .select('*', { count: 'exact', head: true })
                .eq('id_tarea', idTarea)
                .eq('id_usuario', idUsuario);

            if (error) throw error;
            return entregas || 0;
        } catch (error) {
            handleQueryError('counting entregas', error);
            return 0;
        }
    },

    async getTareasPendientes(idUsuario: string, idCursillo?: string): Promise<(Tarea & { curso_titulo?: string; leccion_titulo?: string })[]> {
        try {
            const { data, error } = await supabase
                .rpc('rpc_dashboard_tareas_pendientes', {
                    p_id_usuario: idUsuario,
                    ...(idCursillo ? { p_id_cursillo: idCursillo } : {}),
                });

            if (error) throw error;
            return (data || []).map(t => ({
                ...t,
                curso_titulo: t.curso_titulo || undefined,
                leccion_titulo: t.leccion_titulo || undefined,
            }));
        } catch (error) {
            handleQueryError('fetching tareas pendientes', error);
            throw error;
        }
    },

    async getEntregasPorCalificar(idCursillo: string): Promise<(Entrega & { tarea_titulo?: string; curso_titulo?: string })[]> {
        try {
            const { data, error } = await supabase
                .rpc('rpc_dashboard_entregas_por_calificar', { p_id_cursillo: idCursillo });

            if (error) throw error;
            return (data || []).map(e => ({
                ...e,
                tarea_titulo: e.tarea_titulo || undefined,
                curso_titulo: e.curso_titulo || undefined,
                usuario: {
                    nombres: e.usuario_nombres || '',
                    apellidos: e.usuario_apellidos || '',
                    correo: e.usuario_correo || '',
                },
            }));
        } catch (error) {
            handleQueryError('fetching entregas por calificar', error);
            throw error;
        }
    },
};
