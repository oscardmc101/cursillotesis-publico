-- Calculate question performance by earned points, not only by boolean correctness.

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
      pe.tipo::text AS tipo_pregunta,
      pe.puntaje::numeric AS puntaje_pregunta
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
        WHERE ie.id_intento IS NOT NULL
          AND ri.es_correcta IS NOT NULL
          AND p.puntaje_pregunta > 0
          AND COALESCE(ri.puntaje_obtenido, 0) >= p.puntaje_pregunta
      ))::integer AS respuestas_correctas,
      (COUNT(ri.id_respuesta) FILTER (
        WHERE ie.id_intento IS NOT NULL
          AND ri.es_correcta IS NOT NULL
          AND (p.puntaje_pregunta <= 0 OR COALESCE(ri.puntaje_obtenido, 0) < p.puntaje_pregunta)
      ))::integer AS respuestas_incorrectas,
      COALESCE(SUM(
        CASE
          WHEN ie.id_intento IS NOT NULL AND ri.es_correcta IS NOT NULL
            THEN LEAST(GREATEST(COALESCE(ri.puntaje_obtenido, 0), 0), p.puntaje_pregunta)
          ELSE 0::numeric
        END
      ), 0)::numeric AS puntaje_obtenido_total,
      COALESCE(SUM(
        CASE
          WHEN ie.id_intento IS NOT NULL AND ri.es_correcta IS NOT NULL
            THEN GREATEST(p.puntaje_pregunta, 0)
          ELSE 0::numeric
        END
      ), 0)::numeric AS puntaje_posible_total
    FROM preguntas p
    LEFT JOIN public.respuestas_intento ri ON ri.id_pregunta = p.id_pregunta
    LEFT JOIN public.intentos_evaluacion ie
      ON ie.id_intento = ri.id_intento
     AND ie.id_evaluacion = p_id_evaluacion
     AND ie.estado IN ('CORREGIDO', 'AUTOCORREGIDO')
    GROUP BY p.id_pregunta, p.numero_pregunta, p.pregunta, p.tipo_pregunta
  ),
  calculados AS (
    SELECT
      a.*,
      CASE
        WHEN a.total_respuestas = 0 OR a.puntaje_posible_total <= 0 THEN 0::numeric
        ELSE ROUND((a.puntaje_obtenido_total / a.puntaje_posible_total) * 100, 2)
      END AS aciertos,
      CASE
        WHEN a.total_respuestas = 0 OR a.puntaje_posible_total <= 0 THEN 0::numeric
        ELSE ROUND(((a.puntaje_posible_total - a.puntaje_obtenido_total) / a.puntaje_posible_total) * 100, 2)
      END AS errores
    FROM agregados a
  )
  SELECT
    c.id_pregunta,
    c.numero_pregunta,
    c.pregunta,
    c.tipo_pregunta,
    c.total_respuestas,
    c.respuestas_correctas,
    c.respuestas_incorrectas,
    c.aciertos AS porcentaje_aciertos,
    c.errores AS porcentaje_errores,
    CASE
      WHEN c.total_respuestas = 0 OR c.puntaje_posible_total <= 0 THEN 'Sin datos'
      WHEN c.aciertos >= 70 THEN 'Facil'
      WHEN c.aciertos >= 40 THEN 'Media'
      ELSE 'Dificil'
    END AS nivel_dificultad
  FROM calculados c
  ORDER BY c.numero_pregunta;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.rpc_reporte_rendimiento_pregunta(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_reporte_rendimiento_pregunta(uuid) TO authenticated;
