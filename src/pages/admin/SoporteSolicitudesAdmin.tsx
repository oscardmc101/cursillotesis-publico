import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  ImageIcon,
  Loader2,
  RefreshCw,
  Wrench,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCursillo } from '@/contexts/CursilloContext';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

type EstadoSoporte = 'PENDIENTE' | 'EN_REVISION' | 'RESUELTO' | 'DESCARTADO';
type TipoSoporte = 'ERROR' | 'MEJORA';

interface SoporteUsuario {
  correo: string | null;
  nombres: string | null;
  apellidos: string | null;
}

interface SolicitudSoporte {
  id_solicitud: string;
  id_usuario: string;
  nombre_usuario: string;
  telefono: string;
  tipo_solicitud: TipoSoporte;
  descripcion: string;
  imagen_bucket: string | null;
  imagen_path: string | null;
  imagen_nombre: string | null;
  imagen_tipo_mime: string | null;
  imagen_tamano_bytes: number | null;
  estado: EstadoSoporte;
  email_notificado: boolean;
  fecha_email_notificado: string | null;
  fecha_solicitud: string;
  fecha_resolucion: string | null;
  resolucion_notificada: boolean;
  fecha_resolucion_notificada: string | null;
  resolucion_email_notificado: boolean;
  fecha_resolucion_email_notificado: string | null;
  usuarios: SoporteUsuario | SoporteUsuario[] | null;
}

const getRelationObject = <T,>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
};

const formatDateTime = (value: string | null) => {
  if (!value) return 'Sin fecha';
  return new Date(value).toLocaleString('es-PY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getTipoLabel = (tipo: TipoSoporte) => (tipo === 'ERROR' ? 'Error' : 'Mejora');

const getEstadoLabel = (estado: EstadoSoporte) => {
  switch (estado) {
    case 'PENDIENTE':
      return 'Pendiente';
    case 'EN_REVISION':
      return 'En revision';
    case 'RESUELTO':
      return 'Resuelto';
    case 'DESCARTADO':
      return 'Descartado';
    default:
      return estado;
  }
};

const getEstadoVariant = (estado: EstadoSoporte) => {
  switch (estado) {
    case 'RESUELTO':
      return 'secondary';
    case 'DESCARTADO':
      return 'destructive';
    case 'EN_REVISION':
      return 'default';
    default:
      return 'outline';
  }
};

const SoporteSolicitudesAdmin = () => {
  const { idCursilloActivo } = useCursillo();
  const { toast } = useToast();
  const [solicitudes, setSolicitudes] = useState<SolicitudSoporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [openingEvidenceId, setOpeningEvidenceId] = useState<string | null>(null);

  const fetchSolicitudes = async (silent = false) => {
    if (!idCursilloActivo) {
      setSolicitudes([]);
      setLoading(false);
      return;
    }

    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const { data, error } = await supabase
      .from('soporte_solicitudes')
      .select(`
        id_solicitud,
        id_usuario,
        nombre_usuario,
        telefono,
        tipo_solicitud,
        descripcion,
        imagen_bucket,
        imagen_path,
        imagen_nombre,
        imagen_tipo_mime,
        imagen_tamano_bytes,
        estado,
        email_notificado,
        fecha_email_notificado,
        fecha_solicitud,
        fecha_resolucion,
        resolucion_notificada,
        fecha_resolucion_notificada,
        resolucion_email_notificado,
        fecha_resolucion_email_notificado,
        usuarios:id_usuario(correo,nombres,apellidos)
      `)
      .eq('id_cursillo', idCursilloActivo)
      .order('fecha_solicitud', { ascending: false });

    if (error) {
      console.error('Error fetching support requests:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las solicitudes de soporte.',
        variant: 'destructive',
      });
    } else {
      setSolicitudes((data || []) as SolicitudSoporte[]);
    }

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchSolicitudes();
  }, [idCursilloActivo]);

  const counts = useMemo(() => {
    return solicitudes.reduce(
      (acc, solicitud) => {
        acc.total += 1;
        acc[solicitud.estado] += 1;
        return acc;
      },
      { total: 0, PENDIENTE: 0, EN_REVISION: 0, RESUELTO: 0, DESCARTADO: 0 },
    );
  }, [solicitudes]);

  const handleMarkEnRevision = async (solicitud: SolicitudSoporte) => {
    setReviewingId(solicitud.id_solicitud);

    const { error } = await supabase
      .from('soporte_solicitudes')
      .update({ estado: 'EN_REVISION' })
      .eq('id_solicitud', solicitud.id_solicitud);

    if (error) {
      console.error('Error updating support request:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado.',
        variant: 'destructive',
      });
    } else {
      setSolicitudes((prev) =>
        prev.map((item) =>
          item.id_solicitud === solicitud.id_solicitud
            ? { ...item, estado: 'EN_REVISION' }
            : item,
        ),
      );
      toast({
        title: 'Estado actualizado',
        description: 'La solicitud quedo marcada como en revision.',
      });
    }

    setReviewingId(null);
  };

  const handleResolver = async (solicitud: SolicitudSoporte) => {
    setResolvingId(solicitud.id_solicitud);

    const { data, error } = await supabase.functions.invoke('resolver-soporte-solicitud', {
      body: { solicitudId: solicitud.id_solicitud },
    });

    if (error || data?.error) {
      console.error('Error resolving support request:', error || data?.error);
      toast({
        title: 'Error',
        description: data?.error || error?.message || 'No se pudo resolver la solicitud.',
        variant: 'destructive',
      });
    } else {
      const updated = data?.solicitud ?? {};
      setSolicitudes((prev) =>
        prev.map((item) =>
          item.id_solicitud === solicitud.id_solicitud
            ? {
                ...item,
                estado: 'RESUELTO',
                fecha_resolucion: updated.fecha_resolucion ?? new Date().toISOString(),
                resolucion_notificada: updated.resolucion_notificada ?? true,
                fecha_resolucion_notificada:
                  updated.fecha_resolucion_notificada ?? new Date().toISOString(),
                resolucion_email_notificado:
                  updated.resolucion_email_notificado ?? data?.emailSent ?? false,
                fecha_resolucion_email_notificado:
                  updated.fecha_resolucion_email_notificado ?? item.fecha_resolucion_email_notificado,
              }
            : item,
        ),
      );

      toast({
        title: 'Solicitud resuelta',
        description: data?.emailSent
          ? 'Se notifico al usuario por correo y en la plataforma.'
          : 'Se notifico al usuario en la plataforma, pero no se pudo confirmar el envio del correo.',
      });
    }

    setResolvingId(null);
  };

  const handleOpenEvidence = async (solicitud: SolicitudSoporte) => {
    if (!solicitud.imagen_bucket || !solicitud.imagen_path) return;

    setOpeningEvidenceId(solicitud.id_solicitud);

    const { data, error } = await supabase.storage
      .from(solicitud.imagen_bucket)
      .createSignedUrl(solicitud.imagen_path, 60 * 60);

    if (error || !data?.signedUrl) {
      console.error('Error opening support evidence:', error);
      toast({
        title: 'Error',
        description: 'No se pudo abrir la imagen adjunta.',
        variant: 'destructive',
      });
    } else {
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    }

    setOpeningEvidenceId(null);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex min-h-[220px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              Solicitudes recibidas
            </CardTitle>
            <CardDescription>
              Panel visible solo para administradores del cursillo activo.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={refreshing}
            onClick={() => fetchSolicitudes(true)}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Actualizar
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-4">
          <div className="rounded-md border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-xl font-semibold">{counts.total}</p>
          </div>
          <div className="rounded-md border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Pendientes</p>
            <p className="text-xl font-semibold">{counts.PENDIENTE}</p>
          </div>
          <div className="rounded-md border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">En revision</p>
            <p className="text-xl font-semibold">{counts.EN_REVISION}</p>
          </div>
          <div className="rounded-md border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Resueltas</p>
            <p className="text-xl font-semibold">{counts.RESUELTO}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {solicitudes.length === 0 ? (
          <div className="flex min-h-[160px] flex-col items-center justify-center rounded-md border border-dashed text-center">
            <Wrench className="mb-3 h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">Todavia no hay solicitudes de soporte.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Solicitud</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Notificacion</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {solicitudes.map((solicitud) => {
                  const usuario = getRelationObject(solicitud.usuarios);
                  const isResolved = solicitud.estado === 'RESUELTO';
                  const hasEvidence = Boolean(solicitud.imagen_bucket && solicitud.imagen_path);
                  const isResolving = resolvingId === solicitud.id_solicitud;
                  const isReviewing = reviewingId === solicitud.id_solicitud;
                  const isOpeningEvidence = openingEvidenceId === solicitud.id_solicitud;
                  const canRetryAviso =
                    isResolved &&
                    (!solicitud.resolucion_notificada || !solicitud.resolucion_email_notificado);

                  return (
                    <TableRow key={solicitud.id_solicitud}>
                      <TableCell className="min-w-[280px] align-top">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={solicitud.tipo_solicitud === 'ERROR' ? 'destructive' : 'secondary'}>
                              {getTipoLabel(solicitud.tipo_solicitud)}
                            </Badge>
                            {hasEvidence && (
                              <Badge variant="outline" className="gap-1">
                                <ImageIcon className="h-3 w-3" />
                                Imagen
                              </Badge>
                            )}
                          </div>
                          <p className="line-clamp-3 text-sm text-muted-foreground">
                            {solicitud.descripcion}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[220px] align-top">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{solicitud.nombre_usuario}</p>
                          <p className="text-xs text-muted-foreground">{usuario?.correo || 'Sin correo'}</p>
                          <p className="text-xs text-muted-foreground">{solicitud.telefono}</p>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant={getEstadoVariant(solicitud.estado)}>
                          {getEstadoLabel(solicitud.estado)}
                        </Badge>
                        {isResolved && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            {formatDateTime(solicitud.fecha_resolucion)}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="min-w-[140px] align-top text-sm">
                        {formatDateTime(solicitud.fecha_solicitud)}
                      </TableCell>
                      <TableCell className="min-w-[180px] align-top">
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p
                            className={cn(
                              'flex items-center gap-1',
                              solicitud.resolucion_notificada && 'text-emerald-600 dark:text-emerald-400',
                            )}
                          >
                            {solicitud.resolucion_notificada && <CheckCircle2 className="h-3.5 w-3.5" />}
                            Web: {solicitud.resolucion_notificada ? 'enviada' : 'pendiente'}
                          </p>
                          <p
                            className={cn(
                              'flex items-center gap-1',
                              solicitud.resolucion_email_notificado && 'text-emerald-600 dark:text-emerald-400',
                            )}
                          >
                            {solicitud.resolucion_email_notificado && <CheckCircle2 className="h-3.5 w-3.5" />}
                            Correo: {solicitud.resolucion_email_notificado ? 'enviado' : 'pendiente'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[220px] align-top">
                        <div className="flex flex-col items-stretch gap-2 sm:items-end">
                          {hasEvidence && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              disabled={isOpeningEvidence}
                              onClick={() => handleOpenEvidence(solicitud)}
                            >
                              {isOpeningEvidence ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <ExternalLink className="h-4 w-4" />
                              )}
                              Ver imagen
                            </Button>
                          )}

                          {solicitud.estado === 'PENDIENTE' && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isReviewing || isResolving}
                              onClick={() => handleMarkEnRevision(solicitud)}
                            >
                              {isReviewing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Marcar en revision
                            </Button>
                          )}

                          {(!isResolved || canRetryAviso) && (
                            <Button
                              type="button"
                              size="sm"
                              disabled={isResolving || isReviewing}
                              onClick={() => handleResolver(solicitud)}
                            >
                              {isResolving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                              )}
                              {isResolved ? 'Reintentar aviso' : 'Marcar resuelto'}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SoporteSolicitudesAdmin;
