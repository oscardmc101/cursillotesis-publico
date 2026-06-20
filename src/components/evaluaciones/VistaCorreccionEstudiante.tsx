import { useState, useEffect } from 'react';
import { X, CheckCircle2, XCircle, FileText, Loader2, Download, MessageSquareWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Evaluacion, Pregunta } from '@/hooks/useEvaluaciones';
import { LatexText } from './LatexText';

interface VistaCorreccionEstudianteProps {
  evaluacion: Evaluacion;
  preguntas: Pregunta[];
  idIntento: string;
  onClose: () => void;
}

interface Respuesta {
  id_respuesta: string;
  id_pregunta: string;
  id_opcion: string | null;
  respuesta_texto: string | null;
  puntaje_obtenido: number;
  es_correcta: boolean | null;
}

interface Retroalimentacion {
  comentario: string | null;
  archivo_url: string | null;
  fecha_creacion: string;
}

interface ReclamoEvaluacion {
  id_reclamo: string;
  id_respuesta: string;
  justificacion: string;
  estado: string;
  puntaje_original: number;
  puntaje_resuelto: number | null;
  respuesta_docente: string | null;
  fecha_reclamo: string;
  fecha_resolucion: string | null;
}

export function VistaCorreccionEstudiante({ evaluacion, preguntas, idIntento, onClose }: VistaCorreccionEstudianteProps) {
  const [respuestas, setRespuestas] = useState<Record<string, Respuesta>>({});
  const [reclamos, setReclamos] = useState<Record<string, ReclamoEvaluacion>>({});
  const [retroalimentacion, setRetroalimentacion] = useState<Retroalimentacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [puntajeObtenido, setPuntajeObtenido] = useState(0);
  const [estadoIntento, setEstadoIntento] = useState<string>('CORREGIDO');
  const [reloadKey, setReloadKey] = useState(0);
  const [reclamoTarget, setReclamoTarget] = useState<{ pregunta: Pregunta; respuesta: Respuesta } | null>(null);
  const [justificacion, setJustificacion] = useState('');
  const [sendingReclamo, setSendingReclamo] = useState(false);

  const puntajeTotal = preguntas.reduce((sum, p) => sum + Number(p.puntaje), 0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // 1. Fetch intento
        const { data: intentoData } = await supabase
          .from('intentos_evaluacion')
          .select('estado')
          .eq('id_intento', idIntento)
          .maybeSingle();

        if (intentoData?.estado) {
          setEstadoIntento(intentoData.estado);
        }

        // 2. Fetch respuestas
        const { data: respuestasData } = await supabase
          .from('respuestas_intento')
          .select('*')
          .eq('id_intento', idIntento);

        if (respuestasData) {
          const map: Record<string, Respuesta> = {};
          let total = 0;
          respuestasData.forEach(r => {
            map[r.id_pregunta] = r as Respuesta;
            total += Number(r.puntaje_obtenido || 0);
          });
          setRespuestas(map);
          setPuntajeObtenido(total);
        }

        const respuestaIds = (respuestasData || []).map((r) => r.id_respuesta);
        const { data: reclamosData, error: reclamosErr } = respuestaIds.length > 0
          ? await supabase
              .from('reclamos_evaluacion')
              .select('*')
              .in('id_respuesta', respuestaIds)
              .order('fecha_reclamo', { ascending: false })
          : { data: [], error: null };

        if (reclamosErr) {
          console.error('Error cargando reclamos:', reclamosErr);
        }

        const reclamosMap: Record<string, ReclamoEvaluacion> = {};
        (reclamosData || []).forEach((r: any) => {
          if (!reclamosMap[r.id_respuesta]) {
            reclamosMap[r.id_respuesta] = r;
          }
        });
        setReclamos(reclamosMap);

        // 3. Fetch retroalimentacion
        const { data: retroData } = await supabase
          .from('retroalimentacion_intento')
          .select('*')
          .eq('id_intento', idIntento)
          .maybeSingle();

        if (retroData) {
          setRetroalimentacion(retroData);
        }
      } catch (error) {
        console.error('Error cargando corrección:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [idIntento, reloadKey]);

  const handleDescargarRetroalimentacion = async (ruta: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('archivos_tareas')
        .download(ruta);
      
      if (error) throw error;
      
      const fileName = ruta.split('/').pop() || 'retroalimentacion';
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading retroalimentacion:', error);
      toast({
        title: 'Error',
        description: 'No se pudo descargar el archivo de retroalimentación.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Cargando correcciones...</p>
      </div>
    );
  }

  const porcentaje = puntajeTotal > 0 ? Math.round((puntajeObtenido / puntajeTotal) * 100) : 0;
  const aprobado = porcentaje >= 60;
  const reclamosList = Object.values(reclamos);
  const tieneReclamoPendiente = reclamosList.some((r) => r.estado === 'PENDIENTE');
  const puedeReclamar = estadoIntento === 'CORREGIDO' || estadoIntento === 'AUTOCORREGIDO';

  const handleEnviarReclamo = async () => {
    const respuestaId = reclamoTarget?.respuesta.id_respuesta;
    if (!respuestaId) return;

    if (!justificacion.trim()) {
      toast({
        title: 'Justificacion requerida',
        description: 'Explica por que consideras que la correccion debe revisarse.',
        variant: 'destructive',
      });
      return;
    }

    setSendingReclamo(true);
    try {
      const { error } = await supabase.rpc('rpc_enviar_reclamo_evaluacion', {
        p_id_respuesta: respuestaId,
        p_justificacion: justificacion.trim(),
      });

      if (error) throw error;

      toast({
        title: 'Reclamo enviado',
        description: 'El docente vera tu reclamo en el panel de correcciones.',
      });
      setReclamoTarget(null);
      setJustificacion('');
      setReloadKey((current) => current + 1);
    } catch (error: any) {
      toast({
        title: 'No se pudo enviar el reclamo',
        description: error.message || 'Intenta nuevamente.',
        variant: 'destructive',
      });
    } finally {
      setSendingReclamo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-hidden flex flex-col">
      {/* Header */}
      <div className="border-b bg-card px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold truncate">Revisión: {evaluacion.titulo}</h2>
            <Badge variant={aprobado ? 'default' : 'secondary'}>
              {puntajeObtenido} / {puntajeTotal} pts ({porcentaje}%)
            </Badge>
            {estadoIntento === 'RECLAMADO' && (
              <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30">
                En reclamo
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-muted/20 px-4 sm:px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {estadoIntento === 'RECLAMADO' && (
            <Card className="border-amber-500/30 bg-amber-500/10">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <MessageSquareWarning className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-700">Reclamo en revision</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      El docente esta revisando tu reclamo. Cuando se resuelva, la evaluacion volvera a figurar como corregida.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Global Feedback Section */}
          {retroalimentacion && (retroalimentacion.comentario || retroalimentacion.archivo_url) && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Comentarios del Docente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {retroalimentacion.comentario && (
                  <p className="text-sm whitespace-pre-wrap">{retroalimentacion.comentario}</p>
                )}
                
                {retroalimentacion.archivo_url && (
                  <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">Archivo adjunto de corrección</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDescargarRetroalimentacion(retroalimentacion.archivo_url!)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Descargar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Individual Questions */}
          <div className="space-y-6">
            {preguntas.map((pregunta, index) => {
              const respuesta = respuestas[pregunta.id_pregunta];
              const esOpcionMultiple = pregunta.tipo === 'OPCION_MULTIPLE';
              const reclamo = respuesta?.id_respuesta ? reclamos[respuesta.id_respuesta] : undefined;

              return (
                <Card key={pregunta.id_pregunta} className="shadow-sm">
                  <CardHeader className="pb-4 border-b bg-muted/10">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            Pregunta #{index + 1}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {esOpcionMultiple ? 'Opción múltiple' : 'Abierta'}
                          </Badge>
                          {respuesta && typeof respuesta.es_correcta === 'boolean' && esOpcionMultiple && (
                            respuesta.es_correcta ? (
                              <Badge className="bg-success/10 text-success border-success/20 gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Correcta
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 gap-1 hover:bg-destructive/20 hover:text-destructive">
                                <XCircle className="h-3 w-3" /> Incorrecta
                              </Badge>
                            )
                          )}
                        </div>
                        <CardTitle className="text-base leading-relaxed mt-2">
                          <LatexText>{pregunta.enunciado}</LatexText>
                        </CardTitle>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <div className="font-semibold text-lg">
                          {respuesta ? respuesta.puntaje_obtenido : 0} <span className="text-sm font-normal text-muted-foreground">/ {pregunta.puntaje}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Puntos</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    {/* Multiple Choice Options */}
                    {esOpcionMultiple && pregunta.opciones && (
                      <div className="space-y-2">
                        {pregunta.opciones.map((opcion) => {
                          const isSelected = respuesta?.id_opcion === opcion.id_opcion;
                          return (
                            <div
                              key={opcion.id_opcion}
                              className={`flex items-center justify-between p-3 rounded-md border ${
                                opcion.es_correcta 
                                  ? 'bg-success/10 border-success/30' 
                                  : isSelected 
                                    ? 'bg-destructive/10 border-destructive/30' 
                                    : 'opacity-70'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`flex items-center justify-center h-5 w-5 rounded-full border ${
                                  isSelected ? 'border-primary' : 'border-muted-foreground'
                                }`}>
                                  {isSelected && <div className="h-2 w-2 rounded-full bg-primary" />}
                                </div>
                                <span className={opcion.es_correcta ? 'font-medium' : ''}>
                                  <LatexText>{opcion.texto}</LatexText>
                                </span>
                              </div>
                              {opcion.es_correcta && (
                                <span className="text-xs font-semibold text-success flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> Respuesta correcta
                                </span>
                              )}
                              {!opcion.es_correcta && isSelected && (
                                <span className="text-xs font-semibold text-destructive flex items-center gap-1">
                                  <XCircle className="h-3 w-3" /> Tu respuesta
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Open Question Answer */}
                    {!esOpcionMultiple && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Tu respuesta:</p>
                        <div className="p-4 bg-muted/30 border rounded-md min-h-[100px] text-sm whitespace-pre-wrap">
                          {respuesta?.respuesta_texto || <span className="text-muted-foreground italic">Sin respuesta</span>}
                        </div>
                      </div>
                    )}

                    {reclamo && (
                      <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 space-y-3">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <p className="font-medium text-sm flex items-center gap-2 text-amber-700">
                            <MessageSquareWarning className="h-4 w-4" />
                            Reclamo enviado
                          </p>
                          <Badge
                            variant="outline"
                            className={
                              reclamo.estado === 'ACEPTADO'
                                ? 'border-emerald-500/30 text-emerald-700'
                                : reclamo.estado === 'RECHAZADO'
                                ? 'border-red-500/30 text-red-700'
                                : 'border-amber-500/30 text-amber-700'
                            }
                          >
                            {reclamo.estado === 'PENDIENTE'
                              ? 'Pendiente'
                              : reclamo.estado === 'ACEPTADO'
                              ? 'Aceptado'
                              : 'Rechazado'}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Tu justificacion:
                          </p>
                          <p className="text-sm whitespace-pre-wrap">{reclamo.justificacion}</p>
                        </div>
                        {reclamo.respuesta_docente && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              Respuesta docente:
                            </p>
                            <p className="text-sm whitespace-pre-wrap">
                              {reclamo.respuesta_docente}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {respuesta && puedeReclamar && !tieneReclamoPendiente && !reclamo && (
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => setReclamoTarget({ pregunta, respuesta })}
                        >
                          <MessageSquareWarning className="h-4 w-4" />
                          Reclamar correccion
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      <Dialog open={!!reclamoTarget} onOpenChange={(open) => {
        if (!open && !sendingReclamo) {
          setReclamoTarget(null);
          setJustificacion('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reclamar correccion</DialogTitle>
            <DialogDescription>
              Indica por que consideras que esta pregunta debe revisarse nuevamente.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={justificacion}
            onChange={(e) => setJustificacion(e.target.value)}
            placeholder="Escribe tu justificacion..."
            className="min-h-[140px]"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReclamoTarget(null);
                setJustificacion('');
              }}
              disabled={sendingReclamo}
            >
              Cancelar
            </Button>
            <Button onClick={handleEnviarReclamo} disabled={sendingReclamo}>
              {sendingReclamo && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enviar reclamo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
