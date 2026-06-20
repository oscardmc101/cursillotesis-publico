import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User, ChevronDown, Bell, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/contexts/UserRoleContext';
import { useCursillo } from '@/contexts/CursilloContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import ThemeToggle from '@/components/theme/ThemeToggle';

// Interface UserProfile removed as it is now imported from context or inferred

interface Notification {
  id_notificacion: string;
  titulo: string;
  mensaje: string;
  leido: boolean;
  link: string | null;
  fecha_envio: string;
}

const AdminNavbar = () => {
  const { user, signOut } = useAuth();
  const { role, profile } = useUserRole();
  const { idCursilloActivo } = useCursillo();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const idUsuario = profile?.id_usuario;


  // Fetch real notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!idUsuario) return;

      const { data, error } = await supabase
        .from('notificaciones')
        .select('id_notificacion, titulo, mensaje, leido, link, fecha_envio')
        .eq('id_usuario', idUsuario)
        .eq('id_cursillo', idCursilloActivo)
        .eq('leido', false)
        .order('fecha_envio', { ascending: false })
        .limit(5);

      if (!error && data) {
        setNotifications(data);
        setUnreadCount(data.length);
      }
    };

    fetchNotifications();
  }, [idUsuario, idCursilloActivo]);

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!idUsuario) return;

    const channel = supabase
      .channel('navbar-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificaciones',
          filter: `id_usuario=eq.${idUsuario}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification & { id_cursillo: string | null };
          if (newNotification.id_cursillo === idCursilloActivo) {
            setNotifications((prev) => [newNotification, ...prev].slice(0, 5));
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [idUsuario, idCursilloActivo]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    await supabase
      .from('notificaciones')
      .update({ leido: true })
      .eq('id_notificacion', notification.id_notificacion);

    // Update local state
    setNotifications((prev) =>
      prev.filter((n) => n.id_notificacion !== notification.id_notificacion)
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    // Navigate if link exists
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const getInitials = () => {
    if (profile) {
      return `${profile.nombres.charAt(0)}${profile.apellidos.charAt(0)}`.toUpperCase();
    }
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  const getDisplayName = () => {
    if (profile) {
      return `${profile.nombres} ${profile.apellidos}`;
    }
    return user?.email || 'Usuario';
  };

  const getAvatarUrl = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-2 hover:bg-muted" />
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs gradient-hero border-0"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notificaciones</span>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {unreadCount} nuevas
                  </Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No hay notificaciones nuevas
                </div>
              ) : (
                notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id_notificacion}
                    onClick={() => handleNotificationClick(notification)}
                    className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                  >
                    <span className="text-sm font-medium">{notification.titulo}</span>
                    <span className="text-xs text-muted-foreground line-clamp-1">
                      {notification.mensaje}
                    </span>
                    <span className="text-xs text-muted-foreground/70">
                      {formatTimeAgo(notification.fecha_envio)}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="justify-center">
                <Link to="/notificaciones" className="text-primary text-sm w-full text-center">
                  Ver todas las notificaciones
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={getAvatarUrl(profile?.avatar_url) || undefined}
                    alt={getDisplayName()}
                  />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline-block text-sm font-medium">
                  {getDisplayName()}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{getDisplayName()}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  {role && (
                    <Badge variant="outline" className="w-fit text-xs mt-1">
                      {role}
                    </Badge>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/panel" className="flex items-center cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Mi Panel
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default AdminNavbar;
