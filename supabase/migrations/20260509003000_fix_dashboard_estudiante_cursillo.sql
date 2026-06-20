-- =====================================================
-- Filtrar dashboard de estudiante por cursillo activo
-- =====================================================

DROP FUNCTION IF EXISTS public.rpc_dashboard_estudiante(uuid, uuid);

CREATE OR REPLACE FUNCTION public.rpc_dashboard_estudiante(
  p_id_usuario uuid,
  p_id_cursillo uuid
)
RETURNS TABLE (
  id_curso uuid,
  titulo text,
  id_grupo_curso uuid,
  nombre_grupo text,
  total_lecciones bigint,
  lecciones_completadas bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_current_usuario uuid;
BEGIN
  v_current_usuario := public.current_id_usuario();

  IF v_current_usuario IS NULL OR p_id_usuario IS DISTINCT FROM v_current_usuario THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  SELECT
    c.id_curso,
    c.titulo::text,
    c.id_grupo_curso,
    COALESCE(gc.nombre, 'Sin grupo')::text AS nombre_grupo,
    COUNT(DISTINCT l.id_leccion)::bigint AS total_lecciones,
    COUNT(DISTINCT pl.id_leccion)::bigint AS lecciones_completadas
  FROM public.inscripciones i
  JOIN public.cursos c ON c.id_curso = i.id_curso
  LEFT JOIN public.grupos_cursos gc ON gc.id_grupo_curso = c.id_grupo_curso
  LEFT JOIN public.modulos m ON m.id_curso = c.id_curso
  LEFT JOIN public.lecciones l ON l.id_modulo = m.id_modulo
  LEFT JOIN public.progreso_lecciones pl ON pl.id_leccion = l.id_leccion
                                  AND pl.id_usuario = p_id_usuario
                                  AND pl.completado = true
  WHERE i.id_usuario = p_id_usuario
    AND c.id_cursillo = p_id_cursillo
  GROUP BY c.id_curso, c.titulo, c.id_grupo_curso, gc.nombre, gc.orden
  ORDER BY COALESCE(gc.orden, 999999), COALESCE(gc.nombre, 'Sin grupo'), c.titulo;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_dashboard_estudiante(uuid, uuid) TO authenticated;
