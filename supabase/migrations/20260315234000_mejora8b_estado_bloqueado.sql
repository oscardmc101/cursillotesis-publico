-- Mejora 8b: Permitir estado BLOQUEADO en usuarios_cursillos

ALTER TABLE public.usuarios_cursillos DROP CONSTRAINT IF EXISTS usuarios_cursillos_estado_check;

ALTER TABLE public.usuarios_cursillos ADD CONSTRAINT usuarios_cursillos_estado_check
CHECK (estado IN ('PENDIENTE', 'ACTIVO', 'INACTIVO', 'BLOQUEADO'));
