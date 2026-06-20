import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUsuario } from './useCurrentUsuario';

interface ProgresoLeccion {
  id_progreso: string;
  id_leccion: string;
  completado: boolean;
  fecha_completado: string | null;
}

export function useProgresoLecciones(leccionIds: string[]) {
  const { idUsuario } = useCurrentUsuario();
  const [progreso, setProgreso] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgreso = async () => {
      if (!idUsuario || leccionIds.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('progreso_lecciones')
          .select('id_leccion, completado')
          .eq('id_usuario', idUsuario)
          .in('id_leccion', leccionIds);

        if (error) throw error;

        const progresoMap: Record<string, boolean> = {};
        (data || []).forEach((p) => {
          progresoMap[p.id_leccion] = p.completado;
        });
        setProgreso(progresoMap);
      } catch (error) {
        console.error('Error fetching progreso:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgreso();
  }, [idUsuario, leccionIds.join(',')]);

  return { progreso, loading };
}

export function useProgresoLeccion(idLeccion: string) {
  const { idUsuario } = useCurrentUsuario();
  const [completada, setCompletada] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProgreso = async () => {
      if (!idUsuario || !idLeccion) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('progreso_lecciones')
          .select('completado')
          .eq('id_usuario', idUsuario)
          .eq('id_leccion', idLeccion)
          .maybeSingle();

        if (error) throw error;
        setCompletada(data?.completado || false);
      } catch (error) {
        console.error('Error fetching progreso leccion:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgreso();
  }, [idUsuario, idLeccion]);

  const toggleCompletada = async () => {
    if (!idUsuario || !idLeccion) return;

    setSaving(true);
    try {
      const nuevoEstado = !completada;

      const { error } = await supabase
        .from('progreso_lecciones')
        .upsert({
          id_usuario: idUsuario,
          id_leccion: idLeccion,
          completado: nuevoEstado,
          fecha_completado: nuevoEstado ? new Date().toISOString() : null,
        }, {
          onConflict: 'id_usuario,id_leccion'
        });

      if (error) throw error;
      setCompletada(nuevoEstado);
    } catch (error) {
      console.error('Error toggling progreso:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  return { completada, loading, saving, toggleCompletada };
}
