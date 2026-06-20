import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgresoIndicadorProps {
  completada: boolean;
  className?: string;
}

const ProgresoIndicador = ({ completada, className }: ProgresoIndicadorProps) => {
  if (!completada) return null;

  return (
    <CheckCircle 
      className={cn("h-4 w-4 text-success flex-shrink-0", className)} 
    />
  );
};

export default ProgresoIndicador;
