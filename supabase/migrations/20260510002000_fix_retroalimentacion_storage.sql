-- Ensure the task/evaluation files bucket exists and grant students access to
-- feedback files attached by docentes.

INSERT INTO storage.buckets (id, name, public)
VALUES ('archivos_tareas', 'archivos_tareas', false)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.can_read_archivos_tareas_feedback(p_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parts text[];
  v_folder text;
  v_owner_id uuid;
BEGIN
  v_parts := string_to_array(coalesce(p_name, ''), '/');
  v_folder := v_parts[1];

  IF v_folder = 'retroalimentacion_tareas'
    AND array_length(v_parts, 1) >= 2
    AND v_parts[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  THEN
    v_owner_id := v_parts[2]::uuid;

    RETURN EXISTS (
      SELECT 1
      FROM public.entregas_tareas e
      WHERE e.id_entrega = v_owner_id
        AND (
          e.id_usuario = public.current_id_usuario()
          OR public.can_manage_tarea(e.id_tarea)
        )
    );
  END IF;

  IF v_folder = 'retroalimentacion'
    AND array_length(v_parts, 1) >= 2
    AND v_parts[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  THEN
    v_owner_id := v_parts[2]::uuid;

    RETURN EXISTS (
      SELECT 1
      FROM public.intentos_evaluacion i
      WHERE i.id_intento = v_owner_id
        AND (
          i.id_usuario = public.current_id_usuario()
          OR public.can_manage_evaluacion(i.id_evaluacion)
        )
    );
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_write_archivos_tareas_feedback(p_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parts text[];
  v_folder text;
  v_owner_id uuid;
BEGIN
  v_parts := string_to_array(coalesce(p_name, ''), '/');
  v_folder := v_parts[1];

  IF v_folder = 'retroalimentacion_tareas'
    AND array_length(v_parts, 1) >= 2
    AND v_parts[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  THEN
    v_owner_id := v_parts[2]::uuid;

    RETURN EXISTS (
      SELECT 1
      FROM public.entregas_tareas e
      WHERE e.id_entrega = v_owner_id
        AND public.can_manage_tarea(e.id_tarea)
    );
  END IF;

  IF v_folder = 'retroalimentacion'
    AND array_length(v_parts, 1) >= 2
    AND v_parts[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  THEN
    v_owner_id := v_parts[2]::uuid;

    RETURN EXISTS (
      SELECT 1
      FROM public.intentos_evaluacion i
      WHERE i.id_intento = v_owner_id
        AND public.can_manage_evaluacion(i.id_evaluacion)
    );
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_read_archivos_tareas_feedback(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_write_archivos_tareas_feedback(text) TO authenticated;

DROP POLICY IF EXISTS "archivos_tareas_select_feedback" ON storage.objects;
CREATE POLICY "archivos_tareas_select_feedback"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'archivos_tareas'
  AND public.can_read_archivos_tareas_feedback(name)
);

DROP POLICY IF EXISTS "archivos_tareas_insert_feedback" ON storage.objects;
CREATE POLICY "archivos_tareas_insert_feedback"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'archivos_tareas'
  AND public.can_write_archivos_tareas_feedback(name)
);
