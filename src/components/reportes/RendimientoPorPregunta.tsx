import { useMemo, useState } from 'react';
import { BarChart3, Brain, CheckCircle2, HelpCircle, Search, Target, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  RendimientoPreguntaItem,
  useCursosReporte,
  useEvaluacionesReporte,
  useRendimientoPorPregunta
} from '@/hooks/useReportes';
import { SIN_GRUPO_ID, useGruposCursos } from '@/hooks/useGruposCursos';
import { useCursillo } from '@/contexts/CursilloContext';
import { LatexText } from '@/components/evaluaciones/LatexText';
import { ExportButtons } from './ExportButtons';
import { GraficoRendimientoPreguntas } from './GraficoRendimientoPreguntas';

const getNivelLabel = (nivel: string) => {
  if (nivel === 'Facil') return 'Fácil';
  if (nivel === 'Dificil') return 'Difícil';
  return nivel;
};

const getNivelClass = (nivel: string) => {
  if (nivel === 'Facil') return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/25';
  if (nivel === 'Media') return 'bg-amber-500/15 text-amber-500 border-amber-500/25';
  if (nivel === 'Dificil') return 'bg-red-500/15 text-red-500 border-red-500/25';
  return 'bg-slate-500/15 text-slate-400 border-slate-500/25';
};

const getTipoLabel = (tipo: string) => {
  if (tipo === 'OPCION_MULTIPLE') return 'Opción múltiple';
  if (tipo === 'ABIERTA') return 'Abierta';
  return tipo;
};

const getPromedio = (items: RendimientoPreguntaItem[]) => {
  const conDatos = items.filter((item) => item.total_respuestas > 0);
  if (conDatos.length === 0) return null;
  return conDatos.reduce((acc, item) => acc + item.porcentaje_aciertos, 0) / conDatos.length;
};

const getPreguntaExtrema = (
  items: RendimientoPreguntaItem[],
  compare: (a: RendimientoPreguntaItem, b: RendimientoPreguntaItem) => RendimientoPreguntaItem
) => {
  const conDatos = items.filter((item) => item.total_respuestas > 0);
  if (conDatos.length === 0) return null;
  return conDatos.reduce(compare);
};

export function RendimientoPorPregunta() {
  const [selectedGrupo, setSelectedGrupo] = useState('all');
  const [selectedCurso, setSelectedCurso] = useState<string | null>(null);
  const [selectedEvaluacion, setSelectedEvaluacion] = useState<string | null>(null);

  const { idCursilloActivo } = useCursillo();
  const { cursos, loading: loadingCursos } = useCursosReporte(idCursilloActivo);
  const { grupos } = useGruposCursos();
  const { evaluaciones, loading: loadingEvaluaciones, error: errorEvaluaciones } = useEvaluacionesReporte(selectedCurso);
  const { rendimiento, loading: loadingRendimiento, error } = useRendimientoPorPregunta(selectedEvaluacion);

  const cursosFiltrados = cursos.filter((curso) => {
    if (selectedGrupo === 'all') return true;
    if (selectedGrupo === SIN_GRUPO_ID) return !curso.id_grupo_curso;
    return curso.id_grupo_curso === selectedGrupo;
  });

  const handleGrupoChange = (value: string) => {
    setSelectedGrupo(value);
    setSelectedCurso(null);
    setSelectedEvaluacion(null);
  };

  const handleCursoChange = (value: string) => {
    setSelectedCurso(value);
    setSelectedEvaluacion(null);
  };

  const resumen = useMemo(() => {
    const promedioGeneral = getPromedio(rendimiento);
    const preguntaMasDificil = getPreguntaExtrema(
      rendimiento,
      (a, b) => (a.porcentaje_aciertos <= b.porcentaje_aciertos ? a : b)
    );
    const preguntaMejorRendimiento = getPreguntaExtrema(
      rendimiento,
      (a, b) => (a.porcentaje_aciertos >= b.porcentaje_aciertos ? a : b)
    );
    const totalRespuestas = rendimiento.reduce((acc, item) => acc + item.total_respuestas, 0);

    return {
      promedioGeneral,
      preguntaMasDificil,
      preguntaMejorRendimiento,
      totalPreguntas: rendimiento.length,
      totalRespuestas,
    };
  }, [rendimiento]);

  const evaluacionSeleccionada = evaluaciones.find((evaluacion) => evaluacion.id_evaluacion === selectedEvaluacion);
  const cursoSeleccionado = cursos.find((curso) => curso.id_curso === selectedCurso);

  const datosExport = rendimiento.map((item) => ({
    Pregunta: `P${item.numero_pregunta} - ${item.pregunta}`,
    'Tipo de pregunta': getTipoLabel(item.tipo_pregunta),
    'Total de respuestas': item.total_respuestas,
    'Respuestas correctas': item.respuestas_correctas,
    'Respuestas incorrectas': item.respuestas_incorrectas,
    '% de aciertos': `${item.porcentaje_aciertos.toFixed(1)}%`,
    '% de errores': `${item.porcentaje_errores.toFixed(1)}%`,
    'Nivel de dificultad': getNivelLabel(item.nivel_dificultad),
  }));

  const loading = loadingRendimiento;
  const reportError = error || errorEvaluaciones;

  return (
    <div className="space-y-6">
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
              <Select value={selectedGrupo} onValueChange={handleGrupoChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar grupo" />
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Curso</label>
              <Select key={selectedGrupo} value={selectedCurso || undefined} onValueChange={handleCursoChange}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingCursos ? 'Cargando...' : 'Seleccionar curso'} />
                </SelectTrigger>
                <SelectContent>
                  {cursosFiltrados.map((curso) => (
                    <SelectItem key={curso.id_curso} value={curso.id_curso}>
                      {curso.nombre_grupo ? `${curso.nombre_grupo} - ${curso.titulo}` : curso.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Evaluación</label>
              <Select
                key={selectedCurso || 'no-curso'}
                value={selectedEvaluacion || undefined}
                onValueChange={setSelectedEvaluacion}
                disabled={!selectedCurso}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !selectedCurso
                      ? 'Primero selecciona un curso'
                      : loadingEvaluaciones
                        ? 'Cargando...'
                        : 'Seleccionar evaluación'
                  } />
                </SelectTrigger>
                <SelectContent>
                  {evaluaciones.map((evaluacion) => (
                    <SelectItem key={evaluacion.id_evaluacion} value={evaluacion.id_evaluacion}>
                      {evaluacion.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      ) : reportError ? (
        <Card>
          <CardContent className="py-8 text-center text-destructive">
            Error: {reportError}
          </CardContent>
        </Card>
      ) : selectedEvaluacion && rendimiento.length > 0 ? (
        <div id="reporte-rendimiento-pregunta" className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold">{evaluacionSeleccionada?.titulo}</h3>
              <p className="text-sm text-muted-foreground">
                {cursoSeleccionado?.titulo} · {evaluacionSeleccionada?.modulo_titulo}
              </p>
            </div>
            <ExportButtons
              data={datosExport}
              filename={`rendimiento_pregunta_${evaluacionSeleccionada?.titulo || 'evaluacion'}`.replace(/\s+/g, '_').toLowerCase()}
              pdfElementId="reporte-rendimiento-pregunta"
              pdfTitle={`Rendimiento por Pregunta - ${evaluacionSeleccionada?.titulo || 'Evaluación'}`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="report-stat-card stat-blue">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-blue-500/15">
                    <Target className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Promedio aciertos</p>
                    <p className="text-2xl font-bold">
                      {resumen.promedioGeneral !== null ? `${resumen.promedioGeneral.toFixed(1)}%` : '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="report-stat-card stat-red">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-red-500/15">
                    <Brain className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">Más difícil</p>
                    <p className="text-2xl font-bold">
                      {resumen.preguntaMasDificil ? `P${resumen.preguntaMasDificil.numero_pregunta}` : '-'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {resumen.preguntaMasDificil ? `${resumen.preguntaMasDificil.porcentaje_aciertos.toFixed(1)}% aciertos` : 'Sin datos'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="report-stat-card stat-green">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-emerald-500/15">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Mejor rendimiento</p>
                    <p className="text-2xl font-bold">
                      {resumen.preguntaMejorRendimiento ? `P${resumen.preguntaMejorRendimiento.numero_pregunta}` : '-'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {resumen.preguntaMejorRendimiento ? `${resumen.preguntaMejorRendimiento.porcentaje_aciertos.toFixed(1)}% aciertos` : 'Sin datos'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="report-stat-card stat-purple">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-purple-500/15">
                    <HelpCircle className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Preguntas</p>
                    <p className="text-2xl font-bold">{resumen.totalPreguntas}</p>
                    <p className="text-xs text-muted-foreground">{resumen.totalRespuestas} respuestas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-primary" />
                Porcentaje de aciertos por pregunta
              </CardTitle>
              <CardDescription>Las barras usan el puntaje obtenido sobre el puntaje posible por pregunta</CardDescription>
            </CardHeader>
            <CardContent>
              <GraficoRendimientoPreguntas rendimiento={rendimiento} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-primary" />
                Detalle por Pregunta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pregunta</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Correctas</TableHead>
                    <TableHead className="text-right">Incorrectas</TableHead>
                    <TableHead className="text-right">% Aciertos</TableHead>
                    <TableHead className="text-right">% Errores</TableHead>
                    <TableHead>Nivel</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rendimiento.map((item) => (
                    <TableRow key={item.id_pregunta} className="report-table-row">
                      <TableCell className="max-w-[360px]">
                        <div>
                          <p className="font-semibold">P{item.numero_pregunta}</p>
                          <LatexText className="block text-sm text-muted-foreground [&>span.block]:my-1 [&>span.block]:py-0.5 [&_.katex-display]:my-0">
                            {item.pregunta}
                          </LatexText>
                        </div>
                      </TableCell>
                      <TableCell>{getTipoLabel(item.tipo_pregunta)}</TableCell>
                      <TableCell className="text-right">{item.total_respuestas}</TableCell>
                      <TableCell className="text-right text-emerald-500 font-semibold">{item.respuestas_correctas}</TableCell>
                      <TableCell className="text-right text-red-500 font-semibold">{item.respuestas_incorrectas}</TableCell>
                      <TableCell className="text-right font-semibold">{item.porcentaje_aciertos.toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{item.porcentaje_errores.toFixed(1)}%</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getNivelClass(item.nivel_dificultad)}>
                          {getNivelLabel(item.nivel_dificultad)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : selectedEvaluacion ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No hay preguntas configuradas para esta evaluación.
          </CardContent>
        </Card>
      ) : selectedCurso && evaluaciones.length === 0 && !loadingEvaluaciones ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Este curso no tiene evaluaciones disponibles para reportar.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <div className="flex flex-col items-center gap-3">
              <BarChart3 className="h-10 w-10 text-muted-foreground/50" />
              <p>Selecciona grupo, curso y evaluación para ver el rendimiento por pregunta.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
