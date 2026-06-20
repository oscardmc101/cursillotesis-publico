-- =====================================================
-- Optimizacion dashboard principal
-- =====================================================
-- Consolida agregaciones y listados del dashboard en RPC para evitar
-- multiples round trips y joins/mapas en frontend.
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_dashboard_usuarios_cursillos_cursillo_estado
  ON public.usuarios_cursillos (id_cursillo, estado);

CREATE INDEX IF NOT EXISTS idx_dashboard_usuarios_cursillos_usuario_cursillo
  ON public.usuarios_cursillos (id_usuario, id_cursillo);

CREATE INDEX IF NOT EXISTS idx_dashboard_usuarios_cursillos_cursillo_rol_usuario
  ON public.usuarios_cursillos (id_cursillo, id_rol, id_usuario);

CREATE INDEX IF NOT EXISTS idx_dashboard_cursos_cursillo_publicado_fecha
  ON public.cursos (id_cursillo, es_publicado, fecha_creacion DESC);

CREATE INDEX IF NOT EXISTS idx_dashboard_inscripciones_usuario_curso
  ON public.inscripciones (id_usuario, id_curso);

CREATE INDEX IF NOT EXISTS idx_dashboard_inscripciones_curso_usuario
  ON public.inscripciones (id_curso, id_usuario);

CREATE INDEX IF NOT EXISTS idx_dashboard_modulos_curso
  ON public.modulos (id_curso);

CREATE INDEX IF NOT EXISTS idx_dashboard_lecciones_modulo
  ON public.lecciones (id_modulo);

CREATE INDEX IF NOT EXISTS idx_dashboard_tareas_leccion_fecha
  ON public.tareas (id_leccion, fecha_limite, fecha_creacion);

CREATE INDEX IF NOT EXISTS idx_dashboard_entregas_usuario_tarea_estado
  ON public.entregas_tareas (id_usuario, id_tarea, estado);

CREATE INDEX IF NOT EXISTS idx_dashboard_entregas_estado_fecha
  ON public.entregas_tareas (estado, fecha_entrega);

DROP FUNCTION IF EXISTS public.rpc_dashboard_staff(uuid);
CREATE OR REPLACE FUNCTION public.rpc_dashboard_staff(p_id_cursillo uuid)
RETURNS TABLE(
  pending_users bigint,
  total_users bigint,
  active_courses bigint,
  enrollments bigint,
  recent_activity jsonb
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
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  WITH recent_items AS (
    SELECT
      ('user-' || u.id_usuario::text) AS id,
      'user_registered'::text AS type,
      trim('Nuevo usuario registrado: ' || coalesce(u.nombres, '') || ' ' || coalesce(u.apellidos, '')) AS message,
      u.fecha_creacion AS timestamp
    FROM public.usuarios_cursillos uc
    JOIN public.usuarios u ON u.id_usuario = uc.id_usuario
    WHERE uc.id_cursillo = p_id_cursillo

    UNION ALL

    SELECT
      ('course-' || c.id_curso::text) AS id,
      'course_created'::text AS type,
      ('Nuevo curso: ' || c.titulo)::text AS message,
      c.fecha_creacion AS timestamp
    FROM public.cursos c
    WHERE c.id_cursillo = p_id_cursillo
  ),
  recent_activity AS (
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'type', type,
          'message', message,
          'timestamp', timestamp
        )
        ORDER BY timestamp DESC
      ),
      '[]'::jsonb
    ) AS items
    FROM (
      SELECT id, type, message, timestamp
      FROM recent_items
      ORDER BY timestamp DESC
      LIMIT 5
    ) ordered_items
  )
  SELECT
    (SELECT COUNT(*) FROM public.usuarios_cursillos WHERE id_cursillo = p_id_cursillo AND estado = 'PENDIENTE')::bigint AS pending_users,
    (SELECT COUNT(*) FROM public.usuarios_cursillos WHERE id_cursillo = p_id_cursillo)::bigint AS total_users,
    (SELECT COUNT(*) FROM public.cursos WHERE id_cursillo = p_id_cursillo AND es_publicado = true)::bigint AS active_courses,
    (
      SELECT COUNT(*)
      FROM public.inscripciones i
      JOIN public.cursos c ON c.id_curso = i.id_curso
      JOIN public.usuarios_cursillos uc
        ON uc.id_usuario = i.id_usuario
       AND uc.id_cursillo = c.id_cursillo
      JOIN public.roles r ON r.id_rol = uc.id_rol
      WHERE c.id_cursillo = p_id_cursillo
        AND UPPER(TRIM(r.nombre_rol)) = 'ESTUDIANTE'
    )::bigint AS enrollments,
    recent_activity.items
  FROM recent_activity;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.rpc_dashboard_staff(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.rpc_dashboard_tareas_pendientes(uuid);
CREATE OR REPLACE FUNCTION public.rpc_dashboard_tareas_pendientes(p_id_usuario uuid)
RETURNS TABLE(
  id_tarea uuid,
  id_leccion uuid,
  titulo text,
  descripcion text,
  fecha_limite timestamp with time zone,
  permite_reintentos boolean,
  max_reintentos integer,
  puntaje_maximo numeric,
  fecha_creacion timestamp with time zone,
  curso_titulo text,
  leccion_titulo text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_id_usuario <> public.current_id_usuario() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  SELECT
    t.id_tarea,
    t.id_leccion,
    t.titulo::text,
    t.descripcion::text,
    t.fecha_limite,
    t.permite_reintentos,
    t.max_reintentos,
    t.puntaje_maximo,
    t.fecha_creacion,
    c.titulo::text AS curso_titulo,
    l.titulo::text AS leccion_titulo
  FROM public.inscripciones i
  JOIN public.cursos c ON c.id_curso = i.id_curso
  JOIN public.modulos m ON m.id_curso = c.id_curso
  JOIN public.lecciones l ON l.id_modulo = m.id_modulo
  JOIN public.tareas t ON t.id_leccion = l.id_leccion
  WHERE i.id_usuario = p_id_usuario
    AND c.es_publicado = true
    AND NOT EXISTS (
      SELECT 1
      FROM public.entregas_tareas et
      WHERE et.id_tarea = t.id_tarea
        AND et.id_usuario = p_id_usuario
        AND et.estado = 'CALIFICADO'
    )
  ORDER BY t.fecha_limite ASC NULLS LAST, t.fecha_creacion ASC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.rpc_dashboard_tareas_pendientes(uuid) TO authenticated;

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
    AND (
      public.has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR')
      OR public.has_cursillo_role(c.id_cursillo, 'DOCENTE')
    )
  ORDER BY et.fecha_entrega ASC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.rpc_dashboard_entregas_por_calificar() TO authenticated;
