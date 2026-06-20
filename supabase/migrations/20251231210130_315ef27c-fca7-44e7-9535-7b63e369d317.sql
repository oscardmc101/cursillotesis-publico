-- Drop the problematic RLS policy that causes infinite recursion
DROP POLICY IF EXISTS "usuarios_select_admin_docente" ON public.usuarios;

-- Create a SECURITY DEFINER function to check if current user is admin or docente
-- This avoids the infinite recursion by bypassing RLS when checking roles
CREATE OR REPLACE FUNCTION public.is_admin_or_docente()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM usuarios u
    JOIN usuarios_cursillos uc ON uc.id_usuario = u.id_usuario
    WHERE u.id_auth = auth.uid()
    AND (uc.id_rol = 1 OR uc.id_rol = 2) -- ADMINISTRADOR = 1, DOCENTE = 2
    AND uc.estado = 'ACTIVO'
  )
$$;

-- Now create the RLS policy using the SECURITY DEFINER function
CREATE POLICY "usuarios_select_admin_docente"
ON public.usuarios
FOR SELECT
USING (is_admin_or_docente());