import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  UserPlus,
  Bell,
  Settings,
  ClipboardCheck,
  BarChart3,
  Megaphone,
  UserCircle,
  FileCheck,
  LifeBuoy,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Logo from '@/components/brand/Logo';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/contexts/UserRoleContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCursillo } from '@/contexts/CursilloContext';
import { supabase } from '@/integrations/supabase/client';

interface MenuItem {
  title: string;
  url: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  studentOnly?: boolean;
}

const allMainMenuItems: MenuItem[] = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Usuarios', url: '/usuarios', icon: Users, adminOnly: true },
  { title: 'Cursos', url: '/cursos', icon: BookOpen },
  { title: 'Anuncios', url: '/anuncios', icon: Megaphone },
  { title: 'Correcciones', url: '/correcciones', icon: ClipboardCheck, adminOnly: true },
  { title: 'Mis Correcciones', url: '/mis-correcciones', icon: FileCheck, studentOnly: true },
  { title: 'Reportes', url: '/reportes', icon: BarChart3 },
  { title: 'Inscripciones', url: '/inscripciones', icon: UserPlus, adminOnly: true },
];

const allFooterMenuItems: MenuItem[] = [
  { title: 'Mi Perfil', url: '/perfil', icon: UserCircle },
  { title: 'Notificaciones', url: '/notificaciones', icon: Bell },
  { title: 'Soporte', url: '/soporte', icon: LifeBuoy },
  { title: 'Configuración', url: '/configuracion', icon: Settings, adminOnly: true },
];

// Items visible for active admin and docentes
const canSeeAdminItems = (isAdmin: boolean, isDocente: boolean, isActivo: boolean) => (
  isActivo && (isAdmin || isDocente)
);

// Interface UserProfile removed as it is now inferred from context

const AppSidebar = () => {
  const location = useLocation();
  const { state } = useSidebar();
  const { isAdmin, isDocente, isActivo, role, profile } = useUserRole();
  const { user } = useAuth();
  const { cursilloActivo } = useCursillo();
  const isCollapsed = state === 'collapsed';

  // Profile fetching removed - using context profile


  const isActive = (url: string) => location.pathname === url;

  // Filter menu items based on role - admin and docentes see admin items, students see student-only items
  const showAdminItems = canSeeAdminItems(isAdmin, isDocente, isActivo);
  const isEstudiante = !isAdmin && !isDocente;
  const mainMenuItems = allMainMenuItems.filter(item => {
    if (item.adminOnly) return showAdminItems;
    if (item.studentOnly) return isEstudiante;
    return true;
  });
  const footerMenuItems = allFooterMenuItems.filter(item => !item.adminOnly || showAdminItems);

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

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className={cn(
        "border-b border-sidebar-border transition-all flex items-center h-14",
        isCollapsed ? "px-0 justify-center" : "px-4 justify-start gap-3"
      )}>
        <Logo
          showText={!isCollapsed}
          text={cursilloActivo?.nombre}
          className={isCollapsed ? "justify-center" : "min-w-0"}
        />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70">
            Menú Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {/* User Profile Section */}
        <div className={cn(
          "p-3",
          isCollapsed ? "flex justify-center" : ""
        )}>
          <Link
            to="/perfil"
            className={cn(
              "flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-sidebar-accent",
              isCollapsed ? "justify-center" : ""
            )}
          >
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage
                src={getAvatarUrl(profile?.avatar_url) || undefined}
                alt={getDisplayName()}
              />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium truncate text-sidebar-foreground">
                  {getDisplayName()}
                </span>
                {role && (
                  <span className="text-xs text-sidebar-foreground/70 truncate">
                    {role}
                  </span>
                )}
              </div>
            )}
          </Link>
        </div>

        <SidebarMenu>
          {footerMenuItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.url)}
                tooltip={item.title}
              >
                <Link to={item.url}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
