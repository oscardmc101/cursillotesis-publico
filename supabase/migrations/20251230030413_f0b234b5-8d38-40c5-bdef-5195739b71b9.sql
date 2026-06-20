-- Actualizar el campo estado para permitir los nuevos valores
-- Primero actualizamos los registros existentes con FINALIZADO a AUTOCORREGIDO
UPDATE public.intentos_evaluacion 
SET estado = 'AUTOCORREGIDO' 
WHERE estado = 'FINALIZADO';

-- Agregar constraint check para los nuevos estados válidos
ALTER TABLE public.intentos_evaluacion 
DROP CONSTRAINT IF EXISTS intentos_evaluacion_estado_check;

ALTER TABLE public.intentos_evaluacion 
ADD CONSTRAINT intentos_evaluacion_estado_check 
CHECK (estado IN ('EN_PROGRESO', 'COMPLETADO', 'CORREGIDO', 'AUTOCORREGIDO'));