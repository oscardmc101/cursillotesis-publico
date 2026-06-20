-- =====================================================
-- AUDITORÍA DE SEGURIDAD CRÍTICA
-- Fixes: autocorrección server-side, tampering prevention,
--        notificaciones RLS, usuarios_cursillos privilege escalation
-- =====================================================

-- =====================================================
-- 1. RPC: Autocorrección server-side para evaluaciones
-- El cliente ya NO debe conocer es_correcta ni calcular puntaje
-- =====================================================
CREATE OR REPLACE FUNCTION public.rpc_submit_intento(p_id_intento uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_usuario uuid;
  v_id_evaluacion uuid;
  v_estado text;
  v_puntaje numeric := 0;
  v_tiene_abiertas boolean := false;
  v_estado_final text;
  r RECORD;
BEGIN
  -- 1. Validar que el intento pertenece al usuario actual y está EN_PROGRESO
  SELECT ie.id_usuario, ie.id_evaluacion, ie.estado
  INTO v_id_usuario, v_id_evaluacion, v_estado
  FROM intentos_evaluacion ie
  WHERE ie.id_intento = p_id_intento;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Intento no encontrado';
  END IF;

  IF v_id_usuario != current_id_usuario() THEN
    RAISE EXCEPTION 'No autorizado: este intento no te pertenece';
  END IF;

  IF v_estado != 'EN_PROGRESO' THEN
    RAISE EXCEPTION 'Este intento ya fue enviado';
  END IF;

  -- 2. Iterar preguntas y calcular puntaje para opción múltiple
  FOR r IN
    SELECT
      pe.id_pregunta,
      pe.tipo,
      pe.puntaje,
      ri.id_respuesta,
      ri.id_opcion,
      ri.respuesta_texto
    FROM preguntas_evaluacion pe
    LEFT JOIN respuestas_intento ri
      ON ri.id_pregunta = pe.id_pregunta AND ri.id_intento = p_id_intento
    WHERE pe.id_evaluacion = v_id_evaluacion
  LOOP
    IF r.tipo = 'OPCION_MULTIPLE' THEN
      -- Verificar si la opción seleccionada es correcta
      IF r.id_opcion IS NOT NULL AND EXISTS (
        SELECT 1 FROM opciones_pregunta op
        WHERE op.id_opcion = r.id_opcion
          AND op.id_pregunta = r.id_pregunta
          AND op.es_correcta = true
      ) THEN
        -- Respuesta correcta
        v_puntaje := v_puntaje + r.puntaje;
        UPDATE respuestas_intento
        SET es_correcta = true, puntaje_obtenido = r.puntaje
        WHERE id_respuesta = r.id_respuesta;
      ELSE
        -- Respuesta incorrecta o sin responder
        IF r.id_respuesta IS NOT NULL THEN
          UPDATE respuestas_intento
          SET es_correcta = false, puntaje_obtenido = 0
          WHERE id_respuesta = r.id_respuesta;
        END IF;
      END IF;
    ELSIF r.tipo = 'ABIERTA' THEN
      v_tiene_abiertas := true;
      -- Dejar es_correcta = null (pendiente de revisión manual)
    END IF;
  END LOOP;

  -- 3. Determinar estado final
  IF v_tiene_abiertas THEN
    v_estado_final := 'COMPLETADO';  -- Pendiente de revisión docente
  ELSE
    v_estado_final := 'AUTOCORREGIDO';  -- Todas fueron opción múltiple
  END IF;

  -- 4. Actualizar el intento
  UPDATE intentos_evaluacion
  SET estado = v_estado_final,
      puntaje_obtenido = v_puntaje,
      fecha_envio = now()
  WHERE id_intento = p_id_intento;

  RETURN jsonb_build_object(
    'puntaje_obtenido', v_puntaje,
    'estado', v_estado_final,
    'tiene_abiertas', v_tiene_abiertas
  );
END;
$$;

-- =====================================================
-- 2. Ocultar es_correcta de estudiantes
-- =====================================================
DROP POLICY IF EXISTS "opciones_select_enrolled" ON public.opciones_pregunta;

CREATE OR REPLACE VIEW public.opciones_pregunta_estudiante AS
SELECT id_opcion, id_pregunta, texto
FROM public.opciones_pregunta;

GRANT SELECT ON public.opciones_pregunta_estudiante TO authenticated;

CREATE POLICY "opciones_select_enrolled"
ON public.opciones_pregunta
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.preguntas_evaluacion p
    WHERE p.id_pregunta = opciones_pregunta.id_pregunta
      AND public.is_enrolled_in_evaluacion_course(p.id_evaluacion)
  )
);

-- =====================================================
-- 3. Trigger: prevenir tampering de calificacion en entregas_tareas
-- =====================================================
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
        AND (
          has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR')
          OR c.id_docente = v_current_user
        )
    ) INTO v_is_manager;

    IF NOT v_is_manager THEN
      IF NEW.calificacion IS DISTINCT FROM OLD.calificacion THEN
        RAISE EXCEPTION 'No autorizado: no puedes modificar la calificación';
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

DROP TRIGGER IF EXISTS prevent_entregas_tampering ON public.entregas_tareas;
CREATE TRIGGER prevent_entregas_tampering
  BEFORE UPDATE ON public.entregas_tareas
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_prevent_entregas_tampering();

-- =====================================================
-- 4. Trigger: prevenir tampering de puntaje en intentos_evaluacion
-- =====================================================
CREATE OR REPLACE FUNCTION public.trg_prevent_intentos_tampering()
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
    SELECT can_manage_evaluacion(NEW.id_evaluacion) INTO v_is_manager;

    IF NOT v_is_manager THEN
      IF NEW.puntaje_obtenido IS DISTINCT FROM OLD.puntaje_obtenido THEN
        RAISE EXCEPTION 'No autorizado: no puedes modificar el puntaje';
      END IF;
      IF NEW.estado IS DISTINCT FROM OLD.estado THEN
        RAISE EXCEPTION 'No autorizado: usa el botón de enviar para completar tu evaluación';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_intentos_tampering ON public.intentos_evaluacion;
CREATE TRIGGER prevent_intentos_tampering
  BEFORE UPDATE ON public.intentos_evaluacion
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_prevent_intentos_tampering();

-- =====================================================
-- 5. Corregir RLS notificaciones
-- =====================================================
DROP POLICY IF EXISTS "notificaciones_select_own" ON public.notificaciones;
CREATE POLICY "notificaciones_select_own" ON public.notificaciones
FOR SELECT USING (
  id_usuario = public.current_id_usuario()
);

DROP POLICY IF EXISTS "notificaciones_update_own" ON public.notificaciones;
CREATE POLICY "notificaciones_update_own" ON public.notificaciones
FOR UPDATE USING (
  id_usuario = public.current_id_usuario()
) WITH CHECK (
  id_usuario = public.current_id_usuario()
);

-- =====================================================
-- 6. Corregir RLS usuarios_cursillos — privilege escalation
-- =====================================================
DROP POLICY IF EXISTS "Docentes pueden actualizar estado de estudiantes" ON public.usuarios_cursillos;

CREATE POLICY "Docentes pueden actualizar estado de estudiantes"
ON public.usuarios_cursillos
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios_cursillos uc2
    JOIN public.roles r ON uc2.id_rol = r.id_rol
    WHERE uc2.id_usuario = public.current_id_usuario()
      AND uc2.id_cursillo = usuarios_cursillos.id_cursillo
      AND r.nombre_rol = 'DOCENTE'
      AND uc2.estado = 'ACTIVO'
  )
  AND EXISTS (
    SELECT 1 FROM public.roles r2
    WHERE r2.id_rol = usuarios_cursillos.id_rol
      AND r2.nombre_rol = 'ESTUDIANTE'
  )
)
WITH CHECK (
  estado IN ('PENDIENTE', 'ACTIVO', 'BLOQUEADO', 'RECHAZADO')
  AND EXISTS (
    SELECT 1 FROM public.roles r2
    WHERE r2.id_rol = usuarios_cursillos.id_rol
      AND r2.nombre_rol = 'ESTUDIANTE'
  )
);
