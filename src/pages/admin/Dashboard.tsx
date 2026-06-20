import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  BookOpen,
  UserCheck,
  ClipboardList,
  ArrowRight,
  Clock,
  UserPlus,
  CheckCircle2,
  PlayCircle,
  AlertCircle,
  FileCheck,
  Megaphone
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/contexts/UserRoleContext';
import { useCursillo } from '@/contexts/CursilloContext';
import { useCurrentUsuario } from '@/hooks/useCurrentUsuario';
import { useTareasPendientes, useEntregasPorCalificar } from '@/hooks/useTareas';
import AnunciosWidget from '@/components/anuncios/AnunciosWidget';
import PendingUserBanner from '@/components/PendingUserBanner';
import { format, isPast } from 'date-fns';
import { es } from 'date-fns/locale';


interface Stats {
  pendingUsers: number;
  totalUsers: number;
  activeCourses: number;
  enrollments: number;
}

interface Activity {
  id: string;
  type: 'user_registered' | 'user_approved' | 'course_created';
  message: string;
  timestamp: string;
}

interface CursoInscrito {
  id_curso: string;
  titulo: string;
  id_grupo_curso: string | null;
  nombre_grupo: string | null;
  totalLecciones: number;
  leccionesCompletadas: number;
}

interface DashboardStaffResponse {
  pending_users: number;
  total_users: number;
  active_courses: number;
  enrollments: number;
  recent_activity: unknown;
}

const EMPTY_STATS: Stats = {
  pendingUsers: 0,
  totalUsers: 0,
  activeCourses: 0,
  enrollments: 0,
};

const parseRecentActivity = (value: unknown): Activity[] => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Activity => {
      if (!item || typeof item !== 'object') return false;
      const activity = item as Partial<Activity>;
      return (
        typeof activity.id === 'string' &&
        typeof activity.message === 'string' &&
        typeof activity.timestamp === 'string' &&
        (activity.type === 'user_registered' ||
          activity.type === 'user_approved' ||
          activity.type === 'course_created')
      );
    })
    .slice(0, 5);
};

const Dashboard = () => {
  const { isAdmin, isDocente, isEstudiante, isPendiente, isActivo, loading: roleLoading } = useUserRole();
  const { idCursilloActivo: CURSILLO_ID } = useCursillo();
  const { idUsuario } = useCurrentUsuario();
  const canViewFullDashboard = isActivo && (isAdmin || isDocente);
  const canFetchDashboard = !roleLoading && !!CURSILLO_ID;

  const staffDashboardQuery = useQuery({
    queryKey: ['dashboard', 'staff', CURSILLO_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('rpc_dashboard_staff', { p_id_cursillo: CURSILLO_ID })
        .single();

      if (error) throw error;
      return data as DashboardStaffResponse;
    },
    enabled: canFetchDashboard && canViewFullDashboard,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const activeCoursesQuery = useQuery({
    queryKey: ['dashboard', 'active-courses', CURSILLO_ID],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('cursos')
        .select('*', { count: 'exact', head: true })
        .eq('id_cursillo', CURSILLO_ID)
        .eq('es_publicado', true);

      if (error) throw error;
      return count || 0;
    },
    enabled: canFetchDashboard && !canViewFullDashboard && !isPendiente,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const cursosInscritosQuery = useQuery({
    queryKey: ['dashboard', 'estudiante', idUsuario, CURSILLO_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('rpc_dashboard_estudiante', { 
          p_id_usuario: idUsuario!,
          p_id_cursillo: CURSILLO_ID!
        });

      if (error) throw error;
      return (data || []).map((c): CursoInscrito => ({
        id_curso: c.id_curso,
        titulo: c.titulo,
        id_grupo_curso: c.id_grupo_curso,
        nombre_grupo: c.nombre_grupo,
        totalLecciones: Number(c.total_lecciones),
        leccionesCompletadas: Number(c.lecciones_completadas),
      }));
    },
    enabled: !roleLoading && isEstudiante && !isPendiente && !!idUsuario && !!CURSILLO_ID,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { tareas: tareasPendientes, loading: loadingTareas } = useTareasPendientes(CURSILLO_ID, !roleLoading && isEstudiante && !isPendiente);
  const { entregas: entregasPorCalificar, loading: loadingEntregas } = useEntregasPorCalificar(CURSILLO_ID, !roleLoading && canViewFullDashboard);

  const staffStats = staffDashboardQuery.data;
  const stats: Stats = canViewFullDashboard && staffStats
    ? {
      pendingUsers: Number(staffStats.pending_users),
      totalUsers: Number(staffStats.total_users),
      activeCourses: Number(staffStats.active_courses),
      enrollments: Number(staffStats.enrollments),
    }
    : {
      ...EMPTY_STATS,
      activeCourses: activeCoursesQuery.data || 0,
    };
  const recentActivity = parseRecentActivity(staffStats?.recent_activity);
  const cursosInscritos = cursosInscritosQuery.data || [];
  const loading = roleLoading || staffDashboardQuery.isLoading || activeCoursesQuery.isLoading;
  const dashboardError = staffDashboardQuery.error || activeCoursesQuery.error || cursosInscritosQuery.error;

  const allStatCards = [
    {
      title: 'Usuarios Pendientes',
      value: stats.pendingUsers,
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      link: '/usuarios?tab=pendientes',
      staffOnly: true
    },
    {
      title: 'Total Usuarios',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      link: '/usuarios',
      staffOnly: true
    },
    {
      title: 'Cursos Activos',
      value: stats.activeCourses,
      icon: BookOpen,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
      link: '/cursos',
      staffOnly: false
    },
    {
      title: 'Inscripciones',
      value: stats.enrollments,
      icon: ClipboardList,
      color: 'text-success',
      bgColor: 'bg-success/10',
      link: '/inscripciones',
      staffOnly: true
    },
  ];

  const allQuickActions = [
    { title: 'Aprobar Pendientes', icon: UserCheck, link: '/usuarios?tab=pendientes', variant: 'outline' as const, staffOnly: true, pendingCount: stats.pendingUsers },
    { title: 'Gestionar Cursos', icon: BookOpen, link: '/cursos', variant: 'outline' as const, staffOnly: true, pendingCount: 0 },
    { title: 'Ver Inscripciones', icon: UserPlus, link: '/inscripciones', variant: 'outline' as const, staffOnly: true, pendingCount: 0 },
    { title: 'Correcciones Pendientes', icon: FileCheck, link: '/correcciones', variant: 'outline' as const, staffOnly: true, pendingCount: entregasPorCalificar.length },
    { title: 'Publicar Anuncio', icon: Megaphone, link: '/anuncios', variant: 'outline' as const, staffOnly: true, pendingCount: 0 },
  ];

  const statCards = allStatCards.filter(card => !card.staffOnly || canViewFullDashboard);
  const quickActions = allQuickActions.filter(action => !action.staffOnly || canViewFullDashboard);

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'user_registered': return <UserPlus className="h-4 w-4 text-primary" />;
      case 'user_approved': return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'course_created': return <BookOpen className="h-4 w-4 text-accent" />;
    }
  };

  if (isPendiente && !roleLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Bienvenido a tu panel</p>
        </div>
        <PendingUserBanner />
        <AnunciosWidget />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          {canViewFullDashboard ? 'Resumen general de la plataforma' : 'Bienvenido a tu panel'}
        </p>
      </div>

      {dashboardError && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">
              No se pudo cargar parte del dashboard. Intenta nuevamente en unos segundos.
            </p>
          </CardContent>
        </Card>
      )}

      <div className={`grid gap-4 md:grid-cols-2 ${canViewFullDashboard ? 'lg:grid-cols-4' : 'lg:grid-cols-1'}`}>
        {statCards.map((stat) => (
          <Link key={stat.title} to={stat.link}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold mt-1">
                      {loading ? '...' : stat.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {canViewFullDashboard && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickActions.map((action) => (
                <Link key={action.title} to={action.link}>
                  <Button
                    variant={action.variant}
                    className="w-full justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <action.icon className="h-4 w-4" />
                      {action.title}
                      {action.pendingCount > 0 && (
                        <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                          {action.pendingCount}
                        </Badge>
                      )}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actividad Reciente</CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No hay actividad reciente
                </p>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{activity.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <AnunciosWidget />

      {canViewFullDashboard && !loadingEntregas && entregasPorCalificar.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-warning" />
              Entregas por Calificar
              <Badge variant="secondary">{entregasPorCalificar.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {entregasPorCalificar.slice(0, 5).map((entrega) => (
                <Link
                  key={entrega.id_entrega}
                  to={`/tareas/${entrega.id_tarea}`}
                  className="block"
                >
                  <div className="p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{entrega.tarea_titulo}</p>
                        <p className="text-xs text-muted-foreground">
                          {entrega.usuario?.nombres} {entrega.usuario?.apellidos}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(entrega.fecha_entrega), 'dd MMM yyyy', { locale: es })}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {entrega.curso_titulo}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
              {entregasPorCalificar.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{entregasPorCalificar.length - 5} más
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {isEstudiante && !roleLoading && (
        <>
          {!loadingTareas && tareasPendientes.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  Tareas Pendientes
                  <Badge variant="secondary">{tareasPendientes.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tareasPendientes.slice(0, 5).map((tarea) => {
                    const isOverdue = tarea.fecha_limite && isPast(new Date(tarea.fecha_limite));
                    return (
                      <Link
                        key={tarea.id_tarea}
                        to={`/tareas/${tarea.id_tarea}`}
                        className="block"
                      >
                        <div className="p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm flex items-center gap-2">
                                {tarea.titulo}
                                {isOverdue && (
                                  <AlertCircle className="h-4 w-4 text-destructive" />
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {tarea.curso_titulo} • {tarea.leccion_titulo}
                              </p>
                            </div>
                            <div className="text-right">
                              {tarea.fecha_limite ? (
                                <Badge variant={isOverdue ? "destructive" : "outline"} className="text-xs">
                                  {format(new Date(tarea.fecha_limite), 'dd MMM yyyy', { locale: es })}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">Sin fecha</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                  {tareasPendientes.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{tareasPendientes.length - 5} más
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Mis Cursos</CardTitle>
            </CardHeader>
            <CardContent>
              {cursosInscritosQuery.isLoading ? (
                <p className="text-muted-foreground text-sm">Cargando...</p>
              ) : cursosInscritos.length === 0 ? (
                <div>
                  <p className="text-muted-foreground text-sm">
                    Aún no estás inscrito en ningún curso.
                  </p>
                  <Link to="/cursos" className="mt-4 inline-block">
                    <Button variant="outline">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Ver Cursos Disponibles
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {cursosInscritos.map((curso) => {
                    const porcentaje = curso.totalLecciones > 0
                      ? Math.round((curso.leccionesCompletadas / curso.totalLecciones) * 100)
                      : 0;

                    return (
                      <Link
                        key={curso.id_curso}
                        to={`/cursos/${curso.id_curso}`}
                        className="block"
                      >
                        <div className="p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{curso.titulo}</span>
                            <span className="text-sm text-muted-foreground">
                              {curso.leccionesCompletadas}/{curso.totalLecciones}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {curso.nombre_grupo || 'Sin grupo'}
                          </p>
                          <Progress value={porcentaje} className="h-2" />
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-muted-foreground">
                              {porcentaje}% completado
                            </span>
                            {porcentaje === 100 ? (
                              <CheckCircle2 className="h-4 w-4 text-success" />
                            ) : (
                              <PlayCircle className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Dashboard;
