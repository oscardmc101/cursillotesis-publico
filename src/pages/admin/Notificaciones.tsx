import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCursillo } from '@/contexts/CursilloContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Notificacion {
  id_notificacion: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  leido: boolean;
  link: string | null;
  fecha_envio: string;
}

const Notificaciones = () => {
  const { user } = useAuth();
  const { idCursilloActivo } = useCursillo();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [activeTab, setActiveTab] = useState('todas');

  const fetchNotificaciones = async () => {
    if (!user?.id) return;

    // Obtener id_usuario desde la tabla usuarios
    const { data: usuarioData } = await supabase
      .from('usuarios')
      .select('id_usuario')
      .eq('id_auth', user.id)
      .single();

    if (!usuarioData) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('id_usuario', usuarioData.id_usuario)
      .eq('id_cursillo', idCursilloActivo)
      .order('fecha_envio', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las notificaciones.',
        variant: 'destructive',
      });
    } else {
      setNotificaciones(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotificaciones();
  }, [user?.id, idCursilloActivo]);

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const setupRealtimeSubscription = async () => {
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('id_usuario')
        .eq('id_auth', user.id)
        .single();

      if (!usuarioData) return;

      const channel = supabase
        .channel('notificaciones-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notificaciones',
            filter: `id_usuario=eq.${usuarioData.id_usuario}`,
          },
          (payload) => {
            const newNotif = payload.new as Notificacion & { id_cursillo: string | null };
            // Solo agregar a la lista si es del cursillo activo (o si es null, aunque no debería ser null si es específica del cursillo)
            if (newNotif.id_cursillo === idCursilloActivo) {
              setNotificaciones((prev) => [newNotif, ...prev]);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupRealtimeSubscription();
  }, [user?.id, idCursilloActivo]);

  const handleMarkAsRead = async (notificacion: Notificacion) => {
    if (notificacion.leido) {
      // Si ya está leída, solo navegar
      if (notificacion.link) {
        navigate(notificacion.link);
      }
      return;
    }

    const { error } = await supabase
      .from('notificaciones')
      .update({ leido: true })
      .eq('id_notificacion', notificacion.id_notificacion);

    if (error) {
      console.error('Error marking notification as read:', error);
    } else {
      setNotificaciones((prev) =>
        prev.map((n) =>
          n.id_notificacion === notificacion.id_notificacion ? { ...n, leido: true } : n
        )
      );
    }

    if (notificacion.link) {
      navigate(notificacion.link);
    }
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);

    const unreadIds = notificaciones.filter((n) => !n.leido).map((n) => n.id_notificacion);

    if (unreadIds.length === 0) {
      setMarkingAll(false);
      return;
    }

    const { error } = await supabase
      .from('notificaciones')
      .update({ leido: true })
      .in('id_notificacion', unreadIds);

    if (error) {
      console.error('Error marking all as read:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron marcar las notificaciones.',
        variant: 'destructive',
      });
    } else {
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leido: true })));
      toast({
        title: 'Listo',
        description: 'Todas las notificaciones han sido marcadas como leídas.',
      });
    }

    setMarkingAll(false);
  };

  const unreadCount = notificaciones.filter((n) => !n.leido).length;
  const filteredNotificaciones =
    activeTab === 'no-leidas' ? notificaciones.filter((n) => !n.leido) : notificaciones;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) {
      return 'Hace unos minutos';
    } else if (diffHours < 24) {
      return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    } else if (diffDays < 7) {
      return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  const getTipoBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case 'usuario_pendiente':
        return 'default';
      case 'usuario_aprobado':
        return 'secondary';
      case 'usuario_rechazado':
        return 'destructive';
      case 'RECLAMO_EVALUACION':
      case 'RECLAMO_EVALUACION_RESUELTO':
      case 'SOPORTE_NUEVO':
      case 'SOPORTE_RESUELTO':
        return 'default';
      default:
        return 'outline';
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'usuario_pendiente':
        return 'Pendiente';
      case 'usuario_aprobado':
        return 'Aprobado';
      case 'usuario_rechazado':
        return 'Rechazado';
      case 'RECLAMO_EVALUACION':
        return 'Reclamo';
      case 'RECLAMO_EVALUACION_RESUELTO':
        return 'Reclamo resuelto';
      case 'SOPORTE_NUEVO':
        return 'Soporte';
      case 'SOPORTE_RESUELTO':
        return 'Soporte resuelto';
      default:
        return tipo;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Notificaciones</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0
              ? `Tienes ${unreadCount} notificación${unreadCount > 1 ? 'es' : ''} sin leer`
              : 'No tienes notificaciones nuevas'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            onClick={handleMarkAllAsRead}
            disabled={markingAll}
            className="gap-2"
          >
            {markingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}
            Marcar todas como leídas
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="todas">
                Todas ({notificaciones.length})
              </TabsTrigger>
              <TabsTrigger value="no-leidas">
                No leídas ({unreadCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="p-0">
          {filteredNotificaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {activeTab === 'no-leidas'
                  ? 'No tienes notificaciones sin leer'
                  : 'No tienes notificaciones'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredNotificaciones.map((notificacion) => (
                <div
                  key={notificacion.id_notificacion}
                  onClick={() => handleMarkAsRead(notificacion)}
                  className={cn(
                    'flex items-start gap-4 p-4 cursor-pointer transition-colors hover:bg-muted/50',
                    !notificacion.leido && 'bg-primary/5'
                  )}
                >
                  <div
                    className={cn(
                      'mt-1 h-2 w-2 rounded-full shrink-0',
                      notificacion.leido ? 'bg-transparent' : 'bg-primary'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3
                            className={cn(
                              'text-sm font-medium',
                              !notificacion.leido && 'font-semibold'
                            )}
                          >
                            {notificacion.titulo}
                          </h3>
                          <Badge variant={getTipoBadgeVariant(notificacion.tipo)} className="text-xs">
                            {getTipoLabel(notificacion.tipo)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {notificacion.mensaje}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(notificacion.fecha_envio)}
                      </span>
                    </div>
                  </div>
                  {notificacion.leido && (
                    <Check className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Notificaciones;
