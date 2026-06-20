-- Allow the server-side submit RPC to update the final score while keeping
-- direct student updates to puntaje_obtenido blocked.

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
  r record;
BEGIN
  SELECT ie.id_usuario, ie.id_evaluacion, ie.estado
  INTO v_id_usuario, v_id_evaluacion, v_estado
  FROM public.intentos_evaluacion ie
  WHERE ie.id_intento = p_id_intento;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Intento no encontrado';
  END IF;

  IF v_id_usuario IS DISTINCT FROM public.current_id_usuario() THEN
    RAISE EXCEPTION 'No autorizado: este intento no te pertenece';
  END IF;

  IF v_estado != 'EN_PROGRESO' THEN
    RAISE EXCEPTION 'Este intento ya fue enviado';
  END IF;

  FOR r IN
    SELECT
      pe.id_pregunta,
      pe.tipo,
      pe.puntaje,
      ri.id_respuesta,
      ri.id_opcion,
      ri.respuesta_texto
    FROM public.preguntas_evaluacion pe
    LEFT JOIN public.respuestas_intento ri
      ON ri.id_pregunta = pe.id_pregunta
      AND ri.id_intento = p_id_intento
    WHERE pe.id_evaluacion = v_id_evaluacion
  LOOP
    IF r.tipo = 'OPCION_MULTIPLE' THEN
      IF r.id_opcion IS NOT NULL AND EXISTS (
        SELECT 1
        FROM public.opciones_pregunta op
        WHERE op.id_opcion = r.id_opcion
          AND op.id_pregunta = r.id_pregunta
          AND op.es_correcta = true
      ) THEN
        v_puntaje := v_puntaje + r.puntaje;

        UPDATE public.respuestas_intento
        SET es_correcta = true,
            puntaje_obtenido = r.puntaje
        WHERE id_respuesta = r.id_respuesta;
      ELSIF r.id_respuesta IS NOT NULL THEN
        UPDATE public.respuestas_intento
        SET es_correcta = false,
            puntaje_obtenido = 0
        WHERE id_respuesta = r.id_respuesta;
      END IF;
    ELSIF r.tipo = 'ABIERTA' THEN
      v_tiene_abiertas := true;
    END IF;
  END LOOP;

  IF v_tiene_abiertas THEN
    v_estado_final := 'COMPLETADO';
  ELSE
    v_estado_final := 'AUTOCORREGIDO';
  END IF;

  PERFORM set_config('app.allow_submit_intento', 'on', true);

  UPDATE public.intentos_evaluacion
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
  v_allow_submit boolean;
BEGIN
  v_current_user := public.current_id_usuario();
  v_allow_reclamo := coalesce(current_setting('app.allow_reclamo_evaluacion', true), '') = 'on';
  v_allow_submit := coalesce(current_setting('app.allow_submit_intento', true), '') = 'on';

  IF NEW.id_usuario = v_current_user THEN
    SELECT public.can_manage_evaluacion(NEW.id_evaluacion) INTO v_is_manager;

    IF NOT v_is_manager THEN
      IF v_allow_submit
         AND OLD.estado = 'EN_PROGRESO'
         AND NEW.estado IN ('COMPLETADO', 'AUTOCORREGIDO')
         AND NEW.id_intento IS NOT DISTINCT FROM OLD.id_intento
         AND NEW.id_usuario IS NOT DISTINCT FROM OLD.id_usuario
         AND NEW.id_evaluacion IS NOT DISTINCT FROM OLD.id_evaluacion
         AND NEW.fecha_inicio IS NOT DISTINCT FROM OLD.fecha_inicio THEN
        RETURN NEW;
      END IF;

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

GRANT EXECUTE ON FUNCTION public.rpc_submit_intento(uuid) TO authenticated;
