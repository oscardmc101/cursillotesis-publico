-- =====================================================
-- Comentarios de leccion con autor visible para estudiantes
-- =====================================================
-- Evita depender de SELECT directo sobre public.usuarios. Devuelve solo
-- nombres/apellidos del autor cuando el usuario puede ver la leccion.
-- =====================================================

CREATE OR REPLACE FUNCTION public.can_view_leccion(p_id_leccion uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lecciones l
    JOIN public.modulos m ON m.id_modulo = l.id_modulo
    JOIN public.cursos c ON c.id_curso = m.id_curso
    WHERE l.id_leccion = p_id_leccion
      AND public.can_view_curso(c.id_curso)
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_view_leccion(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_list_comentarios_leccion_publicos(p_id_leccion uuid)
RETURNS TABLE(
  id_comentario uuid,
  contenido text,
  fecha_comentario timestamp with time zone,
  id_usuario uuid,
  usuario_nombres text,
  usuario_apellidos text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_view_leccion(p_id_leccion) THEN
    RAISE EXCEPTION 'No autorizado para ver comentarios de esta leccion';
  END IF;

  RETURN QUERY
  SELECT
    cl.id_comentario,
    cl.contenido::text,
    cl.fecha_comentario,
    cl.id_usuario,
    u.nombres::text AS usuario_nombres,
    u.apellidos::text AS usuario_apellidos
  FROM public.comentarios_leccion cl
  LEFT JOIN public.usuarios u ON u.id_usuario = cl.id_usuario
  WHERE cl.id_leccion = p_id_leccion
  ORDER BY cl.fecha_comentario ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_list_comentarios_leccion_publicos(uuid) TO authenticated;
