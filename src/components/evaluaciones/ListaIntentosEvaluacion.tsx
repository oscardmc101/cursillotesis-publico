import { Loader2, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useIntentosEvaluacion } from '@/hooks/useEvaluaciones';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ListaIntentosEvaluacionProps {
  idEvaluacion: string;
  puntajeTotal: number;
}

export function ListaIntentosEvaluacion({ idEvaluacion, puntajeTotal }: ListaIntentosEvaluacionProps) {
  const { intentos, loading } = useIntentosEvaluacion(idEvaluacion);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          Intentos de Estudiantes
          <Badge variant="secondary">{intentos.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {intentos.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Ningún estudiante ha realizado esta evaluación aún.
          </p>
        ) : (
          <div className="space-y-2">
            {intentos.map((intento) => {
              const porcentaje = puntajeTotal > 0 
                ? Math.round((Number(intento.puntaje_obtenido) / puntajeTotal) * 100) 
                : 0;
              const aprobado = porcentaje >= 60;

              return (
                <div
                  key={intento.id_intento}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">
                      {intento.usuario?.nombres} {intento.usuario?.apellidos}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(intento.fecha_inicio), 'dd MMM yyyy, HH:mm', { locale: es })}
                    </p>
                  </div>
                  <div className="text-right">
                    {intento.estado === 'EN_PROGRESO' ? (
                      <Badge variant="outline" className="bg-muted">En progreso</Badge>
                    ) : intento.estado === 'COMPLETADO' ? (
                      <div className="space-y-1">
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
                          Completado
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {intento.puntaje_obtenido} / {puntajeTotal} pts (parcial)
                        </p>
                      </div>
                    ) : intento.estado === 'RECLAMADO' ? (
                      <div className="space-y-1">
                        <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30">
                          Con reclamo
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {intento.puntaje_obtenido} / {puntajeTotal} pts
                        </p>
                      </div>
                    ) : intento.estado === 'CORREGIDO' ? (
                      <div className="space-y-1">
                        <Badge className="bg-green-500 text-white hover:bg-green-600">
                          Corregido
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {intento.puntaje_obtenido} / {puntajeTotal} pts ({porcentaje}%)
                        </p>
                      </div>
                    ) : intento.estado === 'AUTOCORREGIDO' ? (
                      <div className="space-y-1">
                        <Badge variant={aprobado ? 'default' : 'secondary'}>
                          {intento.puntaje_obtenido} / {puntajeTotal} pts
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {porcentaje}%
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
