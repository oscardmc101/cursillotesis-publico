-- Crear tabla adjuntos_leccion
CREATE TABLE public.adjuntos_leccion (
  id_adjunto uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  id_leccion uuid NOT NULL REFERENCES public.lecciones(id_leccion) ON DELETE CASCADE,
  nombre varchar NOT NULL,
  tipo varchar NOT NULL CHECK (tipo IN ('ARCHIVO', 'LINK')),
  ruta_storage text,
  url_externa text,
  tipo_mime varchar,
  tamano_bytes bigint,
  bucket varchar DEFAULT 'contenido_lecciones',
  fecha_subida timestamptz DEFAULT now()
);

-- Crear bucket público para contenido de lecciones
INSERT INTO storage.buckets (id, name, public)
VALUES ('contenido_lecciones', 'contenido_lecciones', true)
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS en tablas
ALTER TABLE public.lecciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentarios_leccion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adjuntos_leccion ENABLE ROW LEVEL SECURITY;

-- RLS para lecciones: SELECT (inscrito, admin o docente del curso)
CREATE POLICY "lecciones_select" ON public.lecciones
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.modulos m
    JOIN public.cursos c ON c.id_curso = m.id_curso
    WHERE m.id_modulo = lecciones.id_modulo
    AND (
      c.es_publicado = true
      OR has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR')
      OR has_cursillo_role(c.id_cursillo, 'DOCENTE')
    )
  )
);

-- RLS para lecciones: INSERT (admin o docente del curso)
CREATE POLICY "lecciones_insert" ON public.lecciones
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.modulos m
    JOIN public.cursos c ON c.id_curso = m.id_curso
    WHERE m.id_modulo = lecciones.id_modulo
    AND (
      has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR')
      OR c.id_docente = current_id_usuario()
    )
  )
);

-- RLS para lecciones: UPDATE
CREATE POLICY "lecciones_update" ON public.lecciones
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.modulos m
    JOIN public.cursos c ON c.id_curso = m.id_curso
    WHERE m.id_modulo = lecciones.id_modulo
    AND (
      has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR')
      OR c.id_docente = current_id_usuario()
    )
  )
);

-- RLS para lecciones: DELETE
CREATE POLICY "lecciones_delete" ON public.lecciones
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.modulos m
    JOIN public.cursos c ON c.id_curso = m.id_curso
    WHERE m.id_modulo = lecciones.id_modulo
    AND (
      has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR')
      OR c.id_docente = current_id_usuario()
    )
  )
);

-- RLS para comentarios_leccion: SELECT (cualquiera que pueda ver la lección)
CREATE POLICY "comentarios_select" ON public.comentarios_leccion
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.lecciones l
    JOIN public.modulos m ON m.id_modulo = l.id_modulo
    JOIN public.cursos c ON c.id_curso = m.id_curso
    WHERE l.id_leccion = comentarios_leccion.id_leccion
    AND (
      c.es_publicado = true
      OR has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR')
      OR has_cursillo_role(c.id_cursillo, 'DOCENTE')
    )
  )
);

-- RLS para comentarios_leccion: INSERT (cualquier usuario autenticado puede comentar)
CREATE POLICY "comentarios_insert" ON public.comentarios_leccion
FOR INSERT WITH CHECK (
  id_usuario = current_id_usuario()
  AND EXISTS (
    SELECT 1 FROM public.lecciones l
    JOIN public.modulos m ON m.id_modulo = l.id_modulo
    JOIN public.cursos c ON c.id_curso = m.id_curso
    WHERE l.id_leccion = comentarios_leccion.id_leccion
    AND c.es_publicado = true
  )
);

-- RLS para comentarios_leccion: DELETE (solo el autor o admin)
CREATE POLICY "comentarios_delete" ON public.comentarios_leccion
FOR DELETE USING (
  id_usuario = current_id_usuario()
  OR EXISTS (
    SELECT 1 FROM public.lecciones l
    JOIN public.modulos m ON m.id_modulo = l.id_modulo
    JOIN public.cursos c ON c.id_curso = m.id_curso
    WHERE l.id_leccion = comentarios_leccion.id_leccion
    AND has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR')
  )
);

-- RLS para adjuntos_leccion: SELECT
CREATE POLICY "adjuntos_select" ON public.adjuntos_leccion
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.lecciones l
    JOIN public.modulos m ON m.id_modulo = l.id_modulo
    JOIN public.cursos c ON c.id_curso = m.id_curso
    WHERE l.id_leccion = adjuntos_leccion.id_leccion
    AND (
      c.es_publicado = true
      OR has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR')
      OR has_cursillo_role(c.id_cursillo, 'DOCENTE')
    )
  )
);

-- RLS para adjuntos_leccion: INSERT (solo admin o docente)
CREATE POLICY "adjuntos_insert" ON public.adjuntos_leccion
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lecciones l
    JOIN public.modulos m ON m.id_modulo = l.id_modulo
    JOIN public.cursos c ON c.id_curso = m.id_curso
    WHERE l.id_leccion = adjuntos_leccion.id_leccion
    AND (
      has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR')
      OR c.id_docente = current_id_usuario()
    )
  )
);

-- RLS para adjuntos_leccion: DELETE (solo admin o docente)
CREATE POLICY "adjuntos_delete" ON public.adjuntos_leccion
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.lecciones l
    JOIN public.modulos m ON m.id_modulo = l.id_modulo
    JOIN public.cursos c ON c.id_curso = m.id_curso
    WHERE l.id_leccion = adjuntos_leccion.id_leccion
    AND (
      has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR')
      OR c.id_docente = current_id_usuario()
    )
  )
);

-- Storage policies para contenido_lecciones bucket
CREATE POLICY "contenido_lecciones_select" ON storage.objects
FOR SELECT USING (bucket_id = 'contenido_lecciones');

CREATE POLICY "contenido_lecciones_insert" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'contenido_lecciones'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "contenido_lecciones_delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'contenido_lecciones'
  AND auth.role() = 'authenticated'
);