import { useState } from 'react';
import { Plus, Megaphone, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/contexts/UserRoleContext';
import { useCurrentUsuario } from '@/hooks/useCurrentUsuario';
import { useAnuncios, useAnunciosRealtime, Anuncio, AnuncioFormData } from '@/hooks/useAnuncios';
import AnuncioCard from '@/components/anuncios/AnuncioCard';
import AnuncioFormDialog from '@/components/anuncios/AnuncioFormDialog';

const Anuncios = () => {
  const { isAdmin, isDocente, isEstudiante } = useUserRole();
  const { idUsuario } = useCurrentUsuario();
  const { anuncios, isLoading, createAnuncio, updateAnuncio, deleteAnuncio } = useAnuncios();
  
  // Enable realtime
  useAnunciosRealtime();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAnuncio, setSelectedAnuncio] = useState<Anuncio | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterCurso, setFilterCurso] = useState<string>('all');

  const canCreate = isAdmin || isDocente;

  // Fetch courses for filter
  const { data: cursos = [] } = useQuery({
    queryKey: ['cursos-for-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cursos')
        .select('id_curso, titulo')
        .order('titulo');

      if (error) throw error;
      return data;
    },
  });

  // Get enrolled courses for students
  const { data: inscripciones = [] } = useQuery({
    queryKey: ['inscripciones-usuario', idUsuario],
    queryFn: async () => {
      if (!idUsuario) return [];
      const { data, error } = await supabase
        .from('inscripciones')
        .select('id_curso')
        .eq('id_usuario', idUsuario);

      if (error) throw error;
      return data;
    },
    enabled: isEstudiante && !!idUsuario,
  });

  const enrolledCourseIds = inscripciones.map(i => i.id_curso);

  // Filter anuncios
  const filteredAnuncios = anuncios.filter((a) => {
    // For students: only show global or their courses
    if (isEstudiante) {
      if (a.id_curso !== null && !enrolledCourseIds.includes(a.id_curso)) {
        return false;
      }
    }

    // Course filter
    if (filterCurso === 'all') return true;
    if (filterCurso === 'global') return a.id_curso === null;
    return a.id_curso === filterCurso;
  });

  const handleCreate = () => {
    setSelectedAnuncio(null);
    setDialogOpen(true);
  };

  const handleEdit = (anuncio: Anuncio) => {
    setSelectedAnuncio(anuncio);
    setDialogOpen(true);
  };

  const handleSubmit = (data: AnuncioFormData) => {
    if (selectedAnuncio) {
      updateAnuncio.mutate(
        { id: selectedAnuncio.id_anuncio, ...data },
        { onSuccess: () => setDialogOpen(false) }
      );
    } else {
      createAnuncio.mutate(data, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteAnuncio.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
    }
  };

  const canEditAnuncio = (anuncio: Anuncio) => {
    if (isAdmin) return true;
    if (isDocente && anuncio.id_creador === idUsuario) return true;
    return false;
  };

  const canDeleteAnuncio = (anuncio: Anuncio) => {
    if (isAdmin) return true;
    if (isDocente && anuncio.id_creador === idUsuario) return true;
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Megaphone className="h-8 w-8 text-primary" />
            Anuncios
          </h1>
          <p className="text-muted-foreground mt-1">
            {canCreate 
              ? 'Gestiona los anuncios del cursillo' 
              : 'Mantente informado con los últimos anuncios'}
          </p>
        </div>
        {canCreate && (
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Anuncio
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filterCurso} onValueChange={setFilterCurso}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por curso" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="global">🌍 Globales</SelectItem>
            {cursos.map((curso) => (
              <SelectItem key={curso.id_curso} value={curso.id_curso}>
                📚 {curso.titulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Anuncios List */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Cargando anuncios...
        </div>
      ) : filteredAnuncios.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No hay anuncios disponibles</p>
          {canCreate && (
            <Button variant="outline" className="mt-4" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Crear primer anuncio
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
          {filteredAnuncios.map((anuncio) => (
            <AnuncioCard
              key={anuncio.id_anuncio}
              anuncio={anuncio}
              canEdit={canEditAnuncio(anuncio)}
              canDelete={canDeleteAnuncio(anuncio)}
              onEdit={handleEdit}
              onDelete={setDeleteId}
            />
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <AnuncioFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        anuncio={selectedAnuncio}
        onSubmit={handleSubmit}
        isLoading={createAnuncio.isPending || updateAnuncio.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar anuncio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El anuncio será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Anuncios;
