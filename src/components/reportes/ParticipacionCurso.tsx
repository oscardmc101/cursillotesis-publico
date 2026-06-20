import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useCursosReporte, useParticipacionCurso, ParticipacionEstudiante as ParticipacionEstudianteType } from '@/hooks/useReportes';
import { ExportButtons } from './ExportButtons';
import { GraficoParticipacion } from './GraficoParticipacion';
import { GraficoRendimientoEstudiantes } from './GraficoRendimientoEstudiantes';
import { formatDateForReport, calcularPorcentaje } from '@/lib/exportUtils';
import { Users, TrendingUp, TrendingDown, Activity, BarChart3 } from 'lucide-react';
import { SIN_GRUPO_ID, useGruposCursos } from '@/hooks/useGruposCursos';
import { useCursillo } from '@/contexts/CursilloContext';

export function ParticipacionCurso() {
  const [selectedGrupo, setSelectedGrupo] = useState<string>('all');
  const [selectedCurso, setSelectedCurso] = useState<string | null>(null);

  const { idCursilloActivo } = useCursillo();
  const { cursos, loading: loadingCursos } = useCursosReporte(idCursilloActivo);
  const { grupos } = useGruposCursos();
  const { participacion, loading: loadingParticipacion, error } = useParticipacionCurso(selectedCurso);

  const cursosFiltrados = cursos.filter(curso => {
    if (selectedGrupo === 'all') return true;
    if (selectedGrupo === SIN_GRUPO_ID) return !curso.id_grupo_curso;
    return curso.id_grupo_curso === selectedGrupo;
  });

  const handleGrupoChange = (value: string) => {
    setSelectedGrupo(value);
    setSelectedCurso(null);
  };

  const estadisticasCurso = useMemo(() => {
    if (participacion.length === 0) {
      return {
        totalEstudiantes: 0,
        estudiantesActivos: 0,
        estudiantesRezagados: 0,
        promedioTareas: null as number | null,
        tasaEntrega: 0
      };
    }

    const ahora = new Date();
    const hace7Dias = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);

    const estudiantesActivos = participacion.filter(est => {
      if (!est.ultima_actividad) return false;
      const ultimaActividad = new Date(est.ultima_actividad);
      const progreso = calcularPorcentaje(
        est.lecciones_completadas + est.tareas_entregadas + est.evaluaciones_completadas,
        est.total_lecciones + est.total_tareas + est.total_evaluaciones
      );
      return ultimaActividad > hace7Dias && progreso >= 50;
    }).length;

    const estudiantesRezagados = participacion.filter(est => {
      const progreso = calcularPorcentaje(
        est.lecciones_completadas + est.tareas_entregadas + est.evaluaciones_completadas,
        est.total_lecciones + est.total_tareas + est.total_evaluaciones
      );
      const sinActividad = !est.ultima_actividad || new Date(est.ultima_actividad) < hace7Dias;
      return progreso < 25 || sinActividad;
    }).length;

    const totalTareas = participacion.reduce((acc, est) => acc + est.total_tareas, 0);
    const tareasEntregadas = participacion.reduce((acc, est) => acc + est.tareas_entregadas, 0);
    const tasaEntrega = calcularPorcentaje(tareasEntregadas, totalTareas);

    // Promedio de tareas (en puntos, escala real del puntaje_maximo de cada tarea)
    const promediosTareasValidos = participacion
      .map(est => est.promedio_tareas)
      .filter((p): p is number => p !== null);
    const promedioTareas = promediosTareasValidos.length > 0
      ? promediosTareasValidos.reduce((a, b) => a + b, 0) / promediosTareasValidos.length
      : null;

    return {
      totalEstudiantes: participacion.length,
      estudiantesActivos,
      estudiantesRezagados,
      promedioTareas,
      tasaEntrega
    };
  }, [participacion]);

  const getProgresoColor = (progreso: number) => {
    if (progreso >= 80) return '#22c55e';
    if (progreso >= 50) return '#3b82f6';
    if (progreso >= 25) return '#f59e0b';
    return '#ef4444';
  };

  const getProgresoTextClass = (progreso: number) => {
    if (progreso >= 80) return 'text-emerald-400';
    if (progreso >= 50) return 'text-blue-400';
    if (progreso >= 25) return 'text-amber-400';
    return 'text-red-400';
  };

  const getTasaColor = (tasa: number) => {
    if (tasa >= 80) return '#22c55e';
    if (tasa >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getEstadoBadge = (est: ParticipacionEstudianteType) => {
    const progreso = calcularPorcentaje(
      est.lecciones_completadas + est.tareas_entregadas + est.evaluaciones_completadas,
      est.total_lecciones + est.total_tareas + est.total_evaluaciones
    );
    
    if (progreso >= 80) return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 font-medium">Excelente</Badge>;
    if (progreso >= 50) return <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/25 font-medium">En progreso</Badge>;
    if (progreso >= 25) return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/25 font-medium">Atención</Badge>;
    return <Badge className="bg-red-500/15 text-red-400 border-red-500/25 font-medium">Rezagado</Badge>;
  };

  const datosExport = participacion.map(est => ({
    Apellidos: est.apellidos,
    Nombres: est.nombres,
    'Lecciones Completadas': `${est.lecciones_completadas}/${est.total_lecciones}`,
    'Tareas Entregadas': `${est.tareas_entregadas}/${est.total_tareas}`,
    'Tareas a Tiempo': est.tareas_a_tiempo,
    'Evaluaciones Completadas': `${est.evaluaciones_completadas}/${est.total_evaluaciones}`,
    'Promedio Tareas': est.promedio_tareas ?? '-',
    'Promedio Evaluaciones': est.promedio_evaluaciones ?? '-',
    'Última Actividad': formatDateForReport(est.ultima_actividad)
  }));

  const cursoSeleccionado = cursos.find(c => c.id_curso === selectedCurso);

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Seleccionar Curso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select onValueChange={handleGrupoChange} value={selectedGrupo}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los grupos</SelectItem>
                {grupos.map(grupo => (
                  <SelectItem key={grupo.id_grupo_curso} value={grupo.id_grupo_curso}>
                    {grupo.nombre}
                  </SelectItem>
                ))}
                <SelectItem value={SIN_GRUPO_ID}>Sin grupo</SelectItem>
              </SelectContent>
            </Select>

            <Select onValueChange={setSelectedCurso} value={selectedCurso || undefined}>
              <SelectTrigger>
                <SelectValue placeholder={loadingCursos ? "Cargando..." : "Seleccionar curso"} />
              </SelectTrigger>
              <SelectContent>
                {cursosFiltrados.map(curso => (
                  <SelectItem key={curso.id_curso} value={curso.id_curso}>
                    {curso.nombre_grupo ? `${curso.nombre_grupo} - ${curso.titulo}` : curso.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Contenido del reporte */}
      {loadingParticipacion ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-center text-destructive">
            Error: {error}
          </CardContent>
        </Card>
      ) : selectedCurso && participacion.length > 0 ? (
        <div id="reporte-participacion-curso" className="space-y-6">
          {/* Header con exportación */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{cursoSeleccionado?.titulo}</h3>
              <p className="text-sm text-muted-foreground">{participacion.length} estudiantes inscritos</p>
            </div>
            <ExportButtons
              data={datosExport}
              filename={`participacion_${cursoSeleccionado?.titulo}`}
              pdfElementId="reporte-participacion-curso"
              pdfTitle={`Participación - ${cursoSeleccionado?.titulo}`}
            />
          </div>

          {/* Tarjetas de resumen con colores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Estudiantes - Azul */}
            <Card className="report-stat-card stat-blue">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl" style={{ backgroundColor: 'rgba(59,130,246,0.15)' }}>
                    <Users className="h-5 w-5" style={{ color: '#3b82f6' }} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Estudiantes</p>
                    <p className="text-2xl font-bold">{estadisticasCurso.totalEstudiantes}</p>
                    <p className="text-xs" style={{ color: '#3b82f6' }}>inscritos en total</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Activos - Verde */}
            <Card className="report-stat-card stat-green">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl" style={{ backgroundColor: 'rgba(34,197,94,0.15)' }}>
                    <TrendingUp className="h-5 w-5" style={{ color: '#22c55e' }} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Activos</p>
                    <p className="text-2xl font-bold" style={{ color: '#22c55e' }}>
                      {estadisticasCurso.estudiantesActivos}
                    </p>
                    <p className="text-xs font-medium" style={{ color: '#22c55e' }}>
                      {calcularPorcentaje(estadisticasCurso.estudiantesActivos, estadisticasCurso.totalEstudiantes)}% del total
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rezagados - Rojo */}
            <Card className="report-stat-card stat-red">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl" style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}>
                    <TrendingDown className="h-5 w-5" style={{ color: '#ef4444' }} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rezagados</p>
                    <p className="text-2xl font-bold" style={{ color: '#ef4444' }}>
                      {estadisticasCurso.estudiantesRezagados}
                    </p>
                    <p className="text-xs font-medium" style={{ color: '#ef4444' }}>
                      {calcularPorcentaje(estadisticasCurso.estudiantesRezagados, estadisticasCurso.totalEstudiantes)}% del total
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tasa de entrega - Ámbar */}
            <Card className="report-stat-card stat-amber">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${getTasaColor(estadisticasCurso.tasaEntrega)}20` }}>
                    <Activity className="h-5 w-5" style={{ color: getTasaColor(estadisticasCurso.tasaEntrega) }} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tasa de Entrega</p>
                    <p className="text-2xl font-bold" style={{ color: getTasaColor(estadisticasCurso.tasaEntrega) }}>
                      {estadisticasCurso.tasaEntrega}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Prom. tareas: {estadisticasCurso.promedioTareas !== null ? `${estadisticasCurso.promedioTareas.toFixed(1)} pts` : '—'}
                    </p>
                  </div>
                </div>
                {/* Mini progress bar */}
                <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-700" 
                    style={{ width: `${estadisticasCurso.tasaEntrega}%`, backgroundColor: getTasaColor(estadisticasCurso.tasaEntrega) }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-1 h-5 rounded-full" style={{ backgroundColor: '#22c55e' }} />
                  Distribución de Entregas
                </CardTitle>
                <CardDescription>Estado de las entregas de tareas</CardDescription>
              </CardHeader>
              <CardContent>
                <GraficoParticipacion participacion={participacion} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-1 h-5 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
                  Ranking de Estudiantes
                </CardTitle>
                <CardDescription>Top 10 por progreso general</CardDescription>
              </CardHeader>
              <CardContent>
                <GraficoRendimientoEstudiantes participacion={participacion} />
              </CardContent>
            </Card>
          </div>

          {/* Tabla de estudiantes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-1 h-5 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
                Detalle por Estudiante
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estudiante</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Lecciones</TableHead>
                    <TableHead>Tareas</TableHead>
                    <TableHead>Evaluaciones</TableHead>
                    <TableHead>Promedio</TableHead>
                    <TableHead>Última Actividad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participacion.map(est => {
                    const progresoGeneral = calcularPorcentaje(
                      est.lecciones_completadas + est.tareas_entregadas + est.evaluaciones_completadas,
                      est.total_lecciones + est.total_tareas + est.total_evaluaciones
                    );
                    const progressColor = getProgresoColor(progresoGeneral);
                    return (
                      <TableRow key={est.id_usuario} className="report-table-row">
                        <TableCell>
                          <div>
                            <p className="font-medium">{est.apellidos}, {est.nombres}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                                <div 
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${progresoGeneral}%`, backgroundColor: progressColor }}
                                />
                              </div>
                              <span className={`text-xs font-semibold ${getProgresoTextClass(progresoGeneral)}`}>
                                {progresoGeneral}%
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getEstadoBadge(est)}</TableCell>
                        <TableCell>
                          <span className={getProgresoTextClass(calcularPorcentaje(est.lecciones_completadas, est.total_lecciones))} style={{ fontWeight: 600 }}>
                            {est.lecciones_completadas}/{est.total_lecciones}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className={getProgresoTextClass(calcularPorcentaje(est.tareas_entregadas, est.total_tareas))} style={{ fontWeight: 600 }}>
                              {est.tareas_entregadas}/{est.total_tareas}
                            </span>
                            <p className="text-xs text-muted-foreground">
                              {est.tareas_a_tiempo} a tiempo
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={getProgresoTextClass(calcularPorcentaje(est.evaluaciones_completadas, est.total_evaluaciones))} style={{ fontWeight: 600 }}>
                            {est.evaluaciones_completadas}/{est.total_evaluaciones}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            {est.promedio_tareas !== null && (
                              <p className="text-sm">
                                <span className="text-muted-foreground">Tareas: </span>
                                <span className="font-semibold" style={{ color: getProgresoColor(est.promedio_tareas * 10) }}>
                                  {est.promedio_tareas}
                                </span>
                              </p>
                            )}
                            {est.promedio_evaluaciones !== null && (
                              <p className="text-sm">
                                <span className="text-muted-foreground">Eval: </span>
                                <span className="font-semibold" style={{ color: getProgresoColor(est.promedio_evaluaciones * 10) }}>
                                  {est.promedio_evaluaciones}
                                </span>
                              </p>
                            )}
                            {est.promedio_tareas === null && est.promedio_evaluaciones === null && (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateForReport(est.ultima_actividad)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : selectedCurso ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No hay estudiantes inscritos en este curso
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <div className="flex flex-col items-center gap-3">
              <BarChart3 className="h-10 w-10 text-muted-foreground/50" />
              <p>Selecciona un curso para ver las métricas de participación</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
