-- Allow lesson creation flows that use INSERT ... RETURNING without widening access.
-- The previous SELECT policies delegated to helpers that queried the same newly
-- inserted row, which can fail during RETURNING under RLS.

DROP POLICY IF EXISTS "lecciones_select" ON public.lecciones;
CREATE POLICY "lecciones_select"
ON public.lecciones
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.modulos m
    JOIN public.cursos c ON c.id_curso = m.id_curso
    WHERE m.id_modulo = lecciones.id_modulo
      AND (
        public.can_manage_curso(c.id_curso)
        OR (
          lecciones.es_publicada = true
          AND public.can_access_curso_content(c.id_curso)
        )
      )
  )
);

DROP POLICY IF EXISTS "evaluaciones_select_admin_docente" ON public.evaluaciones;
CREATE POLICY "evaluaciones_select_admin_docente"
ON public.evaluaciones
FOR SELECT
TO authenticated
USING (public.can_manage_leccion(id_leccion));

DROP POLICY IF EXISTS "tareas_select_admin_docente" ON public.tareas;
CREATE POLICY "tareas_select_admin_docente"
ON public.tareas
FOR SELECT
TO authenticated
USING (public.can_manage_leccion(id_leccion));
