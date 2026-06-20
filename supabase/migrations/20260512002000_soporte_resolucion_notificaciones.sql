-- =====================================================
-- Soporte: trazabilidad de resolucion y notificaciones
-- =====================================================

ALTER TABLE public.soporte_solicitudes
ADD COLUMN IF NOT EXISTS fecha_resolucion timestamptz NULL,
ADD COLUMN IF NOT EXISTS id_admin_resolutor uuid NULL REFERENCES public.usuarios(id_usuario),
ADD COLUMN IF NOT EXISTS resolucion_notificada boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS fecha_resolucion_notificada timestamptz NULL,
ADD COLUMN IF NOT EXISTS resolucion_email_notificado boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS fecha_resolucion_email_notificado timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_soporte_solicitudes_resolucion
  ON public.soporte_solicitudes (estado, fecha_resolucion DESC);
