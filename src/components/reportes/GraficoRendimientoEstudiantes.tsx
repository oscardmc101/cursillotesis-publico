import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { ParticipacionEstudiante } from '@/hooks/useReportes';
import { calcularPorcentaje } from '@/lib/exportUtils';

interface GraficoRendimientoEstudiantesProps {
  participacion: ParticipacionEstudiante[];
}

const getBarColor = (progreso: number) => {
  if (progreso >= 80) return '#22c55e'; // Green
  if (progreso >= 50) return '#3b82f6'; // Blue
  if (progreso >= 25) return '#f59e0b'; // Amber
  return '#ef4444'; // Red
};

const getBarLabel = (progreso: number) => {
  if (progreso >= 80) return 'Excelente';
  if (progreso >= 50) return 'Regular';
  if (progreso >= 25) return 'Bajo';
  return 'Crítico';
};

export function GraficoRendimientoEstudiantes({ participacion }: GraficoRendimientoEstudiantesProps) {
  const datosEstudiantes = useMemo(() => {
    return participacion.map(est => {
      const progresoTotal = calcularPorcentaje(
        est.lecciones_completadas + est.tareas_entregadas + est.evaluaciones_completadas,
        est.total_lecciones + est.total_tareas + est.total_evaluaciones
      );

      return {
        nombre: `${est.apellidos}, ${est.nombres}`.substring(0, 25),
        nombreCompleto: `${est.apellidos}, ${est.nombres}`,
        progreso: progresoTotal,
        lecciones: calcularPorcentaje(est.lecciones_completadas, est.total_lecciones),
        tareas: calcularPorcentaje(est.tareas_entregadas, est.total_tareas),
        evaluaciones: calcularPorcentaje(est.evaluaciones_completadas, est.total_evaluaciones)
      };
    }).sort((a, b) => b.progreso - a.progreso);
  }, [participacion]);

  if (datosEstudiantes.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No hay estudiantes inscritos
      </div>
    );
  }

  // Mostrar máximo 10 estudiantes en el gráfico
  const datosVisibles = datosEstudiantes.slice(0, 10);
  const hayMas = datosEstudiantes.length > 10;

  return (
    <div className="w-full">
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={datosVisibles}
            layout="vertical"
            margin={{ top: 5, right: 50, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(255,255,255,0.06)" />
            <XAxis 
              type="number" 
              domain={[0, 100]} 
              tickFormatter={(value) => `${value}%`}
              tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 12 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            />
            <YAxis 
              type="category" 
              dataKey="nombre" 
              width={150}
              tick={{ fontSize: 11, fill: 'hsl(210, 40%, 98%)' }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  const barColor = getBarColor(data.progreso);
                  const label = getBarLabel(data.progreso);
                  return (
                    <div className="bg-popover border border-border rounded-lg p-3 shadow-xl min-w-[200px]">
                      <p className="font-semibold text-foreground mb-1">{data.nombreCompleto}</p>
                      <div className="flex items-center gap-2 mb-3">
                        <span 
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: `${barColor}20`, color: barColor }}
                        >
                          {label}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progreso total</span>
                          <span className="font-bold" style={{ color: barColor }}>{data.progreso}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div 
                            className="h-full rounded-full" 
                            style={{ width: `${data.progreso}%`, backgroundColor: barColor }}
                          />
                        </div>
                      </div>
                      <div className="mt-3 pt-2 border-t border-border space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">📚 Lecciones</span>
                          <span className="text-foreground font-medium">{data.lecciones}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">📋 Tareas</span>
                          <span className="text-foreground font-medium">{data.tareas}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">📝 Evaluaciones</span>
                          <span className="text-foreground font-medium">{data.evaluaciones}%</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="progreso" radius={[0, 6, 6, 0]} barSize={24} background={{ fill: 'rgba(255,255,255,0.03)', radius: 6 }}>
              {datosVisibles.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.progreso)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Color legend */}
      <div className="flex justify-center gap-4 mt-3 flex-wrap">
        {[
          { label: 'Excelente (≥80%)', color: '#22c55e' },
          { label: 'Regular (≥50%)', color: '#3b82f6' },
          { label: 'Bajo (≥25%)', color: '#f59e0b' },
          { label: 'Crítico (<25%)', color: '#ef4444' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
            {item.label}
          </div>
        ))}
      </div>
      {hayMas && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          Mostrando top 10 de {datosEstudiantes.length} estudiantes — ver tabla completa abajo
        </p>
      )}
    </div>
  );
}
