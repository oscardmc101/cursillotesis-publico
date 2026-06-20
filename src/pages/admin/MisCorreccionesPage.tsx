import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardCheck,
  FileCheck,
  Loader2,
  Eye,
  CheckCircle2,
  XCircle,
  BookOpen,
  Calendar,
  Star,
  FileText,
  Download,
  ChevronDown,
  ChevronUp,
  X,
  UserCircle,
  MessageSquareWarning,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useCurrentUsuario } from '@/hooks/useCurrentUsuario';
import { useCursillo } from '@/contexts/CursilloContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { LatexText } from '@/components/evaluaciones/LatexText';
import { ARCHIVOS_TAREAS_BUCKET, downloadStorageFile } from '@/lib/storageFiles';

// ─── Types ───────────────────────────────────────────────────────────────────

interface EvaluacionCorregida {
  id_intento: string;
  id_evaluacion: string;
  estado: string;
  puntaje_obtenido: number | null;
  fecha_envio: string | null;
  puntaje_total: number; // sum of preguntas.puntaje
  titulo: string;
}

interface TareaCorregida {
  id_entrega: string;
  id_tarea: string;
  calificacion: number | null;
  comentario_docente: string | null;
  retroalimentacion_archivo_url: string | null;
  fecha_correccion: string | null;
  titulo: string;
  puntaje_maximo: number | null;
}

interface PreguntaConRespuesta {
  id_pregunta: string;
  enunciado: string;
  tipo: string;
  puntaje: number;
  opciones?: Array<{ id_opcion: string; texto: string; es_correcta: boolean }>;
  respuesta?: {
    id_respuesta: string;
    id_opcion: string | null;
    respuesta_texto: string | null;
    puntaje_obtenido: number;
    es_correcta: boolean | null;
  };
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

interface RetroalimentacionData {
  comentario: string | null;
  archivo_url: string | null;
  docente?: {
    nombres: string;
    apellidos: string;
  } | null;
}

// ─── Modal de Evaluación ─────────────────────────────────────────────────────

function DetalleEvaluacion({
  idIntento,
  titulo,
  puntajeObtenidoCard,
  puntajeTotalCard,
  estadoCard,
  onClose,
}: {
  idIntento: string;
  titulo: string;
  puntajeObtenidoCard: number;
  puntajeTotalCard: number;
  estadoCard: string;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [preguntas, setPreguntas] = useState<PreguntaConRespuesta[]>([]);
  const [reclamos, setReclamos] = useState<Record<string, ReclamoEvaluacion>>({});
  const [retroalimentacion, setRetroalimentacion] = useState<RetroalimentacionData | null>(null);
  const [puntajeObtenido, setPuntajeObtenido] = useState(puntajeObtenidoCard);
  const [puntajeTotal, setPuntajeTotal] = useState(puntajeTotalCard);
  const [estadoIntento, setEstadoIntento] = useState(estadoCard);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [reclamoTarget, setReclamoTarget] = useState<PreguntaConRespuesta | null>(null);
  const [justificacion, setJustificacion] = useState('');
  const [sendingReclamo, setSendingReclamo] = useState(false);

  const handleDescargarRetroalimentacion = async (ruta: string) => {
    try {
      await downloadStorageFile(ruta, ARCHIVOS_TAREAS_BUCKET, 'retroalimentacion');
    } catch (error) {
      console.error('Error downloading retroalimentacion:', error);
      toast({
        title: 'Error',
        description: 'No se pudo descargar el archivo de retroalimentacion.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Get intento → id_evaluacion
        const { data: intento } = await supabase
          .from('intentos_evaluacion')
          .select('id_evaluacion, estado')
          .eq('id_intento', idIntento)
          .single();

        if (!intento) return;
        setEstadoIntento(intento.estado || estadoCard);

        // 2. Get preguntas with opciones (no 'orden' column exists)
        const { data: preguntasData, error: pregErr } = await supabase
          .from('preguntas_evaluacion')
          .select('id_pregunta, enunciado, tipo, puntaje, opciones_pregunta(*)')
          .eq('id_evaluacion', intento.id_evaluacion);

        if (pregErr) console.error('Error preguntas:', pregErr);

        // 3. Get respuestas del intento
        const { data: respuestasData, error: respErr } = await supabase
          .from('respuestas_intento')
          .select('id_respuesta, id_pregunta, id_opcion, respuesta_texto, puntaje_obtenido, es_correcta')
          .eq('id_intento', idIntento);

        if (respErr) console.error('Error respuestas:', respErr);

        const responseIds = (respuestasData || []).map((r) => r.id_respuesta);
        const { data: reclamosData, error: reclamosErr } = responseIds.length > 0
          ? await supabase
              .from('reclamos_evaluacion')
              .select('*')
              .in('id_respuesta', responseIds)
              .order('fecha_reclamo', { ascending: false })
          : { data: [], error: null };

        if (reclamosErr) console.error('Error reclamos:', reclamosErr);

        const reclamosMap: Record<string, ReclamoEvaluacion> = {};
        (reclamosData || []).forEach((r: any) => {
          if (!reclamosMap[r.id_respuesta]) {
            reclamosMap[r.id_respuesta] = r;
          }
        });
        setReclamos(reclamosMap);

        // 4. Get retroalimentacion with docente name
        const { data: retroData, error: retroErr } = await supabase
          .from('retroalimentacion_intento')
          .select('comentario, archivo_url, id_docente')
          .eq('id_intento', idIntento)
          .maybeSingle();

        if (retroErr) console.error('Error retro:', retroErr);

        // 5. If there's a docente, fetch their name
        let docenteInfo = null;
        if (retroData?.id_docente) {
          const { data: docData } = await supabase
            .from('usuarios')
            .select('nombres, apellidos')
            .eq('id_usuario', retroData.id_docente)
            .single();
          docenteInfo = docData;
        }

        if (retroData) {
          setRetroalimentacion({
            comentario: retroData.comentario,
            archivo_url: retroData.archivo_url,
            docente: docenteInfo,
          });
        }

        // Build map of respuestas
        const respuestasMap: Record<string, any> = {};
        (respuestasData || []).forEach((r) => {
          respuestasMap[r.id_pregunta] = r;
        });

        let totalPts = 0;
        let obtenidoPts = 0;

        const mapped: PreguntaConRespuesta[] = (preguntasData || []).map((p: any) => {
          totalPts += Number(p.puntaje || 0);
          const resp = respuestasMap[p.id_pregunta];
          if (resp) obtenidoPts += Number(resp.puntaje_obtenido || 0);
          return {
            id_pregunta: p.id_pregunta,
            enunciado: p.enunciado,
            tipo: p.tipo,
            puntaje: Number(p.puntaje),
            opciones: p.opciones_pregunta || [],
            respuesta: resp
              ? {
                  id_respuesta: resp.id_respuesta,
                  id_opcion: resp.id_opcion,
                  respuesta_texto: resp.respuesta_texto,
                  puntaje_obtenido: Number(resp.puntaje_obtenido || 0),
                  es_correcta: resp.es_correcta,
                }
              : undefined,
          };
        });

        setPreguntas(mapped);
        // Use computed totals if available; fall back to card values
        setPuntajeTotal(totalPts > 0 ? totalPts : puntajeTotalCard);
        setPuntajeObtenido(obtenidoPts > 0 ? obtenidoPts : puntajeObtenidoCard);
      } catch (err) {
        console.error('Error cargando corrección:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [idIntento, puntajeObtenidoCard, puntajeTotalCard, estadoCard, reloadKey]);

  const porcentaje = puntajeTotal > 0 ? Math.round((puntajeObtenido / puntajeTotal) * 100) : 0;
  const aprobado = porcentaje >= 60;
  const reclamosList = Object.values(reclamos);
  const tieneReclamoPendiente = reclamosList.some((r) => r.estado === 'PENDIENTE');
  const puedeReclamar = estadoIntento === 'CORREGIDO' || estadoIntento === 'AUTOCORREGIDO';

  const handleEnviarReclamo = async () => {
    const respuestaId = reclamoTarget?.respuesta?.id_respuesta;
    if (!respuestaId) return;

    if (!justificacion.trim()) {
      toast({
        title: 'Justificación requerida',
        description: 'Explica por qué consideras que la corrección debe revisarse.',
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
        description: 'El docente verá tu reclamo en el panel de correcciones.',
      });
      setReclamoTarget(null);
      setJustificacion('');
      setReloadKey((current) => current + 1);
    } catch (error: any) {
      toast({
        title: 'No se pudo enviar el reclamo',
        description: error.message || 'Inténtalo nuevamente.',
        variant: 'destructive',
      });
    } finally {
      setSendingReclamo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="border-b bg-card shadow-sm px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between h-14">
          <div className="flex items-center gap-3 min-w-0">
            <ClipboardCheck className="h-5 w-5 text-primary shrink-0" />
            <h2 className="font-semibold truncate">{titulo}</h2>
            <Badge
              className={`shrink-0 ${
                aprobado
                  ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-600 border-amber-500/30'
              }`}
            >
              {puntajeObtenido}/{puntajeTotal} pts · {porcentaje}%
            </Badge>
            {estadoIntento === 'RECLAMADO' && (
              <Badge className="shrink-0 bg-amber-500/15 text-amber-700 border-amber-500/30">
                En reclamo
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-8 bg-muted/20">
          <div className="max-w-4xl mx-auto space-y-6">
            {estadoIntento === 'RECLAMADO' && (
              <Card className="border-amber-500/30 bg-amber-500/10">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <MessageSquareWarning className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-700">Reclamo en revisión</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        El docente está revisando tu reclamo. La evaluación volverá a figurar como corregida cuando se resuelva.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Score card */}
            <Card
              className={`border-2 ${
                aprobado
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-amber-500/30 bg-amber-500/5'
              }`}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-muted-foreground">Progreso</span>
                  <span
                    className={`text-2xl font-bold ${
                      aprobado ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    {porcentaje}%
                  </span>
                </div>
                <Progress value={porcentaje} className="h-3" />
                <p className="text-xs text-muted-foreground mt-2">
                  {puntajeObtenido} de {puntajeTotal} puntos obtenidos
                </p>
              </CardContent>
            </Card>

            {/* Retroalimentacion del docente */}
            {retroalimentacion &&
              (retroalimentacion.comentario || retroalimentacion.archivo_url) && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Comentarios del Docente
                    </CardTitle>
                    {retroalimentacion.docente && (
                      <div className="flex items-center gap-2 mt-1">
                        <UserCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {retroalimentacion.docente.nombres}{' '}
                          {retroalimentacion.docente.apellidos}
                        </span>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {retroalimentacion.comentario && (
                      <p className="text-sm whitespace-pre-wrap">
                        {retroalimentacion.comentario}
                      </p>
                    )}
                    {retroalimentacion.archivo_url && (
                      <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 text-sm">Archivo adjunto</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleDescargarRetroalimentacion(retroalimentacion.archivo_url!)
                          }
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Descargar
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

            {/* Preguntas */}
            {preguntas.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Detalle por pregunta
                </h3>
                {preguntas.map((pregunta, index) => {
                  const esMultiple = pregunta.tipo === 'OPCION_MULTIPLE';
                  const resp = pregunta.respuesta;
                  const reclamo = resp?.id_respuesta ? reclamos[resp.id_respuesta] : undefined;
                  return (
                    <Card key={pregunta.id_pregunta} className="shadow-sm">
                      <CardHeader className="pb-4 border-b bg-muted/10">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-medium text-muted-foreground">
                                #{index + 1}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {esMultiple ? 'Opción múltiple' : 'Abierta'}
                              </Badge>
                              {resp &&
                                typeof resp.es_correcta === 'boolean' &&
                                esMultiple &&
                                (resp.es_correcta ? (
                                  <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1 text-xs">
                                    <CheckCircle2 className="h-3 w-3" /> Correcta
                                  </Badge>
                                ) : (
                                  <Badge className="bg-red-500/15 text-red-600 border-red-500/30 gap-1 text-xs">
                                    <XCircle className="h-3 w-3" /> Incorrecta
                                  </Badge>
                                ))}
                            </div>
                            <div className="text-sm font-medium leading-relaxed">
                              <LatexText>{pregunta.enunciado}</LatexText>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-lg font-bold">
                              {resp?.puntaje_obtenido ?? 0}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {' '}
                              / {pregunta.puntaje}
                            </span>
                            <p className="text-xs text-muted-foreground">pts</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        {esMultiple && pregunta.opciones ? (
                          <div className="space-y-2">
                            {pregunta.opciones.map((opcion) => {
                              const selected = resp?.id_opcion === opcion.id_opcion;
                              return (
                                <div
                                  key={opcion.id_opcion}
                                  className={`flex items-center justify-between p-3 rounded-md border text-sm ${
                                    opcion.es_correcta
                                      ? 'bg-emerald-500/10 border-emerald-500/30'
                                      : selected
                                      ? 'bg-red-500/10 border-red-500/30'
                                      : 'opacity-60'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                                        selected
                                          ? 'border-primary'
                                          : 'border-muted-foreground'
                                      }`}
                                    >
                                      {selected && (
                                        <div className="h-2 w-2 rounded-full bg-primary" />
                                      )}
                                    </div>
                                    <span className={opcion.es_correcta ? 'font-medium' : ''}>
                                      <LatexText>{opcion.texto}</LatexText>
                                    </span>
                                  </div>
                                  {opcion.es_correcta && (
                                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                                      <CheckCircle2 className="h-3 w-3" /> Correcta
                                    </span>
                                  )}
                                  {!opcion.es_correcta && selected && (
                                    <span className="text-xs text-red-600 font-semibold flex items-center gap-1">
                                      <XCircle className="h-3 w-3" /> Tu respuesta
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">
                              Tu respuesta:
                            </p>
                            <div className="p-3 bg-muted/30 border rounded-md text-sm min-h-[80px] whitespace-pre-wrap">
                              {resp?.respuesta_texto || (
                                <span className="text-muted-foreground italic">
                                  Sin respuesta
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {reclamo && (
                          <div className="mt-4 p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 space-y-3">
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

                        {resp && puedeReclamar && !tieneReclamoPendiente && !reclamo && (
                          <div className="mt-4 flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => setReclamoTarget(pregunta)}
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
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No se encontraron preguntas para esta evaluación.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

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

// ─── Main Page ────────────────────────────────────────────────────────────────

const MisCorreccionesPage = () => {
  const { toast } = useToast();
  const { idUsuario, loading: loadingUsuario } = useCurrentUsuario();
  const { idCursilloActivo: CURSILLO_ID, loading: loadingCursillo } = useCursillo();

  const [evaluaciones, setEvaluaciones] = useState<EvaluacionCorregida[]>([]);
  const [tareas, setTareas] = useState<TareaCorregida[]>([]);
  const [loadingEvals, setLoadingEvals] = useState(true);
  const [loadingTareas, setLoadingTareas] = useState(true);

  // Modal / expanded state
  const [viewingIntento, setViewingIntento] = useState<{
    id: string;
    titulo: string;
    estado: string;
    puntajeObtenido: number;
    puntajeTotal: number;
  } | null>(null);
  const [expandedTarea, setExpandedTarea] = useState<string | null>(null);

  const handleDescargarRetroalimentacion = async (ruta: string) => {
    try {
      await downloadStorageFile(ruta, ARCHIVOS_TAREAS_BUCKET, 'retroalimentacion');
    } catch (error) {
      console.error('Error downloading retroalimentacion:', error);
      toast({
        title: 'Error',
        description: 'No se pudo descargar el archivo de retroalimentacion.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (loadingUsuario || loadingCursillo) return;

    if (!idUsuario || !CURSILLO_ID) {
      setEvaluaciones([]);
      setTareas([]);
      setLoadingEvals(false);
      setLoadingTareas(false);
      return;
    }

    // Fetch corrected evaluations with total points per evaluation
    const fetchEvaluaciones = async () => {
      setLoadingEvals(true);
      setEvaluaciones([]);

      // Fetch intentos con correccion visible para el alumno
      const { data: intentosData, error } = await supabase
        .from('intentos_evaluacion')
        .select(`
          id_intento,
          id_evaluacion,
          estado,
          puntaje_obtenido,
          fecha_envio,
          evaluaciones!inner (
            titulo,
            lecciones!inner (
              modulos!inner (
                cursos!inner (
                  id_cursillo
                )
              )
            )
          )
        `)
        .eq('id_usuario', idUsuario)
        .eq('evaluaciones.lecciones.modulos.cursos.id_cursillo', CURSILLO_ID)
        .in('estado', ['CORREGIDO', 'AUTOCORREGIDO', 'RECLAMADO'])
        .order('fecha_envio', { ascending: false });

      if (error) {
        console.error('Error fetching evaluaciones:', error);
        setLoadingEvals(false);
        return;
      }

      if (!intentosData || intentosData.length === 0) {
        setEvaluaciones([]);
        setLoadingEvals(false);
        return;
      }

      // Fetch sum of preguntas per evaluacion
      const evalIds = [...new Set((intentosData as any[]).map((i) => i.id_evaluacion))];
      const { data: preguntasData } = await supabase
        .from('preguntas_evaluacion')
        .select('id_evaluacion, puntaje')
        .in('id_evaluacion', evalIds);

      // Build map: id_evaluacion → total puntaje
      const totalPorEval: Record<string, number> = {};
      (preguntasData || []).forEach((p: any) => {
        totalPorEval[p.id_evaluacion] = (totalPorEval[p.id_evaluacion] || 0) + Number(p.puntaje || 0);
      });

      const mapped: EvaluacionCorregida[] = (intentosData as any[]).map((i) => ({
        id_intento: i.id_intento,
        id_evaluacion: i.id_evaluacion,
        estado: i.estado,
        puntaje_obtenido: Number(i.puntaje_obtenido || 0),
        fecha_envio: i.fecha_envio,
        puntaje_total: totalPorEval[i.id_evaluacion] || 0,
        titulo: i.evaluaciones?.titulo || 'Evaluación',
      }));

      setEvaluaciones(mapped);
      setLoadingEvals(false);
    };

    // Fetch corrected tasks
    const fetchTareas = async () => {
      setLoadingTareas(true);
      setTareas([]);
      const { data, error } = await supabase
        .from('entregas_tareas')
        .select(`
          id_entrega,
          id_tarea,
          calificacion,
          comentario_docente,
          retroalimentacion_archivo_url,
          fecha_correccion,
          tareas!inner (
            titulo,
            puntaje_maximo,
            lecciones!inner (
              modulos!inner (
                cursos!inner (
                  id_cursillo
                )
              )
            )
          )
        `)
        .eq('id_usuario', idUsuario)
        .eq('tareas.lecciones.modulos.cursos.id_cursillo', CURSILLO_ID)
        .eq('estado', 'CALIFICADO')
        .order('fecha_correccion', { ascending: false });

      if (!error && data) {
        const mapped: TareaCorregida[] = (data as any[]).map((t) => ({
          id_entrega: t.id_entrega,
          id_tarea: t.id_tarea,
          calificacion: t.calificacion,
          comentario_docente: t.comentario_docente,
          retroalimentacion_archivo_url: t.retroalimentacion_archivo_url,
          fecha_correccion: t.fecha_correccion,
          titulo: t.tareas?.titulo || 'Tarea',
          puntaje_maximo: t.tareas?.puntaje_maximo ?? null,
        }));
        setTareas(mapped);
      }
      setLoadingTareas(false);
    };

    fetchEvaluaciones();
    fetchTareas();
  }, [idUsuario, CURSILLO_ID, loadingUsuario, loadingCursillo]);

  const formatFecha = (dateString: string | null) => {
    if (!dateString) return '—';
    return format(new Date(dateString), "d 'de' MMM, yyyy", { locale: es });
  };

  if (loadingUsuario || loadingCursillo) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {/* Fullscreen modal for evaluation detail */}
      {viewingIntento && (
        <DetalleEvaluacion
          idIntento={viewingIntento.id}
          titulo={viewingIntento.titulo}
          puntajeObtenidoCard={viewingIntento.puntajeObtenido}
          puntajeTotalCard={viewingIntento.puntajeTotal}
          estadoCard={viewingIntento.estado}
          onClose={() => setViewingIntento(null)}
        />
      )}

      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            Mis Correcciones
          </h1>
          <p className="text-muted-foreground mt-1">
            Revisa el detalle de las evaluaciones y tareas que han sido corregidas por tu
            docente.
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-primary">{evaluaciones.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Evaluaciones con correccion</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-emerald-600">{tareas.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Tareas calificadas</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="evaluaciones">
          <TabsList className="w-full">
            <TabsTrigger value="evaluaciones" className="flex-1 gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Cuestionarios
              {evaluaciones.length > 0 && (
                <Badge variant="secondary" className="text-xs ml-1">
                  {evaluaciones.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="tareas" className="flex-1 gap-2">
              <FileCheck className="h-4 w-4" />
              Tareas
              {tareas.length > 0 && (
                <Badge variant="secondary" className="text-xs ml-1">
                  {tareas.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Evaluaciones Tab ── */}
          <TabsContent value="evaluaciones" className="mt-4">
            {loadingEvals ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : evaluaciones.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <ClipboardCheck className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="font-medium text-muted-foreground">
                    Sin cuestionarios corregidos
                  </p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    Aquí aparecerán los cuestionarios una vez que tu docente los revise.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {evaluaciones.map((ev) => {
                  const puntajeObtenido = Number(ev.puntaje_obtenido || 0);
                  const puntajeTotal = ev.puntaje_total;
                  const porcentaje =
                    puntajeTotal > 0
                      ? Math.round((puntajeObtenido / puntajeTotal) * 100)
                      : 0;

                  return (
                    <Card
                      key={ev.id_intento}
                      className="hover:shadow-md transition-shadow border-l-4 border-l-primary/40"
                    >
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <ClipboardCheck className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold truncate">{ev.titulo}</p>
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatFecha(ev.fecha_envio)}
                                </span>
                                {/* Puntaje con total */}
                                <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
                                  <Star className="h-3 w-3 mr-1" />
                                  {puntajeObtenido}/{puntajeTotal} pts
                                  {puntajeTotal > 0 && (
                                    <span className="ml-1 opacity-70">({porcentaje}%)</span>
                                  )}
                                </Badge>
                                {ev.estado === 'RECLAMADO' && (
                                  <Badge className="text-xs bg-amber-500/10 text-amber-700 border-amber-500/30">
                                    En reclamo
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() =>
                              setViewingIntento({
                                id: ev.id_intento,
                                titulo: ev.titulo,
                                estado: ev.estado,
                                puntajeObtenido,
                                puntajeTotal,
                              })
                            }
                            className="shrink-0"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver corrección
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── Tareas Tab ── */}
          <TabsContent value="tareas" className="mt-4">
            {loadingTareas ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : tareas.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <FileCheck className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="font-medium text-muted-foreground">Sin tareas calificadas</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    Aquí aparecerán las tareas una vez que tu docente las califique.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {tareas.map((tarea) => {
                  const calificacion = Number(tarea.calificacion || 0);
                  const isExpanded = expandedTarea === tarea.id_entrega;

                  return (
                    <Card
                      key={tarea.id_entrega}
                      className="hover:shadow-md transition-shadow border-l-4 border-l-emerald-500/40"
                    >
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                              <FileCheck className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold truncate">{tarea.titulo}</p>
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatFecha(tarea.fecha_correccion)}
                                </span>
                                <Badge className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                  <Star className="h-3 w-3 mr-1" />
                                  {calificacion}/{tarea.puntaje_maximo ?? 100}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setExpandedTarea(isExpanded ? null : tarea.id_entrega)
                            }
                            className="shrink-0"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-4 w-4 mr-1" />
                                Ocultar
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-4 w-4 mr-1" />
                                Ver corrección
                              </>
                            )}
                          </Button>
                        </div>

                        {/* Expanded retroalimentacion */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t space-y-3">
                            {tarea.comentario_docente ? (
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                  <FileText className="h-3 w-3" />
                                  Comentario del docente:
                                </p>
                                <div className="p-3 bg-muted/30 rounded-md text-sm whitespace-pre-wrap border">
                                  {tarea.comentario_docente}
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">
                                El docente no dejó comentarios escritos.
                              </p>
                            )}
                            {tarea.retroalimentacion_archivo_url && (
                              <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="flex-1 text-sm font-medium">
                                  Archivo adjunto del docente
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleDescargarRetroalimentacion(
                                      tarea.retroalimentacion_archivo_url!
                                    )
                                  }
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  Descargar
                                </Button>
                              </div>
                            )}
                            <Link
                              to={`/tareas/${tarea.id_tarea}`}
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <BookOpen className="h-3 w-3" />
                              Ir a la tarea
                            </Link>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default MisCorreccionesPage;
