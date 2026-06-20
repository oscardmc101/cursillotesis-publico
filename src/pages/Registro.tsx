import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Mail, Lock, GraduationCap, User, Home, Building2, Phone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCursillo } from '@/contexts/CursilloContext';
import { registerSchema, RegisterFormData } from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

const Registro = () => {
  const { session, loading: authLoading, signUp } = useAuth();
  const { cursillos, cursilloActivo, setCursilloActivo, loading: cursilloLoading } = useCursillo();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      tipoRegistro: 'ESTUDIANTE',
      telefonoVisible: true,
    },
  });

  const tipoRegistro = watch('tipoRegistro');
  const telefonoVisible = watch('telefonoVisible');

  useEffect(() => {
    if (session && !authLoading) {
      navigate('/panel', { replace: true });
    }
  }, [session, authLoading, navigate]);

  const getErrorMessage = (errorMessage: string): string => {
    if (errorMessage.includes('User already registered')) {
      return 'Este correo ya está registrado. Intenta iniciar sesión.';
    }
    if (errorMessage.includes('Password should be at least')) {
      return 'La contraseña debe tener al menos 6 caracteres.';
    }
    if (errorMessage.includes('Unable to validate email')) {
      return 'El correo electrónico no es válido.';
    }
    if (errorMessage.includes('Signup requires a valid password')) {
      return 'Por favor ingresa una contraseña válida.';
    }
    return 'Error al registrarse. Por favor intenta de nuevo.';
  };

  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    setAuthError(null);

    if (!cursilloActivo) {
      setAuthError('Por favor selecciona un cursillo.');
      setIsSubmitting(false);
      return;
    }

    const { error } = await signUp(
      data.email,
      data.password,
      data.nombres,
      data.apellidos,
      data.tipoRegistro,
      cursilloActivo.id_cursillo,
      data.telefono?.trim() || undefined,
      data.telefonoVisible
    );

    if (error) {
      setAuthError(getErrorMessage(error.message));
      setIsSubmitting(false);
    }
  };

  if (authLoading || cursilloLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md space-y-4">
        <Button type="button" variant="ghost" className="px-0 text-muted-foreground hover:text-primary" asChild>
          <Link to="/">
            <Home className="mr-2 h-4 w-4" />
            Volver al inicio
          </Link>
        </Button>

        <Card className="w-full">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Crear Cuenta</CardTitle>
          <CardDescription>
            Regístrate en la plataforma E-Learning
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {authError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {authError}
              </div>
            )}

            {/* Cursillo selector */}
            {cursillos.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="cursillo-select-reg">Cursillo</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <Select
                    value={cursilloActivo?.id_cursillo || ''}
                    onValueChange={(value) => {
                      const selected = cursillos.find(c => c.id_cursillo === value);
                      if (selected) setCursilloActivo(selected);
                    }}
                  >
                    <SelectTrigger id="cursillo-select-reg" className="pl-10">
                      <SelectValue placeholder="Selecciona un cursillo" />
                    </SelectTrigger>
                    <SelectContent>
                      {cursillos.map((c) => (
                        <SelectItem key={c.id_cursillo} value={c.id_cursillo}>
                          {c.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombres">Nombre</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="nombres"
                    type="text"
                    placeholder="Juan"
                    className="pl-10"
                    {...register('nombres')}
                  />
                </div>
                {errors.nombres && (
                  <p className="text-sm text-destructive">{errors.nombres.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="apellidos">Apellido</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="apellidos"
                    type="text"
                    placeholder="Pérez"
                    className="pl-10"
                    {...register('apellidos')}
                  />
                </div>
                {errors.apellidos && (
                  <p className="text-sm text-destructive">{errors.apellidos.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@correo.com"
                  className="pl-10"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono (opcional)</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="telefono"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+595 981 123456"
                  className="pl-10"
                  {...register('telefono')}
                />
              </div>
              {errors.telefono && (
                <p className="text-sm text-destructive">{errors.telefono.message}</p>
              )}
              <div className="flex items-start gap-3 rounded-md border border-border/60 p-3">
                <Checkbox
                  id="telefonoVisible"
                  checked={telefonoVisible === true}
                  onCheckedChange={(checked) =>
                    setValue('telefonoVisible', checked === true, { shouldDirty: true })
                  }
                  className="mt-0.5"
                />
                <Label htmlFor="telefonoVisible" className="cursor-pointer font-normal leading-snug">
                  Mostrar mi teléfono en mi perfil
                </Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••"
                  className="pl-10"
                  {...register('password')}
                />
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••"
                  className="pl-10"
                  {...register('confirmPassword')}
                />
              </div>
              {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>
            <div className="space-y-3">
              <Label>Registrarme como</Label>
              <RadioGroup
                value={tipoRegistro}
                onValueChange={(value) => setValue('tipoRegistro', value as 'ESTUDIANTE' | 'DOCENTE')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ESTUDIANTE" id="estudiante" />
                  <Label htmlFor="estudiante" className="font-normal cursor-pointer">
                    Estudiante
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="DOCENTE" id="docente" />
                  <Label htmlFor="docente" className="font-normal cursor-pointer">
                    Docente
                  </Label>
                </div>
              </RadioGroup>
              {errors.tipoRegistro && (
                <p className="text-sm text-destructive">{errors.tipoRegistro.message}</p>
              )}
            </div>
            </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                'Crear Cuenta'
              )}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Inicia sesión
              </Link>
            </p>
          </CardFooter>
        </form>
        </Card>
      </div>
    </div>
  );
};

export default Registro;
