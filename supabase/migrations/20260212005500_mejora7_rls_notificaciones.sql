-- =====================================================
-- MEJORA 7: RLS en tablas auxiliares (notificaciones)
-- =====================================================

-- 1. Habilitar RLS en notificaciones
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Permitir a los usuarios ver sus propias notificaciones
DROP POLICY IF EXISTS "notificaciones_select_own" ON public.notificaciones;
CREATE POLICY "notificaciones_select_own" ON public.notificaciones
FOR SELECT USING (
  id_usuario = auth.uid()
);

-- 3. Policy: Permitir a los usuarios marcar como leídas sus propias notificaciones (UPDATE)
DROP POLICY IF EXISTS "notificaciones_update_own" ON public.notificaciones;
CREATE POLICY "notificaciones_update_own" ON public.notificaciones
FOR UPDATE USING (
  id_usuario = auth.uid()
) WITH CHECK (
  id_usuario = auth.uid()
);

-- Nota: Los INSERT en notificaciones se hacen a través de funciones SECURITY DEFINER
-- (como notify_admins_new_pending_user), por lo que no es necesario dar permisos de INSERT directos.
