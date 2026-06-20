CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.rpc_set_grupo_curso_password(
  p_id_grupo_curso uuid,
  p_requiere_password boolean,
  p_password text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $function$
DECLARE
  v_id_cursillo uuid;
BEGIN
  SELECT id_cursillo
  INTO v_id_cursillo
  FROM public.grupos_cursos
  WHERE id_grupo_curso = p_id_grupo_curso;

  IF v_id_cursillo IS NULL THEN
    RAISE EXCEPTION 'Grupo de curso no encontrado';
  END IF;

  IF NOT (
    public.has_cursillo_role(v_id_cursillo, 'ADMINISTRADOR')
    OR public.has_cursillo_role(v_id_cursillo, 'DOCENTE')
  ) THEN
    RAISE EXCEPTION 'No autorizado para configurar la contraseña del grupo';
  END IF;

  IF p_requiere_password AND length(trim(coalesce(p_password, ''))) = 0 THEN
    RAISE EXCEPTION 'La contraseña del grupo es obligatoria';
  END IF;

  PERFORM set_config('app.allow_password_hash_write', 'on', true);

  UPDATE public.grupos_cursos
  SET
    requiere_password = p_requiere_password,
    password_hash = CASE
      WHEN p_requiere_password THEN crypt(p_password, gen_salt('bf'))
      ELSE NULL
    END
  WHERE id_grupo_curso = p_id_grupo_curso;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.rpc_set_grupo_curso_password(uuid, boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_set_curso_password(
  p_id_curso uuid,
  p_requiere_password boolean,
  p_password text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $function$
BEGIN
  IF NOT public.can_manage_curso(p_id_curso) THEN
    RAISE EXCEPTION 'No autorizado para configurar la contraseña del curso';
  END IF;

  IF p_requiere_password AND length(trim(coalesce(p_password, ''))) = 0 THEN
    RAISE EXCEPTION 'La contraseña del curso es obligatoria';
  END IF;

  PERFORM set_config('app.allow_password_hash_write', 'on', true);

  UPDATE public.cursos
  SET
    requiere_password = p_requiere_password,
    password_hash = CASE
      WHEN p_requiere_password THEN crypt(p_password, gen_salt('bf'))
      ELSE NULL
    END
  WHERE id_curso = p_id_curso;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.rpc_set_curso_password(uuid, boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_inscribirse_curso(
  p_id_curso uuid,
  p_password text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $function$
DECLARE
  v_id_usuario uuid;
  v_id_inscripcion uuid;
  v_curso record;
  v_password text;
  v_curso_password_ok boolean;
  v_grupo_password_ok boolean;
BEGIN
  v_id_usuario := public.current_id_usuario();

  IF v_id_usuario IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  SELECT
    c.id_curso,
    c.id_cursillo,
    c.es_publicado,
    c.requiere_password AS curso_requiere_password,
    c.password_hash AS curso_password_hash,
    COALESCE(gc.requiere_password, false) AS grupo_requiere_password,
    gc.password_hash AS grupo_password_hash
  INTO v_curso
  FROM public.cursos c
  LEFT JOIN public.grupos_cursos gc ON gc.id_grupo_curso = c.id_grupo_curso
  WHERE c.id_curso = p_id_curso;

  IF v_curso.id_curso IS NULL THEN
    RAISE EXCEPTION 'Curso no encontrado';
  END IF;

  IF v_curso.es_publicado IS NOT TRUE THEN
    RAISE EXCEPTION 'El curso no está publicado';
  END IF;

  IF NOT public.has_cursillo_role(v_curso.id_cursillo, 'ESTUDIANTE') THEN
    RAISE EXCEPTION 'No autorizado para inscribirse en este curso';
  END IF;

  v_password := trim(coalesce(p_password, ''));

  IF v_curso.curso_requiere_password OR v_curso.grupo_requiere_password THEN
    IF v_password = '' THEN
      RAISE EXCEPTION 'La contraseña es obligatoria';
    END IF;

    v_curso_password_ok :=
      v_curso.curso_requiere_password
      AND v_curso.curso_password_hash IS NOT NULL
      AND crypt(v_password, v_curso.curso_password_hash) = v_curso.curso_password_hash;

    v_grupo_password_ok :=
      v_curso.grupo_requiere_password
      AND v_curso.grupo_password_hash IS NOT NULL
      AND crypt(v_password, v_curso.grupo_password_hash) = v_curso.grupo_password_hash;

    IF NOT (v_curso_password_ok OR v_grupo_password_ok) THEN
      IF v_curso.curso_requiere_password AND v_curso.grupo_requiere_password THEN
        RAISE EXCEPTION 'Contraseña incorrecta';
      ELSIF v_curso.curso_requiere_password THEN
        RAISE EXCEPTION 'Contraseña de curso incorrecta';
      ELSE
        RAISE EXCEPTION 'Contraseña de grupo incorrecta';
      END IF;
    END IF;
  END IF;

  SELECT i.id_inscripcion
  INTO v_id_inscripcion
  FROM public.inscripciones i
  WHERE i.id_usuario = v_id_usuario
    AND i.id_curso = p_id_curso
  LIMIT 1;

  IF v_id_inscripcion IS NOT NULL THEN
    RETURN v_id_inscripcion;
  END IF;

  INSERT INTO public.inscripciones (id_usuario, id_curso)
  VALUES (v_id_usuario, p_id_curso)
  RETURNING id_inscripcion INTO v_id_inscripcion;

  RETURN v_id_inscripcion;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.rpc_inscribirse_curso(uuid, text) TO authenticated;
