-- =====================================================
-- FUNCIONES RPC PARA REPORTES - FASE 8
-- =====================================================

-- Tipo para retorno de progreso de estudiante
CREATE TYPE public.reporte_progreso_estudiante_row AS (
  tipo text,
  id uuid,
  titulo text,
  modulo text,
  estado text,
  fecha_entrega timestamptz,
  fecha_limite timestamptz,
  calificacion numeric,
  puntaje_maximo numeric,
  intentos integer,
  intentos_max integer
);

-- Función: Obtener progreso detallado de un estudiante en un curso
CREATE OR REPLACE FUNCTION public.rpc_reporte_progreso_estudiante(
  p_id_curso uuid,
  p_id_usuario uuid
)
RETURNS SETOF public.reporte_progreso_estudiante_row
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar permisos: solo admin o docente del cursillo/curso
  IF NOT EXISTS (
    SELECT 1 FROM cursos c
    WHERE c.id_curso = p_id_curso
    AND (
      has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR')
      OR has_cursillo_role(c.id_cursillo, 'DOCENTE')
    )
  ) THEN
    RAISE EXCEPTION 'No autorizado para ver este reporte';
  END IF;

  -- Verificar que el estudiante esté inscrito
  IF NOT EXISTS (
    SELECT 1 FROM inscripciones i
    WHERE i.id_curso = p_id_curso AND i.id_usuario = p_id_usuario
  ) THEN
    RAISE EXCEPTION 'El estudiante no está inscrito en este curso';
  END IF;

  RETURN QUERY
  -- Lecciones con progreso
  SELECT 
    'LECCION'::text AS tipo,
    l.id_leccion AS id,
    l.titulo::text AS titulo,
    m.titulo::text AS modulo,
    CASE WHEN pl.completado = true THEN 'COMPLETADA' ELSE 'PENDIENTE' END AS estado,
    pl.fecha_completado AS fecha_entrega,
    NULL::timestamptz AS fecha_limite,
    NULL::numeric AS calificacion,
    NULL::numeric AS puntaje_maximo,
    NULL::integer AS intentos,
    NULL::integer AS intentos_max
  FROM lecciones l
  JOIN modulos m ON m.id_modulo = l.id_modulo
  LEFT JOIN progreso_lecciones pl ON pl.id_leccion = l.id_leccion AND pl.id_usuario = p_id_usuario
  WHERE m.id_curso = p_id_curso AND l.es_publicada = true
  
  UNION ALL
  
  -- Tareas con entregas
  SELECT 
    'TAREA'::text AS tipo,
    t.id_tarea AS id,
    t.titulo::text AS titulo,
    m.titulo::text AS modulo,
    COALESCE(et.estado, 'SIN_ENTREGAR')::text AS estado,
    et.fecha_entrega AS fecha_entrega,
    t.fecha_limite AS fecha_limite,
    et.calificacion AS calificacion,
    10::numeric AS puntaje_maximo, -- Valor por defecto
    (SELECT COUNT(*)::integer FROM entregas_tareas e2 WHERE e2.id_tarea = t.id_tarea AND e2.id_usuario = p_id_usuario) AS intentos,
    t.max_reintentos AS intentos_max
  FROM tareas t
  JOIN lecciones l ON l.id_leccion = t.id_leccion
  JOIN modulos m ON m.id_modulo = l.id_modulo
  LEFT JOIN LATERAL (
    SELECT * FROM entregas_tareas e 
    WHERE e.id_tarea = t.id_tarea AND e.id_usuario = p_id_usuario
    ORDER BY e.fecha_entrega DESC LIMIT 1
  ) et ON true
  WHERE m.id_curso = p_id_curso
  
  UNION ALL
  
  -- Evaluaciones con intentos
  SELECT 
    'EVALUACION'::text AS tipo,
    ev.id_evaluacion AS id,
    ev.titulo::text AS titulo,
    m.titulo::text AS modulo,
    CASE 
      WHEN ie.estado = 'COMPLETADO' THEN 'COMPLETADA'
      WHEN ie.estado = 'EN_PROGRESO' THEN 'EN_PROGRESO'
      ELSE 'SIN_INTENTAR'
    END AS estado,
    ie.fecha_envio AS fecha_entrega,
    NULL::timestamptz AS fecha_limite,
    ie.puntaje_obtenido AS calificacion,
    (SELECT COALESCE(SUM(pe.puntaje), 0) FROM preguntas_evaluacion pe WHERE pe.id_evaluacion = ev.id_evaluacion) AS puntaje_maximo,
    (SELECT COUNT(*)::integer FROM intentos_evaluacion i2 WHERE i2.id_evaluacion = ev.id_evaluacion AND i2.id_usuario = p_id_usuario) AS intentos,
    ev.intentos_max AS intentos_max
  FROM evaluaciones ev
  JOIN lecciones l ON l.id_leccion = ev.id_leccion
  JOIN modulos m ON m.id_modulo = l.id_modulo
  LEFT JOIN LATERAL (
    SELECT * FROM intentos_evaluacion ie 
    WHERE ie.id_evaluacion = ev.id_evaluacion AND ie.id_usuario = p_id_usuario
    ORDER BY ie.fecha_inicio DESC LIMIT 1
  ) ie ON true
  WHERE m.id_curso = p_id_curso
  
  ORDER BY modulo, tipo, titulo;
END;
$$;

-- Tipo para retorno de participación por curso
CREATE TYPE public.reporte_participacion_curso_row AS (
  id_usuario uuid,
  nombres text,
  apellidos text,
  lecciones_completadas integer,
  total_lecciones integer,
  tareas_entregadas integer,
  total_tareas integer,
  tareas_a_tiempo integer,
  evaluaciones_completadas integer,
  total_evaluaciones integer,
  promedio_tareas numeric,
  promedio_evaluaciones numeric,
  ultima_actividad timestamptz
);

-- Función: Obtener métricas de participación de todos los estudiantes de un curso
CREATE OR REPLACE FUNCTION public.rpc_reporte_participacion_curso(p_id_curso uuid)
RETURNS SETOF public.reporte_participacion_curso_row
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_lecciones integer;
  v_total_tareas integer;
  v_total_evaluaciones integer;
BEGIN
  -- Verificar permisos
  IF NOT EXISTS (
    SELECT 1 FROM cursos c
    WHERE c.id_curso = p_id_curso
    AND (
      has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR')
      OR has_cursillo_role(c.id_cursillo, 'DOCENTE')
    )
  ) THEN
    RAISE EXCEPTION 'No autorizado para ver este reporte';
  END IF;

  -- Contar totales del curso
  SELECT COUNT(*) INTO v_total_lecciones
  FROM lecciones l
  JOIN modulos m ON m.id_modulo = l.id_modulo
  WHERE m.id_curso = p_id_curso AND l.es_publicada = true;

  SELECT COUNT(*) INTO v_total_tareas
  FROM tareas t
  JOIN lecciones l ON l.id_leccion = t.id_leccion
  JOIN modulos m ON m.id_modulo = l.id_modulo
  WHERE m.id_curso = p_id_curso;

  SELECT COUNT(*) INTO v_total_evaluaciones
  FROM evaluaciones ev
  JOIN lecciones l ON l.id_leccion = ev.id_leccion
  JOIN modulos m ON m.id_modulo = l.id_modulo
  WHERE m.id_curso = p_id_curso;

  RETURN QUERY
  SELECT 
    u.id_usuario,
    u.nombres::text,
    u.apellidos::text,
    -- Lecciones completadas
    (SELECT COUNT(*)::integer FROM progreso_lecciones pl
     JOIN lecciones l ON l.id_leccion = pl.id_leccion
     JOIN modulos m ON m.id_modulo = l.id_modulo
     WHERE m.id_curso = p_id_curso AND pl.id_usuario = u.id_usuario AND pl.completado = true
    ) AS lecciones_completadas,
    v_total_lecciones AS total_lecciones,
    -- Tareas entregadas
    (SELECT COUNT(DISTINCT et.id_tarea)::integer FROM entregas_tareas et
     JOIN tareas t ON t.id_tarea = et.id_tarea
     JOIN lecciones l ON l.id_leccion = t.id_leccion
     JOIN modulos m ON m.id_modulo = l.id_modulo
     WHERE m.id_curso = p_id_curso AND et.id_usuario = u.id_usuario
    ) AS tareas_entregadas,
    v_total_tareas AS total_tareas,
    -- Tareas a tiempo
    (SELECT COUNT(DISTINCT et.id_tarea)::integer FROM entregas_tareas et
     JOIN tareas t ON t.id_tarea = et.id_tarea
     JOIN lecciones l ON l.id_leccion = t.id_leccion
     JOIN modulos m ON m.id_modulo = l.id_modulo
     WHERE m.id_curso = p_id_curso AND et.id_usuario = u.id_usuario
     AND (t.fecha_limite IS NULL OR et.fecha_entrega <= t.fecha_limite)
    ) AS tareas_a_tiempo,
    -- Evaluaciones completadas
    (SELECT COUNT(DISTINCT ie.id_evaluacion)::integer FROM intentos_evaluacion ie
     JOIN evaluaciones ev ON ev.id_evaluacion = ie.id_evaluacion
     JOIN lecciones l ON l.id_leccion = ev.id_leccion
     JOIN modulos m ON m.id_modulo = l.id_modulo
     WHERE m.id_curso = p_id_curso AND ie.id_usuario = u.id_usuario AND ie.estado = 'COMPLETADO'
    ) AS evaluaciones_completadas,
    v_total_evaluaciones AS total_evaluaciones,
    -- Promedio de tareas (última entrega calificada de cada tarea)
    (SELECT ROUND(AVG(sub.calificacion), 2) FROM (
      SELECT DISTINCT ON (et.id_tarea) et.calificacion
      FROM entregas_tareas et
      JOIN tareas t ON t.id_tarea = et.id_tarea
      JOIN lecciones l ON l.id_leccion = t.id_leccion
      JOIN modulos m ON m.id_modulo = l.id_modulo
      WHERE m.id_curso = p_id_curso AND et.id_usuario = u.id_usuario AND et.calificacion IS NOT NULL
      ORDER BY et.id_tarea, et.fecha_entrega DESC
    ) sub) AS promedio_tareas,
    -- Promedio de evaluaciones (mejor intento de cada evaluación)
    (SELECT ROUND(AVG(sub.puntaje), 2) FROM (
      SELECT DISTINCT ON (ie.id_evaluacion) ie.puntaje_obtenido AS puntaje
      FROM intentos_evaluacion ie
      JOIN evaluaciones ev ON ev.id_evaluacion = ie.id_evaluacion
      JOIN lecciones l ON l.id_leccion = ev.id_leccion
      JOIN modulos m ON m.id_modulo = l.id_modulo
      WHERE m.id_curso = p_id_curso AND ie.id_usuario = u.id_usuario AND ie.estado = 'COMPLETADO'
      ORDER BY ie.id_evaluacion, ie.puntaje_obtenido DESC
    ) sub) AS promedio_evaluaciones,
    -- Última actividad
    GREATEST(
      (SELECT MAX(pl.fecha_completado) FROM progreso_lecciones pl
       JOIN lecciones l ON l.id_leccion = pl.id_leccion
       JOIN modulos m ON m.id_modulo = l.id_modulo
       WHERE m.id_curso = p_id_curso AND pl.id_usuario = u.id_usuario),
      (SELECT MAX(et.fecha_entrega) FROM entregas_tareas et
       JOIN tareas t ON t.id_tarea = et.id_tarea
       JOIN lecciones l ON l.id_leccion = t.id_leccion
       JOIN modulos m ON m.id_modulo = l.id_modulo
       WHERE m.id_curso = p_id_curso AND et.id_usuario = u.id_usuario),
      (SELECT MAX(ie.fecha_envio) FROM intentos_evaluacion ie
       JOIN evaluaciones ev ON ev.id_evaluacion = ie.id_evaluacion
       JOIN lecciones l ON l.id_leccion = ev.id_leccion
       JOIN modulos m ON m.id_modulo = l.id_modulo
       WHERE m.id_curso = p_id_curso AND ie.id_usuario = u.id_usuario)
    ) AS ultima_actividad
  FROM inscripciones i
  JOIN usuarios u ON u.id_usuario = i.id_usuario
  WHERE i.id_curso = p_id_curso
  ORDER BY u.apellidos, u.nombres;
END;
$$;