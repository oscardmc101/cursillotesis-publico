import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCursosReporte, useEstudiantesCurso, useProgresoEstudiante, ProgresoEstudianteItem } from '@/hooks/useReportes';
import { ExportButtons } from './ExportButtons';
import { GraficoProgresoModulos } from './GraficoProgresoModulos';
import { formatDateForReport, calcularPorcentaje } from '@/lib/exportUtils';
import { BookOpen, ClipboardList, FileQuestion, TrendingUp, GraduationCap, Search } from 'lucide-react';
import { SIN_GRUPO_ID, useGruposCursos } from '@/hooks/useGruposCursos';
import { useCursillo } from '@/contexts/CursilloContext';

export function ProgresoEstudiante() {
  const [selectedGrupo, setSelectedGrupo] = useState<string>('all');
  const [selectedCurso, setSelectedCurso] = useState<string | null>(null);
  const [selectedEstudiante, setSelectedEstudiante] = useState<string | null>(null);

  const { idCursilloActivo } = useCursillo();
  const { cursos, loading: loadingCursos } = useCursosReporte(idCursilloActivo);
  const { grupos } = useGruposCursos();
  const { estudiantes, loading: loadingEstudiantes } = useEstudiantesCurso(selectedCurso);
  const { progreso, loading: loadingProgreso, error } = useProgresoEstudiante(selectedCurso, selectedEstudiante);

  const cursosFiltrados = cursos.filter(curso => {
    if (selectedGrupo === 'all') return true;
    if (selectedGrupo === SIN_GRUPO_ID) return !curso.id_grupo_curso;
    return curso.id_grupo_curso === selectedGrupo;
  });

  const handleGrupoChange = (value: string) => {
    setSelectedGrupo(value);
    setSelectedCurso(null);
    setSelectedEstudiante(null);
  };

  const handleCursoChange = (value: string) => {
    setSelectedCurso(value);
    setSelectedEstudiante(null);
  };

  const estadisticas = useMemo(() => {
    const lecciones = progreso.filter(p => p.tipo === 'LECCION');
    const tareas = progreso.filter(p => p.tipo === 'TAREA');
    const evaluaciones = progreso.filter(p => p.tipo === 'EVALUACION');

    const leccionesCompletadas = lecciones.filter(l => l.estado === 'COMPLETADA').length;
    const tareasEntregadas = tareas.filter(t => t.estado !== 'SIN_ENTREGAR').length;
    const evaluacionesCompletadas = evaluaciones.filter(e => e.estado === 'COMPLETADA').length;

    const promedioTareas = tareas
      .filter(t => t.calificacion !== null)
      .reduce((acc, t, _, arr) => acc + (t.calificacion || 0) / arr.length, 0);

    const promedioEvaluaciones = evaluaciones
      .filter(e => e.calificacion !== null)
      .reduce((acc, e, _, arr) => acc + (e.calificacion || 0) / arr.length, 0);

    return {
      lecciones: { completadas: leccionesCompletadas, total: lecciones.length },
      tareas: { entregadas: tareasEntregadas, total: tareas.length, promedio: promedioTareas },
      evaluaciones: { completadas: evaluacionesCompletadas, total: evaluaciones.length, promedio: promedioEvaluaciones }
    };
  }, [progreso]);

  const actividadPorcentaje = calcularPorcentaje(
    estadisticas.lecciones.completadas + estadisticas.tareas.entregadas + estadisticas.evaluaciones.completadas,
    estadisticas.lecciones.total + estadisticas.tareas.total + estadisticas.evaluaciones.total
  );

  const getActividadColor = (pct: number) => {
    if (pct >= 80) return '#22c55e';
    if (pct >= 50) return '#3b82f6';
    if (pct >= 25) return '#f59e0b';
    return '#ef4444';
  };

  const getEstadoBadge = (estado: string, tipo: string) => {
    const esCompletado = estado === 'COMPLETADA' || estado === 'CALIFICADA';
    const esPendiente = estado === 'PENDIENTE' || estado === 'SIN_ENTREGAR' || estado === 'SIN_INTENTAR';
    const esEnProgreso = estado === 'EN_PROGRESO' || estado === 'ENVIADO';

    if (esCompletado) return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 font-medium">Completado</Badge>;
    if (esEnProgreso) return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/25 font-medium">En progreso</Badge>;
    if (esPendiente) return <Badge className="bg-slate-500/15 text-slate-400 border-slate-500/25 font-medium">Pendiente</Badge>;
    return <Badge variant="outline">{estado}</Badge>;
  };

  const datosExport = progreso.map(item => ({
    Tipo: item.tipo,
    Título: item.titulo,
    Módulo: item.modulo,
    Estado: item.estado,
    'Fecha Entrega': formatDateForReport(item.fecha_entrega),
    'Fecha Límite': formatDateForReport(item.fecha_limite),
    Calificación: item.calificacion ?? '-',
    'Puntaje Máximo': item.puntaje_maximo ?? '-'
  }));

  const estudianteSeleccionado = estudiantes.find(e => e.id_usuario === selectedEstudiante);
  const cursoSeleccionado = cursos.find(c => c.id_curso === selectedCurso);

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Grupo</label>
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
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Curso</label>
              <Select onValueChange={handleCursoChange} value={selectedCurso || undefined}>
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Estudiante</label>
              <Select 
                onValueChange={setSelectedEstudiante} 
                value={selectedEstudiante || undefined}
                disabled={!selectedCurso}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !selectedCurso 
                      ? "Primero selecciona un curso" 
                      : loadingEstudiantes 
                        ? "Cargando..." 
                        : "Seleccionar estudiante"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {estudiantes.map(est => (
                    <SelectItem key={est.id_usuario} value={est.id_usuario}>
                      {est.apellidos}, {est.nombres}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contenido del reporte */}
      {loadingProgreso ? (
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
      ) : selectedEstudiante && progreso.length > 0 ? (
        <div id="reporte-progreso-individual" className="space-y-6">
          {/* Header con exportación */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  {estudianteSeleccionado?.apellidos}, {estudianteSeleccionado?.nombres}
                </h3>
                <p className="text-sm text-muted-foreground">{cursoSeleccionado?.titulo}</p>
              </div>
            </div>
            <ExportButtons
              data={datosExport}
              filename={`progreso_${estudianteSeleccionado?.apellidos}_${cursoSeleccionado?.titulo}`}
              pdfElementId="reporte-progreso-individual"
              pdfTitle={`Progreso de ${estudianteSeleccionado?.nombres} ${estudianteSeleccionado?.apellidos}`}
            />
          </div>

          {/* Tarjetas de resumen con colores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Lecciones - Azul */}
            <Card className="report-stat-card stat-blue">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl" style={{ backgroundColor: 'rgba(59,130,246,0.15)' }}>
                    <BookOpen className="h-5 w-5" style={{ color: '#3b82f6' }} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Lecciones</p>
                    <p className="text-2xl font-bold">
                      {estadisticas.lecciones.completadas}/{estadisticas.lecciones.total}
                    </p>
                    <p className="text-xs font-medium" style={{ color: '#3b82f6' }}>
                      {calcularPorcentaje(estadisticas.lecciones.completadas, estadisticas.lecciones.total)}% completado
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tareas - Verde */}
            <Card className="report-stat-card stat-green">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl" style={{ backgroundColor: 'rgba(34,197,94,0.15)' }}>
                    <ClipboardList className="h-5 w-5" style={{ color: '#22c55e' }} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tareas</p>
                    <p className="text-2xl font-bold">
                      {estadisticas.tareas.entregadas}/{estadisticas.tareas.total}
                    </p>
                    <p className="text-xs font-medium" style={{ color: '#22c55e' }}>
                      Promedio: {estadisticas.tareas.total > 0 ? estadisticas.tareas.promedio.toFixed(1) : '-'} pts
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Evaluaciones - Morado */}
            <Card className="report-stat-card stat-purple">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl" style={{ backgroundColor: 'rgba(139,92,246,0.15)' }}>
                    <FileQuestion className="h-5 w-5" style={{ color: '#8b5cf6' }} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Evaluaciones</p>
                    <p className="text-2xl font-bold">
                      {estadisticas.evaluaciones.completadas}/{estadisticas.evaluaciones.total}
                    </p>
                    <p className="text-xs font-medium" style={{ color: '#8b5cf6' }}>
                      Promedio: {estadisticas.evaluaciones.promedio.toFixed(1)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actividades - Dinámico según porcentaje */}
            <Card className="report-stat-card stat-teal">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${getActividadColor(actividadPorcentaje)}20` }}>
                    <TrendingUp className="h-5 w-5" style={{ color: getActividadColor(actividadPorcentaje) }} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Actividades</p>
                    <p className="text-2xl font-bold" style={{ color: getActividadColor(actividadPorcentaje) }}>
                      {actividadPorcentaje}%
                    </p>
                    <p className="text-xs text-muted-foreground">realizadas</p>
                  </div>
                </div>
                {/* Mini progress bar */}
                <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-700" 
                    style={{ width: `${actividadPorcentaje}%`, backgroundColor: getActividadColor(actividadPorcentaje) }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de progreso por módulos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-primary" />
                Progreso por Módulos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GraficoProgresoModulos progreso={progreso} />
            </CardContent>
          </Card>

          {/* Tabla de Tareas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-1 h-5 rounded-full" style={{ backgroundColor: '#22c55e' }} />
                Detalle de Tareas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarea</TableHead>
                    <TableHead>Módulo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Entrega</TableHead>
                    <TableHead>Fecha Límite</TableHead>
                    <TableHead className="text-right">Calificación</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {progreso.filter(p => p.tipo === 'TAREA').map(item => (
                    <TableRow key={item.id} className="report-table-row">
                      <TableCell className="font-medium">{item.titulo}</TableCell>
                      <TableCell className="text-muted-foreground">{item.modulo}</TableCell>
                      <TableCell>{getEstadoBadge(item.estado, item.tipo)}</TableCell>
                      <TableCell>{formatDateForReport(item.fecha_entrega)}</TableCell>
                      <TableCell>{formatDateForReport(item.fecha_limite)}</TableCell>
                      <TableCell className="text-right">
                        {item.calificacion !== null ? (
                          <span className="font-semibold" style={{ color: item.calificacion >= (item.puntaje_maximo || 10) * 0.6 ? '#22c55e' : '#ef4444' }}>
                            {item.calificacion}/{item.puntaje_maximo}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Tabla de Evaluaciones */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-1 h-5 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
                Detalle de Evaluaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evaluación</TableHead>
                    <TableHead>Módulo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Intentos</TableHead>
                    <TableHead className="text-right">Puntaje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {progreso.filter(p => p.tipo === 'EVALUACION').map(item => (
                    <TableRow key={item.id} className="report-table-row">
                      <TableCell className="font-medium">{item.titulo}</TableCell>
                      <TableCell className="text-muted-foreground">{item.modulo}</TableCell>
                      <TableCell>{getEstadoBadge(item.estado, item.tipo)}</TableCell>
                      <TableCell>{item.intentos ?? 0}/{item.intentos_max}</TableCell>
                      <TableCell className="text-right">
                        {item.calificacion !== null ? (
                          <span className="font-semibold" style={{ color: item.calificacion >= (item.puntaje_maximo || 10) * 0.6 ? '#22c55e' : '#ef4444' }}>
                            {item.calificacion}/{item.puntaje_maximo}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : selectedEstudiante ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No hay datos de progreso para este estudiante
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <div className="flex flex-col items-center gap-3">
              <Search className="h-10 w-10 text-muted-foreground/50" />
              <p>Selecciona un curso y un estudiante para ver su progreso</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
