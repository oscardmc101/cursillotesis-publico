-- =====================================================
-- AUDITORIA GENERAL DE TABLAS PUBLICAS
-- Agrega campos de auditoria y un trigger reutilizable
-- para INSERT/UPDATE sin depender del frontend.
-- =====================================================

CREATE OR REPLACE FUNCTION public.trg_set_auditoria_campos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_uid uuid;
BEGIN
  v_auth_uid := auth.uid();

  IF TG_OP = 'INSERT' THEN
    NEW.fec_insercion := now();
    NEW.usu_insercion := COALESCE(v_auth_uid, NEW.usu_insercion);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.fec_insercion := OLD.fec_insercion;
    NEW.usu_insercion := OLD.usu_insercion;
    NEW.fec_modificacion := now();
    NEW.usu_modificacion := COALESCE(v_auth_uid, NEW.usu_modificacion, OLD.usu_modificacion);
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_set_auditoria_campos() IS
  'Completa fec_insercion/usu_insercion en INSERT y fec_modificacion/usu_modificacion en UPDATE usando auth.uid() cuando existe.';

DO $$
DECLARE
  v_table text;
  v_tables text[] := ARRAY[
    'adjuntos_leccion',
    'anuncios',
    'archivos_entregas_tareas',
    'certificados_curso',
    'comentarios_leccion',
    'cursillos',
    'cursos',
    'entregas_tareas',
    'evaluaciones',
    'imagenes_resolucion_intento',
    'inscripciones',
    'intentos_evaluacion',
    'lecciones',
    'modulos',
    'notificaciones',
    'opciones_pregunta',
    'password_reset_codes',
    'preguntas_evaluacion',
    'progreso_lecciones',
    'respuestas_intento',
    'retroalimentacion_intento',
    'roles',
    'tareas',
    'usuarios',
    'usuarios_cursillos'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    EXECUTE format('ALTER TABLE IF EXISTS public.%I ADD COLUMN IF NOT EXISTS fec_insercion timestamptz', v_table);
    EXECUTE format('ALTER TABLE IF EXISTS public.%I ADD COLUMN IF NOT EXISTS usu_insercion uuid', v_table);
    EXECUTE format('ALTER TABLE IF EXISTS public.%I ADD COLUMN IF NOT EXISTS fec_modificacion timestamptz', v_table);
    EXECUTE format('ALTER TABLE IF EXISTS public.%I ADD COLUMN IF NOT EXISTS usu_modificacion uuid', v_table);
  END LOOP;
END;
$$;

-- Backfill conservador: solo fechas de insercion. Los usuarios historicos
-- quedan NULL porque no hay una fuente confiable comun para inferir el actor.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT *
    FROM (VALUES
      ('adjuntos_leccion', 'fecha_subida'),
      ('anuncios', 'fecha_publicacion'),
      ('archivos_entregas_tareas', 'fecha_subida'),
      ('certificados_curso', 'fecha_creacion'),
      ('comentarios_leccion', 'fecha_comentario'),
      ('cursillos', 'fecha_creacion'),
      ('cursos', 'fecha_creacion'),
      ('entregas_tareas', 'fecha_entrega'),
      ('evaluaciones', 'fecha_creacion'),
      ('imagenes_resolucion_intento', 'fecha_subida'),
      ('inscripciones', 'fecha_inscripcion'),
      ('intentos_evaluacion', 'fecha_inicio'),
      ('lecciones', NULL),
      ('modulos', NULL),
      ('notificaciones', 'fecha_envio'),
      ('opciones_pregunta', NULL),
      ('password_reset_codes', 'created_at'),
      ('preguntas_evaluacion', NULL),
      ('progreso_lecciones', 'fecha_completado'),
      ('respuestas_intento', NULL),
      ('retroalimentacion_intento', 'fecha_retro'),
      ('roles', NULL),
      ('tareas', 'fecha_creacion'),
      ('usuarios', 'fecha_creacion'),
      ('usuarios_cursillos', 'fecha_asignacion')
    ) AS t(table_name, date_column)
  LOOP
    IF to_regclass(format('public.%I', r.table_name)) IS NULL THEN
      CONTINUE;
    END IF;

    IF r.date_column IS NOT NULL AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = r.table_name
        AND column_name = r.date_column
    ) THEN
      EXECUTE format(
        'UPDATE public.%I SET fec_insercion = COALESCE(fec_insercion, %I, now()) WHERE fec_insercion IS NULL',
        r.table_name,
        r.date_column
      );
    ELSE
      EXECUTE format(
        'UPDATE public.%I SET fec_insercion = COALESCE(fec_insercion, now()) WHERE fec_insercion IS NULL',
        r.table_name
      );
    END IF;
  END LOOP;
END;
$$;

DO $$
DECLARE
  v_table text;
  v_tables text[] := ARRAY[
    'adjuntos_leccion',
    'anuncios',
    'archivos_entregas_tareas',
    'certificados_curso',
    'comentarios_leccion',
    'cursillos',
    'cursos',
    'entregas_tareas',
    'evaluaciones',
    'imagenes_resolucion_intento',
    'inscripciones',
    'intentos_evaluacion',
    'lecciones',
    'modulos',
    'notificaciones',
    'opciones_pregunta',
    'password_reset_codes',
    'preguntas_evaluacion',
    'progreso_lecciones',
    'respuestas_intento',
    'retroalimentacion_intento',
    'roles',
    'tareas',
    'usuarios',
    'usuarios_cursillos'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    IF to_regclass(format('public.%I', v_table)) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format('DROP TRIGGER IF EXISTS set_auditoria_campos ON public.%I', v_table);
    EXECUTE format(
      'CREATE TRIGGER set_auditoria_campos BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.trg_set_auditoria_campos()',
      v_table
    );
  END LOOP;
END;
$$;
