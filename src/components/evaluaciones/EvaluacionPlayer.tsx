import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Clock, ChevronLeft, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUsuario } from '@/hooks/useCurrentUsuario';
import type { Evaluacion, Pregunta } from '@/hooks/useEvaluaciones';
import { LatexText } from './LatexText';

interface EvaluacionPlayerProps {
  evaluacion: Evaluacion;
  preguntas: Pregunta[];
  onClose: () => void;
}

interface Respuesta {
  id_pregunta: string;
  id_opcion?: string | null;
  opciones_seleccionadas?: string[];
  respuesta_texto?: string | null;
}

export function EvaluacionPlayer({ evaluacion, preguntas, onClose }: EvaluacionPlayerProps) {
  const { toast } = useToast();
  const { idUsuario } = useCurrentUsuario();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [respuestas, setRespuestas] = useState<Record<string, Respuesta>>({});
  const [intentoId, setIntentoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [puntajeObtenido, setPuntajeObtenido] = useState(0);

  const currentPregunta = preguntas[currentIndex];
  const puntajeTotal = preguntas.reduce((sum, p) => sum + Number(p.puntaje), 0);
  const preguntasRespondidas = Object.keys(respuestas).length;

  const initStartedRef = useRef(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Initialize intento
  useEffect(() => {
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    const initIntento = async () => {
      if (!idUsuario) return;

      try {
        // Check for existing in-progress attempt
        const { data: existingIntento } = await supabase
          .from('intentos_evaluacion')
          .select('*')
          .eq('id_evaluacion', evaluacion.id_evaluacion)
          .eq('id_usuario', idUsuario)
          .eq('estado', 'EN_PROGRESO')
          .maybeSingle();

        if (existingIntento) {
          setIntentoId(existingIntento.id_intento);
          
          // Load existing responses
          const { data: existingRespuestas } = await supabase
            .from('respuestas_intento')
            .select('*')
            .eq('id_intento', existingIntento.id_intento);

          if (existingRespuestas) {
            const respuestasMap: Record<string, Respuesta> = {};
            existingRespuestas.forEach(r => {
              respuestasMap[r.id_pregunta] = {
                id_pregunta: r.id_pregunta,
                id_opcion: r.id_opcion,
                respuesta_texto: r.respuesta_texto,
              };
            });
            setRespuestas(respuestasMap);
          }

          // Calculate time remaining if applicable
          if (evaluacion.tiempo_limite_min) {
            const startTime = new Date(existingIntento.fecha_inicio).getTime();
            const endTime = startTime + evaluacion.tiempo_limite_min * 60 * 1000;
            const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
            setTimeRemaining(remaining);
          }
        } else {
          // Check if max attempts reached before creating new
          const { count } = await supabase
            .from('intentos_evaluacion')
            .select('*', { count: 'exact', head: true })
            .eq('id_evaluacion', evaluacion.id_evaluacion)
            .eq('id_usuario', idUsuario)
            .neq('estado', 'EN_PROGRESO');

          if (count !== null && count >= evaluacion.intentos_max) {
            toast({
              title: 'Sin intentos disponibles',
              description: 'Ya has completado todos los intentos permitidos.',
              variant: 'destructive',
            });
            onClose();
            return;
          }

          // Create new intento
          const { data: newIntento, error } = await supabase
            .from('intentos_evaluacion')
            .insert({
              id_evaluacion: evaluacion.id_evaluacion,
              id_usuario: idUsuario,
              estado: 'EN_PROGRESO',
              puntaje_obtenido: 0,
            })
            .select()
            .single();

          if (error) throw error;
          setIntentoId(newIntento.id_intento);

          if (evaluacion.tiempo_limite_min) {
            setTimeRemaining(evaluacion.tiempo_limite_min * 60);
          }
        }
      } catch (error: any) {
        console.error('Error initializing intento:', error);
        toast({
          title: 'Error',
          description: 'No se pudo iniciar la evaluación.',
          variant: 'destructive',
        });
        onClose();
      } finally {
        setLoading(false);
      }
    };

    initIntento();
  }, [evaluacion, idUsuario, toast, onClose]);

  // Timer
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const saveRespuesta = async (preguntaId: string, respuesta: Respuesta) => {
    if (!intentoId) return;

    try {
      // Check if respuesta exists
      const { data: existing } = await supabase
        .from('respuestas_intento')
        .select('id_respuesta')
        .eq('id_intento', intentoId)
        .eq('id_pregunta', preguntaId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('respuestas_intento')
          .update({
            id_opcion: respuesta.id_opcion || null,
            respuesta_texto: respuesta.respuesta_texto || null,
          })
          .eq('id_respuesta', existing.id_respuesta);
      } else {
        await supabase
          .from('respuestas_intento')
          .insert({
            id_intento: intentoId,
            id_pregunta: preguntaId,
            id_opcion: respuesta.id_opcion || null,
            respuesta_texto: respuesta.respuesta_texto || null,
            puntaje_obtenido: 0,
          });
      }
    } catch (error) {
      console.error('Error saving respuesta:', error);
    }
  };

  const handleRespuestaChange = (preguntaId: string, value: Respuesta) => {
    setRespuestas(prev => ({ ...prev, [preguntaId]: value }));
    saveRespuesta(preguntaId, value);
  };

  // ============ SECURITY FIX: Server-side grading via RPC ============
  // Previously, the client calculated the score by reading es_correcta
  // from opciones_pregunta. Now, the DB function rpc_submit_intento
  // handles all grading with SECURITY DEFINER privileges.
  const handleSubmit = async (autoSubmit = false) => {
    if (!intentoId) return;
    
    setSubmitting(true);

    try {
      // Submit to server — grading happens in the DB via SECURITY DEFINER
      const { data, error } = await supabase.rpc('rpc_submit_intento', {
        p_id_intento: intentoId,
      });

      if (error) throw error;

      const resultado = data as { puntaje_obtenido: number; estado: string; tiene_abiertas: boolean };

      setPuntajeObtenido(resultado.puntaje_obtenido);
      setShowResults(true);
      
      toast({
        title: autoSubmit ? 'Tiempo agotado' : 'Evaluación enviada',
        description: autoSubmit 
          ? 'La evaluación se ha enviado automáticamente.'
          : resultado.tiene_abiertas
            ? 'Tu evaluación ha sido enviada. Las preguntas abiertas serán revisadas por el docente.'
            : 'Tu evaluación ha sido enviada y calificada.',
      });
    } catch (error: any) {
      console.error('Error submitting evaluacion:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo enviar la evaluación.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
      setConfirmSubmitOpen(false);
    }
  };

  if (loading) {
    return createPortal(
      <div className="fixed inset-0 z-[45] flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>,
      document.body
    );
  }

  if (showResults) {
    const porcentaje = puntajeTotal > 0 ? Math.round((puntajeObtenido / puntajeTotal) * 100) : 0;
    const aprobado = porcentaje >= 60;
    
    return createPortal(
      <div className="fixed inset-0 z-[45] overflow-y-auto bg-background">
        <div className="container max-w-2xl py-12 pt-[calc(3rem+env(safe-area-inset-top))] pb-[calc(3rem+env(safe-area-inset-bottom))]">
          <Card>
            <CardContent className="pt-8 text-center space-y-6">
              <CheckCircle2 className={`h-16 w-16 mx-auto ${aprobado ? 'text-success' : 'text-warning'}`} />
              <div>
                <h2 className="text-2xl font-bold">Evaluación Completada</h2>
                <p className="text-muted-foreground mt-2">
                  {aprobado ? '¡Felicitaciones!' : 'Sigue practicando'}
                </p>
              </div>
              <div className="text-4xl font-bold">
                {puntajeObtenido} / {puntajeTotal}
                <span className="text-lg font-normal text-muted-foreground ml-2">puntos</span>
              </div>
              <Progress value={porcentaje} className="h-3" />
              <p className="text-lg">{porcentaje}%</p>
              
              {preguntas.some(p => p.tipo === 'ABIERTA') && (
                <p className="text-sm text-muted-foreground">
                  Las preguntas abiertas están pendientes de revisión por el docente.
                </p>
              )}
              
              <Button onClick={onClose} size="lg">
                Cerrar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>,
      document.body
    );
  }

  // SECURITY: es_correcta is no longer sent to the client.
  // All questions use single-select (radio buttons) by default.
  const hasMultipleCorrectAnswers = (_pregunta: Pregunta) => {
    return false;
  };

  const handleCheckboxChange = (preguntaId: string, opcionId: string, checked: boolean) => {
    const currentSelections = respuestas[preguntaId]?.opciones_seleccionadas || [];
    let newSelections: string[];
    
    if (checked) {
      newSelections = [...currentSelections, opcionId];
    } else {
      newSelections = currentSelections.filter(id => id !== opcionId);
    }
    
    handleRespuestaChange(preguntaId, {
      id_pregunta: preguntaId,
      opciones_seleccionadas: newSelections,
      id_opcion: newSelections[0] || null, // Keep first selection for backwards compatibility
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[45] isolate flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="shrink-0 border-b bg-card px-4 pt-[env(safe-area-inset-top)] sm:px-6">
        <div className="mx-auto flex min-h-14 max-w-5xl items-center justify-between gap-3">
          <h2 className="min-w-0 flex-1 truncate font-semibold">{evaluacion.titulo}</h2>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            {timeRemaining !== null && (
              <div className={`flex items-center gap-1.5 whitespace-nowrap sm:gap-2 ${timeRemaining < 60 ? 'text-destructive' : ''}`}>
                <Clock className="h-4 w-4" />
                <span className="font-mono font-medium">{formatTime(timeRemaining)}</span>
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="shrink-0 border-b bg-muted/30 px-4 sm:px-6">
        <div className="mx-auto max-w-5xl py-3">
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              Pregunta {currentIndex + 1} de {preguntas.length}
            </span>
            <Progress value={((currentIndex + 1) / preguntas.length) * 100} className="flex-1 h-2" />
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {preguntasRespondidas} respondidas
            </span>
          </div>
        </div>
      </div>

      {/* Question content */}
      <div className="flex-1 overflow-y-auto bg-muted/20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto py-8">
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg leading-relaxed">
                <LatexText>{currentPregunta.enunciado}</LatexText>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {currentPregunta.puntaje} punto{Number(currentPregunta.puntaje) !== 1 ? 's' : ''}
                {hasMultipleCorrectAnswers(currentPregunta) && (
                  <span className="ml-2 text-primary">(Selecciona todas las correctas)</span>
                )}
              </p>
            </CardHeader>
            <CardContent>
              {currentPregunta.tipo === 'OPCION_MULTIPLE' && currentPregunta.opciones && (
                hasMultipleCorrectAnswers(currentPregunta) ? (
                  // Multiple correct answers - use checkboxes
                  <div className="space-y-3">
                    {currentPregunta.opciones.map((opcion) => {
                      const isSelected = respuestas[currentPregunta.id_pregunta]?.opciones_seleccionadas?.includes(opcion.id_opcion) || false;
                      return (
                        <div
                          key={opcion.id_opcion}
                          className={`flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                            isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                          }`}
                          onClick={() => handleCheckboxChange(currentPregunta.id_pregunta, opcion.id_opcion, !isSelected)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => 
                              handleCheckboxChange(currentPregunta.id_pregunta, opcion.id_opcion, checked === true)
                            }
                            id={opcion.id_opcion}
                          />
                          <Label htmlFor={opcion.id_opcion} className="flex-1 cursor-pointer">
                            <LatexText>{opcion.texto}</LatexText>
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // Single correct answer - use radio buttons
                  <RadioGroup
                    value={respuestas[currentPregunta.id_pregunta]?.id_opcion || ''}
                    onValueChange={(value) => {
                      handleRespuestaChange(currentPregunta.id_pregunta, {
                        id_pregunta: currentPregunta.id_pregunta,
                        id_opcion: value,
                      });
                    }}
                    className="space-y-3"
                  >
                    {currentPregunta.opciones.map((opcion) => {
                      const isSelected = respuestas[currentPregunta.id_pregunta]?.id_opcion === opcion.id_opcion;
                      return (
                        <div
                          key={opcion.id_opcion}
                          className={`flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                            isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                          }`}
                        >
                          <RadioGroupItem value={opcion.id_opcion} id={opcion.id_opcion} />
                          <Label htmlFor={opcion.id_opcion} className="flex-1 cursor-pointer">
                            <LatexText>{opcion.texto}</LatexText>
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                )
              )}

              {currentPregunta.tipo === 'ABIERTA' && (
                <Textarea
                  placeholder="Escribe tu respuesta aquí..."
                  className="min-h-[200px]"
                  value={respuestas[currentPregunta.id_pregunta]?.respuesta_texto || ''}
                  onChange={(e) => {
                    handleRespuestaChange(currentPregunta.id_pregunta, {
                      id_pregunta: currentPregunta.id_pregunta,
                      respuesta_texto: e.target.value,
                    });
                  }}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer navigation */}
      <div className="shrink-0 border-t bg-card px-4 pb-[env(safe-area-inset-bottom)] sm:px-6">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex(prev => prev - 1)}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>

          <div className="flex gap-2 overflow-x-auto py-2">
            {preguntas.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-8 h-8 rounded-full text-sm font-medium transition-colors flex-shrink-0 ${
                  index === currentIndex
                    ? 'bg-primary text-primary-foreground'
                    : respuestas[preguntas[index].id_pregunta]
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {currentIndex === preguntas.length - 1 ? (
            <Button
              onClick={() => setConfirmSubmitOpen(true)}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Enviar Evaluación
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentIndex(prev => prev + 1)}
            >
              Siguiente
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Confirm submit dialog */}
      <AlertDialog open={confirmSubmitOpen} onOpenChange={setConfirmSubmitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Enviar evaluación?</AlertDialogTitle>
            <AlertDialogDescription>
              Has respondido {preguntasRespondidas} de {preguntas.length} preguntas.
              {preguntasRespondidas < preguntas.length && (
                <span className="block mt-2 text-warning">
                  Tienes {preguntas.length - preguntasRespondidas} pregunta(s) sin responder.
                </span>
              )}
              Una vez enviada, no podrás modificar tus respuestas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleSubmit()}>
              Enviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>,
    document.body
  );
}
