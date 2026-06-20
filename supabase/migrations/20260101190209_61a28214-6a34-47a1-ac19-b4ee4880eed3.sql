-- Add id_creador column to track who published the announcement
ALTER TABLE public.anuncios ADD COLUMN id_creador uuid REFERENCES public.usuarios(id_usuario);

-- Update RLS policy for update to allow creators to edit their own announcements
DROP POLICY IF EXISTS "anuncios_update" ON public.anuncios;
CREATE POLICY "anuncios_update_admin" ON public.anuncios
  FOR UPDATE USING (has_cursillo_role(id_cursillo, 'ADMINISTRADOR'));

CREATE POLICY "anuncios_update_creator" ON public.anuncios
  FOR UPDATE USING (id_creador = current_id_usuario());

-- Update delete policy to allow creators to delete their own
DROP POLICY IF EXISTS "anuncios_delete" ON public.anuncios;
CREATE POLICY "anuncios_delete_admin" ON public.anuncios
  FOR DELETE USING (has_cursillo_role(id_cursillo, 'ADMINISTRADOR'));

CREATE POLICY "anuncios_delete_creator" ON public.anuncios
  FOR DELETE USING (id_creador = current_id_usuario());

-- Enable realtime for anuncios table
ALTER PUBLICATION supabase_realtime ADD TABLE anuncios;