import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  Loader2,
  Download,
  FileText,
  Save,
  File,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUsuario } from '@/hooks/useCurrentUsuario';

interface EntregaDetalle {
  id_entrega: string;
  id_tarea: string;
  id_usuario: string;
  comentario_estudiante: string | null;
  estado: string;
  calificacion: number | null;
  comentario_docente: string | null;
  fecha_entrega: string;
  retroalimentacion_archivo_url: string | null;
  fecha_correccion: string | null;
}

interface TareaInfo {
  id_tarea: string;
  titulo: string;
  descripcion: string | null;
  puntaje_maximo: number;
}

interface UsuarioInfo {
  id_usuario: string;
  nombres: string;
  apellidos: string;
  correo: string;
}

interface ArchivoEntrega {
  id_archivo: string;
  nombre_archivo: string;
  tipo_mime: string | null;
  tamano_bytes: number | null;
  ruta_storage: string;
  bucket: string;
}

const CorreccionTarea = () => {
  const { idEntrega } = useParams<{ idEntrega: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { idUsuario: idDocente } = useCurrentUsuario();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [entrega, setEntrega] = useState<EntregaDetalle | null>(null);
  const [tarea, setTarea] = useState<TareaInfo | null>(null);
  const [estudiante, setEstudiante] = useState<UsuarioInfo | null>(null);
  const [archivos, setArchivos] = useState<ArchivoEntrega[]>([]);
  const [calificacion, setCalificacion] = useState<number>(0);
  const [comentarioDocente, setComentarioDocente] = useState('');
  const [archivoRetro, setArchivoRetro] = useState<File | null>(null);

  const yaCorregido = entrega?.estado === 'CALIFICADO';

  useEffect(() => {
    const fetchData = async () => {
      if (!idEntrega) return;
      try {
        // 1. Fetch entrega
        const { data: entregaData, error: entregaErr } = await supabase
          .from('entregas_tareas')
          .select('*')
          .eq('id_entrega', idEntrega)
          .single();
        if (entregaErr) throw entregaErr;
        setEntrega(entregaData);
        setCalificacion(entregaData.calificacion != null ? Number(entregaData.calificacion) : 0);
        setComentarioDocente(entregaData.comentario_docente || '');

        // 2. Fetch tarea
        const { data: tareaData } = await supabase
          .from('tareas')
          .select('id_tarea, titulo, descripcion, puntaje_maximo')
          .eq('id_tarea', entregaData.id_tarea)
          .single();
        setTarea(tareaData);

        // 3. Fetch estudiante
        const { data: userData } = await supabase
          .from('usuarios')
          .select('id_usuario, nombres, apellidos, correo')
          .eq('id_usuario', entregaData.id_usuario)
          .single();
        setEstudiante(userData);

        // 4. Fetch archivos de la entrega
        const { data: archivosData } = await supabase
          .from('archivos_entregas_tareas')
          .select('*')
          .eq('id_entrega', idEntrega);
        setArchivos(archivosData || []);
      } catch (error: any) {
        console.error('Error loading task correction data:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los datos de la entrega.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [idEntrega]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'Archivo muy grande',
        description: 'El archivo no debe superar los 10 MB.',
        variant: 'destructive',
      });
      return;
    }
    setArchivoRetro(file);
  };

  const handleDescargar = async (archivo: ArchivoEntrega) => {
    try {
      const { data, error } = await supabase.storage
        .from(archivo.bucket)
        .download(archivo.ruta_storage);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = archivo.nombre_archivo;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'No se pudo descargar el archivo.',
        variant: 'destructive',
      });
    }
  };

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleGuardar = async () => {
    if (!entrega || !idDocente || !tarea) return;
    const puntajeMax = tarea.puntaje_maximo ?? 100;
    if (calificacion < 0 || calificacion > puntajeMax) {
      toast({
        title: 'Calificación inválida',
        description: `La calificación debe estar entre 0 y ${puntajeMax}.`,
        variant: 'destructive',
      });
      return;
    }
    const porcentaje = puntajeMax > 0 ? Math.round((calificacion / puntajeMax) * 100) : 0;
    setSaving(true);
    try {
      // 1. Upload retroalimentacion file if any
      let archivoUrl: string | null = entrega.retroalimentacion_archivo_url;
      if (archivoRetro) {
        const ext = archivoRetro.name.split('.').pop();
        const path = `retroalimentacion_tareas/${entrega.id_entrega}/docente_${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('archivos_tareas')
          .upload(path, archivoRetro, { upsert: true });
        if (uploadErr) throw uploadErr;
        archivoUrl = path;
      }

      // 2. Update entrega
      const fechaCorreccion = new Date().toISOString();
      const { error } = await supabase
        .from('entregas_tareas')
        .update({
          calificacion: calificacion,
          comentario_docente: comentarioDocente || null,
          estado: 'CALIFICADO',
          fecha_correccion: fechaCorreccion,
          id_docente_corrector: idDocente,
          retroalimentacion_archivo_url: archivoUrl,
        })
        .eq('id_entrega', entrega.id_entrega);
      if (error) throw error;

      // 3. Create notification (only on first correction)
      if (!yaCorregido) {
        await supabase.from('notificaciones').insert({
          id_usuario: entrega.id_usuario,
          tipo: 'CORRECCION',
          titulo: 'Tarea corregida',
          mensaje: `Tu tarea "${tarea.titulo}" ha sido calificada. Nota: ${calificacion}/${puntajeMax} (${porcentaje}%)`,
          link: `/tareas/${tarea.id_tarea}`,
        });

        // 4. Send email (only on first correction)
        supabase.functions.invoke('send-correccion-email', {
          body: {
            id_usuario: entrega.id_usuario,
            tipo: 'tarea',
            titulo: tarea.titulo,
            puntaje: calificacion,
            puntaje_total: puntajeMax,
            porcentaje: porcentaje,
            comentario_docente: comentarioDocente || undefined,
            tiene_archivo_retroalimentacion: !!archivoUrl,
          },
        }).catch(err => console.error('Email error:', err));
      }

      const applyEntregaCorregida = (oldData: unknown) => {
        if (!Array.isArray(oldData)) return oldData;

        return oldData.map((item: any) =>
          item.id_entrega === entrega.id_entrega
            ? {
                ...item,
                calificacion,
                comentario_docente: comentarioDocente || null,
                estado: 'CALIFICADO',
                fecha_correccion: fechaCorreccion,
                id_docente_corrector: idDocente,
                retroalimentacion_archivo_url: archivoUrl,
              }
            : item
        );
      };

      queryClient.setQueriesData({ queryKey: ['entregas', 'calificar'] }, applyEntregaCorregida);
      queryClient.setQueriesData({ queryKey: ['entregas', 'tarea', entrega.id_tarea] }, applyEntregaCorregida);
      queryClient.setQueryData(['entrega', 'mi', entrega.id_tarea, entrega.id_usuario], (oldData: any) =>
        oldData
          ? {
              ...oldData,
              calificacion,
              comentario_docente: comentarioDocente || null,
              estado: 'CALIFICADO',
              fecha_correccion: fechaCorreccion,
              id_docente_corrector: idDocente,
              retroalimentacion_archivo_url: archivoUrl,
            }
          : oldData
      );

      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['entregas', 'calificar'] }),
        queryClient.invalidateQueries({ queryKey: ['entregas', 'tarea', entrega.id_tarea] }),
        queryClient.invalidateQueries({ queryKey: ['entrega', 'mi', entrega.id_tarea, entrega.id_usuario] }),
        queryClient.invalidateQueries({ queryKey: ['tareas', 'pendientes'] }),
      ]);

      toast({ title: 'Corrección guardada', description: `Nota: ${calificacion}/${puntajeMax} (${porcentaje}%)` });
      navigate('/correcciones');
    } catch (error: any) {
      console.error('Error saving task correction:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar la corrección.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!entrega || !tarea) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Entrega no encontrada</h2>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/correcciones')}>
          <ChevronLeft className="h-4 w-4 mr-2" /> Volver a Correcciones
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/correcciones" className="hover:text-foreground">Correcciones</Link>
        <span>/</span>
        <span className="text-foreground">{tarea.titulo}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Corregir: {tarea.titulo}</h1>
          {tarea.descripcion && (
            <p className="text-muted-foreground mt-1 whitespace-pre-wrap break-words">{tarea.descripcion}</p>
          )}
          {estudiante && (
            <p className="text-muted-foreground mt-1">
              Estudiante: <strong>{estudiante.nombres} {estudiante.apellidos}</strong> ({estudiante.correo})
            </p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <Badge variant={yaCorregido ? 'default' : 'secondary'}>
              {yaCorregido ? 'Calificado' : 'Pendiente'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Entregado: {new Date(entrega.fecha_entrega).toLocaleString()}
            </span>
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate('/correcciones')}>
          <ChevronLeft className="h-4 w-4 mr-2" /> Volver
        </Button>
      </div>

      {/* Comentario del estudiante */}
      {entrega.comentario_estudiante && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Comentario del Estudiante</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap break-words">{entrega.comentario_estudiante}</p>
          </CardContent>
        </Card>
      )}

      {/* Archivos adjuntos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Archivos Entregados</CardTitle>
        </CardHeader>
        <CardContent>
          {archivos.length === 0 ? (
            <p className="text-muted-foreground text-sm">El estudiante no adjuntó archivos.</p>
          ) : (
            <div className="space-y-2">
              {archivos.map((archivo) => (
                <div
                  key={archivo.id_archivo}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <File className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{archivo.nombre_archivo}</p>
                      <p className="text-xs text-muted-foreground">
                        {archivo.tipo_mime || 'Desconocido'} • {formatBytes(archivo.tamano_bytes)}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleDescargar(archivo)}>
                    <Download className="h-4 w-4 mr-1" /> Descargar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calificación */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Calificación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Label className="whitespace-nowrap">
              Nota (0 - {tarea.puntaje_maximo ?? 100}):
            </Label>
            <Input
              type="number"
              min={0}
              max={tarea.puntaje_maximo ?? 100}
              value={calificacion}
              onChange={(e) => {
                const val = Number(e.target.value);
                const max = tarea.puntaje_maximo ?? 100;
                setCalificacion(Math.min(val, max));
              }}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">
              / {tarea.puntaje_maximo ?? 100}
            </span>
            <span className="text-sm font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary">
              {tarea.puntaje_maximo && tarea.puntaje_maximo > 0
                ? `${Math.round((calificacion / tarea.puntaje_maximo) * 100)}%`
                : '—'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Retroalimentación */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Retroalimentación (Opcional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Comentario para el estudiante</Label>
            <Textarea
              placeholder="Escribe tu retroalimentación aquí..."
              value={comentarioDocente}
              onChange={(e) => setComentarioDocente(e.target.value)}
              className="mt-1 min-h-[100px]"
              disabled={false}
            />
          </div>
          <div>
            <Label>Adjuntar imagen o PDF (máx. 10 MB)</Label>
            {entrega.retroalimentacion_archivo_url && !archivoRetro && (
              <div className="flex items-center gap-2 mt-1 mb-2 p-2 rounded border bg-muted/30">
                <FileText className="h-4 w-4" />
                <span className="text-sm">Archivo de retroalimentación existente</span>
              </div>
            )}
            {true && (
              <div className="mt-1">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
                {archivoRetro && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Archivo seleccionado: {archivoRetro.name}
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end gap-3 pb-8">
        <Button variant="outline" onClick={() => navigate('/correcciones')}>
          Cancelar
        </Button>
        <Button onClick={handleGuardar} disabled={saving} size="lg">
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {yaCorregido ? 'Actualizar Corrección' : 'Guardar Corrección'}
        </Button>
      </div>
    </div>
  );
};

export default CorreccionTarea;
