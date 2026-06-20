import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/contexts/UserRoleContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import EditarPerfilDialog from '@/components/perfil/EditarPerfilDialog';
import { 
  Mail, 
  Calendar, 
  BookOpen, 
  CheckCircle, 
  Clock,
  Award,
  TrendingUp,
  Pencil,
  Phone,
  Users,
  GraduationCap,
  FileText,
  Quote
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface UserProfile {
  id_usuario: string;
  nombres: string | null;
  apellidos: string | null;
  correo: string | null;
  telefono: string | null;
  telefono_visible: boolean;
  fecha_creacion: string;
  biografia: string | null;
  avatar_url: string | null;
}

interface CursoInscrito {
  id_curso: string;
  titulo: string;
  fecha_inscripcion: string;
  progreso: number;
  leccionesCompletadas: number;
  totalLecciones: number;
}

interface EstadisticasUsuario {
  cursosInscritos: number;
  leccionesCompletadas: number;
  tareasEntregadas: number;
  evaluacionesRealizadas: number;
  promedioGeneral: number;
}

interface EstadisticasDocente {
  cursosAsignados: number;
  estudiantesTotal: number;
  tareasCreadas: number;
  evaluacionesCreadas: number;
}


const Perfil = () => {
  const { user } = useAuth();
  const { role, estado, isAdmin, isDocente, isEstudiante } = useUserRole();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const getAvatarUrl = (path: string | null | undefined) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  };

  // Fetch user profile
  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id_auth', user.id)
      .single();

    if (!error && data) {
      setProfile(data);
    }
    setLoadingProfile(false);
  }, [user?.id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Fetch enrolled courses with progress (for students)
  const { data: cursosInscritos, isLoading: loadingCursos } = useQuery({
    queryKey: ['perfil-cursos', profile?.id_usuario],
    queryFn: async () => {
      if (!profile?.id_usuario) return [];

      const { data: inscripciones, error } = await supabase
        .from('inscripciones')
        .select(`
          id_curso,
          fecha_inscripcion,
          cursos:id_curso (
            titulo
          )
        `)
        .eq('id_usuario', profile.id_usuario);

      if (error) throw error;

      const cursosConProgreso: CursoInscrito[] = await Promise.all(
        (inscripciones || []).map(async (inscripcion) => {
          const cursoData = inscripcion.cursos as unknown as { titulo: string } | null;
          
          const { data: modulos } = await supabase
            .from('modulos')
            .select('id_modulo')
            .eq('id_curso', inscripcion.id_curso);

          const moduloIds = modulos?.map(m => m.id_modulo) || [];
          
          let totalLecciones = 0;
          let leccionesCompletadas = 0;

          if (moduloIds.length > 0) {
            const { data: lecciones } = await supabase
              .from('lecciones')
              .select('id_leccion')
              .in('id_modulo', moduloIds)
              .eq('es_publicada', true);

            totalLecciones = lecciones?.length || 0;

            if (totalLecciones > 0) {
              const leccionIds = lecciones?.map(l => l.id_leccion) || [];
              const { data: progreso } = await supabase
                .from('progreso_lecciones')
                .select('id_leccion')
                .eq('id_usuario', profile.id_usuario)
                .eq('completado', true)
                .in('id_leccion', leccionIds);

              leccionesCompletadas = progreso?.length || 0;
            }
          }

          const progresoPercent = totalLecciones > 0 
            ? Math.round((leccionesCompletadas / totalLecciones) * 100) 
            : 0;

          return {
            id_curso: inscripcion.id_curso,
            titulo: cursoData?.titulo || 'Curso sin título',
            fecha_inscripcion: inscripcion.fecha_inscripcion,
            progreso: progresoPercent,
            leccionesCompletadas,
            totalLecciones
          };
        })
      );

      return cursosConProgreso;
    },
    enabled: !!profile?.id_usuario && isEstudiante
  });

  // Fetch student statistics
  const { data: estadisticasEstudiante, isLoading: loadingStatsEstudiante } = useQuery({
    queryKey: ['perfil-estadisticas-estudiante', profile?.id_usuario],
    queryFn: async () => {
      if (!profile?.id_usuario) return null;

      const { count: cursosCount } = await supabase
        .from('inscripciones')
        .select('*', { count: 'exact', head: true })
        .eq('id_usuario', profile.id_usuario);

      const { count: leccionesCount } = await supabase
        .from('progreso_lecciones')
        .select('*', { count: 'exact', head: true })
        .eq('id_usuario', profile.id_usuario)
        .eq('completado', true);

      const { count: tareasCount } = await supabase
        .from('entregas_tareas')
        .select('*', { count: 'exact', head: true })
        .eq('id_usuario', profile.id_usuario);

      const { count: evaluacionesCount } = await supabase
        .from('intentos_evaluacion')
        .select('*', { count: 'exact', head: true })
        .eq('id_usuario', profile.id_usuario)
        .eq('estado', 'completado');

      const { data: tareasCalificadas } = await supabase
        .from('entregas_tareas')
        .select('calificacion')
        .eq('id_usuario', profile.id_usuario)
        .not('calificacion', 'is', null);

      const promedioTareas = tareasCalificadas && tareasCalificadas.length > 0
        ? tareasCalificadas.reduce((acc, t) => acc + (t.calificacion || 0), 0) / tareasCalificadas.length
        : 0;

      return {
        cursosInscritos: cursosCount || 0,
        leccionesCompletadas: leccionesCount || 0,
        tareasEntregadas: tareasCount || 0,
        evaluacionesRealizadas: evaluacionesCount || 0,
        promedioGeneral: Math.round(promedioTareas * 10) / 10
      } as EstadisticasUsuario;
    },
    enabled: !!profile?.id_usuario && isEstudiante
  });

  // Fetch docente/admin statistics
  const { data: estadisticasDocente, isLoading: loadingStatsDocente } = useQuery({
    queryKey: ['perfil-estadisticas-docente', profile?.id_usuario],
    queryFn: async () => {
      if (!profile?.id_usuario) return null;

      const [{ data: cursosPropios }, { data: cursosColaborador }] = await Promise.all([
        supabase
          .from('cursos')
          .select('id_curso')
          .eq('id_docente', profile.id_usuario),
        supabase
          .from('curso_docentes_colaboradores')
          .select('id_curso')
          .eq('id_docente', profile.id_usuario),
      ]);

      const cursoIds = Array.from(new Set([
        ...(cursosPropios || []).map((curso) => curso.id_curso),
        ...(cursosColaborador || []).map((curso) => curso.id_curso),
      ]));

      let estudiantesTotal = 0;
      if (cursoIds.length > 0) {
        const { count } = await supabase
          .from('inscripciones')
          .select('*', { count: 'exact', head: true })
          .in('id_curso', cursoIds);
        estudiantesTotal = count || 0;
      }

      // Tareas creadas en lecciones de sus cursos
      let tareasCreadas = 0;
      let evaluacionesCreadas = 0;
      
      if (cursoIds.length > 0) {
        const { data: modulos } = await supabase
          .from('modulos')
          .select('id_modulo')
          .in('id_curso', cursoIds);

        if (modulos && modulos.length > 0) {
          const moduloIds = modulos.map(m => m.id_modulo);
          
          const { data: lecciones } = await supabase
            .from('lecciones')
            .select('id_leccion')
            .in('id_modulo', moduloIds);

          if (lecciones && lecciones.length > 0) {
            const leccionIds = lecciones.map(l => l.id_leccion);
            
            const { count: tareasC } = await supabase
              .from('tareas')
              .select('*', { count: 'exact', head: true })
              .in('id_leccion', leccionIds);
            tareasCreadas = tareasC || 0;

            const { count: evalsC } = await supabase
              .from('evaluaciones')
              .select('*', { count: 'exact', head: true })
              .in('id_leccion', leccionIds);
            evaluacionesCreadas = evalsC || 0;
          }
        }
      }

      return {
        cursosAsignados: cursoIds.length,
        estudiantesTotal,
        tareasCreadas,
        evaluacionesCreadas
      } as EstadisticasDocente;
    },
    enabled: !!profile?.id_usuario && (isDocente || isAdmin)
  });

  const getInitials = () => {
    if (profile?.nombres && profile?.apellidos) {
      return `${profile.nombres.charAt(0)}${profile.apellidos.charAt(0)}`.toUpperCase();
    }
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  const getRoleBadgeVariant = () => {
    switch (role) {
      case 'ADMINISTRADOR': return 'destructive';
      case 'DOCENTE': return 'default';
      default: return 'secondary';
    }
  };

  const getEstadoBadgeVariant = () => {
    switch (estado) {
      case 'ACTIVO': return 'default';
      case 'PENDIENTE': return 'outline';
      case 'BLOQUEADO': return 'destructive';
      case 'RECHAZADO': return 'destructive';
      default: return 'secondary';
    }
  };

  const handleProfileUpdated = () => {
    fetchProfile();
  };

  const loadingStats = isEstudiante ? loadingStatsEstudiante : loadingStatsDocente;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
        <p className="text-muted-foreground">
          {isEstudiante 
            ? 'Información de tu cuenta y estadísticas de progreso'
            : 'Información de tu cuenta y resumen de actividad'
          }
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-1">
          <CardHeader className="text-center">
            {loadingProfile ? (
              <div className="flex flex-col items-center gap-4">
                <Skeleton className="h-24 w-24 rounded-full" />
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage 
                    src={getAvatarUrl(profile?.avatar_url) || undefined} 
                    alt="Avatar" 
                  />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1 text-center">
                  <CardTitle className="text-xl">
                    {profile?.nombres} {profile?.apellidos}
                  </CardTitle>
                  <CardDescription>{user?.email}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant={getRoleBadgeVariant()}>{role || 'Sin rol'}</Badge>
                  <Badge variant={getEstadoBadgeVariant()}>{estado || 'Sin estado'}</Badge>
                </div>
                {profile?.biografia && (
                  <div className="mt-2 px-4 py-3 bg-muted/50 rounded-lg w-full">
                    <div className="flex items-start gap-2">
                      <Quote className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-muted-foreground italic">
                        {profile.biografia}
                      </p>
                    </div>
                  </div>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setEditDialogOpen(true)}
                  className="mt-2"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar perfil
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <Separator className="my-4" />
            {loadingProfile ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium truncate">{profile?.correo || user?.email}</span>
                </div>
                {profile?.telefono && (
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">Teléfono:</span>
                    <span className="font-medium">{profile.telefono}</span>
                    {profile.telefono_visible === false && (
                      <Badge variant="outline" className="text-xs font-normal">
                        Oculto para otros alumnos
                      </Badge>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Miembro desde:</span>
                  <span className="font-medium">
                    {profile?.fecha_creacion 
                      ? format(new Date(profile.fecha_creacion), 'MMMM yyyy', { locale: es })
                      : '-'}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistics Cards - Different for students vs docentes/admins */}
        <div className="md:col-span-2 grid gap-4 sm:grid-cols-2">
          {isEstudiante ? (
            // Student Statistics
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Cursos Inscritos</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loadingStats ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <div className="text-2xl font-bold">{estadisticasEstudiante?.cursosInscritos || 0}</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Lecciones Completadas</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loadingStats ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <div className="text-2xl font-bold">{estadisticasEstudiante?.leccionesCompletadas || 0}</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Tareas Entregadas</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loadingStats ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <div className="text-2xl font-bold">{estadisticasEstudiante?.tareasEntregadas || 0}</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Promedio General</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loadingStats ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <div className="text-2xl font-bold">
                      {estadisticasEstudiante?.promedioGeneral || 0}
                      <span className="text-sm font-normal text-muted-foreground">/100</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            // Docente/Admin Statistics
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Cursos Asignados</CardTitle>
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loadingStats ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <div className="text-2xl font-bold">{estadisticasDocente?.cursosAsignados || 0}</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Estudiantes Totales</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loadingStats ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <div className="text-2xl font-bold">{estadisticasDocente?.estudiantesTotal || 0}</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Tareas Creadas</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loadingStats ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <div className="text-2xl font-bold">{estadisticasDocente?.tareasCreadas || 0}</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Evaluaciones Creadas</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loadingStats ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <div className="text-2xl font-bold">{estadisticasDocente?.evaluacionesCreadas || 0}</div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Enrolled Courses - Only for students */}
      {isEstudiante && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Mis Cursos
            </CardTitle>
            <CardDescription>
              Cursos en los que estás inscrito y tu progreso
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingCursos ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-2 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : cursosInscritos && cursosInscritos.length > 0 ? (
              <div className="space-y-4">
                {cursosInscritos.map(curso => (
                  <div key={curso.id_curso} className="flex items-center gap-4 p-4 rounded-lg border">
                    <div className="flex h-12 w-12 items-center justify-center rounded bg-primary/10">
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{curso.titulo}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Inscrito: {format(new Date(curso.fecha_inscripcion), 'dd MMM yyyy', { locale: es })}</span>
                        <span>•</span>
                        <span>{curso.leccionesCompletadas}/{curso.totalLecciones} lecciones</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all"
                          style={{ width: `${curso.progreso}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{curso.progreso}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No estás inscrito en ningún curso aún</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Profile Dialog */}
      {profile && (
        <EditarPerfilDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          profile={profile}
          onSuccess={handleProfileUpdated}
        />
      )}
    </div>
  );
};

export default Perfil;
