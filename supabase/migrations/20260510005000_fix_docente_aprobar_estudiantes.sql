-- Corrige la aprobacion de estudiantes por docentes.
-- La UI ya no depende de UPDATE directo con RLS; usa una RPC con permisos explicitos.

DROP POLICY IF EXISTS "usuarios_cursillos_update_admin_docente" ON public.usuarios_cursillos;
DROP POLICY IF EXISTS "Docentes pueden actualizar estado de estudiantes" ON public.usuarios_cursillos;
DROP POLICY IF EXISTS "usuarios_cursillos_update_staff_estado" ON public.usuarios_cursillos;
DROP POLICY IF EXISTS "usuarios_cursillos_update_admin" ON public.usuarios_cursillos;

CREATE POLICY "usuarios_cursillos_update_admin"
ON public.usuarios_cursillos
FOR UPDATE
USING (public.has_cursillo_role(id_cursillo, 'ADMINISTRADOR'))
WITH CHECK (public.has_cursillo_role(id_cursillo, 'ADMINISTRADOR'));

CREATE OR REPLACE FUNCTION public.rpc_set_estado_usuario_cursillo(
  p_id_cursillo uuid,
  p_id_usuario uuid,
  p_estado text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_estado text;
  v_target_role text;
  v_is_admin boolean;
  v_is_docente boolean;
  v_updated_estado text;
BEGIN
  IF p_id_cursillo IS NULL OR p_id_usuario IS NULL THEN
    RAISE EXCEPTION 'No autorizado: falta el cursillo o el usuario';
  END IF;

  v_estado := UPPER(TRIM(COALESCE(p_estado, '')));

  IF v_estado NOT IN ('PENDIENTE', 'ACTIVO', 'BLOQUEADO', 'RECHAZADO') THEN
    RAISE EXCEPTION 'Estado invalido: %', p_estado;
  END IF;

  v_is_admin := public.has_cursillo_role(p_id_cursillo, 'ADMINISTRADOR');
  v_is_docente := public.has_cursillo_role(p_id_cursillo, 'DOCENTE');

  IF NOT (v_is_admin OR v_is_docente) THEN
    RAISE EXCEPTION 'No autorizado: no tienes permisos para modificar usuarios de este cursillo';
  END IF;

  SELECT UPPER(TRIM(r.nombre_rol))
  INTO v_target_role
  FROM public.usuarios_cursillos uc
  LEFT JOIN public.roles r ON r.id_rol = uc.id_rol
  WHERE uc.id_cursillo = p_id_cursillo
    AND uc.id_usuario = p_id_usuario
  FOR UPDATE OF uc;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario no encontrado en este cursillo';
  END IF;

  IF v_is_docente AND NOT v_is_admin AND v_target_role IS DISTINCT FROM 'ESTUDIANTE' THEN
    RAISE EXCEPTION 'No autorizado: los docentes solo pueden modificar estudiantes';
  END IF;

  UPDATE public.usuarios_cursillos uc
  SET estado = v_estado
  WHERE uc.id_cursillo = p_id_cursillo
    AND uc.id_usuario = p_id_usuario
  RETURNING uc.estado INTO v_updated_estado;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se pudo actualizar el estado del usuario';
  END IF;

  RETURN v_updated_estado;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_set_estado_usuario_cursillo(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_set_estado_usuario_cursillo(uuid, uuid, text) TO authenticated;

COMMENT ON FUNCTION public.rpc_set_estado_usuario_cursillo(uuid, uuid, text) IS
  'Permite a administradores cambiar estado de cualquier usuario del cursillo y a docentes cambiar solo estudiantes.';
