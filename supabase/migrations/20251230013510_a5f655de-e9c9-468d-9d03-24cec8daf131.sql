-- Fix existing security issues

-- 1. Fix functions without search_path
CREATE OR REPLACE FUNCTION public.notify_admins_new_pending_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.estado = 'PENDIENTE' THEN
    INSERT INTO public.notificaciones (id_usuario, tipo, titulo, mensaje, link)
    SELECT uc.id_usuario, 'usuario_pendiente', 'Nuevo usuario pendiente',
           'Hay un nuevo usuario esperando aprobación: ' || 
           (SELECT nombres || ' ' || apellidos FROM public.usuarios WHERE id_usuario = NEW.id_usuario),
           '/usuarios?tab=pendientes'
    FROM public.usuarios_cursillos uc
    INNER JOIN public.roles r ON uc.id_rol = r.id_rol
    WHERE r.nombre_rol IN ('ADMINISTRADOR', 'DOCENTE')
      AND uc.estado = 'ACTIVO'
      AND uc.id_usuario != NEW.id_usuario;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_user_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF OLD.estado = 'PENDIENTE' AND NEW.estado = 'ACTIVO' THEN
    INSERT INTO public.notificaciones (id_usuario, tipo, titulo, mensaje)
    VALUES (NEW.id_usuario, 'usuario_aprobado', '¡Cuenta aprobada!', 'Tu cuenta ha sido aprobada. ¡Bienvenido al sistema!');
  ELSIF OLD.estado = 'PENDIENTE' AND NEW.estado = 'BLOQUEADO' THEN
    INSERT INTO public.notificaciones (id_usuario, tipo, titulo, mensaje)
    VALUES (NEW.id_usuario, 'usuario_rechazado', 'Solicitud rechazada', 'Tu solicitud de registro ha sido rechazada.');
  END IF;
  RETURN NEW;
END;
$function$;

-- 2. Enable RLS on anuncios table (was missing)
ALTER TABLE public.anuncios ENABLE ROW LEVEL SECURITY;

-- Anuncios are readable by all authenticated users in the cursillo
CREATE POLICY "anuncios_select_all"
ON public.anuncios
FOR SELECT
USING (
  public.has_cursillo_role(id_cursillo, 'ADMINISTRADOR')
  OR public.has_cursillo_role(id_cursillo, 'DOCENTE')
  OR public.has_cursillo_role(id_cursillo, 'ESTUDIANTE')
);

-- Only Admin/Docente can create anuncios
CREATE POLICY "anuncios_insert"
ON public.anuncios
FOR INSERT
WITH CHECK (
  public.has_cursillo_role(id_cursillo, 'ADMINISTRADOR')
  OR public.has_cursillo_role(id_cursillo, 'DOCENTE')
);

-- Only Admin can update/delete anuncios
CREATE POLICY "anuncios_update"
ON public.anuncios
FOR UPDATE
USING (public.has_cursillo_role(id_cursillo, 'ADMINISTRADOR'));

CREATE POLICY "anuncios_delete"
ON public.anuncios
FOR DELETE
USING (public.has_cursillo_role(id_cursillo, 'ADMINISTRADOR'));