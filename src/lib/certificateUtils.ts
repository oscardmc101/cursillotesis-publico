export interface CertificadoData {
  nombreEstudiante: string;
  tituloCurso: string;
  fechaFinalizacion: Date;
  plantilla: 'clasico' | 'moderno' | 'profesional';
  tituloCertificado: string;
  textoDescripcion: string;
  firmaNombre?: string;
  firmaCargo?: string;
  mostrarFecha: boolean;
  mostrarLogo: boolean;
  colorPrimario: string;
  colorSecundario: string;
}

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

const getPlantillaStyles = (data: CertificadoData): string => {
  const { plantilla, colorPrimario, colorSecundario } = data;
  
  const baseStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@400;500;600&family=Merriweather:wght@400;700&display=swap');
    
    @page {
      size: A4 landscape;
      margin: 0;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      width: 297mm;
      height: 210mm;
      display: flex;
      justify-content: center;
      align-items: center;
      background: white;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    .certificate {
      width: 277mm;
      height: 190mm;
      padding: 20mm;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    
    .logo {
      width: 80px;
      height: auto;
      margin-bottom: 15px;
    }
    
    .title {
      margin-bottom: 20px;
    }
    
    .student-name {
      margin: 15px 0;
    }
    
    .description {
      margin: 10px 0;
    }
    
    .course-title {
      margin: 15px 0;
    }
    
    .date {
      margin: 20px 0;
    }
    
    .signature {
      margin-top: 30px;
    }
    
    .signature-line {
      width: 200px;
      border-top: 1px solid #333;
      margin: 0 auto 5px;
    }
  `;

  if (plantilla === 'clasico') {
    return `
      ${baseStyles}
      
      .certificate {
        border: 3px double ${colorPrimario};
        background: linear-gradient(135deg, #fffdf7 0%, #fff 100%);
      }
      
      .certificate::before {
        content: '';
        position: absolute;
        top: 8mm;
        left: 8mm;
        right: 8mm;
        bottom: 8mm;
        border: 1px solid ${colorPrimario}40;
        pointer-events: none;
      }
      
      .title {
        font-family: 'Playfair Display', serif;
        font-size: 32px;
        font-weight: 700;
        color: ${colorPrimario};
        letter-spacing: 4px;
        text-transform: uppercase;
      }
      
      .student-name {
        font-family: 'Playfair Display', serif;
        font-size: 36px;
        font-weight: 600;
        color: #1a1a1a;
      }
      
      .description {
        font-family: 'Merriweather', serif;
        font-size: 16px;
        color: #4a4a4a;
        font-style: italic;
      }
      
      .course-title {
        font-family: 'Playfair Display', serif;
        font-size: 24px;
        font-weight: 600;
        color: ${colorSecundario};
      }
      
      .date {
        font-family: 'Merriweather', serif;
        font-size: 14px;
        color: #666;
      }
      
      .signature {
        font-family: 'Merriweather', serif;
      }
      
      .signature-name {
        font-size: 16px;
        font-weight: 700;
        color: #1a1a1a;
      }
      
      .signature-title {
        font-size: 14px;
        color: #666;
        font-style: italic;
      }
    `;
  }

  if (plantilla === 'moderno') {
    return `
      ${baseStyles}
      
      .certificate {
        background: linear-gradient(135deg, ${colorPrimario}08 0%, ${colorSecundario}08 100%);
        border-radius: 16px;
        position: relative;
        overflow: hidden;
      }
      
      .certificate::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 6px;
        background: linear-gradient(90deg, ${colorPrimario}, ${colorSecundario});
      }
      
      .certificate::after {
        content: '';
        position: absolute;
        bottom: -50%;
        right: -20%;
        width: 60%;
        height: 100%;
        background: ${colorSecundario}10;
        border-radius: 50%;
        pointer-events: none;
      }
      
      .title {
        font-family: 'Inter', sans-serif;
        font-size: 28px;
        font-weight: 600;
        color: ${colorPrimario};
        letter-spacing: 8px;
        text-transform: uppercase;
      }
      
      .student-name {
        font-family: 'Inter', sans-serif;
        font-size: 40px;
        font-weight: 600;
        background: linear-gradient(90deg, ${colorPrimario}, ${colorSecundario});
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      
      .description {
        font-family: 'Inter', sans-serif;
        font-size: 16px;
        color: #6b7280;
      }
      
      .course-title {
        font-family: 'Inter', sans-serif;
        font-size: 22px;
        font-weight: 500;
        color: #1f2937;
      }
      
      .date {
        font-family: 'Inter', sans-serif;
        font-size: 14px;
        color: #9ca3af;
      }
      
      .signature {
        font-family: 'Inter', sans-serif;
      }
      
      .signature-line {
        border-color: ${colorPrimario};
      }
      
      .signature-name {
        font-size: 16px;
        font-weight: 600;
        color: #1f2937;
      }
      
      .signature-title {
        font-size: 14px;
        color: #6b7280;
      }
    `;
  }

  // Profesional
  return `
    ${baseStyles}
    
    .certificate {
      background: white;
      border: 1px solid #e5e7eb;
      position: relative;
    }
    
    .certificate::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 8px;
      height: 100%;
      background: ${colorPrimario};
    }
    
    .certificate::after {
      content: '';
      position: absolute;
      bottom: 20mm;
      right: 20mm;
      width: 60px;
      height: 60px;
      border: 3px solid ${colorSecundario}30;
      border-radius: 50%;
    }
    
    .title {
      font-family: 'Inter', sans-serif;
      font-size: 26px;
      font-weight: 600;
      color: #111827;
      letter-spacing: 2px;
      text-transform: uppercase;
      padding-bottom: 10px;
      border-bottom: 2px solid ${colorPrimario};
    }
    
    .student-name {
      font-family: 'Inter', sans-serif;
      font-size: 34px;
      font-weight: 600;
      color: ${colorPrimario};
    }
    
    .description {
      font-family: 'Inter', sans-serif;
      font-size: 15px;
      color: #6b7280;
    }
    
    .course-title {
      font-family: 'Inter', sans-serif;
      font-size: 20px;
      font-weight: 500;
      color: #374151;
      background: ${colorSecundario}15;
      padding: 8px 20px;
      border-radius: 4px;
    }
    
    .date {
      font-family: 'Inter', sans-serif;
      font-size: 13px;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .signature {
      font-family: 'Inter', sans-serif;
    }
    
    .signature-line {
      border-color: #d1d5db;
    }
    
    .signature-name {
      font-size: 15px;
      font-weight: 600;
      color: #374151;
    }
    
    .signature-title {
      font-size: 13px;
      color: #9ca3af;
    }
  `;
};

export const generateCertificateHTML = (data: CertificadoData): string => {
  const styles = getPlantillaStyles(data);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Certificado - ${data.tituloCurso}</title>
      <style>${styles}</style>
    </head>
    <body>
      <div class="certificate">
        ${data.mostrarLogo ? `
          <svg class="logo" viewBox="0 0 100 100" fill="${data.colorPrimario}">
            <circle cx="50" cy="50" r="45" fill="none" stroke="${data.colorPrimario}" stroke-width="3"/>
            <path d="M30 50 L45 65 L70 35" fill="none" stroke="${data.colorPrimario}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        ` : ''}
        
        <h1 class="title">${data.tituloCertificado}</h1>
        
        <p class="description">${data.textoDescripcion}</p>
        
        <h2 class="student-name">${data.nombreEstudiante}</h2>
        
        <p class="description">ha completado exitosamente el curso</p>
        
        <h3 class="course-title">"${data.tituloCurso}"</h3>
        
        ${data.mostrarFecha ? `
          <p class="date">Otorgado el ${formatDate(data.fechaFinalizacion)}</p>
        ` : ''}
        
        ${data.firmaNombre ? `
          <div class="signature">
            <div class="signature-line"></div>
            <p class="signature-name">${data.firmaNombre}</p>
            ${data.firmaCargo ? `<p class="signature-title">${data.firmaCargo}</p>` : ''}
          </div>
        ` : ''}
      </div>
    </body>
    </html>
  `;
};

export const downloadCertificatePDF = (data: CertificadoData): void => {
  const html = generateCertificateHTML(data);
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor, permite las ventanas emergentes para descargar el certificado.');
    return;
  }
  
  printWindow.document.write(html);
  printWindow.document.close();
  
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };
};
