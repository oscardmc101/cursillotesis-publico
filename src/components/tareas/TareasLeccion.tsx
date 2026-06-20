import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, ClipboardList, AlertCircle, Hourglass, Edit, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { supabase } from '@/integrations/supabase/client';
import { useTareasLeccion, type Tarea } from '@/hooks/useTareas';
import { toast } from '@/hooks/use-toast';
import TareaFormDialog from './TareaFormDialog';

interface TareasLeccionProps {
  idLeccion: string;
  canEdit: boolean;
}

const TareasLeccion = ({ idLeccion, canEdit }: TareasLeccionProps) => {
  const { tareas, loading, refetch } = useTareasLeccion(idLeccion);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTarea, setEditingTarea] = useState<Tarea | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tareaToDelete, setTareaToDelete] = useState<Tarea | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!tareaToDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('tareas')
        .delete()
        .eq('id_tarea', tareaToDelete.id_tarea);

      if (error) throw error;

      toast({ title: 'Tarea eliminada correctamente' });
      refetch();
    } catch (error) {
      console.error('Error deleting tarea:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la tarea',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setTareaToDelete(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Tareas de esta lección
            </div>
            {canEdit && (
              <Button size="sm" onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Nueva tarea
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tareas.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No hay tareas en esta lección.
            </p>
          ) : (
            <div className="space-y-3">
              {tareas.map((tarea) => {
                const fechaLimite = tarea.fecha_limite ? new Date(tarea.fecha_limite) : null;
                const isOverdue = fechaLimite && isPast(fechaLimite);

                return (
                  <div
                    key={tarea.id_tarea}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/tareas/${tarea.id_tarea}`}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {tarea.titulo}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        {fechaLimite && (
                          <Badge variant={isOverdue ? 'destructive' : 'secondary'} className="text-xs">
                            {isOverdue ? (
                              <AlertCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <Hourglass className="h-3 w-3 mr-1" />
                            )}
                            {format(fechaLimite, "d MMM yyyy", { locale: es })}
                          </Badge>
                        )}
                        {tarea.permite_reintentos && (
                          <span className="text-xs text-muted-foreground">
                            {tarea.max_reintentos} intentos
                          </span>
                        )}
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingTarea(tarea);
                            setFormOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setTareaToDelete(tarea);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <TareaFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingTarea(null);
        }}
        idLeccion={idLeccion}
        tarea={editingTarea}
        onSuccess={refetch}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tarea?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la tarea "{tareaToDelete?.titulo}" y todas sus entregas asociadas.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TareasLeccion;
