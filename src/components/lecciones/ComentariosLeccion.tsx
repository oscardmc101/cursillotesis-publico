import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUsuario } from '@/hooks/useCurrentUsuario';
import { toast } from '@/hooks/use-toast';
import { Loader2, MessageSquare, Trash2, User } from 'lucide-react';

interface Comentario {
  id_comentario: string;
  contenido: string;
  fecha_comentario: string;
  id_usuario: string;
  usuario?: {
    nombres: string | null;
    apellidos: string | null;
  };
}

interface ComentariosLeccionProps {
  idLeccion: string;
  canDelete: boolean;
}

const ComentariosLeccion = ({ idLeccion, canDelete }: ComentariosLeccionProps) => {
  const { idUsuario } = useCurrentUsuario();
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [loading, setLoading] = useState(true);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchComentarios = async () => {
    try {
      const { data, error } = await supabase.rpc('rpc_list_comentarios_leccion_publicos', {
        p_id_leccion: idLeccion,
      });

      if (error) throw error;

      const comentariosData = (data || []).map((comentario) => ({
        id_comentario: comentario.id_comentario,
        contenido: comentario.contenido,
        fecha_comentario: comentario.fecha_comentario,
        id_usuario: comentario.id_usuario,
        usuario: {
          nombres: comentario.usuario_nombres,
          apellidos: comentario.usuario_apellidos,
        },
      }));

      setComentarios(comentariosData);
    } catch (error) {
      console.error('Error fetching comentarios:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComentarios();
  }, [idLeccion]);

  const handleSubmit = async () => {
    if (!nuevoComentario.trim() || !idUsuario) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('comentarios_leccion')
        .insert({
          id_leccion: idLeccion,
          id_usuario: idUsuario,
          contenido: nuevoComentario.trim(),
        });

      if (error) throw error;

      setNuevoComentario('');
      toast({ title: 'Comentario agregado' });
      fetchComentarios();
    } catch (error: any) {
      console.error('Error adding comentario:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo agregar el comentario',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (idComentario: string) => {
    try {
      const { error } = await supabase
        .from('comentarios_leccion')
        .delete()
        .eq('id_comentario', idComentario);

      if (error) throw error;

      toast({ title: 'Comentario eliminado' });
      fetchComentarios();
    } catch (error: any) {
      console.error('Error deleting comentario:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar el comentario',
        variant: 'destructive',
      });
    }
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5" />
          Comentarios ({comentarios.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comment Form */}
        {idUsuario && (
          <div className="space-y-2">
            <Textarea
              placeholder="Escribe tu comentario o pregunta..."
              value={nuevoComentario}
              onChange={(e) => setNuevoComentario(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={submitting || !nuevoComentario.trim()}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Comentar
              </Button>
            </div>
          </div>
        )}

        {/* Comments List */}
        {comentarios.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No hay comentarios todavía. ¡Sé el primero en comentar!
          </p>
        ) : (
          <div className="space-y-4">
            {comentarios.map((comentario) => {
              const nombreCompleto = comentario.usuario
                ? `${comentario.usuario.nombres || ''} ${comentario.usuario.apellidos || ''}`.trim()
                : 'Usuario';
              const canDeleteThis = canDelete || comentario.id_usuario === idUsuario;

              return (
                <div
                  key={comentario.id_comentario}
                  className="flex gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">
                        {nombreCompleto || 'Usuario'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(comentario.fecha_comentario).toLocaleDateString()}
                        </span>
                        {canDeleteThis && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => handleDelete(comentario.id_comentario)}
                          >
                            <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm mt-1 whitespace-pre-wrap">
                      {comentario.contenido}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ComentariosLeccion;
