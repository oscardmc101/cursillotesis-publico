-- Agregar estado RECHAZADO al constraint de usuarios_cursillos

ALTER TABLE public.usuarios_cursillos DROP CONSTRAINT IF EXISTS usuarios_cursillos_estado_check;

ALTER TABLE public.usuarios_cursillos ADD CONSTRAINT usuarios_cursillos_estado_check
CHECK (estado IN ('PENDIENTE', 'ACTIVO', 'INACTIVO', 'BLOQUEADO', 'RECHAZADO'));

-- Actualizar RLS policy para que docentes puedan cambiar estado a RECHAZADO
DROP POLICY IF EXISTS "Docentes pueden actualizar estado de estudiantes" ON public.usuarios_cursillos;

CREATE POLICY "Docentes pueden actualizar estado de estudiantes"
ON public.usuarios_cursillos
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios_cursillos uc2
    JOIN public.roles r ON uc2.id_rol = r.id_rol
    WHERE uc2.id_usuario = (SELECT u.id_usuario FROM public.usuarios u WHERE u.id_auth = auth.uid())
      AND uc2.id_cursillo = usuarios_cursillos.id_cursillo
      AND r.nombre_rol = 'DOCENTE'
      AND uc2.estado = 'ACTIVO'
  )
  AND EXISTS (
    SELECT 1 FROM public.roles r2
    WHERE r2.id_rol = usuarios_cursillos.id_rol
      AND r2.nombre_rol = 'ESTUDIANTE'
  )
)
WITH CHECK (
  estado IN ('PENDIENTE', 'ACTIVO', 'BLOQUEADO', 'RECHAZADO')
);
