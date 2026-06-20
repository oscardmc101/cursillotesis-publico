import { useEffect, useState } from 'react';
import { Plus, Search, Filter, AlertCircle, Layers, Edit, Trash2, Lock, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/contexts/UserRoleContext';
import { useCursillo } from '@/contexts/CursilloContext';
import { useCurrentUsuario } from '@/hooks/useCurrentUsuario';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import CursoCard from '@/components/cursos/CursoCard';
import CursoFormDialog from '@/components/cursos/CursoFormDialog';
import { GrupoCursoDialog, GrupoCursoDialogData } from '@/components/cursos/GrupoCursoDialog';
import { GrupoCurso, GrupoCursoFormData, SIN_GRUPO_ID, useGruposCursos } from '@/hooks/useGruposCursos';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';



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
  _count?: {
    modulos: number;
    inscripciones: number;
  };
}

interface CursosQueryResult {
  cursos: Curso[];
  enrolledIds: Set<string>;
  colaboradorCursoIds: Set<string>;
}

type CursoFilter = 'all' | 'published' | 'draft';

interface CursoDocentesPublicos {
  propietario_nombres: string | null;
  propietario_apellidos: string | null;
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
};

const Cursos = () => {
  const { isAdmin, isDocente, isPendiente, isEstudiante, loading: roleLoading } = useUserRole();
  const { idCursilloActivo: CURSILLO_ID } = useCursillo();
  const { idUsuario, loading: usuarioLoading } = useCurrentUsuario();
  const { grupos, loading: loadingGrupos, createGrupo, updateGrupo, deleteGrupo } = useGruposCursos();
  const queryClient = useQueryClient();
  const canManage = isAdmin || isDocente;

  const [enrollLoading, setEnrollLoading] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CursoFilter>('all');
  const [grupoFilter, setGrupoFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCurso, setEditingCurso] = useState<Curso | null>(null);
  const [grupoDialogOpen, setGrupoDialogOpen] = useState(false);
  const [editingGrupo, setEditingGrupo] = useState<GrupoCurso | null>(null);
  const [deleteGrupoId, setDeleteGrupoId] = useState<string | null>(null);
  const [passwordDialogCurso, setPasswordDialogCurso] = useState<Curso | null>(null);
  const [enrollPassword, setEnrollPassword] = useState('');
  const [showEnrollPassword, setShowEnrollPassword] = useState(false);

  // ✅ useQuery para caché automático + Promise.all para queries en paralelo
  const { data: cursosResult, isLoading: loading, error: fetchError } = useQuery<CursosQueryResult>({
    queryKey: ['cursos', idUsuario, CURSILLO_ID],
    queryFn: async () => {
      // ✅ Las 4 queries se ejecutan en PARALELO (antes eran secuenciales)
      const [cursosRes, modulosRes, inscripcionesRes, enrollRes, colaboradoresRes] = await Promise.all([
        supabase
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
          .eq('id_cursillo', CURSILLO_ID)
          .order('fecha_creacion', { ascending: false }),
        supabase.from('modulos').select('id_curso'),
        supabase.from('inscripciones').select('id_curso'),
        idUsuario
          ? supabase.from('inscripciones').select('id_curso').eq('id_usuario', idUsuario)
          : Promise.resolve({ data: [] as { id_curso: string }[], error: null }),
        idUsuario
          ? supabase.from('curso_docentes_colaboradores').select('id_curso').eq('id_docente', idUsuario)
          : Promise.resolve({ data: [] as { id_curso: string }[], error: null }),
      ]);

      if (cursosRes.error) throw cursosRes.error;

      // Calcular conteos desde los datos obtenidos
      const moduloCounts: Record<string, number> = {};
      const inscripcionCounts: Record<string, number> = {};

      modulosRes.data?.forEach(m => {
        moduloCounts[m.id_curso] = (moduloCounts[m.id_curso] || 0) + 1;
      });
      inscripcionesRes.data?.forEach(i => {
        inscripcionCounts[i.id_curso] = (inscripcionCounts[i.id_curso] || 0) + 1;
      });

      const enrolledIds = new Set<string>(enrollRes.data?.map(e => e.id_curso) || []);
      const colaboradorCursoIds = new Set<string>(colaboradoresRes.data?.map(c => c.id_curso) || []);

      const docentesPublicosEntries = await Promise.all(
        (cursosRes.data || []).map(async (curso) => {
          const { data } = await supabase.rpc('rpc_get_curso_docentes_publicos', {
            p_id_curso: curso.id_curso,
          });
          return [curso.id_curso, data?.[0] || null] as const;
        })
      );

      const docentesPublicosByCurso = new Map<string, CursoDocentesPublicos | null>(docentesPublicosEntries);

      const cursosWithCounts = (cursosRes.data || []).map(curso => {
        const docentePublico = docentesPublicosByCurso.get(curso.id_curso);

        return {
          ...curso,
          docente: docentePublico
            ? {
              nombres: docentePublico.propietario_nombres,
              apellidos: docentePublico.propietario_apellidos,
            }
            : curso.docente && typeof curso.docente === 'object' && !Array.isArray(curso.docente)
              ? curso.docente as unknown as { nombres: string | null; apellidos: string | null }
              : null,
          grupo: curso.grupo && typeof curso.grupo === 'object' && !Array.isArray(curso.grupo)
            ? curso.grupo as unknown as { nombre: string | null; requiere_password?: boolean | null }
            : null,
          _count: {
            modulos: moduloCounts[curso.id_curso] || 0,
            inscripciones: inscripcionCounts[curso.id_curso] || 0,
          },
        };
      });

      return { cursos: cursosWithCounts, enrolledIds, colaboradorCursoIds };
    },
    enabled: !roleLoading && !usuarioLoading,
  });

  const cursos = cursosResult?.cursos || [];
  const enrolledCursos = cursosResult?.enrolledIds || new Set<string>();
  const colaboradorCursoIds = cursosResult?.colaboradorCursoIds || new Set<string>();

  // Invalidar el caché de cursos (en lugar de llamar fetchCursos directamente)
  const refetchCursos = () => {
    queryClient.invalidateQueries({ queryKey: ['cursos'] });
    queryClient.invalidateQueries({ queryKey: ['grupos-cursos'] });
  };

  const handleEnroll = async (curso: Curso, password?: string) => {
    if (!idUsuario) return;

    // Block enrollment for pending users
    if (isPendiente) {
      toast({
        title: 'Acción no disponible',
        description: 'Tu cuenta está pendiente de aprobación. Espera a ser aprobado para inscribirte en cursos.',
        variant: 'destructive',
      });
      return;
    }

    const requiresPassword = curso.requiere_password || Boolean(curso.grupo?.requiere_password);
    if (requiresPassword && password === undefined) {
      setPasswordDialogCurso(curso);
      setEnrollPassword('');
      setShowEnrollPassword(false);
      return;
    }

    setEnrollLoading(curso.id_curso);
    try {
      const { error } = await supabase.rpc('rpc_inscribirse_curso', {
        p_id_curso: curso.id_curso,
        p_password: password?.trim() || null,
      });

      if (error) throw error;

      // Enviar correo de confirmación de forma asíncrona
      supabase.functions.invoke('send-inscripcion-email', {
        body: { id_usuario: idUsuario, id_curso: curso.id_curso }
      }).catch(err => console.error("Error al enviar correo de inscripción:", err));

      toast({ title: 'Inscripción exitosa' });
      setPasswordDialogCurso(null);
      setEnrollPassword('');
      setShowEnrollPassword(false);
      refetchCursos();
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'No se pudo inscribir');
      console.error('Error enrolling:', error);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setEnrollLoading(null);
    }
  };

  const handleUnenroll = async (cursoId: string) => {
    if (!idUsuario) return;

    setEnrollLoading(cursoId);
    try {
      const { error } = await supabase
        .from('inscripciones')
        .delete()
        .eq('id_curso', cursoId)
        .eq('id_usuario', idUsuario);

      if (error) throw error;

      toast({ title: 'Inscripción cancelada' });
      refetchCursos();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'No se pudo cancelar la inscripcion';
      console.error('Error unenrolling:', error);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setEnrollLoading(null);
    }
  };

  const handleOpenCreate = () => {
    setEditingCurso(null);
    setDialogOpen(true);
  };

  // Filter and search
  const filteredCursos = cursos.filter(curso => {
    const matchesSearch = curso.titulo.toLowerCase().includes(search.toLowerCase()) ||
      (curso.descripcion?.toLowerCase().includes(search.toLowerCase()));

    const matchesFilter =
      filter === 'all' ||
      (filter === 'published' && curso.es_publicado) ||
      (filter === 'draft' && !curso.es_publicado);

    const matchesGrupo =
      grupoFilter === 'all' ||
      (grupoFilter === SIN_GRUPO_ID && !curso.id_grupo_curso) ||
      curso.id_grupo_curso === grupoFilter;

    return matchesSearch && matchesFilter && matchesGrupo;
  });

  const gruposConCursos = grupos
    .map(grupo => ({
      grupo,
      cursos: filteredCursos.filter(curso => curso.id_grupo_curso === grupo.id_grupo_curso),
    }))
    .filter(item => item.cursos.length > 0);

  const cursosSinGrupo = filteredCursos.filter(curso => !curso.id_grupo_curso);

  const handleOpenCreateGrupo = () => {
    setEditingGrupo(null);
    setGrupoDialogOpen(true);
  };

  const handleEditGrupo = (grupo: GrupoCurso) => {
    setEditingGrupo(grupo);
    setGrupoDialogOpen(true);
  };

  const handleSubmitGrupo = (data: GrupoCursoDialogData) => {
    const payload: GrupoCursoFormData = {
      nombre: data.nombre || '',
      descripcion: data.descripcion,
      es_activo: data.es_activo ?? true,
      requiere_password: data.requiere_password ?? false,
      password: data.password,
    };

    if (editingGrupo) {
      updateGrupo.mutate(
        { id: editingGrupo.id_grupo_curso, ...payload },
        { onSuccess: () => setGrupoDialogOpen(false) }
      );
      return;
    }

    createGrupo.mutate(payload, { onSuccess: () => setGrupoDialogOpen(false) });
  };

  const handleDeleteGrupo = () => {
    if (!deleteGrupoId) return;
    deleteGrupo.mutate(deleteGrupoId, { onSuccess: () => setDeleteGrupoId(null) });
  };

  const canEditCurso = (curso: Curso) => {
    return isAdmin || (isDocente && (curso.id_docente === idUsuario || colaboradorCursoIds.has(curso.id_curso)));
  };

  const canManageCursoCollaborators = (curso: Curso | null) => {
    return isAdmin || (curso ? isDocente && curso.id_docente === idUsuario : isDocente);
  };

  const handleConfirmPasswordEnroll = () => {
    if (!passwordDialogCurso) return;
    handleEnroll(passwordDialogCurso, enrollPassword);
  };

  if (loading || roleLoading || usuarioLoading || loadingGrupos) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="p-6 bg-red-100 text-red-900 rounded-md">
        <h3 className="text-lg font-bold">Error cargando cursos</h3>
        <p>{fetchError instanceof Error ? fetchError.message : JSON.stringify(fetchError)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Cursos</h1>
          <p className="text-muted-foreground mt-1">
            {canManage ? 'Gestiona los cursos de la plataforma' : 'Explora los cursos disponibles'}
          </p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleOpenCreateGrupo}>
              <Layers className="h-4 w-4 mr-2" />
              Nuevo Grupo
            </Button>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Curso
            </Button>
          </div>
        )}
      </div>

      {/* Warning for pending users */}
      {isPendiente && (
        <Alert className="border-warning/50 bg-warning/10">
          <AlertCircle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning">
            Tu cuenta está pendiente de aprobación. Podrás inscribirte en los cursos una vez que tu cuenta sea aprobada.
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cursos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        {canManage && (
          <Select
            value={filter}
            onValueChange={(value) => {
              if (value === 'all' || value === 'published' || value === 'draft') {
                setFilter(value);
              }
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="published">Publicados</SelectItem>
              <SelectItem value="draft">Borradores</SelectItem>
            </SelectContent>
          </Select>
        )}
        <Select value={grupoFilter} onValueChange={setGrupoFilter}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <Layers className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Grupo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los grupos</SelectItem>
            {grupos.map((grupo) => (
              <SelectItem key={grupo.id_grupo_curso} value={grupo.id_grupo_curso}>
                {grupo.nombre}
              </SelectItem>
            ))}
            <SelectItem value={SIN_GRUPO_ID}>Sin grupo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {canManage && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Grupos de cursos
              </CardTitle>
              <Button size="sm" variant="outline" onClick={handleOpenCreateGrupo}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo grupo
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {grupos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Todavia no hay grupos de cursos. Crea uno para organizar materias por cursillo o programa.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {grupos.map((grupo) => (
                  <div key={grupo.id_grupo_curso} className="rounded-lg border p-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{grupo.nombre}</p>
                        {!grupo.es_activo && <Badge variant="secondary">Inactivo</Badge>}
                        {grupo.requiere_password && (
                          <Badge variant="outline" className="gap-1">
                            <Lock className="h-3 w-3" />
                            Con clave
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {grupo.total_cursos} curso{grupo.total_cursos !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEditGrupo(grupo)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      {isAdmin && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteGrupoId(grupo.id_grupo_curso)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Courses Grid */}
      {filteredCursos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {search || filter !== 'all'
              ? 'No se encontraron cursos con los filtros aplicados'
              : 'No hay cursos disponibles'}
          </p>
          {canManage && !search && filter === 'all' && (
            <Button className="mt-4" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Crear primer curso
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {gruposConCursos.map(({ grupo, cursos }) => (
            <section key={grupo.id_grupo_curso} className="space-y-4">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">{grupo.nombre}</h2>
                <Badge variant="outline">{cursos.length}</Badge>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {cursos.map((curso) => (
                  <CursoCard
                    key={curso.id_curso}
                    curso={curso}
                    canEdit={canEditCurso(curso)}
                    canViewDetails={canEditCurso(curso) || enrolledCursos.has(curso.id_curso)}
                    canEnroll={isEstudiante}
                    isEnrolled={enrolledCursos.has(curso.id_curso)}
                    onEnroll={() => handleEnroll(curso)}
                    onUnenroll={() => handleUnenroll(curso.id_curso)}
                    enrollLoading={enrollLoading === curso.id_curso}
                  />
                ))}
              </div>
            </section>
          ))}

          {cursosSinGrupo.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-xl font-semibold">Sin grupo</h2>
                <Badge variant="outline">{cursosSinGrupo.length}</Badge>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {cursosSinGrupo.map((curso) => (
                  <CursoCard
                    key={curso.id_curso}
                    curso={curso}
                    canEdit={canEditCurso(curso)}
                    canViewDetails={canEditCurso(curso) || enrolledCursos.has(curso.id_curso)}
                    canEnroll={isEstudiante}
                    isEnrolled={enrolledCursos.has(curso.id_curso)}
                    onEnroll={() => handleEnroll(curso)}
                    onUnenroll={() => handleUnenroll(curso.id_curso)}
                    enrollLoading={enrollLoading === curso.id_curso}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <CursoFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        curso={editingCurso}
        isAdmin={isAdmin}
        currentIdUsuario={idUsuario}
        grupos={grupos}
        canManageCollaborators={canManageCursoCollaborators(editingCurso)}
        onSuccess={refetchCursos}
      />

      <GrupoCursoDialog
        open={grupoDialogOpen}
        onOpenChange={setGrupoDialogOpen}
        grupo={editingGrupo}
        onSubmit={handleSubmitGrupo}
        isLoading={createGrupo.isPending || updateGrupo.isPending}
      />

      <AlertDialog open={!!deleteGrupoId} onOpenChange={() => setDeleteGrupoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar grupo</AlertDialogTitle>
            <AlertDialogDescription>
              Los cursos de este grupo no se eliminaran, solo quedaran sin grupo asignado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGrupo} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!passwordDialogCurso} onOpenChange={(open) => {
        if (!open) {
          setPasswordDialogCurso(null);
          setEnrollPassword('');
          setShowEnrollPassword(false);
        }
      }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Ingresar contraseña</DialogTitle>
            <DialogDescription>
              Este curso o su grupo requiere una contraseña para inscribirse.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Input
              type={showEnrollPassword ? 'text' : 'password'}
              value={enrollPassword}
              onChange={(event) => setEnrollPassword(event.target.value)}
              placeholder="Contraseña de acceso"
              autoComplete="current-password"
              className="pr-10"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleConfirmPasswordEnroll();
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
                setPasswordDialogCurso(null);
                setEnrollPassword('');
                setShowEnrollPassword(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmPasswordEnroll}
              disabled={!enrollPassword.trim() || enrollLoading === passwordDialogCurso?.id_curso}
            >
              {enrollLoading === passwordDialogCurso?.id_curso ? 'Procesando...' : 'Inscribirse'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Cursos;
