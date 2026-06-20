import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { ParticipacionEstudiante } from '@/hooks/useReportes';

interface GraficoParticipacionProps {
  participacion: ParticipacionEstudiante[];
}

const COLORS = {
  aTimepo: '#22c55e',  // Green
  tarde: '#f59e0b',     // Amber
  sinEntregar: '#ef4444' // Red
};

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: {
  cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; percent: number; name: string;
}) => {
  if (percent < 0.05) return null; // Don't label tiny slices
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function GraficoParticipacion({ participacion }: GraficoParticipacionProps) {
  const datosEntregas = useMemo(() => {
    if (participacion.length === 0) return [];

    let aTimepo = 0;
    let tarde = 0;
    let sinEntregar = 0;

    participacion.forEach(est => {
      aTimepo += est.tareas_a_tiempo;
      tarde += est.tareas_entregadas - est.tareas_a_tiempo;
      sinEntregar += est.total_tareas - est.tareas_entregadas;
    });

    return [
      { name: 'A tiempo', value: aTimepo, color: COLORS.aTimepo },
      { name: 'Tarde', value: tarde, color: COLORS.tarde },
      { name: 'Sin entregar', value: sinEntregar, color: COLORS.sinEntregar }
    ].filter(item => item.value > 0);
  }, [participacion]);

  if (datosEntregas.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No hay datos de entregas disponibles
      </div>
    );
  }

  const total = datosEntregas.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={datosEntregas}
            cx="50%"
            cy="45%"
            innerRadius={65}
            outerRadius={110}
            paddingAngle={4}
            dataKey="value"
            label={renderCustomLabel}
            labelLine={false}
            stroke="rgba(0,0,0,0.1)"
            strokeWidth={2}
          >
            {datosEntregas.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                const pct = ((data.value / total) * 100).toFixed(1);
                return (
                  <div className="bg-popover border border-border rounded-lg p-3 shadow-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }} />
                      <span className="font-semibold text-foreground">{data.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {data.value} entregas ({pct}%)
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            verticalAlign="bottom"
            content={() => (
              <div className="flex justify-center gap-5 mt-2">
                {datosEntregas.map((entry, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-sm">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-foreground">{entry.name}</span>
                    <span className="text-muted-foreground font-medium">({entry.value})</span>
                  </div>
                ))}
              </div>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
