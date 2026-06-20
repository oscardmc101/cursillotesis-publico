import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileText, Download, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Entrega, ArchivoEntrega } from '@/hooks/useTareas';

interface CalificarEntregaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entrega: Entrega | null;
  onSuccess?: () => void;
}

const CalificarEntregaDialog = ({
  open,
  onOpenChange,
  entrega,
  onSuccess,
}: CalificarEntregaDialogProps) => {
  const [calificacion, setCalificacion] = useState<string>('');
  const [comentario, setComentario] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && entrega) {
      setCalificacion(entrega.calificacion?.toString() || '');
      setComentario(entrega.comentario_docente || '');
    }
  }, [open, entrega]);

  const handleDownloadFile = async (archivo: ArchivoEntrega) => {
    try {
      const { data, error } = await supabase.storage
        .from(archivo.bucket)
        .download(archivo.ruta_storage);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = archivo.nombre_archivo || 'archivo';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const handleSubmit = async () => {
    if (!entrega) return;

    const cal = parseFloat(calificacion);
    if (isNaN(cal) || cal < 0 || cal > 100) {
      toast({
        title: 'Error',
        description: 'La calificación debe ser un número entre 0 y 100',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('entregas_tareas')
        .update({
          calificacion: cal,
          comentario_docente: comentario.trim() || null,
          estado: 'CALIFICADO',
        })
        .eq('id_entrega', entrega.id_entrega);

      if (error) throw error;

      toast({ title: 'Calificación guardada correctamente' });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error saving calificacion:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la calificación',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!entrega) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Calificar entrega</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Student info */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">
              {entrega.usuario?.nombres} {entrega.usuario?.apellidos}
            </p>
            <p className="text-sm text-muted-foreground">{entrega.usuario?.correo}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Enviado: {format(new Date(entrega.fecha_entrega), "d 'de' MMMM 'a las' HH:mm", { locale: es })}
            </p>
          </div>

          {/* Student comment */}
          {entrega.comentario_estudiante && (
            <div>
              <Label className="text-sm font-medium">Comentario del estudiante:</Label>
              <p className="text-sm text-muted-foreground mt-1 p-2 bg-muted rounded whitespace-pre-wrap">
                {entrega.comentario_estudiante}
              </p>
            </div>
          )}

          {/* Files */}
          {entrega.archivos && entrega.archivos.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Archivos adjuntos:</Label>
              <div className="mt-2 space-y-2">
                {entrega.archivos.map((archivo) => (
                  <button
                    key={archivo.id_archivo}
                    onClick={() => handleDownloadFile(archivo)}
                    className="flex items-center gap-2 w-full p-2 bg-muted rounded hover:bg-muted/80 transition-colors text-left"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate flex-1">{archivo.nombre_archivo}</span>
                    <Download className="h-4 w-4 text-primary shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Grading form */}
          <div className="space-y-4 pt-4 border-t">
            <div>
              <Label htmlFor="calificacion">Calificación (0-100) *</Label>
              <Input
                id="calificacion"
                type="number"
                min={0}
                max={100}
                value={calificacion}
                onChange={(e) => setCalificacion(e.target.value)}
                placeholder="Ej: 85"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="comentario">Retroalimentación (opcional)</Label>
              <Textarea
                id="comentario"
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Comentarios para el estudiante..."
                className="mt-1 min-h-[100px]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving || !calificacion}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar calificación'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CalificarEntregaDialog;
