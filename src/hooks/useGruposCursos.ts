import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useCursillo } from '@/contexts/CursilloContext';



export interface GrupoCurso {
  id_grupo_curso: string;
  id_cursillo: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  es_activo: boolean;
  requiere_password: boolean;
  total_cursos: number;
  cursos_publicados: number;
}

export interface GrupoCursoFormData {
  nombre: string;
  descripcion?: string | null;
  orden?: number;
  es_activo?: boolean;
  requiere_password?: boolean;
  password?: string;
}

export const SIN_GRUPO_ID = 'sin-grupo';

export function useGruposCursos() {
  const queryClient = useQueryClient();
  const { idCursilloActivo: CURSILLO_ID } = useCursillo();

  const gruposQuery = useQuery({
    queryKey: ['grupos-cursos', CURSILLO_ID],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_list_grupos_cursos', {
        p_id_cursillo: CURSILLO_ID!,
      });

      if (error) throw error;
      return (data || []).map((grupo) => ({
        ...grupo,
        total_cursos: Number(grupo.total_cursos || 0),
        cursos_publicados: Number(grupo.cursos_publicados || 0),
      })) as GrupoCurso[];
    },
    enabled: !!CURSILLO_ID,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['grupos-cursos'] });
    queryClient.invalidateQueries({ queryKey: ['cursos'] });
    queryClient.invalidateQueries({ queryKey: ['reportes'] });
    queryClient.invalidateQueries({ queryKey: ['all-inscripciones'] });
  };

  const createGrupo = useMutation({
    mutationFn: async (formData: GrupoCursoFormData) => {
      const { data, error } = await supabase.from('grupos_cursos').insert({
        id_cursillo: CURSILLO_ID,
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion?.trim() || null,
        es_activo: formData.es_activo ?? true,
      })
      .select('id_grupo_curso')
      .single();

      if (error) throw error;
      if (formData.requiere_password && data?.id_grupo_curso) {
        const { error: passwordError } = await supabase.rpc('rpc_set_grupo_curso_password', {
          p_id_grupo_curso: data.id_grupo_curso,
          p_requiere_password: true,
          p_password: formData.password || null,
        });

        if (passwordError) throw passwordError;
      }
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Grupo creado correctamente' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear el grupo',
        variant: 'destructive',
      });
    },
  });

  const updateGrupo = useMutation({
    mutationFn: async ({ id, ...formData }: GrupoCursoFormData & { id: string }) => {
      const { error } = await supabase
        .from('grupos_cursos')
        .update({
          nombre: formData.nombre.trim(),
          descripcion: formData.descripcion?.trim() || null,
          es_activo: formData.es_activo ?? true,
        })
        .eq('id_grupo_curso', id);

      if (error) throw error;

      const password = formData.password?.trim();
      if (formData.requiere_password === false || password) {
        const { error: passwordError } = await supabase.rpc('rpc_set_grupo_curso_password', {
          p_id_grupo_curso: id,
          p_requiere_password: formData.requiere_password ?? false,
          p_password: password || null,
        });

        if (passwordError) throw passwordError;
      }
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Grupo actualizado correctamente' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar el grupo',
        variant: 'destructive',
      });
    },
  });

  const deleteGrupo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('grupos_cursos')
        .delete()
        .eq('id_grupo_curso', id);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Grupo eliminado correctamente' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar el grupo',
        variant: 'destructive',
      });
    },
  });

  return {
    grupos: gruposQuery.data || [],
    loading: gruposQuery.isLoading,
    error: gruposQuery.error,
    createGrupo,
    updateGrupo,
    deleteGrupo,
  };
}
