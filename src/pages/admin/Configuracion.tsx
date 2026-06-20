import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCursillo } from '@/contexts/CursilloContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Building2, Lock, BarChart3, Save, Loader2, Users, BookOpen, UserCheck, Globe, Palette, Sun, Moon, Monitor } from 'lucide-react';



interface Cursillo {
  id_cursillo: string;
  nombre: string;
  descripcion: string | null;
  dominio: string | null;
  fecha_creacion: string;
}

interface CursilloStats {
  total_usuarios: number;
  total_cursos: number;
  total_inscripciones: number;
  cursos_publicados: number;
}

const Configuracion = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { idCursilloActivo: CURSILLO_ID } = useCursillo();
  const { theme, setTheme } = useTheme();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Fetch cursillo data
  const { data: cursillo, isLoading: loadingCursillo } = useQuery({
    queryKey: ['cursillo', CURSILLO_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cursillos')
        .select('*')
        .eq('id_cursillo', CURSILLO_ID)
        .single();
      
      if (error) throw error;
      return data as Cursillo;
    },
  });

  // Fetch cursillo stats
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['cursillo-stats', CURSILLO_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('rpc_get_cursillo_stats', { p_id_cursillo: CURSILLO_ID });
      
      if (error) throw error;
      return (data as CursilloStats[])?.[0] || null;
    },
  });

  // Update cursillo mutation
  const updateCursillo = useMutation({
    mutationFn: async (updates: { nombre?: string; descripcion?: string }) => {
      const { error } = await supabase
        .from('cursillos')
        .update(updates)
        .eq('id_cursillo', CURSILLO_ID);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cursillo'] });
      toast.success('Configuración actualizada');
    },
    onError: (error) => {
      toast.error('Error al actualizar: ' + error.message);
    },
  });

  // Handle cursillo form submit
  const handleCursilloSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateCursillo.mutate({
      nombre: formData.get('nombre') as string,
      descripcion: formData.get('descripcion') as string,
    });
  };

  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (error) throw error;
      
      toast.success('Contraseña actualizada correctamente');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error('Error al actualizar contraseña: ' + error.message);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">
          Administra la configuración del sistema y tu cuenta
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Appearance Settings */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <CardTitle>Apariencia</CardTitle>
            </div>
            <CardDescription>
              Personaliza el aspecto de la plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <Label>Tema de la interfaz</Label>
                <p className="text-sm text-muted-foreground">
                  Selecciona el modo de visualización que prefieras
                </p>
              </div>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Seleccionar tema" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      <span>Claro</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      <span>Oscuro</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="system">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      <span>Sistema</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Cursillo Settings */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle>Datos del Cursillo</CardTitle>
            </div>
            <CardDescription>
              Información general del cursillo
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingCursillo ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <form onSubmit={handleCursilloSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre del Cursillo</Label>
                    <Input
                      id="nombre"
                      name="nombre"
                      defaultValue={cursillo?.nombre || ''}
                      placeholder="Nombre del cursillo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dominio">Dominio</Label>
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <Input
                        id="dominio"
                        value={cursillo?.dominio || 'No configurado'}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    name="descripcion"
                    defaultValue={cursillo?.descripcion || ''}
                    placeholder="Descripción del cursillo"
                    rows={3}
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={updateCursillo.isPending}
                >
                  {updateCursillo.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Guardar Cambios
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <CardTitle>Seguridad de la Cuenta</CardTitle>
            </div>
            <CardDescription>
              Actualiza tu contraseña
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-muted"
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nueva contraseña</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <Button 
                type="submit" 
                disabled={isUpdatingPassword || !newPassword || !confirmPassword}
              >
                {isUpdatingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  'Cambiar Contraseña'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* System Stats */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle>Estadísticas del Sistema</CardTitle>
            </div>
            <CardDescription>
              Resumen general del cursillo
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <span>Total de Usuarios</span>
                  </div>
                  <span className="text-xl font-bold">{stats?.total_usuarios || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-5 w-5 text-muted-foreground" />
                    <span>Total de Cursos</span>
                  </div>
                  <span className="text-xl font-bold">{stats?.total_cursos || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-5 w-5 text-green-500" />
                    <span>Cursos Publicados</span>
                  </div>
                  <span className="text-xl font-bold">{stats?.cursos_publicados || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <UserCheck className="h-5 w-5 text-muted-foreground" />
                    <span>Total de Inscripciones</span>
                  </div>
                  <span className="text-xl font-bold">{stats?.total_inscripciones || 0}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Configuracion;
