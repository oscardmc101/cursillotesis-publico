-- ========================================
-- RLS POLICIES FOR TAREAS SYSTEM
-- ========================================

-- Enable RLS on tables
ALTER TABLE public.tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entregas_tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archivos_entregas_tareas ENABLE ROW LEVEL SECURITY;

-- ========================================
-- HELPER FUNCTIONS
-- ========================================

-- Check if user is enrolled in the course that owns a tarea
CREATE OR REPLACE FUNCTION public.is_enrolled_in_tarea_course(p_tarea_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tareas t
    JOIN public.lecciones l ON l.id_leccion = t.id_leccion
    JOIN public.modulos m ON m.id_modulo = l.id_modulo
    JOIN public.cursos c ON c.id_curso = m.id_curso
    JOIN public.inscripciones i ON i.id_curso = c.id_curso
    WHERE t.id_tarea = p_tarea_id
      AND i.id_usuario = public.current_id_usuario()
      AND c.es_publicado = true
  );
$$;

-- Check if user is docente or admin of the course that owns a tarea
CREATE OR REPLACE FUNCTION public.can_manage_tarea(p_tarea_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tareas t
    JOIN public.lecciones l ON l.id_leccion = t.id_leccion
    JOIN public.modulos m ON m.id_modulo = l.id_modulo
    JOIN public.cursos c ON c.id_curso = m.id_curso
    WHERE t.id_tarea = p_tarea_id
      AND (
        public.has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR')
        OR c.id_docente = public.current_id_usuario()
      )
  );
$$;

-- Check if user can manage a leccion (for creating tareas)
CREATE OR REPLACE FUNCTION public.can_manage_leccion(p_leccion_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lecciones l
    JOIN public.modulos m ON m.id_modulo = l.id_modulo
    JOIN public.cursos c ON c.id_curso = m.id_curso
    WHERE l.id_leccion = p_leccion_id
      AND (
        public.has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR')
        OR c.id_docente = public.current_id_usuario()
      )
  );
$$;

-- ========================================
-- TAREAS POLICIES
-- ========================================

-- Students can view tareas of courses they're enrolled in
CREATE POLICY "tareas_select_enrolled" ON public.tareas
FOR SELECT USING (
  public.is_enrolled_in_tarea_course(id_tarea)
);

-- Admin/Docente can view all tareas of their courses
CREATE POLICY "tareas_select_admin_docente" ON public.tareas
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.lecciones l
    JOIN public.modulos m ON m.id_modulo = l.id_modulo
    JOIN public.cursos c ON c.id_curso = m.id_curso
    WHERE l.id_leccion = tareas.id_leccion
      AND (
        public.has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR')
        OR public.has_cursillo_role(c.id_cursillo, 'DOCENTE')
      )
  )
);

-- Admin/Docente of the course can create tareas
CREATE POLICY "tareas_insert" ON public.tareas
FOR INSERT WITH CHECK (
  public.can_manage_leccion(id_leccion)
);

-- Admin/Docente of the course can update tareas
CREATE POLICY "tareas_update" ON public.tareas
FOR UPDATE USING (
  public.can_manage_tarea(id_tarea)
);

-- Admin/Docente of the course can delete tareas
CREATE POLICY "tareas_delete" ON public.tareas
FOR DELETE USING (
  public.can_manage_tarea(id_tarea)
);

-- ========================================
-- ENTREGAS_TAREAS POLICIES
-- ========================================

-- Students can view their own entregas
CREATE POLICY "entregas_select_own" ON public.entregas_tareas
FOR SELECT USING (
  id_usuario = public.current_id_usuario()
);

-- Admin/Docente can view entregas of their courses
CREATE POLICY "entregas_select_admin_docente" ON public.entregas_tareas
FOR SELECT USING (
  public.can_manage_tarea(id_tarea)
);

-- Students can create entregas for tareas in courses they're enrolled in
CREATE POLICY "entregas_insert_own" ON public.entregas_tareas
FOR INSERT WITH CHECK (
  id_usuario = public.current_id_usuario()
  AND public.is_enrolled_in_tarea_course(id_tarea)
);

-- Students can update their own entregas while in ENVIADO status
CREATE POLICY "entregas_update_own" ON public.entregas_tareas
FOR UPDATE USING (
  id_usuario = public.current_id_usuario()
  AND estado = 'ENVIADO'
) WITH CHECK (
  id_usuario = public.current_id_usuario()
);

-- Admin/Docente can update entregas (for grading)
CREATE POLICY "entregas_update_docente" ON public.entregas_tareas
FOR UPDATE USING (
  public.can_manage_tarea(id_tarea)
);

-- ========================================
-- ARCHIVOS_ENTREGAS_TAREAS POLICIES
-- ========================================

-- Students can view their own archivos
CREATE POLICY "archivos_select_own" ON public.archivos_entregas_tareas
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.entregas_tareas e
    WHERE e.id_entrega = archivos_entregas_tareas.id_entrega
      AND e.id_usuario = public.current_id_usuario()
  )
);

-- Admin/Docente can view archivos of their courses
CREATE POLICY "archivos_select_admin_docente" ON public.archivos_entregas_tareas
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.entregas_tareas e
    WHERE e.id_entrega = archivos_entregas_tareas.id_entrega
      AND public.can_manage_tarea(e.id_tarea)
  )
);

-- Students can insert archivos to their own entregas
CREATE POLICY "archivos_insert_own" ON public.archivos_entregas_tareas
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.entregas_tareas e
    WHERE e.id_entrega = archivos_entregas_tareas.id_entrega
      AND e.id_usuario = public.current_id_usuario()
      AND e.estado = 'ENVIADO'
  )
);

-- Students can delete archivos from their own entregas while in ENVIADO
CREATE POLICY "archivos_delete_own" ON public.archivos_entregas_tareas
FOR DELETE USING (
  EXISTS (
    SELECT 1
    FROM public.entregas_tareas e
    WHERE e.id_entrega = archivos_entregas_tareas.id_entrega
      AND e.id_usuario = public.current_id_usuario()
      AND e.estado = 'ENVIADO'
  )
);

-- ========================================
-- STORAGE POLICIES FOR archivos_tareas bucket
-- ========================================

-- Allow authenticated users to upload to their own folder
CREATE POLICY "archivos_tareas_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'archivos_tareas'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own files
CREATE POLICY "archivos_tareas_select_own"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'archivos_tareas'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow docentes/admins to view all files (for grading)
CREATE POLICY "archivos_tareas_select_admin"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'archivos_tareas'
  AND EXISTS (
    SELECT 1 FROM public.usuarios_cursillos uc
    JOIN public.roles r ON r.id_rol = uc.id_rol
    WHERE uc.id_usuario = public.current_id_usuario()
      AND r.nombre_rol IN ('ADMINISTRADOR', 'DOCENTE')
      AND uc.estado = 'ACTIVO'
  )
);

-- Allow users to delete their own files
CREATE POLICY "archivos_tareas_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'archivos_tareas'
  AND (storage.foldername(name))[1] = auth.uid()::text
);