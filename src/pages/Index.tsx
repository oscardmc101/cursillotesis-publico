import { Link } from 'react-router-dom';
import {
  BookOpen,
  ClipboardCheck,
  MessageSquare,
  Award,
  Users,
  CheckCircle2,
  ArrowRight,
  Play,
  GraduationCap,
  MapPin,
  MessageCircle,
  Instagram,
  Facebook,
  ExternalLink,
  Navigation,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Logo from '@/components/brand/Logo';

const features = [
  {
    icon: BookOpen,
    title: 'Contenidos Estructurados',
    description: 'Cursos organizados en módulos y lecciones con videos, PDFs y material interactivo.',
  },
  {
    icon: ClipboardCheck,
    title: 'Evaluaciones Inteligentes',
    description: 'Cuestionarios autocalificables y tareas con retroalimentación personalizada.',
  },
  {
    icon: MessageSquare,
    title: 'Comunicación Directa',
    description: 'Foros de discusión por lección y retroalimentación inmediata de docentes.',
  },
  {
    icon: Award,
    title: 'Seguimiento y Certificados',
    description: 'Monitorea tu progreso y obtén certificados al completar los cursos.',
  },
];

const stats = [
  { value: '95%', label: 'Tasa de Aprobación' },
  { value: '24/7', label: 'Acceso a Contenidos' },
];

const benefits = [
  'Contenidos actualizados por docentes expertos',
  'Evaluaciones con retroalimentación inmediata',
  'Seguimiento detallado de tu progreso',
  'Foros de discusión para resolver dudas',
  'Certificados al completar cursos',
];

const contactLinks = {
  maps: 'https://maps.app.goo.gl/aypgJjWq5SNHFPRk8?g_st=ac',
  whatsapp: 'https://api.whatsapp.com/send?phone=595984220023',
  instagram: 'https://www.instagram.com/cursilloPrueba?igsh=MW10M2JjaGMyc2xqNA==',
  facebook: 'https://www.facebook.com/106759930942159/',
};

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-primary/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container flex h-16 items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" className="text-foreground hover:bg-primary/5 hover:text-primary">
                Iniciar Sesión
              </Button>
            </Link>
            <Link to="/registro">
              <Button className="bg-primary text-primary-foreground shadow-sm hover:bg-primary/90">
                Registrarse
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,hsl(217_91%_24%)_0%,hsl(201_89%_32%)_48%,hsl(168_76%_34%)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:44px_44px] opacity-30" />

        {/* Wave decoration at bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path
              d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
              fill="hsl(var(--background))"
            />
          </svg>
        </div>

        <div className="container relative py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            {/* Badge */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 shadow-sm backdrop-blur-sm">
              <GraduationCap className="h-4 w-4" />
              Plataforma del Cursillo Prueba
            </div>

            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl lg:text-6xl">
              Prepárate para tu ingreso universitario
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/85 md:text-xl">
              Accede a contenidos de calidad, evaluaciones y seguimiento personalizado. Todo en un solo lugar para asegurar tu éxito académico.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link to="/registro">
                <Button
                  size="lg"
                  className="w-full bg-white font-semibold text-primary shadow-lg shadow-primary/20 hover:bg-white/90 sm:w-auto"
                >
                  Comenzar ahora
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button
                  size="lg"
                  variant="ghost"
                  className="w-full border border-white/20 text-white hover:bg-white/10 hover:text-white sm:w-auto"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Ya tengo cuenta
                </Button>
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-white/80">
              <span className="rounded-full bg-white/10 px-3 py-1">Docentes expertos</span>
              <span className="rounded-full bg-white/10 px-3 py-1">Material organizado</span>
              <span className="rounded-full bg-white/10 px-3 py-1">Seguimiento académico</span>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Contact Section */}
      <section className="bg-background py-10">
        <div className="container">
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <a
              href={contactLinks.whatsapp}
              target="_blank"
              rel="noreferrer"
              className="group flex flex-col justify-between rounded-lg border border-accent/25 bg-[linear-gradient(135deg,hsl(var(--accent))_0%,hsl(182_79%_36%)_100%)] p-6 text-accent-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg sm:flex-row sm:items-center"
            >
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-white/20 p-3">
                  <MessageCircle className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium uppercase tracking-wide text-white/75">Contacto principal</p>
                  <h2 className="mt-1 text-2xl font-bold">Escribinos por WhatsApp</h2>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/85">
                    Consultas sobre inscripción, horarios, cursos y acompañamiento académico.
                  </p>
                </div>
              </div>
              <div className="mt-5 inline-flex items-center gap-2 font-semibold sm:mt-0">
                Contactar
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </a>

            <a
              href={contactLinks.maps}
              target="_blank"
              rel="noreferrer"
              className="group rounded-lg border border-primary/15 bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-3 text-primary">
                  <MapPin className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium uppercase tracking-wide text-primary">Ubicación del cursillo</p>
                  <h2 className="mt-1 text-xl font-bold text-foreground">Ver en Google Maps</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Abrí la ubicación oficial para llegar al Cursillo Prueba.
                  </p>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                    Abrir mapa
                    <Navigation className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-background py-20">
        <div className="container">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              Todo lo que necesitas para prepararte
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Una plataforma completa diseñada para maximizar tu aprendizaje y preparación.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="border border-primary/10 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-lg"
              >
                <CardContent className="pb-6 pt-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-primary/10 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 py-16">
        <div className="container">
          <div className="mx-auto grid max-w-3xl grid-cols-1 gap-8 sm:grid-cols-2">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-primary md:text-4xl lg:text-5xl">
                  {stat.value}
                </div>
                <div className="mt-2 text-sm text-muted-foreground md:text-base">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Experience Section */}
      <section className="bg-background py-20">
        <div className="container">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left content */}
            <div>
              <h2 className="text-3xl font-bold leading-tight text-foreground md:text-4xl">
                Una experiencia de aprendizaje diseñada para ti
              </h2>
              <p className="mb-8 mt-4 text-lg text-muted-foreground">
                Nuestra plataforma centraliza todo lo que necesitas para tu preparación universitaria.
              </p>

              <ul className="space-y-4">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                    <span className="text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>

              <Link to="/registro" className="mt-8 inline-block">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Registrarse gratis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Right - Feature cards grid */}
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10" />
              <div className="relative p-8 lg:p-10">
                <div className="grid grid-cols-2 gap-4">
                  {/* Card: Comunidad */}
                  <Card className="border border-primary/10 bg-card shadow-sm transition-shadow hover:shadow-md">
                    <CardContent className="p-5">
                      <Users className="mb-3 h-7 w-7 text-accent" />
                      <div className="font-semibold text-foreground">Comunidad</div>
                    </CardContent>
                  </Card>

                  {/* Card: Evaluaciones */}
                  <Card className="mt-8 border border-primary/10 bg-card shadow-sm transition-shadow hover:shadow-md">
                    <CardContent className="p-5">
                      <ClipboardCheck className="mb-3 h-7 w-7 text-accent" />
                      <div className="font-semibold text-foreground">Evaluaciones</div>
                    </CardContent>
                  </Card>

                  {/* Card: Contenidos */}
                  <Card className="border border-primary/10 bg-card shadow-sm transition-shadow hover:shadow-md">
                    <CardContent className="p-5">
                      <BookOpen className="mb-3 h-7 w-7 text-primary" />
                      <div className="font-semibold text-foreground">Contenidos</div>
                    </CardContent>
                  </Card>

                  {/* Card: Certificados */}
                  <Card className="mt-8 border border-primary/10 bg-card shadow-sm transition-shadow hover:shadow-md">
                    <CardContent className="p-5">
                      <Award className="mb-3 h-7 w-7 text-primary" />
                      <div className="font-semibold text-foreground">Certificados</div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-muted/30 py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              ¿Listo para comenzar?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Únete a cientos de estudiantes que ya están preparándose para su futuro universitario.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/registro">
                <Button size="lg" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto">
                  Registrarse gratis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href={contactLinks.whatsapp} target="_blank" rel="noreferrer">
                <Button size="lg" variant="outline" className="w-full border-accent/40 text-accent hover:bg-accent/10 hover:text-accent sm:w-auto">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Consultar por WhatsApp
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-primary/15 bg-[hsl(217_91%_18%)] py-10 text-white">
        <div className="container">
          <div className="grid gap-8 md:grid-cols-[1fr_auto_auto] md:items-start">
            <div>
              <Logo />
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/70">
                Plataforma académica para acompañar tu preparación universitaria con contenidos, evaluaciones y seguimiento.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white">Accesos</h3>
              <div className="mt-3 flex flex-col gap-2">
                <Link to="/login" className="text-sm text-white/70 transition-colors hover:text-white">
                  Iniciar Sesión
                </Link>
                <Link to="/registro" className="text-sm text-white/70 transition-colors hover:text-white">
                  Registrarse
                </Link>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white">Contacto oficial</h3>
              <div className="mt-3 flex flex-wrap gap-2 md:justify-end">
                <a
                  href={contactLinks.whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Contactar por WhatsApp"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-white transition-colors hover:bg-accent/90"
                >
                  <MessageCircle className="h-5 w-5" />
                </a>
                <a
                  href={contactLinks.instagram}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Abrir Instagram del Cursillo Prueba"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <Instagram className="h-5 w-5" />
                </a>
                <a
                  href={contactLinks.facebook}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Abrir Facebook del Cursillo Prueba"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <Facebook className="h-5 w-5" />
                </a>
                <a
                  href={contactLinks.maps}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Abrir ubicación en Google Maps"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <ExternalLink className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
          <div className="mt-8 border-t border-white/10 pt-5 text-sm text-white/60">
            © {new Date().getFullYear()} Cursillo Prueba. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
