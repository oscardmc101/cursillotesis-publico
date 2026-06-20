import { useEffect, useState } from 'react';
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
import { GrupoCurso } from '@/hooks/useGruposCursos';
import { Eye, EyeOff } from 'lucide-react';

const grupoSchema = z.object({
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  descripcion: z.string().optional(),
  es_activo: z.boolean(),
  requiere_password: z.boolean(),
  password: z.string().optional(),
});

export type GrupoCursoDialogData = z.infer<typeof grupoSchema>;

interface GrupoCursoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grupo?: GrupoCurso | null;
  onSubmit: (data: GrupoCursoDialogData) => void;
  isLoading?: boolean;
}

export function GrupoCursoDialog({
  open,
  onOpenChange,
  grupo,
  onSubmit,
  isLoading,
}: GrupoCursoDialogProps) {
  const isEditing = !!grupo;
  const [showGroupPassword, setShowGroupPassword] = useState(false);

  const form = useForm<GrupoCursoDialogData>({
    resolver: zodResolver(grupoSchema),
    defaultValues: {
      nombre: '',
      descripcion: '',
      es_activo: true,
      requiere_password: false,
      password: '',
    },
  });

  const requierePassword = form.watch('requiere_password');

  useEffect(() => {
    if (!open) return;

    setShowGroupPassword(false);
    form.reset({
      nombre: grupo?.nombre || '',
      descripcion: grupo?.descripcion || '',
      es_activo: grupo?.es_activo ?? true,
      requiere_password: grupo?.requiere_password ?? false,
      password: '',
    });
  }, [form, grupo, open]);

  const handleSubmit = (data: GrupoCursoDialogData) => {
    const mustProvidePassword = data.requiere_password && (!isEditing || !grupo?.requiere_password);
    if (mustProvidePassword && !data.password?.trim()) {
      form.setError('password', { message: 'La contraseña es obligatoria' });
      return;
    }

    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar grupo' : 'Nuevo grupo'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Cursillo Politecnica" {...field} />
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
                  <FormLabel>Descripcion</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descripcion del grupo de cursos..."
                      className="min-h-[90px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="es_activo"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel className="text-base">Grupo activo</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Los cursos publicados de este grupo se muestran a estudiantes.
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
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
                      Los estudiantes deberán ingresarla para inscribirse a cursos del grupo.
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
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
                      {isEditing && grupo?.requiere_password
                        ? 'Nueva contraseña del grupo'
                        : 'Contraseña del grupo'}
                    </FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={showGroupPassword ? 'text' : 'password'}
                          placeholder={isEditing && grupo?.requiere_password ? 'Dejar vacío para mantenerla' : 'Contraseña de acceso'}
                          autoComplete="new-password"
                          className="pr-10"
                          {...field}
                        />
                      </FormControl>
                      <button
                        type="button"
                        aria-label={showGroupPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                        onClick={() => setShowGroupPassword((show) => !show)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showGroupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
