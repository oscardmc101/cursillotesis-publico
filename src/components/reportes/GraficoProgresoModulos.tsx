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
import { ProgresoEstudianteItem } from '@/hooks/useReportes';
import { calcularPorcentaje } from '@/lib/exportUtils';

interface GraficoProgresoModulosProps {
  progreso: ProgresoEstudianteItem[];
}

const getBarColor = (progreso: number) => {
  if (progreso >= 80) return '#22c55e'; // Green
  if (progreso >= 50) return '#3b82f6'; // Blue
  if (progreso >= 25) return '#f59e0b'; // Amber
  return '#ef4444'; // Red
};

const getBarBgColor = (progreso: number) => {
  if (progreso >= 80) return 'rgba(34,197,94,0.1)';
  if (progreso >= 50) return 'rgba(59,130,246,0.1)';
  if (progreso >= 25) return 'rgba(245,158,11,0.1)';
  return 'rgba(239,68,68,0.1)';
};

export function GraficoProgresoModulos({ progreso }: GraficoProgresoModulosProps) {
  const datosModulos = useMemo(() => {
    const modulos = new Map<string, { total: number; completadas: number; lecciones: number; tareas: number; evaluaciones: number }>();

    // Agrupar TODAS las actividades por módulo (lecciones + tareas + evaluaciones)
    progreso.forEach(item => {
      const current = modulos.get(item.modulo) || { total: 0, completadas: 0, lecciones: 0, tareas: 0, evaluaciones: 0 };
      current.total++;

      const isCompletada =
        (item.tipo === 'LECCION' && item.estado === 'COMPLETADA') ||
        (item.tipo === 'TAREA' && item.estado !== 'SIN_ENTREGAR') ||
        (item.tipo === 'EVALUACION' && item.estado !== 'SIN_INTENTAR');

      if (isCompletada) current.completadas++;
      if (item.tipo === 'LECCION') current.lecciones++;
      if (item.tipo === 'TAREA') current.tareas++;
      if (item.tipo === 'EVALUACION') current.evaluaciones++;

      modulos.set(item.modulo, current);
    });

    return Array.from(modulos.entries()).map(([nombre, datos]) => ({
      nombre: nombre.length > 20 ? nombre.substring(0, 20) + '...' : nombre,
      nombreCompleto: nombre,
      progreso: calcularPorcentaje(datos.completadas, datos.total),
      completadas: datos.completadas,
      total: datos.total,
      lecciones: datos.lecciones,
      tareas: datos.tareas,
      evaluaciones: datos.evaluaciones,
    }));
  }, [progreso]);

  if (datosModulos.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No hay datos de progreso disponibles
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={datosModulos}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
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
            tick={{ fontSize: 12, fill: 'hsl(210, 40%, 98%)' }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                const barColor = getBarColor(data.progreso);
                return (
                  <div className="bg-popover border border-border rounded-lg p-3 shadow-xl">
                    <p className="font-semibold text-foreground mb-2">{data.nombreCompleto}</p>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all" 
                          style={{ width: `${data.progreso}%`, backgroundColor: barColor }}
                        />
                      </div>
                      <span className="font-bold text-sm" style={{ color: barColor }}>{data.progreso}%</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Completadas: <span className="text-foreground font-medium">{data.completadas}/{data.total}</span>
                    </p>
                    <div className="mt-2 pt-2 border-t border-border space-y-0.5 text-xs text-muted-foreground">
                      <p>📚 Lecciones: {data.lecciones}</p>
                      <p>📋 Tareas: {data.tareas}</p>
                      <p>📝 Evaluaciones: {data.evaluaciones}</p>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="progreso" radius={[0, 6, 6, 0]} barSize={28} background={{ fill: 'rgba(255,255,255,0.03)', radius: 6 }}>
            {datosModulos.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.progreso)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
