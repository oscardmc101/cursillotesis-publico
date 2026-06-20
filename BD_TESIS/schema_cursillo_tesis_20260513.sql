


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."reporte_participacion_curso_row" AS (
	"id_usuario" "uuid",
	"nombres" "text",
	"apellidos" "text",
	"lecciones_completadas" integer,
	"total_lecciones" integer,
	"tareas_entregadas" integer,
	"total_tareas" integer,
	"tareas_a_tiempo" integer,
	"evaluaciones_completadas" integer,
	"total_evaluaciones" integer,
	"promedio_tareas" numeric,
	"promedio_evaluaciones" numeric,
	"ultima_actividad" timestamp with time zone
);


ALTER TYPE "public"."reporte_participacion_curso_row" OWNER TO "postgres";


CREATE TYPE "public"."reporte_progreso_estudiante_row" AS (
	"tipo" "text",
	"id" "uuid",
	"titulo" "text",
	"modulo" "text",
	"estado" "text",
	"fecha_entrega" timestamp with time zone,
	"fecha_limite" timestamp with time zone,
	"calificacion" numeric,
	"puntaje_maximo" numeric,
	"intentos" integer,
	"intentos_max" integer
);


ALTER TYPE "public"."reporte_progreso_estudiante_row" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_signup_contact_metadata"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_telefono text;
  v_telefono_visible boolean;
BEGIN
  v_telefono := nullif(btrim(NEW.raw_user_meta_data ->> 'telefono'), '');
  v_telefono_visible := coalesce((NEW.raw_user_meta_data ->> 'telefono_visible')::boolean, true);

  UPDATE public.usuarios
  SET
    telefono = v_telefono,
    telefono_visible = v_telefono_visible
  WHERE id_auth = NEW.id;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."apply_signup_contact_metadata"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_admin_or_own_curso"("p_curso_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cursos c
    WHERE c.id_curso = p_curso_id
      AND (
        public.has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR')
        OR c.id_docente = public.current_id_usuario()
      )
  );
$$;


ALTER FUNCTION "public"."can_admin_or_own_curso"("p_curso_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_manage_curso"("p_curso_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cursos c
    WHERE c.id_curso = p_curso_id
      AND (
        public.has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR')
        OR c.id_docente = public.current_id_usuario()
        OR EXISTS (
          SELECT 1
          FROM public.curso_docentes_colaboradores cdc
          WHERE cdc.id_curso = c.id_curso
            AND cdc.id_docente = public.current_id_usuario()
        )
      )
  );
$$;


ALTER FUNCTION "public"."can_manage_curso"("p_curso_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_manage_evaluacion"("p_evaluacion_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.evaluaciones ev
    JOIN public.lecciones l ON l.id_leccion = ev.id_leccion
    JOIN public.modulos m ON m.id_modulo = l.id_modulo
    JOIN public.cursos c ON c.id_curso = m.id_curso
    WHERE ev.id_evaluacion = p_evaluacion_id
      AND public.can_manage_curso(c.id_curso)
  );
$$;


ALTER FUNCTION "public"."can_manage_evaluacion"("p_evaluacion_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_manage_leccion"("p_leccion_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lecciones l
    JOIN public.modulos m ON m.id_modulo = l.id_modulo
    JOIN public.cursos c ON c.id_curso = m.id_curso
    WHERE l.id_leccion = p_leccion_id
      AND public.can_manage_curso(c.id_curso)
  );
$$;


ALTER FUNCTION "public"."can_manage_leccion"("p_leccion_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_manage_tarea"("p_tarea_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tareas t
    JOIN public.lecciones l ON l.id_leccion = t.id_leccion
    JOIN public.modulos m ON m.id_modulo = l.id_modulo
    JOIN public.cursos c ON c.id_curso = m.id_curso
    WHERE t.id_tarea = p_tarea_id
      AND public.can_manage_curso(c.id_curso)
  );
$$;


ALTER FUNCTION "public"."can_manage_tarea"("p_tarea_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_read_soporte_evidencia"("p_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_parts text[];
  v_owner_id uuid;
BEGIN
  v_parts := string_to_array(coalesce(p_name, ''), '/');

  IF array_length(v_parts, 1) < 2
     OR v_parts[1] !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  THEN
    RETURN false;
  END IF;

  v_owner_id := v_parts[1]::uuid;

  IF v_owner_id = public.current_id_usuario() THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.soporte_solicitudes ss
    WHERE ss.imagen_bucket = 'soporte_evidencias'
      AND ss.imagen_path = p_name
      AND public.has_cursillo_role(ss.id_cursillo, 'ADMINISTRADOR')
  );
END;
$_$;


ALTER FUNCTION "public"."can_read_soporte_evidencia"("p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_view_curso"("p_id_curso" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cursos c
    WHERE c.id_curso = p_id_curso
      AND (
        c.es_publicado = true
        OR public.has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR')
        OR public.is_curso_docente(c.id_curso)
        OR EXISTS (
          SELECT 1
          FROM public.inscripciones i
          WHERE i.id_curso = c.id_curso
            AND i.id_usuario = public.current_id_usuario()
        )
      )
  );
$$;


ALTER FUNCTION "public"."can_view_curso"("p_id_curso" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_view_leccion"("p_id_leccion" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lecciones l
    JOIN public.modulos m ON m.id_modulo = l.id_modulo
    JOIN public.cursos c ON c.id_curso = m.id_curso
    WHERE l.id_leccion = p_id_leccion
      AND public.can_view_curso(c.id_curso)
  );
$$;


ALTER FUNCTION "public"."can_view_leccion"("p_id_leccion" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_write_soporte_evidencia"("p_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_parts text[];
  v_owner_id uuid;
BEGIN
  v_parts := string_to_array(coalesce(p_name, ''), '/');

  IF array_length(v_parts, 1) < 2
     OR v_parts[1] !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  THEN
    RETURN false;
  END IF;

  v_owner_id := v_parts[1]::uuid;
  RETURN v_owner_id = public.current_id_usuario();
END;
$_$;


ALTER FUNCTION "public"."can_write_soporte_evidencia"("p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_id_usuario"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select u.id_usuario
  from public.usuarios u
  where u.id_auth = auth.uid()
  limit 1
$$;


ALTER FUNCTION "public"."current_id_usuario"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_crear_usuario_desde_auth"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  -- Insert idempotente: si ya existe el perfil, no hace nada
  insert into public.usuarios (id_auth, correo, nombres, apellidos)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nombres', ''),
    coalesce(new.raw_user_meta_data->>'apellidos', '')
  )
  on conflict (id_auth) do update
    set correo = excluded.correo;

  return new;
end;
$$;


ALTER FUNCTION "public"."fn_crear_usuario_desde_auth"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.usuarios (id_auth, nombres, apellidos, correo)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data ->> 'nombres', ''),
    COALESCE(new.raw_user_meta_data ->> 'apellidos', ''),
    new.email
  );
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_usuario_cursillo"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_tipo_registro text;
  v_id_rol smallint;
  v_cursillo_id uuid;
begin
  -- Read tipo_registro and id_cursillo from auth user metadata
  select 
    raw_user_meta_data->>'tipo_registro',
    (raw_user_meta_data->>'id_cursillo')::uuid
  into v_tipo_registro, v_cursillo_id
  from auth.users
  where id = new.id_auth;

  -- Fallback: if no id_cursillo in metadata, use the original default
  if v_cursillo_id is null then
    v_cursillo_id := '04cbfec5-497a-480d-ba4d-1a08c982edb7';
  end if;

  -- Verify the cursillo actually exists
  if not exists (select 1 from public.cursillos where id_cursillo = v_cursillo_id) then
    v_cursillo_id := '04cbfec5-497a-480d-ba4d-1a08c982edb7';
  end if;

  if v_tipo_registro = 'DOCENTE' then
    v_id_rol := 2;
  else
    v_id_rol := 3;
  end if;

  insert into public.usuarios_cursillos (id_usuario, id_cursillo, id_rol, estado)
  values (new.id_usuario, v_cursillo_id, v_id_rol, 'PENDIENTE')
  on conflict (id_usuario, id_cursillo)
  do update set
    id_rol = coalesce(public.usuarios_cursillos.id_rol, excluded.id_rol),
    estado = coalesce(public.usuarios_cursillos.estado, excluded.estado);

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_usuario_cursillo"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_cursillo_role"("p_cursillo" "uuid", "p_nombre_rol" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.usuarios_cursillos uc
    join public.roles r on r.id_rol = uc.id_rol
    where uc.id_cursillo = p_cursillo
      and uc.id_usuario = public.current_id_usuario()
      and upper(trim(r.nombre_rol)) = upper(trim(p_nombre_rol))
      and upper(trim(coalesce(uc.estado, 'PENDIENTE'))) = 'ACTIVO'
  );
$$;


ALTER FUNCTION "public"."has_cursillo_role"("p_cursillo" "uuid", "p_nombre_rol" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_or_docente"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM usuarios u
    JOIN usuarios_cursillos uc ON uc.id_usuario = u.id_usuario
    WHERE u.id_auth = auth.uid()
    AND (uc.id_rol = 1 OR uc.id_rol = 2) -- ADMINISTRADOR = 1, DOCENTE = 2
    AND uc.estado = 'ACTIVO'
  )
$$;


ALTER FUNCTION "public"."is_admin_or_docente"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_cursillo_member_activo"("p_cursillo_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios_cursillos uc
    WHERE uc.id_cursillo = p_cursillo_id
      AND uc.id_usuario = public.current_id_usuario()
      AND uc.estado = 'ACTIVO'
  );
$$;


ALTER FUNCTION "public"."is_cursillo_member_activo"("p_cursillo_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_curso_docente"("p_curso_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cursos c
    WHERE c.id_curso = p_curso_id
      AND c.id_docente = public.current_id_usuario()
  )
  OR EXISTS (
    SELECT 1
    FROM public.curso_docentes_colaboradores cdc
    WHERE cdc.id_curso = p_curso_id
      AND cdc.id_docente = public.current_id_usuario()
  );
$$;


ALTER FUNCTION "public"."is_curso_docente"("p_curso_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_enrolled_in_evaluacion_course"("p_evaluacion_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.evaluaciones ev
    JOIN public.lecciones l ON l.id_leccion = ev.id_leccion
    JOIN public.modulos m ON m.id_modulo = l.id_modulo
    JOIN public.cursos c ON c.id_curso = m.id_curso
    JOIN public.inscripciones i ON i.id_curso = c.id_curso
    WHERE ev.id_evaluacion = p_evaluacion_id
      AND i.id_usuario = public.current_id_usuario()
      AND c.es_publicado = true
  );
$$;


ALTER FUNCTION "public"."is_enrolled_in_evaluacion_course"("p_evaluacion_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_enrolled_in_tarea_course"("p_tarea_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tareas t
    JOIN public.lecciones l ON l.id_leccion = t.id_leccion
    JOIN public.modulos m ON m.id_modulo = l.id_modulo
    JOIN public.cursos c ON c.id_curso = m.id_curso
    JOIN public.inscripciones i ON i.id_curso = c.id_curso
    WHERE t.id_tarea = p_tarea_id
      AND i.id_usuario = public.current_id_usuario()
      AND c.es_publicado = true
  );
$$;


ALTER FUNCTION "public"."is_enrolled_in_tarea_course"("p_tarea_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_usuario_docente_activo_en_cursillo"("p_id_usuario" "uuid", "p_id_cursillo" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios_cursillos uc
    JOIN public.roles r ON r.id_rol = uc.id_rol
    WHERE uc.id_usuario = p_id_usuario
      AND uc.id_cursillo = p_id_cursillo
      AND uc.estado = 'ACTIVO'
      AND UPPER(TRIM(r.nombre_rol)) = 'DOCENTE'
  );
$$;


ALTER FUNCTION "public"."is_usuario_docente_activo_en_cursillo"("p_id_usuario" "uuid", "p_id_cursillo" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_usuario_staff_activo_en_cursillo"("p_id_usuario" "uuid", "p_id_cursillo" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios_cursillos uc
    JOIN public.roles r ON r.id_rol = uc.id_rol
    WHERE uc.id_usuario = p_id_usuario
      AND uc.id_cursillo = p_id_cursillo
      AND uc.estado = 'ACTIVO'
      AND UPPER(TRIM(r.nombre_rol)) IN ('ADMINISTRADOR', 'DOCENTE')
  );
$$;


ALTER FUNCTION "public"."is_usuario_staff_activo_en_cursillo"("p_id_usuario" "uuid", "p_id_cursillo" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_admins_new_pending_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."notify_admins_new_pending_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_user_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."notify_user_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."row_is_estudiante"("p_target_id_usuario" "uuid", "p_cursillo" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.usuarios_cursillos uc
    join public.roles r on r.id_rol = uc.id_rol
    where uc.id_cursillo = p_cursillo
      and uc.id_usuario = p_target_id_usuario
      and upper(trim(r.nombre_rol)) = 'ESTUDIANTE'
  );
$$;


ALTER FUNCTION "public"."row_is_estudiante"("p_target_id_usuario" "uuid", "p_cursillo" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_asignar_rol_usuario"("p_id_usuario" "uuid", "p_id_cursillo" "uuid", "p_id_rol" smallint) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not exists (
    select 1
    from public.usuarios_cursillos uc
    join public.roles r on r.id_rol = uc.id_rol
    where uc.id_usuario = (
      select u.id_usuario from public.usuarios u where u.id_auth = auth.uid()
    )
      and uc.id_cursillo = p_id_cursillo
      and r.nombre_rol = 'ADMINISTRADOR'
      and uc.estado = 'ACTIVO'
  ) then
    raise exception 'No autorizado: no eres administrador activo de este cursillo';
  end if;

  insert into public.usuarios_cursillos (id_usuario, id_cursillo, id_rol, estado)
  values (p_id_usuario, p_id_cursillo, p_id_rol, 'ACTIVO')
  on conflict (id_usuario, id_cursillo)
  do update set id_rol = excluded.id_rol;
end;
$$;


ALTER FUNCTION "public"."rpc_asignar_rol_usuario"("p_id_usuario" "uuid", "p_id_cursillo" "uuid", "p_id_rol" smallint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_dashboard_entregas_por_calificar"() RETURNS TABLE("id_entrega" "uuid", "id_tarea" "uuid", "id_usuario" "uuid", "comentario_estudiante" "text", "estado" "text", "calificacion" numeric, "comentario_docente" "text", "retroalimentacion_archivo_url" "text", "fecha_entrega" timestamp with time zone, "tarea_titulo" "text", "curso_titulo" "text", "usuario_nombres" "text", "usuario_apellidos" "text", "usuario_correo" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.usuarios_cursillos uc
    JOIN public.roles r ON r.id_rol = uc.id_rol
    WHERE uc.id_usuario = public.current_id_usuario()
      AND uc.estado = 'ACTIVO'
      AND UPPER(TRIM(r.nombre_rol)) IN ('ADMINISTRADOR', 'DOCENTE')
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  SELECT
    et.id_entrega,
    et.id_tarea,
    et.id_usuario,
    et.comentario_estudiante::text,
    et.estado::text,
    et.calificacion,
    et.comentario_docente::text,
    et.retroalimentacion_archivo_url::text,
    et.fecha_entrega,
    t.titulo::text AS tarea_titulo,
    c.titulo::text AS curso_titulo,
    u.nombres::text AS usuario_nombres,
    u.apellidos::text AS usuario_apellidos,
    u.correo::text AS usuario_correo
  FROM public.entregas_tareas et
  JOIN public.tareas t ON t.id_tarea = et.id_tarea
  JOIN public.lecciones l ON l.id_leccion = t.id_leccion
  JOIN public.modulos m ON m.id_modulo = l.id_modulo
  JOIN public.cursos c ON c.id_curso = m.id_curso
  JOIN public.usuarios u ON u.id_usuario = et.id_usuario
  WHERE et.estado IN ('ENVIADO', 'CALIFICADO')
    AND public.can_manage_curso(c.id_curso)
  ORDER BY et.fecha_entrega ASC;
END;
$$;


ALTER FUNCTION "public"."rpc_dashboard_entregas_por_calificar"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_dashboard_entregas_por_calificar"("p_id_cursillo" "uuid") RETURNS TABLE("id_entrega" "uuid", "id_tarea" "uuid", "id_usuario" "uuid", "comentario_estudiante" "text", "estado" "text", "calificacion" numeric, "comentario_docente" "text", "retroalimentacion_archivo_url" "text", "fecha_entrega" timestamp with time zone, "tarea_titulo" "text", "curso_titulo" "text", "usuario_nombres" "text", "usuario_apellidos" "text", "usuario_correo" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.usuarios_cursillos uc
    JOIN public.roles r ON r.id_rol = uc.id_rol
    WHERE uc.id_usuario = public.current_id_usuario()
      AND uc.id_cursillo = p_id_cursillo
      AND uc.estado = 'ACTIVO'
      AND UPPER(TRIM(r.nombre_rol)) IN ('ADMINISTRADOR', 'DOCENTE')
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  SELECT
    et.id_entrega,
    et.id_tarea,
    et.id_usuario,
    et.comentario_estudiante::text,
    et.estado::text,
    et.calificacion,
    et.comentario_docente::text,
    et.retroalimentacion_archivo_url::text,
    et.fecha_entrega,
    t.titulo::text AS tarea_titulo,
    c.titulo::text AS curso_titulo,
    u.nombres::text AS usuario_nombres,
    u.apellidos::text AS usuario_apellidos,
    u.correo::text AS usuario_correo
  FROM public.entregas_tareas et
  JOIN public.tareas t ON t.id_tarea = et.id_tarea
  JOIN public.lecciones l ON l.id_leccion = t.id_leccion
  JOIN public.modulos m ON m.id_modulo = l.id_modulo
  JOIN public.cursos c ON c.id_curso = m.id_curso
  JOIN public.usuarios u ON u.id_usuario = et.id_usuario
  WHERE et.estado IN ('ENVIADO', 'CALIFICADO')
    AND c.id_cursillo = p_id_cursillo
    AND public.can_manage_curso(c.id_curso)
  ORDER BY et.fecha_entrega ASC;
END;
$$;


ALTER FUNCTION "public"."rpc_dashboard_entregas_por_calificar"("p_id_cursillo" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_dashboard_estudiante"("p_id_usuario" "uuid", "p_id_cursillo" "uuid") RETURNS TABLE("id_curso" "uuid", "titulo" "text", "id_grupo_curso" "uuid", "nombre_grupo" "text", "total_lecciones" bigint, "lecciones_completadas" bigint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_current_usuario uuid;
BEGIN
  v_current_usuario := public.current_id_usuario();

  IF v_current_usuario IS NULL OR p_id_usuario IS DISTINCT FROM v_current_usuario THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  SELECT
    c.id_curso,
    c.titulo::text,
    c.id_grupo_curso,
    COALESCE(gc.nombre, 'Sin grupo')::text AS nombre_grupo,
    COUNT(DISTINCT l.id_leccion)::bigint AS total_lecciones,
    COUNT(DISTINCT pl.id_leccion)::bigint AS lecciones_completadas
  FROM public.inscripciones i
  JOIN public.cursos c ON c.id_curso = i.id_curso
  LEFT JOIN public.grupos_cursos gc ON gc.id_grupo_curso = c.id_grupo_curso
  LEFT JOIN public.modulos m ON m.id_curso = c.id_curso
  LEFT JOIN public.lecciones l ON l.id_modulo = m.id_modulo
  LEFT JOIN public.progreso_lecciones pl ON pl.id_leccion = l.id_leccion
                                  AND pl.id_usuario = p_id_usuario
                                  AND pl.completado = true
  WHERE i.id_usuario = p_id_usuario
    AND c.id_cursillo = p_id_cursillo
  GROUP BY c.id_curso, c.titulo, c.id_grupo_curso, gc.nombre, gc.orden
  ORDER BY COALESCE(gc.orden, 999999), COALESCE(gc.nombre, 'Sin grupo'), c.titulo;
END;
$$;


ALTER FUNCTION "public"."rpc_dashboard_estudiante"("p_id_usuario" "uuid", "p_id_cursillo" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_dashboard_staff"("p_id_cursillo" "uuid") RETURNS TABLE("pending_users" bigint, "total_users" bigint, "active_courses" bigint, "enrollments" bigint, "recent_activity" "jsonb")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT (
    public.has_cursillo_role(p_id_cursillo, 'ADMINISTRADOR')
    OR public.has_cursillo_role(p_id_cursillo, 'DOCENTE')
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  WITH recent_items AS (
    SELECT
      ('user-' || u.id_usuario::text) AS id,
      'user_registered'::text AS type,
      trim('Nuevo usuario registrado: ' || coalesce(u.nombres, '') || ' ' || coalesce(u.apellidos, '')) AS message,
      u.fecha_creacion AS timestamp
    FROM public.usuarios_cursillos uc
    JOIN public.usuarios u ON u.id_usuario = uc.id_usuario
    WHERE uc.id_cursillo = p_id_cursillo

    UNION ALL

    SELECT
      ('course-' || c.id_curso::text) AS id,
      'course_created'::text AS type,
      ('Nuevo curso: ' || c.titulo)::text AS message,
      c.fecha_creacion AS timestamp
    FROM public.cursos c
    WHERE c.id_cursillo = p_id_cursillo
  ),
  recent_activity AS (
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'type', type,
          'message', message,
          'timestamp', timestamp
        )
        ORDER BY timestamp DESC
      ),
      '[]'::jsonb
    ) AS items
    FROM (
      SELECT id, type, message, timestamp
      FROM recent_items
      ORDER BY timestamp DESC
      LIMIT 5
    ) ordered_items
  )
  SELECT
    (SELECT COUNT(*) FROM public.usuarios_cursillos WHERE id_cursillo = p_id_cursillo AND estado = 'PENDIENTE')::bigint AS pending_users,
    (SELECT COUNT(*) FROM public.usuarios_cursillos WHERE id_cursillo = p_id_cursillo)::bigint AS total_users,
    (SELECT COUNT(*) FROM public.cursos WHERE id_cursillo = p_id_cursillo AND es_publicado = true)::bigint AS active_courses,
    (
      SELECT COUNT(*)
      FROM public.inscripciones i
      JOIN public.cursos c ON c.id_curso = i.id_curso
      JOIN public.usuarios_cursillos uc
        ON uc.id_usuario = i.id_usuario
       AND uc.id_cursillo = c.id_cursillo
      JOIN public.roles r ON r.id_rol = uc.id_rol
      WHERE c.id_cursillo = p_id_cursillo
        AND UPPER(TRIM(r.nombre_rol)) = 'ESTUDIANTE'
    )::bigint AS enrollments,
    recent_activity.items
  FROM recent_activity;
END;
$$;


ALTER FUNCTION "public"."rpc_dashboard_staff"("p_id_cursillo" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_dashboard_tareas_pendientes"("p_id_usuario" "uuid", "p_id_cursillo" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id_tarea" "uuid", "id_leccion" "uuid", "titulo" "text", "descripcion" "text", "fecha_limite" timestamp with time zone, "permite_reintentos" boolean, "max_reintentos" integer, "puntaje_maximo" numeric, "fecha_creacion" timestamp with time zone, "curso_titulo" "text", "leccion_titulo" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF p_id_usuario <> public.current_id_usuario() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  SELECT
    t.id_tarea::uuid,
    t.id_leccion::uuid,
    t.titulo::text,
    t.descripcion::text,
    t.fecha_limite::timestamptz,
    t.permite_reintentos::boolean,
    t.max_reintentos::integer,
    t.puntaje_maximo::numeric,
    t.fecha_creacion::timestamptz,
    c.titulo::text AS curso_titulo,
    l.titulo::text AS leccion_titulo
  FROM public.inscripciones i
  JOIN public.cursos c ON c.id_curso = i.id_curso
  JOIN public.modulos m ON m.id_curso = c.id_curso
  JOIN public.lecciones l ON l.id_modulo = m.id_modulo
  JOIN public.tareas t ON t.id_leccion = l.id_leccion
  WHERE i.id_usuario = p_id_usuario
    AND c.es_publicado = true
    AND (p_id_cursillo IS NULL OR c.id_cursillo = p_id_cursillo)
    AND NOT EXISTS (
      SELECT 1
      FROM public.entregas_tareas et
      WHERE et.id_tarea = t.id_tarea
        AND et.id_usuario = p_id_usuario
        AND et.estado = 'CALIFICADO'
    )
  ORDER BY t.fecha_limite ASC NULLS LAST, t.fecha_creacion ASC;
END;
$$;


ALTER FUNCTION "public"."rpc_dashboard_tareas_pendientes"("p_id_usuario" "uuid", "p_id_cursillo" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_enviar_reclamo_evaluacion"("p_id_respuesta" "uuid", "p_justificacion" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_id_usuario uuid;
  v_reclamo_id uuid;
  v_respuesta record;
  v_gestor record;
BEGIN
  v_id_usuario := public.current_id_usuario();

  IF v_id_usuario IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF length(trim(coalesce(p_justificacion, ''))) = 0 THEN
    RAISE EXCEPTION 'La justificacion es obligatoria';
  END IF;

  SELECT
    r.id_respuesta,
    r.id_intento,
    r.puntaje_obtenido,
    i.id_usuario,
    i.estado,
    i.id_evaluacion,
    ev.titulo AS evaluacion_titulo,
    c.id_curso,
    c.id_cursillo,
    c.id_docente
  INTO v_respuesta
  FROM public.respuestas_intento r
  JOIN public.intentos_evaluacion i ON i.id_intento = r.id_intento
  JOIN public.evaluaciones ev ON ev.id_evaluacion = i.id_evaluacion
  JOIN public.lecciones l ON l.id_leccion = ev.id_leccion
  JOIN public.modulos m ON m.id_modulo = l.id_modulo
  JOIN public.cursos c ON c.id_curso = m.id_curso
  WHERE r.id_respuesta = p_id_respuesta;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Respuesta no encontrada';
  END IF;

  IF v_respuesta.id_usuario IS DISTINCT FROM v_id_usuario THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF v_respuesta.estado NOT IN ('CORREGIDO', 'AUTOCORREGIDO') THEN
    RAISE EXCEPTION 'Solo se pueden reclamar evaluaciones corregidas';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.reclamos_evaluacion re
    WHERE re.id_intento = v_respuesta.id_intento
      AND re.estado = 'PENDIENTE'
  ) THEN
    RAISE EXCEPTION 'Ya existe un reclamo pendiente para este intento';
  END IF;

  INSERT INTO public.reclamos_evaluacion (
    id_intento,
    id_respuesta,
    id_estudiante,
    justificacion,
    puntaje_original
  )
  VALUES (
    v_respuesta.id_intento,
    v_respuesta.id_respuesta,
    v_id_usuario,
    trim(p_justificacion),
    coalesce(v_respuesta.puntaje_obtenido, 0)
  )
  RETURNING id_reclamo INTO v_reclamo_id;

  PERFORM set_config('app.allow_reclamo_evaluacion', 'on', true);

  UPDATE public.intentos_evaluacion
  SET estado = 'RECLAMADO'
  WHERE id_intento = v_respuesta.id_intento;

  FOR v_gestor IN
    WITH gestores AS (
      SELECT uc.id_usuario
      FROM public.usuarios_cursillos uc
      JOIN public.roles ro ON ro.id_rol = uc.id_rol
      WHERE uc.id_cursillo = v_respuesta.id_cursillo
        AND uc.estado = 'ACTIVO'
        AND UPPER(TRIM(ro.nombre_rol)) = 'ADMINISTRADOR'

      UNION

      SELECT c.id_docente AS id_usuario
      FROM public.cursos c
      WHERE c.id_curso = v_respuesta.id_curso
        AND c.id_docente IS NOT NULL

      UNION

      SELECT cdc.id_docente AS id_usuario
      FROM public.curso_docentes_colaboradores cdc
      WHERE cdc.id_curso = v_respuesta.id_curso
    )
    SELECT DISTINCT id_usuario
    FROM gestores
    WHERE id_usuario IS NOT NULL
  LOOP
    INSERT INTO public.notificaciones (id_usuario, id_cursillo, tipo, titulo, mensaje, link)
    VALUES (
      v_gestor.id_usuario,
      v_respuesta.id_cursillo,
      'RECLAMO_EVALUACION',
      'Nuevo reclamo de evaluacion',
      'Un estudiante reclamo una correccion en "' || coalesce(v_respuesta.evaluacion_titulo, 'Evaluacion') || '".',
      '/correcciones/evaluacion/' || v_respuesta.id_intento::text
    );
  END LOOP;

  RETURN v_reclamo_id;
END;
$$;


ALTER FUNCTION "public"."rpc_enviar_reclamo_evaluacion"("p_id_respuesta" "uuid", "p_justificacion" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_cursillo_stats"("p_id_cursillo" "uuid") RETURNS TABLE("total_usuarios" bigint, "total_cursos" bigint, "total_inscripciones" bigint, "cursos_publicados" bigint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Solo ADMINISTRADOR o DOCENTE del cursillo puede ver estadísticas
  IF NOT (
    public.has_cursillo_role(p_id_cursillo, 'ADMINISTRADOR')
    OR public.has_cursillo_role(p_id_cursillo, 'DOCENTE')
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.usuarios_cursillos WHERE id_cursillo = p_id_cursillo)::bigint AS total_usuarios,
    (SELECT COUNT(*) FROM public.cursos WHERE id_cursillo = p_id_cursillo)::bigint AS total_cursos,
    (SELECT COUNT(*) FROM public.inscripciones i 
     JOIN public.cursos c ON c.id_curso = i.id_curso 
     WHERE c.id_cursillo = p_id_cursillo)::bigint AS total_inscripciones,
    (SELECT COUNT(*) FROM public.cursos WHERE id_cursillo = p_id_cursillo AND es_publicado = true)::bigint AS cursos_publicados;
END;
$$;


ALTER FUNCTION "public"."rpc_get_cursillo_stats"("p_id_cursillo" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_curso_docentes_publicos"("p_id_curso" "uuid") RETURNS TABLE("propietario_id" "uuid", "propietario_nombres" "text", "propietario_apellidos" "text", "ayudantes" "jsonb")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT public.can_view_curso(p_id_curso) THEN
    RAISE EXCEPTION 'No autorizado para ver docentes del curso';
  END IF;

  RETURN QUERY
  SELECT
    propietario.id_usuario AS propietario_id,
    propietario.nombres::text AS propietario_nombres,
    propietario.apellidos::text AS propietario_apellidos,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id_docente', ayudante.id_usuario,
            'nombres', ayudante.nombres,
            'apellidos', ayudante.apellidos
          )
          ORDER BY ayudante.apellidos, ayudante.nombres
        )
        FROM public.curso_docentes_colaboradores cdc
        JOIN public.usuarios ayudante ON ayudante.id_usuario = cdc.id_docente
        WHERE cdc.id_curso = c.id_curso
      ),
      '[]'::jsonb
    ) AS ayudantes
  FROM public.cursos c
  LEFT JOIN public.usuarios propietario ON propietario.id_usuario = c.id_docente
  WHERE c.id_curso = p_id_curso;
END;
$$;


ALTER FUNCTION "public"."rpc_get_curso_docentes_publicos"("p_id_curso" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_cursos_reporte"() RETURNS TABLE("id_curso" "uuid", "titulo" "text", "id_grupo_curso" "uuid", "nombre_grupo" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    c.id_curso,
    c.titulo::text,
    c.id_grupo_curso,
    COALESCE(gc.nombre, 'Sin grupo')::text AS nombre_grupo
  FROM public.cursos c
  LEFT JOIN public.grupos_cursos gc ON gc.id_grupo_curso = c.id_grupo_curso
  WHERE public.has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR')
     OR public.is_curso_docente(c.id_curso)
  ORDER BY COALESCE(gc.orden, 999999), COALESCE(gc.nombre, 'Sin grupo'), c.titulo;
$$;


ALTER FUNCTION "public"."rpc_get_cursos_reporte"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_cursos_reporte"("p_id_cursillo" "uuid") RETURNS TABLE("id_curso" "uuid", "titulo" "text", "id_grupo_curso" "uuid", "nombre_grupo" "text")
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
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
      OR public.is_curso_docente(c.id_curso)
    )
  ORDER BY COALESCE(gc.orden, 999999), COALESCE(gc.nombre, 'Sin grupo'), c.titulo;
$$;


ALTER FUNCTION "public"."rpc_get_cursos_reporte"("p_id_cursillo" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_inscribirse_curso"("p_id_curso" "uuid", "p_password" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_id_usuario uuid;
  v_id_inscripcion uuid;
  v_curso record;
  v_password text;
  v_curso_password_ok boolean;
  v_grupo_password_ok boolean;
BEGIN
  v_id_usuario := public.current_id_usuario();

  IF v_id_usuario IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  SELECT
    c.id_curso,
    c.id_cursillo,
    c.es_publicado,
    c.requiere_password AS curso_requiere_password,
    c.password_hash AS curso_password_hash,
    COALESCE(gc.requiere_password, false) AS grupo_requiere_password,
    gc.password_hash AS grupo_password_hash
  INTO v_curso
  FROM public.cursos c
  LEFT JOIN public.grupos_cursos gc ON gc.id_grupo_curso = c.id_grupo_curso
  WHERE c.id_curso = p_id_curso;

  IF v_curso.id_curso IS NULL THEN
    RAISE EXCEPTION 'Curso no encontrado';
  END IF;

  IF v_curso.es_publicado IS NOT TRUE THEN
    RAISE EXCEPTION 'El curso no está publicado';
  END IF;

  IF NOT public.has_cursillo_role(v_curso.id_cursillo, 'ESTUDIANTE') THEN
    RAISE EXCEPTION 'No autorizado para inscribirse en este curso';
  END IF;

  v_password := trim(coalesce(p_password, ''));

  IF v_curso.curso_requiere_password OR v_curso.grupo_requiere_password THEN
    IF v_password = '' THEN
      RAISE EXCEPTION 'La contraseña es obligatoria';
    END IF;

    v_curso_password_ok :=
      v_curso.curso_requiere_password
      AND v_curso.curso_password_hash IS NOT NULL
      AND crypt(v_password, v_curso.curso_password_hash) = v_curso.curso_password_hash;

    v_grupo_password_ok :=
      v_curso.grupo_requiere_password
      AND v_curso.grupo_password_hash IS NOT NULL
      AND crypt(v_password, v_curso.grupo_password_hash) = v_curso.grupo_password_hash;

    IF NOT (v_curso_password_ok OR v_grupo_password_ok) THEN
      IF v_curso.curso_requiere_password AND v_curso.grupo_requiere_password THEN
        RAISE EXCEPTION 'Contraseña incorrecta';
      ELSIF v_curso.curso_requiere_password THEN
        RAISE EXCEPTION 'Contraseña de curso incorrecta';
      ELSE
        RAISE EXCEPTION 'Contraseña de grupo incorrecta';
      END IF;
    END IF;
  END IF;

  SELECT i.id_inscripcion
  INTO v_id_inscripcion
  FROM public.inscripciones i
  WHERE i.id_usuario = v_id_usuario
    AND i.id_curso = p_id_curso
  LIMIT 1;

  IF v_id_inscripcion IS NOT NULL THEN
    RETURN v_id_inscripcion;
  END IF;

  INSERT INTO public.inscripciones (id_usuario, id_curso)
  VALUES (v_id_usuario, p_id_curso)
  RETURNING id_inscripcion INTO v_id_inscripcion;

  RETURN v_id_inscripcion;
END;
$$;


ALTER FUNCTION "public"."rpc_inscribirse_curso"("p_id_curso" "uuid", "p_password" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_list_all_inscripciones"("p_id_cursillo" "uuid") RETURNS TABLE("id_inscripcion" "uuid", "fecha_inscripcion" timestamp with time zone, "id_usuario" "uuid", "nombres" "text", "apellidos" "text", "correo" "text", "id_curso" "uuid", "titulo_curso" "text", "id_grupo_curso" "uuid", "nombre_grupo" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT (
    public.has_cursillo_role(p_id_cursillo, 'ADMINISTRADOR')
    OR public.has_cursillo_role(p_id_cursillo, 'DOCENTE')
  ) THEN
    RAISE EXCEPTION 'No autorizado: no tienes permisos para ver inscripciones de este cursillo';
  END IF;

  RETURN QUERY
  SELECT
    i.id_inscripcion,
    i.fecha_inscripcion,
    u.id_usuario,
    u.nombres::text,
    u.apellidos::text,
    u.correo::text,
    c.id_curso,
    c.titulo::text AS titulo_curso,
    c.id_grupo_curso,
    COALESCE(gc.nombre, 'Sin grupo')::text AS nombre_grupo
  FROM public.inscripciones i
  JOIN public.usuarios u ON u.id_usuario = i.id_usuario
  JOIN public.cursos c ON c.id_curso = i.id_curso
  LEFT JOIN public.grupos_cursos gc ON gc.id_grupo_curso = c.id_grupo_curso
  JOIN public.usuarios_cursillos uc
    ON uc.id_usuario = u.id_usuario
   AND uc.id_cursillo = c.id_cursillo
  JOIN public.roles r ON r.id_rol = uc.id_rol
  WHERE c.id_cursillo = p_id_cursillo
    AND UPPER(TRIM(r.nombre_rol)) = 'ESTUDIANTE'
    AND (
      public.has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR')
      OR public.is_curso_docente(c.id_curso)
    )
  ORDER BY i.fecha_inscripcion DESC;
END;
$$;


ALTER FUNCTION "public"."rpc_list_all_inscripciones"("p_id_cursillo" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_list_comentarios_leccion_publicos"("p_id_leccion" "uuid") RETURNS TABLE("id_comentario" "uuid", "contenido" "text", "fecha_comentario" timestamp with time zone, "id_usuario" "uuid", "usuario_nombres" "text", "usuario_apellidos" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT public.can_view_leccion(p_id_leccion) THEN
    RAISE EXCEPTION 'No autorizado para ver comentarios de esta leccion';
  END IF;

  RETURN QUERY
  SELECT
    cl.id_comentario,
    cl.contenido::text,
    cl.fecha_comentario,
    cl.id_usuario,
    u.nombres::text AS usuario_nombres,
    u.apellidos::text AS usuario_apellidos
  FROM public.comentarios_leccion cl
  LEFT JOIN public.usuarios u ON u.id_usuario = cl.id_usuario
  WHERE cl.id_leccion = p_id_leccion
  ORDER BY cl.fecha_comentario ASC;
END;
$$;


ALTER FUNCTION "public"."rpc_list_comentarios_leccion_publicos"("p_id_leccion" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_list_grupos_cursos"("p_id_cursillo" "uuid") RETURNS TABLE("id_grupo_curso" "uuid", "id_cursillo" "uuid", "nombre" "text", "descripcion" "text", "orden" integer, "es_activo" boolean, "requiere_password" boolean, "total_cursos" bigint, "cursos_publicados" bigint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_is_staff boolean;
  v_is_student boolean;
BEGIN
  v_is_staff :=
    public.has_cursillo_role(p_id_cursillo, 'ADMINISTRADOR')
    OR public.has_cursillo_role(p_id_cursillo, 'DOCENTE');
  v_is_student := public.has_cursillo_role(p_id_cursillo, 'ESTUDIANTE');

  IF NOT (v_is_staff OR v_is_student) THEN
    RAISE EXCEPTION 'No autorizado para listar grupos de cursos';
  END IF;

  RETURN QUERY
  SELECT
    gc.id_grupo_curso,
    gc.id_cursillo,
    gc.nombre::text,
    gc.descripcion::text,
    gc.orden,
    gc.es_activo,
    gc.requiere_password,
    COUNT(c.id_curso)::bigint AS total_cursos,
    COUNT(c.id_curso) FILTER (WHERE c.es_publicado = true)::bigint AS cursos_publicados
  FROM public.grupos_cursos gc
  LEFT JOIN public.cursos c ON c.id_grupo_curso = gc.id_grupo_curso
  WHERE gc.id_cursillo = p_id_cursillo
    AND (
      v_is_staff
      OR (
        gc.es_activo = true
        AND EXISTS (
          SELECT 1
          FROM public.cursos c2
          WHERE c2.id_grupo_curso = gc.id_grupo_curso
            AND c2.es_publicado = true
        )
      )
    )
  GROUP BY gc.id_grupo_curso, gc.id_cursillo, gc.nombre, gc.descripcion, gc.orden, gc.es_activo, gc.requiere_password
  ORDER BY gc.orden ASC, gc.nombre ASC;
END;
$$;


ALTER FUNCTION "public"."rpc_list_grupos_cursos"("p_id_cursillo" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_list_inscritos_curso"("p_id_curso" "uuid") RETURNS TABLE("id_inscripcion" "uuid", "fecha_inscripcion" timestamp with time zone, "id_usuario" "uuid", "nombres" "text", "apellidos" "text", "correo" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT public.can_manage_curso(p_id_curso) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  SELECT
    i.id_inscripcion,
    i.fecha_inscripcion,
    u.id_usuario,
    u.nombres::text,
    u.apellidos::text,
    u.correo::text
  FROM public.inscripciones i
  JOIN public.usuarios u ON u.id_usuario = i.id_usuario
  JOIN public.cursos c ON c.id_curso = i.id_curso
  JOIN public.usuarios_cursillos uc
    ON uc.id_usuario = u.id_usuario
   AND uc.id_cursillo = c.id_cursillo
  JOIN public.roles r ON r.id_rol = uc.id_rol
  WHERE i.id_curso = p_id_curso
    AND UPPER(TRIM(r.nombre_rol)) = 'ESTUDIANTE'
  ORDER BY i.fecha_inscripcion DESC;
END;
$$;


ALTER FUNCTION "public"."rpc_list_inscritos_curso"("p_id_curso" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_list_usuarios_cursillo"("p_id_cursillo" "uuid") RETURNS TABLE("id_usuario" "uuid", "correo" "text", "nombres" "text", "apellidos" "text", "id_rol" smallint, "nombre_rol" "text", "estado" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
    uc.estado::text as estado
  from public.usuarios u
  inner join public.usuarios_cursillos uc
    on uc.id_usuario = u.id_usuario
   and uc.id_cursillo = p_id_cursillo
  left join public.roles r
    on r.id_rol = uc.id_rol
  order by u.apellidos, u.nombres;
end;
$$;


ALTER FUNCTION "public"."rpc_list_usuarios_cursillo"("p_id_cursillo" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_reporte_participacion_curso"("p_id_curso" "uuid") RETURNS SETOF "public"."reporte_participacion_curso_row"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_total_lecciones integer;
  v_total_tareas integer;
  v_total_evaluaciones integer;
BEGIN
  -- Verificar permisos
  IF NOT EXISTS (
    SELECT 1 FROM cursos c
    WHERE c.id_curso = p_id_curso
    AND (
      has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR')
      OR has_cursillo_role(c.id_cursillo, 'DOCENTE')
    )
  ) THEN
    RAISE EXCEPTION 'No autorizado para ver este reporte';
  END IF;

  -- Contar totales del curso
  SELECT COUNT(*) INTO v_total_lecciones
  FROM lecciones l
  JOIN modulos m ON m.id_modulo = l.id_modulo
  WHERE m.id_curso = p_id_curso AND l.es_publicada = true;

  SELECT COUNT(*) INTO v_total_tareas
  FROM tareas t
  JOIN lecciones l ON l.id_leccion = t.id_leccion
  JOIN modulos m ON m.id_modulo = l.id_modulo
  WHERE m.id_curso = p_id_curso;

  SELECT COUNT(*) INTO v_total_evaluaciones
  FROM evaluaciones ev
  JOIN lecciones l ON l.id_leccion = ev.id_leccion
  JOIN modulos m ON m.id_modulo = l.id_modulo
  WHERE m.id_curso = p_id_curso;

  RETURN QUERY
  SELECT 
    u.id_usuario,
    u.nombres::text,
    u.apellidos::text,
    -- Lecciones completadas
    (SELECT COUNT(*)::integer FROM progreso_lecciones pl
     JOIN lecciones l ON l.id_leccion = pl.id_leccion
     JOIN modulos m ON m.id_modulo = l.id_modulo
     WHERE m.id_curso = p_id_curso AND pl.id_usuario = u.id_usuario AND pl.completado = true
    ) AS lecciones_completadas,
    v_total_lecciones AS total_lecciones,
    -- Tareas entregadas
    (SELECT COUNT(DISTINCT et.id_tarea)::integer FROM entregas_tareas et
     JOIN tareas t ON t.id_tarea = et.id_tarea
     JOIN lecciones l ON l.id_leccion = t.id_leccion
     JOIN modulos m ON m.id_modulo = l.id_modulo
     WHERE m.id_curso = p_id_curso AND et.id_usuario = u.id_usuario
    ) AS tareas_entregadas,
    v_total_tareas AS total_tareas,
    -- Tareas a tiempo
    (SELECT COUNT(DISTINCT et.id_tarea)::integer FROM entregas_tareas et
     JOIN tareas t ON t.id_tarea = et.id_tarea
     JOIN lecciones l ON l.id_leccion = t.id_leccion
     JOIN modulos m ON m.id_modulo = l.id_modulo
     WHERE m.id_curso = p_id_curso AND et.id_usuario = u.id_usuario
     AND (t.fecha_limite IS NULL OR et.fecha_entrega <= t.fecha_limite)
    ) AS tareas_a_tiempo,
    -- FIX: evaluaciones completadas ahora incluye CORREGIDO además de COMPLETADO
    (SELECT COUNT(DISTINCT ie.id_evaluacion)::integer FROM intentos_evaluacion ie
     JOIN evaluaciones ev ON ev.id_evaluacion = ie.id_evaluacion
     JOIN lecciones l ON l.id_leccion = ev.id_leccion
     JOIN modulos m ON m.id_modulo = l.id_modulo
     WHERE m.id_curso = p_id_curso AND ie.id_usuario = u.id_usuario 
     AND ie.estado IN ('COMPLETADO', 'CORREGIDO', 'CALIFICADO')
    ) AS evaluaciones_completadas,
    v_total_evaluaciones AS total_evaluaciones,
    -- Promedio de tareas (última entrega calificada de cada tarea)
    (SELECT ROUND(AVG(sub.calificacion), 2) FROM (
      SELECT DISTINCT ON (et.id_tarea) et.calificacion
      FROM entregas_tareas et
      JOIN tareas t ON t.id_tarea = et.id_tarea
      JOIN lecciones l ON l.id_leccion = t.id_leccion
      JOIN modulos m ON m.id_modulo = l.id_modulo
      WHERE m.id_curso = p_id_curso AND et.id_usuario = u.id_usuario AND et.calificacion IS NOT NULL
      ORDER BY et.id_tarea, et.fecha_entrega DESC
    ) sub) AS promedio_tareas,
    -- FIX: promedio de evaluaciones incluye CORREGIDO (mejor intento por evaluación)
    (SELECT ROUND(AVG(sub.puntaje), 2) FROM (
      SELECT DISTINCT ON (ie.id_evaluacion) ie.puntaje_obtenido AS puntaje
      FROM intentos_evaluacion ie
      JOIN evaluaciones ev ON ev.id_evaluacion = ie.id_evaluacion
      JOIN lecciones l ON l.id_leccion = ev.id_leccion
      JOIN modulos m ON m.id_modulo = l.id_modulo
      WHERE m.id_curso = p_id_curso AND ie.id_usuario = u.id_usuario 
      AND ie.estado IN ('COMPLETADO', 'CORREGIDO', 'CALIFICADO')
      ORDER BY ie.id_evaluacion, ie.puntaje_obtenido DESC
    ) sub) AS promedio_evaluaciones,
    -- Última actividad
    GREATEST(
      (SELECT MAX(pl.fecha_completado) FROM progreso_lecciones pl
       JOIN lecciones l ON l.id_leccion = pl.id_leccion
       JOIN modulos m ON m.id_modulo = l.id_modulo
       WHERE m.id_curso = p_id_curso AND pl.id_usuario = u.id_usuario),
      (SELECT MAX(et.fecha_entrega) FROM entregas_tareas et
       JOIN tareas t ON t.id_tarea = et.id_tarea
       JOIN lecciones l ON l.id_leccion = t.id_leccion
       JOIN modulos m ON m.id_modulo = l.id_modulo
       WHERE m.id_curso = p_id_curso AND et.id_usuario = u.id_usuario),
      (SELECT MAX(ie.fecha_envio) FROM intentos_evaluacion ie
       JOIN evaluaciones ev ON ev.id_evaluacion = ie.id_evaluacion
       JOIN lecciones l ON l.id_leccion = ev.id_leccion
       JOIN modulos m ON m.id_modulo = l.id_modulo
       WHERE m.id_curso = p_id_curso AND ie.id_usuario = u.id_usuario)
    ) AS ultima_actividad
  FROM inscripciones i
  JOIN usuarios u ON u.id_usuario = i.id_usuario
  WHERE i.id_curso = p_id_curso
  ORDER BY u.apellidos, u.nombres;
END;
$$;


ALTER FUNCTION "public"."rpc_reporte_participacion_curso"("p_id_curso" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_reporte_progreso_estudiante"("p_id_curso" "uuid", "p_id_usuario" "uuid") RETURNS SETOF "public"."reporte_progreso_estudiante_row"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Verificar permisos: solo admin o docente del cursillo/curso
  IF NOT EXISTS (
    SELECT 1 FROM cursos c
    WHERE c.id_curso = p_id_curso
    AND (
      has_cursillo_role(c.id_cursillo, 'ADMINISTRADOR')
      OR has_cursillo_role(c.id_cursillo, 'DOCENTE')
    )
  ) THEN
    RAISE EXCEPTION 'No autorizado para ver este reporte';
  END IF;

  -- Verificar que el estudiante esté inscrito
  IF NOT EXISTS (
    SELECT 1 FROM inscripciones i
    WHERE i.id_curso = p_id_curso AND i.id_usuario = p_id_usuario
  ) THEN
    RAISE EXCEPTION 'El estudiante no está inscrito en este curso';
  END IF;

  RETURN QUERY
  -- Lecciones con progreso
  SELECT 
    'LECCION'::text AS tipo,
    l.id_leccion AS id,
    l.titulo::text AS titulo,
    m.titulo::text AS modulo,
    CASE WHEN pl.completado = true THEN 'COMPLETADA' ELSE 'PENDIENTE' END AS estado,
    pl.fecha_completado AS fecha_entrega,
    NULL::timestamptz AS fecha_limite,
    NULL::numeric AS calificacion,
    NULL::numeric AS puntaje_maximo,
    NULL::integer AS intentos,
    NULL::integer AS intentos_max
  FROM lecciones l
  JOIN modulos m ON m.id_modulo = l.id_modulo
  LEFT JOIN progreso_lecciones pl ON pl.id_leccion = l.id_leccion AND pl.id_usuario = p_id_usuario
  WHERE m.id_curso = p_id_curso AND l.es_publicada = true
  
  UNION ALL
  
  -- Tareas con entregas
  -- FIX: usar t.puntaje_maximo en lugar de valor hardcodeado 10::numeric
  SELECT 
    'TAREA'::text AS tipo,
    t.id_tarea AS id,
    t.titulo::text AS titulo,
    m.titulo::text AS modulo,
    COALESCE(et.estado, 'SIN_ENTREGAR')::text AS estado,
    et.fecha_entrega AS fecha_entrega,
    t.fecha_limite AS fecha_limite,
    et.calificacion AS calificacion,
    t.puntaje_maximo AS puntaje_maximo,
    (SELECT COUNT(*)::integer FROM entregas_tareas e2 WHERE e2.id_tarea = t.id_tarea AND e2.id_usuario = p_id_usuario) AS intentos,
    t.max_reintentos AS intentos_max
  FROM tareas t
  JOIN lecciones l ON l.id_leccion = t.id_leccion
  JOIN modulos m ON m.id_modulo = l.id_modulo
  LEFT JOIN LATERAL (
    SELECT * FROM entregas_tareas e 
    WHERE e.id_tarea = t.id_tarea AND e.id_usuario = p_id_usuario
    ORDER BY e.fecha_entrega DESC LIMIT 1
  ) et ON true
  WHERE m.id_curso = p_id_curso
  
  UNION ALL
  
  -- Evaluaciones con intentos
  -- FIX: estados CORREGIDO y CALIFICADO también se mapean como COMPLETADA
  SELECT 
    'EVALUACION'::text AS tipo,
    ev.id_evaluacion AS id,
    ev.titulo::text AS titulo,
    m.titulo::text AS modulo,
    CASE 
      WHEN ie.estado IN ('COMPLETADO', 'CORREGIDO', 'CALIFICADO') THEN 'COMPLETADA'
      WHEN ie.estado = 'EN_PROGRESO' THEN 'EN_PROGRESO'
      ELSE 'SIN_INTENTAR'
    END AS estado,
    ie.fecha_envio AS fecha_entrega,
    NULL::timestamptz AS fecha_limite,
    ie.puntaje_obtenido AS calificacion,
    (SELECT COALESCE(SUM(pe.puntaje), 0) FROM preguntas_evaluacion pe WHERE pe.id_evaluacion = ev.id_evaluacion) AS puntaje_maximo,
    (SELECT COUNT(*)::integer FROM intentos_evaluacion i2 WHERE i2.id_evaluacion = ev.id_evaluacion AND i2.id_usuario = p_id_usuario) AS intentos,
    ev.intentos_max AS intentos_max
  FROM evaluaciones ev
  JOIN lecciones l ON l.id_leccion = ev.id_leccion
  JOIN modulos m ON m.id_modulo = l.id_modulo
  LEFT JOIN LATERAL (
    SELECT * FROM intentos_evaluacion ie 
    WHERE ie.id_evaluacion = ev.id_evaluacion AND ie.id_usuario = p_id_usuario
    ORDER BY ie.fecha_inicio DESC LIMIT 1
  ) ie ON true
  WHERE m.id_curso = p_id_curso
  
  ORDER BY modulo, tipo, titulo;
END;
$$;


ALTER FUNCTION "public"."rpc_reporte_progreso_estudiante"("p_id_curso" "uuid", "p_id_usuario" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_resolver_reclamo_evaluacion"("p_id_intento" "uuid", "p_respuesta_docente" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_id_docente uuid;
  v_reclamo record;
  v_puntaje_resuelto numeric;
  v_estado_reclamo text;
BEGIN
  v_id_docente := public.current_id_usuario();

  IF v_id_docente IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT
    re.id_reclamo,
    re.id_respuesta,
    re.id_estudiante,
    re.puntaje_original,
    i.id_evaluacion,
    c.id_cursillo
  INTO v_reclamo
  FROM public.reclamos_evaluacion re
  JOIN public.intentos_evaluacion i ON i.id_intento = re.id_intento
  JOIN public.evaluaciones ev ON ev.id_evaluacion = i.id_evaluacion
  JOIN public.lecciones l ON l.id_leccion = ev.id_leccion
  JOIN public.modulos m ON m.id_modulo = l.id_modulo
  JOIN public.cursos c ON c.id_curso = m.id_curso
  WHERE re.id_intento = p_id_intento
    AND re.estado = 'PENDIENTE'
  ORDER BY re.fecha_reclamo DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No hay reclamo pendiente para este intento';
  END IF;

  IF NOT public.can_manage_evaluacion(v_reclamo.id_evaluacion) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT coalesce(r.puntaje_obtenido, 0)
  INTO v_puntaje_resuelto
  FROM public.respuestas_intento r
  WHERE r.id_respuesta = v_reclamo.id_respuesta;

  v_estado_reclamo := CASE
    WHEN v_puntaje_resuelto IS DISTINCT FROM v_reclamo.puntaje_original THEN 'ACEPTADO'
    ELSE 'RECHAZADO'
  END;

  UPDATE public.reclamos_evaluacion
  SET
    estado = v_estado_reclamo,
    puntaje_resuelto = v_puntaje_resuelto,
    respuesta_docente = nullif(trim(coalesce(p_respuesta_docente, '')), ''),
    id_docente_resolutor = v_id_docente,
    fecha_resolucion = now()
  WHERE id_reclamo = v_reclamo.id_reclamo;

  UPDATE public.intentos_evaluacion
  SET estado = 'CORREGIDO'
  WHERE id_intento = p_id_intento;

  INSERT INTO public.notificaciones (id_usuario, id_cursillo, tipo, titulo, mensaje, link)
  VALUES (
    v_reclamo.id_estudiante,
    v_reclamo.id_cursillo,
    'RECLAMO_EVALUACION_RESUELTO',
    'Reclamo resuelto',
    CASE
      WHEN v_estado_reclamo = 'ACEPTADO' THEN 'Tu reclamo fue aceptado y la correccion fue actualizada.'
      ELSE 'Tu reclamo fue revisado y la correccion se mantiene.'
    END,
    '/mis-correcciones'
  );

  RETURN v_reclamo.id_reclamo;
END;
$$;


ALTER FUNCTION "public"."rpc_resolver_reclamo_evaluacion"("p_id_intento" "uuid", "p_respuesta_docente" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_set_curso_colaboradores"("p_id_curso" "uuid", "p_docente_ids" "uuid"[] DEFAULT ARRAY[]::"uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_id_cursillo uuid;
  v_id_propietario uuid;
  v_docente_id uuid;
  v_docente_ids uuid[];
BEGIN
  SELECT c.id_cursillo, c.id_docente
  INTO v_id_cursillo, v_id_propietario
  FROM public.cursos c
  WHERE c.id_curso = p_id_curso;

  IF v_id_cursillo IS NULL THEN
    RAISE EXCEPTION 'Curso no encontrado';
  END IF;

  IF NOT public.can_admin_or_own_curso(p_id_curso) THEN
    RAISE EXCEPTION 'No autorizado para administrar docentes ayudantes';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT x.id_docente), ARRAY[]::uuid[])
  INTO v_docente_ids
  FROM unnest(COALESCE(p_docente_ids, ARRAY[]::uuid[])) AS x(id_docente)
  WHERE x.id_docente IS NOT NULL
    AND x.id_docente IS DISTINCT FROM v_id_propietario;

  FOREACH v_docente_id IN ARRAY v_docente_ids LOOP
    IF NOT public.is_usuario_docente_activo_en_cursillo(v_docente_id, v_id_cursillo) THEN
      RAISE EXCEPTION 'Solo se pueden asignar docentes activos como ayudantes';
    END IF;
  END LOOP;

  DELETE FROM public.curso_docentes_colaboradores cdc
  WHERE cdc.id_curso = p_id_curso
    AND NOT (cdc.id_docente = ANY(v_docente_ids));

  INSERT INTO public.curso_docentes_colaboradores (id_curso, id_docente)
  SELECT p_id_curso, x.id_docente
  FROM unnest(v_docente_ids) AS x(id_docente)
  ON CONFLICT (id_curso, id_docente) DO NOTHING;
END;
$$;


ALTER FUNCTION "public"."rpc_set_curso_colaboradores"("p_id_curso" "uuid", "p_docente_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_set_curso_password"("p_id_curso" "uuid", "p_requiere_password" boolean, "p_password" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
BEGIN
  IF NOT public.can_manage_curso(p_id_curso) THEN
    RAISE EXCEPTION 'No autorizado para configurar la contraseña del curso';
  END IF;

  IF p_requiere_password AND length(trim(coalesce(p_password, ''))) = 0 THEN
    RAISE EXCEPTION 'La contraseña del curso es obligatoria';
  END IF;

  PERFORM set_config('app.allow_password_hash_write', 'on', true);

  UPDATE public.cursos
  SET
    requiere_password = p_requiere_password,
    password_hash = CASE
      WHEN p_requiere_password THEN crypt(p_password, gen_salt('bf'))
      ELSE NULL
    END
  WHERE id_curso = p_id_curso;
END;
$$;


ALTER FUNCTION "public"."rpc_set_curso_password"("p_id_curso" "uuid", "p_requiere_password" boolean, "p_password" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_set_estado_usuario_cursillo"("p_id_cursillo" "uuid", "p_id_usuario" "uuid", "p_estado" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."rpc_set_estado_usuario_cursillo"("p_id_cursillo" "uuid", "p_id_usuario" "uuid", "p_estado" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_set_estado_usuario_cursillo"("p_id_cursillo" "uuid", "p_id_usuario" "uuid", "p_estado" "text") IS 'Permite a administradores cambiar estado de cualquier usuario del cursillo y a docentes cambiar solo estudiantes.';



CREATE OR REPLACE FUNCTION "public"."rpc_set_grupo_curso_password"("p_id_grupo_curso" "uuid", "p_requiere_password" boolean, "p_password" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_id_cursillo uuid;
BEGIN
  SELECT id_cursillo
  INTO v_id_cursillo
  FROM public.grupos_cursos
  WHERE id_grupo_curso = p_id_grupo_curso;

  IF v_id_cursillo IS NULL THEN
    RAISE EXCEPTION 'Grupo de curso no encontrado';
  END IF;

  IF NOT (
    public.has_cursillo_role(v_id_cursillo, 'ADMINISTRADOR')
    OR public.has_cursillo_role(v_id_cursillo, 'DOCENTE')
  ) THEN
    RAISE EXCEPTION 'No autorizado para configurar la contraseña del grupo';
  END IF;

  IF p_requiere_password AND length(trim(coalesce(p_password, ''))) = 0 THEN
    RAISE EXCEPTION 'La contraseña del grupo es obligatoria';
  END IF;

  PERFORM set_config('app.allow_password_hash_write', 'on', true);

  UPDATE public.grupos_cursos
  SET
    requiere_password = p_requiere_password,
    password_hash = CASE
      WHEN p_requiere_password THEN crypt(p_password, gen_salt('bf'))
      ELSE NULL
    END
  WHERE id_grupo_curso = p_id_grupo_curso;
END;
$$;


ALTER FUNCTION "public"."rpc_set_grupo_curso_password"("p_id_grupo_curso" "uuid", "p_requiere_password" boolean, "p_password" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_submit_intento"("p_id_intento" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_id_usuario uuid;
  v_id_evaluacion uuid;
  v_estado text;
  v_puntaje numeric := 0;
  v_tiene_abiertas boolean := false;
  v_estado_final text;
  r record;
BEGIN
  SELECT ie.id_usuario, ie.id_evaluacion, ie.estado
  INTO v_id_usuario, v_id_evaluacion, v_estado
  FROM public.intentos_evaluacion ie
  WHERE ie.id_intento = p_id_intento;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Intento no encontrado';
  END IF;

  IF v_id_usuario IS DISTINCT FROM public.current_id_usuario() THEN
    RAISE EXCEPTION 'No autorizado: este intento no te pertenece';
  END IF;

  IF v_estado != 'EN_PROGRESO' THEN
    RAISE EXCEPTION 'Este intento ya fue enviado';
  END IF;

  FOR r IN
    SELECT
      pe.id_pregunta,
      pe.tipo,
      pe.puntaje,
      ri.id_respuesta,
      ri.id_opcion,
      ri.respuesta_texto
    FROM public.preguntas_evaluacion pe
    LEFT JOIN public.respuestas_intento ri
      ON ri.id_pregunta = pe.id_pregunta
      AND ri.id_intento = p_id_intento
    WHERE pe.id_evaluacion = v_id_evaluacion
  LOOP
    IF r.tipo = 'OPCION_MULTIPLE' THEN
      IF r.id_opcion IS NOT NULL AND EXISTS (
        SELECT 1
        FROM public.opciones_pregunta op
        WHERE op.id_opcion = r.id_opcion
          AND op.id_pregunta = r.id_pregunta
          AND op.es_correcta = true
      ) THEN
        v_puntaje := v_puntaje + r.puntaje;

        UPDATE public.respuestas_intento
        SET es_correcta = true,
            puntaje_obtenido = r.puntaje
        WHERE id_respuesta = r.id_respuesta;
      ELSIF r.id_respuesta IS NOT NULL THEN
        UPDATE public.respuestas_intento
        SET es_correcta = false,
            puntaje_obtenido = 0
        WHERE id_respuesta = r.id_respuesta;
      END IF;
    ELSIF r.tipo = 'ABIERTA' THEN
      v_tiene_abiertas := true;
    END IF;
  END LOOP;

  IF v_tiene_abiertas THEN
    v_estado_final := 'COMPLETADO';
  ELSE
    v_estado_final := 'AUTOCORREGIDO';
  END IF;

  PERFORM set_config('app.allow_submit_intento', 'on', true);

  UPDATE public.intentos_evaluacion
  SET estado = v_estado_final,
      puntaje_obtenido = v_puntaje,
      fecha_envio = now()
  WHERE id_intento = p_id_intento;

  RETURN jsonb_build_object(
    'puntaje_obtenido', v_puntaje,
    'estado', v_estado_final,
    'tiene_abiertas', v_tiene_abiertas
  );
END;
$$;


ALTER FUNCTION "public"."rpc_submit_intento"("p_id_intento" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_prevent_direct_password_hash_write"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF COALESCE(current_setting('app.allow_password_hash_write', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.password_hash IS NOT NULL THEN
      RAISE EXCEPTION 'password_hash solo puede configurarse mediante RPC segura';
    END IF;
  ELSIF NEW.password_hash IS DISTINCT FROM OLD.password_hash THEN
    RAISE EXCEPTION 'password_hash solo puede configurarse mediante RPC segura';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_prevent_direct_password_hash_write"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_prevent_entregas_tampering"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_current_user uuid;
  v_is_manager boolean;
BEGIN
  v_current_user := current_id_usuario();

  IF NEW.id_usuario = v_current_user THEN
    SELECT EXISTS (
      SELECT 1
      FROM tareas t
      JOIN lecciones l ON l.id_leccion = t.id_leccion
      JOIN modulos m ON m.id_modulo = l.id_modulo
      JOIN cursos c ON c.id_curso = m.id_curso
      WHERE t.id_tarea = NEW.id_tarea
        AND public.can_manage_curso(c.id_curso)
    ) INTO v_is_manager;

    IF NOT v_is_manager THEN
      IF NEW.calificacion IS DISTINCT FROM OLD.calificacion THEN
        RAISE EXCEPTION 'No autorizado: no puedes modificar la calificacion';
      END IF;
      IF NEW.comentario_docente IS DISTINCT FROM OLD.comentario_docente THEN
        RAISE EXCEPTION 'No autorizado: no puedes modificar el comentario del docente';
      END IF;
      IF NEW.estado = 'CALIFICADO' AND OLD.estado != 'CALIFICADO' THEN
        RAISE EXCEPTION 'No autorizado: no puedes marcar como calificado';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_prevent_entregas_tampering"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_prevent_intentos_tampering"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_current_user uuid;
  v_is_manager boolean;
  v_allow_reclamo boolean;
  v_allow_submit boolean;
BEGIN
  v_current_user := public.current_id_usuario();
  v_allow_reclamo := coalesce(current_setting('app.allow_reclamo_evaluacion', true), '') = 'on';
  v_allow_submit := coalesce(current_setting('app.allow_submit_intento', true), '') = 'on';

  IF NEW.id_usuario = v_current_user THEN
    SELECT public.can_manage_evaluacion(NEW.id_evaluacion) INTO v_is_manager;

    IF NOT v_is_manager THEN
      IF v_allow_submit
         AND OLD.estado = 'EN_PROGRESO'
         AND NEW.estado IN ('COMPLETADO', 'AUTOCORREGIDO')
         AND NEW.id_intento IS NOT DISTINCT FROM OLD.id_intento
         AND NEW.id_usuario IS NOT DISTINCT FROM OLD.id_usuario
         AND NEW.id_evaluacion IS NOT DISTINCT FROM OLD.id_evaluacion
         AND NEW.fecha_inicio IS NOT DISTINCT FROM OLD.fecha_inicio THEN
        RETURN NEW;
      END IF;

      IF v_allow_reclamo
         AND OLD.estado IN ('CORREGIDO', 'AUTOCORREGIDO')
         AND NEW.estado = 'RECLAMADO'
         AND NEW.puntaje_obtenido IS NOT DISTINCT FROM OLD.puntaje_obtenido THEN
        RETURN NEW;
      END IF;

      IF NEW.puntaje_obtenido IS DISTINCT FROM OLD.puntaje_obtenido THEN
        RAISE EXCEPTION 'No autorizado: no puedes modificar el puntaje';
      END IF;

      IF NEW.estado IS DISTINCT FROM OLD.estado THEN
        RAISE EXCEPTION 'No autorizado: usa el boton de enviar para completar tu evaluacion';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_prevent_intentos_tampering"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_set_auditoria_campos"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_email varchar;
BEGIN
  -- Intentar obtener el email del JWT
  v_user_email := auth.jwt() ->> 'email';
  
  -- Si no está en el JWT, buscar en la tabla usuarios (por ejemplo en el backend via RPC)
  IF v_user_email IS NULL AND auth.uid() IS NOT NULL THEN
    SELECT correo INTO v_user_email FROM usuarios WHERE id_auth = auth.uid() LIMIT 1;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.fec_insercion := now();
    NEW.usu_insercion := COALESCE(v_user_email, NEW.usu_insercion);
    -- En inserción, los de modificación son iguales a los de inserción
    NEW.fec_modificacion := NEW.fec_insercion;
    NEW.usu_modificacion := NEW.usu_insercion;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.fec_insercion := OLD.fec_insercion;
    NEW.usu_insercion := OLD.usu_insercion;
    NEW.fec_modificacion := now();
    NEW.usu_modificacion := COALESCE(v_user_email, NEW.usu_modificacion, OLD.usu_modificacion);
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_set_auditoria_campos"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."trg_set_auditoria_campos"() IS 'Completa fec_insercion/usu_insercion en INSERT y fec_modificacion/usu_modificacion en UPDATE usando auth.uid() cuando existe.';



CREATE OR REPLACE FUNCTION "public"."trg_validate_curso_docente_colaborador"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_id_cursillo uuid;
  v_id_propietario uuid;
BEGIN
  SELECT c.id_cursillo, c.id_docente
  INTO v_id_cursillo, v_id_propietario
  FROM public.cursos c
  WHERE c.id_curso = NEW.id_curso;

  IF v_id_cursillo IS NULL THEN
    RAISE EXCEPTION 'Curso no encontrado';
  END IF;

  IF NEW.id_docente = v_id_propietario THEN
    RAISE EXCEPTION 'El propietario ya tiene permisos sobre el curso';
  END IF;

  IF NOT public.is_usuario_docente_activo_en_cursillo(NEW.id_docente, v_id_cursillo) THEN
    RAISE EXCEPTION 'Solo se pueden asignar docentes activos como ayudantes';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_validate_curso_docente_colaborador"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_validate_curso_grupo_cursillo"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_grupo_cursillo uuid;
BEGIN
  IF NEW.id_grupo_curso IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT gc.id_cursillo
  INTO v_grupo_cursillo
  FROM public.grupos_cursos gc
  WHERE gc.id_grupo_curso = NEW.id_grupo_curso;

  IF v_grupo_cursillo IS NULL THEN
    RAISE EXCEPTION 'Grupo de curso no encontrado';
  END IF;

  IF v_grupo_cursillo <> NEW.id_cursillo THEN
    RAISE EXCEPTION 'El grupo seleccionado no pertenece al cursillo del curso';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_validate_curso_grupo_cursillo"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_validate_curso_owner"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.id_docente IS NOT NULL
     AND NOT public.is_usuario_staff_activo_en_cursillo(NEW.id_docente, NEW.id_cursillo) THEN
    RAISE EXCEPTION 'El propietario del curso debe ser un administrador o docente activo del cursillo';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.id_docente IS DISTINCT FROM OLD.id_docente
       AND NOT public.has_cursillo_role(OLD.id_cursillo, 'ADMINISTRADOR') THEN
      RAISE EXCEPTION 'Solo un administrador puede cambiar el propietario del curso';
    END IF;

    IF NEW.id_cursillo IS DISTINCT FROM OLD.id_cursillo
       AND NOT public.has_cursillo_role(OLD.id_cursillo, 'ADMINISTRADOR') THEN
      RAISE EXCEPTION 'Solo un administrador puede cambiar el cursillo del curso';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_validate_curso_owner"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."adjuntos_leccion" (
    "id_adjunto" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "id_leccion" "uuid" NOT NULL,
    "nombre" character varying NOT NULL,
    "tipo" character varying NOT NULL,
    "ruta_storage" "text",
    "url_externa" "text",
    "tipo_mime" character varying,
    "tamano_bytes" bigint,
    "bucket" character varying DEFAULT 'contenido_lecciones'::character varying,
    "fecha_subida" timestamp with time zone DEFAULT "now"(),
    "fec_insercion" timestamp with time zone,
    "usu_insercion" character varying,
    "fec_modificacion" timestamp with time zone,
    "usu_modificacion" character varying,
    CONSTRAINT "adjuntos_leccion_tipo_check" CHECK ((("tipo")::"text" = ANY ((ARRAY['ARCHIVO'::character varying, 'LINK'::character varying])::"text"[])))
);


ALTER TABLE "public"."adjuntos_leccion" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."anuncios" (
    "id_anuncio" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "id_cursillo" "uuid" NOT NULL,
    "id_curso" "uuid",
    "titulo" character varying(200) NOT NULL,
    "contenido" "text" NOT NULL,
    "fecha_publicacion" timestamp with time zone DEFAULT "now"() NOT NULL,
    "id_creador" "uuid",
    "fec_insercion" timestamp with time zone,
    "usu_insercion" character varying,
    "fec_modificacion" timestamp with time zone,
    "usu_modificacion" character varying
);


ALTER TABLE "public"."anuncios" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."archivos_entregas_tareas" (
    "id_archivo" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "id_entrega" "uuid" NOT NULL,
    "bucket" character varying(80) DEFAULT 'archivos_tareas'::character varying NOT NULL,
    "ruta_storage" "text" NOT NULL,
    "nombre_archivo" character varying(255),
    "tipo_mime" character varying(100),
    "tamano_bytes" bigint,
    "fecha_subida" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fec_insercion" timestamp with time zone,
    "usu_insercion" character varying,
    "fec_modificacion" timestamp with time zone,
    "usu_modificacion" character varying
);


ALTER TABLE "public"."archivos_entregas_tareas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."certificados_curso" (
    "id_certificado" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "id_curso" "uuid" NOT NULL,
    "plantilla" character varying(50) DEFAULT 'clasico'::character varying NOT NULL,
    "titulo_certificado" character varying(255) DEFAULT 'Certificado de Finalización'::character varying,
    "texto_descripcion" "text" DEFAULT 'Por haber completado satisfactoriamente el curso'::"text",
    "firma_nombre" character varying(255),
    "firma_cargo" character varying(255),
    "mostrar_fecha" boolean DEFAULT true,
    "mostrar_logo" boolean DEFAULT true,
    "color_primario" character varying(7) DEFAULT '#3B82F6'::character varying,
    "color_secundario" character varying(7) DEFAULT '#14B8A6'::character varying,
    "fecha_creacion" timestamp with time zone DEFAULT "now"(),
    "fec_insercion" timestamp with time zone,
    "usu_insercion" character varying,
    "fec_modificacion" timestamp with time zone,
    "usu_modificacion" character varying
);


ALTER TABLE "public"."certificados_curso" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comentarios_leccion" (
    "id_comentario" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "id_leccion" "uuid" NOT NULL,
    "id_usuario" "uuid" NOT NULL,
    "contenido" "text" NOT NULL,
    "fecha_comentario" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fec_insercion" timestamp with time zone,
    "usu_insercion" character varying,
    "fec_modificacion" timestamp with time zone,
    "usu_modificacion" character varying
);


ALTER TABLE "public"."comentarios_leccion" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cursillos" (
    "id_cursillo" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "nombre" character varying(120) NOT NULL,
    "descripcion" "text",
    "dominio" character varying(255),
    "fecha_creacion" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fec_insercion" timestamp with time zone,
    "usu_insercion" character varying,
    "fec_modificacion" timestamp with time zone,
    "usu_modificacion" character varying
);


ALTER TABLE "public"."cursillos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."curso_docentes_colaboradores" (
    "id_curso_docente_colaborador" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_curso" "uuid" NOT NULL,
    "id_docente" "uuid" NOT NULL,
    "fecha_asignacion" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fec_insercion" timestamp with time zone,
    "usu_insercion" character varying,
    "fec_modificacion" timestamp with time zone,
    "usu_modificacion" character varying
);


ALTER TABLE "public"."curso_docentes_colaboradores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cursos" (
    "id_curso" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "id_cursillo" "uuid" NOT NULL,
    "titulo" character varying(200) NOT NULL,
    "descripcion" "text",
    "es_publicado" boolean DEFAULT false NOT NULL,
    "fecha_creacion" timestamp with time zone DEFAULT "now"() NOT NULL,
    "id_docente" "uuid",
    "fec_insercion" timestamp with time zone,
    "usu_insercion" character varying,
    "fec_modificacion" timestamp with time zone,
    "usu_modificacion" character varying,
    "id_grupo_curso" "uuid",
    "requiere_password" boolean DEFAULT false NOT NULL,
    "password_hash" "text",
    CONSTRAINT "cursos_password_consistente" CHECK (((("requiere_password" = false) AND ("password_hash" IS NULL)) OR (("requiere_password" = true) AND ("password_hash" IS NOT NULL))))
);


ALTER TABLE "public"."cursos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."entregas_tareas" (
    "id_entrega" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "id_tarea" "uuid" NOT NULL,
    "id_usuario" "uuid" NOT NULL,
    "comentario_estudiante" "text",
    "estado" character varying(30) DEFAULT 'ENVIADO'::character varying NOT NULL,
    "calificacion" numeric(5,2),
    "comentario_docente" "text",
    "fecha_entrega" timestamp with time zone DEFAULT "now"() NOT NULL,
    "retroalimentacion_archivo_url" "text",
    "fecha_correccion" timestamp with time zone,
    "id_docente_corrector" "uuid",
    "fec_insercion" timestamp with time zone,
    "usu_insercion" character varying,
    "fec_modificacion" timestamp with time zone,
    "usu_modificacion" character varying
);


ALTER TABLE "public"."entregas_tareas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evaluaciones" (
    "id_evaluacion" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "id_leccion" "uuid" NOT NULL,
    "titulo" character varying(200) NOT NULL,
    "descripcion" "text",
    "tiempo_limite_min" integer,
    "intentos_max" integer DEFAULT 1 NOT NULL,
    "fecha_creacion" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fec_insercion" timestamp with time zone,
    "usu_insercion" character varying,
    "fec_modificacion" timestamp with time zone,
    "usu_modificacion" character varying
);


ALTER TABLE "public"."evaluaciones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."grupos_cursos" (
    "id_grupo_curso" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_cursillo" "uuid" NOT NULL,
    "nombre" "text" NOT NULL,
    "descripcion" "text",
    "orden" integer NOT NULL,
    "es_activo" boolean DEFAULT true NOT NULL,
    "fecha_creacion" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fec_insercion" timestamp with time zone,
    "usu_insercion" character varying,
    "fec_modificacion" timestamp with time zone,
    "usu_modificacion" character varying,
    "requiere_password" boolean DEFAULT false NOT NULL,
    "password_hash" "text",
    CONSTRAINT "grupos_cursos_nombre_not_blank" CHECK (("length"(TRIM(BOTH FROM "nombre")) > 0)),
    CONSTRAINT "grupos_cursos_password_consistente" CHECK (((("requiere_password" = false) AND ("password_hash" IS NULL)) OR (("requiere_password" = true) AND ("password_hash" IS NOT NULL))))
);


ALTER TABLE "public"."grupos_cursos" OWNER TO "postgres";


ALTER TABLE "public"."grupos_cursos" ALTER COLUMN "orden" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."grupos_cursos_orden_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."imagenes_resolucion_intento" (
    "id_imagen" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "id_intento" "uuid" NOT NULL,
    "bucket" character varying(80) DEFAULT 'archivos_tareas'::character varying NOT NULL,
    "ruta_storage" "text" NOT NULL,
    "nombre_archivo" character varying(255),
    "tipo_mime" character varying(100),
    "tamano_bytes" bigint,
    "fecha_subida" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fec_insercion" timestamp with time zone,
    "usu_insercion" character varying,
    "fec_modificacion" timestamp with time zone,
    "usu_modificacion" character varying
);


ALTER TABLE "public"."imagenes_resolucion_intento" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inscripciones" (
    "id_inscripcion" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "id_curso" "uuid" NOT NULL,
    "id_usuario" "uuid" NOT NULL,
    "fecha_inscripcion" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fec_insercion" timestamp with time zone,
    "usu_insercion" character varying,
    "fec_modificacion" timestamp with time zone,
    "usu_modificacion" character varying
);


ALTER TABLE "public"."inscripciones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."intentos_evaluacion" (
    "id_intento" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "id_evaluacion" "uuid" NOT NULL,
    "id_usuario" "uuid" NOT NULL,
    "puntaje_obtenido" numeric(7,2) DEFAULT 0 NOT NULL,
    "estado" character varying(30) DEFAULT 'EN_PROGRESO'::character varying NOT NULL,
    "fecha_inicio" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fecha_envio" timestamp with time zone,
    "fec_insercion" timestamp with time zone,
    "usu_insercion" character varying,
    "fec_modificacion" timestamp with time zone,
    "usu_modificacion" character varying,
    CONSTRAINT "intentos_evaluacion_estado_check" CHECK ((("estado")::"text" = ANY ((ARRAY['EN_PROGRESO'::character varying, 'COMPLETADO'::character varying, 'CORREGIDO'::character varying, 'AUTOCORREGIDO'::character varying, 'RECLAMADO'::character varying])::"text"[])))
);


ALTER TABLE "public"."intentos_evaluacion" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lecciones" (
    "id_leccion" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "id_modulo" "uuid" NOT NULL,
    "titulo" character varying(200) NOT NULL,
    "tipo_contenido" character varying(30) DEFAULT 'TEXTO'::character varying NOT NULL,
    "contenido_texto" "text",
    "url_contenido" "text",
    "orden" integer DEFAULT 1 NOT NULL,
    "es_publicada" boolean DEFAULT true NOT NULL,
    "fec_insercion" timestamp with time zone,
    "usu_insercion" character varying,
    "fec_modificacion" timestamp with time zone,
    "usu_modificacion" character varying
);


ALTER TABLE "public"."lecciones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."modulos" (
    "id_modulo" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "id_curso" "uuid" NOT NULL,
    "titulo" character varying(200) NOT NULL,
    "orden" integer DEFAULT 1 NOT NULL,
    "fec_insercion" timestamp with time zone,
    "usu_insercion" character varying,
    "fec_modificacion" timestamp with time zone,
    "usu_modificacion" character varying
);


ALTER TABLE "public"."modulos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notificaciones" (
    "id_notificacion" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "id_usuario" "uuid" NOT NULL,
    "tipo" character varying(50) NOT NULL,
    "mensaje" "text" NOT NULL,
    "leido" boolean DEFAULT false NOT NULL,
    "fecha_envio" timestamp with time zone DEFAULT "now"() NOT NULL,
    "titulo" character varying(255),
    "link" character varying(255),
    "fec_insercion" timestamp with time zone,
    "usu_insercion" character varying,
    "fec_modificacion" timestamp with time zone,
    "usu_modificacion" character varying,
    "id_cursillo" "uuid"
);

ALTER TABLE ONLY "public"."notificaciones" REPLICA IDENTITY FULL;


ALTER TABLE "public"."notificaciones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."opciones_pregunta" (
    "id_opcion" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "id_pregunta" "uuid" NOT NULL,
    "texto" "text" NOT NULL,
    "es_correcta" boolean DEFAULT false NOT NULL,
    "fec_insercion" timestamp with time zone,
    "usu_insercion" character varying,
    "fec_modificacion" timestamp with time zone,
    "usu_modificacion" character varying
);


ALTER TABLE "public"."opciones_pregunta" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."opciones_pregunta_estudiante" WITH ("security_invoker"='true') AS
 SELECT "id_opcion",
    "id_pregunta",
    "texto"
   FROM "public"."opciones_pregunta";


ALTER VIEW "public"."opciones_pregunta_estudiante" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."password_reset_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "code" "text" NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '00:15:00'::interval) NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "used" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fec_insercion" timestamp with time zone,
    "usu_insercion" character varying,
    "fec_modificacion" timestamp with time zone,
    "usu_modificacion" character varying
);


ALTER TABLE "public"."password_reset_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."preguntas_evaluacion" (
    "id_pregunta" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "id_evaluacion" "uuid" NOT NULL,
    "enunciado" "text" NOT NULL,
    "tipo" character varying(30) DEFAULT 'OPCION_MULTIPLE'::character varying NOT NULL,
    "puntaje" numeric(5,2) DEFAULT 1 NOT NULL,
    "fec_insercion" timestamp with time zone,
    "usu_insercion" character varying,
    "fec_modificacion" timestamp with time zone,
    "usu_modificacion" character varying
);


ALTER TABLE "public"."preguntas_evaluacion" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."progreso_lecciones" (
    "id_progreso" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "id_usuario" "uuid" NOT NULL,
    "id_leccion" "uuid" NOT NULL,
    "completado" boolean DEFAULT false NOT NULL,
    "fecha_completado" timestamp with time zone,
    "fec_insercion" timestamp with time zone,
    "usu_insercion" character varying,
    "fec_modificacion" timestamp with time zone,
    "usu_modificacion" character varying
);


ALTER TABLE "public"."progreso_lecciones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reclamos_evaluacion" (
    "id_reclamo" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_intento" "uuid" NOT NULL,
    "id_respuesta" "uuid" NOT NULL,
    "id_estudiante" "uuid" NOT NULL,
    "justificacion" "text" NOT NULL,
    "estado" "text" DEFAULT 'PENDIENTE'::"text" NOT NULL,
    "puntaje_original" numeric DEFAULT 0 NOT NULL,
    "puntaje_resuelto" numeric,
    "respuesta_docente" "text",
    "id_docente_resolutor" "uuid",
    "fecha_reclamo" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fecha_resolucion" timestamp with time zone,
    "fec_insercion" timestamp with time zone,
    "fec_modificacion" timestamp with time zone,
    "usu_insercion" character varying,
    "usu_modificacion" character varying,
    CONSTRAINT "reclamos_evaluacion_estado_check" CHECK (("estado" = ANY (ARRAY['PENDIENTE'::"text", 'ACEPTADO'::"text", 'RECHAZADO'::"text"])))
);


ALTER TABLE "public"."reclamos_evaluacion" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."respuestas_intento" (
    "id_respuesta" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "id_intento" "uuid" NOT NULL,
    "id_pregunta" "uuid" NOT NULL,
    "id_opcion" "uuid",
    "respuesta_texto" "text",
    "es_correcta" boolean,
    "puntaje_obtenido" numeric(7,2) DEFAULT 0 NOT NULL,
    "fec_insercion" timestamp with time zone,
    "usu_insercion" character varying,
    "fec_modificacion" timestamp with time zone,
    "usu_modificacion" character varying
);


ALTER TABLE "public"."respuestas_intento" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."retroalimentacion_intento" (
    "id_retro" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "id_intento" "uuid" NOT NULL,
    "id_docente" "uuid" NOT NULL,
    "comentario" "text",
    "ajuste_puntaje" numeric(7,2) DEFAULT 0 NOT NULL,
    "fecha_retro" timestamp with time zone DEFAULT "now"() NOT NULL,
    "archivo_url" "text",
    "fec_insercion" timestamp with time zone,
    "usu_insercion" character varying,
    "fec_modificacion" timestamp with time zone,
    "usu_modificacion" character varying
);


ALTER TABLE "public"."retroalimentacion_intento" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id_rol" smallint NOT NULL,
    "nombre_rol" character varying(50) NOT NULL,
    "fec_insercion" timestamp with time zone,
    "usu_insercion" character varying,
    "fec_modificacion" timestamp with time zone,
    "usu_modificacion" character varying
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."soporte_solicitudes" (
    "id_solicitud" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_cursillo" "uuid" NOT NULL,
    "id_usuario" "uuid" NOT NULL,
    "nombre_usuario" "text" NOT NULL,
    "telefono" "text" NOT NULL,
    "tipo_solicitud" "text" NOT NULL,
    "descripcion" "text" NOT NULL,
    "imagen_bucket" "text",
    "imagen_path" "text",
    "imagen_nombre" "text",
    "imagen_tipo_mime" "text",
    "imagen_tamano_bytes" bigint,
    "estado" "text" DEFAULT 'PENDIENTE'::"text" NOT NULL,
    "email_notificado" boolean DEFAULT false NOT NULL,
    "fecha_email_notificado" timestamp with time zone,
    "fecha_solicitud" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fec_insercion" timestamp with time zone,
    "fec_modificacion" timestamp with time zone,
    "usu_insercion" character varying,
    "usu_modificacion" character varying,
    "fecha_resolucion" timestamp with time zone,
    "id_admin_resolutor" "uuid",
    "resolucion_notificada" boolean DEFAULT false NOT NULL,
    "fecha_resolucion_notificada" timestamp with time zone,
    "resolucion_email_notificado" boolean DEFAULT false NOT NULL,
    "fecha_resolucion_email_notificado" timestamp with time zone,
    CONSTRAINT "soporte_solicitudes_descripcion_check" CHECK (("length"("btrim"("descripcion")) >= 10)),
    CONSTRAINT "soporte_solicitudes_estado_check" CHECK (("estado" = ANY (ARRAY['PENDIENTE'::"text", 'EN_REVISION'::"text", 'RESUELTO'::"text", 'DESCARTADO'::"text"]))),
    CONSTRAINT "soporte_solicitudes_imagen_bucket_check" CHECK ((("imagen_bucket" IS NULL) OR ("imagen_bucket" = 'soporte_evidencias'::"text"))),
    CONSTRAINT "soporte_solicitudes_imagen_mime_check" CHECK ((("imagen_tipo_mime" IS NULL) OR ("imagen_tipo_mime" = ANY (ARRAY['image/jpeg'::"text", 'image/png'::"text", 'image/webp'::"text"])))),
    CONSTRAINT "soporte_solicitudes_imagen_path_check" CHECK (((("imagen_path" IS NULL) AND ("imagen_bucket" IS NULL)) OR (("imagen_path" IS NOT NULL) AND ("imagen_bucket" = 'soporte_evidencias'::"text")))),
    CONSTRAINT "soporte_solicitudes_imagen_size_check" CHECK ((("imagen_tamano_bytes" IS NULL) OR ("imagen_tamano_bytes" <= 5242880))),
    CONSTRAINT "soporte_solicitudes_nombre_check" CHECK (("length"("btrim"("nombre_usuario")) > 0)),
    CONSTRAINT "soporte_solicitudes_telefono_check" CHECK (("length"("btrim"("telefono")) > 0)),
    CONSTRAINT "soporte_solicitudes_tipo_check" CHECK (("tipo_solicitud" = ANY (ARRAY['ERROR'::"text", 'MEJORA'::"text"])))
);


ALTER TABLE "public"."soporte_solicitudes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tareas" (
    "id_tarea" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "id_leccion" "uuid" NOT NULL,
    "titulo" character varying(200) NOT NULL,
    "descripcion" "text",
    "fecha_limite" timestamp with time zone,
    "permite_reintentos" boolean DEFAULT true NOT NULL,
    "max_reintentos" integer DEFAULT 3 NOT NULL,
    "fecha_creacion" timestamp with time zone DEFAULT "now"() NOT NULL,
    "puntaje_maximo" numeric DEFAULT 4 NOT NULL,
    "fec_insercion" timestamp with time zone,
    "usu_insercion" character varying,
    "fec_modificacion" timestamp with time zone,
    "usu_modificacion" character varying
);


ALTER TABLE "public"."tareas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usuarios" (
    "id_usuario" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "id_auth" "uuid",
    "correo" character varying(255),
    "nombres" character varying(120),
    "apellidos" character varying(120),
    "telefono" character varying(50),
    "es_activo" boolean DEFAULT true NOT NULL,
    "fecha_creacion" timestamp with time zone DEFAULT "now"() NOT NULL,
    "biografia" "text",
    "avatar_url" "text",
    "fec_insercion" timestamp with time zone,
    "usu_insercion" character varying,
    "fec_modificacion" timestamp with time zone,
    "usu_modificacion" character varying,
    "telefono_visible" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."usuarios" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usuarios_cursillos" (
    "id_usuario_cursillo" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "id_usuario" "uuid" NOT NULL,
    "id_cursillo" "uuid" NOT NULL,
    "id_rol" smallint,
    "fecha_asignacion" timestamp with time zone DEFAULT "now"() NOT NULL,
    "estado" "text" DEFAULT 'PENDIENTE'::"text" NOT NULL,
    "fec_insercion" timestamp with time zone,
    "usu_insercion" character varying,
    "fec_modificacion" timestamp with time zone,
    "usu_modificacion" character varying,
    CONSTRAINT "usuarios_cursillos_estado_check" CHECK (("estado" = ANY (ARRAY['PENDIENTE'::"text", 'ACTIVO'::"text", 'INACTIVO'::"text", 'BLOQUEADO'::"text", 'RECHAZADO'::"text"])))
);


ALTER TABLE "public"."usuarios_cursillos" OWNER TO "postgres";


ALTER TABLE ONLY "public"."adjuntos_leccion"
    ADD CONSTRAINT "adjuntos_leccion_pkey" PRIMARY KEY ("id_adjunto");



ALTER TABLE ONLY "public"."anuncios"
    ADD CONSTRAINT "anuncios_pkey" PRIMARY KEY ("id_anuncio");



ALTER TABLE ONLY "public"."archivos_entregas_tareas"
    ADD CONSTRAINT "archivos_entregas_tareas_pkey" PRIMARY KEY ("id_archivo");



ALTER TABLE ONLY "public"."certificados_curso"
    ADD CONSTRAINT "certificados_curso_id_curso_key" UNIQUE ("id_curso");



ALTER TABLE ONLY "public"."certificados_curso"
    ADD CONSTRAINT "certificados_curso_pkey" PRIMARY KEY ("id_certificado");



ALTER TABLE ONLY "public"."comentarios_leccion"
    ADD CONSTRAINT "comentarios_leccion_pkey" PRIMARY KEY ("id_comentario");



ALTER TABLE ONLY "public"."cursillos"
    ADD CONSTRAINT "cursillos_pkey" PRIMARY KEY ("id_cursillo");



ALTER TABLE ONLY "public"."curso_docentes_colaboradores"
    ADD CONSTRAINT "curso_docentes_colaboradores_pkey" PRIMARY KEY ("id_curso_docente_colaborador");



ALTER TABLE ONLY "public"."curso_docentes_colaboradores"
    ADD CONSTRAINT "curso_docentes_colaboradores_unq" UNIQUE ("id_curso", "id_docente");



ALTER TABLE ONLY "public"."cursos"
    ADD CONSTRAINT "cursos_pkey" PRIMARY KEY ("id_curso");



ALTER TABLE ONLY "public"."entregas_tareas"
    ADD CONSTRAINT "entregas_tareas_pkey" PRIMARY KEY ("id_entrega");



ALTER TABLE ONLY "public"."evaluaciones"
    ADD CONSTRAINT "evaluaciones_pkey" PRIMARY KEY ("id_evaluacion");



ALTER TABLE ONLY "public"."grupos_cursos"
    ADD CONSTRAINT "grupos_cursos_pkey" PRIMARY KEY ("id_grupo_curso");



ALTER TABLE ONLY "public"."imagenes_resolucion_intento"
    ADD CONSTRAINT "imagenes_resolucion_intento_pkey" PRIMARY KEY ("id_imagen");



ALTER TABLE ONLY "public"."inscripciones"
    ADD CONSTRAINT "inscripciones_id_curso_id_usuario_key" UNIQUE ("id_curso", "id_usuario");



ALTER TABLE ONLY "public"."inscripciones"
    ADD CONSTRAINT "inscripciones_pkey" PRIMARY KEY ("id_inscripcion");



ALTER TABLE ONLY "public"."intentos_evaluacion"
    ADD CONSTRAINT "intentos_evaluacion_pkey" PRIMARY KEY ("id_intento");



ALTER TABLE ONLY "public"."lecciones"
    ADD CONSTRAINT "lecciones_pkey" PRIMARY KEY ("id_leccion");



ALTER TABLE ONLY "public"."modulos"
    ADD CONSTRAINT "modulos_pkey" PRIMARY KEY ("id_modulo");



ALTER TABLE ONLY "public"."notificaciones"
    ADD CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id_notificacion");



ALTER TABLE ONLY "public"."opciones_pregunta"
    ADD CONSTRAINT "opciones_pregunta_pkey" PRIMARY KEY ("id_opcion");



ALTER TABLE ONLY "public"."password_reset_codes"
    ADD CONSTRAINT "password_reset_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."preguntas_evaluacion"
    ADD CONSTRAINT "preguntas_evaluacion_pkey" PRIMARY KEY ("id_pregunta");



ALTER TABLE ONLY "public"."progreso_lecciones"
    ADD CONSTRAINT "progreso_lecciones_id_usuario_id_leccion_key" UNIQUE ("id_usuario", "id_leccion");



ALTER TABLE ONLY "public"."progreso_lecciones"
    ADD CONSTRAINT "progreso_lecciones_pkey" PRIMARY KEY ("id_progreso");



ALTER TABLE ONLY "public"."reclamos_evaluacion"
    ADD CONSTRAINT "reclamos_evaluacion_pkey" PRIMARY KEY ("id_reclamo");



ALTER TABLE ONLY "public"."respuestas_intento"
    ADD CONSTRAINT "respuestas_intento_id_intento_id_pregunta_key" UNIQUE ("id_intento", "id_pregunta");



ALTER TABLE ONLY "public"."respuestas_intento"
    ADD CONSTRAINT "respuestas_intento_pkey" PRIMARY KEY ("id_respuesta");



ALTER TABLE ONLY "public"."retroalimentacion_intento"
    ADD CONSTRAINT "retroalimentacion_intento_id_intento_key" UNIQUE ("id_intento");



ALTER TABLE ONLY "public"."retroalimentacion_intento"
    ADD CONSTRAINT "retroalimentacion_intento_pkey" PRIMARY KEY ("id_retro");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_nombre_rol_key" UNIQUE ("nombre_rol");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id_rol");



ALTER TABLE ONLY "public"."soporte_solicitudes"
    ADD CONSTRAINT "soporte_solicitudes_pkey" PRIMARY KEY ("id_solicitud");



ALTER TABLE ONLY "public"."tareas"
    ADD CONSTRAINT "tareas_pkey" PRIMARY KEY ("id_tarea");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_correo_key" UNIQUE ("correo");



ALTER TABLE ONLY "public"."usuarios_cursillos"
    ADD CONSTRAINT "usuarios_cursillos_id_usuario_id_cursillo_key" UNIQUE ("id_usuario", "id_cursillo");



ALTER TABLE ONLY "public"."usuarios_cursillos"
    ADD CONSTRAINT "usuarios_cursillos_pkey" PRIMARY KEY ("id_usuario_cursillo");



ALTER TABLE ONLY "public"."usuarios_cursillos"
    ADD CONSTRAINT "usuarios_cursillos_unique" UNIQUE ("id_usuario", "id_cursillo");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_id_auth_key" UNIQUE ("id_auth");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id_usuario");



CREATE INDEX "idx_anuncios_cursillo" ON "public"."anuncios" USING "btree" ("id_cursillo");



CREATE INDEX "idx_archivos_entrega" ON "public"."archivos_entregas_tareas" USING "btree" ("id_entrega");



CREATE INDEX "idx_comentarios_leccion" ON "public"."comentarios_leccion" USING "btree" ("id_leccion");



CREATE INDEX "idx_curso_docentes_colaboradores_curso" ON "public"."curso_docentes_colaboradores" USING "btree" ("id_curso");



CREATE INDEX "idx_curso_docentes_colaboradores_docente" ON "public"."curso_docentes_colaboradores" USING "btree" ("id_docente");



CREATE INDEX "idx_cursos_cursillo" ON "public"."cursos" USING "btree" ("id_cursillo");



CREATE INDEX "idx_cursos_cursillo_grupo" ON "public"."cursos" USING "btree" ("id_cursillo", "id_grupo_curso");



CREATE INDEX "idx_dashboard_cursos_cursillo_publicado_fecha" ON "public"."cursos" USING "btree" ("id_cursillo", "es_publicado", "fecha_creacion" DESC);



CREATE INDEX "idx_dashboard_entregas_estado_fecha" ON "public"."entregas_tareas" USING "btree" ("estado", "fecha_entrega");



CREATE INDEX "idx_dashboard_entregas_usuario_tarea_estado" ON "public"."entregas_tareas" USING "btree" ("id_usuario", "id_tarea", "estado");



CREATE INDEX "idx_dashboard_inscripciones_curso_usuario" ON "public"."inscripciones" USING "btree" ("id_curso", "id_usuario");



CREATE INDEX "idx_dashboard_inscripciones_usuario_curso" ON "public"."inscripciones" USING "btree" ("id_usuario", "id_curso");



CREATE INDEX "idx_dashboard_lecciones_modulo" ON "public"."lecciones" USING "btree" ("id_modulo");



CREATE INDEX "idx_dashboard_modulos_curso" ON "public"."modulos" USING "btree" ("id_curso");



CREATE INDEX "idx_dashboard_tareas_leccion_fecha" ON "public"."tareas" USING "btree" ("id_leccion", "fecha_limite", "fecha_creacion");



CREATE INDEX "idx_dashboard_usuarios_cursillos_cursillo_estado" ON "public"."usuarios_cursillos" USING "btree" ("id_cursillo", "estado");



CREATE INDEX "idx_dashboard_usuarios_cursillos_cursillo_rol_usuario" ON "public"."usuarios_cursillos" USING "btree" ("id_cursillo", "id_rol", "id_usuario");



CREATE INDEX "idx_dashboard_usuarios_cursillos_usuario_cursillo" ON "public"."usuarios_cursillos" USING "btree" ("id_usuario", "id_cursillo");



CREATE INDEX "idx_entregas_tarea" ON "public"."entregas_tareas" USING "btree" ("id_tarea");



CREATE INDEX "idx_entregas_usuario" ON "public"."entregas_tareas" USING "btree" ("id_usuario");



CREATE INDEX "idx_evaluaciones_leccion" ON "public"."evaluaciones" USING "btree" ("id_leccion");



CREATE INDEX "idx_grupos_cursos_cursillo_orden" ON "public"."grupos_cursos" USING "btree" ("id_cursillo", "es_activo", "orden", "nombre");



CREATE UNIQUE INDEX "idx_grupos_cursos_nombre_cursillo" ON "public"."grupos_cursos" USING "btree" ("id_cursillo", "lower"(TRIM(BOTH FROM "nombre")));



CREATE INDEX "idx_img_intento" ON "public"."imagenes_resolucion_intento" USING "btree" ("id_intento");



CREATE INDEX "idx_inscripciones_curso" ON "public"."inscripciones" USING "btree" ("id_curso");



CREATE INDEX "idx_inscripciones_usuario" ON "public"."inscripciones" USING "btree" ("id_usuario");



CREATE INDEX "idx_intentos_eval" ON "public"."intentos_evaluacion" USING "btree" ("id_evaluacion");



CREATE INDEX "idx_intentos_usuario" ON "public"."intentos_evaluacion" USING "btree" ("id_usuario");



CREATE INDEX "idx_lecciones_modulo" ON "public"."lecciones" USING "btree" ("id_modulo");



CREATE INDEX "idx_modulos_curso" ON "public"."modulos" USING "btree" ("id_curso");



CREATE INDEX "idx_notificaciones_leido" ON "public"."notificaciones" USING "btree" ("id_usuario", "leido");



CREATE INDEX "idx_notificaciones_usuario" ON "public"."notificaciones" USING "btree" ("id_usuario");



CREATE INDEX "idx_notificaciones_usuario_cursillo" ON "public"."notificaciones" USING "btree" ("id_usuario", "id_cursillo");



CREATE INDEX "idx_opciones_pregunta" ON "public"."opciones_pregunta" USING "btree" ("id_pregunta");



CREATE INDEX "idx_prc_email" ON "public"."password_reset_codes" USING "btree" ("email");



CREATE INDEX "idx_preguntas_eval" ON "public"."preguntas_evaluacion" USING "btree" ("id_evaluacion");



CREATE INDEX "idx_progreso_leccion" ON "public"."progreso_lecciones" USING "btree" ("id_leccion");



CREATE UNIQUE INDEX "idx_progreso_lecciones_usuario_leccion" ON "public"."progreso_lecciones" USING "btree" ("id_usuario", "id_leccion");



CREATE INDEX "idx_progreso_usuario" ON "public"."progreso_lecciones" USING "btree" ("id_usuario");



CREATE INDEX "idx_reclamos_evaluacion_estudiante" ON "public"."reclamos_evaluacion" USING "btree" ("id_estudiante");



CREATE INDEX "idx_reclamos_evaluacion_intento" ON "public"."reclamos_evaluacion" USING "btree" ("id_intento");



CREATE INDEX "idx_reclamos_evaluacion_respuesta" ON "public"."reclamos_evaluacion" USING "btree" ("id_respuesta");



CREATE INDEX "idx_respuestas_intento" ON "public"."respuestas_intento" USING "btree" ("id_intento");



CREATE INDEX "idx_retro_docente" ON "public"."retroalimentacion_intento" USING "btree" ("id_docente");



CREATE INDEX "idx_soporte_solicitudes_cursillo_fecha" ON "public"."soporte_solicitudes" USING "btree" ("id_cursillo", "fecha_solicitud" DESC);



CREATE INDEX "idx_soporte_solicitudes_estado" ON "public"."soporte_solicitudes" USING "btree" ("estado");



CREATE INDEX "idx_soporte_solicitudes_resolucion" ON "public"."soporte_solicitudes" USING "btree" ("estado", "fecha_resolucion" DESC);



CREATE INDEX "idx_soporte_solicitudes_usuario" ON "public"."soporte_solicitudes" USING "btree" ("id_usuario");



CREATE INDEX "idx_tareas_leccion" ON "public"."tareas" USING "btree" ("id_leccion");



CREATE INDEX "idx_usuarios_cursillos_cursillo" ON "public"."usuarios_cursillos" USING "btree" ("id_cursillo");



CREATE INDEX "idx_usuarios_cursillos_rol" ON "public"."usuarios_cursillos" USING "btree" ("id_rol");



CREATE INDEX "idx_usuarios_cursillos_usuario" ON "public"."usuarios_cursillos" USING "btree" ("id_usuario");



CREATE UNIQUE INDEX "reclamos_evaluacion_unq_pendiente_intento" ON "public"."reclamos_evaluacion" USING "btree" ("id_intento") WHERE ("estado" = 'PENDIENTE'::"text");



CREATE OR REPLACE TRIGGER "on_new_pending_user" AFTER INSERT ON "public"."usuarios_cursillos" FOR EACH ROW EXECUTE FUNCTION "public"."notify_admins_new_pending_user"();



CREATE OR REPLACE TRIGGER "on_user_status_change" AFTER UPDATE OF "estado" ON "public"."usuarios_cursillos" FOR EACH ROW EXECUTE FUNCTION "public"."notify_user_status_change"();



CREATE OR REPLACE TRIGGER "on_usuario_created_assign_cursillo" AFTER INSERT ON "public"."usuarios" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_usuario_cursillo"();



CREATE OR REPLACE TRIGGER "prevent_direct_curso_password_hash_write" BEFORE INSERT OR UPDATE OF "password_hash" ON "public"."cursos" FOR EACH ROW EXECUTE FUNCTION "public"."trg_prevent_direct_password_hash_write"();



CREATE OR REPLACE TRIGGER "prevent_direct_grupo_password_hash_write" BEFORE INSERT OR UPDATE OF "password_hash" ON "public"."grupos_cursos" FOR EACH ROW EXECUTE FUNCTION "public"."trg_prevent_direct_password_hash_write"();



CREATE OR REPLACE TRIGGER "prevent_entregas_tampering" BEFORE UPDATE ON "public"."entregas_tareas" FOR EACH ROW EXECUTE FUNCTION "public"."trg_prevent_entregas_tampering"();



CREATE OR REPLACE TRIGGER "prevent_intentos_tampering" BEFORE UPDATE ON "public"."intentos_evaluacion" FOR EACH ROW EXECUTE FUNCTION "public"."trg_prevent_intentos_tampering"();



CREATE OR REPLACE TRIGGER "set_auditoria_campos" BEFORE INSERT OR UPDATE ON "public"."adjuntos_leccion" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_auditoria_campos"();



CREATE OR REPLACE TRIGGER "set_auditoria_campos" BEFORE INSERT OR UPDATE ON "public"."anuncios" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_auditoria_campos"();



CREATE OR REPLACE TRIGGER "set_auditoria_campos" BEFORE INSERT OR UPDATE ON "public"."archivos_entregas_tareas" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_auditoria_campos"();



CREATE OR REPLACE TRIGGER "set_auditoria_campos" BEFORE INSERT OR UPDATE ON "public"."certificados_curso" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_auditoria_campos"();



CREATE OR REPLACE TRIGGER "set_auditoria_campos" BEFORE INSERT OR UPDATE ON "public"."comentarios_leccion" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_auditoria_campos"();



CREATE OR REPLACE TRIGGER "set_auditoria_campos" BEFORE INSERT OR UPDATE ON "public"."cursillos" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_auditoria_campos"();



CREATE OR REPLACE TRIGGER "set_auditoria_campos" BEFORE INSERT OR UPDATE ON "public"."curso_docentes_colaboradores" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_auditoria_campos"();



CREATE OR REPLACE TRIGGER "set_auditoria_campos" BEFORE INSERT OR UPDATE ON "public"."cursos" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_auditoria_campos"();



CREATE OR REPLACE TRIGGER "set_auditoria_campos" BEFORE INSERT OR UPDATE ON "public"."entregas_tareas" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_auditoria_campos"();



CREATE OR REPLACE TRIGGER "set_auditoria_campos" BEFORE INSERT OR UPDATE ON "public"."evaluaciones" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_auditoria_campos"();



CREATE OR REPLACE TRIGGER "set_auditoria_campos" BEFORE INSERT OR UPDATE ON "public"."grupos_cursos" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_auditoria_campos"();



CREATE OR REPLACE TRIGGER "set_auditoria_campos" BEFORE INSERT OR UPDATE ON "public"."imagenes_resolucion_intento" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_auditoria_campos"();



CREATE OR REPLACE TRIGGER "set_auditoria_campos" BEFORE INSERT OR UPDATE ON "public"."inscripciones" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_auditoria_campos"();



CREATE OR REPLACE TRIGGER "set_auditoria_campos" BEFORE INSERT OR UPDATE ON "public"."intentos_evaluacion" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_auditoria_campos"();



CREATE OR REPLACE TRIGGER "set_auditoria_campos" BEFORE INSERT OR UPDATE ON "public"."lecciones" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_auditoria_campos"();



CREATE OR REPLACE TRIGGER "set_auditoria_campos" BEFORE INSERT OR UPDATE ON "public"."modulos" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_auditoria_campos"();



CREATE OR REPLACE TRIGGER "set_auditoria_campos" BEFORE INSERT OR UPDATE ON "public"."notificaciones" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_auditoria_campos"();



CREATE OR REPLACE TRIGGER "set_auditoria_campos" BEFORE INSERT OR UPDATE ON "public"."opciones_pregunta" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_auditoria_campos"();



CREATE OR REPLACE TRIGGER "set_auditoria_campos" BEFORE INSERT OR UPDATE ON "public"."password_reset_codes" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_auditoria_campos"();



CREATE OR REPLACE TRIGGER "set_auditoria_campos" BEFORE INSERT OR UPDATE ON "public"."preguntas_evaluacion" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_auditoria_campos"();



CREATE OR REPLACE TRIGGER "set_auditoria_campos" BEFORE INSERT OR UPDATE ON "public"."progreso_lecciones" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_auditoria_campos"();



CREATE OR REPLACE TRIGGER "set_auditoria_campos" BEFORE INSERT OR UPDATE ON "public"."reclamos_evaluacion" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_auditoria_campos"();



CREATE OR REPLACE TRIGGER "set_auditoria_campos" BEFORE INSERT OR UPDATE ON "public"."respuestas_intento" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_auditoria_campos"();



CREATE OR REPLACE TRIGGER "set_auditoria_campos" BEFORE INSERT OR UPDATE ON "public"."retroalimentacion_intento" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_auditoria_campos"();



CREATE OR REPLACE TRIGGER "set_auditoria_campos" BEFORE INSERT OR UPDATE ON "public"."roles" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_auditoria_campos"();



CREATE OR REPLACE TRIGGER "set_auditoria_campos" BEFORE INSERT OR UPDATE ON "public"."soporte_solicitudes" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_auditoria_campos"();



CREATE OR REPLACE TRIGGER "set_auditoria_campos" BEFORE INSERT OR UPDATE ON "public"."tareas" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_auditoria_campos"();



CREATE OR REPLACE TRIGGER "set_auditoria_campos" BEFORE INSERT OR UPDATE ON "public"."usuarios" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_auditoria_campos"();



CREATE OR REPLACE TRIGGER "set_auditoria_campos" BEFORE INSERT OR UPDATE ON "public"."usuarios_cursillos" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_auditoria_campos"();



CREATE OR REPLACE TRIGGER "validate_curso_docente_colaborador" BEFORE INSERT OR UPDATE OF "id_curso", "id_docente" ON "public"."curso_docentes_colaboradores" FOR EACH ROW EXECUTE FUNCTION "public"."trg_validate_curso_docente_colaborador"();



CREATE OR REPLACE TRIGGER "validate_curso_grupo_cursillo" BEFORE INSERT OR UPDATE OF "id_cursillo", "id_grupo_curso" ON "public"."cursos" FOR EACH ROW EXECUTE FUNCTION "public"."trg_validate_curso_grupo_cursillo"();



CREATE OR REPLACE TRIGGER "validate_curso_owner" BEFORE INSERT OR UPDATE OF "id_docente", "id_cursillo" ON "public"."cursos" FOR EACH ROW EXECUTE FUNCTION "public"."trg_validate_curso_owner"();



ALTER TABLE ONLY "public"."adjuntos_leccion"
    ADD CONSTRAINT "adjuntos_leccion_id_leccion_fkey" FOREIGN KEY ("id_leccion") REFERENCES "public"."lecciones"("id_leccion") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."anuncios"
    ADD CONSTRAINT "anuncios_id_creador_fkey" FOREIGN KEY ("id_creador") REFERENCES "public"."usuarios"("id_usuario");



ALTER TABLE ONLY "public"."anuncios"
    ADD CONSTRAINT "anuncios_id_cursillo_fkey" FOREIGN KEY ("id_cursillo") REFERENCES "public"."cursillos"("id_cursillo") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."anuncios"
    ADD CONSTRAINT "anuncios_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "public"."cursos"("id_curso") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."archivos_entregas_tareas"
    ADD CONSTRAINT "archivos_entregas_tareas_id_entrega_fkey" FOREIGN KEY ("id_entrega") REFERENCES "public"."entregas_tareas"("id_entrega") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comentarios_leccion"
    ADD CONSTRAINT "comentarios_leccion_id_leccion_fkey" FOREIGN KEY ("id_leccion") REFERENCES "public"."lecciones"("id_leccion") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comentarios_leccion"
    ADD CONSTRAINT "comentarios_leccion_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "public"."usuarios"("id_usuario") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."curso_docentes_colaboradores"
    ADD CONSTRAINT "curso_docentes_colaboradores_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "public"."cursos"("id_curso") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."curso_docentes_colaboradores"
    ADD CONSTRAINT "curso_docentes_colaboradores_id_docente_fkey" FOREIGN KEY ("id_docente") REFERENCES "public"."usuarios"("id_usuario") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cursos"
    ADD CONSTRAINT "cursos_id_cursillo_fkey" FOREIGN KEY ("id_cursillo") REFERENCES "public"."cursillos"("id_cursillo") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cursos"
    ADD CONSTRAINT "cursos_id_docente_fkey" FOREIGN KEY ("id_docente") REFERENCES "public"."usuarios"("id_usuario");



ALTER TABLE ONLY "public"."cursos"
    ADD CONSTRAINT "cursos_id_grupo_curso_fkey" FOREIGN KEY ("id_grupo_curso") REFERENCES "public"."grupos_cursos"("id_grupo_curso") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."entregas_tareas"
    ADD CONSTRAINT "entregas_tareas_id_docente_corrector_fkey" FOREIGN KEY ("id_docente_corrector") REFERENCES "public"."usuarios"("id_usuario");



ALTER TABLE ONLY "public"."entregas_tareas"
    ADD CONSTRAINT "entregas_tareas_id_tarea_fkey" FOREIGN KEY ("id_tarea") REFERENCES "public"."tareas"("id_tarea") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entregas_tareas"
    ADD CONSTRAINT "entregas_tareas_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "public"."usuarios"("id_usuario") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."evaluaciones"
    ADD CONSTRAINT "evaluaciones_id_leccion_fkey" FOREIGN KEY ("id_leccion") REFERENCES "public"."lecciones"("id_leccion") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."grupos_cursos"
    ADD CONSTRAINT "grupos_cursos_id_cursillo_fkey" FOREIGN KEY ("id_cursillo") REFERENCES "public"."cursillos"("id_cursillo") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."imagenes_resolucion_intento"
    ADD CONSTRAINT "imagenes_resolucion_intento_id_intento_fkey" FOREIGN KEY ("id_intento") REFERENCES "public"."intentos_evaluacion"("id_intento") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inscripciones"
    ADD CONSTRAINT "inscripciones_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "public"."cursos"("id_curso") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inscripciones"
    ADD CONSTRAINT "inscripciones_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "public"."usuarios"("id_usuario") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."intentos_evaluacion"
    ADD CONSTRAINT "intentos_evaluacion_id_evaluacion_fkey" FOREIGN KEY ("id_evaluacion") REFERENCES "public"."evaluaciones"("id_evaluacion") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."intentos_evaluacion"
    ADD CONSTRAINT "intentos_evaluacion_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "public"."usuarios"("id_usuario") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lecciones"
    ADD CONSTRAINT "lecciones_id_modulo_fkey" FOREIGN KEY ("id_modulo") REFERENCES "public"."modulos"("id_modulo") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."modulos"
    ADD CONSTRAINT "modulos_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "public"."cursos"("id_curso") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notificaciones"
    ADD CONSTRAINT "notificaciones_id_cursillo_fkey" FOREIGN KEY ("id_cursillo") REFERENCES "public"."cursillos"("id_cursillo") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notificaciones"
    ADD CONSTRAINT "notificaciones_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "public"."usuarios"("id_usuario") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."opciones_pregunta"
    ADD CONSTRAINT "opciones_pregunta_id_pregunta_fkey" FOREIGN KEY ("id_pregunta") REFERENCES "public"."preguntas_evaluacion"("id_pregunta") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."preguntas_evaluacion"
    ADD CONSTRAINT "preguntas_evaluacion_id_evaluacion_fkey" FOREIGN KEY ("id_evaluacion") REFERENCES "public"."evaluaciones"("id_evaluacion") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."progreso_lecciones"
    ADD CONSTRAINT "progreso_lecciones_id_leccion_fkey" FOREIGN KEY ("id_leccion") REFERENCES "public"."lecciones"("id_leccion") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."progreso_lecciones"
    ADD CONSTRAINT "progreso_lecciones_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "public"."usuarios"("id_usuario") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reclamos_evaluacion"
    ADD CONSTRAINT "reclamos_evaluacion_id_docente_resolutor_fkey" FOREIGN KEY ("id_docente_resolutor") REFERENCES "public"."usuarios"("id_usuario");



ALTER TABLE ONLY "public"."reclamos_evaluacion"
    ADD CONSTRAINT "reclamos_evaluacion_id_estudiante_fkey" FOREIGN KEY ("id_estudiante") REFERENCES "public"."usuarios"("id_usuario") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reclamos_evaluacion"
    ADD CONSTRAINT "reclamos_evaluacion_id_intento_fkey" FOREIGN KEY ("id_intento") REFERENCES "public"."intentos_evaluacion"("id_intento") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reclamos_evaluacion"
    ADD CONSTRAINT "reclamos_evaluacion_id_respuesta_fkey" FOREIGN KEY ("id_respuesta") REFERENCES "public"."respuestas_intento"("id_respuesta") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."respuestas_intento"
    ADD CONSTRAINT "respuestas_intento_id_intento_fkey" FOREIGN KEY ("id_intento") REFERENCES "public"."intentos_evaluacion"("id_intento") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."respuestas_intento"
    ADD CONSTRAINT "respuestas_intento_id_opcion_fkey" FOREIGN KEY ("id_opcion") REFERENCES "public"."opciones_pregunta"("id_opcion");



ALTER TABLE ONLY "public"."respuestas_intento"
    ADD CONSTRAINT "respuestas_intento_id_pregunta_fkey" FOREIGN KEY ("id_pregunta") REFERENCES "public"."preguntas_evaluacion"("id_pregunta") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."retroalimentacion_intento"
    ADD CONSTRAINT "retroalimentacion_intento_id_docente_fkey" FOREIGN KEY ("id_docente") REFERENCES "public"."usuarios"("id_usuario") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."retroalimentacion_intento"
    ADD CONSTRAINT "retroalimentacion_intento_id_intento_fkey" FOREIGN KEY ("id_intento") REFERENCES "public"."intentos_evaluacion"("id_intento") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."soporte_solicitudes"
    ADD CONSTRAINT "soporte_solicitudes_id_admin_resolutor_fkey" FOREIGN KEY ("id_admin_resolutor") REFERENCES "public"."usuarios"("id_usuario");



ALTER TABLE ONLY "public"."soporte_solicitudes"
    ADD CONSTRAINT "soporte_solicitudes_id_cursillo_fkey" FOREIGN KEY ("id_cursillo") REFERENCES "public"."cursillos"("id_cursillo") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."soporte_solicitudes"
    ADD CONSTRAINT "soporte_solicitudes_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "public"."usuarios"("id_usuario") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tareas"
    ADD CONSTRAINT "tareas_id_leccion_fkey" FOREIGN KEY ("id_leccion") REFERENCES "public"."lecciones"("id_leccion") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usuarios_cursillos"
    ADD CONSTRAINT "usuarios_cursillos_id_cursillo_fkey" FOREIGN KEY ("id_cursillo") REFERENCES "public"."cursillos"("id_cursillo") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usuarios_cursillos"
    ADD CONSTRAINT "usuarios_cursillos_id_rol_fkey" FOREIGN KEY ("id_rol") REFERENCES "public"."roles"("id_rol");



ALTER TABLE ONLY "public"."usuarios_cursillos"
    ADD CONSTRAINT "usuarios_cursillos_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "public"."usuarios"("id_usuario") ON DELETE CASCADE;



CREATE POLICY "Admins pueden actualizar estado" ON "public"."usuarios_cursillos" FOR UPDATE USING ("public"."has_cursillo_role"("id_cursillo", 'ADMINISTRADOR'::"text")) WITH CHECK ("public"."has_cursillo_role"("id_cursillo", 'ADMINISTRADOR'::"text"));



CREATE POLICY "Admins y docentes pueden ver usuarios del cursillo" ON "public"."usuarios_cursillos" FOR SELECT TO "authenticated" USING (("public"."has_cursillo_role"("id_cursillo", 'ADMINISTRADOR'::"text") OR "public"."has_cursillo_role"("id_cursillo", 'DOCENTE'::"text")));



CREATE POLICY "Allow insert notifications" ON "public"."notificaciones" FOR INSERT WITH CHECK (true);



CREATE POLICY "Docentes pueden corregir entregas de tareas" ON "public"."entregas_tareas" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ((("public"."tareas" "t"
     JOIN "public"."lecciones" "l" ON (("l"."id_leccion" = "t"."id_leccion")))
     JOIN "public"."modulos" "m" ON (("m"."id_modulo" = "l"."id_modulo")))
     JOIN "public"."cursos" "c" ON (("c"."id_curso" = "m"."id_curso")))
  WHERE (("t"."id_tarea" = "entregas_tareas"."id_tarea") AND ("public"."has_cursillo_role"("c"."id_cursillo", 'ADMINISTRADOR'::"text") OR ("c"."id_docente" = "public"."current_id_usuario"()))))));



CREATE POLICY "Users can update own notifications" ON "public"."notificaciones" FOR UPDATE USING (("id_usuario" = "public"."current_id_usuario"())) WITH CHECK (("id_usuario" = "public"."current_id_usuario"()));



CREATE POLICY "Users can view own notifications" ON "public"."notificaciones" FOR SELECT USING (("id_usuario" = "public"."current_id_usuario"()));



CREATE POLICY "adjuntos_delete" ON "public"."adjuntos_leccion" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."lecciones" "l"
  WHERE (("l"."id_leccion" = "adjuntos_leccion"."id_leccion") AND "public"."can_manage_leccion"("l"."id_leccion")))));



CREATE POLICY "adjuntos_insert" ON "public"."adjuntos_leccion" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."lecciones" "l"
  WHERE (("l"."id_leccion" = "adjuntos_leccion"."id_leccion") AND "public"."can_manage_leccion"("l"."id_leccion")))));



ALTER TABLE "public"."adjuntos_leccion" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "adjuntos_select" ON "public"."adjuntos_leccion" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."lecciones" "l"
     JOIN "public"."modulos" "m" ON (("m"."id_modulo" = "l"."id_modulo")))
     JOIN "public"."cursos" "c" ON (("c"."id_curso" = "m"."id_curso")))
  WHERE (("l"."id_leccion" = "adjuntos_leccion"."id_leccion") AND (("c"."es_publicado" = true) OR "public"."has_cursillo_role"("c"."id_cursillo", 'ADMINISTRADOR'::"text") OR "public"."has_cursillo_role"("c"."id_cursillo", 'DOCENTE'::"text"))))));



ALTER TABLE "public"."anuncios" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "anuncios_delete_admin" ON "public"."anuncios" FOR DELETE USING ("public"."has_cursillo_role"("id_cursillo", 'ADMINISTRADOR'::"text"));



CREATE POLICY "anuncios_delete_creator" ON "public"."anuncios" FOR DELETE USING (("id_creador" = "public"."current_id_usuario"()));



CREATE POLICY "anuncios_insert" ON "public"."anuncios" FOR INSERT WITH CHECK (("public"."has_cursillo_role"("id_cursillo", 'ADMINISTRADOR'::"text") OR "public"."has_cursillo_role"("id_cursillo", 'DOCENTE'::"text")));



CREATE POLICY "anuncios_select_all" ON "public"."anuncios" FOR SELECT USING (("public"."has_cursillo_role"("id_cursillo", 'ADMINISTRADOR'::"text") OR "public"."has_cursillo_role"("id_cursillo", 'DOCENTE'::"text") OR "public"."has_cursillo_role"("id_cursillo", 'ESTUDIANTE'::"text")));



CREATE POLICY "anuncios_update_admin" ON "public"."anuncios" FOR UPDATE USING ("public"."has_cursillo_role"("id_cursillo", 'ADMINISTRADOR'::"text"));



CREATE POLICY "anuncios_update_creator" ON "public"."anuncios" FOR UPDATE USING (("id_creador" = "public"."current_id_usuario"()));



CREATE POLICY "archivos_delete_own" ON "public"."archivos_entregas_tareas" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."entregas_tareas" "e"
  WHERE (("e"."id_entrega" = "archivos_entregas_tareas"."id_entrega") AND ("e"."id_usuario" = "public"."current_id_usuario"()) AND (("e"."estado")::"text" = 'ENVIADO'::"text")))));



ALTER TABLE "public"."archivos_entregas_tareas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "archivos_insert_own" ON "public"."archivos_entregas_tareas" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."entregas_tareas" "e"
  WHERE (("e"."id_entrega" = "archivos_entregas_tareas"."id_entrega") AND ("e"."id_usuario" = "public"."current_id_usuario"()) AND (("e"."estado")::"text" = 'ENVIADO'::"text")))));



CREATE POLICY "archivos_select_admin_docente" ON "public"."archivos_entregas_tareas" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."entregas_tareas" "e"
  WHERE (("e"."id_entrega" = "archivos_entregas_tareas"."id_entrega") AND "public"."can_manage_tarea"("e"."id_tarea")))));



CREATE POLICY "archivos_select_own" ON "public"."archivos_entregas_tareas" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."entregas_tareas" "e"
  WHERE (("e"."id_entrega" = "archivos_entregas_tareas"."id_entrega") AND ("e"."id_usuario" = "public"."current_id_usuario"())))));



ALTER TABLE "public"."certificados_curso" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "certificados_delete_admin_docente" ON "public"."certificados_curso" FOR DELETE USING ("public"."can_manage_curso"("id_curso"));



CREATE POLICY "certificados_insert_admin_docente" ON "public"."certificados_curso" FOR INSERT WITH CHECK ("public"."can_manage_curso"("id_curso"));



CREATE POLICY "certificados_select_admin_docente" ON "public"."certificados_curso" FOR SELECT USING ("public"."can_manage_curso"("id_curso"));



CREATE POLICY "certificados_select_enrolled_completed" ON "public"."certificados_curso" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."inscripciones" "i"
  WHERE (("i"."id_curso" = "certificados_curso"."id_curso") AND ("i"."id_usuario" = "public"."current_id_usuario"())))));



CREATE POLICY "certificados_update_admin_docente" ON "public"."certificados_curso" FOR UPDATE USING ("public"."can_manage_curso"("id_curso"));



CREATE POLICY "comentarios_delete" ON "public"."comentarios_leccion" FOR DELETE USING ((("id_usuario" = "public"."current_id_usuario"()) OR (EXISTS ( SELECT 1
   FROM (("public"."lecciones" "l"
     JOIN "public"."modulos" "m" ON (("m"."id_modulo" = "l"."id_modulo")))
     JOIN "public"."cursos" "c" ON (("c"."id_curso" = "m"."id_curso")))
  WHERE (("l"."id_leccion" = "comentarios_leccion"."id_leccion") AND "public"."has_cursillo_role"("c"."id_cursillo", 'ADMINISTRADOR'::"text"))))));



CREATE POLICY "comentarios_insert" ON "public"."comentarios_leccion" FOR INSERT WITH CHECK ((("id_usuario" = "public"."current_id_usuario"()) AND (EXISTS ( SELECT 1
   FROM (("public"."lecciones" "l"
     JOIN "public"."modulos" "m" ON (("m"."id_modulo" = "l"."id_modulo")))
     JOIN "public"."cursos" "c" ON (("c"."id_curso" = "m"."id_curso")))
  WHERE (("l"."id_leccion" = "comentarios_leccion"."id_leccion") AND ("c"."es_publicado" = true))))));



ALTER TABLE "public"."comentarios_leccion" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "comentarios_select" ON "public"."comentarios_leccion" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."lecciones" "l"
     JOIN "public"."modulos" "m" ON (("m"."id_modulo" = "l"."id_modulo")))
     JOIN "public"."cursos" "c" ON (("c"."id_curso" = "m"."id_curso")))
  WHERE (("l"."id_leccion" = "comentarios_leccion"."id_leccion") AND (("c"."es_publicado" = true) OR "public"."has_cursillo_role"("c"."id_cursillo", 'ADMINISTRADOR'::"text") OR "public"."has_cursillo_role"("c"."id_cursillo", 'DOCENTE'::"text"))))));



ALTER TABLE "public"."cursillos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cursillos_select_anon" ON "public"."cursillos" FOR SELECT TO "anon" USING (true);



CREATE POLICY "cursillos_select_authenticated" ON "public"."cursillos" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."curso_docentes_colaboradores" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "curso_docentes_colaboradores_delete" ON "public"."curso_docentes_colaboradores" FOR DELETE USING ("public"."can_admin_or_own_curso"("id_curso"));



CREATE POLICY "curso_docentes_colaboradores_insert" ON "public"."curso_docentes_colaboradores" FOR INSERT WITH CHECK ("public"."can_admin_or_own_curso"("id_curso"));



CREATE POLICY "curso_docentes_colaboradores_select" ON "public"."curso_docentes_colaboradores" FOR SELECT USING (("public"."can_manage_curso"("id_curso") OR ("id_docente" = "public"."current_id_usuario"())));



CREATE POLICY "curso_docentes_colaboradores_update" ON "public"."curso_docentes_colaboradores" FOR UPDATE USING ("public"."can_admin_or_own_curso"("id_curso")) WITH CHECK ("public"."can_admin_or_own_curso"("id_curso"));



ALTER TABLE "public"."cursos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cursos_delete_admin" ON "public"."cursos" FOR DELETE USING ("public"."has_cursillo_role"("id_cursillo", 'ADMINISTRADOR'::"text"));



CREATE POLICY "cursos_delete_docente" ON "public"."cursos" FOR DELETE USING (("id_docente" = "public"."current_id_usuario"()));



CREATE POLICY "cursos_insert_admin" ON "public"."cursos" FOR INSERT WITH CHECK ("public"."has_cursillo_role"("id_cursillo", 'ADMINISTRADOR'::"text"));



CREATE POLICY "cursos_insert_docente" ON "public"."cursos" FOR INSERT WITH CHECK (("public"."has_cursillo_role"("id_cursillo", 'DOCENTE'::"text") AND ("id_docente" = "public"."current_id_usuario"())));



CREATE POLICY "cursos_select_admin_docente" ON "public"."cursos" FOR SELECT USING (("public"."has_cursillo_role"("id_cursillo", 'ADMINISTRADOR'::"text") OR "public"."has_cursillo_role"("id_cursillo", 'DOCENTE'::"text")));



CREATE POLICY "cursos_select_publicados" ON "public"."cursos" FOR SELECT USING (("es_publicado" = true));



CREATE POLICY "cursos_update_admin" ON "public"."cursos" FOR UPDATE USING ("public"."has_cursillo_role"("id_cursillo", 'ADMINISTRADOR'::"text"));



CREATE POLICY "cursos_update_docente" ON "public"."cursos" FOR UPDATE USING ("public"."can_manage_curso"("id_curso")) WITH CHECK ("public"."can_manage_curso"("id_curso"));



CREATE POLICY "entregas_insert_own" ON "public"."entregas_tareas" FOR INSERT WITH CHECK ((("id_usuario" = "public"."current_id_usuario"()) AND "public"."is_enrolled_in_tarea_course"("id_tarea")));



CREATE POLICY "entregas_select_admin_docente" ON "public"."entregas_tareas" FOR SELECT USING ("public"."can_manage_tarea"("id_tarea"));



CREATE POLICY "entregas_select_own" ON "public"."entregas_tareas" FOR SELECT USING (("id_usuario" = "public"."current_id_usuario"()));



ALTER TABLE "public"."entregas_tareas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "entregas_update_docente" ON "public"."entregas_tareas" FOR UPDATE USING ("public"."can_manage_tarea"("id_tarea"));



CREATE POLICY "entregas_update_own" ON "public"."entregas_tareas" FOR UPDATE USING ((("id_usuario" = "public"."current_id_usuario"()) AND (("estado")::"text" = 'ENVIADO'::"text"))) WITH CHECK (("id_usuario" = "public"."current_id_usuario"()));



ALTER TABLE "public"."evaluaciones" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "evaluaciones_delete" ON "public"."evaluaciones" FOR DELETE USING ("public"."can_manage_evaluacion"("id_evaluacion"));



CREATE POLICY "evaluaciones_insert" ON "public"."evaluaciones" FOR INSERT WITH CHECK ("public"."can_manage_leccion"("id_leccion"));



CREATE POLICY "evaluaciones_select_admin_docente" ON "public"."evaluaciones" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."lecciones" "l"
     JOIN "public"."modulos" "m" ON (("m"."id_modulo" = "l"."id_modulo")))
     JOIN "public"."cursos" "c" ON (("c"."id_curso" = "m"."id_curso")))
  WHERE (("l"."id_leccion" = "evaluaciones"."id_leccion") AND ("public"."has_cursillo_role"("c"."id_cursillo", 'ADMINISTRADOR'::"text") OR "public"."has_cursillo_role"("c"."id_cursillo", 'DOCENTE'::"text"))))));



CREATE POLICY "evaluaciones_select_enrolled" ON "public"."evaluaciones" FOR SELECT USING ("public"."is_enrolled_in_evaluacion_course"("id_evaluacion"));



CREATE POLICY "evaluaciones_update" ON "public"."evaluaciones" FOR UPDATE USING ("public"."can_manage_evaluacion"("id_evaluacion"));



ALTER TABLE "public"."grupos_cursos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "grupos_cursos_delete_admin" ON "public"."grupos_cursos" FOR DELETE USING ("public"."has_cursillo_role"("id_cursillo", 'ADMINISTRADOR'::"text"));



CREATE POLICY "grupos_cursos_insert_admin" ON "public"."grupos_cursos" FOR INSERT WITH CHECK (("public"."has_cursillo_role"("id_cursillo", 'ADMINISTRADOR'::"text") OR "public"."has_cursillo_role"("id_cursillo", 'DOCENTE'::"text")));



CREATE POLICY "grupos_cursos_select" ON "public"."grupos_cursos" FOR SELECT USING (("public"."has_cursillo_role"("id_cursillo", 'ADMINISTRADOR'::"text") OR "public"."has_cursillo_role"("id_cursillo", 'DOCENTE'::"text") OR (("es_activo" = true) AND "public"."has_cursillo_role"("id_cursillo", 'ESTUDIANTE'::"text"))));



CREATE POLICY "grupos_cursos_update_admin" ON "public"."grupos_cursos" FOR UPDATE USING (("public"."has_cursillo_role"("id_cursillo", 'ADMINISTRADOR'::"text") OR "public"."has_cursillo_role"("id_cursillo", 'DOCENTE'::"text"))) WITH CHECK (("public"."has_cursillo_role"("id_cursillo", 'ADMINISTRADOR'::"text") OR "public"."has_cursillo_role"("id_cursillo", 'DOCENTE'::"text")));



CREATE POLICY "imagenes_delete_own" ON "public"."imagenes_resolucion_intento" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."intentos_evaluacion" "i"
  WHERE (("i"."id_intento" = "imagenes_resolucion_intento"."id_intento") AND ("i"."id_usuario" = "public"."current_id_usuario"()) AND (("i"."estado")::"text" = 'EN_PROGRESO'::"text")))));



CREATE POLICY "imagenes_insert_own" ON "public"."imagenes_resolucion_intento" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."intentos_evaluacion" "i"
  WHERE (("i"."id_intento" = "imagenes_resolucion_intento"."id_intento") AND ("i"."id_usuario" = "public"."current_id_usuario"()) AND (("i"."estado")::"text" = 'EN_PROGRESO'::"text")))));



ALTER TABLE "public"."imagenes_resolucion_intento" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "imagenes_select_admin_docente" ON "public"."imagenes_resolucion_intento" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."intentos_evaluacion" "i"
  WHERE (("i"."id_intento" = "imagenes_resolucion_intento"."id_intento") AND "public"."can_manage_evaluacion"("i"."id_evaluacion")))));



CREATE POLICY "imagenes_select_own" ON "public"."imagenes_resolucion_intento" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."intentos_evaluacion" "i"
  WHERE (("i"."id_intento" = "imagenes_resolucion_intento"."id_intento") AND ("i"."id_usuario" = "public"."current_id_usuario"())))));



ALTER TABLE "public"."inscripciones" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inscripciones_delete_admin" ON "public"."inscripciones" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."cursos" "c"
  WHERE (("c"."id_curso" = "inscripciones"."id_curso") AND "public"."has_cursillo_role"("c"."id_cursillo", 'ADMINISTRADOR'::"text")))));



CREATE POLICY "inscripciones_delete_own" ON "public"."inscripciones" FOR DELETE USING (("id_usuario" = "public"."current_id_usuario"()));



CREATE POLICY "inscripciones_insert" ON "public"."inscripciones" FOR INSERT WITH CHECK ((("id_usuario" = "public"."current_id_usuario"()) AND (EXISTS ( SELECT 1
   FROM ("public"."cursos" "c"
     LEFT JOIN "public"."grupos_cursos" "gc" ON (("gc"."id_grupo_curso" = "c"."id_grupo_curso")))
  WHERE (("c"."id_curso" = "inscripciones"."id_curso") AND ("c"."es_publicado" = true) AND ("c"."requiere_password" = false) AND (COALESCE("gc"."requiere_password", false) = false))))));



CREATE POLICY "inscripciones_select_admin_docente" ON "public"."inscripciones" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."cursos" "c"
  WHERE (("c"."id_curso" = "inscripciones"."id_curso") AND ("public"."has_cursillo_role"("c"."id_cursillo", 'ADMINISTRADOR'::"text") OR "public"."has_cursillo_role"("c"."id_cursillo", 'DOCENTE'::"text"))))));



CREATE POLICY "inscripciones_select_own" ON "public"."inscripciones" FOR SELECT USING (("id_usuario" = "public"."current_id_usuario"()));



ALTER TABLE "public"."intentos_evaluacion" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "intentos_insert_own" ON "public"."intentos_evaluacion" FOR INSERT WITH CHECK ((("id_usuario" = "public"."current_id_usuario"()) AND "public"."is_enrolled_in_evaluacion_course"("id_evaluacion")));



CREATE POLICY "intentos_select_admin_docente" ON "public"."intentos_evaluacion" FOR SELECT USING ("public"."can_manage_evaluacion"("id_evaluacion"));



CREATE POLICY "intentos_select_own" ON "public"."intentos_evaluacion" FOR SELECT USING (("id_usuario" = "public"."current_id_usuario"()));



CREATE POLICY "intentos_update" ON "public"."intentos_evaluacion" FOR UPDATE USING (((("id_usuario" = "public"."current_id_usuario"()) AND (("estado")::"text" = 'EN_PROGRESO'::"text")) OR "public"."can_manage_evaluacion"("id_evaluacion"))) WITH CHECK ((("id_usuario" = "public"."current_id_usuario"()) OR "public"."can_manage_evaluacion"("id_evaluacion")));



ALTER TABLE "public"."lecciones" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lecciones_delete" ON "public"."lecciones" FOR DELETE USING ("public"."can_manage_leccion"("id_leccion"));



CREATE POLICY "lecciones_insert" ON "public"."lecciones" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."modulos" "m"
     JOIN "public"."cursos" "c" ON (("c"."id_curso" = "m"."id_curso")))
  WHERE (("m"."id_modulo" = "lecciones"."id_modulo") AND "public"."can_manage_curso"("c"."id_curso")))));



CREATE POLICY "lecciones_select" ON "public"."lecciones" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."modulos" "m"
     JOIN "public"."cursos" "c" ON (("c"."id_curso" = "m"."id_curso")))
  WHERE (("m"."id_modulo" = "lecciones"."id_modulo") AND (("c"."es_publicado" = true) OR "public"."has_cursillo_role"("c"."id_cursillo", 'ADMINISTRADOR'::"text") OR "public"."has_cursillo_role"("c"."id_cursillo", 'DOCENTE'::"text"))))));



CREATE POLICY "lecciones_update" ON "public"."lecciones" FOR UPDATE USING ("public"."can_manage_leccion"("id_leccion"));



ALTER TABLE "public"."modulos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "modulos_delete" ON "public"."modulos" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."cursos" "c"
  WHERE (("c"."id_curso" = "modulos"."id_curso") AND "public"."can_manage_curso"("c"."id_curso")))));



CREATE POLICY "modulos_insert" ON "public"."modulos" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."cursos" "c"
  WHERE (("c"."id_curso" = "modulos"."id_curso") AND "public"."can_manage_curso"("c"."id_curso")))));



CREATE POLICY "modulos_select" ON "public"."modulos" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."cursos" "c"
  WHERE ("c"."id_curso" = "modulos"."id_curso"))));



CREATE POLICY "modulos_update" ON "public"."modulos" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."cursos" "c"
  WHERE (("c"."id_curso" = "modulos"."id_curso") AND "public"."can_manage_curso"("c"."id_curso")))));



ALTER TABLE "public"."notificaciones" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notificaciones_select_own" ON "public"."notificaciones" FOR SELECT USING (("id_usuario" = "public"."current_id_usuario"()));



CREATE POLICY "notificaciones_update_own" ON "public"."notificaciones" FOR UPDATE USING (("id_usuario" = "public"."current_id_usuario"())) WITH CHECK (("id_usuario" = "public"."current_id_usuario"()));



CREATE POLICY "opciones_delete" ON "public"."opciones_pregunta" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."preguntas_evaluacion" "p"
  WHERE (("p"."id_pregunta" = "opciones_pregunta"."id_pregunta") AND "public"."can_manage_evaluacion"("p"."id_evaluacion")))));



CREATE POLICY "opciones_insert" ON "public"."opciones_pregunta" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."preguntas_evaluacion" "p"
  WHERE (("p"."id_pregunta" = "opciones_pregunta"."id_pregunta") AND "public"."can_manage_evaluacion"("p"."id_evaluacion")))));



ALTER TABLE "public"."opciones_pregunta" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "opciones_select_admin_docente" ON "public"."opciones_pregunta" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."preguntas_evaluacion" "p"
  WHERE (("p"."id_pregunta" = "opciones_pregunta"."id_pregunta") AND "public"."can_manage_evaluacion"("p"."id_evaluacion")))));



CREATE POLICY "opciones_select_enrolled" ON "public"."opciones_pregunta" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."preguntas_evaluacion" "p"
  WHERE (("p"."id_pregunta" = "opciones_pregunta"."id_pregunta") AND "public"."is_enrolled_in_evaluacion_course"("p"."id_evaluacion")))));



CREATE POLICY "opciones_update" ON "public"."opciones_pregunta" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."preguntas_evaluacion" "p"
  WHERE (("p"."id_pregunta" = "opciones_pregunta"."id_pregunta") AND "public"."can_manage_evaluacion"("p"."id_evaluacion")))));



ALTER TABLE "public"."password_reset_codes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "preguntas_delete" ON "public"."preguntas_evaluacion" FOR DELETE USING ("public"."can_manage_evaluacion"("id_evaluacion"));



ALTER TABLE "public"."preguntas_evaluacion" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "preguntas_insert" ON "public"."preguntas_evaluacion" FOR INSERT WITH CHECK ("public"."can_manage_evaluacion"("id_evaluacion"));



CREATE POLICY "preguntas_select_admin_docente" ON "public"."preguntas_evaluacion" FOR SELECT USING ("public"."can_manage_evaluacion"("id_evaluacion"));



CREATE POLICY "preguntas_select_enrolled" ON "public"."preguntas_evaluacion" FOR SELECT USING ("public"."is_enrolled_in_evaluacion_course"("id_evaluacion"));



CREATE POLICY "preguntas_update" ON "public"."preguntas_evaluacion" FOR UPDATE USING ("public"."can_manage_evaluacion"("id_evaluacion"));



CREATE POLICY "progreso_delete_own" ON "public"."progreso_lecciones" FOR DELETE USING (("id_usuario" = "public"."current_id_usuario"()));



CREATE POLICY "progreso_insert_own" ON "public"."progreso_lecciones" FOR INSERT WITH CHECK ((("id_usuario" = "public"."current_id_usuario"()) AND (EXISTS ( SELECT 1
   FROM ((("public"."lecciones" "l"
     JOIN "public"."modulos" "m" ON (("m"."id_modulo" = "l"."id_modulo")))
     JOIN "public"."cursos" "c" ON (("c"."id_curso" = "m"."id_curso")))
     JOIN "public"."inscripciones" "i" ON (("i"."id_curso" = "c"."id_curso")))
  WHERE (("l"."id_leccion" = "progreso_lecciones"."id_leccion") AND ("i"."id_usuario" = "public"."current_id_usuario"()) AND ("c"."es_publicado" = true))))));



ALTER TABLE "public"."progreso_lecciones" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "progreso_select_admin_docente" ON "public"."progreso_lecciones" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."lecciones" "l"
     JOIN "public"."modulos" "m" ON (("m"."id_modulo" = "l"."id_modulo")))
     JOIN "public"."cursos" "c" ON (("c"."id_curso" = "m"."id_curso")))
  WHERE (("l"."id_leccion" = "progreso_lecciones"."id_leccion") AND ("public"."has_cursillo_role"("c"."id_cursillo", 'ADMINISTRADOR'::"text") OR "public"."has_cursillo_role"("c"."id_cursillo", 'DOCENTE'::"text"))))));



CREATE POLICY "progreso_select_own" ON "public"."progreso_lecciones" FOR SELECT USING (("id_usuario" = "public"."current_id_usuario"()));



CREATE POLICY "progreso_update_own" ON "public"."progreso_lecciones" FOR UPDATE USING (("id_usuario" = "public"."current_id_usuario"())) WITH CHECK (("id_usuario" = "public"."current_id_usuario"()));



ALTER TABLE "public"."reclamos_evaluacion" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reclamos_select_admin_docente" ON "public"."reclamos_evaluacion" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."intentos_evaluacion" "i"
  WHERE (("i"."id_intento" = "reclamos_evaluacion"."id_intento") AND "public"."can_manage_evaluacion"("i"."id_evaluacion")))));



CREATE POLICY "reclamos_select_own" ON "public"."reclamos_evaluacion" FOR SELECT USING (("id_estudiante" = "public"."current_id_usuario"()));



CREATE POLICY "reclamos_update_admin_docente" ON "public"."reclamos_evaluacion" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."intentos_evaluacion" "i"
  WHERE (("i"."id_intento" = "reclamos_evaluacion"."id_intento") AND "public"."can_manage_evaluacion"("i"."id_evaluacion")))));



CREATE POLICY "respuestas_insert_own" ON "public"."respuestas_intento" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."intentos_evaluacion" "i"
  WHERE (("i"."id_intento" = "respuestas_intento"."id_intento") AND ("i"."id_usuario" = "public"."current_id_usuario"()) AND (("i"."estado")::"text" = 'EN_PROGRESO'::"text")))));



ALTER TABLE "public"."respuestas_intento" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "respuestas_select_admin_docente" ON "public"."respuestas_intento" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."intentos_evaluacion" "i"
  WHERE (("i"."id_intento" = "respuestas_intento"."id_intento") AND "public"."can_manage_evaluacion"("i"."id_evaluacion")))));



CREATE POLICY "respuestas_select_own" ON "public"."respuestas_intento" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."intentos_evaluacion" "i"
  WHERE (("i"."id_intento" = "respuestas_intento"."id_intento") AND ("i"."id_usuario" = "public"."current_id_usuario"())))));



CREATE POLICY "respuestas_update" ON "public"."respuestas_intento" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."intentos_evaluacion" "i"
  WHERE (("i"."id_intento" = "respuestas_intento"."id_intento") AND ((("i"."id_usuario" = "public"."current_id_usuario"()) AND (("i"."estado")::"text" = 'EN_PROGRESO'::"text")) OR "public"."can_manage_evaluacion"("i"."id_evaluacion"))))));



CREATE POLICY "retroalimentacion_delete" ON "public"."retroalimentacion_intento" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."intentos_evaluacion" "i"
  WHERE (("i"."id_intento" = "retroalimentacion_intento"."id_intento") AND "public"."can_manage_evaluacion"("i"."id_evaluacion")))));



CREATE POLICY "retroalimentacion_insert" ON "public"."retroalimentacion_intento" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (((("public"."intentos_evaluacion" "i"
     JOIN "public"."evaluaciones" "ev" ON (("ev"."id_evaluacion" = "i"."id_evaluacion")))
     JOIN "public"."lecciones" "l" ON (("l"."id_leccion" = "ev"."id_leccion")))
     JOIN "public"."modulos" "m" ON (("m"."id_modulo" = "l"."id_modulo")))
     JOIN "public"."cursos" "c" ON (("c"."id_curso" = "m"."id_curso")))
  WHERE (("i"."id_intento" = "retroalimentacion_intento"."id_intento") AND ("public"."has_cursillo_role"("c"."id_cursillo", 'ADMINISTRADOR'::"text") OR ("c"."id_docente" = "public"."current_id_usuario"()))))));



ALTER TABLE "public"."retroalimentacion_intento" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "retroalimentacion_select_admin_docente" ON "public"."retroalimentacion_intento" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."intentos_evaluacion" "i"
  WHERE (("i"."id_intento" = "retroalimentacion_intento"."id_intento") AND "public"."can_manage_evaluacion"("i"."id_evaluacion")))));



CREATE POLICY "retroalimentacion_select_own" ON "public"."retroalimentacion_intento" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."intentos_evaluacion" "i"
  WHERE (("i"."id_intento" = "retroalimentacion_intento"."id_intento") AND ("i"."id_usuario" = "public"."current_id_usuario"())))));



CREATE POLICY "retroalimentacion_update" ON "public"."retroalimentacion_intento" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."intentos_evaluacion" "i"
  WHERE (("i"."id_intento" = "retroalimentacion_intento"."id_intento") AND "public"."can_manage_evaluacion"("i"."id_evaluacion")))));



ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "roles_select_authenticated" ON "public"."roles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "soporte_insert_own" ON "public"."soporte_solicitudes" FOR INSERT TO "authenticated" WITH CHECK ((("id_usuario" = "public"."current_id_usuario"()) AND "public"."is_cursillo_member_activo"("id_cursillo")));



CREATE POLICY "soporte_select_admin" ON "public"."soporte_solicitudes" FOR SELECT TO "authenticated" USING ("public"."has_cursillo_role"("id_cursillo", 'ADMINISTRADOR'::"text"));



CREATE POLICY "soporte_select_own" ON "public"."soporte_solicitudes" FOR SELECT TO "authenticated" USING (("id_usuario" = "public"."current_id_usuario"()));



ALTER TABLE "public"."soporte_solicitudes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "soporte_update_admin" ON "public"."soporte_solicitudes" FOR UPDATE TO "authenticated" USING ("public"."has_cursillo_role"("id_cursillo", 'ADMINISTRADOR'::"text")) WITH CHECK ("public"."has_cursillo_role"("id_cursillo", 'ADMINISTRADOR'::"text"));



ALTER TABLE "public"."tareas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tareas_delete" ON "public"."tareas" FOR DELETE USING ("public"."can_manage_tarea"("id_tarea"));



CREATE POLICY "tareas_insert" ON "public"."tareas" FOR INSERT WITH CHECK ("public"."can_manage_leccion"("id_leccion"));



CREATE POLICY "tareas_select_admin_docente" ON "public"."tareas" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."lecciones" "l"
     JOIN "public"."modulos" "m" ON (("m"."id_modulo" = "l"."id_modulo")))
     JOIN "public"."cursos" "c" ON (("c"."id_curso" = "m"."id_curso")))
  WHERE (("l"."id_leccion" = "tareas"."id_leccion") AND ("public"."has_cursillo_role"("c"."id_cursillo", 'ADMINISTRADOR'::"text") OR "public"."has_cursillo_role"("c"."id_cursillo", 'DOCENTE'::"text"))))));



CREATE POLICY "tareas_select_enrolled" ON "public"."tareas" FOR SELECT USING ("public"."is_enrolled_in_tarea_course"("id_tarea"));



CREATE POLICY "tareas_update" ON "public"."tareas" FOR UPDATE USING ("public"."can_manage_tarea"("id_tarea"));



ALTER TABLE "public"."usuarios" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "usuarios_actualiza_su_perfil" ON "public"."usuarios" FOR UPDATE USING (("id_auth" = "auth"."uid"()));



ALTER TABLE "public"."usuarios_cursillos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "usuarios_cursillos_select_own" ON "public"."usuarios_cursillos" FOR SELECT TO "authenticated" USING (("id_usuario" IN ( SELECT "usuarios"."id_usuario"
   FROM "public"."usuarios"
  WHERE ("usuarios"."id_auth" = "auth"."uid"()))));



CREATE POLICY "usuarios_cursillos_update_admin" ON "public"."usuarios_cursillos" FOR UPDATE USING ("public"."has_cursillo_role"("id_cursillo", 'ADMINISTRADOR'::"text")) WITH CHECK ("public"."has_cursillo_role"("id_cursillo", 'ADMINISTRADOR'::"text"));



CREATE POLICY "usuarios_select_admin_docente" ON "public"."usuarios" FOR SELECT USING ("public"."is_admin_or_docente"());



CREATE POLICY "usuarios_select_own" ON "public"."usuarios" FOR SELECT TO "authenticated" USING (("id_auth" = "auth"."uid"()));



CREATE POLICY "usuarios_solo_su_perfil" ON "public"."usuarios" FOR SELECT USING (("id_auth" = "auth"."uid"()));



CREATE POLICY "usuarios_update_own" ON "public"."usuarios" FOR UPDATE TO "authenticated" USING (("id_auth" = "auth"."uid"())) WITH CHECK (("id_auth" = "auth"."uid"()));



CREATE POLICY "ver_roles_propios" ON "public"."usuarios_cursillos" FOR SELECT USING (("id_usuario" IN ( SELECT "usuarios"."id_usuario"
   FROM "public"."usuarios"
  WHERE ("usuarios"."id_auth" = "auth"."uid"()))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."anuncios";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notificaciones";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."apply_signup_contact_metadata"() TO "anon";
GRANT ALL ON FUNCTION "public"."apply_signup_contact_metadata"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_signup_contact_metadata"() TO "service_role";



GRANT ALL ON FUNCTION "public"."can_admin_or_own_curso"("p_curso_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_admin_or_own_curso"("p_curso_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_admin_or_own_curso"("p_curso_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_manage_curso"("p_curso_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_manage_curso"("p_curso_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_curso"("p_curso_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_manage_evaluacion"("p_evaluacion_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_manage_evaluacion"("p_evaluacion_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_evaluacion"("p_evaluacion_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_manage_leccion"("p_leccion_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_manage_leccion"("p_leccion_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_leccion"("p_leccion_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_manage_tarea"("p_tarea_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_manage_tarea"("p_tarea_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_tarea"("p_tarea_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_read_soporte_evidencia"("p_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."can_read_soporte_evidencia"("p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_read_soporte_evidencia"("p_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_view_curso"("p_id_curso" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_view_curso"("p_id_curso" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_view_curso"("p_id_curso" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_view_leccion"("p_id_leccion" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_view_leccion"("p_id_leccion" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_view_leccion"("p_id_leccion" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_write_soporte_evidencia"("p_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."can_write_soporte_evidencia"("p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_write_soporte_evidencia"("p_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."current_id_usuario"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_id_usuario"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_id_usuario"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_crear_usuario_desde_auth"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_crear_usuario_desde_auth"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_crear_usuario_desde_auth"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_usuario_cursillo"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_usuario_cursillo"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_usuario_cursillo"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_cursillo_role"("p_cursillo" "uuid", "p_nombre_rol" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_cursillo_role"("p_cursillo" "uuid", "p_nombre_rol" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_cursillo_role"("p_cursillo" "uuid", "p_nombre_rol" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin_or_docente"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_or_docente"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_or_docente"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_cursillo_member_activo"("p_cursillo_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_cursillo_member_activo"("p_cursillo_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_cursillo_member_activo"("p_cursillo_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_curso_docente"("p_curso_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_curso_docente"("p_curso_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_curso_docente"("p_curso_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_enrolled_in_evaluacion_course"("p_evaluacion_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_enrolled_in_evaluacion_course"("p_evaluacion_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_enrolled_in_evaluacion_course"("p_evaluacion_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_enrolled_in_tarea_course"("p_tarea_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_enrolled_in_tarea_course"("p_tarea_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_enrolled_in_tarea_course"("p_tarea_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_usuario_docente_activo_en_cursillo"("p_id_usuario" "uuid", "p_id_cursillo" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_usuario_docente_activo_en_cursillo"("p_id_usuario" "uuid", "p_id_cursillo" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_usuario_docente_activo_en_cursillo"("p_id_usuario" "uuid", "p_id_cursillo" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_usuario_staff_activo_en_cursillo"("p_id_usuario" "uuid", "p_id_cursillo" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_usuario_staff_activo_en_cursillo"("p_id_usuario" "uuid", "p_id_cursillo" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_usuario_staff_activo_en_cursillo"("p_id_usuario" "uuid", "p_id_cursillo" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_admins_new_pending_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_admins_new_pending_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_admins_new_pending_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_user_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_user_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_user_status_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."row_is_estudiante"("p_target_id_usuario" "uuid", "p_cursillo" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."row_is_estudiante"("p_target_id_usuario" "uuid", "p_cursillo" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."row_is_estudiante"("p_target_id_usuario" "uuid", "p_cursillo" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_asignar_rol_usuario"("p_id_usuario" "uuid", "p_id_cursillo" "uuid", "p_id_rol" smallint) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_asignar_rol_usuario"("p_id_usuario" "uuid", "p_id_cursillo" "uuid", "p_id_rol" smallint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_asignar_rol_usuario"("p_id_usuario" "uuid", "p_id_cursillo" "uuid", "p_id_rol" smallint) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_dashboard_entregas_por_calificar"() TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_dashboard_entregas_por_calificar"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_dashboard_entregas_por_calificar"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_dashboard_entregas_por_calificar"("p_id_cursillo" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_dashboard_entregas_por_calificar"("p_id_cursillo" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_dashboard_entregas_por_calificar"("p_id_cursillo" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_dashboard_estudiante"("p_id_usuario" "uuid", "p_id_cursillo" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_dashboard_estudiante"("p_id_usuario" "uuid", "p_id_cursillo" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_dashboard_estudiante"("p_id_usuario" "uuid", "p_id_cursillo" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_dashboard_staff"("p_id_cursillo" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_dashboard_staff"("p_id_cursillo" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_dashboard_staff"("p_id_cursillo" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_dashboard_tareas_pendientes"("p_id_usuario" "uuid", "p_id_cursillo" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_dashboard_tareas_pendientes"("p_id_usuario" "uuid", "p_id_cursillo" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_dashboard_tareas_pendientes"("p_id_usuario" "uuid", "p_id_cursillo" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_enviar_reclamo_evaluacion"("p_id_respuesta" "uuid", "p_justificacion" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_enviar_reclamo_evaluacion"("p_id_respuesta" "uuid", "p_justificacion" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_enviar_reclamo_evaluacion"("p_id_respuesta" "uuid", "p_justificacion" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_cursillo_stats"("p_id_cursillo" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_cursillo_stats"("p_id_cursillo" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_cursillo_stats"("p_id_cursillo" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_curso_docentes_publicos"("p_id_curso" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_curso_docentes_publicos"("p_id_curso" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_curso_docentes_publicos"("p_id_curso" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_cursos_reporte"() TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_cursos_reporte"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_cursos_reporte"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_cursos_reporte"("p_id_cursillo" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_cursos_reporte"("p_id_cursillo" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_cursos_reporte"("p_id_cursillo" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_inscribirse_curso"("p_id_curso" "uuid", "p_password" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_inscribirse_curso"("p_id_curso" "uuid", "p_password" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_inscribirse_curso"("p_id_curso" "uuid", "p_password" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_list_all_inscripciones"("p_id_cursillo" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_list_all_inscripciones"("p_id_cursillo" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_list_all_inscripciones"("p_id_cursillo" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_list_comentarios_leccion_publicos"("p_id_leccion" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_list_comentarios_leccion_publicos"("p_id_leccion" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_list_comentarios_leccion_publicos"("p_id_leccion" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_list_grupos_cursos"("p_id_cursillo" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_list_grupos_cursos"("p_id_cursillo" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_list_grupos_cursos"("p_id_cursillo" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_list_inscritos_curso"("p_id_curso" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_list_inscritos_curso"("p_id_curso" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_list_inscritos_curso"("p_id_curso" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_list_usuarios_cursillo"("p_id_cursillo" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_list_usuarios_cursillo"("p_id_cursillo" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_list_usuarios_cursillo"("p_id_cursillo" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_reporte_participacion_curso"("p_id_curso" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_reporte_participacion_curso"("p_id_curso" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_reporte_participacion_curso"("p_id_curso" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_reporte_progreso_estudiante"("p_id_curso" "uuid", "p_id_usuario" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_reporte_progreso_estudiante"("p_id_curso" "uuid", "p_id_usuario" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_reporte_progreso_estudiante"("p_id_curso" "uuid", "p_id_usuario" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_resolver_reclamo_evaluacion"("p_id_intento" "uuid", "p_respuesta_docente" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_resolver_reclamo_evaluacion"("p_id_intento" "uuid", "p_respuesta_docente" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_resolver_reclamo_evaluacion"("p_id_intento" "uuid", "p_respuesta_docente" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_set_curso_colaboradores"("p_id_curso" "uuid", "p_docente_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_set_curso_colaboradores"("p_id_curso" "uuid", "p_docente_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_set_curso_colaboradores"("p_id_curso" "uuid", "p_docente_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_set_curso_password"("p_id_curso" "uuid", "p_requiere_password" boolean, "p_password" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_set_curso_password"("p_id_curso" "uuid", "p_requiere_password" boolean, "p_password" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_set_curso_password"("p_id_curso" "uuid", "p_requiere_password" boolean, "p_password" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_set_estado_usuario_cursillo"("p_id_cursillo" "uuid", "p_id_usuario" "uuid", "p_estado" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_set_estado_usuario_cursillo"("p_id_cursillo" "uuid", "p_id_usuario" "uuid", "p_estado" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_set_estado_usuario_cursillo"("p_id_cursillo" "uuid", "p_id_usuario" "uuid", "p_estado" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_set_estado_usuario_cursillo"("p_id_cursillo" "uuid", "p_id_usuario" "uuid", "p_estado" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_set_grupo_curso_password"("p_id_grupo_curso" "uuid", "p_requiere_password" boolean, "p_password" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_set_grupo_curso_password"("p_id_grupo_curso" "uuid", "p_requiere_password" boolean, "p_password" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_set_grupo_curso_password"("p_id_grupo_curso" "uuid", "p_requiere_password" boolean, "p_password" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_submit_intento"("p_id_intento" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_submit_intento"("p_id_intento" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_submit_intento"("p_id_intento" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_prevent_direct_password_hash_write"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_prevent_direct_password_hash_write"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_prevent_direct_password_hash_write"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_prevent_entregas_tampering"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_prevent_entregas_tampering"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_prevent_entregas_tampering"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_prevent_intentos_tampering"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_prevent_intentos_tampering"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_prevent_intentos_tampering"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_set_auditoria_campos"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_set_auditoria_campos"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_set_auditoria_campos"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_validate_curso_docente_colaborador"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_validate_curso_docente_colaborador"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_validate_curso_docente_colaborador"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_validate_curso_grupo_cursillo"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_validate_curso_grupo_cursillo"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_validate_curso_grupo_cursillo"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_validate_curso_owner"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_validate_curso_owner"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_validate_curso_owner"() TO "service_role";


















GRANT ALL ON TABLE "public"."adjuntos_leccion" TO "anon";
GRANT ALL ON TABLE "public"."adjuntos_leccion" TO "authenticated";
GRANT ALL ON TABLE "public"."adjuntos_leccion" TO "service_role";



GRANT ALL ON TABLE "public"."anuncios" TO "anon";
GRANT ALL ON TABLE "public"."anuncios" TO "authenticated";
GRANT ALL ON TABLE "public"."anuncios" TO "service_role";



GRANT ALL ON TABLE "public"."archivos_entregas_tareas" TO "anon";
GRANT ALL ON TABLE "public"."archivos_entregas_tareas" TO "authenticated";
GRANT ALL ON TABLE "public"."archivos_entregas_tareas" TO "service_role";



GRANT ALL ON TABLE "public"."certificados_curso" TO "anon";
GRANT ALL ON TABLE "public"."certificados_curso" TO "authenticated";
GRANT ALL ON TABLE "public"."certificados_curso" TO "service_role";



GRANT ALL ON TABLE "public"."comentarios_leccion" TO "anon";
GRANT ALL ON TABLE "public"."comentarios_leccion" TO "authenticated";
GRANT ALL ON TABLE "public"."comentarios_leccion" TO "service_role";



GRANT ALL ON TABLE "public"."cursillos" TO "anon";
GRANT ALL ON TABLE "public"."cursillos" TO "authenticated";
GRANT ALL ON TABLE "public"."cursillos" TO "service_role";



GRANT ALL ON TABLE "public"."curso_docentes_colaboradores" TO "anon";
GRANT ALL ON TABLE "public"."curso_docentes_colaboradores" TO "authenticated";
GRANT ALL ON TABLE "public"."curso_docentes_colaboradores" TO "service_role";



GRANT ALL ON TABLE "public"."cursos" TO "anon";
GRANT ALL ON TABLE "public"."cursos" TO "authenticated";
GRANT ALL ON TABLE "public"."cursos" TO "service_role";



GRANT ALL ON TABLE "public"."entregas_tareas" TO "anon";
GRANT ALL ON TABLE "public"."entregas_tareas" TO "authenticated";
GRANT ALL ON TABLE "public"."entregas_tareas" TO "service_role";



GRANT ALL ON TABLE "public"."evaluaciones" TO "anon";
GRANT ALL ON TABLE "public"."evaluaciones" TO "authenticated";
GRANT ALL ON TABLE "public"."evaluaciones" TO "service_role";



GRANT ALL ON TABLE "public"."grupos_cursos" TO "anon";
GRANT ALL ON TABLE "public"."grupos_cursos" TO "authenticated";
GRANT ALL ON TABLE "public"."grupos_cursos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."grupos_cursos_orden_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."grupos_cursos_orden_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."grupos_cursos_orden_seq" TO "service_role";



GRANT ALL ON TABLE "public"."imagenes_resolucion_intento" TO "anon";
GRANT ALL ON TABLE "public"."imagenes_resolucion_intento" TO "authenticated";
GRANT ALL ON TABLE "public"."imagenes_resolucion_intento" TO "service_role";



GRANT ALL ON TABLE "public"."inscripciones" TO "anon";
GRANT ALL ON TABLE "public"."inscripciones" TO "authenticated";
GRANT ALL ON TABLE "public"."inscripciones" TO "service_role";



GRANT ALL ON TABLE "public"."intentos_evaluacion" TO "anon";
GRANT ALL ON TABLE "public"."intentos_evaluacion" TO "authenticated";
GRANT ALL ON TABLE "public"."intentos_evaluacion" TO "service_role";



GRANT ALL ON TABLE "public"."lecciones" TO "anon";
GRANT ALL ON TABLE "public"."lecciones" TO "authenticated";
GRANT ALL ON TABLE "public"."lecciones" TO "service_role";



GRANT ALL ON TABLE "public"."modulos" TO "anon";
GRANT ALL ON TABLE "public"."modulos" TO "authenticated";
GRANT ALL ON TABLE "public"."modulos" TO "service_role";



GRANT ALL ON TABLE "public"."notificaciones" TO "anon";
GRANT ALL ON TABLE "public"."notificaciones" TO "authenticated";
GRANT ALL ON TABLE "public"."notificaciones" TO "service_role";



GRANT ALL ON TABLE "public"."opciones_pregunta" TO "anon";
GRANT ALL ON TABLE "public"."opciones_pregunta" TO "authenticated";
GRANT ALL ON TABLE "public"."opciones_pregunta" TO "service_role";



GRANT ALL ON TABLE "public"."opciones_pregunta_estudiante" TO "anon";
GRANT ALL ON TABLE "public"."opciones_pregunta_estudiante" TO "authenticated";
GRANT ALL ON TABLE "public"."opciones_pregunta_estudiante" TO "service_role";



GRANT ALL ON TABLE "public"."password_reset_codes" TO "service_role";



GRANT ALL ON TABLE "public"."preguntas_evaluacion" TO "anon";
GRANT ALL ON TABLE "public"."preguntas_evaluacion" TO "authenticated";
GRANT ALL ON TABLE "public"."preguntas_evaluacion" TO "service_role";



GRANT ALL ON TABLE "public"."progreso_lecciones" TO "anon";
GRANT ALL ON TABLE "public"."progreso_lecciones" TO "authenticated";
GRANT ALL ON TABLE "public"."progreso_lecciones" TO "service_role";



GRANT ALL ON TABLE "public"."reclamos_evaluacion" TO "anon";
GRANT ALL ON TABLE "public"."reclamos_evaluacion" TO "authenticated";
GRANT ALL ON TABLE "public"."reclamos_evaluacion" TO "service_role";



GRANT ALL ON TABLE "public"."respuestas_intento" TO "anon";
GRANT ALL ON TABLE "public"."respuestas_intento" TO "authenticated";
GRANT ALL ON TABLE "public"."respuestas_intento" TO "service_role";



GRANT ALL ON TABLE "public"."retroalimentacion_intento" TO "anon";
GRANT ALL ON TABLE "public"."retroalimentacion_intento" TO "authenticated";
GRANT ALL ON TABLE "public"."retroalimentacion_intento" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON TABLE "public"."soporte_solicitudes" TO "anon";
GRANT ALL ON TABLE "public"."soporte_solicitudes" TO "authenticated";
GRANT ALL ON TABLE "public"."soporte_solicitudes" TO "service_role";



GRANT ALL ON TABLE "public"."tareas" TO "anon";
GRANT ALL ON TABLE "public"."tareas" TO "authenticated";
GRANT ALL ON TABLE "public"."tareas" TO "service_role";



GRANT ALL ON TABLE "public"."usuarios" TO "anon";
GRANT ALL ON TABLE "public"."usuarios" TO "authenticated";
GRANT ALL ON TABLE "public"."usuarios" TO "service_role";



GRANT ALL ON TABLE "public"."usuarios_cursillos" TO "anon";
GRANT ALL ON TABLE "public"."usuarios_cursillos" TO "authenticated";
GRANT ALL ON TABLE "public"."usuarios_cursillos" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































