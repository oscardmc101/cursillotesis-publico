import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, Edit, Trash2, Plus, Clock, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
import { useEvaluacionesLeccion, type Evaluacion } from '@/hooks/useEvaluaciones';
import { EvaluacionFormDialog } from './EvaluacionFormDialog';

interface EvaluacionesLeccionProps {
  idLeccion: string;
  canEdit: boolean;
}

export function EvaluacionesLeccion({ idLeccion, canEdit }: EvaluacionesLeccionProps) {
  const { evaluaciones, loading, refetch } = useEvaluacionesLeccion(idLeccion);
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvaluacion, setEditingEvaluacion] = useState<Evaluacion | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [evaluacionToDelete, setEvaluacionToDelete] = useState<Evaluacion | null>(null);

  const handleEdit = (evaluacion: Evaluacion) => {
    setEditingEvaluacion(evaluacion);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!evaluacionToDelete) return;

    try {
      // First delete all related data
      const { data: preguntas } = await supabase
        .from('preguntas_evaluacion')
        .select('id_pregunta')
        .eq('id_evaluacion', evaluacionToDelete.id_evaluacion);

      if (preguntas && preguntas.length > 0) {
        const preguntaIds = preguntas.map(p => p.id_pregunta);
        
        // Delete opciones
        await supabase
          .from('opciones_pregunta')
          .delete()
          .in('id_pregunta', preguntaIds);
      }

      // Delete preguntas
      await supabase
        .from('preguntas_evaluacion')
        .delete()
        .eq('id_evaluacion', evaluacionToDelete.id_evaluacion);

      // Delete intentos and their responses
      const { data: intentos } = await supabase
        .from('intentos_evaluacion')
        .select('id_intento')
        .eq('id_evaluacion', evaluacionToDelete.id_evaluacion);

      if (intentos && intentos.length > 0) {
        const intentoIds = intentos.map(i => i.id_intento);
        
        await supabase
          .from('respuestas_intento')
          .delete()
          .in('id_intento', intentoIds);

        await supabase
          .from('retroalimentacion_intento')
          .delete()
          .in('id_intento', intentoIds);

        await supabase
          .from('imagenes_resolucion_intento')
          .delete()
          .in('id_intento', intentoIds);
      }

      await supabase
        .from('intentos_evaluacion')
        .delete()
        .eq('id_evaluacion', evaluacionToDelete.id_evaluacion);

      // Finally delete the evaluacion
      const { error } = await supabase
        .from('evaluaciones')
        .delete()
        .eq('id_evaluacion', evaluacionToDelete.id_evaluacion);

      if (error) throw error;

      toast({
        title: 'Evaluación eliminada',
        description: 'La evaluación y todos sus datos han sido eliminados.',
      });

      refetch();
    } catch (error: any) {
      console.error('Error deleting evaluacion:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar la evaluación.',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setEvaluacionToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Evaluaciones
            </div>
            {canEdit && (
              <Button
                size="sm"
                onClick={() => {
                  setEditingEvaluacion(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Nueva Evaluación
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {evaluaciones.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No hay evaluaciones en esta lección.
            </p>
          ) : (
            <div className="space-y-3">
          {evaluaciones.map((evaluacion) => (
            <Link
              key={evaluacion.id_evaluacion}
              to={`/evaluaciones/${evaluacion.id_evaluacion}`}
              className="block"
            >
              <div className="p-4 rounded-lg border hover:bg-muted/50 transition-colors group">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{evaluacion.titulo}</h4>
                    {evaluacion.descripcion && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {evaluacion.descripcion}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
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
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleEdit(evaluacion);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEvaluacionToDelete(evaluacion);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Link>
            ))}
          </div>
        )}
        </CardContent>
      </Card>

      <EvaluacionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        idLeccion={idLeccion}
        evaluacion={editingEvaluacion}
        onSuccess={refetch}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar evaluación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la evaluación "{evaluacionToDelete?.titulo}" 
              junto con todas sus preguntas, opciones e intentos de los estudiantes.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
