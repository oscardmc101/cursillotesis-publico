-- Tabla para almacenar los códigos OTP de recuperación de contraseña
CREATE TABLE IF NOT EXISTS public.password_reset_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  attempts int NOT NULL DEFAULT 0,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índice por email para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_prc_email ON public.password_reset_codes (email);

-- Sin RLS: solo se accede desde Edge Functions con service_role key
-- (No se expone al cliente JS directamente)
ALTER TABLE public.password_reset_codes DISABLE ROW LEVEL SECURITY;
