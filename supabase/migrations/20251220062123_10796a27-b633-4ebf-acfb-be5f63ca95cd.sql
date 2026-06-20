-- Agregar política para que Admin/Docente puedan ver usuarios del cursillo
CREATE POLICY "usuarios_select_admin_docente" ON public.usuarios
FOR SELECT USING (
  EXISTS (
    SELECT 1 
    FROM public.usuarios_cursillos uc1
    JOIN public.usuarios_cursillos uc2 ON uc1.id_cursillo = uc2.id_cursillo
    WHERE uc1.id_usuario = public.current_id_usuario()
      AND uc2.id_usuario = usuarios.id_usuario
      AND (
        public.has_cursillo_role(uc1.id_cursillo, 'ADMINISTRADOR') OR 
        public.has_cursillo_role(uc1.id_cursillo, 'DOCENTE')
      )
  )
);