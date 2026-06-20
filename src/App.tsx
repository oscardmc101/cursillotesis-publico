import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { UserRoleProvider } from "@/contexts/UserRoleContext";
import { CursilloProvider } from "@/contexts/CursilloContext";
import ProtectedRoute from "@/components/ProtectedRoute";
const AdminLayout = lazy(() => import("@/components/AdminLayout"));
import Index from "./pages/Index";
import Login from "./pages/Login";
import Registro from "./pages/Registro";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

// Lazy-loaded pages (code splitting automático con Vite)
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const Usuarios = lazy(() => import("./pages/admin/Usuarios"));
const Notificaciones = lazy(() => import("./pages/admin/Notificaciones"));
const Cursos = lazy(() => import("./pages/admin/Cursos"));
const DetalleCurso = lazy(() => import("./pages/admin/DetalleCurso"));
const LeccionPage = lazy(() => import("./pages/admin/LeccionPage"));
const TareaPage = lazy(() => import("./pages/admin/TareaPage"));
const EvaluacionPage = lazy(() => import("./pages/admin/EvaluacionPage"));
const Inscripciones = lazy(() => import("./pages/admin/Inscripciones"));
const Correcciones = lazy(() => import("./pages/admin/Correcciones"));
const CorreccionEvaluacion = lazy(() => import("./pages/admin/CorreccionEvaluacion"));
const CorreccionTarea = lazy(() => import("./pages/admin/CorreccionTarea"));
const Configuracion = lazy(() => import("./pages/admin/Configuracion"));
const Reportes = lazy(() => import("./pages/admin/Reportes"));
const Anuncios = lazy(() => import("./pages/admin/Anuncios"));
const Perfil = lazy(() => import("./pages/admin/Perfil"));
const MisCorreccionesPage = lazy(() => import("./pages/admin/MisCorreccionesPage"));
const Soporte = lazy(() => import("./pages/admin/Soporte"));

// Fallback de carga para Suspense
const PageLoader = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 min: no refetch si los datos tienen < 5 min de antigüedad
      gcTime: 10 * 60 * 1000,         // 10 min: mantener en caché antes de limpiar
      refetchOnWindowFocus: false,     // evitar refetches al cambiar de pestaña/ventana
      retry: 1,                        // solo 1 reintento en vez de 3
    },
  },
});

// Component to handle root redirect based on auth state
const RootRedirect = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If logged in, redirect to dashboard; otherwise show landing
  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Index />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <CursilloProvider>
              <UserRoleProvider>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<RootRedirect />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/registro" element={<Registro />} />
                    <Route path="/recuperar-contrasena" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    {/* Dashboard: permite usuarios PENDIENTES (ven banner + anuncios) */}
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute requireActivo={false}>
                          <AdminLayout>
                            <Dashboard />
                          </AdminLayout>
                        </ProtectedRoute>
                      }
                    />
                    {/* ADMINISTRADOR y DOCENTE */}
                    <Route
                      path="/usuarios"
                      element={
                        <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'DOCENTE']}>
                          <AdminLayout>
                            <Usuarios />
                          </AdminLayout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/inscripciones"
                      element={
                        <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'DOCENTE']}>
                          <AdminLayout>
                            <Inscripciones />
                          </AdminLayout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/configuracion"
                      element={
                        <ProtectedRoute allowedRoles={['ADMINISTRADOR']}>
                          <AdminLayout>
                            <Configuracion />
                          </AdminLayout>
                        </ProtectedRoute>
                      }
                    />
                    {/* ADMINISTRADOR y DOCENTE */}
                    <Route
                      path="/correcciones"
                      element={
                        <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'DOCENTE']}>
                          <AdminLayout>
                            <Correcciones />
                          </AdminLayout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/correcciones/evaluacion/:idIntento"
                      element={
                        <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'DOCENTE']}>
                          <AdminLayout>
                            <CorreccionEvaluacion />
                          </AdminLayout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/correcciones/tarea/:idEntrega"
                      element={
                        <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'DOCENTE']}>
                          <AdminLayout>
                            <CorreccionTarea />
                          </AdminLayout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/reportes"
                      element={
                        <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'DOCENTE', 'ESTUDIANTE']}>
                          <AdminLayout>
                            <Reportes />
                          </AdminLayout>
                        </ProtectedRoute>
                      }
                    />
                    {/* Todos los roles (ACTIVO requerido por defecto) */}
                    <Route
                      path="/notificaciones"
                      element={
                        <ProtectedRoute>
                          <AdminLayout>
                            <Notificaciones />
                          </AdminLayout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/cursos"
                      element={
                        <ProtectedRoute>
                          <AdminLayout>
                            <Cursos />
                          </AdminLayout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/cursos/:id"
                      element={
                        <ProtectedRoute>
                          <AdminLayout>
                            <DetalleCurso />
                          </AdminLayout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/lecciones/:id"
                      element={
                        <ProtectedRoute>
                          <AdminLayout>
                            <LeccionPage />
                          </AdminLayout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/tareas/:id"
                      element={
                        <ProtectedRoute>
                          <AdminLayout>
                            <TareaPage />
                          </AdminLayout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/evaluaciones/:id"
                      element={
                        <ProtectedRoute>
                          <AdminLayout>
                            <EvaluacionPage />
                          </AdminLayout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/anuncios"
                      element={
                        <ProtectedRoute>
                          <AdminLayout>
                            <Anuncios />
                          </AdminLayout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/perfil"
                      element={
                        <ProtectedRoute>
                          <AdminLayout>
                            <Perfil />
                          </AdminLayout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/soporte"
                      element={
                        <ProtectedRoute>
                          <AdminLayout>
                            <Soporte />
                          </AdminLayout>
                        </ProtectedRoute>
                      }
                    />
                    {/* Legacy routes redirect */}
                    <Route
                      path="/mis-correcciones"
                      element={
                        <ProtectedRoute>
                          <AdminLayout>
                            <MisCorreccionesPage />
                          </AdminLayout>
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/panel" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/admin/dashboard" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/admin/usuarios" element={<Navigate to="/usuarios" replace />} />
                    <Route path="/admin/notificaciones" element={<Navigate to="/notificaciones" replace />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </UserRoleProvider>
            </CursilloProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
