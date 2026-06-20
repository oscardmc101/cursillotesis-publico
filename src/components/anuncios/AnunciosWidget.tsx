import { Link } from 'react-router-dom';
import { Megaphone, ArrowRight, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAnunciosRecientes, useAnunciosRealtime } from '@/hooks/useAnuncios';
import { useUserRole } from '@/contexts/UserRoleContext';

const AnunciosWidget = () => {
  const { data: anuncios = [], isLoading } = useAnunciosRecientes(5);
  const { isPendiente, loading: roleLoading } = useUserRole();
  
  // Enable realtime updates
  useAnunciosRealtime();

  if (isLoading || roleLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Anuncios Recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </CardContent>
      </Card>
    );
  }

  // Show special message for pending users
  if (isPendiente) {
    return (
      <Card className="border-warning/30 bg-warning/5">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-warning" />
            Anuncios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center text-center space-y-3 py-4">
            <div className="p-3 rounded-full bg-warning/20">
              <Clock className="h-8 w-8 text-warning" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold">¡Bienvenido/a a la plataforma!</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Gracias por registrarte. Tu cuenta está en proceso de revisión. 
                En unos momentos serás aprobado/a y podrás acceder a todos los contenidos.
              </p>
            </div>
            <Badge variant="outline" className="border-warning/50 text-warning">
              Pendiente de aprobación
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          Anuncios Recientes
          {anuncios.length > 0 && (
            <Badge variant="secondary">{anuncios.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {anuncios.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay anuncios recientes
          </p>
        ) : (
          <div className="space-y-3">
            {anuncios.map((anuncio) => (
              <div
                key={anuncio.id_anuncio}
                className="p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <p className="font-medium text-sm line-clamp-1">
                  {anuncio.titulo}
                </p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {anuncio.contenido}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {anuncio.curso && (
                    <Badge variant="outline" className="text-xs">
                      {anuncio.curso.titulo}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(anuncio.fecha_publicacion), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </span>
                </div>
              </div>
            ))}
            <Link to="/anuncios" className="block mt-2">
              <Button variant="ghost" size="sm" className="w-full justify-between">
                Ver todos
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AnunciosWidget;
