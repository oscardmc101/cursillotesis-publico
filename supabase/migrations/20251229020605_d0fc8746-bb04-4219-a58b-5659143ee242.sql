-- Add unique constraint for upsert on progreso_lecciones
CREATE UNIQUE INDEX IF NOT EXISTS idx_progreso_lecciones_usuario_leccion 
ON public.progreso_lecciones (id_usuario, id_leccion);