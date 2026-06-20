-- Filtrar el selector de cursos de reportes por el cursillo activo.
-- Mantener la funcion sin parametros evita romper clientes anteriores.

DROP FUNCTION IF EXISTS public.rpc_get_cursos_reporte(uuid);

CREATE OR REPLACE FUNCTION public.rpc_get_cursos_reporte(p_id_cursillo uuid)
RETURNS TABLE(
  id_curso uuid,
  titulo text,
  id_grupo_curso uuid,
  nombre_grupo text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    c.id_curso,
    c.titulo::text,
    c.id_grupo_curso,
    COALESCE(gc.nombre, 'Sin grupo')::text AS nombre_grupo
  FROM public.cursos c
  LEFT JOIN public.grupos_cursos gc ON gc.id_grupo_curso = c.id_grupo_curso
  WHERE c.id_cursillo = p_id_cursillo
    AND (
      public.has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR')
      OR public.has_cursillo_role(c.id_cursillo, 'DOCENTE')
      OR public.is_curso_docente(c.id_curso)
    )
  ORDER BY COALESCE(gc.orden, 999999), COALESCE(gc.nombre, 'Sin grupo'), c.titulo;
$function$;

GRANT EXECUTE ON FUNCTION public.rpc_get_cursos_reporte(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_get_cursos_reporte()
RETURNS TABLE(
  id_curso uuid,
  titulo text,
  id_grupo_curso uuid,
  nombre_grupo text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    c.id_curso,
    c.titulo::text,
    c.id_grupo_curso,
    COALESCE(gc.nombre, 'Sin grupo')::text AS nombre_grupo
  FROM public.cursos c
  LEFT JOIN public.grupos_cursos gc ON gc.id_grupo_curso = c.id_grupo_curso
  WHERE public.has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR')
     OR public.has_cursillo_role(c.id_cursillo, 'DOCENTE')
     OR public.is_curso_docente(c.id_curso)
  ORDER BY COALESCE(gc.orden, 999999), COALESCE(gc.nombre, 'Sin grupo'), c.titulo;
$function$;

GRANT EXECUTE ON FUNCTION public.rpc_get_cursos_reporte() TO authenticated;
