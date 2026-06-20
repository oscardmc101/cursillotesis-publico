-- =====================================================
-- FASE 7: RLS POLICIES FOR EVALUATIONS SYSTEM
-- =====================================================

-- Helper function: Check if user is enrolled in the course containing an evaluation
CREATE OR REPLACE FUNCTION public.is_enrolled_in_evaluacion_course(p_evaluacion_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.evaluaciones ev
    JOIN public.lecciones l ON l.id_leccion = ev.id_leccion
    JOIN public.modulos m ON m.id_modulo = l.id_modulo
    JOIN public.cursos c ON c.id_curso = m.id_curso
    JOIN public.inscripciones i ON i.id_curso = c.id_curso
    WHERE ev.id_evaluacion = p_evaluacion_id
      AND i.id_usuario = public.current_id_usuario()
      AND c.es_publicado = true
  );
$$;

-- Helper function: Check if user can manage an evaluation (admin or course teacher)
CREATE OR REPLACE FUNCTION public.can_manage_evaluacion(p_evaluacion_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.evaluaciones ev
    JOIN public.lecciones l ON l.id_leccion = ev.id_leccion
    JOIN public.modulos m ON m.id_modulo = l.id_modulo
    JOIN public.cursos c ON c.id_curso = m.id_curso
    WHERE ev.id_evaluacion = p_evaluacion_id
      AND (
        public.has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR')
        OR c.id_docente = public.current_id_usuario()
      )
  );
$$;

-- =====================================================
-- EVALUACIONES TABLE POLICIES
-- =====================================================
ALTER TABLE public.evaluaciones ENABLE ROW LEVEL SECURITY;

-- Students can view evaluations from published courses they're enrolled in
CREATE POLICY "evaluaciones_select_enrolled"
ON public.evaluaciones
FOR SELECT
USING (is_enrolled_in_evaluacion_course(id_evaluacion));

-- Admin/Docente can view all evaluations in their courses
CREATE POLICY "evaluaciones_select_admin_docente"
ON public.evaluaciones
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.lecciones l
    JOIN public.modulos m ON m.id_modulo = l.id_modulo
    JOIN public.cursos c ON c.id_curso = m.id_curso
    WHERE l.id_leccion = evaluaciones.id_leccion
      AND (
        public.has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR')
        OR public.has_cursillo_role(c.id_cursillo, 'DOCENTE')
      )
  )
);

-- Insert: Only Admin/Docente of the course
CREATE POLICY "evaluaciones_insert"
ON public.evaluaciones
FOR INSERT
WITH CHECK (public.can_manage_leccion(id_leccion));

-- Update: Only Admin/Docente of the course
CREATE POLICY "evaluaciones_update"
ON public.evaluaciones
FOR UPDATE
USING (can_manage_evaluacion(id_evaluacion));

-- Delete: Only Admin/Docente of the course
CREATE POLICY "evaluaciones_delete"
ON public.evaluaciones
FOR DELETE
USING (can_manage_evaluacion(id_evaluacion));

-- =====================================================
-- PREGUNTAS_EVALUACION TABLE POLICIES
-- =====================================================
ALTER TABLE public.preguntas_evaluacion ENABLE ROW LEVEL SECURITY;

-- Students can view questions from evaluations they have access to
CREATE POLICY "preguntas_select_enrolled"
ON public.preguntas_evaluacion
FOR SELECT
USING (is_enrolled_in_evaluacion_course(id_evaluacion));

-- Admin/Docente can view all questions
CREATE POLICY "preguntas_select_admin_docente"
ON public.preguntas_evaluacion
FOR SELECT
USING (can_manage_evaluacion(id_evaluacion));

-- Insert/Update/Delete: Only Admin/Docente
CREATE POLICY "preguntas_insert"
ON public.preguntas_evaluacion
FOR INSERT
WITH CHECK (can_manage_evaluacion(id_evaluacion));

CREATE POLICY "preguntas_update"
ON public.preguntas_evaluacion
FOR UPDATE
USING (can_manage_evaluacion(id_evaluacion));

CREATE POLICY "preguntas_delete"
ON public.preguntas_evaluacion
FOR DELETE
USING (can_manage_evaluacion(id_evaluacion));

-- =====================================================
-- OPCIONES_PREGUNTA TABLE POLICIES
-- =====================================================
ALTER TABLE public.opciones_pregunta ENABLE ROW LEVEL SECURITY;

-- Students can view options (need to check via pregunta -> evaluacion)
CREATE POLICY "opciones_select_enrolled"
ON public.opciones_pregunta
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.preguntas_evaluacion p
    WHERE p.id_pregunta = opciones_pregunta.id_pregunta
      AND public.is_enrolled_in_evaluacion_course(p.id_evaluacion)
  )
);

-- Admin/Docente can view all options
CREATE POLICY "opciones_select_admin_docente"
ON public.opciones_pregunta
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.preguntas_evaluacion p
    WHERE p.id_pregunta = opciones_pregunta.id_pregunta
      AND public.can_manage_evaluacion(p.id_evaluacion)
  )
);

-- Insert/Update/Delete: Only Admin/Docente
CREATE POLICY "opciones_insert"
ON public.opciones_pregunta
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.preguntas_evaluacion p
    WHERE p.id_pregunta = opciones_pregunta.id_pregunta
      AND public.can_manage_evaluacion(p.id_evaluacion)
  )
);

CREATE POLICY "opciones_update"
ON public.opciones_pregunta
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.preguntas_evaluacion p
    WHERE p.id_pregunta = opciones_pregunta.id_pregunta
      AND public.can_manage_evaluacion(p.id_evaluacion)
  )
);

CREATE POLICY "opciones_delete"
ON public.opciones_pregunta
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.preguntas_evaluacion p
    WHERE p.id_pregunta = opciones_pregunta.id_pregunta
      AND public.can_manage_evaluacion(p.id_evaluacion)
  )
);

-- =====================================================
-- INTENTOS_EVALUACION TABLE POLICIES
-- =====================================================
ALTER TABLE public.intentos_evaluacion ENABLE ROW LEVEL SECURITY;

-- Students can view their own attempts
CREATE POLICY "intentos_select_own"
ON public.intentos_evaluacion
FOR SELECT
USING (id_usuario = public.current_id_usuario());

-- Admin/Docente can view all attempts
CREATE POLICY "intentos_select_admin_docente"
ON public.intentos_evaluacion
FOR SELECT
USING (can_manage_evaluacion(id_evaluacion));

-- Students can create attempts for evaluations they're enrolled in
CREATE POLICY "intentos_insert_own"
ON public.intentos_evaluacion
FOR INSERT
WITH CHECK (
  id_usuario = public.current_id_usuario()
  AND is_enrolled_in_evaluacion_course(id_evaluacion)
);

-- Students can update their own attempts while in progress
CREATE POLICY "intentos_update_own"
ON public.intentos_evaluacion
FOR UPDATE
USING (
  id_usuario = public.current_id_usuario()
  AND estado = 'EN_PROGRESO'
)
WITH CHECK (id_usuario = public.current_id_usuario());

-- Admin/Docente can update any attempt (for grading)
CREATE POLICY "intentos_update_admin_docente"
ON public.intentos_evaluacion
FOR UPDATE
USING (can_manage_evaluacion(id_evaluacion));

-- =====================================================
-- RESPUESTAS_INTENTO TABLE POLICIES
-- =====================================================
ALTER TABLE public.respuestas_intento ENABLE ROW LEVEL SECURITY;

-- Students can view their own responses
CREATE POLICY "respuestas_select_own"
ON public.respuestas_intento
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.intentos_evaluacion i
    WHERE i.id_intento = respuestas_intento.id_intento
      AND i.id_usuario = public.current_id_usuario()
  )
);

-- Admin/Docente can view all responses
CREATE POLICY "respuestas_select_admin_docente"
ON public.respuestas_intento
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.intentos_evaluacion i
    WHERE i.id_intento = respuestas_intento.id_intento
      AND public.can_manage_evaluacion(i.id_evaluacion)
  )
);

-- Students can insert responses for their own in-progress attempts
CREATE POLICY "respuestas_insert_own"
ON public.respuestas_intento
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.intentos_evaluacion i
    WHERE i.id_intento = respuestas_intento.id_intento
      AND i.id_usuario = public.current_id_usuario()
      AND i.estado = 'EN_PROGRESO'
  )
);

-- Students can update their own responses while attempt is in progress
CREATE POLICY "respuestas_update_own"
ON public.respuestas_intento
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.intentos_evaluacion i
    WHERE i.id_intento = respuestas_intento.id_intento
      AND i.id_usuario = public.current_id_usuario()
      AND i.estado = 'EN_PROGRESO'
  )
);

-- Admin/Docente can update responses (for manual grading)
CREATE POLICY "respuestas_update_admin_docente"
ON public.respuestas_intento
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.intentos_evaluacion i
    WHERE i.id_intento = respuestas_intento.id_intento
      AND public.can_manage_evaluacion(i.id_evaluacion)
  )
);

-- =====================================================
-- RETROALIMENTACION_INTENTO TABLE POLICIES
-- =====================================================
ALTER TABLE public.retroalimentacion_intento ENABLE ROW LEVEL SECURITY;

-- Students can view feedback on their own attempts
CREATE POLICY "retroalimentacion_select_own"
ON public.retroalimentacion_intento
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.intentos_evaluacion i
    WHERE i.id_intento = retroalimentacion_intento.id_intento
      AND i.id_usuario = public.current_id_usuario()
  )
);

-- Admin/Docente can view all feedback
CREATE POLICY "retroalimentacion_select_admin_docente"
ON public.retroalimentacion_intento
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.intentos_evaluacion i
    WHERE i.id_intento = retroalimentacion_intento.id_intento
      AND public.can_manage_evaluacion(i.id_evaluacion)
  )
);

-- Only Admin/Docente can insert feedback
CREATE POLICY "retroalimentacion_insert"
ON public.retroalimentacion_intento
FOR INSERT
WITH CHECK (
  id_docente = public.current_id_usuario()
  AND EXISTS (
    SELECT 1
    FROM public.intentos_evaluacion i
    WHERE i.id_intento = retroalimentacion_intento.id_intento
      AND public.can_manage_evaluacion(i.id_evaluacion)
  )
);

-- Only Admin/Docente can update feedback
CREATE POLICY "retroalimentacion_update"
ON public.retroalimentacion_intento
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.intentos_evaluacion i
    WHERE i.id_intento = retroalimentacion_intento.id_intento
      AND public.can_manage_evaluacion(i.id_evaluacion)
  )
);

-- Only Admin/Docente can delete feedback
CREATE POLICY "retroalimentacion_delete"
ON public.retroalimentacion_intento
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.intentos_evaluacion i
    WHERE i.id_intento = retroalimentacion_intento.id_intento
      AND public.can_manage_evaluacion(i.id_evaluacion)
  )
);

-- =====================================================
-- IMAGENES_RESOLUCION_INTENTO TABLE POLICIES
-- =====================================================
ALTER TABLE public.imagenes_resolucion_intento ENABLE ROW LEVEL SECURITY;

-- Students can view images from their own attempts
CREATE POLICY "imagenes_select_own"
ON public.imagenes_resolucion_intento
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.intentos_evaluacion i
    WHERE i.id_intento = imagenes_resolucion_intento.id_intento
      AND i.id_usuario = public.current_id_usuario()
  )
);

-- Admin/Docente can view all images
CREATE POLICY "imagenes_select_admin_docente"
ON public.imagenes_resolucion_intento
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.intentos_evaluacion i
    WHERE i.id_intento = imagenes_resolucion_intento.id_intento
      AND public.can_manage_evaluacion(i.id_evaluacion)
  )
);

-- Students can insert images for their own in-progress attempts
CREATE POLICY "imagenes_insert_own"
ON public.imagenes_resolucion_intento
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.intentos_evaluacion i
    WHERE i.id_intento = imagenes_resolucion_intento.id_intento
      AND i.id_usuario = public.current_id_usuario()
      AND i.estado = 'EN_PROGRESO'
  )
);

-- Students can delete their own images while attempt is in progress
CREATE POLICY "imagenes_delete_own"
ON public.imagenes_resolucion_intento
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.intentos_evaluacion i
    WHERE i.id_intento = imagenes_resolucion_intento.id_intento
      AND i.id_usuario = public.current_id_usuario()
      AND i.estado = 'EN_PROGRESO'
  )
);