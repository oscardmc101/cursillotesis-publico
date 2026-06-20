-- Fix the return types to match the column types (varchar -> text casting)
CREATE OR REPLACE FUNCTION public.rpc_list_inscritos_curso(p_id_curso uuid)
 RETURNS TABLE(id_inscripcion uuid, fecha_inscripcion timestamp with time zone, id_usuario uuid, nombres text, apellidos text, correo text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id_cursillo uuid;
  v_id_docente uuid;
BEGIN
  SELECT c.id_cursillo, c.id_docente
    INTO v_id_cursillo, v_id_docente
  FROM public.cursos c
  WHERE c.id_curso = p_id_curso;

  IF v_id_cursillo IS NULL THEN
    RAISE EXCEPTION 'Curso no encontrado';
  END IF;

  -- Solo: Admin del cursillo o Docente asignado al curso
  IF NOT (
    public.has_cursillo_role(v_id_cursillo, 'ADMINISTRADOR')
    OR public.is_curso_docente(p_id_curso)
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  SELECT
    i.id_inscripcion,
    i.fecha_inscripcion,
    u.id_usuario,
    u.nombres::text,
    u.apellidos::text,
    u.correo::text
  FROM public.inscripciones i
  JOIN public.usuarios u ON u.id_usuario = i.id_usuario
  WHERE i.id_curso = p_id_curso
  ORDER BY i.fecha_inscripcion DESC;
END;
$function$;