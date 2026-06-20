import { useUserRole } from '@/contexts/UserRoleContext';

export const useCurrentUsuario = () => {
  const { profile, loading } = useUserRole();

  return {
    idUsuario: profile?.id_usuario || null,
    loading
  };
};
