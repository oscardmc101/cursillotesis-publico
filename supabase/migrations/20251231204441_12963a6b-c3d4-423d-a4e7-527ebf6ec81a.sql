-- Create RLS policy to allow admins and docentes to view all usuarios
CREATE POLICY "usuarios_select_admin_docente"
ON public.usuarios
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM usuarios_cursillos uc
    WHERE uc.id_usuario IN (
      SELECT u.id_usuario FROM usuarios u WHERE u.id_auth = auth.uid()
    )
    AND (uc.id_rol = 1 OR uc.id_rol = 2) -- ADMINISTRADOR = 1, DOCENTE = 2
    AND uc.estado = 'ACTIVO'
  )
);