import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileText, Loader2, User, CheckCircle2, Clock, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useEntregasTarea, type Entrega, type ArchivoEntrega } from '@/hooks/useTareas';
import CalificarEntregaDialog from './CalificarEntregaDialog';

interface ListaEntregasProps {
  idTarea: string;
}

const ListaEntregas = ({ idTarea }: ListaEntregasProps) => {
  const { entregas, loading, refetch } = useEntregasTarea(idTarea);
  const [selectedEntrega, setSelectedEntrega] = useState<Entrega | null>(null);
  const [calificarOpen, setCalificarOpen] = useState(false);

  const handleDownloadFile = async (archivo: ArchivoEntrega) => {
    try {
      const { data, error } = await supabase.storage
        .from(archivo.bucket)
        .download(archivo.ruta_storage);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = archivo.nombre_archivo || 'archivo';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'CALIFICADO':
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Calificado
          </Badge>
        );
      case 'ENVIADO':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pendiente
          </Badge>
        );
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (entregas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Entregas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No hay entregas para esta tarea todavía.
          </p>
        </CardContent>
      </Card>
    );
  }

  const pendientes = entregas.filter(e => e.estado === 'ENVIADO').length;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Entregas ({entregas.length})</span>
            {pendientes > 0 && (
              <Badge variant="destructive">
                {pendientes} por calificar
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estudiante</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Archivos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Calificación</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entregas.map((entrega) => (
                <TableRow key={entrega.id_entrega}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {entrega.usuario?.nombres} {entrega.usuario?.apellidos}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entrega.usuario?.correo}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {format(new Date(entrega.fecha_entrega), "d MMM yyyy, HH:mm", { locale: es })}
                    </span>
                  </TableCell>
                  <TableCell>
                    {entrega.archivos && entrega.archivos.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {entrega.archivos.map((archivo) => (
                          <button
                            key={archivo.id_archivo}
                            onClick={() => handleDownloadFile(archivo)}
                            className="flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            <FileText className="h-3 w-3" />
                            <span className="truncate max-w-[120px]">{archivo.nombre_archivo}</span>
                            <Download className="h-3 w-3" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Sin archivos</span>
                    )}
                  </TableCell>
                  <TableCell>{getEstadoBadge(entrega.estado)}</TableCell>
                  <TableCell>
                    {entrega.calificacion !== null ? (
                      <Badge variant="outline" className="font-mono">
                        {entrega.calificacion}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedEntrega(entrega);
                        setCalificarOpen(true);
                      }}
                    >
                      {entrega.estado === 'CALIFICADO' ? 'Ver/Editar' : 'Calificar'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CalificarEntregaDialog
        open={calificarOpen}
        onOpenChange={setCalificarOpen}
        entrega={selectedEntrega}
        onSuccess={refetch}
      />
    </>
  );
};

export default ListaEntregas;
