import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MoreVertical, Pencil, Trash2, Megaphone, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Anuncio } from '@/hooks/useAnuncios';

interface AnuncioCardProps {
  anuncio: Anuncio;
  canEdit?: boolean;
  canDelete?: boolean;
  onEdit?: (anuncio: Anuncio) => void;
  onDelete?: (id: string) => void;
}

const AnuncioCard = ({ 
  anuncio, 
  canEdit = false, 
  canDelete = false, 
  onEdit, 
  onDelete 
}: AnuncioCardProps) => {
  const showActions = canEdit || canDelete;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Megaphone className="h-5 w-5 text-primary shrink-0" />
            <CardTitle className="text-base truncate">{anuncio.titulo}</CardTitle>
          </div>
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit && (
                  <DropdownMenuItem onClick={() => onEdit?.(anuncio)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem 
                    onClick={() => onDelete?.(anuncio.id_anuncio)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          {anuncio.curso ? (
            <Badge variant="outline" className="text-xs">
              {anuncio.curso.titulo}
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">
              <Globe className="h-3 w-3 mr-1" />
              Global
            </Badge>
          )}
          <span>•</span>
          <span>{format(new Date(anuncio.fecha_publicacion), "dd MMM yyyy, HH:mm", { locale: es })}</span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {anuncio.contenido}
        </p>
        {anuncio.creador && (
          <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
            Publicado por: {anuncio.creador.nombres} {anuncio.creador.apellidos}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default AnuncioCard;
