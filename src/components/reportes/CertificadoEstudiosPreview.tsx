import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CertificadoEstudiosItem } from '@/hooks/useReportes';
import { UserProfile } from '@/contexts/UserRoleContext';
import { formatDateForReport } from '@/lib/exportUtils';

interface CertificadoEstudiosPreviewProps {
  estudiante: UserProfile | null;
  cursilloNombre: string;
  items: CertificadoEstudiosItem[];
  promedioGeneral: number | null;
  fechaEmision: Date;
}

const estadoLabel: Record<string, string> = {
  CALIFICADO: 'Calificado',
  PENDIENTE_CORRECCION: 'Pendiente de corrección',
  SIN_PRESENTAR: 'Sin presentar',
  VENCIDO: 'Vencido',
  EN_PROGRESO: 'En progreso',
  EN_REVISION: 'En revisión',
};

const estadoClass: Record<string, string> = {
  CALIFICADO: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/25',
  PENDIENTE_CORRECCION: 'bg-amber-500/15 text-amber-500 border-amber-500/25',
  SIN_PRESENTAR: 'bg-slate-500/15 text-slate-400 border-slate-500/25',
  VENCIDO: 'bg-red-500/15 text-red-500 border-red-500/25',
  EN_PROGRESO: 'bg-blue-500/15 text-blue-500 border-blue-500/25',
  EN_REVISION: 'bg-purple-500/15 text-purple-500 border-purple-500/25',
};

const getEstadoLabel = (estado: string) => estadoLabel[estado] || estado;

const getEstadoBadge = (estado: string) => (
  <Badge variant="outline" className={estadoClass[estado] || ''}>
    {getEstadoLabel(estado)}
  </Badge>
);

const formatScore = (item: CertificadoEstudiosItem) => {
  if (item.puntaje_obtenido === null || item.puntaje_maximo === null) return '-';
  return `${item.puntaje_obtenido}/${item.puntaje_maximo}`;
};

const formatPercent = (value: number | null) => {
  if (value === null) return '-';
  return `${value.toFixed(1)}%`;
};

export function CertificadoEstudiosPreview({
  estudiante,
  cursilloNombre,
  items,
  promedioGeneral,
  fechaEmision,
}: CertificadoEstudiosPreviewProps) {
  const nombreEstudiante = estudiante
    ? `${estudiante.nombres} ${estudiante.apellidos}`.trim()
    : 'Estudiante';

  const cursos = Array.from(new Set(items.map((item) => item.curso_titulo)));

  return (
    <div className="bg-background border rounded-lg p-6 space-y-6">
      <div className="text-center space-y-2 border-b pb-6">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">Certificado de Estudios</p>
        <h2 className="text-2xl font-bold">{cursilloNombre}</h2>
        <p className="text-lg font-semibold">{nombreEstudiante}</p>
        <p className="text-sm text-muted-foreground">
          Emitido el {fechaEmision.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border rounded-md p-4">
          <p className="text-sm text-muted-foreground">Cursos incluidos</p>
          <p className="text-2xl font-bold">{cursos.length}</p>
        </div>
        <div className="border rounded-md p-4">
          <p className="text-sm text-muted-foreground">Actividades</p>
          <p className="text-2xl font-bold">{items.length}</p>
        </div>
        <div className="border rounded-md p-4">
          <p className="text-sm text-muted-foreground">Promedio general</p>
          <p className="text-2xl font-bold">
            {promedioGeneral !== null ? `${promedioGeneral.toFixed(1)}%` : '-'}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {cursos.map((curso) => {
          const itemsCurso = items.filter((item) => item.curso_titulo === curso);
          const promediables = itemsCurso.filter((item) => item.incluye_promedio && item.porcentaje !== null);
          const promedioCurso = promediables.length > 0
            ? promediables.reduce((acc, item) => acc + (item.porcentaje || 0), 0) / promediables.length
            : null;

          return (
            <div key={curso} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{curso}</h3>
                  <p className="text-sm text-muted-foreground">{itemsCurso[0]?.grupo_nombre || 'Sin grupo'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Promedio</p>
                  <p className="font-semibold">{promedioCurso !== null ? `${promedioCurso.toFixed(1)}%` : '-'}</p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Actividad</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Módulo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Puntaje</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemsCurso.map((item) => (
                    <TableRow key={`${item.tipo_actividad}-${item.id_actividad}`}>
                      <TableCell className="font-medium">{item.actividad_titulo}</TableCell>
                      <TableCell>{item.tipo_actividad === 'TAREA' ? 'Tarea' : 'Evaluación'}</TableCell>
                      <TableCell className="text-muted-foreground">{item.modulo_titulo}</TableCell>
                      <TableCell>{getEstadoBadge(item.estado)}</TableCell>
                      <TableCell>{formatDateForReport(item.fecha_resultado)}</TableCell>
                      <TableCell className="text-right">{formatScore(item)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatPercent(item.porcentaje)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
