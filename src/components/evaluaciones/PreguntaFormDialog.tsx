import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, GripVertical } from 'lucide-react';
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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Pregunta } from '@/hooks/useEvaluaciones';
import { LatexText } from './LatexText';

const opcionSchema = z.object({
  id_opcion: z.string().optional(),
  texto: z.string().min(1, 'El texto es requerido'),
  es_correcta: z.boolean().default(false),
});

const preguntaSchema = z.object({
  enunciado: z.string().min(1, 'El enunciado es requerido'),
  tipo: z.enum(['OPCION_MULTIPLE', 'ABIERTA']),
  puntaje: z.number().min(1, 'El puntaje mínimo es 1').max(100, 'El puntaje máximo es 100').default(1),
  opciones: z.array(opcionSchema).optional(),
}).refine((data) => {
  if (data.tipo === 'OPCION_MULTIPLE') {
    if (!data.opciones || data.opciones.length < 2) {
      return false;
    }
    const hasCorrect = data.opciones.some(o => o.es_correcta);
    return hasCorrect;
  }
  return true;
}, {
  message: 'Las preguntas de opción múltiple necesitan al menos 2 opciones y una correcta',
  path: ['opciones'],
});

type PreguntaFormData = z.infer<typeof preguntaSchema>;

interface PreguntaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idEvaluacion: string;
  pregunta?: Pregunta | null;
  onSuccess: () => void;
}

export function PreguntaFormDialog({
  open,
  onOpenChange,
  idEvaluacion,
  pregunta,
  onSuccess,
}: PreguntaFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!pregunta;

  const form = useForm<PreguntaFormData>({
    resolver: zodResolver(preguntaSchema),
    defaultValues: {
      enunciado: '',
      tipo: 'OPCION_MULTIPLE',
      puntaje: 1,
      opciones: [
        { texto: '', es_correcta: false },
        { texto: '', es_correcta: false },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'opciones',
  });

  const tipoPregunta = form.watch('tipo');
  const enunciadoPreview = form.watch('enunciado');

  // Clear opciones when switching to ABIERTA
  useEffect(() => {
    if (tipoPregunta === 'ABIERTA') {
      form.setValue('opciones', []);
    } else if (tipoPregunta === 'OPCION_MULTIPLE' && (!form.getValues('opciones') || form.getValues('opciones')?.length === 0)) {
      form.setValue('opciones', [
        { texto: '', es_correcta: false },
        { texto: '', es_correcta: false },
      ]);
    }
  }, [tipoPregunta, form]);

  useEffect(() => {
    if (open) {
      if (pregunta) {
        form.reset({
          enunciado: pregunta.enunciado,
          tipo: pregunta.tipo,
          puntaje: Number(pregunta.puntaje),
          opciones: pregunta.opciones?.map(o => ({
            id_opcion: o.id_opcion,
            texto: o.texto,
            es_correcta: o.es_correcta,
          })) || [],
        });
      } else {
        form.reset({
          enunciado: '',
          tipo: 'OPCION_MULTIPLE',
          puntaje: 1,
          opciones: [
            { texto: '', es_correcta: false },
            { texto: '', es_correcta: false },
          ],
        });
      }
    }
  }, [open, pregunta, form]);

  const onSubmit = async (data: PreguntaFormData) => {
    try {
      if (isEditing) {
        // Update pregunta
        const { error: preguntaError } = await supabase
          .from('preguntas_evaluacion')
          .update({
            enunciado: data.enunciado,
            tipo: data.tipo,
            puntaje: data.puntaje,
          })
          .eq('id_pregunta', pregunta.id_pregunta);

        if (preguntaError) throw preguntaError;

        // Handle opciones for multiple choice
        if (data.tipo === 'OPCION_MULTIPLE' && data.opciones) {
          // Delete existing opciones
          await supabase
            .from('opciones_pregunta')
            .delete()
            .eq('id_pregunta', pregunta.id_pregunta);

          // Insert new opciones
          const { error: opcionesError } = await supabase
            .from('opciones_pregunta')
            .insert(
              data.opciones.map(o => ({
                id_pregunta: pregunta.id_pregunta,
                texto: o.texto,
                es_correcta: o.es_correcta,
              }))
            );

          if (opcionesError) throw opcionesError;
        } else if (data.tipo === 'ABIERTA') {
          // Delete opciones if type changed to open
          await supabase
            .from('opciones_pregunta')
            .delete()
            .eq('id_pregunta', pregunta.id_pregunta);
        }

        toast({
          title: 'Pregunta actualizada',
          description: 'Los cambios se han guardado correctamente.',
        });
      } else {
        // Insert new pregunta
        const { data: newPregunta, error: preguntaError } = await supabase
          .from('preguntas_evaluacion')
          .insert({
            id_evaluacion: idEvaluacion,
            enunciado: data.enunciado,
            tipo: data.tipo,
            puntaje: data.puntaje,
          })
          .select()
          .single();

        if (preguntaError) throw preguntaError;

        // Insert opciones if multiple choice
        if (data.tipo === 'OPCION_MULTIPLE' && data.opciones) {
          const { error: opcionesError } = await supabase
            .from('opciones_pregunta')
            .insert(
              data.opciones.map(o => ({
                id_pregunta: newPregunta.id_pregunta,
                texto: o.texto,
                es_correcta: o.es_correcta,
              }))
            );

          if (opcionesError) throw opcionesError;
        }

        toast({
          title: 'Pregunta creada',
          description: 'La pregunta se ha creado correctamente.',
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving pregunta:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar la pregunta.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] flex-col overflow-hidden p-0 sm:max-w-[600px]">
        <DialogHeader className="shrink-0 px-5 pb-2 pt-5 sm:px-6 sm:pt-6">
          <DialogTitle>
            {isEditing ? 'Editar Pregunta' : 'Nueva Pregunta'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-2 sm:px-6">
            <FormField
              control={form.control}
              name="enunciado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Enunciado</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Escribe el enunciado. Puedes usar LaTeX, ej: \(x^2\)"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  {enunciadoPreview && (
                    <div className="rounded-md border bg-muted/20 p-3 text-sm">
                      <LatexText>{enunciadoPreview}</LatexText>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de pregunta</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="OPCION_MULTIPLE">Opción múltiple</SelectItem>
                        <SelectItem value="ABIERTA">Respuesta abierta</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="puntaje"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Puntaje</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        min="1"
                        max="100"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {tipoPregunta === 'OPCION_MULTIPLE' && (
              <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <FormLabel>Opciones de respuesta</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ texto: '', es_correcta: false })}
                    disabled={fields.length >= 6}
                    className="w-full sm:w-auto"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar
                  </Button>
                </div>

                <div className="space-y-2">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-2 rounded-lg border bg-muted/30 p-2"
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                      
                      <FormField
                        control={form.control}
                        name={`opciones.${index}.es_correcta`}
                        render={({ field: checkField }) => (
                          <Checkbox
                            checked={checkField.value}
                            onCheckedChange={checkField.onChange}
                          />
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`opciones.${index}.texto`}
                        render={({ field: inputField }) => (
                          <Textarea
                            {...inputField}
                            placeholder={`Opción ${index + 1}`}
                            className="min-h-10 flex-1 resize-y"
                          />
                        )}
                      />

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        disabled={fields.length <= 2}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground">
                  Marca la casilla de las opciones correctas. Debe haber al menos una.
                </p>

                {form.formState.errors.opciones && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.opciones.message}
                  </p>
                )}
              </div>
            )}

            {tipoPregunta === 'ABIERTA' && (
              <p className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                Las respuestas abiertas requieren calificación manual por parte del docente.
              </p>
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
                  ? 'Guardar Cambios'
                  : 'Crear Pregunta'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
