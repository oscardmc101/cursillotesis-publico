import { Navigate, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/contexts/UserRoleContext';

type UserRole = 'ADMINISTRADOR' | 'DOCENTE' | 'ESTUDIANTE';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Roles que pueden acceder. Si no se especifica, cualquier rol autenticado puede entrar. */
  allowedRoles?: UserRole[];
  /** Si true (por defecto), requiere estado ACTIVO. En false, permite PENDIENTE (para dashboard básico). */
  requireActivo?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requireActivo = true,
}) => {
  const { session, loading: authLoading, signOut } = useAuth();
  const { role, estado, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  const loading = authLoading || roleLoading;

  // Cerrar sesión y redirigir si el usuario está bloqueado o rechazado
  useEffect(() => {
    if (!loading && session && (estado === 'BLOQUEADO' || estado === 'RECHAZADO')) {
      signOut().then(() => navigate('/login', { replace: true }));
    }
  }, [loading, session, estado, signOut, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Sin sesión → login
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Usuario BLOQUEADO o RECHAZADO → mostrar loader mientras el useEffect hace signOut
  if (estado === 'BLOQUEADO' || estado === 'RECHAZADO') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Requiere ACTIVO pero el usuario está PENDIENTE → redirigir a dashboard (que muestra banner)
  if (requireActivo && estado === 'PENDIENTE') {
    return <Navigate to="/dashboard" replace />;
  }

  // Verificar rol si se especificaron roles permitidos
  if (allowedRoles && allowedRoles.length > 0) {
    // Si el rol es null o no está en la lista, redirigir
    if (!role || !allowedRoles.includes(role as UserRole)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
