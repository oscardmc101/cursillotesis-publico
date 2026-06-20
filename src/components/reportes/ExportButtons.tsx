import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { exportToExcel, exportToPDF } from '@/lib/exportUtils';
import { toast } from 'sonner';

interface ExportButtonsProps<T extends Record<string, unknown>> {
  data: T[];
  filename: string;
  pdfElementId: string;
  pdfTitle: string;
  disabled?: boolean;
}

export function ExportButtons<T extends Record<string, unknown>>({
  data,
  filename,
  pdfElementId,
  pdfTitle,
  disabled = false
}: ExportButtonsProps<T>) {
  const handleExportExcel = async () => {
    if (data.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }
    try {
      await exportToExcel(data, filename);
      toast.success('Archivo Excel descargado');
    } catch {
      toast.error('Error al exportar a Excel');
    }
  };

  const handleExportPDF = () => {
    exportToPDF(pdfElementId, pdfTitle);
    toast.success('Generando PDF...');
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportExcel}
        disabled={disabled || data.length === 0}
      >
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        Excel
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportPDF}
        disabled={disabled}
      >
        <FileText className="h-4 w-4 mr-2" />
        PDF
      </Button>
    </div>
  );
}
