-- =====================================================
-- Reclamos sobre correcciones de evaluaciones
-- =====================================================

ALTER TABLE public.intentos_evaluacion
DROP CONSTRAINT IF EXISTS intentos_evaluacion_estado_check;

ALTER TABLE public.intentos_evaluacion
ADD CONSTRAINT intentos_evaluacion_estado_check
CHECK (estado IN ('EN_PROGRESO', 'COMPLETADO', 'CORREGIDO', 'AUTOCORREGIDO', 'RECLAMADO'));

CREATE TABLE IF NOT EXISTS public.reclamos_evaluacion (
  id_reclamo uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_intento uuid NOT NULL REFERENCES public.intentos_evaluacion(id_intento) ON DELETE CASCADE,
  id_respuesta uuid NOT NULL REFERENCES public.respuestas_intento(id_respuesta) ON DELETE CASCADE,
  id_estudiante uuid NOT NULL REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE,
  justificacion text NOT NULL,
  estado text NOT NULL DEFAULT 'PENDIENTE',
  puntaje_original numeric NOT NULL DEFAULT 0,
  puntaje_resuelto numeric NULL,
  respuesta_docente text NULL,
  id_docente_resolutor uuid NULL REFERENCES public.usuarios(id_usuario),
  fecha_reclamo timestamptz NOT NULL DEFAULT now(),
  fecha_resolucion timestamptz NULL,
  fec_insercion timestamptz NULL,
  fec_modificacion timestamptz NULL,
  usu_insercion varchar NULL,
  usu_modificacion varchar NULL,
  CONSTRAINT reclamos_evaluacion_estado_check
    CHECK (estado IN ('PENDIENTE', 'ACEPTADO', 'RECHAZADO'))
);

CREATE UNIQUE INDEX IF NOT EXISTS reclamos_evaluacion_unq_pendiente_intento
  ON public.reclamos_evaluacion (id_intento)
  WHERE estado = 'PENDIENTE';

CREATE INDEX IF NOT EXISTS idx_reclamos_evaluacion_intento
  ON public.reclamos_evaluacion (id_intento);

CREATE INDEX IF NOT EXISTS idx_reclamos_evaluacion_respuesta
  ON public.reclamos_evaluacion (id_respuesta);

CREATE INDEX IF NOT EXISTS idx_reclamos_evaluacion_estudiante
  ON public.reclamos_evaluacion (id_estudiante);

DROP TRIGGER IF EXISTS set_auditoria_campos ON public.reclamos_evaluacion;
CREATE TRIGGER set_auditoria_campos
  BEFORE INSERT OR UPDATE ON public.reclamos_evaluacion
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_set_auditoria_campos();

ALTER TABLE public.reclamos_evaluacion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reclamos_select_own" ON public.reclamos_evaluacion;
CREATE POLICY "reclamos_select_own"
ON public.reclamos_evaluacion
FOR SELECT
USING (id_estudiante = public.current_id_usuario());

DROP POLICY IF EXISTS "reclamos_select_admin_docente" ON public.reclamos_evaluacion;
CREATE POLICY "reclamos_select_admin_docente"
ON public.reclamos_evaluacion
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.intentos_evaluacion i
    WHERE i.id_intento = reclamos_evaluacion.id_intento
      AND public.can_manage_evaluacion(i.id_evaluacion)
  )
);

DROP POLICY IF EXISTS "reclamos_update_admin_docente" ON public.reclamos_evaluacion;
CREATE POLICY "reclamos_update_admin_docente"
ON public.reclamos_evaluacion
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.intentos_evaluacion i
    WHERE i.id_intento = reclamos_evaluacion.id_intento
      AND public.can_manage_evaluacion(i.id_evaluacion)
  )
);

CREATE OR REPLACE FUNCTION public.trg_prevent_intentos_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user uuid;
  v_is_manager boolean;
  v_allow_reclamo boolean;
BEGIN
  v_current_user := current_id_usuario();
  v_allow_reclamo := coalesce(current_setting('app.allow_reclamo_evaluacion', true), '') = 'on';

  IF NEW.id_usuario = v_current_user THEN
    SELECT can_manage_evaluacion(NEW.id_evaluacion) INTO v_is_manager;

    IF NOT v_is_manager THEN
      IF v_allow_reclamo
         AND OLD.estado IN ('CORREGIDO', 'AUTOCORREGIDO')
         AND NEW.estado = 'RECLAMADO'
         AND NEW.puntaje_obtenido IS NOT DISTINCT FROM OLD.puntaje_obtenido THEN
        RETURN NEW;
      END IF;

      IF NEW.puntaje_obtenido IS DISTINCT FROM OLD.puntaje_obtenido THEN
        RAISE EXCEPTION 'No autorizado: no puedes modificar el puntaje';
      END IF;
      IF NEW.estado IS DISTINCT FROM OLD.estado THEN
        RAISE EXCEPTION 'No autorizado: usa el boton de enviar para completar tu evaluacion';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

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

GRANT EXECUTE ON FUNCTION public.rpc_enviar_reclamo_evaluacion(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_resolver_reclamo_evaluacion(uuid, text) TO authenticated;
