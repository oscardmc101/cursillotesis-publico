import { Clock, Mail } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface PendingUserBannerProps {
  variant?: 'full' | 'compact';
}

const PendingUserBanner = ({ variant = 'full' }: PendingUserBannerProps) => {
  if (variant === 'compact') {
    return (
      <div className="p-4 rounded-lg border border-warning/30 bg-warning/10 text-center">
        <div className="flex items-center justify-center gap-2 text-warning">
          <Clock className="h-5 w-5" />
          <span className="font-medium">Cuenta en espera de aprobación</span>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          ¡Gracias por registrarte! Tu cuenta está siendo revisada por nuestro equipo.
        </p>
      </div>
    );
  }

  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="p-4 rounded-full bg-warning/20">
            <Clock className="h-10 w-10 text-warning" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">¡Gracias por registrarte!</h2>
            <p className="text-muted-foreground max-w-md">
              Tu cuenta está siendo revisada por nuestro equipo docente. 
              En unos momentos recibirás la confirmación de aprobación.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-4 py-2 rounded-lg">
            <Mail className="h-4 w-4" />
            <span>Te notificaremos por email cuando tu cuenta sea aprobada</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PendingUserBanner;
