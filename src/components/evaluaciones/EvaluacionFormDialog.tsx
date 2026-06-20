import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Evaluacion } from '@/hooks/useEvaluaciones';
import { Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { LatexText } from './LatexText';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PendingOpcion {
  tempId: string;
  texto: string;
  es_correcta: boolean;
}

interface PendingPregunta {
  tempId: string;
  enunciado: string;
  tipo: 'OPCION_MULTIPLE' | 'ABIERTA';
  puntaje: number;
  opciones: PendingOpcion[];
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const evaluacionSchema = z.object({
  titulo: z.string().min(1, 'El título es requerido').max(200),
  descripcion: z.string().optional(),
  tiempo_limite_min: z.number().min(1).max(300).nullable().optional(),
  intentos_max: z.number().min(1).max(10).default(1),
});

export type EvaluacionFormData = z.infer<typeof evaluacionSchema> & {
  preguntas?: PendingPregunta[];
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface EvaluacionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idLeccion?: string;
  evaluacion?: Evaluacion | null;
  onSuccess: () => void;
  onDirectSubmit?: (data: EvaluacionFormData) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const newPregunta = (): PendingPregunta => ({
  tempId: Math.random().toString(36).substring(7),
  enunciado: '',
  tipo: 'OPCION_MULTIPLE',
  puntaje: 1,
  opciones: [
    { tempId: Math.random().toString(36).substring(7), texto: '', es_correcta: false },
    { tempId: Math.random().toString(36).substring(7), texto: '', es_correcta: false },
  ],
});

// ─── Component ────────────────────────────────────────────────────────────────

export function EvaluacionFormDialog({
  open,
  onOpenChange,
  idLeccion,
  evaluacion,
  onSuccess,
  onDirectSubmit,
}: EvaluacionFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!evaluacion;
  const [preguntas, setPreguntas] = useState<PendingPregunta[]>([]);

  const form = useForm<z.infer<typeof evaluacionSchema>>({
    resolver: zodResolver(evaluacionSchema),
    defaultValues: {
      titulo: '',
      descripcion: '',
      tiempo_limite_min: null,
      intentos_max: 1,
    },
  });

  useEffect(() => {
    if (open) {
      if (evaluacion) {
        form.reset({
          titulo: evaluacion.titulo,
          descripcion: evaluacion.descripcion || '',
          tiempo_limite_min: evaluacion.tiempo_limite_min,
          intentos_max: evaluacion.intentos_max,
        });
        // If editing, questions are managed on the detail page (existing flow)
        setPreguntas([]);
      } else {
        form.reset({
          titulo: '',
          descripcion: '',
          tiempo_limite_min: null,
          intentos_max: 1,
        });
        setPreguntas([]);
      }
    }
  }, [open, evaluacion, form]);

  // ── Question helpers ──────────────────────────────────────────────────────

  const addPregunta = () => setPreguntas(p => [...p, newPregunta()]);

  const removePregunta = (tempId: string) =>
    setPreguntas(p => p.filter(q => q.tempId !== tempId));

  const updatePregunta = (tempId: string, patch: Partial<Omit<PendingPregunta, 'tempId'>>) =>
    setPreguntas(p =>
      p.map(q =>
        q.tempId === tempId
          ? {
            ...q,
            ...patch,
            // When switching to ABIERTA remove options
            opciones: patch.tipo === 'ABIERTA' ? [] : patch.opciones ?? q.opciones,
          }
          : q
      )
    );

  const addOpcion = (pregTempId: string) =>
    setPreguntas(p =>
      p.map(q =>
        q.tempId === pregTempId
          ? {
            ...q,
            opciones: [
              ...q.opciones,
              { tempId: Math.random().toString(36).substring(7), texto: '', es_correcta: false },
            ],
          }
          : q
      )
    );

  const removeOpcion = (pregTempId: string, opcTempId: string) =>
    setPreguntas(p =>
      p.map(q =>
        q.tempId === pregTempId
          ? { ...q, opciones: q.opciones.filter(o => o.tempId !== opcTempId) }
          : q
      )
    );

  const updateOpcion = (pregTempId: string, opcTempId: string, patch: Partial<PendingOpcion>) =>
    setPreguntas(p =>
      p.map(q =>
        q.tempId === pregTempId
          ? {
            ...q,
            opciones: q.opciones.map(o =>
              o.tempId === opcTempId ? { ...o, ...patch } : o
            ),
          }
          : q
      )
    );

  const toggleCorrect = (pregTempId: string, opcTempId: string) =>
    setPreguntas(p =>
      p.map(q =>
        q.tempId === pregTempId
          ? {
            ...q,
            opciones: q.opciones.map(o => ({
              ...o,
              // Only one correct answer per question
              es_correcta: o.tempId === opcTempId ? !o.es_correcta : false,
            })),
          }
          : q
      )
    );

  // ── Submit ────────────────────────────────────────────────────────────────

  const onSubmit = async (data: z.infer<typeof evaluacionSchema>) => {
    // Validate questions
    for (const q of preguntas) {
      if (!q.enunciado.trim()) {
        toast({ title: 'Error', description: 'Todas las preguntas deben tener un enunciado.', variant: 'destructive' });
        return;
      }
      if (q.tipo === 'OPCION_MULTIPLE') {
        if (q.opciones.length < 2) {
          toast({ title: 'Error', description: `La pregunta "${q.enunciado}" necesita al menos 2 opciones.`, variant: 'destructive' });
          return;
        }
        if (!q.opciones.some(o => o.es_correcta)) {
          toast({ title: 'Error', description: `Marca la opción correcta en la pregunta "${q.enunciado}".`, variant: 'destructive' });
          return;
        }
        if (q.opciones.some(o => !o.texto.trim())) {
          toast({ title: 'Error', description: `Completa el texto de todas las opciones en "${q.enunciado}".`, variant: 'destructive' });
          return;
        }
      }
    }

    try {
      // ── Pending / offline mode ───────────────────────────────────────────
      if (onDirectSubmit) {
        onDirectSubmit({ ...data, preguntas });
        onOpenChange(false);
        onSuccess();
        return;
      }

      if (!idLeccion || idLeccion === 'pending') {
        console.error('No idLeccion provided');
        return;
      }

      // ── Live mode: save to DB ────────────────────────────────────────────
      if (isEditing) {
        const { error } = await supabase
          .from('evaluaciones')
          .update({
            titulo: data.titulo,
            descripcion: data.descripcion || null,
            tiempo_limite_min: data.tiempo_limite_min || null,
            intentos_max: data.intentos_max,
          })
          .eq('id_evaluacion', evaluacion.id_evaluacion);

        if (error) throw error;
        toast({ title: 'Evaluación actualizada' });
      } else {
        const { data: newEval, error } = await supabase
          .from('evaluaciones')
          .insert({
            id_leccion: idLeccion,
            titulo: data.titulo,
            descripcion: data.descripcion || null,
            tiempo_limite_min: data.tiempo_limite_min || null,
            intentos_max: data.intentos_max,
          })
          .select('id_evaluacion')
          .single();

        if (error) throw error;

        // Save questions
        for (let i = 0; i < preguntas.length; i++) {
          const q = preguntas[i];
          const { data: newQ, error: qErr } = await supabase
            .from('preguntas_evaluacion')
            .insert({
              id_evaluacion: newEval.id_evaluacion,
              enunciado: q.enunciado,
              tipo: q.tipo,
              puntaje: q.puntaje,
            })
            .select('id_pregunta')
            .single();

          if (qErr) throw qErr;

          if (q.tipo === 'OPCION_MULTIPLE' && q.opciones.length > 0) {
            const { error: opErr } = await supabase.from('opciones_pregunta').insert(
              q.opciones.map(o => ({
                id_pregunta: newQ.id_pregunta,
                texto: o.texto,
                es_correcta: o.es_correcta,
              }))
            );
            if (opErr) throw opErr;
          }
        }

        toast({ title: 'Evaluación creada', description: `${preguntas.length} preguntas guardadas.` });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving evaluacion:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar la evaluación.',
        variant: 'destructive',
      });
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] flex-col overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 px-5 pb-2 pt-5 sm:px-6 sm:pt-6">
          <DialogTitle>
            {isEditing ? 'Editar Evaluación' : 'Nueva Evaluación'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-2 sm:px-6">

            {/* ── Basic info ── */}
            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Examen Módulo 1" {...field} />
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
                  <FormLabel>Descripción (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Instrucciones o descripción de la evaluación..."
                      className="min-h-[70px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="tiempo_limite_min"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tiempo límite (minutos)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Sin límite"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val ? parseInt(val) : null);
                        }}
                      />
                    </FormControl>
                    <FormDescription>Vacío = sin límite</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="intentos_max"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Intentos máximos</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ── Questions section ── */}
            {!isEditing && (
              <div className="rounded-lg border p-4 space-y-4 bg-card">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium">Preguntas</span>
                  <Button type="button" size="sm" variant="outline" onClick={addPregunta} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar pregunta
                  </Button>
                </div>

                {preguntas.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Aún no hay preguntas. Agrega al menos una.
                  </p>
                )}

                {preguntas.map((pregunta, pIdx) => (
                  <div key={pregunta.tempId} className="rounded-lg border p-4 bg-background space-y-3">
                    {/* Pregunta header */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-muted-foreground">
                        Pregunta {pIdx + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePregunta(pregunta.tempId)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Enunciado */}
                    <Textarea
                      placeholder="Escribe el enunciado. Puedes usar LaTeX, ej: \(x^2\)"
                      className="min-h-[60px]"
                      value={pregunta.enunciado}
                      onChange={(e) =>
                        updatePregunta(pregunta.tempId, { enunciado: e.target.value })
                      }
                    />
                    {pregunta.enunciado && (
                      <div className="rounded-md border bg-muted/20 p-3 text-sm">
                        <LatexText>{pregunta.enunciado}</LatexText>
                      </div>
                    )}

                    {/* Tipo & Puntaje */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Tipo</label>
                        <Select
                          value={pregunta.tipo}
                          onValueChange={(val) =>
                            updatePregunta(pregunta.tempId, {
                              tipo: val as 'OPCION_MULTIPLE' | 'ABIERTA',
                              opciones:
                                val === 'ABIERTA'
                                  ? []
                                  : pregunta.opciones.length >= 2
                                    ? pregunta.opciones
                                    : [
                                      { tempId: Math.random().toString(36).substring(7), texto: '', es_correcta: false },
                                      { tempId: Math.random().toString(36).substring(7), texto: '', es_correcta: false },
                                    ],
                            })
                          }
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OPCION_MULTIPLE">Opción múltiple</SelectItem>
                            <SelectItem value="ABIERTA">Respuesta abierta</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          Puntaje
                        </label>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          className="h-8 text-sm"
                          value={pregunta.puntaje}
                          onChange={(e) =>
                            updatePregunta(pregunta.tempId, {
                              puntaje: parseInt(e.target.value) || 1,
                            })
                          }
                        />
                      </div>
                    </div>

                    {/* Opciones (solo para OPCION_MULTIPLE) */}
                    {pregunta.tipo === 'OPCION_MULTIPLE' && (
                      <div className="space-y-2 pt-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          Opciones{' '}
                          <span className="text-primary">(haz clic en el círculo para marcar la correcta)</span>
                        </label>

                        {pregunta.opciones.map((opcion) => (
                          <div key={opcion.tempId} className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleCorrect(pregunta.tempId, opcion.tempId)}
                              className="shrink-0"
                              title="Marcar como correcta"
                            >
                              {opcion.es_correcta ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : (
                                <Circle className="h-5 w-5 text-muted-foreground" />
                              )}
                            </button>
                            <Textarea
                              className="min-h-10 flex-1 resize-y text-sm"
                              placeholder="Texto de la opción..."
                              value={opcion.texto}
                              onChange={(e) =>
                                updateOpcion(pregunta.tempId, opcion.tempId, {
                                  texto: e.target.value,
                                })
                              }
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="shrink-0 h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => removeOpcion(pregunta.tempId, opcion.tempId)}
                              disabled={pregunta.opciones.length <= 2}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => addOpcion(pregunta.tempId)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Agregar opción
                        </Button>
                      </div>
                    )}

                    {pregunta.tipo === 'ABIERTA' && (
                      <p className="text-xs text-muted-foreground italic">
                        El/la estudiante responderá con texto libre. El docente calificará manualmente.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── Actions ── */}
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
                    : 'Crear Evaluación'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
