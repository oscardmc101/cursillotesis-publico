-- =====================================================
-- MEJORA 5: Reducir waterfall queries en Dashboard
-- =====================================================
-- Crea una función RPC optimizada que devuelve los cursos inscritos
-- junto con el progreso del estudiante en una sola consulta.
-- Reemplaza el bucle N+1 que hacía fetch de lecciones por separado.
-- =====================================================

CREATE OR REPLACE FUNCTION public.rpc_dashboard_estudiante(
  p_id_usuario uuid
)
RETURNS TABLE (
  id_curso uuid,
  titulo text,
  total_lecciones bigint,
  lecciones_completadas bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id_curso,
    c.titulo,
    COUNT(DISTINCT l.id_leccion)::bigint as total_lecciones,
    COUNT(DISTINCT pl.id_leccion)::bigint as lecciones_completadas
  FROM public.inscripciones i
  JOIN public.cursos c ON c.id_curso = i.id_curso
  LEFT JOIN public.modulos m ON m.id_curso = c.id_curso
  LEFT JOIN public.lecciones l ON l.id_modulo = m.id_modulo
  LEFT JOIN public.progreso_lecciones pl ON pl.id_leccion = l.id_leccion 
                                  AND pl.id_usuario = p_id_usuario 
                                  AND pl.completado = true
  WHERE i.id_usuario = p_id_usuario
  GROUP BY c.id_curso, c.titulo;
END;
$$;
