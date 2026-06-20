import { useMemo, useState } from 'react';
import { Award, BookOpen, FileText, Search, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useCertificadoEstudios } from '@/hooks/useReportes';
import { useCursillo } from '@/contexts/CursilloContext';
import { useUserRole } from '@/contexts/UserRoleContext';
import { ExportButtons } from './ExportButtons';
import { CertificadoEstudiosPreview } from './CertificadoEstudiosPreview';
import { formatDateForReport } from '@/lib/exportUtils';

const promedio = (values: number[]) => {
  if (values.length === 0) return null;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
};

const estadoLabel: Record<string, string> = {
  CALIFICADO: 'Calificado',
  PENDIENTE_CORRECCION: 'Pendiente de corrección',
  SIN_PRESENTAR: 'Sin presentar',
  VENCIDO: 'Vencido',
  EN_PROGRESO: 'En progreso',
  EN_REVISION: 'En revisión',
};

const getEstadoLabel = (estado: string) => estadoLabel[estado] || estado;

export function CertificadoEstudios() {
  const [selectedCurso, setSelectedCurso] = useState('all');
  const fechaEmision = useMemo(() => new Date(), []);

  const { idCursilloActivo, cursilloActivo } = useCursillo();
  const { profile } = useUserRole();

  const {
    certificado: certificadoCompleto,
    loading: loadingCompleto,
    error: errorCompleto
  } = useCertificadoEstudios(idCursilloActivo, null);

  const certificado = useMemo(() => {
    if (selectedCurso === 'all') return certificadoCompleto;
    return certificadoCompleto.filter((item) => item.id_curso === selectedCurso);
  }, [certificadoCompleto, selectedCurso]);

  const loading = loadingCompleto;
  const error = errorCompleto;

  const cursos = useMemo(() => {
    const map = new Map<string, string>();
    certificadoCompleto.forEach((item) => {
      map.set(item.id_curso, item.curso_titulo);
    });
    return Array.from(map.entries())
      .map(([id_curso, titulo]) => ({ id_curso, titulo }))
      .sort((a, b) => a.titulo.localeCompare(b.titulo));
  }, [certificadoCompleto]);

  const promedioGeneral = useMemo(() => {
    return promedio(
      certificado
        .filter((item) => item.incluye_promedio && item.porcentaje !== null)
        .map((item) => item.porcentaje || 0)
    );
  }, [certificado]);

  const estadisticas = useMemo(() => {
    const calificadas = certificado.filter((item) => item.estado === 'CALIFICADO').length;
    const enRevision = certificado.filter((item) => item.estado === 'EN_REVISION').length;
    const pendientes = certificado.filter((item) => (
      item.estado === 'PENDIENTE_CORRECCION' ||
      item.estado === 'SIN_PRESENTAR' ||
      item.estado === 'VENCIDO' ||
      item.estado === 'EN_PROGRESO'
    )).length;

    return {
      cursos: new Set(certificado.map((item) => item.id_curso)).size,
      actividades: certificado.length,
      calificadas,
      pendientes,
      enRevision,
    };
  }, [certificado]);

  const selectedCursoTitulo = selectedCurso === 'all'
    ? 'todos_los_cursos'
    : cursos.find((curso) => curso.id_curso === selectedCurso)?.titulo || 'curso';

  const datosExport = certificado.map((item) => ({
    Curso: item.curso_titulo,
    Grupo: item.grupo_nombre || 'Sin grupo',
    Modulo: item.modulo_titulo,
    Leccion: item.leccion_titulo,
    Actividad: item.actividad_titulo,
    Tipo: item.tipo_actividad === 'TAREA' ? 'Tarea' : 'Evaluacion',
    Estado: getEstadoLabel(item.estado),
    'Fecha resultado': formatDateForReport(item.fecha_resultado),
    'Puntaje obtenido': item.puntaje_obtenido ?? '-',
    'Puntaje maximo': item.puntaje_maximo ?? '-',
    Porcentaje: item.porcentaje !== null ? `${item.porcentaje.toFixed(1)}%` : '-',
  }));

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Curso / Materia</label>
              <Select value={selectedCurso} onValueChange={setSelectedCurso}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingCompleto ? 'Cargando...' : 'Seleccionar curso'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los cursos</SelectItem>
                  {cursos.map((curso) => (
                    <SelectItem key={curso.id_curso} value={curso.id_curso}>
                      {curso.titulo}
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
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-center text-destructive">
            Error: {error}
          </CardContent>
        </Card>
      ) : certificado.length > 0 ? (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
                <Award className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Certificado de Estudios</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedCurso === 'all' ? 'Todos los cursos' : selectedCursoTitulo}
                </p>
              </div>
            </div>
            <ExportButtons
              data={datosExport}
              filename={`certificado_estudios_${selectedCursoTitulo}`.replace(/\s+/g, '_').toLowerCase()}
              pdfElementId="certificado-estudios-reporte"
              pdfTitle="Certificado de Estudios"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="report-stat-card stat-blue">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-blue-500/15">
                    <BookOpen className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cursos</p>
                    <p className="text-2xl font-bold">{estadisticas.cursos}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="report-stat-card stat-green">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-emerald-500/15">
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Promedio</p>
                    <p className="text-2xl font-bold">
                      {promedioGeneral !== null ? `${promedioGeneral.toFixed(1)}%` : '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="report-stat-card stat-purple">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-purple-500/15">
                    <FileText className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Calificadas</p>
                    <p className="text-2xl font-bold">{estadisticas.calificadas}</p>
                    <p className="text-xs text-muted-foreground">{estadisticas.actividades} actividades</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="report-stat-card stat-amber">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-amber-500/15">
                    <Award className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pendientes</p>
                    <p className="text-2xl font-bold">{estadisticas.pendientes}</p>
                    <p className="text-xs text-muted-foreground">{estadisticas.enRevision} en revisión</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div id="certificado-estudios-reporte">
            <CertificadoEstudiosPreview
              estudiante={profile}
              cursilloNombre={cursilloActivo?.nombre || 'Cursillo'}
              items={certificado}
              promedioGeneral={promedioGeneral}
              fechaEmision={fechaEmision}
            />
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <div className="flex flex-col items-center gap-3">
              <Award className="h-10 w-10 text-muted-foreground/50" />
              <p>No hay actividades disponibles para generar el certificado de estudios.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
