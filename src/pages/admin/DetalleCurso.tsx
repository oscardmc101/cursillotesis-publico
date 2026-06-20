import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Plus, 
  BookOpen, 
  User, 
  Calendar,
  Users,
  ChevronDown,
  ChevronRight,
  FileText,
  Video,
  File,
  CheckCircle,
  ClipboardList,
  FileQuestion,
  Award,
  Download,
  Settings,
  Layers,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/contexts/UserRoleContext';
import { useCurrentUsuario } from '@/hooks/useCurrentUsuario';
import { useProgresoLecciones } from '@/hooks/useProgresoLecciones';
import { toast } from '@/hooks/use-toast';
import CursoFormDialog from '@/components/cursos/CursoFormDialog';
import ModuloFormDialog from '@/components/modulos/ModuloFormDialog';
import LeccionFormDialog from '@/components/lecciones/LeccionFormDialog';
import ProgresoBarraCurso from '@/components/cursos/ProgresoBarraCurso';
import { CertificadoFormDialog } from '@/components/certificados/CertificadoFormDialog';
import { CertificadoViewer } from '@/components/certificados/CertificadoViewer';
import { useGruposCursos } from '@/hooks/useGruposCursos';

interface Curso {
  id_curso: string;
  titulo: string;
  descripcion: string | null;
  es_publicado: boolean;
  fecha_creacion: string;
  id_docente: string | null;
  id_grupo_curso: string | null;
  requiere_password: boolean;
  docente?: {
    nombres: string | null;
    apellidos: string | null;
  } | null;
  grupo?: {
    nombre: string | null;
    requiere_password?: boolean | null;
  } | null;
}

interface Modulo {
  id_modulo: string;
  titulo: string;
  orden: number;
  lecciones: Leccion[];
}

interface Leccion {
  id_leccion: string;
  titulo: string;
  orden: number;
  tipo_contenido: string;
  contenido_texto?: string | null;
  url_contenido?: string | null;
  es_publicada: boolean;
  tareas_count?: number;
  evaluaciones_count?: number;
}

type LeccionResumen = Pick<Leccion, 'id_leccion' | 'titulo' | 'orden' | 'tipo_contenido' | 'es_publicada'>;

interface Inscripcion {
  id_inscripcion: string;
  fecha_inscripcion: string;
  id_usuario: string;
  nombres: string | null;
  apellidos: string | null;
  correo: string | null;
}

interface DocenteColaborador {
  id_docente: string;
  nombres: string | null;
  apellidos: string | null;
}

interface DocentePublicoRpc {
  id_docente: string;
  nombres: string | null;
  apellidos: string | null;
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
};

const countByLeccion = (items: { id_leccion: string }[] | null | undefined) =>
  (items || []).reduce<Record<string, number>>((counts, item) => {
    counts[item.id_leccion] = (counts[item.id_leccion] || 0) + 1;
    return counts;
  }, {});

const parseAyudantesPublicos = (value: unknown): DocenteColaborador[] => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is DocentePublicoRpc =>
      Boolean(item)
      && typeof item === 'object'
      && 'id_docente' in item
    )
    .map((item) => ({
      id_docente: String(item.id_docente),
      nombres: typeof item.nombres === 'string' ? item.nombres : null,
      apellidos: typeof item.apellidos === 'string' ? item.apellidos : null,
    }));
};

const DetalleCurso = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, isDocente, isEstudiante, loading: roleLoading } = useUserRole();
  const { idUsuario, loading: usuarioLoading } = useCurrentUsuario();
  const { grupos } = useGruposCursos();

  const [curso, setCurso] = useState<Curso | null>(null);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [enrollPassword, setEnrollPassword] = useState('');
  const [showEnrollPassword, setShowEnrollPassword] = useState(false);
  const [expandedModulos, setExpandedModulos] = useState<Set<string>>(new Set());
  
  // Module management states
  const [moduloDialogOpen, setModuloDialogOpen] = useState(false);
  const [moduloToEdit, setModuloToEdit] = useState<Modulo | null>(null);
  const [deleteModuloDialogOpen, setDeleteModuloDialogOpen] = useState(false);
  const [moduloToDelete, setModuloToDelete] = useState<Modulo | null>(null);

  // Lesson management states
  const [leccionDialogOpen, setLeccionDialogOpen] = useState(false);
  const [leccionToEdit, setLeccionToEdit] = useState<Leccion | null>(null);
  const [currentModuloForLeccion, setCurrentModuloForLeccion] = useState<string | null>(null);
  const [deleteLeccionDialogOpen, setDeleteLeccionDialogOpen] = useState(false);
  const [leccionToDelete, setLeccionToDelete] = useState<Leccion | null>(null);

  // Certificate states
  const [certificadoFormOpen, setCertificadoFormOpen] = useState(false);
  const [certificadoViewerOpen, setCertificadoViewerOpen] = useState(false);
  const [currentUserName, setCurrentUserName] = useState('');
  const [isCursoDocente, setIsCursoDocente] = useState(false);
  const [docentesAyudantes, setDocentesAyudantes] = useState<DocenteColaborador[]>([]);

  const canEdit = isAdmin || (isDocente && isCursoDocente);
  const canDelete = isAdmin || (isDocente && curso?.id_docente === idUsuario);
  const canManageCollaborators = isAdmin || (isDocente && curso?.id_docente === idUsuario);
  const canViewInscripciones = isAdmin || (isDocente && isCursoDocente);
  const showProgress = isEstudiante && isEnrolled;

  // Get all lesson IDs for progress tracking
  const allLeccionIds = useMemo(() => {
    return modulos.flatMap(m => m.lecciones.map(l => l.id_leccion));
  }, [modulos]);

  const { progreso, loading: progresoLoading } = useProgresoLecciones(allLeccionIds);

  // Calculate progress stats
  const totalLecciones = allLeccionIds.length;
  const leccionesCompletadas = Object.values(progreso).filter(Boolean).length;
  const cursoCompletado = totalLecciones > 0 && leccionesCompletadas === totalLecciones;

  // Progress per module
  const progresoModulos = useMemo(() => {
    const result: Record<string, { completadas: number; total: number }> = {};
    modulos.forEach(m => {
      const total = m.lecciones.length;
      const completadas = m.lecciones.filter(l => progreso[l.id_leccion]).length;
      result[m.id_modulo] = { completadas, total };
    });
    return result;
  }, [modulos, progreso]);

  const fetchCurso = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      // Fetch course
      const { data: cursoData, error: cursoError } = await supabase
        .from('cursos')
        .select(`
          id_curso,
          titulo,
          descripcion,
          es_publicado,
          fecha_creacion,
          id_docente,
          id_grupo_curso,
          requiere_password,
          docente:id_docente (
            nombres,
            apellidos
          ),
          grupo:id_grupo_curso (
            nombre,
            requiere_password
          )
        `)
        .eq('id_curso', id)
        .single();

      if (cursoError) throw cursoError;

      const { data: puedeAcceder, error: accesoError } = await supabase.rpc(
        'can_access_curso_content',
        { p_curso_id: id }
      );

      if (accesoError) throw accesoError;

      if (!puedeAcceder) {
        toast({
          title: 'Inscripción requerida',
          description: 'Debes inscribirte al curso antes de acceder a su contenido.',
          variant: 'destructive',
        });
        navigate('/cursos', { replace: true });
        return;
      }

      const cursoNormalizado = {
        ...cursoData,
        docente: cursoData.docente && typeof cursoData.docente === 'object' && !Array.isArray(cursoData.docente)
          ? cursoData.docente as unknown as { nombres: string | null; apellidos: string | null }
          : null,
        grupo: cursoData.grupo && typeof cursoData.grupo === 'object' && !Array.isArray(cursoData.grupo)
          ? cursoData.grupo as unknown as { nombre: string | null; requiere_password?: boolean | null }
          : null,
      };

      const { data: docentesPublicos } = await supabase.rpc('rpc_get_curso_docentes_publicos', {
        p_id_curso: id,
      });

      const docentesCurso = docentesPublicos?.[0];
      setCurso({
        ...cursoNormalizado,
        docente: docentesCurso
          ? {
              nombres: docentesCurso.propietario_nombres,
              apellidos: docentesCurso.propietario_apellidos,
            }
          : cursoNormalizado.docente,
      });

      setDocentesAyudantes(parseAyudantesPublicos(docentesCurso?.ayudantes));

      let puedeGestionarCurso = false;
      if (idUsuario) {
        const { data: isDocenteCurso } = await supabase.rpc('can_manage_curso', {
          p_curso_id: id,
        });
        puedeGestionarCurso = Boolean(isDocenteCurso);
        setIsCursoDocente(puedeGestionarCurso);
      } else {
        setIsCursoDocente(false);
      }

      // Fetch modules with lessons
      const { data: modulosData } = await supabase
        .from('modulos')
        .select(`
          id_modulo,
          titulo,
          orden,
          lecciones (
            id_leccion,
            titulo,
            orden,
            tipo_contenido,
            es_publicada
          )
        `)
        .eq('id_curso', id)
        .order('orden');

      // Get all lesson IDs to fetch activity counts
      const allLeccionesIds = (modulosData || []).flatMap(m => 
        Array.isArray(m.lecciones) ? (m.lecciones as LeccionResumen[]).map(l => l.id_leccion) : []
      );

      // Fetch task and evaluation counts per lesson in a single batch per table
      let tareasCounts: Record<string, number> = {};
      let evaluacionesCounts: Record<string, number> = {};
      if (allLeccionesIds.length > 0) {
        const [
          { data: tareasData, error: tareasError },
          { data: evaluacionesData, error: evaluacionesError },
        ] = await Promise.all([
          supabase
            .from('tareas')
            .select('id_leccion')
            .in('id_leccion', allLeccionesIds),
          supabase
            .from('evaluaciones')
            .select('id_leccion')
            .in('id_leccion', allLeccionesIds),
        ]);

        if (tareasError) throw tareasError;
        if (evaluacionesError) throw evaluacionesError;

        tareasCounts = countByLeccion(tareasData);
        evaluacionesCounts = countByLeccion(evaluacionesData);
      }

      const modulosWithLecciones = (modulosData || []).map(m => ({
        ...m,
        lecciones: Array.isArray(m.lecciones) 
          ? (m.lecciones as LeccionResumen[])
              .sort((a, b) => a.orden - b.orden)
              .map(l => ({
                ...l,
                tareas_count: tareasCounts[l.id_leccion] || 0,
                evaluaciones_count: evaluacionesCounts[l.id_leccion] || 0,
              }))
          : [],
      }));

      setModulos(modulosWithLecciones);

      // Fetch enrollments if admin/docente using RPC
      if (isAdmin || (isDocente && puedeGestionarCurso)) {
        const { data: inscripcionesData, error: inscError } = await supabase.rpc(
          'rpc_list_inscritos_curso',
          { p_id_curso: id }
        );

        if (!inscError && inscripcionesData) {
          setInscripciones(inscripcionesData as Inscripcion[]);
        } else {
          console.error('Error fetching inscripciones:', inscError);
          setInscripciones([]);
        }
      }

      // Check if current user is enrolled
      if (idUsuario) {
        const { data: enrollment } = await supabase
          .from('inscripciones')
          .select('id_inscripcion')
          .eq('id_curso', id)
          .eq('id_usuario', idUsuario)
          .single();

        setIsEnrolled(!!enrollment);
      }
    } catch (error) {
      console.error('Error fetching curso:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar el curso',
        variant: 'destructive',
      });
      navigate('/cursos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!roleLoading && !usuarioLoading && id) {
      fetchCurso();
    }
  }, [id, roleLoading, usuarioLoading, idUsuario, isAdmin, isDocente]);

  // Fetch current user name for certificate
  useEffect(() => {
    const fetchUserName = async () => {
      if (idUsuario) {
        const { data } = await supabase
          .from('usuarios')
          .select('nombres, apellidos')
          .eq('id_usuario', idUsuario)
          .single();
        if (data) {
          setCurrentUserName(`${data.nombres || ''} ${data.apellidos || ''}`.trim());
        }
      }
    };
    fetchUserName();
  }, [idUsuario]);

  const handleEnroll = async (password?: string) => {
    if (!idUsuario || !id) return;

    const requiresPassword = Boolean(curso?.requiere_password || curso?.grupo?.requiere_password);
    if (requiresPassword && password === undefined) {
      setPasswordDialogOpen(true);
      setEnrollPassword('');
      setShowEnrollPassword(false);
      return;
    }
    
    setEnrollLoading(true);
    try {
      const { error } = await supabase.rpc('rpc_inscribirse_curso', {
        p_id_curso: id,
        p_password: password?.trim() || null,
      });

      if (error) throw error;

      setIsEnrolled(true);
      setPasswordDialogOpen(false);
      setEnrollPassword('');
      setShowEnrollPassword(false);
      toast({ title: 'Inscripción exitosa' });
      fetchCurso();
    } catch (error: unknown) {
      console.error('Error enrolling:', error);
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'No se pudo inscribir'),
        variant: 'destructive',
      });
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleUnenroll = async () => {
    if (!idUsuario || !id) return;
    
    setEnrollLoading(true);
    try {
      const { error } = await supabase
        .from('inscripciones')
        .delete()
        .eq('id_curso', id)
        .eq('id_usuario', idUsuario);

      if (error) throw error;

      setIsEnrolled(false);
      toast({ title: 'Inscripción cancelada' });
      navigate('/cursos', { replace: true });
    } catch (error: unknown) {
      console.error('Error unenrolling:', error);
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'No se pudo cancelar la inscripcion'),
        variant: 'destructive',
      });
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    
    try {
      const { error } = await supabase
        .from('cursos')
        .delete()
        .eq('id_curso', id);

      if (error) throw error;

      toast({ title: 'Curso eliminado correctamente' });
      navigate('/cursos');
    } catch (error: unknown) {
      console.error('Error deleting curso:', error);
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'No se pudo eliminar el curso'),
        variant: 'destructive',
      });
    }
  };

  const toggleModulo = (moduloId: string) => {
    setExpandedModulos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduloId)) {
        newSet.delete(moduloId);
      } else {
        newSet.add(moduloId);
      }
      return newSet;
    });
  };

  const handleOpenModuloDialog = (modulo?: Modulo) => {
    setModuloToEdit(modulo || null);
    setModuloDialogOpen(true);
  };

  const handleConfirmDeleteModulo = (modulo: Modulo) => {
    setModuloToDelete(modulo);
    setDeleteModuloDialogOpen(true);
  };

  const handleDeleteModulo = async () => {
    if (!moduloToDelete) return;

    try {
      const { error } = await supabase
        .from('modulos')
        .delete()
        .eq('id_modulo', moduloToDelete.id_modulo);

      if (error) throw error;

      toast({ title: 'Módulo eliminado correctamente' });
      setDeleteModuloDialogOpen(false);
      setModuloToDelete(null);
      fetchCurso();
    } catch (error: unknown) {
      console.error('Error deleting modulo:', error);
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'No se pudo eliminar el modulo'),
        variant: 'destructive',
      });
    }
  };

  // Lesson management handlers
  const handleOpenLeccionDialog = (modulo: Modulo, leccion?: Leccion) => {
    setCurrentModuloForLeccion(modulo.id_modulo);
    setLeccionToEdit(leccion || null);
    setLeccionDialogOpen(true);
  };

  const handleConfirmDeleteLeccion = (leccion: Leccion) => {
    setLeccionToDelete(leccion);
    setDeleteLeccionDialogOpen(true);
  };

  const handleDeleteLeccion = async () => {
    if (!leccionToDelete) return;

    try {
      const { error } = await supabase
        .from('lecciones')
        .delete()
        .eq('id_leccion', leccionToDelete.id_leccion);

      if (error) throw error;

      toast({ title: 'Lección eliminada correctamente' });
      setDeleteLeccionDialogOpen(false);
      setLeccionToDelete(null);
      fetchCurso();
    } catch (error: unknown) {
      console.error('Error deleting leccion:', error);
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'No se pudo eliminar la leccion'),
        variant: 'destructive',
      });
    }
  };

  const getLeccionIcon = (tipo: string) => {
    switch (tipo) {
      case 'VIDEO':
        return <Video className="h-4 w-4 text-muted-foreground" />;
      case 'PDF':
        return <File className="h-4 w-4 text-muted-foreground" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (loading || roleLoading || usuarioLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!curso) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Curso no encontrado</p>
        <Link to="/cursos">
          <Button className="mt-4">Volver a Cursos</Button>
        </Link>
      </div>
    );
  }

  const docenteNombre = curso.docente 
    ? `${curso.docente.nombres || ''} ${curso.docente.apellidos || ''}`.trim() || 'Sin asignar'
    : 'Sin asignar';

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link to="/cursos" className="inline-flex items-center text-sm text-slate-800 dark:text-slate-200 hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Volver a Cursos
      </Link>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{curso.titulo}</h1>
            <Badge variant={curso.es_publicado ? 'default' : 'secondary'}>
              {curso.es_publicado ? 'Publicado' : 'Borrador'}
            </Badge>
            {(curso.requiere_password || curso.grupo?.requiere_password) && (
              <Badge variant="outline" className="gap-1">
                <Lock className="h-3 w-3" />
                Con clave
              </Badge>
            )}
          </div>
          <p className="text-slate-800 dark:text-slate-200 font-medium">{curso.descripcion || 'Sin descripción'}</p>
          
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-slate-800 dark:text-slate-200 font-medium">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{docenteNombre}</span>
            </div>
            {docentesAyudantes.length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>
                  Ayudantes: {docentesAyudantes
                    .map((docente) => `${docente.nombres || ''} ${docente.apellidos || ''}`.trim() || 'Docente')
                    .join(', ')}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              <span>{curso.grupo?.nombre || 'Sin grupo'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{new Date(curso.fecha_creacion).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span>{modulos.length} módulos</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{inscripciones.length} inscritos</span>
            </div>
          </div>

          {/* Progress bar for students */}
          {showProgress && totalLecciones > 0 && (
            <div className="mt-4">
              <ProgresoBarraCurso 
                completadas={leccionesCompletadas} 
                total={totalLecciones} 
              />
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {canEdit ? (
            <>
              <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              {canDelete && (
                <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </Button>
              )}
            </>
          ) : isEstudiante && curso.es_publicado && (
            isEnrolled ? (
              <Button variant="destructive" onClick={handleUnenroll} disabled={enrollLoading}>
                {enrollLoading ? 'Procesando...' : 'Cancelar inscripción'}
              </Button>
            ) : (
              <Button onClick={() => handleEnroll()} disabled={enrollLoading}>
                {enrollLoading ? 'Procesando...' : 'Inscribirse'}
              </Button>
            )
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Modules */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Contenido del Curso</CardTitle>
              {canEdit && (
                <Button size="sm" onClick={() => handleOpenModuloDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Módulo
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {modulos.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Este curso aún no tiene módulos
                </p>
              ) : (
                <div className="space-y-2">
                  {modulos.map((modulo) => (
                    <Collapsible
                      key={modulo.id_modulo}
                      open={expandedModulos.has(modulo.id_modulo)}
                      onOpenChange={() => toggleModulo(modulo.id_modulo)}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between w-full p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                          <div className="flex items-center gap-3">
                            {expandedModulos.has(modulo.id_modulo) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <span className="font-medium">{modulo.titulo}</span>
                            {showProgress && progresoModulos[modulo.id_modulo] && (
                              <Badge variant={
                                progresoModulos[modulo.id_modulo].completadas === progresoModulos[modulo.id_modulo].total && progresoModulos[modulo.id_modulo].total > 0
                                  ? 'default'
                                  : 'outline'
                              } className="text-xs">
                                {progresoModulos[modulo.id_modulo].completadas}/{progresoModulos[modulo.id_modulo].total}
                              </Badge>
                            )}
                            {!showProgress && (
                              <Badge variant="outline" className="text-xs">
                                {modulo.lecciones.length} lecciones
                              </Badge>
                            )}
                          </div>
                          {canEdit && (
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => handleOpenModuloDialog(modulo)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleConfirmDeleteModulo(modulo)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pl-10 mt-2 space-y-1">
                        {modulo.lecciones.map((leccion) => (
                          <div
                            key={leccion.id_leccion}
                            className="flex items-center gap-2 p-2 rounded hover:bg-muted/30 group"
                          >
                            {showProgress && progreso[leccion.id_leccion] ? (
                              <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                            ) : (
                              getLeccionIcon(leccion.tipo_contenido)
                            )}
                            <Link
                              to={`/lecciones/${leccion.id_leccion}`}
                              className={`text-sm hover:underline flex-1 min-w-0 truncate ${showProgress && progreso[leccion.id_leccion] ? 'text-muted-foreground' : ''}`}
                            >
                              {leccion.titulo}
                            </Link>
                            <div className="ml-auto flex flex-shrink-0 items-center gap-1.5">
                              <Badge variant="secondary" className="text-xs">
                                {leccion.tipo_contenido}
                              </Badge>
                              {(leccion.tareas_count || 0) > 0 && (
                                <Badge variant="outline" className="text-xs gap-1 flex items-center">
                                  <ClipboardList className="h-3 w-3" />
                                  {leccion.tareas_count}
                                </Badge>
                              )}
                              {(leccion.evaluaciones_count || 0) > 0 && (
                                <Badge variant="outline" className="text-xs gap-1 flex items-center">
                                  <FileQuestion className="h-3 w-3" />
                                  {leccion.evaluaciones_count}
                                </Badge>
                              )}
                            </div>
                            {canEdit && (
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={() => handleOpenLeccionDialog(modulo, leccion)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 text-destructive"
                                  onClick={() => handleConfirmDeleteLeccion(leccion)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-muted-foreground"
                            onClick={() => handleOpenLeccionDialog(modulo)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar lección
                          </Button>
                        )}
                        {modulo.lecciones.length === 0 && !canEdit && (
                          <p className="text-sm text-muted-foreground py-2">
                            Sin lecciones
                          </p>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Certificate Section */}
          {(canEdit || (showProgress && isEnrolled)) && (
            <Card className={cursoCompletado && showProgress ? 'border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className={`h-5 w-5 ${cursoCompletado && showProgress ? 'text-green-600' : 'text-muted-foreground'}`} />
                  Certificado
                </CardTitle>
              </CardHeader>
              <CardContent>
                {canEdit ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Configura el certificado que recibirán los estudiantes al completar el curso.
                    </p>
                    <Button 
                      variant="outline" 
                      className="w-full gap-2"
                      onClick={() => setCertificadoFormOpen(true)}
                    >
                      <Settings className="h-4 w-4" />
                      Configurar Certificado
                    </Button>
                  </div>
                ) : showProgress && cursoCompletado ? (
                  <div className="space-y-3">
                    <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                      ¡Felicitaciones! Has completado el curso.
                    </p>
                    <Button 
                      className="w-full gap-2 bg-green-600 hover:bg-green-700"
                      onClick={() => setCertificadoViewerOpen(true)}
                    >
                      <Download className="h-4 w-4" />
                      Descargar Certificado
                    </Button>
                  </div>
                ) : showProgress ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Completa el 100% del curso para obtener tu certificado.
                    </p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progreso</span>
                        <span>{Math.round((leccionesCompletadas / totalLecciones) * 100)}%</span>
                      </div>
                      <Progress value={(leccionesCompletadas / totalLecciones) * 100} className="h-2" />
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          {/* Inscripciones (solo admin/docente) */}
          {canViewInscripciones && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Estudiantes Inscritos</CardTitle>
              </CardHeader>
              <CardContent>
                {inscripciones.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    Aún no hay estudiantes inscritos
                  </p>
                ) : (
                  <div className="space-y-3">
                    {inscripciones.slice(0, 10).map((inscripcion) => (
                      <div key={inscripcion.id_inscripcion} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {inscripcion.nombres} {inscripcion.apellidos}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {inscripcion.correo}
                          </p>
                        </div>
                      </div>
                    ))}
                    {inscripciones.length > 10 && (
                      <p className="text-sm text-muted-foreground text-center pt-2">
                        +{inscripciones.length - 10} más
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <CursoFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        curso={curso}
        isAdmin={isAdmin}
        currentIdUsuario={idUsuario}
        grupos={grupos}
        canManageCollaborators={canManageCollaborators}
        onSuccess={fetchCurso}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar curso?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán todos los módulos,
              lecciones e inscripciones asociadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modulo Form Dialog */}
      {id && (
        <ModuloFormDialog
          open={moduloDialogOpen}
          onOpenChange={setModuloDialogOpen}
          idCurso={id}
          modulo={moduloToEdit}
          nextOrden={modulos.length + 1}
          onSuccess={fetchCurso}
        />
      )}

      {/* Delete Modulo Confirmation */}
      <AlertDialog open={deleteModuloDialogOpen} onOpenChange={setDeleteModuloDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar módulo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán todas las lecciones asociadas a este módulo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteModulo} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leccion Form Dialog */}
      {currentModuloForLeccion && (
        <LeccionFormDialog
          open={leccionDialogOpen}
          onOpenChange={(open) => {
            setLeccionDialogOpen(open);
            if (!open) {
              setCurrentModuloForLeccion(null);
              setLeccionToEdit(null);
            }
          }}
          idModulo={currentModuloForLeccion}
          leccion={leccionToEdit}
          nextOrden={
            (modulos.find(m => m.id_modulo === currentModuloForLeccion)?.lecciones.length ?? 0) + 1
          }
          onSuccess={fetchCurso}
        />
      )}

      {/* Delete Leccion Confirmation */}
      <AlertDialog open={deleteLeccionDialogOpen} onOpenChange={setDeleteLeccionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar lección?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán todos los comentarios y adjuntos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLeccion} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Certificate Form Dialog for Docente/Admin */}
      {id && curso && (
        <CertificadoFormDialog
          open={certificadoFormOpen}
          onOpenChange={setCertificadoFormOpen}
          idCurso={id}
          tituloCurso={curso.titulo}
        />
      )}

      {/* Certificate Viewer Dialog for Students */}
      {id && curso && (
        <CertificadoViewer
          open={certificadoViewerOpen}
          onOpenChange={setCertificadoViewerOpen}
          idCurso={id}
          tituloCurso={curso.titulo}
          nombreEstudiante={currentUserName}
        />
      )}

      <Dialog open={passwordDialogOpen} onOpenChange={(open) => {
        setPasswordDialogOpen(open);
        if (!open) {
          setEnrollPassword('');
          setShowEnrollPassword(false);
        }
      }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Ingresar contrasena</DialogTitle>
            <DialogDescription>
              Este curso o su grupo requiere una contrasena para inscribirse.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Input
              type={showEnrollPassword ? 'text' : 'password'}
              value={enrollPassword}
              onChange={(event) => setEnrollPassword(event.target.value)}
              placeholder="Contrasena de acceso"
              autoComplete="current-password"
              className="pr-10"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleEnroll(enrollPassword);
                }
              }}
            />
            <button
              type="button"
              aria-label={showEnrollPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
              onClick={() => setShowEnrollPassword((show) => !show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showEnrollPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPasswordDialogOpen(false);
                setEnrollPassword('');
                setShowEnrollPassword(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => handleEnroll(enrollPassword)}
              disabled={!enrollPassword.trim() || enrollLoading}
            >
              {enrollLoading ? 'Procesando...' : 'Inscribirse'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DetalleCurso;
