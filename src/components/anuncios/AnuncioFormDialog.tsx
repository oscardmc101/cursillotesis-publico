import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Anuncio, AnuncioFormData } from '@/hooks/useAnuncios';

const formSchema = z.object({
  titulo: z.string().min(1, 'El título es requerido').max(100, 'Máximo 100 caracteres'),
  contenido: z.string().min(1, 'El contenido es requerido'),
  id_curso: z.string().nullable(),
  notificar_email: z.boolean().default(true),
});

interface AnuncioFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anuncio?: Anuncio | null;
  onSubmit: (data: AnuncioFormData) => void;
  isLoading?: boolean;
}

const AnuncioFormDialog = ({
  open,
  onOpenChange,
  anuncio,
  onSubmit,
  isLoading = false,
}: AnuncioFormDialogProps) => {
  const isEditing = !!anuncio;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titulo: '',
      contenido: '',
      id_curso: null,
      notificar_email: true,
    },
  });

  // Fetch available courses
  const { data: cursos = [] } = useQuery({
    queryKey: ['cursos-for-anuncios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cursos')
        .select('id_curso, titulo')
        .eq('es_publicado', true)
        .order('titulo');

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!open) return;

    if (anuncio) {
      form.reset({
        titulo: anuncio.titulo,
        contenido: anuncio.contenido,
        id_curso: anuncio.id_curso,
        notificar_email: false, // Don't notify on edit
      });
    } else {
      form.reset({
        titulo: '',
        contenido: '',
        id_curso: null,
        notificar_email: true,
      });
    }
  }, [open, anuncio, form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    const selectedCurso = cursos.find(c => c.id_curso === values.id_curso);
    onSubmit({
      titulo: values.titulo,
      contenido: values.contenido,
      id_curso: values.id_curso === 'global' ? null : values.id_curso,
      notificar_email: values.notificar_email,
      nombre_curso: selectedCurso?.titulo,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Anuncio' : 'Nuevo Anuncio'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Título del anuncio" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="id_curso"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alcance</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || 'global'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el alcance" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="global">🌍 Todos los cursos (Global)</SelectItem>
                      {cursos.map((curso) => (
                        <SelectItem key={curso.id_curso} value={curso.id_curso}>
                          📚 {curso.titulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contenido"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contenido</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Escribe el contenido del anuncio..."
                      className="min-h-[150px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditing && (
              <FormField
                control={form.control}
                name="notificar_email"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Notificar por email
                      </FormLabel>
                      <FormDescription>
                        Enviar notificación por email a los estudiantes
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Publicar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AnuncioFormDialog;
