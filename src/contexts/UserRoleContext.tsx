import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { useCursillo } from './CursilloContext';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'ADMINISTRADOR' | 'DOCENTE' | 'ESTUDIANTE' | null;
type UserEstado = 'ACTIVO' | 'PENDIENTE' | 'BLOQUEADO' | 'RECHAZADO' | null;

export interface UserProfile {
  id_usuario: string;
  nombres: string;
  apellidos: string;
  avatar_url: string | null;
  correo: string | null;
}

interface UserProfileContextType {
  role: UserRole;
  estado: UserEstado;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isDocente: boolean;
  isEstudiante: boolean;
  isPendiente: boolean;
  isActivo: boolean;
  isBloqueado: boolean;
  isRechazado: boolean;
  refetchProfile: () => Promise<void>;
}

const UserRoleContext = createContext<UserProfileContextType | undefined>(undefined);

export const UserRoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { idCursilloActivo } = useCursillo();
  const userId = user?.id ?? null;
  const [role, setRole] = useState<UserRole>(null);
  const [estado, setEstado] = useState<UserEstado>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(async () => {
    if (!userId || !idCursilloActivo) {
      setRole(null);
      setEstado(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      // Single query to fetch user details + role in current cursillo
      const { data, error } = await supabase
        .from('usuarios')
        .select(`
          id_usuario,
          nombres,
          apellidos,
          avatar_url,
          correo,
          usuarios_cursillos (
            id_rol,
            estado,
            roles:id_rol (
              nombre_rol
            )
          )
        `)
        .eq('id_auth', userId)
        .eq('usuarios_cursillos.id_cursillo', idCursilloActivo)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user profile:', error);
        setRole(null);
        setEstado(null);
        setProfile(null);
      } else if (data) {
        setProfile({
          id_usuario: data.id_usuario,
          nombres: data.nombres,
          apellidos: data.apellidos,
          avatar_url: data.avatar_url,
          correo: data.correo
        });

        // Extract role/estado if exists for this cursillo
        const cursilloData = data.usuarios_cursillos?.[0]; // Can be array if RLS allows multiple, but filter makes it 1 or 0

        if (cursilloData) {
          setEstado(cursilloData.estado as UserEstado);
          const rolesData = cursilloData.roles;
          if (rolesData && typeof rolesData === 'object' && 'nombre_rol' in rolesData) {
            setRole((rolesData as { nombre_rol: string }).nombre_rol as UserRole);
          } else {
            setRole(null);
          }
        } else {
          // User exists but not in this cursillo
          setRole(null);
          setEstado(null);
        }
      } else {
        // User not found in public.usuarios yet (maybe just signed up via auth)
        setProfile(null);
        setRole(null);
        setEstado(null);
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      setRole(null);
      setEstado(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [userId, idCursilloActivo]);

  useEffect(() => {
    setLoading(true);
    fetchUserProfile();
  }, [fetchUserProfile]);

  const isAdmin = role === 'ADMINISTRADOR';
  const isDocente = role === 'DOCENTE';
  const isEstudiante = role === 'ESTUDIANTE';
  const isPendiente = estado === 'PENDIENTE';
  const isActivo = estado === 'ACTIVO';
  const isBloqueado = estado === 'BLOQUEADO';
  const isRechazado = estado === 'RECHAZADO';

  return (
    <UserRoleContext.Provider value={{
      role,
      estado,
      profile,
      loading,
      isAdmin,
      isDocente,
      isEstudiante,
      isPendiente,
      isActivo,
      isBloqueado,
      isRechazado,
      refetchProfile: fetchUserProfile
    }}>
      {children}
    </UserRoleContext.Provider>
  );
};

export const useUserRole = () => {
  const context = useContext(UserRoleContext);
  if (context === undefined) {
    throw new Error('useUserRole must be used within a UserRoleProvider');
  }
  return context;
};
