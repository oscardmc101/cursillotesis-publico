import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { CertificadoPreview } from './CertificadoPreview';
import { downloadCertificatePDF, CertificadoData } from '@/lib/certificateUtils';
import { Download, Loader2, Award } from 'lucide-react';

interface CertificadoViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idCurso: string;
  tituloCurso: string;
  nombreEstudiante: string;
  fechaFinalizacion?: Date;
}

export const CertificadoViewer = ({
  open,
  onOpenChange,
  idCurso,
  tituloCurso,
  nombreEstudiante,
  fechaFinalizacion = new Date()
}: CertificadoViewerProps) => {
  const [loading, setLoading] = useState(true);
  const [certificadoData, setCertificadoData] = useState<CertificadoData | null>(null);

  useEffect(() => {
    if (open && idCurso) {
      fetchCertificadoConfig();
    }
  }, [open, idCurso]);

  const fetchCertificadoConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('certificados_curso')
        .select('*')
        .eq('id_curso', idCurso)
        .maybeSingle();

      if (error) throw error;

      const config = data || {};

      setCertificadoData({
        nombreEstudiante,
        tituloCurso,
        fechaFinalizacion,
        plantilla: (config.plantilla as 'clasico' | 'moderno' | 'profesional') || 'clasico',
        tituloCertificado: config.titulo_certificado || 'Certificado de Finalización',
        textoDescripcion: config.texto_descripcion || 'Por haber completado satisfactoriamente el curso',
        firmaNombre: config.firma_nombre || '',
        firmaCargo: config.firma_cargo || '',
        mostrarFecha: config.mostrar_fecha ?? true,
        mostrarLogo: config.mostrar_logo ?? true,
        colorPrimario: config.color_primario || '#3B82F6',
        colorSecundario: config.color_secundario || '#14B8A6'
      });
    } catch (error) {
      console.error('Error fetching certificate config:', error);
      // Use default values on error
      setCertificadoData({
        nombreEstudiante,
        tituloCurso,
        fechaFinalizacion,
        plantilla: 'clasico',
        tituloCertificado: 'Certificado de Finalización',
        textoDescripcion: 'Por haber completado satisfactoriamente el curso',
        firmaNombre: '',
        firmaCargo: '',
        mostrarFecha: true,
        mostrarLogo: true,
        colorPrimario: '#3B82F6',
        colorSecundario: '#14B8A6'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (certificadoData) {
      downloadCertificatePDF(certificadoData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Tu Certificado
          </DialogTitle>
          <DialogDescription>
            ¡Felicitaciones por completar el curso! Descarga tu certificado a continuación.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : certificadoData ? (
          <div className="space-y-4">
            <div className="bg-muted/30 rounded-lg p-6 flex items-center justify-center overflow-hidden">
              <CertificadoPreview data={certificadoData} scale={0.45} />
            </div>

            <div className="flex justify-center">
              <Button onClick={handleDownload} size="lg" className="gap-2">
                <Download className="h-4 w-4" />
                Descargar Certificado (PDF)
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              El certificado se abrirá en una nueva ventana para imprimir o guardar como PDF.
            </p>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No se pudo cargar la configuración del certificado
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
