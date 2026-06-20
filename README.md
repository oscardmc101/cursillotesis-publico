# Plataforma estudiantil online para cursillos

Proyecto desarrollado como parte de una tesis académica. La plataforma permite administrar cursillos, cursos, módulos, lecciones, usuarios y contenido educativo en un entorno web.

El sistema está pensado para instituciones que necesitan organizar materiales de estudio, controlar el acceso de estudiantes y facilitar la gestión académica desde una plataforma centralizada.

---

## Objetivo del proyecto

Desarrollar una plataforma web que permita digitalizar parte de la gestión académica de un cursillo, ofreciendo funcionalidades para administración de cursos, contenido educativo y acceso diferenciado según el tipo de usuario.

---

## Funcionalidades principales

- Gestión de cursillos.
- Gestión de cursos por cursillo.
- Creación de módulos y lecciones.
- Publicación de contenido educativo.
- Acceso de estudiantes a cursos habilitados.
- Validaciones para mostrar contenido según permisos.
- Administración de usuarios.
- Integración con Supabase para base de datos y autenticación.
- Interfaz web responsive.

---

## Tecnologías utilizadas

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Supabase
- PostgreSQL
- Node.js / npm

---

## Estructura general del proyecto

```txt
public/              Archivos públicos del sitio
src/                 Código fuente principal
supabase/            Configuración y archivos relacionados a Supabase
BD_TESIS/            Archivos o scripts de base de datos utilizados para la tesis
.env.example         Ejemplo de variables de entorno necesarias
package.json         Dependencias y scripts del proyecto
README.md            Documentación del proyecto


Instalación local

Clonar el repositorio:

git clone https://github.com/oscardmc101/cursillotesis-publico.git

Entrar a la carpeta del proyecto:

cd cursillotesis-publico

Instalar dependencias:

npm install

Crear un archivo .env basado en .env.example:

cp .env.example .env

Completar las variables de entorno necesarias para Supabase:

VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

Ejecutar el proyecto en modo desarrollo:

npm run dev
Variables de entorno

El proyecto requiere variables de entorno para conectarse con Supabase.

Por seguridad, el archivo .env real no está incluido en este repositorio.

Se incluye solamente:

.env.example

Este archivo sirve como referencia para saber qué variables necesita el sistema.

Scripts disponibles

Ejecutar en desarrollo:

npm run dev

Generar versión de producción:

npm run build

Previsualizar build:

npm run preview
Seguridad y privacidad

Este repositorio es una versión pública preparada para fines académicos.

No se incluyen:

Credenciales reales.
Archivo .env.
Claves privadas.
Tokens de acceso.
Datos sensibles de usuarios reales.

Las variables de entorno deben ser configuradas manualmente por quien desee ejecutar el proyecto.

Estado del proyecto

Proyecto funcional desarrollado como prototipo académico para tesis.

Algunas funcionalidades dependen de la configuración correcta de Supabase y de las variables de entorno correspondientes.

Autores:Oscar Muñoz y Kamila Diaz

Proyecto académico de tesis.

