import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { RendimientoPreguntaItem } from '@/hooks/useReportes';
import { LatexText } from '@/components/evaluaciones/LatexText';

interface GraficoRendimientoPreguntasProps {
  rendimiento: RendimientoPreguntaItem[];
}

const getDifficultyColor = (nivel: string) => {
  if (nivel === 'Facil') return '#22c55e';
  if (nivel === 'Media') return '#f59e0b';
  if (nivel === 'Dificil') return '#ef4444';
  return '#64748b';
};

const getDifficultyLabel = (nivel: string) => {
  if (nivel === 'Facil') return 'Fácil';
  if (nivel === 'Dificil') return 'Difícil';
  return nivel;
};

export function GraficoRendimientoPreguntas({ rendimiento }: GraficoRendimientoPreguntasProps) {
  const data = useMemo(() => {
    return rendimiento.map((item) => ({
      etiqueta: `P${item.numero_pregunta}`,
      pregunta: item.pregunta,
      aciertos: item.porcentaje_aciertos,
      errores: item.porcentaje_errores,
      nivel: item.nivel_dificultad,
      total: item.total_respuestas,
    }));
  }, [rendimiento]);

  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No hay preguntas para graficar
      </div>
    );
  }

  return (
    <div className="h-[360px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="etiqueta"
            tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 12 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 12 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                const color = getDifficultyColor(item.nivel);
                return (
                  <div className="bg-popover border border-border rounded-lg p-3 shadow-xl max-w-[280px]">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="font-semibold text-foreground">{item.etiqueta}</p>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: `${color}20`, color }}
                      >
                        {getDifficultyLabel(item.nivel)}
                      </span>
                    </div>
                    <LatexText className="block text-sm text-muted-foreground mb-3 [&>span.block]:my-1 [&>span.block]:py-0.5 [&_.katex-display]:my-0">
                      {item.pregunta}
                    </LatexText>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">% aciertos</span>
                        <span className="font-semibold" style={{ color }}>{item.aciertos.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">% errores</span>
                        <span className="font-semibold">{item.errores.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Respuestas</span>
                        <span className="font-semibold">{item.total}</span>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="aciertos" radius={[6, 6, 0, 0]} barSize={34} background={{ fill: 'rgba(255,255,255,0.03)', radius: 6 }}>
            {data.map((item) => (
              <Cell key={item.etiqueta} fill={getDifficultyColor(item.nivel)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
