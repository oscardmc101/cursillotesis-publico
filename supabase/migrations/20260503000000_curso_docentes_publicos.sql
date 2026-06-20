-- =====================================================
-- Datos publicos de docentes por curso
-- =====================================================
-- Permite que estudiantes vean propietario y ayudantes del curso sin abrir
-- acceso directo a la tabla usuarios ni a datos sensibles.
-- =====================================================

CREATE OR REPLACE FUNCTION public.can_view_curso(p_id_curso uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cursos c
    WHERE c.id_curso = p_id_curso
      AND (
        c.es_publicado = true
        OR public.has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR')
        OR public.is_curso_docente(c.id_curso)
        OR EXISTS (
          SELECT 1
          FROM public.inscripciones i
          WHERE i.id_curso = c.id_curso
            AND i.id_usuario = public.current_id_usuario()
        )
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_view_curso(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_get_curso_docentes_publicos(p_id_curso uuid)
RETURNS TABLE(
  propietario_id uuid,
  propietario_nombres text,
  propietario_apellidos text,
  ayudantes jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_view_curso(p_id_curso) THEN
    RAISE EXCEPTION 'No autorizado para ver docentes del curso';
  END IF;

  RETURN QUERY
  SELECT
    propietario.id_usuario AS propietario_id,
    propietario.nombres::text AS propietario_nombres,
    propietario.apellidos::text AS propietario_apellidos,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id_docente', ayudante.id_usuario,
            'nombres', ayudante.nombres,
            'apellidos', ayudante.apellidos
          )
          ORDER BY ayudante.apellidos, ayudante.nombres
        )
        FROM public.curso_docentes_colaboradores cdc
        JOIN public.usuarios ayudante ON ayudante.id_usuario = cdc.id_docente
        WHERE cdc.id_curso = c.id_curso
      ),
      '[]'::jsonb
    ) AS ayudantes
  FROM public.cursos c
  LEFT JOIN public.usuarios propietario ON propietario.id_usuario = c.id_docente
  WHERE c.id_curso = p_id_curso;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_get_curso_docentes_publicos(uuid) TO authenticated;
