import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, CheckCircle2, ImagePlus, Loader2, Send, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCursillo } from '@/contexts/CursilloContext';
import { useUserRole } from '@/contexts/UserRoleContext';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import SoporteSolicitudesAdmin from './SoporteSolicitudesAdmin';

const SOPORTE_BUCKET = 'soporte_evidencias';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const SUPPORT_SUCCESS_MESSAGE = 'Tu solicitud fue enviada correctamente. Será revisada por la dirección y, si se aprueba, se resolverá o incorporará a la plataforma en un plazo máximo de 48 horas.';

const soporteSchema = z.object({
  nombre_usuario: z
    .string()
    .trim()
    .min(2, 'Ingresa tu nombre.')
    .max(150, 'El nombre no puede exceder 150 caracteres.'),
  telefono: z
    .string()
    .trim()
    .min(5, 'Ingresa un número de teléfono.')
    .max(30, 'El teléfono no puede exceder 30 caracteres.')
    .regex(/^[0-9+\-\s()]+$/, 'Formato de teléfono inválido.'),
  tipo_solicitud: z.enum(['ERROR', 'MEJORA'], {
    required_error: 'Selecciona el tipo de solicitud.',
  }),
  descripcion: z
    .string()
    .trim()
    .min(10, 'Describe la solicitud con al menos 10 caracteres.')
    .max(2000, 'La descripción no puede exceder 2000 caracteres.'),
});

type SoporteFormData = z.infer<typeof soporteSchema>;

const getImageExtension = (file: File) => {
  if (file.type === 'image/jpeg') return 'jpg';
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';

  const fallback = file.name.split('.').pop()?.toLowerCase();
  return fallback && /^[a-z0-9]+$/.test(fallback) ? fallback : 'jpg';
};

const formatFileSize = (size: number) => {
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const Soporte = () => {
  const { idCursilloActivo } = useCursillo();
  const { profile, isAdmin } = useUserRole();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const defaultName = profile ? `${profile.nombres} ${profile.apellidos}`.trim() : '';

  const form = useForm<SoporteFormData>({
    resolver: zodResolver(soporteSchema),
    defaultValues: {
      nombre_usuario: defaultName,
      telefono: '',
      tipo_solicitud: 'ERROR',
      descripcion: '',
    },
  });

  useEffect(() => {
    if (!profile?.id_usuario) return;

    const currentValues = form.getValues();
    if (!currentValues.nombre_usuario && defaultName) {
      form.setValue('nombre_usuario', defaultName);
    }

    const fetchTelefono = async () => {
      const { data } = await supabase
        .from('usuarios')
        .select('telefono')
        .eq('id_usuario', profile.id_usuario)
        .maybeSingle();

      if (data?.telefono && !form.getValues('telefono')) {
        form.setValue('telefono', data.telefono);
      }
    };

    fetchTelefono();
  }, [defaultName, form, profile?.id_usuario]);

  const clearFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast({
        title: 'Imagen no válida',
        description: 'Solo se permiten imágenes JPG, PNG o WEBP.',
        variant: 'destructive',
      });
      clearFileInput();
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast({
        title: 'Imagen demasiado grande',
        description: 'La imagen no puede superar 5MB.',
        variant: 'destructive',
      });
      clearFileInput();
      return;
    }

    setSelectedImage(file);
    setSuccessMessage(null);
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    clearFileInput();
  };

  const onSubmit = async (values: SoporteFormData) => {
    if (!profile?.id_usuario || !idCursilloActivo) {
      toast({
        title: 'No se pudo enviar',
        description: 'No se encontró tu usuario o cursillo activo.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage(null);

    let uploadedPath: string | null = null;
    let solicitudId: string | null = null;

    try {
      if (selectedImage) {
        const secureId = typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        uploadedPath = `${profile.id_usuario}/${secureId}.${getImageExtension(selectedImage)}`;

        const { error: uploadError } = await supabase.storage
          .from(SOPORTE_BUCKET)
          .upload(uploadedPath, selectedImage, {
            contentType: selectedImage.type,
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;
      }

      const { data: solicitud, error: insertError } = await supabase
        .from('soporte_solicitudes')
        .insert({
          id_cursillo: idCursilloActivo,
          id_usuario: profile.id_usuario,
          nombre_usuario: values.nombre_usuario.trim(),
          telefono: values.telefono.trim(),
          tipo_solicitud: values.tipo_solicitud,
          descripcion: values.descripcion.trim(),
          imagen_bucket: uploadedPath ? SOPORTE_BUCKET : null,
          imagen_path: uploadedPath,
          imagen_nombre: selectedImage?.name ?? null,
          imagen_tipo_mime: selectedImage?.type ?? null,
          imagen_tamano_bytes: selectedImage?.size ?? null,
        })
        .select('id_solicitud')
        .single();

      if (insertError) throw insertError;
      solicitudId = solicitud.id_solicitud;

      const { data: emailData, error: emailError } = await supabase.functions.invoke(
        'send-soporte-email',
        { body: { solicitudId } },
      );

      if (emailError || emailData?.error) {
        console.warn(
          'Support request saved, but admin email notification returned an error:',
          emailData?.error || emailError?.message,
        );
      } else if (emailData?.emailWarning) {
        console.warn('Support request saved with admin email warning:', emailData.emailWarning);
      }

      setSuccessMessage(SUPPORT_SUCCESS_MESSAGE);
      toast({
        title: 'Solicitud enviada',
        description: SUPPORT_SUCCESS_MESSAGE,
      });

      form.reset({
        nombre_usuario: values.nombre_usuario.trim(),
        telefono: values.telefono.trim(),
        tipo_solicitud: 'ERROR',
        descripcion: '',
      });
      removeSelectedImage();
    } catch (error) {
      if (uploadedPath && !solicitudId) {
        await supabase.storage.from(SOPORTE_BUCKET).remove([uploadedPath]);
      }

      if (solicitudId) {
        console.warn('Support request saved, but admin notification failed:', error);
        setSuccessMessage(SUPPORT_SUCCESS_MESSAGE);
        toast({
          title: 'Solicitud enviada',
          description: SUPPORT_SUCCESS_MESSAGE,
        });
        form.reset({
          nombre_usuario: values.nombre_usuario.trim(),
          telefono: values.telefono.trim(),
          tipo_solicitud: 'ERROR',
          descripcion: '',
        });
        removeSelectedImage();
        return;
      }

      console.error('Error sending support request:', error);
      toast({
        title: 'Error al enviar',
        description: 'No se pudo enviar la solicitud. Revisa los datos e intenta nuevamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const descriptionLength = form.watch('descripcion')?.length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Soporte</h1>
        <p className="text-muted-foreground">
          Reporta errores de la plataforma o solicita mejoras.
        </p>
      </div>

      {isAdmin && <SoporteSolicitudesAdmin />}

      <div className="max-w-3xl space-y-6">
        {successMessage && (
          <Alert className="border-emerald-500/40 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <AlertTitle>Solicitud enviada</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        <Card>
        <CardHeader>
          <CardTitle>Nueva solicitud</CardTitle>
          <CardDescription>
            Los campos marcados como obligatorios deben completarse antes de enviar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="nombre_usuario"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del usuario</FormLabel>
                    <FormControl>
                      <Input placeholder="Tu nombre completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="telefono"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de teléfono</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: +595 981 123456" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipo_solicitud"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de solicitud</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ERROR">Error</SelectItem>
                        <SelectItem value="MEJORA">Mejora</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="descripcion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción del error o mejora</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe qué pasó, dónde ocurrió o qué mejora solicitas."
                        className="min-h-[150px] resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>{descriptionLength}/2000 caracteres</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Label>Imagen opcional</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_IMAGE_TYPES.join(',')}
                  onChange={handleImageSelect}
                  className="hidden"
                />

                {selectedImage ? (
                  <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <ImagePlus className="h-5 w-5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{selectedImage.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedImage.type.replace('image/', '').toUpperCase()} · {formatFileSize(selectedImage.size)}
                        </p>
                      </div>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={removeSelectedImage}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start gap-2 sm:w-auto"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus className="h-4 w-4" />
                    Adjuntar imagen
                  </Button>
                )}
                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  JPG, PNG o WEBP. Tamaño máximo: 5MB.
                </p>
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Enviar solicitud
              </Button>
            </form>
          </Form>
        </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Soporte;
