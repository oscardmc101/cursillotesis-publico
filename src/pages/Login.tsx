import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Mail, Lock, GraduationCap, KeyRound, AlertCircle, Clock, Ban, Home, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCursillo } from '@/contexts/CursilloContext';
import { loginSchema, LoginFormData } from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

type ErrorType = 'invalid_credentials' | 'pending' | 'blocked' | 'not_found' | 'not_in_cursillo' | 'generic' | null;

const Login = () => {
  const { session, loading: authLoading, signIn, signOut } = useAuth();
  const { cursillos, cursilloActivo, setCursilloActivo, loading: cursilloLoading } = useCursillo();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<ErrorType>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [isRequestingAccess, setIsRequestingAccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const emailValue = watch('email');

  useEffect(() => {
    if (session && !authLoading) {
      navigate('/panel', { replace: true });
    }
  }, [session, authLoading, navigate]);

  const handleRequestAccess = async () => {
    if (!pendingUserId || !cursilloActivo) return;
    setIsRequestingAccess(true);
    try {
      const { error } = await supabase
        .from('usuarios_cursillos')
        .insert({
          id_usuario: pendingUserId,
          id_cursillo: cursilloActivo.id_cursillo,
          id_rol: 3, // ESTUDIANTE by default
          estado: 'PENDIENTE',
        });

      if (error) {
        if (error.code === '23505') {
          // Already exists (race condition)
          setAuthError('Ya tienes una solicitud pendiente para este cursillo.');
          setErrorType('pending');
        } else {
          console.error('Error requesting access:', error);
          setAuthError('Error al solicitar acceso. Por favor intenta de nuevo.');
          setErrorType('generic');
        }
      } else {
        setAuthError('¡Solicitud enviada! Tu cuenta está pendiente de aprobación por un administrador. Podrás ingresar una vez que tu solicitud sea aprobada.');
        setErrorType('pending');
        setPendingUserId(null);
      }
    } catch (err) {
      console.error('Error in handleRequestAccess:', err);
      setAuthError('Error al solicitar acceso. Por favor intenta de nuevo.');
      setErrorType('generic');
    } finally {
      setIsRequestingAccess(false);
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    setAuthError(null);
    setErrorType(null);
    setPendingUserId(null);

    if (!cursilloActivo) {
      setAuthError('Por favor selecciona un cursillo.');
      setErrorType('generic');
      setIsSubmitting(false);
      return;
    }

    const { error } = await signIn(data.email, data.password);

    if (error) {
      const msg = error.message;
      if (msg.includes('Invalid login credentials')) {
        setErrorType('invalid_credentials');
        setAuthError('Credenciales incorrectas. Verifica tu correo y contraseña.');
      } else if (msg.includes('Too many requests')) {
        setErrorType('generic');
        setAuthError('Demasiados intentos. Por favor espera unos minutos.');
      } else {
        setErrorType('generic');
        setAuthError('Error al iniciar sesión. Por favor intenta de nuevo.');
      }
      setIsSubmitting(false);
      return;
    }

    // Login exitoso en Supabase Auth — verificar estado en el cursillo seleccionado
    try {
      const sessionData = await supabase.auth.getSession();
      const authUserId = sessionData.data.session?.user.id;

      if (authUserId) {
        // Fetch estado del usuario en el cursillo seleccionado
        const { data: usuarioData } = await supabase
          .from('usuarios')
          .select('id_usuario')
          .eq('id_auth', authUserId)
          .maybeSingle();

        if (usuarioData?.id_usuario) {
          const { data: cursilloData } = await supabase
            .from('usuarios_cursillos')
            .select('estado')
            .eq('id_usuario', usuarioData.id_usuario)
            .eq('id_cursillo', cursilloActivo.id_cursillo)
            .maybeSingle();

          if (!cursilloData) {
            // User exists but NOT in this cursillo
            await signOut();
            setPendingUserId(usuarioData.id_usuario);
            setErrorType('not_in_cursillo');
            setAuthError(`Tus credenciales son correctas, pero no estás registrado en "${cursilloActivo.nombre}". ¿Deseas enviar una solicitud de inscripción?`);
            setIsSubmitting(false);
            return;
          }

          const estado = (cursilloData?.estado ?? '').toUpperCase();

          if (estado === 'RECHAZADO') {
            await signOut();
            setErrorType('blocked');
            setAuthError('Tu solicitud de acceso fue rechazada. Por favor, ponte en contacto con algún docente para más información.');
            setIsSubmitting(false);
            return;
          }

          if (estado === 'BLOQUEADO') {
            await signOut();
            setErrorType('blocked');
            setAuthError('Tu cuenta ha sido bloqueada. Contacta con la administración para más información.');
            setIsSubmitting(false);
            return;
          }

          // PENDIENTE o ACTIVO → dejar que el useEffect redirija al dashboard.
          // Si es PENDIENTE, el Dashboard mostrará el banner "¡Gracias por registrarte!".
        }
      }
    } catch (checkErr) {
      // Si falla la verificación, dejamos que el flujo normal continúe
      console.error('Error checking user state after login:', checkErr);
    }

    // Todo OK — la redirección ocurre via el useEffect que escucha session
    setIsSubmitting(false);
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
          <CardTitle className="text-2xl font-bold">Iniciar Sesión</CardTitle>
          <CardDescription>
            Ingresa a la plataforma E-Learning
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {/* Cursillo selector */}
            {cursillos.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="cursillo-select">Cursillo</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <Select
                    value={cursilloActivo?.id_cursillo || ''}
                    onValueChange={(value) => {
                      const selected = cursillos.find(c => c.id_cursillo === value);
                      if (selected) {
                        setCursilloActivo(selected);
                        setAuthError(null);
                        setErrorType(null);
                        setPendingUserId(null);
                      }
                    }}
                  >
                    <SelectTrigger id="cursillo-select" className="pl-10">
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

            {/* Error messages with contextual actions */}
            {authError && (
              <div className={`p-3 rounded-lg text-sm flex flex-col gap-2 ${errorType === 'pending'
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                : errorType === 'not_in_cursillo'
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                  : errorType === 'blocked'
                    ? 'bg-destructive/10 text-destructive border border-destructive/20'
                    : 'bg-destructive/10 text-destructive border border-destructive/20'
                }`}>
                <div className="flex items-start gap-2">
                  {errorType === 'pending' ? (
                    <Clock className="h-4 w-4 mt-0.5 shrink-0" />
                  ) : errorType === 'blocked' ? (
                    <Ban className="h-4 w-4 mt-0.5 shrink-0" />
                  ) : errorType === 'not_in_cursillo' ? (
                    <Building2 className="h-4 w-4 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  )}
                  <span>{authError}</span>
                </div>
                {errorType === 'pending' && (
                  <p className="text-xs opacity-75 pl-6">Si tienes dudas, contacta con la administración del cursillo.</p>
                )}
                {errorType === 'invalid_credentials' && (
                  <Link
                    to="/recuperar-contrasena"
                    state={{ email: emailValue }}
                    className="pl-6 text-xs font-medium hover:underline flex items-center gap-1"
                  >
                    <KeyRound className="h-3 w-3" />
                    ¿Olvidaste tu contraseña? Recuperar contraseña
                  </Link>
                )}
                {errorType === 'not_in_cursillo' && pendingUserId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="ml-6 w-fit text-xs"
                    onClick={handleRequestAccess}
                    disabled={isRequestingAccess}
                  >
                    {isRequestingAccess ? (
                      <>
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      'Sí, solicitar inscripción'
                    )}
                  </Button>
                )}
                {errorType === 'not_found' && (
                  <Link
                    to="/registro"
                    className="pl-6 text-xs font-medium hover:underline"
                  >
                    Regístrate aquí
                  </Link>
                )}
              </div>
            )}

            {/* 1. Correo electrónico */}
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

            {/* 2. Contraseña */}
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

            {/* 3. Enlace "Olvidé contraseña" */}
            <div className="flex justify-end">
              <Link
                to="/recuperar-contrasena"
                state={{ email: emailValue }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                <KeyRound className="h-3.5 w-3.5" />
                ¿Olvidaste tu contraseña? Recuperar contraseña
              </Link>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            {/* 4. Botón */}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ingresando...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>

            {/* 5. Registro */}
            <p className="text-sm text-muted-foreground text-center">
              ¿No tienes cuenta?{' '}
              <Link to="/registro" className="text-primary hover:underline font-medium">
                Regístrate aquí
              </Link>
            </p>
          </CardFooter>
        </form>
        </Card>
      </div>
    </div>
  );
};

export default Login;
