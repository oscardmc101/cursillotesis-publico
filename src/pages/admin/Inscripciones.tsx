import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCursillo } from '@/contexts/CursilloContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Search, Trash2, UserPlus, Calendar, BookOpen, Users } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { SIN_GRUPO_ID, useGruposCursos } from '@/hooks/useGruposCursos';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";



interface Inscripcion {
  id_inscripcion: string;
  fecha_inscripcion: string;
  id_usuario: string;
  nombres: string;
  apellidos: string;
  correo: string;
  id_curso: string;
  titulo_curso: string;
  id_grupo_curso: string | null;
  nombre_grupo: string | null;
}

interface Curso {
  id_curso: string;
  titulo: string;
  id_grupo_curso: string | null;
  grupo?: {
    nombre: string | null;
  } | null;
}

const Inscripciones = () => {
  const queryClient = useQueryClient();
  const { idCursilloActivo: CURSILLO_ID } = useCursillo();
  const { grupos } = useGruposCursos();
  const [searchTerm, setSearchTerm] = useState('');
  const [grupoFilter, setGrupoFilter] = useState<string>('all');
  const [cursoFilter, setCursoFilter] = useState<string>('all');

  // Fetch all inscripciones using the RPC
  const { data: inscripciones, isLoading: loadingInscripciones } = useQuery({
    queryKey: ['all-inscripciones', CURSILLO_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('rpc_list_all_inscripciones', { p_id_cursillo: CURSILLO_ID });
      
      if (error) throw error;
      return data as Inscripcion[];
    },
  });

  // Fetch cursos for filter dropdown
  const { data: cursos } = useQuery({
    queryKey: ['cursos-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cursos')
        .select(`
          id_curso,
          titulo,
          id_grupo_curso,
          grupo:id_grupo_curso (nombre)
        `)
        .eq('id_cursillo', CURSILLO_ID)
        .order('titulo');
      
      if (error) throw error;
      return data as Curso[];
    },
  });

  // Delete inscription mutation
  const deleteInscripcion = useMutation({
    mutationFn: async (id_inscripcion: string) => {
      const { error } = await supabase
        .from('inscripciones')
        .delete()
        .eq('id_inscripcion', id_inscripcion);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-inscripciones'] });
      toast.success('Inscripción eliminada correctamente');
    },
    onError: (error) => {
      toast.error('Error al eliminar inscripción: ' + error.message);
    },
  });

  // Filtered inscripciones
  const filteredInscripciones = useMemo(() => {
    if (!inscripciones) return [];
    
    return inscripciones.filter(insc => {
      const matchesSearch = searchTerm === '' || 
        `${insc.nombres} ${insc.apellidos} ${insc.correo}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      
      const matchesCurso = cursoFilter === 'all' || insc.id_curso === cursoFilter;
      const matchesGrupo =
        grupoFilter === 'all' ||
        (grupoFilter === SIN_GRUPO_ID && !insc.id_grupo_curso) ||
        insc.id_grupo_curso === grupoFilter;
      
      return matchesSearch && matchesCurso && matchesGrupo;
    });
  }, [inscripciones, searchTerm, cursoFilter, grupoFilter]);

  // Unique courses from inscriptions for stats
  const uniqueCursos = useMemo(() => {
    if (!inscripciones) return 0;
    return new Set(inscripciones.map(i => i.id_curso)).size;
  }, [inscripciones]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inscripciones</h1>
        <p className="text-muted-foreground">
          Gestiona todas las inscripciones a los cursos del cursillo
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inscripciones</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingInscripciones ? <Skeleton className="h-8 w-16" /> : inscripciones?.length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cursos con Inscripciones</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingInscripciones ? <Skeleton className="h-8 w-16" /> : uniqueCursos}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inscripciones Hoy</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingInscripciones ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                inscripciones?.filter(i => {
                  const today = new Date();
                  const inscDate = new Date(i.fecha_inscripcion);
                  return inscDate.toDateString() === today.toDateString();
                }).length || 0
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Inscripciones</CardTitle>
          <CardDescription>
            Visualiza y gestiona las inscripciones de estudiantes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o correo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={cursoFilter} onValueChange={setCursoFilter}>
              <SelectTrigger className="w-full sm:w-[250px]">
                <SelectValue placeholder="Filtrar por curso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los cursos</SelectItem>
                {cursos?.map((curso) => (
                <SelectItem key={curso.id_curso} value={curso.id_curso}>
                    {curso.grupo?.nombre ? `${curso.grupo.nombre} - ${curso.titulo}` : curso.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={grupoFilter} onValueChange={setGrupoFilter}>
              <SelectTrigger className="w-full sm:w-[250px]">
                <SelectValue placeholder="Filtrar por grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los grupos</SelectItem>
                {grupos.map((grupo) => (
                  <SelectItem key={grupo.id_grupo_curso} value={grupo.id_grupo_curso}>
                    {grupo.nombre}
                  </SelectItem>
                ))}
                <SelectItem value={SIN_GRUPO_ID}>Sin grupo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {loadingInscripciones ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredInscripciones.length === 0 ? (
            <div className="text-center py-12">
              <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No hay inscripciones</h3>
              <p className="text-muted-foreground">
                {searchTerm || cursoFilter !== 'all' 
                  ? 'No se encontraron inscripciones con los filtros aplicados'
                  : 'Aún no hay estudiantes inscritos en ningún curso'
                }
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estudiante</TableHead>
                    <TableHead>Correo</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Curso</TableHead>
                    <TableHead>Fecha de Inscripción</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInscripciones.map((inscripcion) => (
                    <TableRow key={inscripcion.id_inscripcion}>
                      <TableCell className="font-medium">
                        {inscripcion.nombres} {inscripcion.apellidos}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {inscripcion.correo}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {inscripcion.nombre_grupo || 'Sin grupo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {inscripcion.titulo_curso}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(inscripcion.fecha_inscripcion), "d 'de' MMMM, yyyy", { locale: es })}
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar inscripción?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esto eliminará la inscripción de {inscripcion.nombres} {inscripcion.apellidos} del curso "{inscripcion.titulo_curso}". Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteInscripcion.mutate(inscripcion.id_inscripcion)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Results count */}
          {!loadingInscripciones && filteredInscripciones.length > 0 && (
            <p className="text-sm text-muted-foreground mt-4">
              Mostrando {filteredInscripciones.length} de {inscripciones?.length} inscripciones
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Inscripciones;
