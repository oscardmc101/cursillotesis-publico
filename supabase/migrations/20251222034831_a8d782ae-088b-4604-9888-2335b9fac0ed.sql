-- Allow Admins and Docentes to see usuarios in their cursillo
CREATE POLICY "usuarios_select_cursillo_admin_docente" 
ON public.usuarios 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.usuarios_cursillos uc
    WHERE uc.id_usuario = usuarios.id_usuario
      AND (
        public.has_cursillo_role(uc.id_cursillo, 'ADMINISTRADOR')
        OR public.has_cursillo_role(uc.id_cursillo, 'DOCENTE')
      )
  )
);