import { Link } from 'react-router-dom';
import { BookOpen, User, Calendar, Users, Layers, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface CursoCardProps {
  curso: {
    id_curso: string;
    titulo: string;
    descripcion: string | null;
    es_publicado: boolean;
    requiere_password?: boolean;
    fecha_creacion: string;
    docente?: {
      nombres: string | null;
      apellidos: string | null;
    } | null;
    grupo?: {
      nombre: string | null;
      requiere_password?: boolean | null;
    } | null;
    _count?: {
      modulos: number;
      inscripciones: number;
    };
  };
  canEdit?: boolean;
  canViewDetails?: boolean;
  canEnroll?: boolean;
  isEnrolled?: boolean;
  onEnroll?: () => void;
  onUnenroll?: () => void;
  enrollLoading?: boolean;
}

const CursoCard = ({ 
  curso, 
  canEdit,
  canViewDetails = false,
  canEnroll = false,
  isEnrolled, 
  onEnroll, 
  onUnenroll,
  enrollLoading 
}: CursoCardProps) => {
  const docenteNombre = curso.docente 
    ? `${curso.docente.nombres || ''} ${curso.docente.apellidos || ''}`.trim() || 'Sin asignar'
    : 'Sin asignar';
  const requiresPassword = Boolean(curso.requiere_password || curso.grupo?.requiere_password);

  return (
    <Card className="hover:shadow-lg transition-shadow h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg line-clamp-2">{curso.titulo}</CardTitle>
          <Badge variant={curso.es_publicado ? 'default' : 'secondary'}>
            {curso.es_publicado ? 'Publicado' : 'Borrador'}
          </Badge>
        </div>
        {requiresPassword && (
          <Badge variant="outline" className="w-fit gap-1">
            <Lock className="h-3 w-3" />
            Con clave
          </Badge>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1">
          {curso.descripcion || 'Sin descripción'}
        </p>
        
        <div className="space-y-2 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>{docenteNombre}</span>
          </div>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            <span>{curso.grupo?.nombre || 'Sin grupo'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{new Date(curso.fecha_creacion).toLocaleDateString()}</span>
          </div>
          {canViewDetails && curso._count && (
            <>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                <span>{curso._count.modulos} módulos</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>{curso._count.inscripciones} inscritos</span>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 mt-auto">
          {canViewDetails && !canEdit && (
            <Link to={`/cursos/${curso.id_curso}`} className="flex-1">
              <Button variant="outline" className="w-full">
                Ver Detalles
              </Button>
            </Link>
          )}
          
          {canEnroll && curso.es_publicado && (
            isEnrolled ? (
              <Button 
                variant="destructive" 
                onClick={onUnenroll}
                disabled={enrollLoading}
              >
                Cancelar
              </Button>
            ) : (
              <Button 
                onClick={onEnroll}
                disabled={enrollLoading}
              >
                Inscribirse
              </Button>
            )
          )}
          
          {canEdit && (
            <Link to={`/cursos/${curso.id_curso}`}>
              <Button>Gestionar</Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CursoCard;
