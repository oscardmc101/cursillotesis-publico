import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Tarea } from '@/hooks/useTareas';

const tareaSchema = z.object({
  titulo: z.string().min(1, 'El título es requerido').max(200, 'Máximo 200 caracteres'),
  descripcion: z.string().max(2000, 'Máximo 2000 caracteres').optional(),
  fecha_limite: z.date().optional().nullable(),
  permite_reintentos: z.boolean(),
  max_reintentos: z.number().min(1).max(10),
  puntaje_maximo: z.number().min(1, 'El puntaje debe ser mayor a 0').max(100, 'Máximo 100 puntos'),
});

type TareaFormData = z.infer<typeof tareaSchema>;

interface TareaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idLeccion?: string;
  tarea?: Tarea | null;
  onSuccess?: () => void;
  onDirectSubmit?: (data: TareaFormData) => void;
}

const TareaFormDialog = ({
  open,
  onOpenChange,
  idLeccion,
  tarea,
  onSuccess,
  onDirectSubmit,
}: TareaFormDialogProps) => {
  const isEditing = !!tarea;

  const form = useForm<TareaFormData>({
    resolver: zodResolver(tareaSchema),
    defaultValues: {
      titulo: '',
      descripcion: '',
      fecha_limite: null,
      permite_reintentos: true,
      max_reintentos: 3,
      puntaje_maximo: 10,
    },
  });

  useEffect(() => {
    if (open) {
      if (tarea) {
        form.reset({
          titulo: tarea.titulo,
          descripcion: tarea.descripcion || '',
          fecha_limite: tarea.fecha_limite ? new Date(tarea.fecha_limite) : null,
          permite_reintentos: tarea.permite_reintentos,
          max_reintentos: tarea.max_reintentos,
          puntaje_maximo: tarea.puntaje_maximo ?? 10,
        });
      } else {
        form.reset({
          titulo: '',
          descripcion: '',
          fecha_limite: null,
          permite_reintentos: true,
          max_reintentos: 3,
          puntaje_maximo: 10,
        });
      }
    }
  }, [open, tarea, form]);

  const onSubmit = async (data: TareaFormData) => {
    try {
      // Offline mode: return data to parent instead of saving to DB
      if (onDirectSubmit) {
        onDirectSubmit(data);
        onOpenChange(false);
        onSuccess?.();
        return;
      }

      if (!idLeccion || idLeccion === 'pending') {
        console.error('No idLeccion provided');
        return;
      }

      const payload = {
        titulo: data.titulo.trim(),
        descripcion: data.descripcion?.trim() || null,
        fecha_limite: data.fecha_limite?.toISOString() || null,
        permite_reintentos: data.permite_reintentos,
        max_reintentos: data.max_reintentos,
        puntaje_maximo: data.puntaje_maximo,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('tareas')
          .update(payload)
          .eq('id_tarea', tarea.id_tarea);

        if (error) throw error;

        toast({ title: 'Tarea actualizada correctamente' });
      } else {
        const { error } = await supabase
          .from('tareas')
          .insert({ ...payload, id_leccion: idLeccion });

        if (error) throw error;

        toast({ title: 'Tarea creada correctamente' });
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error saving tarea:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la tarea',
        variant: 'destructive',
      });
    }
  };

  const permiteReintentos = form.watch('permite_reintentos');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] flex-col overflow-hidden p-0 sm:max-w-[500px]">
        <DialogHeader className="shrink-0 px-5 pb-2 pt-5 sm:px-6 sm:pt-6">
          <DialogTitle>
            {isEditing ? 'Editar Tarea' : 'Nueva Tarea'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-2 sm:px-6">
            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input placeholder="Título de la tarea" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Instrucciones y detalles de la tarea..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="puntaje_maximo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Puntaje máximo *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      step="1"
                      placeholder="Ej: 10"
                      value={field.value === 0 ? '' : field.value}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') {
                          field.onChange(0);
                        } else {
                          const parsed = parseFloat(raw);
                          if (!isNaN(parsed)) field.onChange(parsed);
                        }
                      }}
                      onBlur={field.onBlur}
                    />
                  </FormControl>
                  <FormDescription>
                    Puntos totales que vale esta tarea
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fecha_limite"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha límite</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>Sin fecha límite</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                      {field.value && (
                        <div className="p-2 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            onClick={() => field.onChange(null)}
                          >
                            Quitar fecha límite
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Opcional. Si no se especifica, la tarea no tiene fecha límite.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="permite_reintentos"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between gap-4 rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Permitir reintentos</FormLabel>
                    <FormDescription>
                      Permitir que los estudiantes reenvíen la tarea
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="shrink-0"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {permiteReintentos && (
              <FormField
                control={form.control}
                name="max_reintentos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Máximo de reintentos</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormDescription>
                      Número máximo de veces que el estudiante puede enviar la tarea
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            </div>

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t bg-background px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting} className="w-full sm:w-auto">
                {form.formState.isSubmitting
                  ? 'Guardando...'
                  : isEditing
                    ? 'Guardar cambios'
                    : 'Crear tarea'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default TareaFormDialog;
