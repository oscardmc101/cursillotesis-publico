ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS telefono_visible boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.apply_signup_contact_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

DROP TRIGGER IF EXISTS zz_apply_signup_contact_metadata ON auth.users;
CREATE TRIGGER zz_apply_signup_contact_metadata
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.apply_signup_contact_metadata();
