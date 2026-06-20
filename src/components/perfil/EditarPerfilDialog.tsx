import { useState, useRef } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Camera, X } from 'lucide-react';

const perfilSchema = z.object({
  nombres: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/, 'El nombre solo puede contener letras'),
  apellidos: z
    .string()
    .trim()
    .min(2, 'El apellido debe tener al menos 2 caracteres')
    .max(100, 'El apellido no puede exceder 100 caracteres')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/, 'El apellido solo puede contener letras'),
  telefono: z
    .string()
    .trim()
    .max(20, 'El teléfono no puede exceder 20 caracteres')
    .regex(/^[0-9+\-\s()]*$/, 'Formato de teléfono inválido')
    .optional()
    .or(z.literal('')),
  telefono_visible: z.boolean().default(true),
  biografia: z
    .string()
    .trim()
    .max(500, 'La biografía no puede exceder 500 caracteres')
    .optional()
    .or(z.literal('')),
});

type PerfilFormData = z.infer<typeof perfilSchema>;

interface EditarPerfilDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: {
    id_usuario: string;
    nombres: string | null;
    apellidos: string | null;
    telefono: string | null;
    telefono_visible?: boolean | null;
    biografia?: string | null;
    avatar_url?: string | null;
  };
  onSuccess: () => void;
}

const EditarPerfilDialog = ({
  open,
  onOpenChange,
  profile,
  onSuccess,
}: EditarPerfilDialogProps) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<PerfilFormData>({
    resolver: zodResolver(perfilSchema),
    defaultValues: {
      nombres: profile.nombres || '',
      apellidos: profile.apellidos || '',
      telefono: profile.telefono || '',
      telefono_visible: profile.telefono_visible ?? true,
      biografia: profile.biografia || '',
    },
  });

  const getAvatarUrl = (path: string | null | undefined) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  };

  const currentAvatarUrl = avatarPreview || getAvatarUrl(profile.avatar_url);

  const getInitials = () => {
    const nombres = form.watch('nombres') || profile.nombres;
    const apellidos = form.watch('apellidos') || profile.apellidos;
    if (nombres && apellidos) {
      return `${nombres.charAt(0)}${apellidos.charAt(0)}`.toUpperCase();
    }
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona una imagen válida');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('La imagen no puede ser mayor a 2MB');
      return;
    }

    setNewAvatarFile(file);
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
  };

  const handleRemoveAvatar = () => {
    setNewAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!newAvatarFile || !user?.id) return profile.avatar_url || null;

    setIsUploadingAvatar(true);
    try {
      const fileExt = newAvatarFile.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Delete old avatar if exists
      if (profile.avatar_url) {
        await supabase.storage.from('avatars').remove([profile.avatar_url]);
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, newAvatarFile, { upsert: true });

      if (uploadError) throw uploadError;

      return fileName;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Error al subir la imagen de perfil');
      return profile.avatar_url || null;
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const onSubmit = async (data: PerfilFormData) => {
    setIsSubmitting(true);

    try {
      // Upload avatar if changed
      const avatarPath = await uploadAvatar();

      const { error } = await supabase
        .from('usuarios')
        .update({
          nombres: data.nombres.trim(),
          apellidos: data.apellidos.trim(),
          telefono: data.telefono?.trim() || null,
          telefono_visible: data.telefono_visible,
          biografia: data.biografia?.trim() || null,
          avatar_url: avatarPath,
        })
        .eq('id_usuario', profile.id_usuario);

      if (error) throw error;

      toast.success('Perfil actualizado correctamente');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Error al actualizar el perfil');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      // Cleanup preview URL
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
      setAvatarPreview(null);
      setNewAvatarFile(null);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
          <DialogDescription>
            Actualiza tu información personal. Haz clic en guardar cuando termines.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative group">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={currentAvatarUrl || undefined} alt="Avatar" />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Camera className="h-6 w-6 text-white" />
                </button>
                {(avatarPreview || profile.avatar_url) && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="absolute -top-1 -right-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground">
                Haz clic en la imagen para cambiarla (máx. 2MB)
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="nombres"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombres</FormLabel>
                    <FormControl>
                      <Input placeholder="Ingresa tus nombres" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="apellidos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apellidos</FormLabel>
                    <FormControl>
                      <Input placeholder="Ingresa tus apellidos" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="telefono"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: +595 981 123456" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="telefono_visible"
              render={({ field }) => (
                <FormItem className="flex items-start gap-3 space-y-0 rounded-md border border-border/60 p-3">
                  <FormControl>
                    <Checkbox
                      checked={field.value === true}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                      className="mt-0.5"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer font-normal">
                      Mostrar mi teléfono en mi perfil
                    </FormLabel>
                    <FormDescription>
                      Si lo desactivas, otros alumnos no verán tu teléfono.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="biografia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Biografía (opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Cuéntanos un poco sobre ti..."
                      className="resize-none"
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    {field.value?.length || 0}/500 caracteres
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={isSubmitting || isUploadingAvatar}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || isUploadingAvatar}>
                {(isSubmitting || isUploadingAvatar) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Guardar cambios
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditarPerfilDialog;
