import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserRole } from '@/contexts/UserRoleContext';
import { useTarea } from '@/hooks/useTareas';
import TareaViewer from '@/components/tareas/TareaViewer';
import EntregaTareaForm from '@/components/tareas/EntregaTareaForm';
import ListaEntregas from '@/components/tareas/ListaEntregas';
import TareaFormDialog from '@/components/tareas/TareaFormDialog';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUsuario } from '@/hooks/useCurrentUsuario';
import { useToast } from '@/hooks/use-toast';

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

const TareaPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, isDocente, isEstudiante, loading: roleLoading } = useUserRole();
  const { idUsuario, loading: usuarioLoading } = useCurrentUsuario();
  const [accessAllowed, setAccessAllowed] = useState(false);
  const [accessLoading, setAccessLoading] = useState(true);
  const { tarea, loading: tareaLoading, refetch } = useTarea(id || '', accessAllowed);

  const [leccionInfo, setLeccionInfo] = useState<LeccionInfo | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [canManageCurso, setCanManageCurso] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      if (!id || roleLoading) return;

      setAccessLoading(true);
      const [
        { data: puedeGestionar, error: manageError },
        { data: estaInscripto, error: enrolledError },
      ] = await Promise.all([
        supabase.rpc('can_manage_tarea', { p_tarea_id: id }),
        supabase.rpc('is_enrolled_in_tarea_course', { p_tarea_id: id }),
      ]);

      if (manageError || enrolledError) {
        console.error('Error checking task access:', manageError || enrolledError);
      }

      const puedeAcceder = Boolean(puedeGestionar || estaInscripto);
      setAccessAllowed(puedeAcceder);
      setAccessLoading(false);

      if (!puedeAcceder) {
        toast({
          title: isEstudiante ? 'Inscripción requerida' : 'Acceso denegado',
          description: isEstudiante
            ? 'Debes inscribirte al curso antes de acceder a esta tarea.'
            : 'No tienes permisos para acceder a esta tarea.',
          variant: 'destructive',
        });
        navigate('/cursos', { replace: true });
      }
    };

    checkAccess();
  }, [id, isEstudiante, navigate, roleLoading, toast]);

  // Fetch leccion info for breadcrumb and permissions
  useEffect(() => {
    const fetchLeccionInfo = async () => {
      if (!tarea?.id_leccion) return;

      const { data } = await supabase
        .from('lecciones')
        .select(`
          id_leccion,
          titulo,
          modulo:id_modulo (
            id_modulo,
            titulo,
            curso:id_curso (
              id_curso,
              titulo,
              id_docente
            )
          )
        `)
        .eq('id_leccion', tarea.id_leccion)
        .single();

      if (data) {
        const leccionData = data as unknown as LeccionInfo;
        setLeccionInfo({
          id_leccion: leccionData.id_leccion,
          titulo: leccionData.titulo,
          modulo: leccionData.modulo,
        });

        const cursoId = leccionData.modulo?.curso?.id_curso;
        if (cursoId && idUsuario) {
          const { data: puedeGestionar } = await supabase.rpc('can_manage_curso', {
            p_curso_id: cursoId,
          });
          setCanManageCurso(Boolean(puedeGestionar));
        } else {
          setCanManageCurso(false);
        }
      }
    };

    fetchLeccionInfo();
  }, [tarea?.id_leccion, idUsuario]);

  const loading = accessLoading || tareaLoading || roleLoading || usuarioLoading;
  const canEdit = isAdmin || (isDocente && canManageCurso);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tarea) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Tarea no encontrada</p>
        <Button className="mt-4" onClick={() => navigate(-1)}>
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
          {leccionInfo?.modulo?.curso && (
            <>
              <Link
                to={`/cursos/${leccionInfo.modulo.curso.id_curso}`}
                className="hover:text-foreground"
              >
                {leccionInfo.modulo.curso.titulo}
              </Link>
              <span>/</span>
              <span>{leccionInfo.modulo.titulo}</span>
              <span>/</span>
              <Link
                to={`/lecciones/${leccionInfo.id_leccion}`}
                className="hover:text-foreground flex items-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                {leccionInfo.titulo}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-foreground">{tarea.titulo}</span>
        </div>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        )}
      </div>

      {/* Tarea details */}
      <TareaViewer tarea={tarea} />

      {/* Student: show submission form */}
      {isEstudiante && (
        <EntregaTareaForm tarea={tarea} />
      )}

      {/* Teacher/Admin: show submissions list */}
      {(isAdmin || (isDocente && canManageCurso)) && (
        <ListaEntregas idTarea={tarea.id_tarea} />
      )}

      {/* Edit dialog */}
      {tarea.id_leccion && (
        <TareaFormDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          idLeccion={tarea.id_leccion}
          tarea={tarea}
          onSuccess={refetch}
        />
      )}
    </div>
  );
};

export default TareaPage;
