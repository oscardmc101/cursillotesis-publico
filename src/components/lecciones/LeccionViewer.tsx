import { useEffect, useState } from 'react';
import { FileText, Video, File, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import YouTubePlayer from './YoutubePlayer';
import {
  CONTENIDO_LECCIONES_BUCKET,
  createSignedStorageUrl,
  downloadStorageFile,
} from '@/lib/storageFiles';

interface Leccion {
  id_leccion: string;
  titulo: string;
  tipo_contenido: string;
  contenido_texto?: string | null;
  url_contenido?: string | null;
  orden: number;
  es_publicada: boolean;
}

interface LeccionViewerProps {
  leccion: Leccion;
}

const LeccionViewer = ({ leccion }: LeccionViewerProps) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(false);

  useEffect(() => {
    let active = true;

    const loadPdfUrl = async () => {
      if (leccion.tipo_contenido !== 'PDF' || !leccion.url_contenido) {
        setPdfUrl(null);
        setPdfError(false);
        return;
      }

      setPdfLoading(true);
      setPdfError(false);
      try {
        const signedUrl = await createSignedStorageUrl(
          leccion.url_contenido,
          CONTENIDO_LECCIONES_BUCKET
        );
        if (active) setPdfUrl(signedUrl);
      } catch (error) {
        console.error('Error creating signed PDF URL:', error);
        if (active) setPdfError(true);
      } finally {
        if (active) setPdfLoading(false);
      }
    };

    loadPdfUrl();

    return () => {
      active = false;
    };
  }, [leccion.tipo_contenido, leccion.url_contenido]);

  const extractYoutubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const renderContent = () => {
    switch (leccion.tipo_contenido) {
      case 'TEXTO':
        return (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {leccion.contenido_texto ? (
              <div className="whitespace-pre-wrap">{leccion.contenido_texto}</div>
            ) : (
              <p className="text-muted-foreground italic">Sin contenido</p>
            )}
          </div>
        );

      case 'PDF':
        if (!leccion.url_contenido) {
          return <p className="text-muted-foreground italic">PDF no disponible</p>;
        }
        if (pdfLoading) {
          return (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          );
        }
        if (pdfError || !pdfUrl) {
          return <p className="text-muted-foreground italic">No se pudo cargar el PDF</p>;
        }
        return (
          <div className="space-y-4">
            <iframe
              src={`${pdfUrl}#toolbar=1`}
              className="w-full h-[600px] rounded-lg border"
              title={leccion.titulo}
            />
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => downloadStorageFile(
                  leccion.url_contenido!,
                  CONTENIDO_LECCIONES_BUCKET,
                  `${leccion.titulo}.pdf`
                )}
              >
                <File className="h-4 w-4 mr-2" />
                Descargar PDF
              </Button>
            </div>
          </div>
        );

      case 'VIDEO': {
        const videoId = leccion.url_contenido ? extractYoutubeId(leccion.url_contenido) : null;
        if (!videoId) {
          return <p className="text-muted-foreground italic">Video no disponible</p>;
        }
        return <YouTubePlayer videoId={videoId} title={leccion.titulo} />;
      }

      default:
        return <p className="text-muted-foreground">Tipo de contenido no soportado</p>;
    }
  };

  const getTypeIcon = () => {
    switch (leccion.tipo_contenido) {
      case 'TEXTO':
        return <FileText className="h-5 w-5" />;
      case 'PDF':
        return <File className="h-5 w-5" />;
      case 'VIDEO':
        return <Video className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            {getTypeIcon()}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">{leccion.titulo}</h2>
            <Badge variant="secondary" className="mt-1">
              {leccion.tipo_contenido}
            </Badge>
          </div>
        </div>
        {renderContent()}
      </CardContent>
    </Card>
  );
};

export default LeccionViewer;
