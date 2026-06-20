-- =====================================================
-- MEJORA 4: Agregar verificación de estado ACTIVO a has_cursillo_role
-- =====================================================
-- Esto bloquea a usuarios PENDIENTES y BLOQUEADOS de operar
-- contra la DB a través de cualquier policy que use esta función.
-- Es un cambio central que propaga seguridad a TODAS las policies.
-- =====================================================

-- Redefinir has_cursillo_role para incluir verificación de estado ACTIVO
CREATE OR REPLACE FUNCTION public.has_cursillo_role(
  p_cursillo_id uuid,
  p_role_name text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios_cursillos uc
    JOIN public.roles r ON r.id_rol = uc.id_rol
    WHERE uc.id_cursillo = p_cursillo_id
      AND uc.id_usuario = public.current_id_usuario()
      AND UPPER(TRIM(r.nombre_rol)) = UPPER(TRIM(p_role_name))
      AND uc.estado = 'ACTIVO'  -- ← NUEVO: solo usuarios con estado ACTIVO
  );
$$;

-- Verificación: esta función ahora impide que usuarios PENDIENTES o BLOQUEADOS
-- pasen las RLS policies. No es necesario modificar ninguna policy individual.
-- Tablas afectadas automáticamente: cursos, modulos, lecciones, tareas,
-- evaluaciones, inscripciones, entregas_tareas, anuncios, notificaciones, etc.
