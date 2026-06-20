-- =====================================================
-- Fix visible notifications for evaluation claims
-- =====================================================

CREATE OR REPLACE FUNCTION public.rpc_enviar_reclamo_evaluacion(
  p_id_respuesta uuid,
  p_justificacion text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_usuario uuid;
  v_reclamo_id uuid;
  v_respuesta record;
  v_gestor record;
BEGIN
  v_id_usuario := public.current_id_usuario();

  IF v_id_usuario IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF length(trim(coalesce(p_justificacion, ''))) = 0 THEN
    RAISE EXCEPTION 'La justificacion es obligatoria';
  END IF;

  SELECT
    r.id_respuesta,
    r.id_intento,
    r.puntaje_obtenido,
    i.id_usuario,
    i.estado,
    i.id_evaluacion,
    ev.titulo AS evaluacion_titulo,
    c.id_curso,
    c.id_cursillo,
    c.id_docente
  INTO v_respuesta
  FROM public.respuestas_intento r
  JOIN public.intentos_evaluacion i ON i.id_intento = r.id_intento
  JOIN public.evaluaciones ev ON ev.id_evaluacion = i.id_evaluacion
  JOIN public.lecciones l ON l.id_leccion = ev.id_leccion
  JOIN public.modulos m ON m.id_modulo = l.id_modulo
  JOIN public.cursos c ON c.id_curso = m.id_curso
  WHERE r.id_respuesta = p_id_respuesta;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Respuesta no encontrada';
  END IF;

  IF v_respuesta.id_usuario IS DISTINCT FROM v_id_usuario THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF v_respuesta.estado NOT IN ('CORREGIDO', 'AUTOCORREGIDO') THEN
    RAISE EXCEPTION 'Solo se pueden reclamar evaluaciones corregidas';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.reclamos_evaluacion re
    WHERE re.id_intento = v_respuesta.id_intento
      AND re.estado = 'PENDIENTE'
  ) THEN
    RAISE EXCEPTION 'Ya existe un reclamo pendiente para este intento';
  END IF;

  INSERT INTO public.reclamos_evaluacion (
    id_intento,
    id_respuesta,
    id_estudiante,
    justificacion,
    puntaje_original
  )
  VALUES (
    v_respuesta.id_intento,
    v_respuesta.id_respuesta,
    v_id_usuario,
    trim(p_justificacion),
    coalesce(v_respuesta.puntaje_obtenido, 0)
  )
  RETURNING id_reclamo INTO v_reclamo_id;

  PERFORM set_config('app.allow_reclamo_evaluacion', 'on', true);

  UPDATE public.intentos_evaluacion
  SET estado = 'RECLAMADO'
  WHERE id_intento = v_respuesta.id_intento;

  FOR v_gestor IN
    WITH gestores AS (
      SELECT uc.id_usuario
      FROM public.usuarios_cursillos uc
      JOIN public.roles ro ON ro.id_rol = uc.id_rol
      WHERE uc.id_cursillo = v_respuesta.id_cursillo
        AND uc.estado = 'ACTIVO'
        AND UPPER(TRIM(ro.nombre_rol)) = 'ADMINISTRADOR'

      UNION

      SELECT c.id_docente AS id_usuario
      FROM public.cursos c
      WHERE c.id_curso = v_respuesta.id_curso
        AND c.id_docente IS NOT NULL

      UNION

      SELECT cdc.id_docente AS id_usuario
      FROM public.curso_docentes_colaboradores cdc
      WHERE cdc.id_curso = v_respuesta.id_curso
    )
    SELECT DISTINCT id_usuario
    FROM gestores
    WHERE id_usuario IS NOT NULL
  LOOP
    INSERT INTO public.notificaciones (id_usuario, id_cursillo, tipo, titulo, mensaje, link)
    VALUES (
      v_gestor.id_usuario,
      v_respuesta.id_cursillo,
      'RECLAMO_EVALUACION',
      'Nuevo reclamo de evaluacion',
      'Un estudiante reclamo una correccion en "' || coalesce(v_respuesta.evaluacion_titulo, 'Evaluacion') || '".',
      '/correcciones/evaluacion/' || v_respuesta.id_intento::text
    );
  END LOOP;

  RETURN v_reclamo_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_resolver_reclamo_evaluacion(
  p_id_intento uuid,
  p_respuesta_docente text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_docente uuid;
  v_reclamo record;
  v_puntaje_resuelto numeric;
  v_estado_reclamo text;
BEGIN
  v_id_docente := public.current_id_usuario();

  IF v_id_docente IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT
    re.id_reclamo,
    re.id_respuesta,
    re.id_estudiante,
    re.puntaje_original,
    i.id_evaluacion,
    c.id_cursillo
  INTO v_reclamo
  FROM public.reclamos_evaluacion re
  JOIN public.intentos_evaluacion i ON i.id_intento = re.id_intento
  JOIN public.evaluaciones ev ON ev.id_evaluacion = i.id_evaluacion
  JOIN public.lecciones l ON l.id_leccion = ev.id_leccion
  JOIN public.modulos m ON m.id_modulo = l.id_modulo
  JOIN public.cursos c ON c.id_curso = m.id_curso
  WHERE re.id_intento = p_id_intento
    AND re.estado = 'PENDIENTE'
  ORDER BY re.fecha_reclamo DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No hay reclamo pendiente para este intento';
  END IF;

  IF NOT public.can_manage_evaluacion(v_reclamo.id_evaluacion) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT coalesce(r.puntaje_obtenido, 0)
  INTO v_puntaje_resuelto
  FROM public.respuestas_intento r
  WHERE r.id_respuesta = v_reclamo.id_respuesta;

  v_estado_reclamo := CASE
    WHEN v_puntaje_resuelto IS DISTINCT FROM v_reclamo.puntaje_original THEN 'ACEPTADO'
    ELSE 'RECHAZADO'
  END;

  UPDATE public.reclamos_evaluacion
  SET
    estado = v_estado_reclamo,
    puntaje_resuelto = v_puntaje_resuelto,
    respuesta_docente = nullif(trim(coalesce(p_respuesta_docente, '')), ''),
    id_docente_resolutor = v_id_docente,
    fecha_resolucion = now()
  WHERE id_reclamo = v_reclamo.id_reclamo;

  UPDATE public.intentos_evaluacion
  SET estado = 'CORREGIDO'
  WHERE id_intento = p_id_intento;

  INSERT INTO public.notificaciones (id_usuario, id_cursillo, tipo, titulo, mensaje, link)
  VALUES (
    v_reclamo.id_estudiante,
    v_reclamo.id_cursillo,
    'RECLAMO_EVALUACION_RESUELTO',
    'Reclamo resuelto',
    CASE
      WHEN v_estado_reclamo = 'ACEPTADO' THEN 'Tu reclamo fue aceptado y la correccion fue actualizada.'
      ELSE 'Tu reclamo fue revisado y la correccion se mantiene.'
    END,
    '/mis-correcciones'
  );

  RETURN v_reclamo.id_reclamo;
END;
$$;

WITH reclamos_pendientes AS (
  SELECT
    re.id_reclamo,
    re.id_intento,
    ev.titulo AS evaluacion_titulo,
    c.id_curso,
    c.id_cursillo,
    c.id_docente
  FROM public.reclamos_evaluacion re
  JOIN public.intentos_evaluacion i ON i.id_intento = re.id_intento
  JOIN public.evaluaciones ev ON ev.id_evaluacion = i.id_evaluacion
  JOIN public.lecciones l ON l.id_leccion = ev.id_leccion
  JOIN public.modulos m ON m.id_modulo = l.id_modulo
  JOIN public.cursos c ON c.id_curso = m.id_curso
  WHERE re.estado = 'PENDIENTE'
),
gestores AS (
  SELECT DISTINCT
    rp.id_reclamo,
    rp.id_intento,
    rp.evaluacion_titulo,
    rp.id_cursillo,
    uc.id_usuario
  FROM reclamos_pendientes rp
  JOIN public.usuarios_cursillos uc ON uc.id_cursillo = rp.id_cursillo
  JOIN public.roles ro ON ro.id_rol = uc.id_rol
  WHERE uc.estado = 'ACTIVO'
    AND UPPER(TRIM(ro.nombre_rol)) = 'ADMINISTRADOR'

  UNION

  SELECT DISTINCT
    rp.id_reclamo,
    rp.id_intento,
    rp.evaluacion_titulo,
    rp.id_cursillo,
    rp.id_docente AS id_usuario
  FROM reclamos_pendientes rp
  WHERE rp.id_docente IS NOT NULL

  UNION

  SELECT DISTINCT
    rp.id_reclamo,
    rp.id_intento,
    rp.evaluacion_titulo,
    rp.id_cursillo,
    cdc.id_docente AS id_usuario
  FROM reclamos_pendientes rp
  JOIN public.curso_docentes_colaboradores cdc ON cdc.id_curso = rp.id_curso
)
INSERT INTO public.notificaciones (id_usuario, id_cursillo, tipo, titulo, mensaje, link)
SELECT
  g.id_usuario,
  g.id_cursillo,
  'RECLAMO_EVALUACION',
  'Nuevo reclamo de evaluacion',
  'Un estudiante reclamo una correccion en "' || coalesce(g.evaluacion_titulo, 'Evaluacion') || '".',
  '/correcciones/evaluacion/' || g.id_intento::text
FROM gestores g
WHERE g.id_usuario IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.notificaciones n
    WHERE n.id_usuario = g.id_usuario
      AND n.id_cursillo = g.id_cursillo
      AND n.tipo = 'RECLAMO_EVALUACION'
      AND n.link = '/correcciones/evaluacion/' || g.id_intento::text
  );

GRANT EXECUTE ON FUNCTION public.rpc_enviar_reclamo_evaluacion(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_resolver_reclamo_evaluacion(uuid, text) TO authenticated;
