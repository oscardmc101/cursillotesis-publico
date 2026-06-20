import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  Upload,
  FileText,
  Save,
  MessageSquareWarning,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUsuario } from '@/hooks/useCurrentUsuario';
import type { Pregunta, Opcion, RespuestaIntento } from '@/hooks/useEvaluaciones';
import { LatexText } from '@/components/evaluaciones/LatexText';

interface IntentoDetalle {
  id_intento: string;
  id_evaluacion: string;
  id_usuario: string;
  estado: string;
  puntaje_obtenido: number;
  fecha_inicio: string;
  fecha_envio: string | null;
}

interface EvaluacionInfo {
  id_evaluacion: string;
  titulo: string;
  descripcion: string | null;
  id_leccion: string;
}

interface UsuarioInfo {
  id_usuario: string;
  nombres: string;
  apellidos: string;
  correo: string;
}

interface PreguntaConRespuesta extends Pregunta {
  respuesta?: RespuestaIntento;
  puntaje_asignado: number;
  reclamo?: ReclamoEvaluacion;
}

interface ReclamoEvaluacion {
  id_reclamo: string;
  id_intento: string;
  id_respuesta: string;
  justificacion: string;
  estado: string;
  puntaje_original: number;
  puntaje_resuelto: number | null;
  respuesta_docente: string | null;
  fecha_reclamo: string;
}

const CorreccionEvaluacion = () => {
  const { idIntento } = useParams<{ idIntento: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { idUsuario: idDocente } = useCurrentUsuario();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [intento, setIntento] = useState<IntentoDetalle | null>(null);
  const [evaluacion, setEvaluacion] = useState<EvaluacionInfo | null>(null);
  const [estudiante, setEstudiante] = useState<UsuarioInfo | null>(null);
  const [preguntasConRespuesta, setPreguntasConRespuesta] = useState<PreguntaConRespuesta[]>([]);
  const [comentarioRetro, setComentarioRetro] = useState('');
  const [respuestaReclamo, setRespuestaReclamo] = useState('');
  const [reclamoPendiente, setReclamoPendiente] = useState<ReclamoEvaluacion | null>(null);
  const [archivoRetro, setArchivoRetro] = useState<File | null>(null);
  const [retroExistente, setRetroExistente] = useState<{ id_retro: string; comentario: string; archivo_url: string | null } | null>(null);

  const yaCorregido = intento?.estado === 'CORREGIDO';
  const esReclamo = intento?.estado === 'RECLAMADO';

  useEffect(() => {
    const fetchData = async () => {
      if (!idIntento) return;
      try {
        // 1. Fetch intento
        const { data: intentoData, error: intentoErr } = await supabase
          .from('intentos_evaluacion')
          .select('*')
          .eq('id_intento', idIntento)
          .single();
        if (intentoErr) throw intentoErr;
        setIntento(intentoData);

        // 2. Fetch evaluacion
        const { data: evalData } = await supabase
          .from('evaluaciones')
          .select('id_evaluacion, titulo, descripcion, id_leccion')
          .eq('id_evaluacion', intentoData.id_evaluacion)
          .single();
        setEvaluacion(evalData);

        // 3. Fetch estudiante
        const { data: userData } = await supabase
          .from('usuarios')
          .select('id_usuario, nombres, apellidos, correo')
          .eq('id_usuario', intentoData.id_usuario)
          .single();
        setEstudiante(userData);

        // 4. Fetch preguntas con opciones
        const { data: preguntasData } = await supabase
          .from('preguntas_evaluacion')
          .select('*, opciones_pregunta(*)')
          .eq('id_evaluacion', intentoData.id_evaluacion);

        // 5. Fetch respuestas del intento
        const { data: respuestasData } = await supabase
          .from('respuestas_intento')
          .select('*')
          .eq('id_intento', idIntento);

        // 6. Fetch reclamo pendiente, si existe
        const { data: reclamoData } = await supabase
          .from('reclamos_evaluacion')
          .select('*')
          .eq('id_intento', idIntento)
          .eq('estado', 'PENDIENTE')
          .order('fecha_reclamo', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (reclamoData) {
          setReclamoPendiente(reclamoData);
          setRespuestaReclamo(reclamoData.respuesta_docente || '');
        } else {
          setReclamoPendiente(null);
          setRespuestaReclamo('');
        }

        // 7. Combinar preguntas y respuestas
        const combined: PreguntaConRespuesta[] = (preguntasData || []).map((p: any) => {
          const respuesta = (respuestasData || []).find((r: any) => r.id_pregunta === p.id_pregunta);
          
          let puntajeInicial = respuesta ? Number(respuesta.puntaje_obtenido) : 0;
          
          // Auto-calcular siempre para OPCION_MULTIPLE basándose en si la opción seleccionada es correcta
          if (p.tipo === 'OPCION_MULTIPLE') {
            const opcionSeleccionada = p.opciones_pregunta?.find(
              (o: any) => o.id_opcion === respuesta?.id_opcion
            );
            if (opcionSeleccionada?.es_correcta) {
              puntajeInicial = Number(p.puntaje);
            } else {
              puntajeInicial = 0;
            }
          }

          return {
            id_pregunta: p.id_pregunta,
            id_evaluacion: p.id_evaluacion,
            enunciado: p.enunciado,
            tipo: p.tipo,
            puntaje: p.puntaje,
            opciones: p.opciones_pregunta,
            respuesta: respuesta || undefined,
            puntaje_asignado: puntajeInicial,
            reclamo: respuesta?.id_respuesta === reclamoData?.id_respuesta ? reclamoData : undefined,
          };
        });
        setPreguntasConRespuesta(combined);

        // 8. Fetch retroalimentacion existente 
        const { data: retroData } = await supabase
          .from('retroalimentacion_intento')
          .select('id_retro, comentario, archivo_url')
          .eq('id_intento', idIntento)
          .maybeSingle();
        if (retroData) {
          setRetroExistente(retroData);
          setComentarioRetro(retroData.comentario || '');
        }
      } catch (error: any) {
        console.error('Error loading correction data:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los datos de corrección.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [idIntento]);

  const puntajeTotal = preguntasConRespuesta.reduce((s, p) => s + Number(p.puntaje), 0);
  const puntajeAsignadoTotal = preguntasConRespuesta.reduce((s, p) => s + p.puntaje_asignado, 0);
  const porcentaje = puntajeTotal > 0 ? Math.round((puntajeAsignadoTotal / puntajeTotal) * 100) : 0;

  const handlePuntajeChange = (idPregunta: string, value: number) => {
    setPreguntasConRespuesta(prev =>
      prev.map(p =>
        p.id_pregunta === idPregunta
          ? { ...p, puntaje_asignado: Math.min(value, Number(p.puntaje)) }
          : p
      )
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'Archivo muy grande',
        description: 'El archivo no debe superar los 10 MB.',
        variant: 'destructive',
      });
      return;
    }
    setArchivoRetro(file);
  };

  const handleGuardar = async () => {
    if (!intento || !idDocente || !evaluacion) return;
    if (esReclamo && !respuestaReclamo.trim()) {
      toast({
        title: 'Respuesta requerida',
        description: 'Escribe una respuesta para cerrar el reclamo del estudiante.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // 1. Update each respuesta with puntaje
      for (const p of preguntasConRespuesta) {
        if (!p.respuesta) continue;
        
        // Ensure robust correctness calculation
        let esCorrecta = false;
        if (p.tipo === 'OPCION_MULTIPLE') {
          const opcion = p.opciones?.find((o: any) => o.id_opcion === p.respuesta?.id_opcion);
          esCorrecta = Boolean(opcion?.es_correcta);
        } else {
          esCorrecta = p.puntaje_asignado > 0;
        }

        const { error: respErr } = await supabase
          .from('respuestas_intento')
          .update({
            puntaje_obtenido: p.puntaje_asignado,
            es_correcta: esCorrecta,
          })
          .eq('id_respuesta', p.respuesta.id_respuesta);
        if (respErr) throw respErr;
      }

      // 2. Update intento
      const { error: intentoErr } = await supabase
        .from('intentos_evaluacion')
        .update({
          estado: 'CORREGIDO',
          puntaje_obtenido: puntajeAsignadoTotal,
        })
        .eq('id_intento', intento.id_intento);
      if (intentoErr) throw intentoErr;

      // 3. Upload file if any
      let archivoUrl: string | null = retroExistente?.archivo_url || null;
      if (archivoRetro) {
        const ext = archivoRetro.name.split('.').pop();
        const path = `retroalimentacion/${intento.id_intento}/docente_${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('archivos_tareas')
          .upload(path, archivoRetro, { upsert: true });
        if (uploadErr) throw uploadErr;
        archivoUrl = path;
      }

      // 4. Upsert retroalimentacion (only if there's content)
      if (comentarioRetro || archivoUrl) {
        if (retroExistente) {
          const { error: updateRetroErr } = await supabase
            .from('retroalimentacion_intento')
            .update({
              comentario: comentarioRetro || null,
              archivo_url: archivoUrl,
              id_docente: idDocente,
              fecha_retro: new Date().toISOString(),
            })
            .eq('id_retro', retroExistente.id_retro);
          if (updateRetroErr) throw updateRetroErr;
        } else {
          const { error: insertRetroErr } = await supabase
            .from('retroalimentacion_intento')
            .insert({
              id_intento: intento.id_intento,
              id_docente: idDocente,
              comentario: comentarioRetro || null,
              archivo_url: archivoUrl,
            });
          if (insertRetroErr) throw insertRetroErr;
        }
      }

      // 5. Resolver reclamo si este intento volvio para revision
      if (esReclamo) {
        const { error: reclamoErr } = await supabase.rpc('rpc_resolver_reclamo_evaluacion', {
          p_id_intento: intento.id_intento,
          p_respuesta_docente: respuestaReclamo.trim() || null,
        });
        if (reclamoErr) throw reclamoErr;
      }

      // 6. Create notification (only on first correction, not re-edits or reclamos)
      if (!yaCorregido && !esReclamo) {
        await supabase.from('notificaciones').insert({
          id_usuario: intento.id_usuario,
          tipo: 'CORRECCION',
          titulo: 'Evaluación corregida',
          mensaje: `Tu evaluación "${evaluacion.titulo}" ha sido corregida. Puntaje: ${puntajeAsignadoTotal}/${puntajeTotal} (${porcentaje}%)`,
          link: `/evaluaciones/${evaluacion.id_evaluacion}`,
        });

        // 7. Send email (fire and forget, only on first correction)
        supabase.functions.invoke('send-correccion-email', {
          body: {
            id_usuario: intento.id_usuario,
            tipo: 'evaluacion',
            titulo: evaluacion.titulo,
            puntaje: puntajeAsignadoTotal,
            puntaje_total: puntajeTotal,
            porcentaje: porcentaje,
            comentario_docente: comentarioRetro || undefined,
            tiene_archivo_retroalimentacion: !!archivoUrl,
          },
        }).catch(err => console.error('Email error:', err));
      }

      const applyIntentoCorregido = (oldData: unknown) => {
        if (!Array.isArray(oldData)) return oldData;

        return oldData.map((item: any) =>
          item.id_intento === intento.id_intento
            ? {
                ...item,
                estado: 'CORREGIDO',
                puntaje_obtenido: puntajeAsignadoTotal,
                preguntas_pendientes: 0,
              }
            : item
        );
      };

      queryClient.setQueriesData({ queryKey: ['intentos', 'revisar'] }, applyIntentoCorregido);
      queryClient.setQueriesData({ queryKey: ['intentos', 'todos', intento.id_evaluacion] }, applyIntentoCorregido);
      queryClient.setQueriesData({ queryKey: ['intentos', 'mis', intento.id_evaluacion, intento.id_usuario] }, applyIntentoCorregido);

      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['intentos', 'revisar'] }),
        queryClient.invalidateQueries({ queryKey: ['intentos', 'todos', intento.id_evaluacion] }),
        queryClient.invalidateQueries({ queryKey: ['intentos', 'mis', intento.id_evaluacion, intento.id_usuario] }),
        queryClient.invalidateQueries({ queryKey: ['respuestas', intento.id_intento] }),
        queryClient.invalidateQueries({ queryKey: ['evaluaciones', 'pendientes'] }),
      ]);

      toast({
        title: esReclamo ? 'Reclamo resuelto' : 'Corrección guardada',
        description: `Puntaje: ${puntajeAsignadoTotal}/${puntajeTotal}`,
      });
      navigate('/correcciones');
    } catch (error: any) {
      console.error('Error saving correction:', error);
      toast({
        title: 'Error al guardar',
        description: error.message || 'No se pudo guardar la corrección.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!intento || !evaluacion) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Intento no encontrado</h2>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/correcciones')}>
          <ChevronLeft className="h-4 w-4 mr-2" /> Volver a Correcciones
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/correcciones" className="hover:text-foreground">Correcciones</Link>
        <span>/</span>
        <span className="text-foreground">{evaluacion.titulo}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Corregir: {evaluacion.titulo}</h1>
          {estudiante && (
            <p className="text-muted-foreground mt-1">
              Estudiante: <strong>{estudiante.nombres} {estudiante.apellidos}</strong> ({estudiante.correo})
            </p>
          )}
          <div className="flex items-center gap-3 mt-2">
            {esReclamo ? (
              <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30">
                Con reclamo
              </Badge>
            ) : (
              <Badge variant={yaCorregido ? 'default' : 'secondary'}>
                {yaCorregido ? 'Corregido' : 'Pendiente de correccion'}
              </Badge>
            )}
            {intento.fecha_envio && (
              <span className="text-sm text-muted-foreground">
                Enviado: {new Date(intento.fecha_envio).toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate('/correcciones')}>
          <ChevronLeft className="h-4 w-4 mr-2" /> Volver
        </Button>
      </div>

      {esReclamo && reclamoPendiente && (
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <MessageSquareWarning className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-700">Evaluacion reclamada</p>
                <p className="text-sm text-muted-foreground mt-1">
                  El estudiante solicito revisar una pregunta. Ajusta el puntaje si corresponde y responde el reclamo antes de guardar.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Score summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Puntaje Total</span>
            <span className="text-2xl font-bold">{puntajeAsignadoTotal} / {puntajeTotal}</span>
          </div>
          <Progress value={porcentaje} className="h-3" />
          <p className="text-sm text-muted-foreground mt-1 text-right">{porcentaje}%</p>
        </CardContent>
      </Card>

      {/* Questions */}
      <div className="space-y-4">
        {preguntasConRespuesta.map((pregunta, index) => {
          const esOpcionMultiple = pregunta.tipo === 'OPCION_MULTIPLE';
          return (
            <Card
              key={pregunta.id_pregunta}
              className={pregunta.reclamo ? 'border-amber-500/40 bg-amber-500/5' : undefined}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    <span className="text-muted-foreground mr-2">#{index + 1}</span>
                    <LatexText>{pregunta.enunciado}</LatexText>
                  </CardTitle>
                  <Badge variant="outline">{Number(pregunta.puntaje)} pts</Badge>
                </div>
                <Badge variant="secondary" className="w-fit text-xs">
                  {esOpcionMultiple ? 'Opción múltiple' : 'Respuesta abierta'}
                </Badge>
                {pregunta.reclamo && (
                  <Badge className="w-fit text-xs bg-amber-500/15 text-amber-700 border-amber-500/30 gap-1">
                    <MessageSquareWarning className="h-3 w-3" />
                    Pregunta reclamada
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {esOpcionMultiple && pregunta.opciones && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Opciones:</p>
                    {pregunta.opciones.map((opcion: Opcion) => {
                      const esSeleccionada = opcion.id_opcion === pregunta.respuesta?.id_opcion;
                      const esLaCorrecta = opcion.es_correcta;
                      return (
                        <div
                          key={opcion.id_opcion}
                          className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${
                            esSeleccionada && esLaCorrecta
                              ? 'bg-green-500/10 border-green-500/50'
                              : esSeleccionada && !esLaCorrecta
                              ? 'bg-red-500/10 border-red-500/50'
                              : esLaCorrecta
                              ? 'bg-green-500/5 border-green-500/30'
                              : ''
                          }`}
                        >
                          {esSeleccionada && esLaCorrecta && (
                            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                          )}
                          {esSeleccionada && !esLaCorrecta && (
                            <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                          )}
                          {!esSeleccionada && esLaCorrecta && (
                            <CheckCircle2 className="h-4 w-4 text-green-500/50 flex-shrink-0" />
                          )}
                          {!esSeleccionada && !esLaCorrecta && (
                            <div className="h-4 w-4 rounded-full border flex-shrink-0" />
                          )}
                          <span>
                            <LatexText>{opcion.texto}</LatexText>
                          </span>
                          {esSeleccionada && (
                            <Badge variant="outline" className="ml-auto text-xs">
                              Respuesta del estudiante
                            </Badge>
                          )}
                          {esLaCorrecta && !esSeleccionada && (
                            <Badge variant="outline" className="ml-auto text-xs text-green-600">
                              Correcta
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                    <div className="flex items-center gap-2 pt-2">
                      <Label className="text-sm whitespace-nowrap">Puntaje (0 - {Number(pregunta.puntaje)}):</Label>
                      <Input
                        type="number"
                        min={0}
                        max={Number(pregunta.puntaje)}
                        value={pregunta.puntaje_asignado}
                        onChange={(e) => handlePuntajeChange(pregunta.id_pregunta, Number(e.target.value))}
                        className="w-24"
                        disabled={false}
                      />
                      <span className="text-sm text-muted-foreground">/ {pregunta.puntaje}</span>
                    </div>
                  </div>
                )}

                {!esOpcionMultiple && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Respuesta del estudiante:</p>
                      <div className="p-3 rounded-lg border bg-muted/30 min-h-[80px]">
                        {pregunta.respuesta?.respuesta_texto || (
                          <span className="text-muted-foreground italic">Sin respuesta</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="text-sm whitespace-nowrap">Puntaje (0 - {Number(pregunta.puntaje)}):</Label>
                      <Input
                        type="number"
                        min={0}
                        max={Number(pregunta.puntaje)}
                        value={pregunta.puntaje_asignado}
                        onChange={(e) => handlePuntajeChange(pregunta.id_pregunta, Number(e.target.value))}
                        className="w-24"
                        disabled={false}
                      />
                      <span className="text-sm text-muted-foreground">/ {pregunta.puntaje}</span>
                    </div>
                  </div>
                )}

                {pregunta.reclamo && (
                  <div className="p-4 rounded-lg border border-amber-500/30 bg-background space-y-2">
                    <p className="font-medium text-sm flex items-center gap-2 text-amber-700">
                      <MessageSquareWarning className="h-4 w-4" />
                      Justificacion del estudiante
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{pregunta.reclamo.justificacion}</p>
                    <p className="text-xs text-muted-foreground">
                      Puntaje original reclamado: {pregunta.reclamo.puntaje_original} / {pregunta.puntaje}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Retroalimentación */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Retroalimentación (Opcional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Comentario para el estudiante</Label>
            <Textarea
              placeholder="Escribe tu retroalimentación aquí..."
              value={comentarioRetro}
              onChange={(e) => setComentarioRetro(e.target.value)}
              className="mt-1 min-h-[100px]"
              disabled={false}
            />
          </div>
          <div>
            <Label>Adjuntar imagen o PDF (máx. 10 MB)</Label>
            {retroExistente?.archivo_url && !archivoRetro && (
              <div className="flex items-center gap-2 mt-1 mb-2 p-2 rounded border bg-muted/30">
                <FileText className="h-4 w-4" />
                <span className="text-sm">Archivo existente adjuntado</span>
              </div>
            )}
            {true && (
              <div className="mt-1">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
                {archivoRetro && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Archivo seleccionado: {archivoRetro.name}
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {esReclamo && (
        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquareWarning className="h-5 w-5 text-amber-600" />
              Respuesta al reclamo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Label>Mensaje para el estudiante</Label>
            <Textarea
              placeholder="Explica si se ajusto la correccion o por que se mantiene el puntaje..."
              value={respuestaReclamo}
              onChange={(e) => setRespuestaReclamo(e.target.value)}
              className="mt-1 min-h-[120px]"
              disabled={false}
            />
          </CardContent>
        </Card>
      )}

      {/* Save button */}
      <div className="flex justify-end gap-3 pb-8">
        <Button variant="outline" onClick={() => navigate('/correcciones')}>
          Cancelar
        </Button>
        <Button onClick={handleGuardar} disabled={saving} size="lg">
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {esReclamo ? 'Resolver reclamo' : yaCorregido ? 'Actualizar Corrección' : 'Guardar Corrección'}
        </Button>
      </div>
    </div>
  );
};

export default CorreccionEvaluacion;
