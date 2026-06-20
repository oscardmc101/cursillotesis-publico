-- Revert problematic usuarios policy that caused infinite recursion
DROP POLICY IF EXISTS "usuarios_select_cursillo_admin_docente" ON public.usuarios;

-- Update RPC to allow DOCENTE as well (keeps PII access server-side, avoids direct SELECT on usuarios)
CREATE OR REPLACE FUNCTION public.rpc_list_usuarios_cursillo(p_id_cursillo uuid)
 RETURNS TABLE(id_usuario uuid, correo text, nombres text, apellidos text, id_rol smallint, nombre_rol text, estado text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- Solo ADMINISTRADOR o DOCENTE ACTIVO puede listar
  if not (
    public.has_cursillo_role(p_id_cursillo, 'ADMINISTRADOR')
    or public.has_cursillo_role(p_id_cursillo, 'DOCENTE')
  ) then
    raise exception 'No autorizado: no tienes permisos para listar usuarios de este cursillo';
  end if;

  return query
  select
    u.id_usuario,
    u.correo::text,
    u.nombres::text,
    u.apellidos::text,
    uc.id_rol, -- smallint
    coalesce(r.nombre_rol, 'PENDIENTE')::text as nombre_rol,
    coalesce(uc.estado, 'PENDIENTE')::text as estado
  from public.usuarios u
  left join public.usuarios_cursillos uc
    on uc.id_usuario = u.id_usuario
   and uc.id_cursillo = p_id_cursillo
  left join public.roles r
    on r.id_rol = uc.id_rol
  order by u.apellidos, u.nombres;
end;
$function$;

GRANT EXECUTE ON FUNCTION public.rpc_list_usuarios_cursillo(uuid) TO authenticated;