import { Progress } from '@/components/ui/progress';

interface ProgresoBarraCursoProps {
  completadas: number;
  total: number;
  showLabel?: boolean;
  className?: string;
}

const ProgresoBarraCurso = ({ 
  completadas, 
  total, 
  showLabel = true,
  className 
}: ProgresoBarraCursoProps) => {
  const porcentaje = total > 0 ? Math.round((completadas / total) * 100) : 0;

  return (
    <div className={className}>
      {showLabel && (
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>{completadas} de {total} lecciones</span>
          <span>{porcentaje}%</span>
        </div>
      )}
      <Progress value={porcentaje} className="h-2" />
    </div>
  );
};

export default ProgresoBarraCurso;
