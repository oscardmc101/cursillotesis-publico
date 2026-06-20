import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileCheck, 
  ClipboardCheck, 
  Loader2, 
  Eye,
  Clock,
  User,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  PenLine
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useEntregasPorCalificar } from '@/hooks/useTareas';
import { useIntentosPorRevisar } from '@/hooks/useEvaluaciones';
import { useCursillo } from '@/contexts/CursilloContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type OrderDirection = 'asc' | 'desc' | null;
type StatusFilter = 'pendientes' | 'corregidos' | 'todos';

const Correcciones = () => {
  const { idCursilloActivo } = useCursillo();
  const { entregas: entregasTareas, loading: loadingTareas } = useEntregasPorCalificar(idCursilloActivo);
  const { intentos: intentosEvaluaciones, loading: loadingEvaluaciones } = useIntentosPorRevisar(idCursilloActivo);

  // Filter states for Tareas
  const [tareasStatusFilter, setTareasStatusFilter] = useState<StatusFilter>('todos');
  const [tareasCursoFilter, setTareasCursoFilter] = useState<string>('todos');
  const [tareasEstudianteFilter, setTareasEstudianteFilter] = useState('');
  const [tareasOrderDir, setTareasOrderDir] = useState<OrderDirection>(null);

  // Filter states for Evaluaciones
  const [evalsStatusFilter, setEvalsStatusFilter] = useState<StatusFilter>('todos');
  const [evalsCursoFilter, setEvalsCursoFilter] = useState<string>('todos');
  const [evalsEstudianteFilter, setEvalsEstudianteFilter] = useState('');
  const [evalsOrderDir, setEvalsOrderDir] = useState<OrderDirection>(null);

  // Get unique cursos for filters
  const cursosTareas = useMemo(() => {
    const unique = new Set(entregasTareas.map(e => e.curso_titulo).filter(Boolean));
    return Array.from(unique) as string[];
  }, [entregasTareas]);

  const cursosEvals = useMemo(() => {
    const unique = new Set(intentosEvaluaciones.map(i => i.curso_titulo).filter(Boolean));
    return Array.from(unique) as string[];
  }, [intentosEvaluaciones]);

  // Filter and sort tareas
  const filteredTareas = useMemo(() => {
    let filtered = [...entregasTareas];

    // Status filter
    if (tareasStatusFilter === 'pendientes') {
      filtered = filtered.filter(e => e.estado === 'ENVIADO');
    } else if (tareasStatusFilter === 'corregidos') {
      filtered = filtered.filter(e => e.estado === 'CALIFICADO');
    }

    // Curso filter
    if (tareasCursoFilter && tareasCursoFilter !== 'todos') {
      filtered = filtered.filter(e => e.curso_titulo === tareasCursoFilter);
    }

    // Estudiante filter
    if (tareasEstudianteFilter.trim()) {
      const search = tareasEstudianteFilter.toLowerCase().trim();
      filtered = filtered.filter(e => {
        const fullName = `${e.usuario?.nombres || ''} ${e.usuario?.apellidos || ''}`.toLowerCase();
        return fullName.includes(search);
      });
    }

    // Order by fecha
    if (tareasOrderDir) {
      filtered.sort((a, b) => {
        const dateA = new Date(a.fecha_entrega).getTime();
        const dateB = new Date(b.fecha_entrega).getTime();
        return tareasOrderDir === 'asc' ? dateA - dateB : dateB - dateA;
      });
    }

    return filtered;
  }, [entregasTareas, tareasStatusFilter, tareasCursoFilter, tareasEstudianteFilter, tareasOrderDir]);

  // Filter and sort evaluaciones
  const filteredEvals = useMemo(() => {
    let filtered = [...intentosEvaluaciones];

    // Status filter
    if (evalsStatusFilter === 'pendientes') {
      filtered = filtered.filter(i => ['COMPLETADO', 'RECLAMADO'].includes(i.estado as string));
    } else if (evalsStatusFilter === 'corregidos') {
      filtered = filtered.filter(i => (i.estado as string) === 'CORREGIDO');
    }

    // Curso filter
    if (evalsCursoFilter && evalsCursoFilter !== 'todos') {
      filtered = filtered.filter(i => i.curso_titulo === evalsCursoFilter);
    }

    // Estudiante filter
    if (evalsEstudianteFilter.trim()) {
      const search = evalsEstudianteFilter.toLowerCase().trim();
      filtered = filtered.filter(i => {
        const fullName = `${i.usuario?.nombres || ''} ${i.usuario?.apellidos || ''}`.toLowerCase();
        return fullName.includes(search);
      });
    }

    // Order by fecha
    if (evalsOrderDir) {
      filtered.sort((a, b) => {
        const dateA = a.fecha_envio ? new Date(a.fecha_envio).getTime() : 0;
        const dateB = b.fecha_envio ? new Date(b.fecha_envio).getTime() : 0;
        return evalsOrderDir === 'asc' ? dateA - dateB : dateB - dateA;
      });
    }

    return filtered;
  }, [intentosEvaluaciones, evalsStatusFilter, evalsCursoFilter, evalsEstudianteFilter, evalsOrderDir]);

  const clearTareasFilters = () => {
    setTareasStatusFilter('todos');
    setTareasCursoFilter('todos');
    setTareasEstudianteFilter('');
    setTareasOrderDir(null);
  };

  const clearEvalsFilters = () => {
    setEvalsStatusFilter('todos');
    setEvalsCursoFilter('todos');
    setEvalsEstudianteFilter('');
    setEvalsOrderDir(null);
  };

  const hasTareasFilters = tareasStatusFilter !== 'todos' || tareasCursoFilter !== 'todos' || tareasEstudianteFilter.trim() || tareasOrderDir;
  const hasEvalsFilters = evalsStatusFilter !== 'todos' || evalsCursoFilter !== 'todos' || evalsEstudianteFilter.trim() || evalsOrderDir;

  const toggleOrder = (current: OrderDirection): OrderDirection => {
    if (current === null) return 'asc';
    if (current === 'asc') return 'desc';
    return null;
  };

  const totalTareas = entregasTareas.length;
  const tareasPendientes = entregasTareas.filter(e => e.estado === 'ENVIADO').length;
  const tareasCorregidas = entregasTareas.filter(e => e.estado === 'CALIFICADO').length;
  const totalEvaluaciones = intentosEvaluaciones.length;
  const evaluacionesPendientes = intentosEvaluaciones.filter(i => ['COMPLETADO', 'RECLAMADO'].includes(i.estado as string)).length;
  const evaluacionesCorregidas = intentosEvaluaciones.filter(i => i.estado === 'CORREGIDO').length;
  const totalCorrecciones = totalTareas + totalEvaluaciones;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Correcciones</h1>
        <p className="text-muted-foreground mt-1">
          Revisa y califica las entregas de tareas y evaluaciones de los estudiantes
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total correcciones</p>
                <p className="text-3xl font-bold mt-1">
                  {loadingTareas || loadingEvaluaciones ? '...' : totalCorrecciones}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {tareasPendientes + evaluacionesPendientes} pendientes / {tareasCorregidas + evaluacionesCorregidas} corregidas
                </p>
              </div>
              <div className="p-3 rounded-lg bg-warning/10">
                <Clock className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tareas</p>
                <p className="text-3xl font-bold mt-1">
                  {loadingTareas ? '...' : totalTareas}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {tareasPendientes} pendientes / {tareasCorregidas} corregidas
                </p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10">
                <FileCheck className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Evaluaciones</p>
                <p className="text-3xl font-bold mt-1">
                  {loadingEvaluaciones ? '...' : totalEvaluaciones}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {evaluacionesPendientes} pendientes / {evaluacionesCorregidas} corregidas
                </p>
              </div>
              <div className="p-3 rounded-lg bg-accent/10">
                <ClipboardCheck className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different types */}
      <Tabs defaultValue="tareas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tareas" className="gap-2">
            <FileCheck className="h-4 w-4" />
            Tareas
            {totalTareas > 0 && (
              <Badge variant="secondary" className="ml-1">
                {totalTareas}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="evaluaciones" className="gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Evaluaciones
            {totalEvaluaciones > 0 && (
              <Badge variant="secondary" className="ml-1">
                {totalEvaluaciones}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tareas Tab */}
        <TabsContent value="tareas">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Entregas de Tareas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-3 items-center p-4 bg-muted/50 rounded-lg">
                <Select value={tareasStatusFilter} onValueChange={(v) => setTareasStatusFilter(v as StatusFilter)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pendientes">Pendientes</SelectItem>
                    <SelectItem value="corregidos">Corregidos</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={tareasCursoFilter} onValueChange={setTareasCursoFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Curso" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los cursos</SelectItem>
                    {cursosTareas.map(curso => (
                      <SelectItem key={curso} value={curso}>{curso}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Buscar estudiante..."
                  value={tareasEstudianteFilter}
                  onChange={(e) => setTareasEstudianteFilter(e.target.value)}
                  className="w-[200px]"
                />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTareasOrderDir(toggleOrder(tareasOrderDir))}
                  className="gap-1"
                >
                  {tareasOrderDir === 'asc' ? (
                    <ArrowUp className="h-4 w-4" />
                  ) : tareasOrderDir === 'desc' ? (
                    <ArrowDown className="h-4 w-4" />
                  ) : (
                    <ArrowUpDown className="h-4 w-4" />
                  )}
                  Fecha
                </Button>

                {hasTareasFilters && (
                  <Button variant="ghost" size="sm" onClick={clearTareasFilters} className="gap-1 text-destructive">
                    <X className="h-4 w-4" />
                    Limpiar filtros
                  </Button>
                )}
              </div>

              {loadingTareas ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : filteredTareas.length === 0 ? (
                <div className="text-center py-8">
                  <FileCheck className="h-12 w-12 mx-auto text-muted-foreground/50" />
                  <p className="text-muted-foreground mt-2">
                    No hay entregas de tareas que coincidan con los filtros
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Estudiante</TableHead>
                      <TableHead>Tarea</TableHead>
                      <TableHead>Curso</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha Entrega</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTareas.map((entrega) => (
                      <TableRow key={entrega.id_entrega}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">
                                {entrega.usuario?.nombres} {entrega.usuario?.apellidos}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {entrega.usuario?.correo}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{entrega.tarea_titulo}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{entrega.curso_titulo}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={entrega.estado === 'ENVIADO' ? 'secondary' : 'default'}>
                            {entrega.estado === 'ENVIADO' ? 'Pendiente' : 'Corregido'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">
                            {format(new Date(entrega.fecha_entrega), 'dd MMM yyyy, HH:mm', { locale: es })}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link to={`/correcciones/tarea/${entrega.id_entrega}`}>
                            <Button size="sm" variant="outline" className="gap-1">
                              {entrega.estado === 'ENVIADO' ? (
                                <><PenLine className="h-4 w-4" /> Corregir</>
                              ) : (
                                <><Eye className="h-4 w-4" /> Ver corrección</>
                              )}
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evaluaciones Tab */}
        <TabsContent value="evaluaciones">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5" />
                Intentos de Evaluación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-3 items-center p-4 bg-muted/50 rounded-lg">
                <Select value={evalsStatusFilter} onValueChange={(v) => setEvalsStatusFilter(v as StatusFilter)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pendientes">Pendientes</SelectItem>
                    <SelectItem value="corregidos">Corregidos</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={evalsCursoFilter} onValueChange={setEvalsCursoFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Curso" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los cursos</SelectItem>
                    {cursosEvals.map(curso => (
                      <SelectItem key={curso} value={curso}>{curso}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Buscar estudiante..."
                  value={evalsEstudianteFilter}
                  onChange={(e) => setEvalsEstudianteFilter(e.target.value)}
                  className="w-[200px]"
                />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEvalsOrderDir(toggleOrder(evalsOrderDir))}
                  className="gap-1"
                >
                  {evalsOrderDir === 'asc' ? (
                    <ArrowUp className="h-4 w-4" />
                  ) : evalsOrderDir === 'desc' ? (
                    <ArrowDown className="h-4 w-4" />
                  ) : (
                    <ArrowUpDown className="h-4 w-4" />
                  )}
                  Fecha
                </Button>

                {hasEvalsFilters && (
                  <Button variant="ghost" size="sm" onClick={clearEvalsFilters} className="gap-1 text-destructive">
                    <X className="h-4 w-4" />
                    Limpiar filtros
                  </Button>
                )}
              </div>

              {loadingEvaluaciones ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : filteredEvals.length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground/50" />
                  <p className="text-muted-foreground mt-2">
                    No hay evaluaciones que coincidan con los filtros
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Estudiante</TableHead>
                      <TableHead>Evaluación</TableHead>
                      <TableHead>Curso</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Preguntas Pendientes</TableHead>
                      <TableHead>Fecha Envío</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvals.map((intento) => (
                      <TableRow key={intento.id_intento}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">
                                {intento.usuario?.nombres || 'Sin nombre'} {intento.usuario?.apellidos || ''}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {intento.usuario?.correo || 'Sin correo'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{intento.evaluacion_titulo}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{intento.curso_titulo}</Badge>
                        </TableCell>
                        <TableCell>
                          {intento.estado === 'RECLAMADO' ? (
                            <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30">
                              Con reclamo
                            </Badge>
                          ) : (
                            <Badge variant={intento.estado === 'COMPLETADO' ? 'secondary' : 'default'}>
                              {intento.estado === 'COMPLETADO' ? 'Pendiente' : 'Corregido'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {intento.estado === 'RECLAMADO'
                              ? 'Reclamo'
                              : `${intento.preguntas_pendientes} pregunta${intento.preguntas_pendientes !== 1 ? 's' : ''}`}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">
                            {intento.fecha_envio 
                              ? format(new Date(intento.fecha_envio), 'dd MMM yyyy, HH:mm', { locale: es })
                              : '-'
                            }
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link to={`/correcciones/evaluacion/${intento.id_intento}`}>
                            <Button size="sm" variant="outline" className="gap-1">
                              {intento.estado === 'COMPLETADO' || intento.estado === 'RECLAMADO' ? (
                                <><PenLine className="h-4 w-4" /> Corregir</>
                              ) : (
                                <><Eye className="h-4 w-4" /> Ver corrección</>
                              )}
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Correcciones;
