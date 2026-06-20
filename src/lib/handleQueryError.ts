import { toast } from 'sonner';

/**
 * Muestra un toast de error y registra el error en consola.
 * Uso en hooks de datos para reemplazar `console.error` solo.
 */
export function handleQueryError(label: string, error: unknown): void {
    console.error(`Error ${label}:`, error);

    const message =
        error instanceof Error
            ? error.message
            : typeof error === 'object' && error !== null && 'message' in error
                ? String((error as { message: unknown }).message)
                : 'Error inesperado';

    toast.error(`Error al ${label}`, {
        description: message,
        duration: 5000,
    });
}
