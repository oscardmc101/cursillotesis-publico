import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Upload, Trash2, FileText, Loader2, Send, CheckCircle, Clock, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentUsuario } from '@/hooks/useCurrentUsuario';
import { useMiEntrega, useContarEntregas, type Tarea, type ArchivoEntrega } from '@/hooks/useTareas';
import { toast } from '@/hooks/use-toast';

interface EntregaTareaFormProps {
  tarea: Tarea;
  onSuccess?: () => void;
}

const EntregaTareaForm = ({ tarea, onSuccess }: EntregaTareaFormProps) => {
  const { user } = useAuth();
  const { idUsuario } = useCurrentUsuario();
  const { entrega, loading: entregaLoading, refetch: refetchEntrega } = useMiEntrega(tarea.id_tarea);
  const { count: entregasCount, loading: countLoading } = useContarEntregas(tarea.id_tarea);

  const [comentario, setComentario] = useState('');
  const [archivos, setArchivos] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = !entrega || 
    (tarea.permite_reintentos && 
     entregasCount < tarea.max_reintentos && 
     entrega.estado !== 'ENVIADO');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    // Max 5 files, 10MB each
    const validFiles = files.filter(f => f.size <= 10 * 1024 * 1024).slice(0, 5);
    if (validFiles.length < files.length) {
      toast({
        title: 'Algunos archivos fueron ignorados',
        description: 'Máximo 5 archivos de 10MB cada uno',
        variant: 'destructive',
      });
    }
    setArchivos(prev => [...prev, ...validFiles].slice(0, 5));
  };

  const removeFile = (index: number) => {
    setArchivos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!idUsuario || !user) return;

    setUploading(true);
    try {
      // Create entrega
      const { data: nuevaEntrega, error: entregaError } = await supabase
        .from('entregas_tareas')
        .insert({
          id_tarea: tarea.id_tarea,
          id_usuario: idUsuario,
          comentario_estudiante: comentario.trim() || null,
          estado: 'ENVIADO',
        })
        .select()
        .single();

      if (entregaError) throw entregaError;

      // Upload files
      for (const archivo of archivos) {
        const ext = archivo.name.split('.').pop();
        const secureId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
        const path = `${user.id}/${nuevaEntrega.id_entrega}/${secureId}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('archivos_tareas')
          .upload(path, archivo);

        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          continue;
        }

        // Save file reference
        await supabase.from('archivos_entregas_tareas').insert({
          id_entrega: nuevaEntrega.id_entrega,
          ruta_storage: path,
          nombre_archivo: archivo.name,
          tipo_mime: archivo.type,
          tamano_bytes: archivo.size,
        });
      }

      toast({ title: 'Tarea enviada correctamente' });
      setComentario('');
      setArchivos([]);
      refetchEntrega();
      onSuccess?.();
    } catch (error) {
      console.error('Error submitting tarea:', error);
      toast({
        title: 'Error',
        description: 'No se pudo enviar la tarea',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDescargarRetroalimentacion = async (ruta: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('archivos_tareas')
        .download(ruta);
      
      if (error) throw error;
      
      const fileName = ruta.split('/').pop() || 'retroalimentacion';
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading retroalimentacion:', error);
      toast({
        title: 'Error',
        description: 'No se pudo descargar el archivo de retroalimentación.',
        variant: 'destructive',
      });
    }
  };

  if (entregaLoading || countLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Show existing entrega status
  if (entrega && !canSubmit) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Tu entrega
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant={entrega.estado === 'CALIFICADO' ? 'default' : 'secondary'}>
              {entrega.estado === 'CALIFICADO' ? 'Calificado' : 
               entrega.estado === 'ENVIADO' ? 'Enviado' : entrega.estado}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {format(new Date(entrega.fecha_entrega), "d 'de' MMMM 'a las' HH:mm", { locale: es })}
            </span>
          </div>

          {entrega.comentario_estudiante && (
            <div>
              <p className="text-sm font-medium mb-1">Tu comentario:</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {entrega.comentario_estudiante}
              </p>
            </div>
          )}

          {entrega.archivos && entrega.archivos.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Archivos adjuntos:</p>
              <div className="space-y-1">
                {entrega.archivos.map((archivo: ArchivoEntrega) => (
                  <div key={archivo.id_archivo} className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{archivo.nombre_archivo}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {entrega.estado === 'CALIFICADO' && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium">Calificación:</span>
                <Badge variant="default" className="text-lg px-3">
                  {entrega.calificacion ?? '-'}
                </Badge>
              </div>
              {entrega.comentario_docente && (
                <div className="mb-3">
                  <p className="text-sm font-medium mb-1">Retroalimentación:</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {entrega.comentario_docente}
                  </p>
                </div>
              )}
              {entrega.retroalimentacion_archivo_url && (
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    onClick={() => handleDescargarRetroalimentacion(entrega.retroalimentacion_archivo_url!)}
                  >
                    <Download className="h-4 w-4" />
                    Descargar archivo de retroalimentación
                  </Button>
                </div>
              )}
            </div>
          )}

          {entrega.estado === 'ENVIADO' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Esperando calificación del docente</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>{entrega ? 'Nuevo intento' : 'Entregar tarea'}</span>
          {tarea.permite_reintentos && (
            <span className="text-sm font-normal text-muted-foreground">
              Intento {entregasCount + 1} de {tarea.max_reintentos}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">
            Comentario (opcional)
          </label>
          <Textarea
            placeholder="Agrega un comentario sobre tu entrega..."
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            className="min-h-[100px]"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            Archivos adjuntos
          </label>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={archivos.length >= 5}
          >
            <Upload className="h-4 w-4 mr-2" />
            Seleccionar archivos
          </Button>
          <p className="text-xs text-muted-foreground mt-1">
            Máximo 5 archivos, 10MB cada uno
          </p>

          {archivos.length > 0 && (
            <div className="mt-3 space-y-2">
              {archivos.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-muted rounded"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(file.size / 1024).toFixed(0)} KB)
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Enviar tarea
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default EntregaTareaForm;
