-- Restrict report RPC execution to signed-in users.

REVOKE EXECUTE ON FUNCTION public.rpc_certificado_estudios(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_certificado_estudios(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.rpc_get_evaluaciones_reporte(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_evaluaciones_reporte(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.rpc_reporte_rendimiento_pregunta(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_reporte_rendimiento_pregunta(uuid) TO authenticated;
