-- =====================================================
-- Soporte: solicitudes de errores y mejoras
-- =====================================================

CREATE TABLE IF NOT EXISTS public.soporte_solicitudes (
  id_solicitud uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cursillo uuid NOT NULL REFERENCES public.cursillos(id_cursillo) ON DELETE CASCADE,
  id_usuario uuid NOT NULL REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE,
  nombre_usuario text NOT NULL,
  telefono text NOT NULL,
  tipo_solicitud text NOT NULL,
  descripcion text NOT NULL,
  imagen_bucket text NULL,
  imagen_path text NULL,
  imagen_nombre text NULL,
  imagen_tipo_mime text NULL,
  imagen_tamano_bytes bigint NULL,
  estado text NOT NULL DEFAULT 'PENDIENTE',
  email_notificado boolean NOT NULL DEFAULT false,
  fecha_email_notificado timestamptz NULL,
  fecha_solicitud timestamptz NOT NULL DEFAULT now(),
  fec_insercion timestamptz NULL,
  fec_modificacion timestamptz NULL,
  usu_insercion varchar NULL,
  usu_modificacion varchar NULL,
  CONSTRAINT soporte_solicitudes_tipo_check
    CHECK (tipo_solicitud IN ('ERROR', 'MEJORA')),
  CONSTRAINT soporte_solicitudes_estado_check
    CHECK (estado IN ('PENDIENTE', 'EN_REVISION', 'RESUELTO', 'DESCARTADO')),
  CONSTRAINT soporte_solicitudes_nombre_check
    CHECK (length(btrim(nombre_usuario)) > 0),
  CONSTRAINT soporte_solicitudes_telefono_check
    CHECK (length(btrim(telefono)) > 0),
  CONSTRAINT soporte_solicitudes_descripcion_check
    CHECK (length(btrim(descripcion)) >= 10),
  CONSTRAINT soporte_solicitudes_imagen_bucket_check
    CHECK (imagen_bucket IS NULL OR imagen_bucket = 'soporte_evidencias'),
  CONSTRAINT soporte_solicitudes_imagen_mime_check
    CHECK (
      imagen_tipo_mime IS NULL
      OR imagen_tipo_mime IN ('image/jpeg', 'image/png', 'image/webp')
    ),
  CONSTRAINT soporte_solicitudes_imagen_size_check
    CHECK (imagen_tamano_bytes IS NULL OR imagen_tamano_bytes <= 5242880),
  CONSTRAINT soporte_solicitudes_imagen_path_check
    CHECK (
      (imagen_path IS NULL AND imagen_bucket IS NULL)
      OR (imagen_path IS NOT NULL AND imagen_bucket = 'soporte_evidencias')
    )
);

CREATE INDEX IF NOT EXISTS idx_soporte_solicitudes_cursillo_fecha
  ON public.soporte_solicitudes (id_cursillo, fecha_solicitud DESC);

CREATE INDEX IF NOT EXISTS idx_soporte_solicitudes_usuario
  ON public.soporte_solicitudes (id_usuario);

CREATE INDEX IF NOT EXISTS idx_soporte_solicitudes_estado
  ON public.soporte_solicitudes (estado);

DROP TRIGGER IF EXISTS set_auditoria_campos ON public.soporte_solicitudes;
CREATE TRIGGER set_auditoria_campos
  BEFORE INSERT OR UPDATE ON public.soporte_solicitudes
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_set_auditoria_campos();

CREATE OR REPLACE FUNCTION public.is_cursillo_member_activo(p_cursillo_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios_cursillos uc
    WHERE uc.id_cursillo = p_cursillo_id
      AND uc.id_usuario = public.current_id_usuario()
      AND uc.estado = 'ACTIVO'
  );
$$;

ALTER TABLE public.soporte_solicitudes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "soporte_select_own" ON public.soporte_solicitudes;
CREATE POLICY "soporte_select_own"
ON public.soporte_solicitudes
FOR SELECT
TO authenticated
USING (id_usuario = public.current_id_usuario());

DROP POLICY IF EXISTS "soporte_select_admin" ON public.soporte_solicitudes;
CREATE POLICY "soporte_select_admin"
ON public.soporte_solicitudes
FOR SELECT
TO authenticated
USING (public.has_cursillo_role(id_cursillo, 'ADMINISTRADOR'));

DROP POLICY IF EXISTS "soporte_insert_own" ON public.soporte_solicitudes;
CREATE POLICY "soporte_insert_own"
ON public.soporte_solicitudes
FOR INSERT
TO authenticated
WITH CHECK (
  id_usuario = public.current_id_usuario()
  AND public.is_cursillo_member_activo(id_cursillo)
);

DROP POLICY IF EXISTS "soporte_update_admin" ON public.soporte_solicitudes;
CREATE POLICY "soporte_update_admin"
ON public.soporte_solicitudes
FOR UPDATE
TO authenticated
USING (public.has_cursillo_role(id_cursillo, 'ADMINISTRADOR'))
WITH CHECK (public.has_cursillo_role(id_cursillo, 'ADMINISTRADOR'));

GRANT SELECT, INSERT, UPDATE ON public.soporte_solicitudes TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_cursillo_member_activo(uuid) TO authenticated;

-- Bucket privado para evidencias adjuntas a solicitudes de soporte.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'soporte_evidencias',
  'soporte_evidencias',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION public.can_write_soporte_evidencia(p_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parts text[];
  v_owner_id uuid;
BEGIN
  v_parts := string_to_array(coalesce(p_name, ''), '/');

  IF array_length(v_parts, 1) < 2
     OR v_parts[1] !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  THEN
    RETURN false;
  END IF;

  v_owner_id := v_parts[1]::uuid;
  RETURN v_owner_id = public.current_id_usuario();
END;
$$;

CREATE OR REPLACE FUNCTION public.can_read_soporte_evidencia(p_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parts text[];
  v_owner_id uuid;
BEGIN
  v_parts := string_to_array(coalesce(p_name, ''), '/');

  IF array_length(v_parts, 1) < 2
     OR v_parts[1] !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  THEN
    RETURN false;
  END IF;

  v_owner_id := v_parts[1]::uuid;

  IF v_owner_id = public.current_id_usuario() THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.soporte_solicitudes ss
    WHERE ss.imagen_bucket = 'soporte_evidencias'
      AND ss.imagen_path = p_name
      AND public.has_cursillo_role(ss.id_cursillo, 'ADMINISTRADOR')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_write_soporte_evidencia(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_soporte_evidencia(text) TO authenticated;

DROP POLICY IF EXISTS "soporte_evidencias_insert_own" ON storage.objects;
CREATE POLICY "soporte_evidencias_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'soporte_evidencias'
  AND public.can_write_soporte_evidencia(name)
);

DROP POLICY IF EXISTS "soporte_evidencias_select_allowed" ON storage.objects;
CREATE POLICY "soporte_evidencias_select_allowed"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'soporte_evidencias'
  AND public.can_read_soporte_evidencia(name)
);

DROP POLICY IF EXISTS "soporte_evidencias_delete_own" ON storage.objects;
CREATE POLICY "soporte_evidencias_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'soporte_evidencias'
  AND public.can_write_soporte_evidencia(name)
);
