import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, UserCheck, UserX, Search, RefreshCw, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/contexts/UserRoleContext';
import { useCursillo } from '@/contexts/CursilloContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';



const ROLE_ADMIN = 'ADMINISTRADOR';
const ROLE_DOCENTE = 'DOCENTE';
const ROLE_ESTUDIANTE = 'ESTUDIANTE';

const STATE_PENDIENTE = 'PENDIENTE';
const STATE_ACTIVO = 'ACTIVO';
const STATE_BLOQUEADO = 'BLOQUEADO';
const STATE_RECHAZADO = 'RECHAZADO';

const norm = (value: string | null | undefined) => (value ?? '').trim().toUpperCase();
const normEstado = (value: string | null | undefined) => norm(value || STATE_PENDIENTE);

interface Usuario {
  id_usuario: string;
  correo: string;
  nombres: string;
  apellidos: string;
  id_rol: number | null;
  nombre_rol: string | null;
  estado: string | null;
}

const Usuarios = () => {
  // ✅ Usa el contexto directamente — elimina checkUserRole() que duplicaba 2 queries
  const { isAdmin, isDocente, loading: roleLoading } = useUserRole();
  const { idCursilloActivo: CURSILLO_TESIS_ID } = useCursillo();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingUser, setProcessingUser] = useState<string | null>(null);

  const currentTab = searchParams.get('tab') || 'pendientes';
  const canAccess = isAdmin || isDocente;

  const fetchUsuarios = useCallback(async () => {
    if (!CURSILLO_TESIS_ID || (!isAdmin && !isDocente)) {
      setUsuarios([]);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.rpc('rpc_list_usuarios_cursillo', {
      p_id_cursillo: CURSILLO_TESIS_ID,
    });

    if (error) {
      console.error('Error fetching usuarios:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los usuarios.',
        variant: 'destructive',
      });
      setUsuarios([]);
    } else {
      setUsuarios((data as Usuario[]) || []);
    }
    setLoading(false);
  }, [CURSILLO_TESIS_ID, isAdmin, isDocente, toast]);

  useEffect(() => {
    if (!roleLoading) {
      fetchUsuarios();
    }
  }, [roleLoading, fetchUsuarios]);

  const handleApproveUser = async (usuario: Usuario) => {
    setProcessingUser(usuario.id_usuario);

    const { error } = await supabase.rpc('rpc_set_estado_usuario_cursillo', {
      p_id_cursillo: CURSILLO_TESIS_ID,
      p_id_usuario: usuario.id_usuario,
      p_estado: STATE_ACTIVO,
    });

    const updatedCount = error ? 0 : 1;

    if (error || updatedCount === 0) {
      toast({
        title: 'No se pudo aprobar',
        description:
          updatedCount === 0
            ? 'No tienes permisos para aprobar este usuario (políticas de acceso).'
            : 'No se pudo aprobar al usuario.',
        variant: 'destructive',
      });
    } else {
      setUsuarios((prev) =>
        prev.map((u) => (u.id_usuario === usuario.id_usuario ? { ...u, estado: STATE_ACTIVO } : u))
      );

      toast({
        title: 'Usuario aprobado',
        description: `${usuario.nombres} ${usuario.apellidos} ha sido aprobado.`,
      });

      // Send approval email
      try {
        await supabase.functions.invoke('send-welcome-email', {
          body: {
            email: usuario.correo,
            nombres: `${usuario.nombres} ${usuario.apellidos}`.trim(),
            tipo: 'aprobado',
          },
        });
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError);
      }

      setSearchParams({ tab: 'activos' });
      await fetchUsuarios();
    }

    setProcessingUser(null);
  };

  const handleRejectUser = async (usuario: Usuario) => {
    setProcessingUser(usuario.id_usuario);

    const { error } = await supabase.rpc('rpc_set_estado_usuario_cursillo', {
      p_id_cursillo: CURSILLO_TESIS_ID,
      p_id_usuario: usuario.id_usuario,
      p_estado: STATE_RECHAZADO,
    });

    const updatedCount = error ? 0 : 1;

    if (error || updatedCount === 0) {
      toast({
        title: 'No se pudo rechazar',
        description:
          updatedCount === 0
            ? 'No tienes permisos para rechazar este usuario (políticas de acceso).'
            : 'No se pudo rechazar al usuario.',
        variant: 'destructive',
      });
    } else {
      setUsuarios((prev) =>
        prev.map((u) =>
          u.id_usuario === usuario.id_usuario ? { ...u, estado: STATE_RECHAZADO } : u
        )
      );

      toast({
        title: 'Usuario rechazado',
        description: `${usuario.nombres} ${usuario.apellidos} ha sido enviado a Rechazados.`,
      });

      setSearchParams({ tab: 'rechazados' });
      await fetchUsuarios();
    }

    setProcessingUser(null);
  };

  const handleBlockUser = async (usuario: Usuario) => {
    setProcessingUser(usuario.id_usuario);

    const { error } = await supabase.rpc('rpc_set_estado_usuario_cursillo', {
      p_id_cursillo: CURSILLO_TESIS_ID,
      p_id_usuario: usuario.id_usuario,
      p_estado: STATE_BLOQUEADO,
    });

    if (error) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo bloquear al usuario.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Usuario bloqueado',
        description: `${usuario.nombres} ${usuario.apellidos} ha sido bloqueado.`,
      });
      await fetchUsuarios();
    }

    setProcessingUser(null);
  };

  const handleActivateUser = async (usuario: Usuario) => {
    setProcessingUser(usuario.id_usuario);

    const { error } = await supabase.rpc('rpc_set_estado_usuario_cursillo', {
      p_id_cursillo: CURSILLO_TESIS_ID,
      p_id_usuario: usuario.id_usuario,
      p_estado: STATE_ACTIVO,
    });

    if (error) {
      toast({ title: 'Error', description: error.message || 'No se pudo activar al usuario.', variant: 'destructive' });
    } else {
      toast({ title: 'Usuario activado', description: `${usuario.nombres} ${usuario.apellidos} ha sido activado.` });
      setUsuarios((prev) => prev.map((u) => u.id_usuario === usuario.id_usuario ? { ...u, estado: STATE_ACTIVO } : u));
      await fetchUsuarios();
    }
    setProcessingUser(null);
  };

  const handleRestoreToPending = async (usuario: Usuario) => {
    setProcessingUser(usuario.id_usuario);

    const { error } = await supabase.rpc('rpc_set_estado_usuario_cursillo', {
      p_id_cursillo: CURSILLO_TESIS_ID,
      p_id_usuario: usuario.id_usuario,
      p_estado: STATE_PENDIENTE,
    });

    if (error) {
      toast({ title: 'Error', description: error.message || 'No se pudo restablecer el usuario.', variant: 'destructive' });
    } else {
      toast({ title: 'Usuario restablecido', description: `${usuario.nombres} ${usuario.apellidos} fue devuelto a Pendientes para revisión.` });
      setSearchParams({ tab: 'pendientes' });
      await fetchUsuarios();
    }
    setProcessingUser(null);
  };

  const filteredUsers = usuarios.filter((u) => {
    const matchesSearch =
      u.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.correo.toLowerCase().includes(searchTerm.toLowerCase());

    const estado = normEstado(u.estado);
    const matchesTab =
      (currentTab === 'pendientes' && estado === STATE_PENDIENTE) ||
      (currentTab === 'activos' && estado === STATE_ACTIVO) ||
      (currentTab === 'bloqueados' && estado === STATE_BLOQUEADO) ||
      (currentTab === 'rechazados' && estado === STATE_RECHAZADO);

    return matchesSearch && matchesTab;
  });

  const counts = {
    pendientes: usuarios.filter((u) => normEstado(u.estado) === STATE_PENDIENTE).length,
    activos: usuarios.filter((u) => normEstado(u.estado) === STATE_ACTIVO).length,
    bloqueados: usuarios.filter((u) => normEstado(u.estado) === STATE_BLOQUEADO).length,
    rechazados: usuarios.filter((u) => normEstado(u.estado) === STATE_RECHAZADO).length,
  };

  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canAccess) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <UserX className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Acceso Denegado</h2>
            <p className="text-muted-foreground">
              No tienes permisos para acceder a esta sección.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isEstudianteUser = (u: Usuario) => norm(u.nombre_rol) === ROLE_ESTUDIANTE;

  // Filter users based on role and tab
  const getManageableUsers = (users: Usuario[], tabType: 'pendientes' | 'activos' | 'bloqueados' | 'rechazados') => {
    if (isAdmin) return users;
    if (tabType === 'activos') return users;
    return users.filter(isEstudianteUser);
  };

  const canDocenteManage = (usuario: Usuario) => {
    if (isAdmin) return true;
    return isEstudianteUser(usuario);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
          <p className="text-muted-foreground mt-1">
            Administra los usuarios del cursillo
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchUsuarios}
          className="self-start"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o correo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={(value) => setSearchParams({ tab: value })}>
        <TabsList>
          <TabsTrigger value="pendientes" className="gap-2">
            Pendientes
            <Badge variant="secondary" className="ml-1">{counts.pendientes}</Badge>
          </TabsTrigger>
          <TabsTrigger value="activos" className="gap-2">
            Activos
            <Badge variant="secondary" className="ml-1">{counts.activos}</Badge>
          </TabsTrigger>
          <TabsTrigger value="bloqueados" className="gap-2">
            Bloqueados
            <Badge variant="secondary" className="ml-1">{counts.bloqueados}</Badge>
          </TabsTrigger>
          <TabsTrigger value="rechazados" className="gap-2">
            Rechazados
            <Badge variant="secondary" className="ml-1">{counts.rechazados}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pendientes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Usuarios Pendientes de Aprobación</CardTitle>
              {isDocente && (
                <p className="text-sm text-muted-foreground">
                  Como docente, solo puedes aprobar estudiantes.
                </p>
              )}
            </CardHeader>
            <CardContent>
              <UserTable
                users={getManageableUsers(filteredUsers, 'pendientes')}
                processingUser={processingUser}
                onApprove={handleApproveUser}
                onReject={handleRejectUser}
                type="pendientes"
                canManage={canDocenteManage}
                isDocente={isDocente}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activos" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Usuarios Activos</CardTitle>
            </CardHeader>
            <CardContent>
              <UserTable
                users={getManageableUsers(filteredUsers, 'activos')}
                processingUser={processingUser}
                onBlock={handleBlockUser}
                type="activos"
                canManage={canDocenteManage}
                isDocente={isDocente}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bloqueados" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Usuarios Bloqueados</CardTitle>
              <p className="text-sm text-muted-foreground">
                Estos usuarios estaban activos y fueron bloqueados manualmente.
              </p>
            </CardHeader>
            <CardContent>
              <UserTable
                users={getManageableUsers(filteredUsers, 'bloqueados')}
                processingUser={processingUser}
                onActivate={handleActivateUser}
                onRestoreToPending={handleRestoreToPending}
                type="bloqueados"
                canManage={canDocenteManage}
                isDocente={isDocente}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rechazados" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Usuarios Rechazados</CardTitle>
              <p className="text-sm text-muted-foreground">
                Usuarios cuya solicitud fue rechazada. Solo puedes devolverlos a Pendientes.
              </p>
            </CardHeader>
            <CardContent>
              <UserTable
                users={getManageableUsers(filteredUsers, 'rechazados')}
                processingUser={processingUser}
                onRestoreToPending={handleRestoreToPending}
                type="rechazados"
                canManage={canDocenteManage}
                isDocente={isDocente}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

interface UserTableProps {
  users: Usuario[];
  processingUser: string | null;
  onApprove?: (user: Usuario) => void;
  onReject?: (user: Usuario) => void;
  onBlock?: (user: Usuario) => void;
  onActivate?: (user: Usuario) => void;
  onRestoreToPending?: (user: Usuario) => void;
  type: 'pendientes' | 'activos' | 'bloqueados' | 'rechazados';
  canManage?: (user: Usuario) => boolean;
  isDocente?: boolean;
}

const UserTable = ({
  users,
  processingUser,
  onApprove,
  onReject,
  onBlock,
  onActivate,
  onRestoreToPending,
  type,
  canManage,
  isDocente,
}: UserTableProps) => {
  if (users.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay usuarios en esta categoría
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Correo</TableHead>
          <TableHead>Rol</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => {
          const userCanBeManaged = canManage ? canManage(user) : true;

          return (
            <TableRow key={user.id_usuario}>
              <TableCell className="font-medium">
                {user.nombres} {user.apellidos}
              </TableCell>
              <TableCell>{user.correo}</TableCell>
              <TableCell>
                <Badge variant={user.nombre_rol ? 'default' : 'secondary'}>
                  {user.nombre_rol ?? 'Sin rol'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {type === 'pendientes' && onApprove && userCanBeManaged && (
                    <Button
                      size="sm"
                      onClick={() => onApprove(user)}
                      disabled={processingUser === user.id_usuario}
                    >
                      {processingUser === user.id_usuario ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <UserCheck className="h-4 w-4 mr-1" />
                          Aprobar
                        </>
                      )}
                    </Button>
                  )}
                  {type === 'pendientes' && onReject && userCanBeManaged && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onReject(user)}
                      disabled={processingUser === user.id_usuario}
                    >
                      {processingUser === user.id_usuario ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <UserX className="h-4 w-4 mr-1" />
                          Rechazar
                        </>
                      )}
                    </Button>
                  )}
                  {type === 'activos' && onBlock && userCanBeManaged && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onBlock(user)}
                      disabled={processingUser === user.id_usuario}
                    >
                      {processingUser === user.id_usuario ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <UserX className="h-4 w-4 mr-1" />
                          Bloquear
                        </>
                      )}
                    </Button>
                  )}
                  {type === 'activos' && isDocente && !userCanBeManaged && (
                    <span className="text-xs text-muted-foreground">Solo visualización</span>
                  )}
                  {(type === 'bloqueados' || type === 'rechazados') && onRestoreToPending && userCanBeManaged && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRestoreToPending(user)}
                      disabled={processingUser === user.id_usuario}
                    >
                      {processingUser === user.id_usuario ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Devolver a Pendiente
                        </>
                      )}
                    </Button>
                  )}
                  {type === 'bloqueados' && onActivate && userCanBeManaged && (
                    <Button
                      size="sm"
                      onClick={() => onActivate(user)}
                      disabled={processingUser === user.id_usuario}
                    >
                      {processingUser === user.id_usuario ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <UserCheck className="h-4 w-4 mr-1" />
                          Activar
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default Usuarios;
