-- Paso 1: Agregar columna id_docente a cursos
ALTER TABLE public.cursos 
ADD COLUMN IF NOT EXISTS id_docente uuid REFERENCES public.usuarios(id_usuario);

-- Paso 2: Crear función auxiliar para verificar si es docente del curso
CREATE OR REPLACE FUNCTION public.is_curso_docente(p_curso_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cursos c
    WHERE c.id_curso = p_curso_id
      AND c.id_docente = public.current_id_usuario()
  );
$$;

-- Paso 3: Habilitar RLS en cursos
ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;

-- Paso 4: Políticas RLS para cursos

-- SELECT: Estudiantes ven cursos publicados
CREATE POLICY "cursos_select_publicados" ON public.cursos
FOR SELECT USING (
  es_publicado = true
);

-- SELECT: Admin/Docente ven todos los cursos del cursillo
CREATE POLICY "cursos_select_admin_docente" ON public.cursos
FOR SELECT USING (
  has_cursillo_role(id_cursillo, 'ADMINISTRADOR') OR 
  has_cursillo_role(id_cursillo, 'DOCENTE')
);

-- INSERT: Admin puede crear cualquier curso
CREATE POLICY "cursos_insert_admin" ON public.cursos
FOR INSERT WITH CHECK (
  has_cursillo_role(id_cursillo, 'ADMINISTRADOR')
);

-- INSERT: Docente puede crear curso asignándose a sí mismo
CREATE POLICY "cursos_insert_docente" ON public.cursos
FOR INSERT WITH CHECK (
  has_cursillo_role(id_cursillo, 'DOCENTE') AND 
  id_docente = public.current_id_usuario()
);

-- UPDATE: Admin puede editar cualquier curso
CREATE POLICY "cursos_update_admin" ON public.cursos
FOR UPDATE USING (
  has_cursillo_role(id_cursillo, 'ADMINISTRADOR')
);

-- UPDATE: Docente puede editar sus cursos
CREATE POLICY "cursos_update_docente" ON public.cursos
FOR UPDATE USING (
  has_cursillo_role(id_cursillo, 'DOCENTE') AND 
  id_docente = public.current_id_usuario()
);

-- DELETE: Admin puede eliminar cualquier curso
CREATE POLICY "cursos_delete_admin" ON public.cursos
FOR DELETE USING (
  has_cursillo_role(id_cursillo, 'ADMINISTRADOR')
);

-- DELETE: Docente puede eliminar sus cursos
CREATE POLICY "cursos_delete_docente" ON public.cursos
FOR DELETE USING (
  has_cursillo_role(id_cursillo, 'DOCENTE') AND 
  id_docente = public.current_id_usuario()
);

-- Paso 5: Habilitar RLS en modulos
ALTER TABLE public.modulos ENABLE ROW LEVEL SECURITY;

-- SELECT: Cualquiera autenticado puede ver módulos de cursos que puede ver
CREATE POLICY "modulos_select" ON public.modulos
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.cursos c 
    WHERE c.id_curso = modulos.id_curso
  )
);

-- INSERT/UPDATE/DELETE: Admin/Docente del curso
CREATE POLICY "modulos_insert" ON public.modulos
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cursos c 
    WHERE c.id_curso = modulos.id_curso 
    AND (has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR') OR c.id_docente = public.current_id_usuario())
  )
);

CREATE POLICY "modulos_update" ON public.modulos
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.cursos c 
    WHERE c.id_curso = modulos.id_curso 
    AND (has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR') OR c.id_docente = public.current_id_usuario())
  )
);

CREATE POLICY "modulos_delete" ON public.modulos
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.cursos c 
    WHERE c.id_curso = modulos.id_curso 
    AND (has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR') OR c.id_docente = public.current_id_usuario())
  )
);

-- Paso 6: Habilitar RLS en inscripciones
ALTER TABLE public.inscripciones ENABLE ROW LEVEL SECURITY;

-- SELECT: Usuario ve sus inscripciones
CREATE POLICY "inscripciones_select_own" ON public.inscripciones
FOR SELECT USING (
  id_usuario = public.current_id_usuario()
);

-- SELECT: Admin/Docente ven todas las inscripciones de cursos del cursillo
CREATE POLICY "inscripciones_select_admin_docente" ON public.inscripciones
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.cursos c 
    WHERE c.id_curso = inscripciones.id_curso 
    AND (has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR') OR has_cursillo_role(c.id_cursillo, 'DOCENTE'))
  )
);

-- INSERT: Usuario puede inscribirse en cursos publicados
CREATE POLICY "inscripciones_insert" ON public.inscripciones
FOR INSERT WITH CHECK (
  id_usuario = public.current_id_usuario() AND
  EXISTS (
    SELECT 1 FROM public.cursos c 
    WHERE c.id_curso = inscripciones.id_curso 
    AND c.es_publicado = true
  )
);

-- DELETE: Usuario puede cancelar su inscripción
CREATE POLICY "inscripciones_delete_own" ON public.inscripciones
FOR DELETE USING (
  id_usuario = public.current_id_usuario()
);

-- DELETE: Admin puede eliminar cualquier inscripción
CREATE POLICY "inscripciones_delete_admin" ON public.inscripciones
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.cursos c 
    WHERE c.id_curso = inscripciones.id_curso 
    AND has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR')
  )
);

-- Paso 7: Insertar cursos de prueba con docente Oskr Castro
INSERT INTO public.cursos (id_cursillo, titulo, descripcion, es_publicado, id_docente)
VALUES 
  (
    '04cbfec5-497a-480d-ba4d-1a08c982edb7',
    'Matemáticas Básicas',
    'Curso introductorio de matemáticas: aritmética, álgebra y geometría básica. Ideal para reforzar fundamentos.',
    true,
    '04dbb21b-b1cc-46b6-a2e6-75a6b85242c2'
  ),
  (
    '04cbfec5-497a-480d-ba4d-1a08c982edb7',
    'Química General',
    'Fundamentos de química: estructura atómica, tabla periódica, enlaces químicos y reacciones básicas.',
    true,
    '04dbb21b-b1cc-46b6-a2e6-75a6b85242c2'
  );