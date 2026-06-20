-- Permite mostrar los nombres publicos del responsable de un curso publicado
-- a miembros activos del cursillo, sin conceder acceso al contenido del curso.
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
  IF NOT EXISTS (
    SELECT 1
    FROM public.cursos c
    WHERE c.id_curso = p_id_curso
      AND (
        public.can_access_curso_content(c.id_curso)
        OR (
          c.es_publicado = true
          AND public.is_cursillo_member_activo(c.id_cursillo)
          AND EXISTS (
            SELECT 1
            FROM public.usuarios u
            WHERE u.id_usuario = public.current_id_usuario()
              AND u.es_activo = true
          )
        )
      )
  ) THEN
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

REVOKE ALL ON FUNCTION public.rpc_get_curso_docentes_publicos(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_curso_docentes_publicos(uuid) TO authenticated, service_role;
