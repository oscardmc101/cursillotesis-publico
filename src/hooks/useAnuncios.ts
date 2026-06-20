import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUsuario } from './useCurrentUsuario';
import { useCursillo } from '@/contexts/CursilloContext';



export interface Anuncio {
  id_anuncio: string;
  id_cursillo: string;
  id_curso: string | null;
  titulo: string;
  contenido: string;
  fecha_publicacion: string;
  id_creador: string | null;
  curso?: {
    titulo: string;
  } | null;
  creador?: {
    nombres: string;
    apellidos: string;
  } | null;
}

export interface AnuncioFormData {
  titulo: string;
  contenido: string;
  id_curso: string | null;
  notificar_email?: boolean;
  nombre_curso?: string;
}

export const useAnuncios = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { idUsuario } = useCurrentUsuario();
  const { idCursilloActivo: CURSILLO_ID } = useCursillo();

  // Fetch all anuncios
  const { data: anuncios = [], isLoading, error } = useQuery({
    queryKey: ['anuncios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('anuncios')
        .select(`
          *,
          curso:id_curso (titulo),
          creador:id_creador (nombres, apellidos)
        `)
        .eq('id_cursillo', CURSILLO_ID)
        .order('fecha_publicacion', { ascending: false });

      if (error) throw error;
      return data as Anuncio[];
    },
  });

  // Create anuncio
  const createAnuncio = useMutation({
    mutationFn: async (formData: AnuncioFormData) => {
      const { data, error } = await supabase
        .from('anuncios')
        .insert({
          titulo: formData.titulo,
          contenido: formData.contenido,
          id_curso: formData.id_curso,
          id_cursillo: CURSILLO_ID,
          id_creador: idUsuario,
        })
        .select()
        .single();

      if (error) throw error;

      // Send email notification if enabled
      if (formData.notificar_email !== false) {
        try {
          const { data: emailResult, error: emailError } = await supabase.functions.invoke(
            'send-anuncio-email',
            {
              body: {
                titulo: formData.titulo,
                contenido: formData.contenido,
                id_curso: formData.id_curso,
                nombre_curso: formData.nombre_curso,
              },
            }
          );

          if (emailError) {
            console.error('Error sending email notifications:', emailError);
          }

          return { ...data, emailsSent: emailResult?.emailsSent || 0 };
        } catch (emailErr) {
          console.error('Error invoking email function:', emailErr);
          return { ...data, emailsSent: 0 };
        }
      }

      return { ...data, emailsSent: 0 };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['anuncios'] });
      const emailMsg = data.emailsSent > 0 
        ? ` Se notificó a ${data.emailsSent} usuario(s) por email.`
        : '';
      toast({
        title: 'Anuncio publicado',
        description: `El anuncio ha sido publicado correctamente.${emailMsg}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'No se pudo publicar el anuncio.',
        variant: 'destructive',
      });
      console.error('Error creating anuncio:', error);
    },
  });

  // Update anuncio
  const updateAnuncio = useMutation({
    mutationFn: async ({ id, ...formData }: AnuncioFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('anuncios')
        .update({
          titulo: formData.titulo,
          contenido: formData.contenido,
          id_curso: formData.id_curso,
        })
        .eq('id_anuncio', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anuncios'] });
      toast({
        title: 'Anuncio actualizado',
        description: 'El anuncio ha sido actualizado correctamente.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el anuncio.',
        variant: 'destructive',
      });
      console.error('Error updating anuncio:', error);
    },
  });

  // Delete anuncio
  const deleteAnuncio = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('anuncios')
        .delete()
        .eq('id_anuncio', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anuncios'] });
      toast({
        title: 'Anuncio eliminado',
        description: 'El anuncio ha sido eliminado correctamente.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el anuncio.',
        variant: 'destructive',
      });
      console.error('Error deleting anuncio:', error);
    },
  });

  return {
    anuncios,
    isLoading,
    error,
    createAnuncio,
    updateAnuncio,
    deleteAnuncio,
  };
};

// Hook for realtime updates
export const useAnunciosRealtime = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const channel = supabase
      .channel('anuncios-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'anuncios',
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['anuncios'] });
          
          if (payload.eventType === 'INSERT') {
            const newAnuncio = payload.new as Anuncio;
            toast({
              title: '📢 Nuevo Anuncio',
              description: newAnuncio.titulo,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);
};

// Hook for recent anuncios (for widget)
export const useAnunciosRecientes = (limit = 5) => {
  const { idUsuario } = useCurrentUsuario();
  const { idCursilloActivo: CURSILLO_ID } = useCursillo();

  return useQuery({
    queryKey: ['anuncios-recientes', idUsuario, limit],
    queryFn: async () => {
      // ✅ Obtener inscripciones del usuario en paralelo con la primera parte del fetch
      let enrolledCourseIds: string[] = [];
      if (idUsuario) {
        const { data: inscripciones } = await supabase
          .from('inscripciones')
          .select('id_curso')
          .eq('id_usuario', idUsuario);
        enrolledCourseIds = inscripciones?.map(i => i.id_curso) || [];
      }

      // ✅ Filtrado SERVER-SIDE con .or() para evitar traer todos los anuncios al cliente
      let query = supabase
        .from('anuncios')
        .select(`
          *,
          curso:id_curso (titulo)
        `)
        .eq('id_cursillo', CURSILLO_ID)
        .order('fecha_publicacion', { ascending: false });

      if (enrolledCourseIds.length > 0) {
        // Mostrar globales (sin curso) O los de cursos en los que está inscrito
        query = query.or(`id_curso.is.null,id_curso.in.(${enrolledCourseIds.join(',')})`);
      } else {
        // Solo anuncios globales si no está inscrito en ningún curso
        query = query.is('id_curso', null);
      }

      const { data, error } = await query.limit(limit);
      if (error) throw error;

      return (data || []) as Anuncio[];
    },
    enabled: !!idUsuario,
  });
};

