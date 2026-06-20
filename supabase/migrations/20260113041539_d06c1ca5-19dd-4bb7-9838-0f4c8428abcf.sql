-- Create table for certificate configuration per course
CREATE TABLE public.certificados_curso (
  id_certificado UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  id_curso UUID NOT NULL UNIQUE,
  plantilla VARCHAR(50) NOT NULL DEFAULT 'clasico',
  titulo_certificado VARCHAR(255) DEFAULT 'Certificado de Finalización',
  texto_descripcion TEXT DEFAULT 'Por haber completado satisfactoriamente el curso',
  firma_nombre VARCHAR(255),
  firma_cargo VARCHAR(255),
  mostrar_fecha BOOLEAN DEFAULT true,
  mostrar_logo BOOLEAN DEFAULT true,
  color_primario VARCHAR(7) DEFAULT '#3B82F6',
  color_secundario VARCHAR(7) DEFAULT '#14B8A6',
  fecha_creacion TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.certificados_curso ENABLE ROW LEVEL SECURITY;

-- Policy: Admins and course owner (docente) can manage certificates
CREATE POLICY "certificados_select_admin_docente" ON public.certificados_curso
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM cursos c
    WHERE c.id_curso = certificados_curso.id_curso
    AND (has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR') OR c.id_docente = current_id_usuario())
  )
);

CREATE POLICY "certificados_insert_admin_docente" ON public.certificados_curso
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM cursos c
    WHERE c.id_curso = certificados_curso.id_curso
    AND (has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR') OR c.id_docente = current_id_usuario())
  )
);

CREATE POLICY "certificados_update_admin_docente" ON public.certificados_curso
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM cursos c
    WHERE c.id_curso = certificados_curso.id_curso
    AND (has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR') OR c.id_docente = current_id_usuario())
  )
);

CREATE POLICY "certificados_delete_admin_docente" ON public.certificados_curso
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM cursos c
    WHERE c.id_curso = certificados_curso.id_curso
    AND (has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR') OR c.id_docente = current_id_usuario())
  )
);

-- Policy: Enrolled students with 100% completion can view certificate config
CREATE POLICY "certificados_select_enrolled_completed" ON public.certificados_curso
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM inscripciones i
    WHERE i.id_curso = certificados_curso.id_curso
    AND i.id_usuario = current_id_usuario()
  )
);