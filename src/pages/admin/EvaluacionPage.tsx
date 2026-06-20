import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Clock,
  RotateCcw,
  Edit,
  Plus,
  Trash2,
  PlayCircle,
  CheckCircle2,
  Users,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useUserRole } from '@/contexts/UserRoleContext';
import { useCurrentUsuario } from '@/hooks/useCurrentUsuario';
import {
  useEvaluacion,
  usePreguntasEvaluacion,
  useMisIntentos,
  useIntentosEvaluacion,
  type Pregunta,
} from '@/hooks/useEvaluaciones';
import { EvaluacionFormDialog } from '@/components/evaluaciones/EvaluacionFormDialog';
import { PreguntaFormDialog } from '@/components/evaluaciones/PreguntaFormDialog';
import { EvaluacionPlayer } from '@/components/evaluaciones/EvaluacionPlayer';
import { ListaIntentosEvaluacion } from '@/components/evaluaciones/ListaIntentosEvaluacion';
import { VistaCorreccionEstudiante } from '@/components/evaluaciones/VistaCorreccionEstudiante';
import { LatexText } from '@/components/evaluaciones/LatexText';

interface LeccionInfo {
  id_leccion: string;
  titulo: string;
  modulo: {
    id_modulo: string;
    titulo: string;
    curso: {
      id_curso: string;
      titulo: string;
      id_docente: string | null;
    };
  };
}

const EvaluacionPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, isDocente, isEstudiante, loading: roleLoading } = useUserRole();
  const { idUsuario } = useCurrentUsuario();

  const [accessAllowed, setAccessAllowed] = useState(false);
  const [accessLoading, setAccessLoading] = useState(true);

  const { evaluacion, loading: loadingEvaluacion, refetch: refetchEvaluacion } = useEvaluacion(id || '', accessAllowed);
  const { preguntas, loading: loadingPreguntas, refetch: refetchPreguntas } = usePreguntasEvaluacion(id || '', accessAllowed);
  const { intentos: misIntentos, loading: loadingMisIntentos, refetch: refetchMisIntentos } = useMisIntentos(id || '', accessAllowed);
  const { intentos: todosIntentos, loading: loadingTodosIntentos, refetch: refetchTodosIntentos } = useIntentosEvaluacion(id || '', accessAllowed);

  const [leccionInfo, setLeccionInfo] = useState<LeccionInfo | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [preguntaDialogOpen, setPreguntaDialogOpen] = useState(false);
  const [editingPregunta, setEditingPregunta] = useState<Pregunta | null>(null);
  const [deletePreguntaOpen, setDeletePreguntaOpen] = useState(false);
  const [preguntaToDelete, setPreguntaToDelete] = useState<Pregunta | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [reviewingIntentoId, setReviewingIntentoId] = useState<string | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      if (!id || roleLoading) return;

      setAccessLoading(true);
      const [
        { data: puedeGestionar, error: manageError },
        { data: estaInscripto, error: enrolledError },
      ] = await Promise.all([
        supabase.rpc('can_manage_evaluacion', { p_evaluacion_id: id }),
        supabase.rpc('is_enrolled_in_evaluacion_course', { p_evaluacion_id: id }),
      ]);

      if (manageError || enrolledError) {
        console.error('Error checking evaluation access:', manageError || enrolledError);
      }

      const puedeAcceder = Boolean(puedeGestionar || estaInscripto);
      setAccessAllowed(puedeAcceder);
      setAccessLoading(false);

      if (!puedeAcceder) {
        toast({
          title: isEstudiante ? 'Inscripción requerida' : 'Acceso denegado',
          description: isEstudiante
            ? 'Debes inscribirte al curso antes de acceder a esta evaluación.'
            : 'No tienes permisos para acceder a esta evaluación.',
          variant: 'destructive',
        });
        navigate('/cursos', { replace: true });
      }
    };

    checkAccess();
  }, [id, isEstudiante, navigate, roleLoading, toast]);

  useEffect(() => {
    const fetchLeccionInfo = async () => {
      if (!evaluacion) return;

      const { data } = await supabase
        .from('lecciones')
        .select(`
          id_leccion,
          titulo,
          modulos!inner (
            id_modulo,
            titulo,
            cursos!inner (
              id_curso,
              titulo,
              id_docente
            )
          )
        `)
        .eq('id_leccion', evaluacion.id_leccion)
        .maybeSingle();

      if (data) {
        const modulo = data.modulos as unknown as {
          id_modulo: string;
          titulo: string;
          cursos: LeccionInfo['modulo']['curso'];
        };
        setLeccionInfo({
          id_leccion: data.id_leccion,
          titulo: data.titulo,
          modulo: {
            id_modulo: modulo.id_modulo,
            titulo: modulo.titulo,
            curso: modulo.cursos,
          },
        });

        const cursoId = modulo.cursos.id_curso;
        if (isAdmin) {
          setCanEdit(true);
        } else if (cursoId && idUsuario) {
          const { data: puedeGestionar } = await supabase.rpc('can_manage_curso', {
            p_curso_id: cursoId,
          });
          setCanEdit(Boolean(isDocente && puedeGestionar));
        } else {
          setCanEdit(false);
        }
      }
    };

    fetchLeccionInfo();
  }, [evaluacion, idUsuario, isAdmin, isDocente]);

  const handleDeletePregunta = async () => {
    if (!preguntaToDelete) return;

    try {
      // Delete opciones first
      await supabase
        .from('opciones_pregunta')
        .delete()
        .eq('id_pregunta', preguntaToDelete.id_pregunta);

      // Delete pregunta
      const { error } = await supabase
        .from('preguntas_evaluacion')
        .delete()
        .eq('id_pregunta', preguntaToDelete.id_pregunta);

      if (error) throw error;

      toast({
        title: 'Pregunta eliminada',
        description: 'La pregunta ha sido eliminada correctamente.',
      });

      refetchPreguntas();
    } catch (error: unknown) {
      console.error('Error deleting pregunta:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo eliminar la pregunta.',
        variant: 'destructive',
      });
    } finally {
      setDeletePreguntaOpen(false);
      setPreguntaToDelete(null);
    }
  };

  const handleStartEvaluacion = () => {
    setPlayerOpen(true);
  };

  const handlePlayerClose = () => {
    setPlayerOpen(false);
    refetchMisIntentos();
  };

  const puntajeTotal = preguntas.reduce((sum, p) => sum + Number(p.puntaje), 0);
  const intentosRealizados = misIntentos.length;
  const intentosDisponibles = evaluacion ? evaluacion.intentos_max - intentosRealizados : 0;
  const mejorPuntaje = misIntentos
    .filter(i => i.estado !== 'EN_PROGRESO')
    .reduce((max, i) => Math.max(max, Number(i.puntaje_obtenido)), 0);

  if (accessLoading || roleLoading || loadingEvaluacion) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!evaluacion) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Evaluación no encontrada</h2>
        <p className="text-muted-foreground mt-2">La evaluación que buscas no existe o no tienes acceso.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      {leccionInfo && (
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/cursos" className="hover:text-foreground">Cursos</Link>
          <span>/</span>
          <Link to={`/cursos/${leccionInfo.modulo.curso.id_curso}`} className="hover:text-foreground">
            {leccionInfo.modulo.curso.titulo}
          </Link>
          <span>/</span>
          <Link to={`/lecciones/${leccionInfo.id_leccion}`} className="hover:text-foreground">
            {leccionInfo.titulo}
          </Link>
          <span>/</span>
          <span className="text-foreground">{evaluacion.titulo}</span>
        </nav>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{evaluacion.titulo}</h1>
          {evaluacion.descripcion && (
            <p className="text-muted-foreground mt-2">{evaluacion.descripcion}</p>
          )}
          <div className="flex items-center gap-3 mt-3">
            {evaluacion.tiempo_limite_min && (
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                {evaluacion.tiempo_limite_min} min
              </Badge>
            )}
            <Badge variant="secondary" className="gap-1">
              <RotateCcw className="h-3 w-3" />
              {evaluacion.intentos_max} intento{evaluacion.intentos_max > 1 ? 's' : ''}
            </Badge>
            <Badge variant="outline">
              {preguntas.length} pregunta{preguntas.length !== 1 ? 's' : ''} • {puntajeTotal} pts
            </Badge>
          </div>
        </div>
        {canEdit && (
          <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Student: Start evaluation */}
          {isEstudiante && (
            <Card>
              <CardContent className="pt-6">
                {intentosDisponibles > 0 ? (
                  <div className="text-center space-y-4">
                    {preguntas.length === 0 ? (
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <AlertCircle className="h-5 w-5" />
                        <span>Esta evaluación aún no tiene preguntas.</span>
                      </div>
                    ) : (
                      <>
                        <p className="text-muted-foreground">
                          Tienes {intentosDisponibles} intento{intentosDisponibles > 1 ? 's' : ''} disponible{intentosDisponibles > 1 ? 's' : ''}
                        </p>
                        <Button size="lg" onClick={handleStartEvaluacion}>
                          <PlayCircle className="h-5 w-5 mr-2" />
                          Iniciar Evaluación
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-success" />
                    <div>
                      <p className="font-medium">Has completado todos los intentos</p>
                      <p className="text-muted-foreground">
                        Mejor puntaje: {mejorPuntaje} / {puntajeTotal} pts
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* My attempts (student) */}
          {isEstudiante && misIntentos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Mis Intentos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {misIntentos.map((intento, index) => {
                    const porcentaje = puntajeTotal > 0 
                      ? Math.round((Number(intento.puntaje_obtenido) / puntajeTotal) * 100) 
                      : 0;
                    const aprobado = porcentaje >= 60;

                    return (
                      <div
                        key={intento.id_intento}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div>
                          <p className="font-medium">Intento {misIntentos.length - index}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(intento.fecha_inicio).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          {intento.estado === 'EN_PROGRESO' ? (
                            <Badge variant="outline" className="bg-muted">En progreso</Badge>
                          ) : intento.estado === 'COMPLETADO' ? (
                            <div className="space-y-1">
                              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
                                Completado
                              </Badge>
                              <p className="text-xs text-muted-foreground">
                                Pendiente de revisión
                              </p>
                            </div>
                          ) : intento.estado === 'RECLAMADO' ? (
                            <div className="space-y-2 text-right">
                              <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 block text-center w-full">
                                En reclamo
                              </Badge>
                              <p className="text-xs text-muted-foreground text-center">
                                {Number(intento.puntaje_obtenido || 0)} / {puntajeTotal} pts
                              </p>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full mt-1"
                                onClick={() => setReviewingIntentoId(intento.id_intento)}
                              >
                                Ver reclamo
                              </Button>
                            </div>
                          ) : intento.estado === 'CORREGIDO' ? (
                            <div className="space-y-2 text-right">
                              <Badge className="bg-green-500 text-white hover:bg-green-600 block text-center w-full">
                                {Number(intento.puntaje_obtenido || 0)} / {puntajeTotal} pts
                              </Badge>
                              <p className="text-xs text-muted-foreground text-center">
                                Corregido ({porcentaje}%)
                              </p>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full mt-1"
                                onClick={() => setReviewingIntentoId(intento.id_intento)}
                              >
                                Ver corrección
                              </Button>
                            </div>
                          ) : intento.estado === 'AUTOCORREGIDO' ? (
                            <div className="space-y-2 text-right">
                              <Badge variant={aprobado ? 'default' : 'secondary'} className="block text-center w-full">
                                {Number(intento.puntaje_obtenido || 0)} / {puntajeTotal} pts
                              </Badge>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full mt-1"
                                onClick={() => setReviewingIntentoId(intento.id_intento)}
                              >
                                Ver resultados
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Questions list (for editing) */}
          {canEdit && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Preguntas</CardTitle>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingPregunta(null);
                    setPreguntaDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar Pregunta
                </Button>
              </CardHeader>
              <CardContent>
                {loadingPreguntas ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : preguntas.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No hay preguntas. Agrega la primera pregunta para comenzar.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {preguntas.map((pregunta, index) => (
                      <div
                        key={pregunta.id_pregunta}
                        className="p-4 rounded-lg border group hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-muted-foreground">
                                #{index + 1}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {pregunta.tipo === 'OPCION_MULTIPLE' ? 'Opción múltiple' : 'Abierta'}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {pregunta.puntaje} pts
                              </Badge>
                            </div>
                            <div className="text-sm">
                              <LatexText>{pregunta.enunciado}</LatexText>
                            </div>
                            {pregunta.tipo === 'OPCION_MULTIPLE' && pregunta.opciones && (
                              <div className="mt-2 space-y-1">
                                {pregunta.opciones.map((opcion) => (
                                  <div
                                    key={opcion.id_opcion}
                                    className={`text-xs px-2 py-1 rounded ${
                                      opcion.es_correcta
                                        ? 'bg-success/10 text-success'
                                        : 'text-muted-foreground'
                                    }`}
                                  >
                                    {opcion.es_correcta ? '✓ ' : '○ '}
                                    <LatexText>{opcion.texto}</LatexText>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setEditingPregunta(pregunta);
                                setPreguntaDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setPreguntaToDelete(pregunta);
                                setDeletePreguntaOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* All attempts (for teacher) */}
          {canEdit && (
            <ListaIntentosEvaluacion
              idEvaluacion={id || ''}
              puntajeTotal={puntajeTotal}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Preguntas</span>
                <span className="font-medium">{preguntas.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Puntaje total</span>
                <span className="font-medium">{puntajeTotal} pts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tiempo límite</span>
                <span className="font-medium">
                  {evaluacion.tiempo_limite_min ? `${evaluacion.tiempo_limite_min} min` : 'Sin límite'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Intentos máx.</span>
                <span className="font-medium">{evaluacion.intentos_max}</span>
              </div>
              {canEdit && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total intentos</span>
                  <span className="font-medium">{todosIntentos.length}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <EvaluacionFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        idLeccion={evaluacion.id_leccion}
        evaluacion={evaluacion}
        onSuccess={refetchEvaluacion}
      />

      <PreguntaFormDialog
        open={preguntaDialogOpen}
        onOpenChange={setPreguntaDialogOpen}
        idEvaluacion={id || ''}
        pregunta={editingPregunta}
        onSuccess={refetchPreguntas}
      />

      <AlertDialog open={deletePreguntaOpen} onOpenChange={setDeletePreguntaOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar pregunta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la pregunta y todas sus opciones. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePregunta}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quiz Player */}
      {playerOpen && (
        <EvaluacionPlayer
          evaluacion={evaluacion}
          preguntas={preguntas}
          onClose={handlePlayerClose}
        />
      )}

      {/* Review Dialog */}
      {reviewingIntentoId && (
        <VistaCorreccionEstudiante
          evaluacion={evaluacion}
          preguntas={preguntas}
          idIntento={reviewingIntentoId}
          onClose={() => setReviewingIntentoId(null)}
        />
      )}
    </div>
  );
};

export default EvaluacionPage;
