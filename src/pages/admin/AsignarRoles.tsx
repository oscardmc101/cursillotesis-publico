import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, UserCog, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useCursillo } from '@/contexts/CursilloContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';



interface Usuario {
  id_usuario: string;
  correo: string;
  nombres: string;
  apellidos: string;
  id_rol: number | null;
  nombre_rol: string | null;
  estado: string | null;
}

interface Role {
  id_rol: number;
  nombre_rol: string;
}

const AsignarRoles = () => {
  const { user } = useAuth();
  const { idCursilloActivo: CURSILLO_TESIS_ID } = useCursillo();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const [assigningUser, setAssigningUser] = useState<string | null>(null);

  const checkAdminStatus = useCallback(async (authId: string) => {
    // First get user's id_usuario
    const { data: profileData, error: profileError } = await supabase
      .from('usuarios')
      .select('id_usuario')
      .eq('id_auth', authId)
      .single();

    if (profileError || !profileData) {
      return false;
    }

    // Check if user is ADMINISTRADOR for this cursillo
    const { data, error } = await supabase
      .from('usuarios_cursillos')
      .select(`
        id_rol,
        roles:id_rol (
          nombre_rol
        )
      `)
      .eq('id_usuario', profileData.id_usuario)
      .eq('id_cursillo', CURSILLO_TESIS_ID)
      .single();

    if (error || !data) {
      return false;
    }

    const rolesData = data.roles;
    if (rolesData && typeof rolesData === 'object' && 'nombre_rol' in rolesData) {
      return (rolesData as { nombre_rol: string }).nombre_rol === 'ADMINISTRADOR';
    }

    return false;
  }, []);

  const fetchUsuarios = useCallback(async () => {
    const { data, error } = await supabase.rpc('rpc_list_usuarios_cursillo', {
      p_id_cursillo: CURSILLO_TESIS_ID,
    });

    if (!error && data) {
      setUsuarios(data as Usuario[]);
    } else if (error) {
      console.error('Error fetching usuarios:', error.message);
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('id_rol, nombre_rol')
      .order('id_rol', { ascending: true });

    if (!error && data) {
      setRoles(data as Role[]);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;

      setLoading(true);
      const adminStatus = await checkAdminStatus(user.id);
      setIsAdmin(adminStatus);

      if (adminStatus) {
        await Promise.all([fetchUsuarios(), fetchRoles()]);
      }

      setLoading(false);
    };

    loadData();
  }, [user?.id, checkAdminStatus, fetchUsuarios, fetchRoles]);

  const handleAssignRole = async (userId: string) => {
    const selectedRoleId = selectedRoles[userId];
    if (!selectedRoleId) {
      toast({
        title: 'Error',
        description: 'Selecciona un rol primero',
        variant: 'destructive',
      });
      return;
    }

    setAssigningUser(userId);

    // Actualizar rol y estado a ACTIVO
    const { error } = await supabase
      .from('usuarios_cursillos')
      .update({
        id_rol: parseInt(selectedRoleId, 10),
        estado: 'ACTIVO',
      })
      .eq('id_usuario', userId)
      .eq('id_cursillo', CURSILLO_TESIS_ID);

    if (error) {
      toast({
        title: 'Error al asignar rol',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Rol asignado',
        description: 'El rol se ha asignado y el usuario está ACTIVO',
      });
      // Refrescar lista desde la RPC
      await fetchUsuarios();
      // Limpiar selección
      setSelectedRoles((prev) => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
    }

    setAssigningUser(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center px-4 py-20">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit">
              <UserCog className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">No autorizado</h2>
            <p className="text-muted-foreground">
              No tienes permisos de administrador para acceder a esta página.
            </p>
            <Button onClick={() => navigate('/panel')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Panel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-full">
            <UserCog className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Asignar Roles</h1>
        </div>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuarios del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            {usuarios.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No hay usuarios registrados</p>
            ) : (
              <div className="space-y-3">
                {usuarios.map((usuario) => (
                  <div
                    key={usuario.id_usuario}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-muted/50 rounded-lg"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">
                        {usuario.nombres} {usuario.apellidos}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {usuario.correo}
                      </p>
                      <p className="text-xs mt-1">
                        <span className="text-muted-foreground">Rol: </span>
                        <span className={usuario.nombre_rol ? 'text-primary font-medium' : 'text-amber-600'}>
                          {usuario.nombre_rol ?? 'PENDIENTE'}
                        </span>
                      </p>
                      <p className="text-xs mt-1">
                        <span className="text-muted-foreground">Estado: </span>
                        <span
                          className={
                            usuario.estado === 'ACTIVO'
                              ? 'text-green-600 font-medium'
                              : usuario.estado === 'INACTIVO'
                              ? 'text-destructive font-medium'
                              : 'text-amber-600 font-medium'
                          }
                        >
                          {usuario.estado ?? 'PENDIENTE'}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Select
                        value={selectedRoles[usuario.id_usuario] || ''}
                        onValueChange={(value) =>
                          setSelectedRoles((prev) => ({ ...prev, [usuario.id_usuario]: value }))
                        }
                      >
                        <SelectTrigger className="w-[160px]">
                          <SelectValue placeholder="Seleccionar rol" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id_rol} value={String(role.id_rol)}>
                              {role.nombre_rol}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        onClick={() => handleAssignRole(usuario.id_usuario)}
                        disabled={
                          assigningUser === usuario.id_usuario ||
                          !selectedRoles[usuario.id_usuario] ||
                          usuario.estado === 'INACTIVO'
                        }
                        title={usuario.estado === 'INACTIVO' ? 'Usuario inactivo' : undefined}
                      >
                        {assigningUser === usuario.id_usuario ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Asignar'
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AsignarRoles;
