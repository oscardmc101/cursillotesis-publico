import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const moduloSchema = z.object({
  titulo: z
    .string()
    .min(3, 'El título debe tener al menos 3 caracteres')
    .max(100, 'El título no puede exceder 100 caracteres'),
  orden: z.coerce.number().min(1, 'El orden debe ser al menos 1'),
});

type ModuloFormValues = z.infer<typeof moduloSchema>;

interface Modulo {
  id_modulo: string;
  titulo: string;
  orden: number;
}

interface ModuloFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idCurso: string;
  modulo?: Modulo | null;
  nextOrden: number;
  onSuccess: () => void;
}

const ModuloFormDialog = ({
  open,
  onOpenChange,
  idCurso,
  modulo,
  nextOrden,
  onSuccess,
}: ModuloFormDialogProps) => {
  const isEditing = !!modulo;

  const form = useForm<ModuloFormValues>({
    resolver: zodResolver(moduloSchema),
    defaultValues: {
      titulo: '',
      orden: nextOrden,
    },
  });

  useEffect(() => {
    if (open) {
      if (modulo) {
        form.reset({
          titulo: modulo.titulo,
          orden: modulo.orden,
        });
      } else {
        form.reset({
          titulo: '',
          orden: nextOrden,
        });
      }
    }
  }, [open, modulo, nextOrden, form]);

  const onSubmit = async (values: ModuloFormValues) => {
    try {
      if (isEditing) {
        const { error } = await supabase
          .from('modulos')
          .update({
            titulo: values.titulo,
            orden: values.orden,
          })
          .eq('id_modulo', modulo.id_modulo);

        if (error) throw error;

        toast({ title: 'Módulo actualizado correctamente' });
      } else {
        const { error } = await supabase.from('modulos').insert({
          id_curso: idCurso,
          titulo: values.titulo,
          orden: values.orden,
        });

        if (error) throw error;

        toast({ title: 'Módulo creado correctamente' });
      }

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error saving modulo:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar el módulo',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Módulo' : 'Nuevo Módulo'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título del Módulo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Introducción" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="orden"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Orden</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? 'Guardando...'
                  : isEditing
                  ? 'Actualizar'
                  : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ModuloFormDialog;
