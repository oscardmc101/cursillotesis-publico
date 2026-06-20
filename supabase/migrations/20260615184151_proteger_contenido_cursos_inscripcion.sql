-- Require enrollment before students can access course content.
-- Administrators and assigned/collaborating teachers keep management access.

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

CREATE OR REPLACE FUNCTION public.can_access_leccion_content(p_leccion_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.lecciones l
    JOIN public.modulos m ON m.id_modulo = l.id_modulo
    JOIN public.cursos c ON c.id_curso = m.id_curso
    WHERE l.id_leccion = p_leccion_id
      AND (
        public.can_manage_curso(c.id_curso)
        OR (
          l.es_publicada = true
          AND public.can_access_curso_content(c.id_curso)
        )
      )
  );
$function$;

-- Keep compatibility with existing RPCs that use the older helper names.
CREATE OR REPLACE FUNCTION public.can_view_curso(p_id_curso uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
  SELECT public.can_access_curso_content(p_id_curso);
$function$;

CREATE OR REPLACE FUNCTION public.can_view_leccion(p_id_leccion uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
  SELECT public.can_access_leccion_content(p_id_leccion);
$function$;

-- Published course metadata remains visible only to active cursillo members.
DROP POLICY IF EXISTS "cursos_select_publicados" ON public.cursos;
CREATE POLICY "cursos_select_publicados"
ON public.cursos
FOR SELECT
TO authenticated
USING (
  es_publicado = true
  AND (
    public.has_cursillo_role(id_cursillo, 'ADMINISTRADOR')
    OR public.has_cursillo_role(id_cursillo, 'DOCENTE')
    OR public.has_cursillo_role(id_cursillo, 'ESTUDIANTE')
  )
);

DROP POLICY IF EXISTS "modulos_select" ON public.modulos;
CREATE POLICY "modulos_select"
ON public.modulos
FOR SELECT
TO authenticated
USING (public.can_access_curso_content(id_curso));

DROP POLICY IF EXISTS "lecciones_select" ON public.lecciones;
CREATE POLICY "lecciones_select"
ON public.lecciones
FOR SELECT
TO authenticated
USING (public.can_access_leccion_content(id_leccion));

DROP POLICY IF EXISTS "adjuntos_select" ON public.adjuntos_leccion;
CREATE POLICY "adjuntos_select"
ON public.adjuntos_leccion
FOR SELECT
TO authenticated
USING (public.can_access_leccion_content(id_leccion));

DROP POLICY IF EXISTS "comentarios_select" ON public.comentarios_leccion;
CREATE POLICY "comentarios_select"
ON public.comentarios_leccion
FOR SELECT
TO authenticated
USING (public.can_access_leccion_content(id_leccion));

DROP POLICY IF EXISTS "comentarios_insert" ON public.comentarios_leccion;
CREATE POLICY "comentarios_insert"
ON public.comentarios_leccion
FOR INSERT
TO authenticated
WITH CHECK (
  id_usuario = public.current_id_usuario()
  AND public.can_access_leccion_content(id_leccion)
);

DROP POLICY IF EXISTS "comentarios_delete" ON public.comentarios_leccion;
CREATE POLICY "comentarios_delete"
ON public.comentarios_leccion
FOR DELETE
TO authenticated
USING (
  public.can_manage_leccion(id_leccion)
  OR (
    id_usuario = public.current_id_usuario()
    AND public.can_access_leccion_content(id_leccion)
  )
);

-- Progress is readable and writable only while the user can access the lesson.
DROP POLICY IF EXISTS "progreso_select_own" ON public.progreso_lecciones;
CREATE POLICY "progreso_select_own"
ON public.progreso_lecciones
FOR SELECT
TO authenticated
USING (
  id_usuario = public.current_id_usuario()
  AND public.can_access_leccion_content(id_leccion)
);

DROP POLICY IF EXISTS "progreso_select_admin_docente" ON public.progreso_lecciones;
CREATE POLICY "progreso_select_admin_docente"
ON public.progreso_lecciones
FOR SELECT
TO authenticated
USING (public.can_manage_leccion(id_leccion));

DROP POLICY IF EXISTS "progreso_insert_own" ON public.progreso_lecciones;
CREATE POLICY "progreso_insert_own"
ON public.progreso_lecciones
FOR INSERT
TO authenticated
WITH CHECK (
  id_usuario = public.current_id_usuario()
  AND public.can_access_leccion_content(id_leccion)
);

DROP POLICY IF EXISTS "progreso_update_own" ON public.progreso_lecciones;
CREATE POLICY "progreso_update_own"
ON public.progreso_lecciones
FOR UPDATE
TO authenticated
USING (
  id_usuario = public.current_id_usuario()
  AND public.can_access_leccion_content(id_leccion)
)
WITH CHECK (
  id_usuario = public.current_id_usuario()
  AND public.can_access_leccion_content(id_leccion)
);

DROP POLICY IF EXISTS "progreso_delete_own" ON public.progreso_lecciones;
CREATE POLICY "progreso_delete_own"
ON public.progreso_lecciones
FOR DELETE
TO authenticated
USING (
  id_usuario = public.current_id_usuario()
  AND public.can_access_leccion_content(id_leccion)
);

-- Direct enrollment is allowed only for active students and courses without a password.
DROP POLICY IF EXISTS "inscripciones_insert" ON public.inscripciones;
CREATE POLICY "inscripciones_insert"
ON public.inscripciones
FOR INSERT
TO authenticated
WITH CHECK (
  id_usuario = public.current_id_usuario()
  AND EXISTS (
    SELECT 1
    FROM public.cursos c
    LEFT JOIN public.grupos_cursos gc ON gc.id_grupo_curso = c.id_grupo_curso
    WHERE c.id_curso = inscripciones.id_curso
      AND c.es_publicado = true
      AND c.requiere_password = false
      AND COALESCE(gc.requiere_password, false) = false
      AND public.has_cursillo_role(c.id_cursillo, 'ESTUDIANTE')
  )
);

-- Enrolled helpers must also enforce active membership and published lessons.
CREATE OR REPLACE FUNCTION public.is_enrolled_in_tarea_course(p_tarea_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.tareas t
    JOIN public.lecciones l ON l.id_leccion = t.id_leccion
    JOIN public.modulos m ON m.id_modulo = l.id_modulo
    JOIN public.cursos c ON c.id_curso = m.id_curso
    JOIN public.inscripciones i ON i.id_curso = c.id_curso
    WHERE t.id_tarea = p_tarea_id
      AND i.id_usuario = public.current_id_usuario()
      AND public.has_cursillo_role(c.id_cursillo, 'ESTUDIANTE')
      AND public.can_access_leccion_content(l.id_leccion)
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_enrolled_in_evaluacion_course(p_evaluacion_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.evaluaciones ev
    JOIN public.lecciones l ON l.id_leccion = ev.id_leccion
    JOIN public.modulos m ON m.id_modulo = l.id_modulo
    JOIN public.cursos c ON c.id_curso = m.id_curso
    JOIN public.inscripciones i ON i.id_curso = c.id_curso
    WHERE ev.id_evaluacion = p_evaluacion_id
      AND i.id_usuario = public.current_id_usuario()
      AND public.has_cursillo_role(c.id_cursillo, 'ESTUDIANTE')
      AND public.can_access_leccion_content(l.id_leccion)
  );
$function$;

DROP POLICY IF EXISTS "tareas_select_admin_docente" ON public.tareas;
CREATE POLICY "tareas_select_admin_docente"
ON public.tareas
FOR SELECT
TO authenticated
USING (public.can_manage_tarea(id_tarea));

DROP POLICY IF EXISTS "evaluaciones_select_admin_docente" ON public.evaluaciones;
CREATE POLICY "evaluaciones_select_admin_docente"
ON public.evaluaciones
FOR SELECT
TO authenticated
USING (public.can_manage_evaluacion(id_evaluacion));

-- Normalize public Storage URLs to object paths before making the bucket private.
UPDATE public.lecciones
SET url_contenido = regexp_replace(
  split_part(url_contenido, '?', 1),
  '^.*/storage/v1/object/(public|authenticated|sign)/contenido_lecciones/',
  ''
)
WHERE url_contenido LIKE '%/storage/v1/object/%/contenido_lecciones/%';

UPDATE public.adjuntos_leccion
SET ruta_storage = regexp_replace(
  split_part(ruta_storage, '?', 1),
  '^.*/storage/v1/object/(public|authenticated|sign)/contenido_lecciones/',
  ''
)
WHERE ruta_storage LIKE '%/storage/v1/object/%/contenido_lecciones/%';

CREATE OR REPLACE FUNCTION public.can_read_contenido_lecciones(p_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public, storage
AS $function$
  SELECT
    CASE
      WHEN (storage.foldername(p_name))[1] = 'lecciones'
        AND COALESCE((storage.foldername(p_name))[2], '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN public.can_access_leccion_content(((storage.foldername(p_name))[2])::uuid)
      ELSE EXISTS (
        SELECT 1
        FROM public.lecciones l
        WHERE l.url_contenido = p_name
          AND public.can_access_leccion_content(l.id_leccion)
      )
      OR EXISTS (
        SELECT 1
        FROM public.adjuntos_leccion a
        WHERE a.ruta_storage = p_name
          AND public.can_access_leccion_content(a.id_leccion)
      )
    END;
$function$;

CREATE OR REPLACE FUNCTION public.can_write_contenido_lecciones(p_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public, storage
AS $function$
  SELECT
    CASE
      WHEN (storage.foldername(p_name))[1] = 'lecciones'
        AND COALESCE((storage.foldername(p_name))[2], '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN public.can_manage_leccion(((storage.foldername(p_name))[2])::uuid)
      ELSE EXISTS (
        SELECT 1
        FROM public.lecciones l
        WHERE l.url_contenido = p_name
          AND public.can_manage_leccion(l.id_leccion)
      )
      OR EXISTS (
        SELECT 1
        FROM public.adjuntos_leccion a
        WHERE a.ruta_storage = p_name
          AND public.can_manage_leccion(a.id_leccion)
      )
    END;
$function$;

UPDATE storage.buckets
SET public = false
WHERE id = 'contenido_lecciones';

DROP POLICY IF EXISTS "contenido_lecciones_select" ON storage.objects;
DROP POLICY IF EXISTS "contenido_lecciones_insert" ON storage.objects;
DROP POLICY IF EXISTS "contenido_lecciones_update" ON storage.objects;
DROP POLICY IF EXISTS "contenido_lecciones_delete" ON storage.objects;

CREATE POLICY "contenido_lecciones_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'contenido_lecciones'
  AND public.can_read_contenido_lecciones(name)
);

CREATE POLICY "contenido_lecciones_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'contenido_lecciones'
  AND public.can_write_contenido_lecciones(name)
);

CREATE POLICY "contenido_lecciones_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'contenido_lecciones'
  AND public.can_write_contenido_lecciones(name)
)
WITH CHECK (
  bucket_id = 'contenido_lecciones'
  AND public.can_write_contenido_lecciones(name)
);

CREATE POLICY "contenido_lecciones_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'contenido_lecciones'
  AND public.can_write_contenido_lecciones(name)
);

-- Restrict security-definer helpers/RPCs to authenticated callers.
REVOKE ALL ON FUNCTION public.can_manage_curso(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_curso_content(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_leccion_content(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_view_curso(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_view_leccion(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_read_contenido_lecciones(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_write_contenido_lecciones(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rpc_inscribirse_curso(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rpc_list_comentarios_leccion_publicos(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.can_manage_curso(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_curso_content(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_leccion_content(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_curso(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_leccion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_contenido_lecciones(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_write_contenido_lecciones(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_inscribirse_curso(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_list_comentarios_leccion_publicos(uuid) TO authenticated;
