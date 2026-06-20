-- Corregir intentos con estado AUTOCORREGIDO que deberían ser COMPLETADO
-- (evaluaciones que tienen preguntas tipo ABIERTA)
UPDATE intentos_evaluacion
SET estado = 'COMPLETADO'
WHERE estado = 'AUTOCORREGIDO'
AND id_evaluacion IN (
  SELECT DISTINCT p.id_evaluacion 
  FROM preguntas_evaluacion p 
  WHERE p.tipo = 'ABIERTA'
);

-- Eliminar intentos EN_PROGRESO duplicados cuando el usuario ya tiene intentos finalizados
-- y ha alcanzado el límite de intentos
DELETE FROM intentos_evaluacion ie1
WHERE ie1.estado = 'EN_PROGRESO'
AND EXISTS (
  SELECT 1 FROM (
    SELECT ie2.id_evaluacion, ie2.id_usuario, COUNT(*) as total_intentos
    FROM intentos_evaluacion ie2
    WHERE ie2.estado NOT IN ('EN_PROGRESO')
    GROUP BY ie2.id_evaluacion, ie2.id_usuario
  ) finalizados
  JOIN evaluaciones e ON e.id_evaluacion = finalizados.id_evaluacion
  WHERE finalizados.id_evaluacion = ie1.id_evaluacion
  AND finalizados.id_usuario = ie1.id_usuario
  AND finalizados.total_intentos >= e.intentos_max
);