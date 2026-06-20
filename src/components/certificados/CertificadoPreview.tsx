import { CertificadoData } from '@/lib/certificateUtils';

interface CertificadoPreviewProps {
  data: CertificadoData;
  scale?: number;
}

export const CertificadoPreview = ({ data, scale = 0.4 }: CertificadoPreviewProps) => {
  const { 
    nombreEstudiante, 
    tituloCurso, 
    fechaFinalizacion,
    plantilla,
    tituloCertificado,
    textoDescripcion,
    firmaNombre,
    firmaCargo,
    mostrarFecha,
    mostrarLogo,
    colorPrimario,
    colorSecundario
  } = data;

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getPlantillaClasses = () => {
    switch (plantilla) {
      case 'clasico':
        return 'border-[3px] border-double bg-gradient-to-br from-amber-50 to-white';
      case 'moderno':
        return 'rounded-xl overflow-hidden';
      case 'profesional':
        return 'border border-gray-200';
      default:
        return '';
    }
  };

  return (
    <div 
      className="relative bg-white shadow-lg"
      style={{ 
        width: `${297 * scale}mm`, 
        height: `${210 * scale}mm`,
        transform: `scale(1)`,
        transformOrigin: 'top left'
      }}
    >
      <div 
        className={`w-full h-full flex flex-col items-center justify-center text-center p-4 relative ${getPlantillaClasses()}`}
        style={{ 
          borderColor: plantilla === 'clasico' ? colorPrimario : undefined,
          background: plantilla === 'moderno' 
            ? `linear-gradient(135deg, ${colorPrimario}08 0%, ${colorSecundario}08 100%)`
            : undefined
        }}
      >
        {/* Decorative elements based on template */}
        {plantilla === 'clasico' && (
          <div 
            className="absolute inset-2 border pointer-events-none"
            style={{ borderColor: `${colorPrimario}40` }}
          />
        )}
        
        {plantilla === 'moderno' && (
          <>
            <div 
              className="absolute top-0 left-0 right-0 h-1"
              style={{ background: `linear-gradient(90deg, ${colorPrimario}, ${colorSecundario})` }}
            />
            <div 
              className="absolute -bottom-1/2 -right-1/4 w-1/2 h-full rounded-full pointer-events-none"
              style={{ background: `${colorSecundario}10` }}
            />
          </>
        )}
        
        {plantilla === 'profesional' && (
          <>
            <div 
              className="absolute top-0 left-0 w-1 h-full"
              style={{ background: colorPrimario }}
            />
            <div 
              className="absolute bottom-4 right-4 w-8 h-8 rounded-full border-2 pointer-events-none"
              style={{ borderColor: `${colorSecundario}30` }}
            />
          </>
        )}

        {/* Logo */}
        {mostrarLogo && (
          <svg 
            className="w-10 h-10 mb-2" 
            viewBox="0 0 100 100" 
            fill={colorPrimario}
          >
            <circle cx="50" cy="50" r="45" fill="none" stroke={colorPrimario} strokeWidth="3"/>
            <path d="M30 50 L45 65 L70 35" fill="none" stroke={colorPrimario} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}

        {/* Title */}
        <h1 
          className={`mb-2 uppercase tracking-wider ${
            plantilla === 'clasico' ? 'font-serif' : 'font-sans'
          }`}
          style={{ 
            fontSize: `${14 * scale}px`,
            color: plantilla === 'profesional' ? '#111827' : colorPrimario,
            fontWeight: plantilla === 'clasico' ? 700 : 600,
            letterSpacing: plantilla === 'moderno' ? '4px' : '2px',
            borderBottom: plantilla === 'profesional' ? `2px solid ${colorPrimario}` : undefined,
            paddingBottom: plantilla === 'profesional' ? '4px' : undefined
          }}
        >
          {tituloCertificado}
        </h1>

        {/* Description */}
        <p 
          className={`mb-1 ${plantilla === 'clasico' ? 'italic font-serif' : 'font-sans'}`}
          style={{ 
            fontSize: `${8 * scale}px`,
            color: '#6b7280'
          }}
        >
          {textoDescripcion}
        </p>

        {/* Student Name */}
        <h2 
          className={`my-2 ${plantilla === 'clasico' ? 'font-serif' : 'font-sans'}`}
          style={{ 
            fontSize: `${18 * scale}px`,
            fontWeight: 600,
            color: plantilla === 'moderno' ? 'transparent' : colorPrimario,
            background: plantilla === 'moderno' 
              ? `linear-gradient(90deg, ${colorPrimario}, ${colorSecundario})`
              : undefined,
            WebkitBackgroundClip: plantilla === 'moderno' ? 'text' : undefined,
            backgroundClip: plantilla === 'moderno' ? 'text' : undefined
          }}
        >
          {nombreEstudiante}
        </h2>

        {/* Completed text */}
        <p 
          className="mb-1"
          style={{ 
            fontSize: `${8 * scale}px`,
            color: '#6b7280'
          }}
        >
          ha completado exitosamente el curso
        </p>

        {/* Course Title */}
        <h3 
          className="my-2 font-medium"
          style={{ 
            fontSize: `${11 * scale}px`,
            color: plantilla === 'clasico' ? colorSecundario : '#374151',
            background: plantilla === 'profesional' ? `${colorSecundario}15` : undefined,
            padding: plantilla === 'profesional' ? '4px 12px' : undefined,
            borderRadius: plantilla === 'profesional' ? '4px' : undefined
          }}
        >
          "{tituloCurso}"
        </h3>

        {/* Date */}
        {mostrarFecha && (
          <p 
            className={`my-2 ${plantilla === 'profesional' ? 'uppercase tracking-wide' : ''}`}
            style={{ 
              fontSize: `${7 * scale}px`,
              color: '#9ca3af'
            }}
          >
            Otorgado el {formatDate(fechaFinalizacion)}
          </p>
        )}

        {/* Signature */}
        {firmaNombre && (
          <div className="mt-3">
            <div 
              className="w-24 mx-auto mb-1"
              style={{ 
                borderTop: `1px solid ${plantilla === 'moderno' ? colorPrimario : '#d1d5db'}`
              }}
            />
            <p 
              className="font-semibold"
              style={{ 
                fontSize: `${8 * scale}px`,
                color: '#374151'
              }}
            >
              {firmaNombre}
            </p>
            {firmaCargo && (
              <p 
                style={{ 
                  fontSize: `${7 * scale}px`,
                  color: '#9ca3af'
                }}
              >
                {firmaCargo}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
