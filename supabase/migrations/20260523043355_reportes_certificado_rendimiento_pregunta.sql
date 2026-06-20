-- =====================================================
-- Reportes: certificado de estudios y rendimiento por pregunta
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_reportes_intentos_eval_estado
  ON public.intentos_evaluacion (id_evaluacion, estado, id_intento);

CREATE INDEX IF NOT EXISTS idx_reportes_respuestas_pregunta_intento
  ON public.respuestas_intento (id_pregunta, id_intento);

CREATE OR REPLACE FUNCTION public.rpc_certificado_estudios(
  p_id_cursillo uuid,
  p_id_curso uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
  id_curso uuid,
  curso_titulo text,
  id_grupo_curso uuid,
  grupo_nombre text,
  modulo_titulo text,
  leccion_titulo text,
  tipo_actividad text,
  id_actividad uuid,
  actividad_titulo text,
  estado text,
  puntaje_obtenido numeric,
  puntaje_maximo numeric,
  porcentaje numeric,
  fecha_resultado timestamp with time zone,
  incluye_promedio boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id_usuario uuid := public.current_id_usuario();
BEGIN
  IF v_id_usuario IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF p_id_curso IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.inscripciones i
    JOIN public.cursos c ON c.id_curso = i.id_curso
    WHERE i.id_usuario = v_id_usuario
      AND i.id_curso = p_id_curso
      AND c.id_cursillo = p_id_cursillo
  ) THEN
    RAISE EXCEPTION 'No autorizado para consultar este curso';
  END IF;

  RETURN QUERY
  WITH cursos_inscriptos AS (
    SELECT
      c.id_curso,
      c.titulo::text AS curso_titulo,
      c.id_grupo_curso,
      COALESCE(gc.nombre, 'Sin grupo')::text AS grupo_nombre
    FROM public.inscripciones i
    JOIN public.cursos c ON c.id_curso = i.id_curso
    LEFT JOIN public.grupos_cursos gc ON gc.id_grupo_curso = c.id_grupo_curso
    WHERE i.id_usuario = v_id_usuario
      AND c.id_cursillo = p_id_cursillo
      AND (p_id_curso IS NULL OR c.id_curso = p_id_curso)
  )
  SELECT
    ci.id_curso,
    ci.curso_titulo,
    ci.id_grupo_curso,
    ci.grupo_nombre,
    m.titulo::text AS modulo_titulo,
    l.titulo::text AS leccion_titulo,
    'TAREA'::text AS tipo_actividad,
    t.id_tarea AS id_actividad,
    t.titulo::text AS actividad_titulo,
    CASE
      WHEN et.estado = 'CALIFICADO' THEN 'CALIFICADO'
      WHEN et.estado = 'ENVIADO' THEN 'PENDIENTE_CORRECCION'
      WHEN et.id_entrega IS NULL AND t.fecha_limite IS NOT NULL AND t.fecha_limite < now() THEN 'VENCIDO'
      ELSE 'SIN_PRESENTAR'
    END AS estado,
    CASE WHEN et.estado = 'CALIFICADO' THEN et.calificacion ELSE NULL::numeric END AS puntaje_obtenido,
    t.puntaje_maximo AS puntaje_maximo,
    CASE
      WHEN et.estado = 'CALIFICADO' AND t.puntaje_maximo > 0
        THEN ROUND((et.calificacion / t.puntaje_maximo) * 100, 2)
      ELSE NULL::numeric
    END AS porcentaje,
    CASE WHEN et.estado = 'CALIFICADO' THEN COALESCE(et.fecha_correccion, et.fecha_entrega) ELSE et.fecha_entrega END AS fecha_resultado,
    (et.estado = 'CALIFICADO') AS incluye_promedio
  FROM cursos_inscriptos ci
  JOIN public.modulos m ON m.id_curso = ci.id_curso
  JOIN public.lecciones l ON l.id_modulo = m.id_modulo
  JOIN public.tareas t ON t.id_leccion = l.id_leccion
  LEFT JOIN LATERAL (
    SELECT e.*
    FROM public.entregas_tareas e
    WHERE e.id_tarea = t.id_tarea
      AND e.id_usuario = v_id_usuario
    ORDER BY e.fecha_entrega DESC
    LIMIT 1
  ) et ON true

  UNION ALL

  SELECT
    ci.id_curso,
    ci.curso_titulo,
    ci.id_grupo_curso,
    ci.grupo_nombre,
    m.titulo::text AS modulo_titulo,
    l.titulo::text AS leccion_titulo,
    'EVALUACION'::text AS tipo_actividad,
    ev.id_evaluacion AS id_actividad,
    ev.titulo::text AS actividad_titulo,
    CASE
      WHEN latest.estado = 'RECLAMADO' THEN 'EN_REVISION'
      WHEN final.id_intento IS NOT NULL THEN 'CALIFICADO'
      WHEN latest.estado = 'COMPLETADO' THEN 'PENDIENTE_CORRECCION'
      WHEN latest.estado = 'EN_PROGRESO' THEN 'EN_PROGRESO'
      ELSE 'SIN_PRESENTAR'
    END AS estado,
    CASE
      WHEN latest.estado = 'RECLAMADO' THEN latest.puntaje_obtenido
      WHEN final.id_intento IS NOT NULL THEN final.puntaje_obtenido
      ELSE NULL::numeric
    END AS puntaje_obtenido,
    COALESCE(total_eval.puntaje_total, 0)::numeric AS puntaje_maximo,
    CASE
      WHEN latest.estado = 'RECLAMADO' AND COALESCE(total_eval.puntaje_total, 0) > 0
        THEN ROUND((latest.puntaje_obtenido / total_eval.puntaje_total) * 100, 2)
      WHEN final.id_intento IS NOT NULL AND COALESCE(total_eval.puntaje_total, 0) > 0
        THEN ROUND((final.puntaje_obtenido / total_eval.puntaje_total) * 100, 2)
      ELSE NULL::numeric
    END AS porcentaje,
    COALESCE(final.fecha_envio, latest.fecha_envio) AS fecha_resultado,
    (final.id_intento IS NOT NULL AND COALESCE(latest.estado, '') <> 'RECLAMADO') AS incluye_promedio
  FROM cursos_inscriptos ci
  JOIN public.modulos m ON m.id_curso = ci.id_curso
  JOIN public.lecciones l ON l.id_modulo = m.id_modulo
  JOIN public.evaluaciones ev ON ev.id_leccion = l.id_leccion
  LEFT JOIN LATERAL (
    SELECT i.*
    FROM public.intentos_evaluacion i
    WHERE i.id_evaluacion = ev.id_evaluacion
      AND i.id_usuario = v_id_usuario
    ORDER BY i.fecha_inicio DESC
    LIMIT 1
  ) latest ON true
  LEFT JOIN LATERAL (
    SELECT i.*
    FROM public.intentos_evaluacion i
    WHERE i.id_evaluacion = ev.id_evaluacion
      AND i.id_usuario = v_id_usuario
      AND i.estado IN ('CORREGIDO', 'AUTOCORREGIDO')
    ORDER BY i.puntaje_obtenido DESC, i.fecha_envio DESC NULLS LAST
    LIMIT 1
  ) final ON true
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(pe.puntaje), 0)::numeric AS puntaje_total
    FROM public.preguntas_evaluacion pe
    WHERE pe.id_evaluacion = ev.id_evaluacion
  ) total_eval ON true
  ORDER BY curso_titulo, modulo_titulo, leccion_titulo, tipo_actividad, actividad_titulo;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.rpc_certificado_estudios(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_certificado_estudios(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_get_evaluaciones_reporte(p_id_curso uuid)
RETURNS TABLE(
  id_evaluacion uuid,
  titulo text,
  id_leccion uuid,
  leccion_titulo text,
  modulo_titulo text,
  total_preguntas integer,
  total_intentos_finales integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.can_manage_curso(p_id_curso) THEN
    RAISE EXCEPTION 'No autorizado para consultar evaluaciones de este curso';
  END IF;

  RETURN QUERY
  SELECT
    ev.id_evaluacion,
    ev.titulo::text,
    l.id_leccion,
    l.titulo::text AS leccion_titulo,
    m.titulo::text AS modulo_titulo,
    COUNT(DISTINCT pe.id_pregunta)::integer AS total_preguntas,
    (COUNT(DISTINCT ie.id_intento) FILTER (WHERE ie.estado IN ('CORREGIDO', 'AUTOCORREGIDO')))::integer AS total_intentos_finales
  FROM public.evaluaciones ev
  JOIN public.lecciones l ON l.id_leccion = ev.id_leccion
  JOIN public.modulos m ON m.id_modulo = l.id_modulo
  LEFT JOIN public.preguntas_evaluacion pe ON pe.id_evaluacion = ev.id_evaluacion
  LEFT JOIN public.intentos_evaluacion ie ON ie.id_evaluacion = ev.id_evaluacion
  WHERE m.id_curso = p_id_curso
  GROUP BY ev.id_evaluacion, ev.titulo, l.id_leccion, l.titulo, m.titulo, m.orden, l.orden, ev.fecha_creacion
  ORDER BY m.orden, l.orden, ev.fecha_creacion, ev.titulo;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.rpc_get_evaluaciones_reporte(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_evaluaciones_reporte(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_reporte_rendimiento_pregunta(p_id_evaluacion uuid)
RETURNS TABLE(
  id_pregunta uuid,
  numero_pregunta integer,
  pregunta text,
  tipo_pregunta text,
  total_respuestas integer,
  respuestas_correctas integer,
  respuestas_incorrectas integer,
  porcentaje_aciertos numeric,
  porcentaje_errores numeric,
  nivel_dificultad text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.can_manage_evaluacion(p_id_evaluacion) THEN
    RAISE EXCEPTION 'No autorizado para ver este reporte';
  END IF;

  RETURN QUERY
  WITH preguntas AS (
    SELECT
      pe.id_pregunta,
      (ROW_NUMBER() OVER (ORDER BY pe.fec_insercion NULLS LAST, pe.id_pregunta))::integer AS numero_pregunta,
      pe.enunciado::text AS pregunta,
      pe.tipo::text AS tipo_pregunta
    FROM public.preguntas_evaluacion pe
    WHERE pe.id_evaluacion = p_id_evaluacion
  ),
  agregados AS (
    SELECT
      p.id_pregunta,
      p.numero_pregunta,
      p.pregunta,
      p.tipo_pregunta,
      (COUNT(ri.id_respuesta) FILTER (
        WHERE ie.id_intento IS NOT NULL AND ri.es_correcta IS NOT NULL
      ))::integer AS total_respuestas,
      (COUNT(ri.id_respuesta) FILTER (
        WHERE ie.id_intento IS NOT NULL AND ri.es_correcta = true
      ))::integer AS respuestas_correctas,
      (COUNT(ri.id_respuesta) FILTER (
        WHERE ie.id_intento IS NOT NULL AND ri.es_correcta = false
      ))::integer AS respuestas_incorrectas
    FROM preguntas p
    LEFT JOIN public.respuestas_intento ri ON ri.id_pregunta = p.id_pregunta
    LEFT JOIN public.intentos_evaluacion ie
      ON ie.id_intento = ri.id_intento
     AND ie.id_evaluacion = p_id_evaluacion
     AND ie.estado IN ('CORREGIDO', 'AUTOCORREGIDO')
    GROUP BY p.id_pregunta, p.numero_pregunta, p.pregunta, p.tipo_pregunta
  )
  SELECT
    a.id_pregunta,
    a.numero_pregunta,
    a.pregunta,
    a.tipo_pregunta,
    a.total_respuestas,
    a.respuestas_correctas,
    a.respuestas_incorrectas,
    CASE
      WHEN a.total_respuestas = 0 THEN 0::numeric
      ELSE ROUND((a.respuestas_correctas::numeric / a.total_respuestas::numeric) * 100, 2)
    END AS porcentaje_aciertos,
    CASE
      WHEN a.total_respuestas = 0 THEN 0::numeric
      ELSE ROUND((a.respuestas_incorrectas::numeric / a.total_respuestas::numeric) * 100, 2)
    END AS porcentaje_errores,
    CASE
      WHEN a.total_respuestas = 0 THEN 'Sin datos'
      WHEN ROUND((a.respuestas_correctas::numeric / a.total_respuestas::numeric) * 100, 2) >= 70 THEN 'Facil'
      WHEN ROUND((a.respuestas_correctas::numeric / a.total_respuestas::numeric) * 100, 2) >= 40 THEN 'Media'
      ELSE 'Dificil'
    END AS nivel_dificultad
  FROM agregados a
  ORDER BY a.numero_pregunta;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.rpc_reporte_rendimiento_pregunta(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_reporte_rendimiento_pregunta(uuid) TO authenticated;
