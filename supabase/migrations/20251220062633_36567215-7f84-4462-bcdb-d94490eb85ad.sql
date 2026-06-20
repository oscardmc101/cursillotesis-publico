-- Drop the problematic policy that's causing recursion
DROP POLICY IF EXISTS "usuarios_select_admin_docente" ON public.usuarios;

-- Create a new policy that doesn't cause recursion by using auth.uid() directly
CREATE POLICY "usuarios_select_admin_docente" ON public.usuarios
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.usuarios_cursillos uc1
    JOIN public.usuarios_cursillos uc2 ON uc1.id_cursillo = uc2.id_cursillo
    JOIN public.usuarios u_caller ON u_caller.id_usuario = uc1.id_usuario
    JOIN public.roles r ON r.id_rol = uc1.id_rol
    WHERE u_caller.id_auth = auth.uid()
      AND uc2.id_usuario = usuarios.id_usuario
      AND uc1.estado = 'ACTIVO'
      AND UPPER(TRIM(r.nombre_rol)) IN ('ADMINISTRADOR', 'DOCENTE')
  )
);