-- =====================================================
-- Docentes colaboradores por curso
-- =====================================================
-- Mantiene public.cursos.id_docente como propietario del curso para
-- compatibilidad y agrega docentes ayudantes con permisos de edicion.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.curso_docentes_colaboradores (
  id_curso_docente_colaborador uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_curso uuid NOT NULL REFERENCES public.cursos(id_curso) ON DELETE CASCADE,
  id_docente uuid NOT NULL REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE,
  fecha_asignacion timestamptz NOT NULL DEFAULT now(),
  fec_insercion timestamptz NULL,
  usu_insercion varchar NULL,
  fec_modificacion timestamptz NULL,
  usu_modificacion varchar NULL,
  CONSTRAINT curso_docentes_colaboradores_unq UNIQUE (id_curso, id_docente)
);

CREATE INDEX IF NOT EXISTS idx_curso_docentes_colaboradores_curso
  ON public.curso_docentes_colaboradores (id_curso);

CREATE INDEX IF NOT EXISTS idx_curso_docentes_colaboradores_docente
  ON public.curso_docentes_colaboradores (id_docente);

DROP TRIGGER IF EXISTS set_auditoria_campos ON public.curso_docentes_colaboradores;
CREATE TRIGGER set_auditoria_campos
  BEFORE INSERT OR UPDATE ON public.curso_docentes_colaboradores
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_set_auditoria_campos();

CREATE OR REPLACE FUNCTION public.is_usuario_docente_activo_en_cursillo(
  p_id_usuario uuid,
  p_id_cursillo uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios_cursillos uc
    JOIN public.roles r ON r.id_rol = uc.id_rol
    WHERE uc.id_usuario = p_id_usuario
      AND uc.id_cursillo = p_id_cursillo
      AND uc.estado = 'ACTIVO'
      AND UPPER(TRIM(r.nombre_rol)) = 'DOCENTE'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_usuario_staff_activo_en_cursillo(
  p_id_usuario uuid,
  p_id_cursillo uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios_cursillos uc
    JOIN public.roles r ON r.id_rol = uc.id_rol
    WHERE uc.id_usuario = p_id_usuario
      AND uc.id_cursillo = p_id_cursillo
      AND uc.estado = 'ACTIVO'
      AND UPPER(TRIM(r.nombre_rol)) IN ('ADMINISTRADOR', 'DOCENTE')
  );
$$;

CREATE OR REPLACE FUNCTION public.trg_validate_curso_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.id_docente IS NOT NULL
     AND NOT public.is_usuario_staff_activo_en_cursillo(NEW.id_docente, NEW.id_cursillo) THEN
    RAISE EXCEPTION 'El propietario del curso debe ser un administrador o docente activo del cursillo';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.id_docente IS DISTINCT FROM OLD.id_docente
       AND NOT public.has_cursillo_role(OLD.id_cursillo, 'ADMINISTRADOR') THEN
      RAISE EXCEPTION 'Solo un administrador puede cambiar el propietario del curso';
    END IF;

    IF NEW.id_cursillo IS DISTINCT FROM OLD.id_cursillo
       AND NOT public.has_cursillo_role(OLD.id_cursillo, 'ADMINISTRADOR') THEN
      RAISE EXCEPTION 'Solo un administrador puede cambiar el cursillo del curso';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_curso_owner ON public.cursos;
CREATE TRIGGER validate_curso_owner
  BEFORE INSERT OR UPDATE OF id_docente, id_cursillo ON public.cursos
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_validate_curso_owner();

CREATE OR REPLACE FUNCTION public.trg_validate_curso_docente_colaborador()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_cursillo uuid;
  v_id_propietario uuid;
BEGIN
  SELECT c.id_cursillo, c.id_docente
  INTO v_id_cursillo, v_id_propietario
  FROM public.cursos c
  WHERE c.id_curso = NEW.id_curso;

  IF v_id_cursillo IS NULL THEN
    RAISE EXCEPTION 'Curso no encontrado';
  END IF;

  IF NEW.id_docente = v_id_propietario THEN
    RAISE EXCEPTION 'El propietario ya tiene permisos sobre el curso';
  END IF;

  IF NOT public.is_usuario_docente_activo_en_cursillo(NEW.id_docente, v_id_cursillo) THEN
    RAISE EXCEPTION 'Solo se pueden asignar docentes activos como ayudantes';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_curso_docente_colaborador ON public.curso_docentes_colaboradores;
CREATE TRIGGER validate_curso_docente_colaborador
  BEFORE INSERT OR UPDATE OF id_curso, id_docente ON public.curso_docentes_colaboradores
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_validate_curso_docente_colaborador();

CREATE OR REPLACE FUNCTION public.is_curso_docente(p_curso_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cursos c
    WHERE c.id_curso = p_curso_id
      AND c.id_docente = public.current_id_usuario()
  )
  OR EXISTS (
    SELECT 1
    FROM public.curso_docentes_colaboradores cdc
    WHERE cdc.id_curso = p_curso_id
      AND cdc.id_docente = public.current_id_usuario()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_admin_or_own_curso(p_curso_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cursos c
    WHERE c.id_curso = p_curso_id
      AND (
        public.has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR')
        OR c.id_docente = public.current_id_usuario()
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_curso(p_curso_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cursos c
    WHERE c.id_curso = p_curso_id
      AND (
        public.has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR')
        OR c.id_docente = public.current_id_usuario()
        OR EXISTS (
          SELECT 1
          FROM public.curso_docentes_colaboradores cdc
          WHERE cdc.id_curso = c.id_curso
            AND cdc.id_docente = public.current_id_usuario()
        )
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_usuario_docente_activo_en_cursillo(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_usuario_staff_activo_en_cursillo(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_admin_or_own_curso(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_curso(uuid) TO authenticated;

ALTER TABLE public.curso_docentes_colaboradores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "curso_docentes_colaboradores_select" ON public.curso_docentes_colaboradores;
CREATE POLICY "curso_docentes_colaboradores_select"
ON public.curso_docentes_colaboradores
FOR SELECT
USING (
  public.can_manage_curso(id_curso)
  OR id_docente = public.current_id_usuario()
);

DROP POLICY IF EXISTS "curso_docentes_colaboradores_insert" ON public.curso_docentes_colaboradores;
CREATE POLICY "curso_docentes_colaboradores_insert"
ON public.curso_docentes_colaboradores
FOR INSERT
WITH CHECK (public.can_admin_or_own_curso(id_curso));

DROP POLICY IF EXISTS "curso_docentes_colaboradores_update" ON public.curso_docentes_colaboradores;
CREATE POLICY "curso_docentes_colaboradores_update"
ON public.curso_docentes_colaboradores
FOR UPDATE
USING (public.can_admin_or_own_curso(id_curso))
WITH CHECK (public.can_admin_or_own_curso(id_curso));

DROP POLICY IF EXISTS "curso_docentes_colaboradores_delete" ON public.curso_docentes_colaboradores;
CREATE POLICY "curso_docentes_colaboradores_delete"
ON public.curso_docentes_colaboradores
FOR DELETE
USING (public.can_admin_or_own_curso(id_curso));

CREATE OR REPLACE FUNCTION public.rpc_set_curso_colaboradores(
  p_id_curso uuid,
  p_docente_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_cursillo uuid;
  v_id_propietario uuid;
  v_docente_id uuid;
  v_docente_ids uuid[];
BEGIN
  SELECT c.id_cursillo, c.id_docente
  INTO v_id_cursillo, v_id_propietario
  FROM public.cursos c
  WHERE c.id_curso = p_id_curso;

  IF v_id_cursillo IS NULL THEN
    RAISE EXCEPTION 'Curso no encontrado';
  END IF;

  IF NOT public.can_admin_or_own_curso(p_id_curso) THEN
    RAISE EXCEPTION 'No autorizado para administrar docentes ayudantes';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT x.id_docente), ARRAY[]::uuid[])
  INTO v_docente_ids
  FROM unnest(COALESCE(p_docente_ids, ARRAY[]::uuid[])) AS x(id_docente)
  WHERE x.id_docente IS NOT NULL
    AND x.id_docente IS DISTINCT FROM v_id_propietario;

  FOREACH v_docente_id IN ARRAY v_docente_ids LOOP
    IF NOT public.is_usuario_docente_activo_en_cursillo(v_docente_id, v_id_cursillo) THEN
      RAISE EXCEPTION 'Solo se pueden asignar docentes activos como ayudantes';
    END IF;
  END LOOP;

  DELETE FROM public.curso_docentes_colaboradores cdc
  WHERE cdc.id_curso = p_id_curso
    AND NOT (cdc.id_docente = ANY(v_docente_ids));

  INSERT INTO public.curso_docentes_colaboradores (id_curso, id_docente)
  SELECT p_id_curso, x.id_docente
  FROM unnest(v_docente_ids) AS x(id_docente)
  ON CONFLICT (id_curso, id_docente) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_set_curso_colaboradores(uuid, uuid[]) TO authenticated;

-- =====================================================
-- RLS: cursos y contenido editable por propietario,
-- administrador o docente colaborador.
-- =====================================================

DROP POLICY IF EXISTS "cursos_update_docente" ON public.cursos;
CREATE POLICY "cursos_update_docente"
ON public.cursos
FOR UPDATE
USING (public.can_manage_curso(id_curso))
WITH CHECK (public.can_manage_curso(id_curso));

DROP POLICY IF EXISTS "cursos_delete_docente" ON public.cursos;
CREATE POLICY "cursos_delete_docente"
ON public.cursos
FOR DELETE
USING (
  id_docente = public.current_id_usuario()
);

DROP POLICY IF EXISTS "modulos_insert" ON public.modulos;
CREATE POLICY "modulos_insert" ON public.modulos
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cursos c
    WHERE c.id_curso = modulos.id_curso
      AND public.can_manage_curso(c.id_curso)
  )
);

DROP POLICY IF EXISTS "modulos_update" ON public.modulos;
CREATE POLICY "modulos_update" ON public.modulos
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.cursos c
    WHERE c.id_curso = modulos.id_curso
      AND public.can_manage_curso(c.id_curso)
  )
);

DROP POLICY IF EXISTS "modulos_delete" ON public.modulos;
CREATE POLICY "modulos_delete" ON public.modulos
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.cursos c
    WHERE c.id_curso = modulos.id_curso
      AND public.can_manage_curso(c.id_curso)
  )
);

CREATE OR REPLACE FUNCTION public.can_manage_leccion(p_leccion_id uuid)
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
    WHERE l.id_leccion = p_leccion_id
      AND public.can_manage_curso(c.id_curso)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_tarea(p_tarea_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tareas t
    JOIN public.lecciones l ON l.id_leccion = t.id_leccion
    JOIN public.modulos m ON m.id_modulo = l.id_modulo
    JOIN public.cursos c ON c.id_curso = m.id_curso
    WHERE t.id_tarea = p_tarea_id
      AND public.can_manage_curso(c.id_curso)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_evaluacion(p_evaluacion_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.evaluaciones ev
    JOIN public.lecciones l ON l.id_leccion = ev.id_leccion
    JOIN public.modulos m ON m.id_modulo = l.id_modulo
    JOIN public.cursos c ON c.id_curso = m.id_curso
    WHERE ev.id_evaluacion = p_evaluacion_id
      AND public.can_manage_curso(c.id_curso)
  );
$$;

DROP POLICY IF EXISTS "lecciones_insert" ON public.lecciones;
CREATE POLICY "lecciones_insert" ON public.lecciones
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.modulos m
    JOIN public.cursos c ON c.id_curso = m.id_curso
    WHERE m.id_modulo = lecciones.id_modulo
      AND public.can_manage_curso(c.id_curso)
  )
);

DROP POLICY IF EXISTS "lecciones_update" ON public.lecciones;
CREATE POLICY "lecciones_update" ON public.lecciones
FOR UPDATE USING (public.can_manage_leccion(id_leccion));

DROP POLICY IF EXISTS "lecciones_delete" ON public.lecciones;
CREATE POLICY "lecciones_delete" ON public.lecciones
FOR DELETE USING (public.can_manage_leccion(id_leccion));

DROP POLICY IF EXISTS "adjuntos_insert" ON public.adjuntos_leccion;
CREATE POLICY "adjuntos_insert" ON public.adjuntos_leccion
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.lecciones l
    WHERE l.id_leccion = adjuntos_leccion.id_leccion
      AND public.can_manage_leccion(l.id_leccion)
  )
);

DROP POLICY IF EXISTS "adjuntos_delete" ON public.adjuntos_leccion;
CREATE POLICY "adjuntos_delete" ON public.adjuntos_leccion
FOR DELETE USING (
  EXISTS (
    SELECT 1
    FROM public.lecciones l
    WHERE l.id_leccion = adjuntos_leccion.id_leccion
      AND public.can_manage_leccion(l.id_leccion)
  )
);

DROP POLICY IF EXISTS "certificados_select_admin_docente" ON public.certificados_curso;
CREATE POLICY "certificados_select_admin_docente" ON public.certificados_curso
FOR SELECT USING (public.can_manage_curso(id_curso));

DROP POLICY IF EXISTS "certificados_insert_admin_docente" ON public.certificados_curso;
CREATE POLICY "certificados_insert_admin_docente" ON public.certificados_curso
FOR INSERT WITH CHECK (public.can_manage_curso(id_curso));

DROP POLICY IF EXISTS "certificados_update_admin_docente" ON public.certificados_curso;
CREATE POLICY "certificados_update_admin_docente" ON public.certificados_curso
FOR UPDATE USING (public.can_manage_curso(id_curso));

DROP POLICY IF EXISTS "certificados_delete_admin_docente" ON public.certificados_curso;
CREATE POLICY "certificados_delete_admin_docente" ON public.certificados_curso
FOR DELETE USING (public.can_manage_curso(id_curso));

-- Password de curso: editable por cualquier gestor del curso.
CREATE OR REPLACE FUNCTION public.rpc_set_curso_password(
  p_id_curso uuid,
  p_requiere_password boolean,
  p_password text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.can_manage_curso(p_id_curso) THEN
    RAISE EXCEPTION 'No autorizado para configurar la contrasena del curso';
  END IF;

  IF p_requiere_password AND length(trim(coalesce(p_password, ''))) = 0 THEN
    RAISE EXCEPTION 'La contrasena del curso es obligatoria';
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

-- Tampering de entregas: los colaboradores tambien pueden calificar.
CREATE OR REPLACE FUNCTION public.trg_prevent_entregas_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user uuid;
  v_is_manager boolean;
BEGIN
  v_current_user := current_id_usuario();

  IF NEW.id_usuario = v_current_user THEN
    SELECT EXISTS (
      SELECT 1
      FROM tareas t
      JOIN lecciones l ON l.id_leccion = t.id_leccion
      JOIN modulos m ON m.id_modulo = l.id_modulo
      JOIN cursos c ON c.id_curso = m.id_curso
      WHERE t.id_tarea = NEW.id_tarea
        AND public.can_manage_curso(c.id_curso)
    ) INTO v_is_manager;

    IF NOT v_is_manager THEN
      IF NEW.calificacion IS DISTINCT FROM OLD.calificacion THEN
        RAISE EXCEPTION 'No autorizado: no puedes modificar la calificacion';
      END IF;
      IF NEW.comentario_docente IS DISTINCT FROM OLD.comentario_docente THEN
        RAISE EXCEPTION 'No autorizado: no puedes modificar el comentario del docente';
      END IF;
      IF NEW.estado = 'CALIFICADO' AND OLD.estado != 'CALIFICADO' THEN
        RAISE EXCEPTION 'No autorizado: no puedes marcar como calificado';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.rpc_list_inscritos_curso(uuid);
CREATE OR REPLACE FUNCTION public.rpc_list_inscritos_curso(p_id_curso uuid)
 RETURNS TABLE(id_inscripcion uuid, fecha_inscripcion timestamp with time zone, id_usuario uuid, nombres text, apellidos text, correo text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.can_manage_curso(p_id_curso) THEN
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
  JOIN public.cursos c ON c.id_curso = i.id_curso
  JOIN public.usuarios_cursillos uc
    ON uc.id_usuario = u.id_usuario
   AND uc.id_cursillo = c.id_cursillo
  JOIN public.roles r ON r.id_rol = uc.id_rol
  WHERE i.id_curso = p_id_curso
    AND UPPER(TRIM(r.nombre_rol)) = 'ESTUDIANTE'
  ORDER BY i.fecha_inscripcion DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.rpc_list_inscritos_curso(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.rpc_list_all_inscripciones(uuid);
CREATE OR REPLACE FUNCTION public.rpc_list_all_inscripciones(p_id_cursillo uuid)
RETURNS TABLE(
  id_inscripcion uuid,
  fecha_inscripcion timestamp with time zone,
  id_usuario uuid,
  nombres text,
  apellidos text,
  correo text,
  id_curso uuid,
  titulo_curso text,
  id_grupo_curso uuid,
  nombre_grupo text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
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
    c.titulo::text AS titulo_curso,
    c.id_grupo_curso,
    COALESCE(gc.nombre, 'Sin grupo')::text AS nombre_grupo
  FROM public.inscripciones i
  JOIN public.usuarios u ON u.id_usuario = i.id_usuario
  JOIN public.cursos c ON c.id_curso = i.id_curso
  LEFT JOIN public.grupos_cursos gc ON gc.id_grupo_curso = c.id_grupo_curso
  JOIN public.usuarios_cursillos uc
    ON uc.id_usuario = u.id_usuario
   AND uc.id_cursillo = c.id_cursillo
  JOIN public.roles r ON r.id_rol = uc.id_rol
  WHERE c.id_cursillo = p_id_cursillo
    AND UPPER(TRIM(r.nombre_rol)) = 'ESTUDIANTE'
    AND (
      public.has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR')
      OR public.is_curso_docente(c.id_curso)
    )
  ORDER BY i.fecha_inscripcion DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.rpc_list_all_inscripciones(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.rpc_get_cursos_reporte();
CREATE OR REPLACE FUNCTION public.rpc_get_cursos_reporte()
RETURNS TABLE(
  id_curso uuid,
  titulo text,
  id_grupo_curso uuid,
  nombre_grupo text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    c.id_curso,
    c.titulo::text,
    c.id_grupo_curso,
    COALESCE(gc.nombre, 'Sin grupo')::text AS nombre_grupo
  FROM public.cursos c
  LEFT JOIN public.grupos_cursos gc ON gc.id_grupo_curso = c.id_grupo_curso
  WHERE public.has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR')
     OR public.is_curso_docente(c.id_curso)
  ORDER BY COALESCE(gc.orden, 999999), COALESCE(gc.nombre, 'Sin grupo'), c.titulo;
$function$;

GRANT EXECUTE ON FUNCTION public.rpc_get_cursos_reporte() TO authenticated;

DROP FUNCTION IF EXISTS public.rpc_dashboard_entregas_por_calificar();
CREATE OR REPLACE FUNCTION public.rpc_dashboard_entregas_por_calificar()
RETURNS TABLE(
  id_entrega uuid,
  id_tarea uuid,
  id_usuario uuid,
  comentario_estudiante text,
  estado text,
  calificacion numeric,
  comentario_docente text,
  retroalimentacion_archivo_url text,
  fecha_entrega timestamp with time zone,
  tarea_titulo text,
  curso_titulo text,
  usuario_nombres text,
  usuario_apellidos text,
  usuario_correo text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.usuarios_cursillos uc
    JOIN public.roles r ON r.id_rol = uc.id_rol
    WHERE uc.id_usuario = public.current_id_usuario()
      AND uc.estado = 'ACTIVO'
      AND UPPER(TRIM(r.nombre_rol)) IN ('ADMINISTRADOR', 'DOCENTE')
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  SELECT
    et.id_entrega,
    et.id_tarea,
    et.id_usuario,
    et.comentario_estudiante::text,
    et.estado::text,
    et.calificacion,
    et.comentario_docente::text,
    et.retroalimentacion_archivo_url::text,
    et.fecha_entrega,
    t.titulo::text AS tarea_titulo,
    c.titulo::text AS curso_titulo,
    u.nombres::text AS usuario_nombres,
    u.apellidos::text AS usuario_apellidos,
    u.correo::text AS usuario_correo
  FROM public.entregas_tareas et
  JOIN public.tareas t ON t.id_tarea = et.id_tarea
  JOIN public.lecciones l ON l.id_leccion = t.id_leccion
  JOIN public.modulos m ON m.id_modulo = l.id_modulo
  JOIN public.cursos c ON c.id_curso = m.id_curso
  JOIN public.usuarios u ON u.id_usuario = et.id_usuario
  WHERE et.estado IN ('ENVIADO', 'CALIFICADO')
    AND public.can_manage_curso(c.id_curso)
  ORDER BY et.fecha_entrega ASC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.rpc_dashboard_entregas_por_calificar() TO authenticated;
