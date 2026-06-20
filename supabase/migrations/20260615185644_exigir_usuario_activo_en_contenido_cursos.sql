-- Disabled accounts must not retain course-content access.

CREATE OR REPLACE FUNCTION public.can_manage_curso(p_curso_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.cursos c
    WHERE c.id_curso = p_curso_id
      AND EXISTS (
        SELECT 1
        FROM public.usuarios u
        WHERE u.id_usuario = public.current_id_usuario()
          AND u.es_activo = true
      )
      AND (
        public.has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR')
        OR (
          public.has_cursillo_role(c.id_cursillo, 'DOCENTE')
          AND (
            c.id_docente = public.current_id_usuario()
            OR EXISTS (
              SELECT 1
              FROM public.curso_docentes_colaboradores cdc
              WHERE cdc.id_curso = c.id_curso
                AND cdc.id_docente = public.current_id_usuario()
            )
          )
        )
      )
  );
$function$;

CREATE OR REPLACE FUNCTION public.can_access_curso_content(p_curso_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.cursos c
    WHERE c.id_curso = p_curso_id
      AND EXISTS (
        SELECT 1
        FROM public.usuarios u
        WHERE u.id_usuario = public.current_id_usuario()
          AND u.es_activo = true
      )
      AND (
        public.can_manage_curso(c.id_curso)
        OR (
          c.es_publicado = true
          AND public.has_cursillo_role(c.id_cursillo, 'ESTUDIANTE')
          AND EXISTS (
            SELECT 1
            FROM public.inscripciones i
            WHERE i.id_curso = c.id_curso
              AND i.id_usuario = public.current_id_usuario()
          )
        )
      )
  );
$function$;

CREATE INDEX IF NOT EXISTS idx_adjuntos_leccion_id_leccion
  ON public.adjuntos_leccion (id_leccion);

CREATE INDEX IF NOT EXISTS idx_adjuntos_leccion_ruta_storage
  ON public.adjuntos_leccion (ruta_storage)
  WHERE ruta_storage IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lecciones_url_contenido
  ON public.lecciones (url_contenido)
  WHERE url_contenido IS NOT NULL;
