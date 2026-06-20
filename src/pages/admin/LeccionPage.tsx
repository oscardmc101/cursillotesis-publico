import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Loader2, CheckCircle, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/contexts/UserRoleContext';
import { useCurrentUsuario } from '@/hooks/useCurrentUsuario';
import { useProgresoLeccion } from '@/hooks/useProgresoLecciones';
import { toast } from '@/hooks/use-toast';
import LeccionViewer from '@/components/lecciones/LeccionViewer';
import LeccionFormDialog from '@/components/lecciones/LeccionFormDialog';
import ComentariosLeccion from '@/components/lecciones/ComentariosLeccion';
import AdjuntosManager from '@/components/lecciones/AdjuntosManager';
import TareasLeccion from '@/components/tareas/TareasLeccion';
import { EvaluacionesLeccion } from '@/components/evaluaciones/EvaluacionesLeccion';

interface Leccion {
  id_leccion: string;
  titulo: string;
  tipo_contenido: string;
  contenido_texto: string | null;
  url_contenido: string | null;
  orden: number;
  es_publicada: boolean;
  id_modulo: string;
  modulo?: {
    id_modulo: string;
    titulo: string;
    id_curso: string;
    curso?: {
      id_curso: string;
      titulo: string;
      id_docente: string | null;
      id_cursillo: string;
    };
  };
}

const LeccionPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, isDocente, isEstudiante, loading: roleLoading } = useUserRole();
  const { idUsuario, loading: usuarioLoading } = useCurrentUsuario();
  const { completada, loading: progresoLoading, saving, toggleCompletada } = useProgresoLeccion(id || '');

  const [leccion, setLeccion] = useState<Leccion | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [canManageCurso, setCanManageCurso] = useState(false);

  const canEdit = isAdmin || (isDocente && canManageCurso);
  const canMarkProgress = isEstudiante;

  const fetchLeccion = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const { data: puedeAcceder, error: accesoError } = await supabase.rpc(
        'can_access_leccion_content',
        { p_leccion_id: id }
      );

      if (accesoError) throw accesoError;

      if (!puedeAcceder) {
        toast({
          title: 'Inscripción requerida',
          description: 'Debes inscribirte al curso antes de acceder a esta lección.',
          variant: 'destructive',
        });
        navigate('/cursos', { replace: true });
        return;
      }

      const { data, error } = await supabase
        .from('lecciones')
        .select(`
          id_leccion,
          titulo,
          tipo_contenido,
          contenido_texto,
          url_contenido,
          orden,
          es_publicada,
          id_modulo,
          modulo:id_modulo (
            id_modulo,
            titulo,
            id_curso,
            curso:id_curso (
              id_curso,
              titulo,
              id_docente,
              id_cursillo
            )
          )
        `)
        .eq('id_leccion', id)
        .single();

      if (error) throw error;

      // Type assertion for nested data
      const leccionData = data as any;
      const cursoId = leccionData.modulo?.curso?.id_curso;
      setLeccion({
        ...leccionData,
        modulo: leccionData.modulo && typeof leccionData.modulo === 'object'
          ? {
              ...leccionData.modulo,
              curso: leccionData.modulo.curso && typeof leccionData.modulo.curso === 'object'
                ? leccionData.modulo.curso
                : null,
            }
          : null,
      });

      if (cursoId && idUsuario) {
        const { data: puedeGestionar } = await supabase.rpc('can_manage_curso', {
          p_curso_id: cursoId,
        });
        setCanManageCurso(Boolean(puedeGestionar));
      } else {
        setCanManageCurso(false);
      }
    } catch (error) {
      console.error('Error fetching leccion:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar la lección',
        variant: 'destructive',
      });
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!roleLoading && !usuarioLoading && id) {
      fetchLeccion();
    }
  }, [id, roleLoading, usuarioLoading, idUsuario]);

  if (loading || roleLoading || usuarioLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!leccion) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Lección no encontrada</p>
        <Button className="mt-4" onClick={() => navigate(-1)}>
          Volver
        </Button>
      </div>
    );
  }

  const cursoId = leccion.modulo?.curso?.id_curso;
  const cursoTitulo = leccion.modulo?.curso?.titulo || 'Curso';
  const moduloTitulo = leccion.modulo?.titulo || 'Módulo';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            to={cursoId ? `/cursos/${cursoId}` : '/cursos'}
            className="hover:text-foreground flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            {cursoTitulo}
          </Link>
          <span>/</span>
          <span>{moduloTitulo}</span>
          <span>/</span>
          <span className="text-foreground">{leccion.titulo}</span>
        </div>
        <div className="flex items-center gap-2">
          {canMarkProgress && !progresoLoading && (
            <Button 
              variant={completada ? "default" : "outline"} 
              size="sm" 
              onClick={async () => {
                try {
                  await toggleCompletada();
                  toast({
                    title: completada ? 'Lección marcada como pendiente' : 'Lección completada',
                  });
                } catch {
                  toast({
                    title: 'Error',
                    description: 'No se pudo actualizar el progreso',
                    variant: 'destructive',
                  });
                }
              }}
              disabled={saving}
            >
              {completada ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Completada
                </>
              ) : (
                <>
                  <Circle className="h-4 w-4 mr-2" />
                  Marcar como completada
                </>
              )}
            </Button>
          )}
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <LeccionViewer leccion={leccion} />

      {/* Tareas */}
      <TareasLeccion idLeccion={leccion.id_leccion} canEdit={canEdit} />

      {/* Evaluaciones */}
      <EvaluacionesLeccion idLeccion={leccion.id_leccion} canEdit={canEdit} />

      {/* Adjuntos */}
      <AdjuntosManager idLeccion={leccion.id_leccion} canEdit={canEdit} />

      {/* Comentarios */}
      <ComentariosLeccion idLeccion={leccion.id_leccion} canDelete={canEdit} />

      {/* Edit Dialog */}
      {leccion.id_modulo && (
        <LeccionFormDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          idModulo={leccion.id_modulo}
          leccion={leccion}
          nextOrden={leccion.orden}
          onSuccess={fetchLeccion}
        />
      )}
    </div>
  );
};

export default LeccionPage;
