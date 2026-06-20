-- Función RPC para listar TODAS las inscripciones con datos de curso y usuario
-- Solo accesible para ADMINISTRADOR o DOCENTE del cursillo
CREATE OR REPLACE FUNCTION public.rpc_list_all_inscripciones(p_id_cursillo uuid)
RETURNS TABLE(
  id_inscripcion uuid,
  fecha_inscripcion timestamp with time zone,
  id_usuario uuid,
  nombres text,
  apellidos text,
  correo text,
  id_curso uuid,
  titulo_curso text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Solo ADMINISTRADOR o DOCENTE del cursillo puede listar
  IF NOT (
    public.has_cursillo_role(p_id_cursillo, 'ADMINISTRADOR')
    OR public.has_cursillo_role(p_id_cursillo, 'DOCENTE')
  ) THEN
    RAISE EXCEPTION 'No autorizado: no tienes permisos para ver inscripciones de este cursillo';
  END IF;

  RETURN QUERY
  SELECT
    i.id_inscripcion,
    i.fecha_inscripcion,
    u.id_usuario,
    u.nombres::text,
    u.apellidos::text,
    u.correo::text,
    c.id_curso,
    c.titulo::text AS titulo_curso
  FROM public.inscripciones i
  JOIN public.usuarios u ON u.id_usuario = i.id_usuario
  JOIN public.cursos c ON c.id_curso = i.id_curso
  WHERE c.id_cursillo = p_id_cursillo
  ORDER BY i.fecha_inscripcion DESC;
END;
$function$;

-- Función para obtener estadísticas del cursillo
CREATE OR REPLACE FUNCTION public.rpc_get_cursillo_stats(p_id_cursillo uuid)
RETURNS TABLE(
  total_usuarios bigint,
  total_cursos bigint,
  total_inscripciones bigint,
  cursos_publicados bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Solo ADMINISTRADOR o DOCENTE del cursillo puede ver estadísticas
  IF NOT (
    public.has_cursillo_role(p_id_cursillo, 'ADMINISTRADOR')
    OR public.has_cursillo_role(p_id_cursillo, 'DOCENTE')
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.usuarios_cursillos WHERE id_cursillo = p_id_cursillo)::bigint AS total_usuarios,
    (SELECT COUNT(*) FROM public.cursos WHERE id_cursillo = p_id_cursillo)::bigint AS total_cursos,
    (SELECT COUNT(*) FROM public.inscripciones i 
     JOIN public.cursos c ON c.id_curso = i.id_curso 
     WHERE c.id_cursillo = p_id_cursillo)::bigint AS total_inscripciones,
    (SELECT COUNT(*) FROM public.cursos WHERE id_cursillo = p_id_cursillo AND es_publicado = true)::bigint AS cursos_publicados;
END;
$function$;