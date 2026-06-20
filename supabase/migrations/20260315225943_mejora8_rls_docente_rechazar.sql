-- Mejora 8: Permitir a los Docentes actualizar el estado de los Estudiantes en su cursillo (para Aceptar/Rechazar)

-- Eliminar política anterior si existe (por si acaso la nombramos igual antes)
DROP POLICY IF EXISTS "usuarios_cursillos_update_admin_docente" ON public.usuarios_cursillos;

-- Crear política que permite UPDATE en usuarios_cursillos
CREATE POLICY "usuarios_cursillos_update_admin_docente"
ON public.usuarios_cursillos
FOR UPDATE
USING (
    public.has_cursillo_role(id_cursillo, 'ADMINISTRADOR')
    OR public.has_cursillo_role(id_cursillo, 'DOCENTE')
)
WITH CHECK (
    public.has_cursillo_role(id_cursillo, 'ADMINISTRADOR')
    OR (
        public.has_cursillo_role(id_cursillo, 'DOCENTE') 
        AND id_rol = 3 -- 3 = ESTUDIANTE (El docente solo puede modificar roles de estudiante)
    )
);
