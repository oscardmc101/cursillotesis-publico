import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProgresoEstudiante } from '@/components/reportes/ProgresoEstudiante';
import { ParticipacionCurso } from '@/components/reportes/ParticipacionCurso';
import { CertificadoEstudios } from '@/components/reportes/CertificadoEstudios';
import { RendimientoPorPregunta } from '@/components/reportes/RendimientoPorPregunta';
import { useUserRole } from '@/contexts/UserRoleContext';
import { Award, BarChart3, HelpCircle, Users } from 'lucide-react';

const Reportes = () => {
  const { isEstudiante, isAdmin, isDocente } = useUserRole();
  const showStaffReports = isAdmin || isDocente;
  const defaultTab = isEstudiante ? 'certificado' : 'progreso';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gradient">Reportes</h1>
        <p className="text-muted-foreground mt-1">
          Visualiza certificados, progreso y métricas académicas
        </p>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 flex-wrap h-auto">
          {isEstudiante && (
            <TabsTrigger value="certificado" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
              <Award className="h-4 w-4" />
              Certificado de Estudios
            </TabsTrigger>
          )}

          {showStaffReports && (
            <>
              <TabsTrigger value="progreso" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
                <BarChart3 className="h-4 w-4" />
                Progreso Individual
              </TabsTrigger>
              <TabsTrigger value="participacion" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
                <Users className="h-4 w-4" />
                Participación por Curso
              </TabsTrigger>
              <TabsTrigger value="rendimiento-pregunta" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
                <HelpCircle className="h-4 w-4" />
                Rendimiento por Pregunta
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {isEstudiante && (
          <TabsContent value="certificado">
            <CertificadoEstudios />
          </TabsContent>
        )}

        {showStaffReports && (
          <>
            <TabsContent value="progreso">
              <ProgresoEstudiante />
            </TabsContent>

            <TabsContent value="participacion">
              <ParticipacionCurso />
            </TabsContent>

            <TabsContent value="rendimiento-pregunta">
              <RendimientoPorPregunta />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
};

export default Reportes;
