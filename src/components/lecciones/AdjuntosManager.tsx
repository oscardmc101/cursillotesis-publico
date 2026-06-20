import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Loader2,
  Paperclip,
  Plus,
  Trash2,
  Download,
  ExternalLink,
  FileText,
  Image,
  Link as LinkIcon,
} from 'lucide-react';
import {
  CONTENIDO_LECCIONES_BUCKET,
  downloadStorageFile,
  getStorageObjectPath,
} from '@/lib/storageFiles';

interface Adjunto {
  id_adjunto: string;
  nombre: string;
  tipo: 'ARCHIVO' | 'LINK';
  ruta_storage: string | null;
  url_externa: string | null;
  tipo_mime: string | null;
  tamano_bytes: number | null;
}

interface AdjuntosManagerProps {
  idLeccion: string;
  canEdit: boolean;
}

const AdjuntosManager = ({ idLeccion, canEdit }: AdjuntosManagerProps) => {
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addType, setAddType] = useState<'archivo' | 'link'>('archivo');
  const [uploading, setUploading] = useState(false);
  
  // Form states
  const [linkNombre, setLinkNombre] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  const fetchAdjuntos = async () => {
    try {
      const { data, error } = await supabase
        .from('adjuntos_leccion')
        .select('*')
        .eq('id_leccion', idLeccion)
        .order('fecha_subida', { ascending: false });

      if (error) throw error;

      setAdjuntos((data || []) as Adjunto[]);
    } catch (error) {
      console.error('Error fetching adjuntos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdjuntos();
  }, [idLeccion]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'El archivo excede el tamaño máximo permitido de 10 MB.',
        variant: 'destructive',
      });
      e.target.value = ''; // Reset input
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `lecciones/${idLeccion}/adjuntos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(CONTENIDO_LECCIONES_BUCKET)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('adjuntos_leccion')
        .insert({
          id_leccion: idLeccion,
          nombre: file.name,
          tipo: 'ARCHIVO',
          ruta_storage: filePath,
          tipo_mime: file.type,
          tamano_bytes: file.size,
        });

      if (insertError) throw insertError;

      toast({ title: 'Archivo subido correctamente' });
      setAddDialogOpen(false);
      fetchAdjuntos();
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo subir el archivo',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleAddLink = async () => {
    if (!linkNombre.trim() || !linkUrl.trim()) return;

    setUploading(true);
    try {
      const { error } = await supabase
        .from('adjuntos_leccion')
        .insert({
          id_leccion: idLeccion,
          nombre: linkNombre.trim(),
          tipo: 'LINK',
          url_externa: linkUrl.trim(),
        });

      if (error) throw error;

      toast({ title: 'Enlace agregado correctamente' });
      setAddDialogOpen(false);
      setLinkNombre('');
      setLinkUrl('');
      fetchAdjuntos();
    } catch (error: any) {
      console.error('Error adding link:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo agregar el enlace',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (adjunto: Adjunto) => {
    try {
      // Delete from storage if it's a file
      if (adjunto.tipo === 'ARCHIVO' && adjunto.ruta_storage) {
        const storagePath = getStorageObjectPath(
          adjunto.ruta_storage,
          CONTENIDO_LECCIONES_BUCKET
        );
        await supabase.storage
          .from(CONTENIDO_LECCIONES_BUCKET)
          .remove([storagePath]);
      }

      const { error } = await supabase
        .from('adjuntos_leccion')
        .delete()
        .eq('id_adjunto', adjunto.id_adjunto);

      if (error) throw error;

      toast({ title: 'Adjunto eliminado' });
      fetchAdjuntos();
    } catch (error: any) {
      console.error('Error deleting adjunto:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar el adjunto',
        variant: 'destructive',
      });
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (tipoMime: string | null) => {
    if (!tipoMime) return <FileText className="h-4 w-4" />;
    if (tipoMime.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (tipoMime === 'application/pdf') return <FileText className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Paperclip className="h-5 w-5" />
          Archivos Adjuntos ({adjuntos.length})
        </CardTitle>
        {canEdit && (
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Agregar
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {adjuntos.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No hay archivos adjuntos
          </p>
        ) : (
          <div className="space-y-2">
            {adjuntos.map((adjunto) => (
              <div
                key={adjunto.id_adjunto}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {adjunto.tipo === 'LINK' ? (
                    <LinkIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  ) : (
                    <span className="text-muted-foreground flex-shrink-0">
                      {getFileIcon(adjunto.tipo_mime)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{adjunto.nombre}</p>
                    {adjunto.tamano_bytes && (
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(adjunto.tamano_bytes)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {adjunto.tipo === 'LINK' ? (
                    <Button
                      size="icon"
                      variant="ghost"
                      asChild
                    >
                      <a href={adjunto.url_externa || '#'} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  ) : (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (!adjunto.ruta_storage) return;
                        downloadStorageFile(
                          adjunto.ruta_storage,
                          CONTENIDO_LECCIONES_BUCKET,
                          adjunto.nombre
                        ).catch((error) => {
                          console.error('Error downloading adjunto:', error);
                          toast({
                            title: 'Error',
                            description: 'No se pudo descargar el archivo',
                            variant: 'destructive',
                          });
                        });
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  {canEdit && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(adjunto)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Adjunto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={addType === 'archivo' ? 'default' : 'outline'}
                onClick={() => setAddType('archivo')}
                className="flex-1"
              >
                <FileText className="h-4 w-4 mr-2" />
                Archivo
              </Button>
              <Button
                variant={addType === 'link' ? 'default' : 'outline'}
                onClick={() => setAddType('link')}
                className="flex-1"
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                Enlace
              </Button>
            </div>

            {addType === 'archivo' ? (
              <div className="space-y-2">
                <Label>Seleccionar archivo</Label>
                <input
                  type="file"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                <p className="text-xs text-muted-foreground">
                  Formatos permitidos: PDF, Word, PowerPoint, Excel, TXT, Imágenes, ZIP, RAR
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre del enlace</Label>
                  <Input
                    placeholder="Ej: Documentación oficial"
                    value={linkNombre}
                    onChange={(e) => setLinkNombre(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>URL</Label>
                  <Input
                    type="url"
                    placeholder="https://..."
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleAddLink}
                  disabled={uploading || !linkNombre.trim() || !linkUrl.trim()}
                  className="w-full"
                >
                  {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Agregar enlace
                </Button>
              </div>
            )}

            {uploading && addType === 'archivo' && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Subiendo archivo...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AdjuntosManager;
