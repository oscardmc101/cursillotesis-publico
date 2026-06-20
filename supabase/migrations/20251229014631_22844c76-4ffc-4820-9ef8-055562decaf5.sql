-- Enable RLS on progreso_lecciones
ALTER TABLE public.progreso_lecciones ENABLE ROW LEVEL SECURITY;

-- Policy: Users can SELECT their own progress
CREATE POLICY "progreso_select_own"
ON public.progreso_lecciones
FOR SELECT
USING (id_usuario = public.current_id_usuario());

-- Policy: Admin/Docente can SELECT progress of enrolled students
CREATE POLICY "progreso_select_admin_docente"
ON public.progreso_lecciones
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.lecciones l
    JOIN public.modulos m ON m.id_modulo = l.id_modulo
    JOIN public.cursos c ON c.id_curso = m.id_curso
    WHERE l.id_leccion = progreso_lecciones.id_leccion
    AND (
      public.has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR')
      OR public.has_cursillo_role(c.id_cursillo, 'DOCENTE')
    )
  )
);

-- Policy: Users can INSERT their own progress (only for published courses they're enrolled in)
CREATE POLICY "progreso_insert_own"
ON public.progreso_lecciones
FOR INSERT
WITH CHECK (
  id_usuario = public.current_id_usuario()
  AND EXISTS (
    SELECT 1
    FROM public.lecciones l
    JOIN public.modulos m ON m.id_modulo = l.id_modulo
    JOIN public.cursos c ON c.id_curso = m.id_curso
    JOIN public.inscripciones i ON i.id_curso = c.id_curso
    WHERE l.id_leccion = progreso_lecciones.id_leccion
    AND i.id_usuario = public.current_id_usuario()
    AND c.es_publicado = true
  )
);

-- Policy: Users can UPDATE their own progress
CREATE POLICY "progreso_update_own"
ON public.progreso_lecciones
FOR UPDATE
USING (id_usuario = public.current_id_usuario())
WITH CHECK (id_usuario = public.current_id_usuario());

-- Policy: Users can DELETE their own progress (optional, for cleanup)
CREATE POLICY "progreso_delete_own"
ON public.progreso_lecciones
FOR DELETE
USING (id_usuario = public.current_id_usuario());