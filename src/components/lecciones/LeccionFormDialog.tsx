import { useState, useEffect, Suspense, lazy, useRef } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Paperclip, Upload, Link2, Trash2, FileText, Image, File, ExternalLink, ClipboardList, ClipboardCheck, Plus } from 'lucide-react';
import {
  CONTENIDO_LECCIONES_BUCKET,
  getStorageObjectPath,
} from '@/lib/storageFiles';

// Lazy load to avoid circular dependencies
const TareaFormDialog = lazy(() => import('@/components/tareas/TareaFormDialog'));
const EvaluacionFormDialog = lazy(() =>
  import('@/components/evaluaciones/EvaluacionFormDialog').then(m => ({ default: m.EvaluacionFormDialog }))
);

interface PendingTarea {
  tempId: string;
  titulo: string;
  descripcion?: string;
  fecha_limite?: Date | null;
  permite_reintentos: boolean;
  max_reintentos: number;
}

interface PendingOpcion {
  tempId: string;
  texto: string;
  es_correcta: boolean;
}

interface PendingPreguntaInLeccion {
  tempId: string;
  enunciado: string;
  tipo: 'OPCION_MULTIPLE' | 'ABIERTA';
  puntaje: number;
  opciones: PendingOpcion[];
}

interface PendingEvaluacion {
  tempId: string;
  titulo: string;
  descripcion?: string;
  tiempo_limite_min?: number | null;
  intentos_max: number;
  preguntas?: PendingPreguntaInLeccion[];
}

interface ExistingTarea {
  id_tarea: string;
  titulo: string;
}

interface ExistingEvaluacion {
  id_evaluacion: string;
  titulo: string;
}

const leccionSchema = z.object({
  titulo: z.string().min(3, 'El título debe tener al menos 3 caracteres').max(200),
  tipo_contenido: z.enum(['TEXTO', 'PDF', 'VIDEO']),
  contenido_texto: z.string().optional(),
  url_contenido: z.string().optional(),
  orden: z.coerce.number().min(1),
  es_publicada: z.boolean(),
});

type LeccionFormData = z.infer<typeof leccionSchema>;

interface Leccion {
  id_leccion: string;
  titulo: string;
  tipo_contenido: string;
  contenido_texto?: string | null;
  url_contenido?: string | null;
  orden: number;
  es_publicada: boolean;
}

interface PendingAdjunto {
  tempId: string;
  nombre: string;
  tipo: 'ARCHIVO' | 'LINK';
  ruta_storage?: string;
  url_externa?: string;
  tipo_mime?: string;
  tamano_bytes?: number;
  file?: File;
}

interface ExistingAdjunto {
  id_adjunto: string;
  nombre: string;
  tipo: string;
  ruta_storage?: string | null;
  url_externa?: string | null;
  tipo_mime?: string | null;
  tamano_bytes?: number | null;
}

interface LeccionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idModulo: string;
  leccion?: Leccion | null;
  nextOrden: number;
  onSuccess: () => void;
}

const LeccionFormDialog = ({
  open,
  onOpenChange,
  idModulo,
  leccion,
  nextOrden,
  onSuccess,
}: LeccionFormDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  // Adjuntos states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingAdjuntos, setPendingAdjuntos] = useState<PendingAdjunto[]>([]);
  const [existingAdjuntos, setExistingAdjuntos] = useState<ExistingAdjunto[]>([]);
  const [deletedAdjuntos, setDeletedAdjuntos] = useState<ExistingAdjunto[]>([]);
  const uploadingAdjunto = false;
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkName, setLinkName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  // Tareas & Evaluaciones states (pending = for new lesson, existing = for edit)
  const [pendingTareas, setPendingTareas] = useState<PendingTarea[]>([]);
  const [existingTareas, setExistingTareas] = useState<ExistingTarea[]>([]);
  const [pendingEvaluaciones, setPendingEvaluaciones] = useState<PendingEvaluacion[]>([]);
  const [existingEvaluaciones, setExistingEvaluaciones] = useState<ExistingEvaluacion[]>([]);
  const [showTareaForm, setShowTareaForm] = useState(false);
  const [showEvaluacionForm, setShowEvaluacionForm] = useState(false);

  const isEditing = !!leccion;

  const form = useForm<LeccionFormData>({
    resolver: zodResolver(leccionSchema),
    defaultValues: {
      titulo: '',
      tipo_contenido: 'TEXTO',
      contenido_texto: '',
      url_contenido: '',
      orden: nextOrden,
      es_publicada: true,
    },
  });

  const tipoContenido = form.watch('tipo_contenido');

  // Fetch existing adjuntos when editing
  const fetchExistingAdjuntos = async (idLeccion: string) => {
    const { data, error } = await supabase
      .from('adjuntos_leccion')
      .select('*')
      .eq('id_leccion', idLeccion)
      .order('fecha_subida', { ascending: false });
    if (!error && data) setExistingAdjuntos(data);
  };

  // Fetch existing tareas and evaluaciones when editing
  const fetchExistingTareasYEvaluaciones = async (idLeccion: string) => {
    const [tareasRes, evalRes] = await Promise.all([
      supabase.from('tareas').select('id_tarea, titulo').eq('id_leccion', idLeccion),
      supabase.from('evaluaciones').select('id_evaluacion, titulo').eq('id_leccion', idLeccion),
    ]);
    if (!tareasRes.error && tareasRes.data) setExistingTareas(tareasRes.data);
    if (!evalRes.error && evalRes.data) setExistingEvaluaciones(evalRes.data);
  };

  useEffect(() => {
    if (open) {
      if (leccion) {
        form.reset({
          titulo: leccion.titulo,
          tipo_contenido: leccion.tipo_contenido as 'TEXTO' | 'PDF' | 'VIDEO',
          contenido_texto: leccion.contenido_texto || '',
          url_contenido: leccion.url_contenido || '',
          orden: leccion.orden,
          es_publicada: leccion.es_publicada,
        });
        fetchExistingAdjuntos(leccion.id_leccion);
        fetchExistingTareasYEvaluaciones(leccion.id_leccion);
      } else {
        form.reset({
          titulo: '',
          tipo_contenido: 'TEXTO',
          contenido_texto: '',
          url_contenido: '',
          orden: nextOrden,
          es_publicada: true,
        });
        setPdfFile(null);
      }
      // Reset adjuntos state
      setPendingAdjuntos([]);
      setDeletedAdjuntos([]);
      setShowLinkInput(false);
      setLinkName('');
      setLinkUrl('');
      // Reset tasks/evaluations state
      setPendingTareas([]);
      setPendingEvaluaciones([]);
      setExistingTareas([]);
      setExistingEvaluaciones([]);
      setShowTareaForm(false);
      setShowEvaluacionForm(false);
    }
  }, [open, leccion, nextOrden, form]);

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

  const handlePdfUpload = async (idLeccion: string): Promise<string | null> => {
    if (!pdfFile) return null;

    setUploadingPdf(true);
    try {
      const fileExt = pdfFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `lecciones/${idLeccion}/contenido/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(CONTENIDO_LECCIONES_BUCKET)
        .upload(filePath, pdfFile);

      if (uploadError) throw uploadError;

      return filePath;
    } catch (error: any) {
      console.error('Error uploading PDF:', error);
      toast({
        title: 'Error',
        description: 'No se pudo subir el PDF',
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploadingPdf(false);
    }
  };

  // Handle file upload for adjuntos
  const handleAdjuntoFileUpload = (file: File) => {
    const newAdjunto: PendingAdjunto = {
      tempId: `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      nombre: file.name,
      tipo: 'ARCHIVO',
      tipo_mime: file.type,
      tamano_bytes: file.size,
      file,
    };

    setPendingAdjuntos(prev => [...prev, newAdjunto]);
    toast({ title: 'Archivo agregado' });
  };

  // Handle adding a link
  const handleAddLink = () => {
    if (!linkName.trim() || !linkUrl.trim()) {
      toast({
        title: 'Error',
        description: 'Ingresa un nombre y una URL válida',
        variant: 'destructive',
      });
      return;
    }

    const newAdjunto: PendingAdjunto = {
      tempId: `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      nombre: linkName.trim(),
      tipo: 'LINK',
      url_externa: linkUrl.trim(),
    };

    setPendingAdjuntos(prev => [...prev, newAdjunto]);
    setLinkName('');
    setLinkUrl('');
    setShowLinkInput(false);
    toast({ title: 'Enlace agregado' });
  };

  // Remove pending adjunto
  const handleRemovePendingAdjunto = (tempId: string) => {
    setPendingAdjuntos(prev => prev.filter(a => a.tempId !== tempId));
  };

  // Mark existing adjunto for deletion
  const handleMarkForDeletion = (idAdjunto: string) => {
    const adjunto = existingAdjuntos.find(a => a.id_adjunto === idAdjunto);
    if (adjunto) {
      setDeletedAdjuntos(prev => [...prev, adjunto]);
    }
    setExistingAdjuntos(prev => prev.filter(a => a.id_adjunto !== idAdjunto));
  };

  // Get file icon based on mime type
  const getFileIcon = (mimeType?: string | null) => {
    if (!mimeType) return <File className="h-4 w-4" />;
    if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (mimeType.includes('pdf')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  // Format file size
  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const onSubmit = async (data: LeccionFormData) => {
    setLoading(true);
    try {
      const urlContenido = data.url_contenido;

      // Validate YouTube URL
      if (data.tipo_contenido === 'VIDEO' && urlContenido) {
        const videoId = extractYoutubeId(urlContenido);
        if (!videoId) {
          toast({
            title: 'Error',
            description: 'La URL de YouTube no es válida',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
      }

      const payload = {
        id_modulo: idModulo,
        titulo: data.titulo,
        tipo_contenido: data.tipo_contenido,
        contenido_texto: data.tipo_contenido === 'TEXTO' ? data.contenido_texto : null,
        url_contenido: data.tipo_contenido !== 'TEXTO' ? urlContenido || null : null,
        orden: data.orden,
        es_publicada: data.es_publicada,
      };

      let leccionId: string;

      if (isEditing && leccion) {
        const { error } = await supabase
          .from('lecciones')
          .update(payload)
          .eq('id_leccion', leccion.id_leccion);

        if (error) throw error;
        leccionId = leccion.id_leccion;

        // Delete marked adjuntos
        for (const adjuntoToDelete of deletedAdjuntos) {
          if (adjuntoToDelete?.ruta_storage) {
            const storagePath = getStorageObjectPath(
              adjuntoToDelete.ruta_storage,
              CONTENIDO_LECCIONES_BUCKET
            );
            await supabase.storage
              .from(CONTENIDO_LECCIONES_BUCKET)
              .remove([storagePath]);
          }
          await supabase
            .from('adjuntos_leccion')
            .delete()
            .eq('id_adjunto', adjuntoToDelete.id_adjunto);
        }
      } else {
        const { data: newLeccion, error } = await supabase
          .from('lecciones')
          .insert(payload)
          .select('id_leccion')
          .single();

        if (error) throw error;
        leccionId = newLeccion.id_leccion;
      }

      // Private lesson files need the lesson ID in their storage path.
      if (data.tipo_contenido === 'PDF' && pdfFile) {
        const pdfPath = await handlePdfUpload(leccionId);
        if (!pdfPath) throw new Error('No se pudo guardar el PDF');

        const { error: pdfUpdateError } = await supabase
          .from('lecciones')
          .update({ url_contenido: pdfPath })
          .eq('id_leccion', leccionId);

        if (pdfUpdateError) throw pdfUpdateError;
      }

      // Save pending adjuntos
      for (const adjunto of pendingAdjuntos) {
        let rutaStorage = adjunto.ruta_storage || null;

        if (adjunto.tipo === 'ARCHIVO' && adjunto.file) {
          const fileExt = adjunto.file.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          rutaStorage = `lecciones/${leccionId}/adjuntos/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from(CONTENIDO_LECCIONES_BUCKET)
            .upload(rutaStorage, adjunto.file);

          if (uploadError) throw uploadError;
        }

        const { error: adjuntoError } = await supabase.from('adjuntos_leccion').insert({
          id_leccion: leccionId,
          nombre: adjunto.nombre,
          tipo: adjunto.tipo,
          ruta_storage: rutaStorage,
          url_externa: adjunto.url_externa || null,
          tipo_mime: adjunto.tipo_mime || null,
          tamano_bytes: adjunto.tamano_bytes || null,
        });

        if (adjuntoError) throw adjuntoError;
      }

      // Save pending Tareas
      for (const tarea of pendingTareas) {
        await supabase.from('tareas').insert({
          id_leccion: leccionId,
          titulo: tarea.titulo,
          descripcion: tarea.descripcion || null,
          fecha_limite: tarea.fecha_limite instanceof Date ? tarea.fecha_limite.toISOString() : null,
          permite_reintentos: tarea.permite_reintentos,
          max_reintentos: tarea.max_reintentos,
        });
      }

      // Save pending Evaluaciones (with questions and options)
      for (const evaluacion of pendingEvaluaciones) {
        const { data: newEval, error: evalErr } = await supabase
          .from('evaluaciones')
          .insert({
            id_leccion: leccionId,
            titulo: evaluacion.titulo,
            descripcion: evaluacion.descripcion || null,
            tiempo_limite_min: evaluacion.tiempo_limite_min || null,
            intentos_max: evaluacion.intentos_max,
          })
          .select('id_evaluacion')
          .single();

        if (evalErr) throw evalErr;

        // Save questions and options
        const preguntas = evaluacion.preguntas || [];
        for (let i = 0; i < preguntas.length; i++) {
          const q = preguntas[i];
          const { data: newQ, error: qErr } = await supabase
            .from('preguntas_evaluacion')
            .insert({
              id_evaluacion: newEval.id_evaluacion,
              enunciado: q.enunciado,
              tipo: q.tipo,
              puntaje: q.puntaje,
            })
            .select('id_pregunta')
            .single();

          if (qErr) throw qErr;

          if (q.tipo === 'OPCION_MULTIPLE' && q.opciones.length > 0) {
            const { error: opErr } = await supabase.from('opciones_pregunta').insert(
              q.opciones.map(o => ({
                id_pregunta: newQ.id_pregunta,
                texto: o.texto,
                es_correcta: o.es_correcta,
              }))
            );
            if (opErr) throw opErr;
          }
        }
      }

      toast({ title: isEditing ? 'Lección actualizada correctamente' : 'Lección creada correctamente' });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error saving leccion:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar la lección',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const allAdjuntos = [
    ...existingAdjuntos.map(a => ({ ...a, isExisting: true as const })),
    ...pendingAdjuntos.map(a => ({ ...a, isExisting: false as const })),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Lección' : 'Nueva Lección'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Título de la lección" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tipo_contenido"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de contenido</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="TEXTO">Texto</SelectItem>
                        <SelectItem value="PDF">PDF</SelectItem>
                        <SelectItem value="VIDEO">Video (YouTube)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="orden"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Orden</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {tipoContenido === 'TEXTO' && (
              <FormField
                control={form.control}
                name="contenido_texto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contenido</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Escribe el contenido de la lección. Puedes incluir URLs de imágenes."
                        className="min-h-[200px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {tipoContenido === 'PDF' && (
              <FormItem>
                <FormLabel>Archivo PDF</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  />
                </FormControl>
                {leccion?.url_contenido && !pdfFile && (
                  <p className="text-sm text-muted-foreground">
                    Ya tiene un PDF cargado. Sube uno nuevo para reemplazarlo.
                  </p>
                )}
              </FormItem>
            )}

            {tipoContenido === 'VIDEO' && (
              <FormField
                control={form.control}
                name="url_contenido"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL de YouTube</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://www.youtube.com/watch?v=..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Tareas de esta lección */}
            <div className="rounded-lg border p-4 bg-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  <span className="font-medium">Tareas de esta lección</span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowTareaForm(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Nueva tarea
                </Button>
              </div>

              {/* Existing (edit mode) */}
              {existingTareas.length > 0 && (
                <div className="space-y-2 mb-2">
                  {existingTareas.map((t) => (
                    <div key={t.id_tarea} className="flex items-center gap-2 p-2 bg-background rounded-md border">
                      <ClipboardList className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">{t.titulo}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Pending (create mode) */}
              {pendingTareas.length > 0 && (
                <div className="space-y-2 mb-2">
                  {pendingTareas.map((tarea) => (
                    <div key={tarea.tempId} className="flex items-center justify-between p-2 bg-background rounded-md border">
                      <span className="text-sm font-medium truncate">{tarea.titulo}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setPendingTareas(prev => prev.filter(t => t.tempId !== tarea.tempId))}
                        className="text-destructive hover:text-destructive shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {existingTareas.length === 0 && pendingTareas.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">No hay tareas aún.</p>
              )}
            </div>

            {/* Evaluaciones */}
            <div className="rounded-lg border p-4 bg-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                  <span className="font-medium">Evaluaciones</span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowEvaluacionForm(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Nueva evaluación
                </Button>
              </div>

              {/* Existing (edit mode) */}
              {existingEvaluaciones.length > 0 && (
                <div className="space-y-2 mb-2">
                  {existingEvaluaciones.map((e) => (
                    <div key={e.id_evaluacion} className="flex items-center gap-2 p-2 bg-background rounded-md border">
                      <ClipboardCheck className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">{e.titulo}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Pending (create mode) */}
              {pendingEvaluaciones.length > 0 && (
                <div className="space-y-2 mb-2">
                  {pendingEvaluaciones.map((ev) => (
                    <div key={ev.tempId} className="flex items-center justify-between p-2 bg-background rounded-md border">
                      <span className="text-sm font-medium truncate">{ev.titulo}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setPendingEvaluaciones(prev => prev.filter(e => e.tempId !== ev.tempId))}
                        className="text-destructive hover:text-destructive shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {existingEvaluaciones.length === 0 && pendingEvaluaciones.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">No hay evaluaciones aún.</p>
              )}
            </div>

            {/* Complementos de la lección */}
            <div className="rounded-lg border-2 border-dashed border-primary/40 p-4 bg-primary/5">
              <div className="flex items-center gap-2 mb-3">
                <Paperclip className="h-5 w-5 text-primary" />
                <span className="font-medium text-foreground">Complementos de la lección</span>
              </div>

              {/* Lista de adjuntos */}
              {allAdjuntos.length > 0 && (
                <div className="space-y-2 mb-4">
                  {allAdjuntos.map((adjunto) => (
                    <div
                      key={adjunto.isExisting ? (adjunto as ExistingAdjunto & { isExisting: true }).id_adjunto : (adjunto as PendingAdjunto & { isExisting: false }).tempId}
                      className="flex items-center justify-between p-2 bg-background rounded-md border"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {adjunto.tipo === 'LINK' ? (
                          <ExternalLink className="h-4 w-4 text-blue-500 shrink-0" />
                        ) : (
                          <span className="text-muted-foreground shrink-0">
                            {getFileIcon(adjunto.tipo_mime)}
                          </span>
                        )}
                        <span className="text-sm truncate">{adjunto.nombre}</span>
                        {adjunto.tipo !== 'LINK' && adjunto.tamano_bytes && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            ({formatFileSize(adjunto.tamano_bytes)})
                          </span>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (adjunto.isExisting) {
                            handleMarkForDeletion((adjunto as ExistingAdjunto & { isExisting: true }).id_adjunto);
                          } else {
                            handleRemovePendingAdjunto((adjunto as PendingAdjunto & { isExisting: false }).tempId);
                          }
                        }}
                        className="text-destructive hover:text-destructive shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Input para agregar link */}
              {showLinkInput && (
                <div className="space-y-2 mb-4 p-3 bg-background rounded-md border">
                  <Input
                    placeholder="Nombre del enlace"
                    value={linkName}
                    onChange={(e) => setLinkName(e.target.value)}
                  />
                  <Input
                    placeholder="https://..."
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddLink}
                    >
                      Agregar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowLinkInput(false);
                        setLinkName('');
                        setLinkUrl('');
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {/* Botones para agregar */}
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 10 * 1024 * 1024) {
                        toast({
                          title: 'Error',
                          description: 'El archivo excede el tamaño máximo permitido de 10 MB.',
                          variant: 'destructive',
                        });
                        e.target.value = '';
                        return;
                      }
                      handleAdjuntoFileUpload(file);
                      e.target.value = '';
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingAdjunto}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadingAdjunto ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-1" />
                  )}
                  Archivo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLinkInput(true)}
                  disabled={showLinkInput}
                >
                  <Link2 className="h-4 w-4 mr-1" />
                  Enlace
                </Button>
              </div>
            </div>

            <FormField
              control={form.control}
              name="es_publicada"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Publicada</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Si está desactivada, solo tú podrás verla
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || uploadingPdf || uploadingAdjunto}>
                {(loading || uploadingPdf) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? 'Guardar cambios' : 'Crear lección'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>

      {/* Lazy-loaded dialogs — rendered outside DialogContent to avoid portal conflicts */}
      <Suspense fallback={null}>
        {showTareaForm && (
          <TareaFormDialog
            open={showTareaForm}
            onOpenChange={setShowTareaForm}
            idLeccion={leccion?.id_leccion || 'pending'}
            onSuccess={() => {
              if (leccion) fetchExistingTareasYEvaluaciones(leccion.id_leccion);
            }}
            onDirectSubmit={!isEditing ? (data) => {
              setPendingTareas(prev => [...prev, {
                tempId: Math.random().toString(36).substring(7),
                titulo: data.titulo || '',
                descripcion: data.descripcion,
                fecha_limite: data.fecha_limite instanceof Date ? data.fecha_limite : null,
                permite_reintentos: data.permite_reintentos ?? true,
                max_reintentos: data.max_reintentos ?? 3,
              }]);
            } : undefined}
          />
        )}

        {showEvaluacionForm && (
          <EvaluacionFormDialog
            open={showEvaluacionForm}
            onOpenChange={setShowEvaluacionForm}
            idLeccion={leccion?.id_leccion || 'pending'}
            onSuccess={() => {
              if (leccion) fetchExistingTareasYEvaluaciones(leccion.id_leccion);
            }}
            onDirectSubmit={!isEditing ? (data) => {
              setPendingEvaluaciones(prev => [...prev, {
                tempId: Math.random().toString(36).substring(7),
                titulo: data.titulo || '',
                descripcion: data.descripcion,
                tiempo_limite_min: data.tiempo_limite_min ?? null,
                intentos_max: data.intentos_max ?? 1,
                preguntas: (data.preguntas || []).map(q => ({
                  tempId: q.tempId,
                  enunciado: q.enunciado,
                  tipo: q.tipo,
                  puntaje: q.puntaje,
                  opciones: q.opciones,
                })),
              }]);
            } : undefined}
          />
        )}
      </Suspense>
    </Dialog>
  );
};

export default LeccionFormDialog;
