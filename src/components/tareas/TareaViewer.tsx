import { format, formatDistanceToNow, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Clock, RefreshCw, CheckCircle, AlertCircle, Hourglass } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Tarea } from '@/hooks/useTareas';

interface TareaViewerProps {
  tarea: Tarea;
}

const TareaViewer = ({ tarea }: TareaViewerProps) => {
  const fechaLimite = tarea.fecha_limite ? new Date(tarea.fecha_limite) : null;
  const isOverdue = fechaLimite && isPast(fechaLimite);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-start justify-between gap-4">
          <span>{tarea.titulo}</span>
          {fechaLimite && (
            <Badge variant={isOverdue ? 'destructive' : 'secondary'} className="shrink-0">
              {isOverdue ? (
                <>
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Vencida
                </>
              ) : (
                <>
                  <Hourglass className="h-3 w-3 mr-1" />
                  {formatDistanceToNow(fechaLimite, { addSuffix: true, locale: es })}
                </>
              )}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {tarea.descripcion && (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <p className="whitespace-pre-wrap">{tarea.descripcion}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {fechaLimite && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>
                Fecha límite: {format(fechaLimite, "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
              </span>
            </div>
          )}
          
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>
              Creada: {format(new Date(tarea.fecha_creacion), "d 'de' MMMM 'de' yyyy", { locale: es })}
            </span>
          </div>

          {tarea.permite_reintentos && (
            <div className="flex items-center gap-1.5">
              <RefreshCw className="h-4 w-4" />
              <span>
                Hasta {tarea.max_reintentos} {tarea.max_reintentos === 1 ? 'intento' : 'intentos'}
              </span>
            </div>
          )}

          {!tarea.permite_reintentos && (
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4" />
              <span>Un solo intento</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TareaViewer;
