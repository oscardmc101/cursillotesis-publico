import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { GrupoCurso } from '@/hooks/useGruposCursos';
import { useCursillo } from '@/contexts/CursilloContext';



const cursoSchema = z.object({
  titulo: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
  descripcion: z.string().optional(),
  es_publicado: z.boolean(),
  id_docente: z.string().optional(),
  docentes_ayudantes: z.array(z.string()).optional(),
  id_grupo_curso: z.string().optional(),
  requiere_password: z.boolean(),
  password: z.string().optional(),
});

type CursoFormData = z.infer<typeof cursoSchema>;

interface Docente {
  id_usuario: string;
  nombres: string | null;
  apellidos: string | null;
  nombre_rol: string | null;
  email?: string | null;
}

interface CursoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  curso?: {
    id_curso: string;
    titulo: string;
    descripcion: string | null;
    es_publicado: boolean;
    id_docente: string | null;
    id_grupo_curso?: string | null;
    requiere_password?: boolean;
  } | null;
  isAdmin: boolean;
  currentIdUsuario: string | null;
  grupos?: GrupoCurso[];
  canManageCollaborators?: boolean;
  onSuccess: () => void;
}

const CursoFormDialog = ({
  open,
  onOpenChange,
  curso,
  isAdmin,
  currentIdUsuario,
  grupos = [],
  canManageCollaborators,
  onSuccess,
}: CursoFormDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [showCoursePassword, setShowCoursePassword] = useState(false);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [originalAyudantes, setOriginalAyudantes] = useState<string[]>([]);
  const { idCursilloActivo: CURSILLO_ID } = useCursillo();
  const isEditing = !!curso;
  const canManageAyudantes = canManageCollaborators ?? (isAdmin || (!curso && Boolean(currentIdUsuario)) || curso?.id_docente === currentIdUsuario);

  const form = useForm<CursoFormData>({
    resolver: zodResolver(cursoSchema),
    defaultValues: {
      titulo: '',
      descripcion: '',
      es_publicado: false,
      id_docente: '',
      docentes_ayudantes: [],
      id_grupo_curso: '',
      requiere_password: false,
      password: '',
    },
  });

  const requierePassword = form.watch('requiere_password');

  useEffect(() => {
    if (open) {
      setShowCoursePassword(false);
      if (curso) {
        form.reset({
          titulo: curso.titulo,
          descripcion: curso.descripcion || '',
          es_publicado: curso.es_publicado,
          id_docente: curso.id_docente || '',
          docentes_ayudantes: [],
          id_grupo_curso: curso.id_grupo_curso || '',
          requiere_password: curso.requiere_password ?? false,
          password: '',
        });
      } else {
        form.reset({
          titulo: '',
          descripcion: '',
          es_publicado: false,
          id_docente: isAdmin ? '' : currentIdUsuario || '',
          docentes_ayudantes: [],
          id_grupo_curso: grupos[0]?.id_grupo_curso || '',
          requiere_password: false,
          password: '',
        });
        setOriginalAyudantes([]);
      }
    }
  }, [open, curso, form, isAdmin, currentIdUsuario, grupos]);

  useEffect(() => {
    const fetchDocentes = async () => {
      if (!canManageAyudantes && !isAdmin) return;

      const { data, error } = await supabase.rpc('rpc_list_usuarios_cursillo', {
        p_id_cursillo: CURSILLO_ID,
      });

      if (!error && data) {
        const docentesList = data
          .filter((usuario) => usuario.estado === 'ACTIVO')
          .filter((usuario) => usuario.nombre_rol === 'DOCENTE' || usuario.nombre_rol === 'ADMINISTRADOR')
          .map((usuario) => ({
            id_usuario: usuario.id_usuario,
            nombres: usuario.nombres,
            apellidos: usuario.apellidos,
            nombre_rol: usuario.nombre_rol,
            email: usuario.email,
          }));
        setDocentes(docentesList);
      }
    };

    if (open && (canManageAyudantes || isAdmin)) {
      fetchDocentes();
    }
  }, [open, isAdmin, canManageAyudantes]);

  useEffect(() => {
    const fetchAyudantes = async () => {
      if (!open || !curso?.id_curso) return;

      const { data, error } = await supabase
        .from('curso_docentes_colaboradores')
        .select('id_docente')
        .eq('id_curso', curso.id_curso);

      if (!error && data) {
        const ids = data.map((item) => item.id_docente);
        form.setValue('docentes_ayudantes', ids);
        setOriginalAyudantes(ids);
      }
    };

    fetchAyudantes();
  }, [open, curso?.id_curso, form]);

  const onSubmit = async (data: CursoFormData) => {
    const mustProvidePassword = data.requiere_password && (!isEditing || !curso?.requiere_password);
    if (mustProvidePassword && !data.password?.trim()) {
      form.setError('password', { message: 'La contraseña es obligatoria' });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        titulo: data.titulo,
        descripcion: data.descripcion || null,
        es_publicado: data.es_publicado,
        id_docente: isAdmin ? (data.id_docente || null) : (isEditing ? curso?.id_docente ?? currentIdUsuario : currentIdUsuario),
        id_grupo_curso: data.id_grupo_curso || null,
        id_cursillo: CURSILLO_ID,
      };

      let cursoIdToNotify = curso?.id_curso;

      if (isEditing && curso) {
        const { error } = await supabase
          .from('cursos')
          .update(payload)
          .eq('id_curso', curso.id_curso);

        if (error) throw error;

        const password = data.password?.trim();
        if (data.requiere_password === false || password) {
          const { error: passwordError } = await supabase.rpc('rpc_set_curso_password', {
            p_id_curso: curso.id_curso,
            p_requiere_password: data.requiere_password,
            p_password: password || null,
          });

          if (passwordError) throw passwordError;
        }

        if (canManageAyudantes) {
          const { error: colaboradoresError } = await supabase.rpc('rpc_set_curso_colaboradores', {
            p_id_curso: curso.id_curso,
            p_docente_ids: data.docentes_ayudantes || [],
          });

          if (colaboradoresError) throw colaboradoresError;
        }

        toast({ title: 'Curso actualizado correctamente' });
      } else {
        const { data: cursoCreado, error } = await supabase
          .from('cursos')
          .insert(payload)
          .select('id_curso')
          .single();

        if (error) throw error;
        cursoIdToNotify = cursoCreado.id_curso;

        if (data.requiere_password && cursoCreado?.id_curso) {
          const { error: passwordError } = await supabase.rpc('rpc_set_curso_password', {
            p_id_curso: cursoCreado.id_curso,
            p_requiere_password: true,
            p_password: data.password?.trim() || null,
          });

          if (passwordError) throw passwordError;
        }

        if (canManageAyudantes && cursoCreado?.id_curso) {
          const { error: colaboradoresError } = await supabase.rpc('rpc_set_curso_colaboradores', {
            p_id_curso: cursoCreado.id_curso,
            p_docente_ids: data.docentes_ayudantes || [],
          });

          if (colaboradoresError) throw colaboradoresError;
        }

        toast({ title: 'Curso creado correctamente' });
      }

      // Enviar correos a los NUEVOS ayudantes (fire-and-forget)
      if (canManageAyudantes && data.docentes_ayudantes && cursoIdToNotify) {
        const nuevosAyudantes = data.docentes_ayudantes.filter(id => !originalAyudantes.includes(id));

        for (const idDocente of nuevosAyudantes) {
          const docente = docentes.find(d => d.id_usuario === idDocente);
          if (docente && docente.email) {
            supabase.functions.invoke('send-colaborador-email', {
              body: {
                email: docente.email,
                nombres: `${docente.nombres || ''} ${docente.apellidos || ''}`.trim() || 'Docente',
                cursoTitulo: data.titulo,
              },
            }).catch(err => console.error('Error sending email to', docente.email, err));
          }
        }
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : (error as any)?.message || 'No se pudo guardar el curso';
      console.error('Error saving curso:', error);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Curso' : 'Nuevo Curso'}
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
                    <Input placeholder="Nombre del curso" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe el contenido del curso..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isAdmin && (
              <FormField
                control={form.control}
                name="id_docente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Docente</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                      value={field.value || 'none'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar docente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Sin asignar</SelectItem>
                        {docentes.map((docente) => (
                          <SelectItem
                            key={docente.id_usuario}
                            value={docente.id_usuario}
                          >
                            {docente.nombres} {docente.apellidos}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {canManageAyudantes && (
              <FormField
                control={form.control}
                name="docentes_ayudantes"
                render={({ field }) => {
                  const ownerId = form.watch('id_docente') || curso?.id_docente || currentIdUsuario || '';
                  const docentesDisponibles = docentes.filter((docente) =>
                    docente.nombre_rol === 'DOCENTE' && docente.id_usuario !== ownerId
                  );

                  return (
                    <FormItem>
                      <FormLabel>Docentes ayudantes</FormLabel>
                      <div className="rounded-md border p-3 space-y-2 max-h-40 overflow-y-auto">
                        {docentesDisponibles.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No hay docentes activos disponibles para asignar.
                          </p>
                        ) : (
                          docentesDisponibles.map((docente) => {
                            const checked = field.value?.includes(docente.id_usuario) ?? false;
                            const nombre = `${docente.nombres || ''} ${docente.apellidos || ''}`.trim() || 'Docente sin nombre';

                            return (
                              <label
                                key={docente.id_usuario}
                                className="flex items-center gap-2 text-sm cursor-pointer"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(value) => {
                                    const current = field.value || [];
                                    field.onChange(
                                      value
                                        ? [...current, docente.id_usuario]
                                        : current.filter((id) => id !== docente.id_usuario)
                                    );
                                  }}
                                />
                                <span>{nombre}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Solo usuarios con rol DOCENTE activo pueden ser ayudantes.
                      </p>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            )}

            <FormField
              control={form.control}
              name="id_grupo_curso"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grupo</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                    value={field.value || 'none'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar grupo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Sin grupo</SelectItem>
                      {grupos.map((grupo) => (
                        <SelectItem key={grupo.id_grupo_curso} value={grupo.id_grupo_curso}>
                          {grupo.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="es_publicado"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel className="text-base">Publicar curso</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Los estudiantes podrán ver e inscribirse
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

            <FormField
              control={form.control}
              name="requiere_password"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel className="text-base">Requerir contraseña</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Los estudiantes deberán ingresarla para inscribirse.
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

            {requierePassword && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {isEditing && curso?.requiere_password
                        ? 'Nueva contraseña del curso'
                        : 'Contraseña del curso'}
                    </FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={showCoursePassword ? 'text' : 'password'}
                          placeholder={isEditing && curso?.requiere_password ? 'Dejar vacío para mantenerla' : 'Contraseña de acceso'}
                          autoComplete="new-password"
                          className="pr-10"
                          {...field}
                        />
                      </FormControl>
                      <button
                        type="button"
                        aria-label={showCoursePassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                        onClick={() => setShowCoursePassword((show) => !show)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showCoursePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CursoFormDialog;
