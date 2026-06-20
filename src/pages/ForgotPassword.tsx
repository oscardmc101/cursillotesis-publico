import { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Loader2, Mail, GraduationCap, ArrowLeft, CheckCircle2, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

type Step = 'email' | 'code' | 'success';

const TOTAL_DIGITS = 5;
const MAX_ATTEMPTS = 3;

const ForgotPassword = () => {
    const location = useLocation();
    const [step, setStep] = useState<Step>('email');

    // Step 1 — email
    const [email, setEmail] = useState((location.state?.email as string) || '');
    const [isSending, setIsSending] = useState(false);

    // Step 2 — code + new password
    const [digits, setDigits] = useState<string[]>(Array(TOTAL_DIGITS).fill(''));
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [attemptsDone, setAttemptsDone] = useState(0);
    const [blocked, setBlocked] = useState(false);
    const [expired, setExpired] = useState(false);

    // General error
    const [error, setError] = useState<string | null>(null);

    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // ── Step 1: send OTP code ─────────────────────────────────────────────────
    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setError('Ingresa un correo electrónico válido.');
            return;
        }

        setIsSending(true);
        try {
            const { error: fnError } = await supabase.functions.invoke('send-reset-code', {
                body: { email: email.trim().toLowerCase() },
            });

            if (fnError) throw new Error(fnError.message);

            setStep('code');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error al enviar el código.';
            setError(msg);
        } finally {
            setIsSending(false);
        }
    };

    // ── OTP digit input handling ──────────────────────────────────────────────
    const handleDigitChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return; // only digits
        const newDigits = [...digits];
        newDigits[index] = value.slice(-1); // keep only last char
        setDigits(newDigits);
        if (value && index < TOTAL_DIGITS - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleDigitKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !digits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleDigitPaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, TOTAL_DIGITS);
        if (!pasted) return;
        const newDigits = [...digits];
        for (let i = 0; i < pasted.length; i++) {
            newDigits[i] = pasted[i];
        }
        setDigits(newDigits);
        inputRefs.current[Math.min(pasted.length, TOTAL_DIGITS - 1)]?.focus();
    };

    const enteredCode = digits.join('');
    const isCodeComplete = enteredCode.length === TOTAL_DIGITS;

    // ── Step 2: validate code + update password ───────────────────────────────
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!isCodeComplete) {
            setError('Ingresa el código completo de 5 dígitos.');
            return;
        }
        if (newPassword.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setIsSubmitting(true);
        try {
            const { data, error: fnError } = await supabase.functions.invoke('reset-password-with-code', {
                body: { email: email.trim().toLowerCase(), code: enteredCode, newPassword },
            });

            if (fnError) {
                // Parse error from edge function body
                throw new Error(fnError.message || 'Error al restablecer la contraseña.');
            }

            if (data?.tooManyAttempts) {
                setBlocked(true);
                setError(data.error);
                return;
            }

            if (data?.expired) {
                setExpired(true);
                setError(data.error);
                return;
            }

            if (data?.error) {
                const remaining = data.remainingAttempts;
                const newAttempts = attemptsDone + 1;
                setAttemptsDone(newAttempts);

                if (remaining !== undefined) {
                    setError(`${data.error}`);
                } else {
                    setError(data.error);
                }

                if (newAttempts >= MAX_ATTEMPTS) {
                    setBlocked(true);
                }
                return;
            }

            // ✅ Success
            setStep('success');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error al restablecer la contraseña.';
            setError(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResendCode = () => {
        setDigits(Array(TOTAL_DIGITS).fill(''));
        setNewPassword('');
        setConfirmPassword('');
        setError(null);
        setAttemptsDone(0);
        setBlocked(false);
        setExpired(false);
        setStep('email');
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
            <Card className="w-full max-w-md">
                {/* Header */}
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
                        <GraduationCap className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold">
                        {step === 'email' && 'Recuperar Contraseña'}
                        {step === 'code' && 'Ingresar Código'}
                        {step === 'success' && '¡Listo!'}
                    </CardTitle>
                    <CardDescription>
                        {step === 'email' && 'Te enviaremos un código de verificación de 5 dígitos a tu correo.'}
                        {step === 'code' && (
                            <>Revisa tu correo <strong className="text-foreground">{email}</strong> e ingresa el código que recibiste.</>
                        )}
                        {step === 'success' && 'Tu contraseña fue actualizada correctamente.'}
                    </CardDescription>
                </CardHeader>

                {/* STEP: SUCCESS */}
                {step === 'success' && (
                    <CardContent>
                        <div className="flex flex-col items-center gap-4 py-4 text-center">
                            <div className="bg-green-500/10 p-4 rounded-full">
                                <CheckCircle2 className="h-12 w-12 text-green-500" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Ya puedes iniciar sesión con tu nueva contraseña.
                            </p>
                            <Link to="/login" className="w-full">
                                <Button className="w-full">Ir al inicio de sesión</Button>
                            </Link>
                        </div>
                    </CardContent>
                )}

                {/* STEP: EMAIL */}
                {step === 'email' && (
                    <form onSubmit={handleSendCode}>
                        <CardContent className="space-y-4">
                            {error && (
                                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
                                    {error}
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="email">Correo electrónico</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="tu@correo.com"
                                        className="pl-10"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-3">
                            <Button type="submit" className="w-full" disabled={isSending}>
                                {isSending ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando código...</>
                                ) : (
                                    'Enviar código de verificación'
                                )}
                            </Button>
                            <Link
                                to="/login"
                                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Volver al inicio de sesión
                            </Link>
                        </CardFooter>
                    </form>
                )}

                {/* STEP: CODE + NEW PASSWORD */}
                {step === 'code' && (
                    <form onSubmit={handleResetPassword}>
                        <CardContent className="space-y-5">
                            {/* Blocked or expired state */}
                            {(blocked || expired) ? (
                                <div className="flex flex-col items-center gap-3 text-center py-2">
                                    <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
                                        {error}
                                    </div>
                                    <Button type="button" variant="outline" className="w-full" onClick={handleResendCode}>
                                        Solicitar nuevo código
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    {error && (
                                        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20 flex justify-between items-start gap-2">
                                            <span>{error}</span>
                                            {attemptsDone > 0 && (
                                                <span className="shrink-0 text-xs opacity-70">
                                                    {MAX_ATTEMPTS - attemptsDone} intento{MAX_ATTEMPTS - attemptsDone === 1 ? '' : 's'} restante{MAX_ATTEMPTS - attemptsDone === 1 ? '' : 's'}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Intentos indicator */}
                                    {attemptsDone > 0 && !error && (
                                        <div className="flex gap-1 justify-center">
                                            {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`h-1.5 w-8 rounded-full transition-colors ${i < attemptsDone ? 'bg-destructive' : 'bg-muted'}`}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {/* OTP Digit Input */}
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-1">
                                            <ShieldCheck className="h-3.5 w-3.5" />
                                            Código de verificación
                                        </Label>
                                        <div className="flex gap-2 justify-center">
                                            {digits.map((digit, i) => (
                                                <input
                                                    key={i}
                                                    ref={(el) => { inputRefs.current[i] = el; }}
                                                    type="text"
                                                    inputMode="numeric"
                                                    maxLength={1}
                                                    value={digit}
                                                    onChange={(e) => handleDigitChange(i, e.target.value)}
                                                    onKeyDown={(e) => handleDigitKeyDown(i, e)}
                                                    onPaste={i === 0 ? handleDigitPaste : undefined}
                                                    className={`w-11 h-14 text-center text-2xl font-bold border-2 rounded-lg bg-background transition-colors outline-none
                            ${digit ? 'border-primary text-primary' : 'border-border text-foreground'}
                            focus:border-primary focus:ring-2 focus:ring-primary/20`}
                                                    autoFocus={i === 0}
                                                />
                                            ))}
                                        </div>
                                        <p className="text-xs text-muted-foreground text-center">
                                            El código expira en 15 minutos · Máximo {MAX_ATTEMPTS} intentos
                                        </p>
                                    </div>

                                    {/* New password */}
                                    <div className="space-y-2">
                                        <Label htmlFor="newPassword">Nueva contraseña</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="newPassword"
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder="Mínimo 6 caracteres"
                                                className="pl-10 pr-10"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Confirm password */}
                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="confirmPassword"
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder="Repite la contraseña"
                                                className="pl-10"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                required
                                            />
                                        </div>
                                        {confirmPassword && newPassword !== confirmPassword && (
                                            <p className="text-xs text-destructive">Las contraseñas no coinciden.</p>
                                        )}
                                    </div>
                                </>
                            )}
                        </CardContent>

                        {!blocked && !expired && (
                            <CardFooter className="flex flex-col gap-3">
                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={isSubmitting || !isCodeComplete}
                                >
                                    {isSubmitting ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verificando...</>
                                    ) : (
                                        'Cambiar contraseña'
                                    )}
                                </Button>
                                <button
                                    type="button"
                                    onClick={handleResendCode}
                                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                                >
                                    ¿No recibiste el código? Solicitar otro
                                </button>
                            </CardFooter>
                        )}
                    </form>
                )}
            </Card>
        </div>
    );
};

export default ForgotPassword;
