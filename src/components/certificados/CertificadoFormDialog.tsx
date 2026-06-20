import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CertificadoPreview } from './CertificadoPreview';
import { Loader2, Palette } from 'lucide-react';

interface CertificadoConfig {
  id_certificado?: string;
  id_curso: string;
  plantilla: 'clasico' | 'moderno' | 'profesional';
  titulo_certificado: string;
  texto_descripcion: string;
  firma_nombre: string;
  firma_cargo: string;
  mostrar_fecha: boolean;
  mostrar_logo: boolean;
  color_primario: string;
  color_secundario: string;
}

interface CertificadoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idCurso: string;
  tituloCurso: string;
  onSaved?: () => void;
}

export const CertificadoFormDialog = ({
  open,
  onOpenChange,
  idCurso,
  tituloCurso,
  onSaved
}: CertificadoFormDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<CertificadoConfig>({
    id_curso: idCurso,
    plantilla: 'clasico',
    titulo_certificado: 'Certificado de Finalización',
    texto_descripcion: 'Por haber completado satisfactoriamente el curso',
    firma_nombre: '',
    firma_cargo: '',
    mostrar_fecha: true,
    mostrar_logo: true,
    color_primario: '#3B82F6',
    color_secundario: '#14B8A6'
  });

  useEffect(() => {
    if (open && idCurso) {
      fetchConfig();
    }
  }, [open, idCurso]);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('certificados_curso')
        .select('*')
        .eq('id_curso', idCurso)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig({
          id_certificado: data.id_certificado,
          id_curso: data.id_curso,
          plantilla: data.plantilla as 'clasico' | 'moderno' | 'profesional',
          titulo_certificado: data.titulo_certificado || 'Certificado de Finalización',
          texto_descripcion: data.texto_descripcion || 'Por haber completado satisfactoriamente el curso',
          firma_nombre: data.firma_nombre || '',
          firma_cargo: data.firma_cargo || '',
          mostrar_fecha: data.mostrar_fecha ?? true,
          mostrar_logo: data.mostrar_logo ?? true,
          color_primario: data.color_primario || '#3B82F6',
          color_secundario: data.color_secundario || '#14B8A6'
        });
      }
    } catch (error) {
      console.error('Error fetching certificate config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        id_curso: idCurso,
        plantilla: config.plantilla,
        titulo_certificado: config.titulo_certificado,
        texto_descripcion: config.texto_descripcion,
        firma_nombre: config.firma_nombre || null,
        firma_cargo: config.firma_cargo || null,
        mostrar_fecha: config.mostrar_fecha,
        mostrar_logo: config.mostrar_logo,
        color_primario: config.color_primario,
        color_secundario: config.color_secundario
      };

      if (config.id_certificado) {
        const { error } = await supabase
          .from('certificados_curso')
          .update(payload)
          .eq('id_certificado', config.id_certificado);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('certificados_curso')
          .insert(payload);
        if (error) throw error;
      }

      toast.success('Configuración del certificado guardada');
      onSaved?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving certificate config:', error);
      toast.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const previewData = {
    nombreEstudiante: 'Nombre del Estudiante',
    tituloCurso,
    fechaFinalizacion: new Date(),
    plantilla: config.plantilla,
    tituloCertificado: config.titulo_certificado,
    textoDescripcion: config.texto_descripcion,
    firmaNombre: config.firma_nombre,
    firmaCargo: config.firma_cargo,
    mostrarFecha: config.mostrar_fecha,
    mostrarLogo: config.mostrar_logo,
    colorPrimario: config.color_primario,
    colorSecundario: config.color_secundario
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Certificado</DialogTitle>
          <DialogDescription>
            Personaliza el certificado que recibirán los estudiantes al completar el curso
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Form */}
            <div className="space-y-4">
              {/* Template Selection */}
              <div className="space-y-2">
                <Label>Plantilla</Label>
                <RadioGroup
                  value={config.plantilla}
                  onValueChange={(value) => setConfig(prev => ({ ...prev, plantilla: value as any }))}
                  className="grid grid-cols-3 gap-2"
                >
                  <div>
                    <RadioGroupItem value="clasico" id="clasico" className="peer sr-only" />
                    <Label
                      htmlFor="clasico"
                      className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <span className="text-sm font-medium">Clásico</span>
                      <span className="text-xs text-muted-foreground">Elegante</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="moderno" id="moderno" className="peer sr-only" />
                    <Label
                      htmlFor="moderno"
                      className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <span className="text-sm font-medium">Moderno</span>
                      <span className="text-xs text-muted-foreground">Minimalista</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="profesional" id="profesional" className="peer sr-only" />
                    <Label
                      htmlFor="profesional"
                      className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <span className="text-sm font-medium">Profesional</span>
                      <span className="text-xs text-muted-foreground">Corporativo</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="titulo">Título del Certificado</Label>
                <Input
                  id="titulo"
                  value={config.titulo_certificado}
                  onChange={(e) => setConfig(prev => ({ ...prev, titulo_certificado: e.target.value }))}
                  placeholder="Certificado de Finalización"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="descripcion">Texto Descriptivo</Label>
                <Textarea
                  id="descripcion"
                  value={config.texto_descripcion}
                  onChange={(e) => setConfig(prev => ({ ...prev, texto_descripcion: e.target.value }))}
                  placeholder="Por haber completado satisfactoriamente el curso"
                  rows={2}
                />
              </div>

              {/* Signature */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firma_nombre">Nombre de Firma</Label>
                  <Input
                    id="firma_nombre"
                    value={config.firma_nombre}
                    onChange={(e) => setConfig(prev => ({ ...prev, firma_nombre: e.target.value }))}
                    placeholder="Nombre del docente"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="firma_cargo">Cargo</Label>
                  <Input
                    id="firma_cargo"
                    value={config.firma_cargo}
                    onChange={(e) => setConfig(prev => ({ ...prev, firma_cargo: e.target.value }))}
                    placeholder="Instructor"
                  />
                </div>
              </div>

              {/* Colors */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Colores
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.color_primario}
                      onChange={(e) => setConfig(prev => ({ ...prev, color_primario: e.target.value }))}
                      className="w-10 h-10 rounded cursor-pointer border-0"
                    />
                    <span className="text-sm text-muted-foreground">Primario</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.color_secundario}
                      onChange={(e) => setConfig(prev => ({ ...prev, color_secundario: e.target.value }))}
                      className="w-10 h-10 rounded cursor-pointer border-0"
                    />
                    <span className="text-sm text-muted-foreground">Secundario</span>
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="mostrar_fecha" className="cursor-pointer">Mostrar fecha de emisión</Label>
                  <Switch
                    id="mostrar_fecha"
                    checked={config.mostrar_fecha}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, mostrar_fecha: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="mostrar_logo" className="cursor-pointer">Mostrar logo</Label>
                  <Switch
                    id="mostrar_logo"
                    checked={config.mostrar_logo}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, mostrar_logo: checked }))}
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label>Vista Previa</Label>
              <div className="bg-muted/50 rounded-lg p-4 flex items-center justify-center min-h-[300px]">
                <CertificadoPreview data={previewData} scale={0.35} />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                El certificado se descargará en formato A4 horizontal
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Configuración
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
