// Exportar datos a Excel (.xlsx) — XLSX se carga dinámicamente para reducir el bundle inicial
export async function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  sheetName: string = 'Datos'
) {
  const XLSX = await import('xlsx');
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

// Exportar datos a CSV
export async function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string
) {
  const XLSX = await import('xlsx');
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// Exportar a PDF usando print nativo del navegador
export function exportToPDF(elementId: string, title: string) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const printContent = element.innerHTML;
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          padding: 20px;
          color: #333;
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 20px 0;
        }
        th, td { 
          border: 1px solid #ddd; 
          padding: 8px; 
          text-align: left;
        }
        th { 
          background-color: #f4f4f4; 
          font-weight: bold;
        }
        h1, h2, h3 { 
          color: #333;
          margin-bottom: 10px;
        }
        .chart-container {
          page-break-inside: avoid;
          margin: 20px 0;
        }
        .badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
        }
        .badge-success { background: #d4edda; color: #155724; }
        .badge-warning { background: #fff3cd; color: #856404; }
        .badge-danger { background: #f8d7da; color: #721c24; }
        .badge-info { background: #cce5ff; color: #004085; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p>Generado el: ${new Date().toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}</p>
      ${printContent}
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  
  // Esperar a que el contenido cargue antes de imprimir
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
}

// Formatear fecha para reportes
export function formatDateForReport(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Calcular porcentaje
export function calcularPorcentaje(valor: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((valor / total) * 100);
}
