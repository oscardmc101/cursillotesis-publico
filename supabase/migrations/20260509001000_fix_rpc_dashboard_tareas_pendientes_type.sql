-- =====================================================
-- Fix dashboard student pending tasks RPC return types
-- =====================================================

DROP FUNCTION IF EXISTS public.rpc_dashboard_tareas_pendientes(uuid);
DROP FUNCTION IF EXISTS public.rpc_dashboard_tareas_pendientes(uuid, uuid);

CREATE OR REPLACE FUNCTION public.rpc_dashboard_tareas_pendientes(
  p_id_usuario uuid,
  p_id_cursillo uuid DEFAULT NULL
)
RETURNS TABLE(
  id_tarea uuid,
  id_leccion uuid,
  titulo text,
  descripcion text,
  fecha_limite timestamptz,
  permite_reintentos boolean,
  max_reintentos integer,
  puntaje_maximo numeric,
  fecha_creacion timestamptz,
  curso_titulo text,
  leccion_titulo text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_id_usuario <> public.current_id_usuario() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  SELECT
    t.id_tarea::uuid,
    t.id_leccion::uuid,
    t.titulo::text,
    t.descripcion::text,
    t.fecha_limite::timestamptz,
    t.permite_reintentos::boolean,
    t.max_reintentos::integer,
    t.puntaje_maximo::numeric,
    t.fecha_creacion::timestamptz,
    c.titulo::text AS curso_titulo,
    l.titulo::text AS leccion_titulo
  FROM public.inscripciones i
  JOIN public.cursos c ON c.id_curso = i.id_curso
  JOIN public.modulos m ON m.id_curso = c.id_curso
  JOIN public.lecciones l ON l.id_modulo = m.id_modulo
  JOIN public.tareas t ON t.id_leccion = l.id_leccion
  WHERE i.id_usuario = p_id_usuario
    AND c.es_publicado = true
    AND (p_id_cursillo IS NULL OR c.id_cursillo = p_id_cursillo)
    AND NOT EXISTS (
      SELECT 1
      FROM public.entregas_tareas et
      WHERE et.id_tarea = t.id_tarea
        AND et.id_usuario = p_id_usuario
        AND et.estado = 'CALIFICADO'
    )
  ORDER BY t.fecha_limite ASC NULLS LAST, t.fecha_creacion ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_dashboard_tareas_pendientes(uuid, uuid) TO authenticated;
