export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      adjuntos_leccion: {
        Row: {
          bucket: string | null
          fec_insercion: string | null
          fec_modificacion: string | null
          fecha_subida: string | null
          id_adjunto: string
          id_leccion: string
          nombre: string
          ruta_storage: string | null
          tamano_bytes: number | null
          tipo: string
          tipo_mime: string | null
          url_externa: string | null
          usu_insercion: string | null
          usu_modificacion: string | null
        }
        Insert: {
          bucket?: string | null
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_subida?: string | null
          id_adjunto?: string
          id_leccion: string
          nombre: string
          ruta_storage?: string | null
          tamano_bytes?: number | null
          tipo: string
          tipo_mime?: string | null
          url_externa?: string | null
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Update: {
          bucket?: string | null
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_subida?: string | null
          id_adjunto?: string
          id_leccion?: string
          nombre?: string
          ruta_storage?: string | null
          tamano_bytes?: number | null
          tipo?: string
          tipo_mime?: string | null
          url_externa?: string | null
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "adjuntos_leccion_id_leccion_fkey"
            columns: ["id_leccion"]
            isOneToOne: false
            referencedRelation: "lecciones"
            referencedColumns: ["id_leccion"]
          },
        ]
      }
      anuncios: {
        Row: {
          contenido: string
          fec_insercion: string | null
          fec_modificacion: string | null
          fecha_publicacion: string
          id_anuncio: string
          id_creador: string | null
          id_cursillo: string
          id_curso: string | null
          titulo: string
          usu_insercion: string | null
          usu_modificacion: string | null
        }
        Insert: {
          contenido: string
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_publicacion?: string
          id_anuncio?: string
          id_creador?: string | null
          id_cursillo: string
          id_curso?: string | null
          titulo: string
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Update: {
          contenido?: string
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_publicacion?: string
          id_anuncio?: string
          id_creador?: string | null
          id_cursillo?: string
          id_curso?: string | null
          titulo?: string
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anuncios_id_creador_fkey"
            columns: ["id_creador"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id_usuario"]
          },
          {
            foreignKeyName: "anuncios_id_cursillo_fkey"
            columns: ["id_cursillo"]
            isOneToOne: false
            referencedRelation: "cursillos"
            referencedColumns: ["id_cursillo"]
          },
          {
            foreignKeyName: "anuncios_id_curso_fkey"
            columns: ["id_curso"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id_curso"]
          },
        ]
      }
      archivos_entregas_tareas: {
        Row: {
          bucket: string
          fec_insercion: string | null
          fec_modificacion: string | null
          fecha_subida: string
          id_archivo: string
          id_entrega: string
          nombre_archivo: string | null
          ruta_storage: string
          tamano_bytes: number | null
          tipo_mime: string | null
          usu_insercion: string | null
          usu_modificacion: string | null
        }
        Insert: {
          bucket?: string
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_subida?: string
          id_archivo?: string
          id_entrega: string
          nombre_archivo?: string | null
          ruta_storage: string
          tamano_bytes?: number | null
          tipo_mime?: string | null
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Update: {
          bucket?: string
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_subida?: string
          id_archivo?: string
          id_entrega?: string
          nombre_archivo?: string | null
          ruta_storage?: string
          tamano_bytes?: number | null
          tipo_mime?: string | null
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "archivos_entregas_tareas_id_entrega_fkey"
            columns: ["id_entrega"]
            isOneToOne: false
            referencedRelation: "entregas_tareas"
            referencedColumns: ["id_entrega"]
          },
        ]
      }
      certificados_curso: {
        Row: {
          color_primario: string | null
          color_secundario: string | null
          fec_insercion: string | null
          fec_modificacion: string | null
          fecha_creacion: string | null
          firma_cargo: string | null
          firma_nombre: string | null
          id_certificado: string
          id_curso: string
          mostrar_fecha: boolean | null
          mostrar_logo: boolean | null
          plantilla: string
          texto_descripcion: string | null
          titulo_certificado: string | null
          usu_insercion: string | null
          usu_modificacion: string | null
        }
        Insert: {
          color_primario?: string | null
          color_secundario?: string | null
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_creacion?: string | null
          firma_cargo?: string | null
          firma_nombre?: string | null
          id_certificado?: string
          id_curso: string
          mostrar_fecha?: boolean | null
          mostrar_logo?: boolean | null
          plantilla?: string
          texto_descripcion?: string | null
          titulo_certificado?: string | null
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Update: {
          color_primario?: string | null
          color_secundario?: string | null
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_creacion?: string | null
          firma_cargo?: string | null
          firma_nombre?: string | null
          id_certificado?: string
          id_curso?: string
          mostrar_fecha?: boolean | null
          mostrar_logo?: boolean | null
          plantilla?: string
          texto_descripcion?: string | null
          titulo_certificado?: string | null
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Relationships: []
      }
      comentarios_leccion: {
        Row: {
          contenido: string
          fec_insercion: string | null
          fec_modificacion: string | null
          fecha_comentario: string
          id_comentario: string
          id_leccion: string
          id_usuario: string
          usu_insercion: string | null
          usu_modificacion: string | null
        }
        Insert: {
          contenido: string
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_comentario?: string
          id_comentario?: string
          id_leccion: string
          id_usuario: string
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Update: {
          contenido?: string
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_comentario?: string
          id_comentario?: string
          id_leccion?: string
          id_usuario?: string
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comentarios_leccion_id_leccion_fkey"
            columns: ["id_leccion"]
            isOneToOne: false
            referencedRelation: "lecciones"
            referencedColumns: ["id_leccion"]
          },
          {
            foreignKeyName: "comentarios_leccion_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      cursillos: {
        Row: {
          descripcion: string | null
          dominio: string | null
          fec_insercion: string | null
          fec_modificacion: string | null
          fecha_creacion: string
          id_cursillo: string
          nombre: string
          usu_insercion: string | null
          usu_modificacion: string | null
        }
        Insert: {
          descripcion?: string | null
          dominio?: string | null
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_creacion?: string
          id_cursillo?: string
          nombre: string
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Update: {
          descripcion?: string | null
          dominio?: string | null
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_creacion?: string
          id_cursillo?: string
          nombre?: string
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Relationships: []
      }
      curso_docentes_colaboradores: {
        Row: {
          fec_insercion: string | null
          fec_modificacion: string | null
          fecha_asignacion: string
          id_curso: string
          id_curso_docente_colaborador: string
          id_docente: string
          usu_insercion: string | null
          usu_modificacion: string | null
        }
        Insert: {
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_asignacion?: string
          id_curso: string
          id_curso_docente_colaborador?: string
          id_docente: string
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Update: {
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_asignacion?: string
          id_curso?: string
          id_curso_docente_colaborador?: string
          id_docente?: string
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "curso_docentes_colaboradores_id_curso_fkey"
            columns: ["id_curso"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id_curso"]
          },
          {
            foreignKeyName: "curso_docentes_colaboradores_id_docente_fkey"
            columns: ["id_docente"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      cursos: {
        Row: {
          descripcion: string | null
          es_publicado: boolean
          fec_insercion: string | null
          fec_modificacion: string | null
          fecha_creacion: string
          id_cursillo: string
          id_curso: string
          id_docente: string | null
          id_grupo_curso: string | null
          password_hash: string | null
          requiere_password: boolean
          titulo: string
          usu_insercion: string | null
          usu_modificacion: string | null
        }
        Insert: {
          descripcion?: string | null
          es_publicado?: boolean
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_creacion?: string
          id_cursillo: string
          id_curso?: string
          id_docente?: string | null
          id_grupo_curso?: string | null
          password_hash?: string | null
          requiere_password?: boolean
          titulo: string
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Update: {
          descripcion?: string | null
          es_publicado?: boolean
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_creacion?: string
          id_cursillo?: string
          id_curso?: string
          id_docente?: string | null
          id_grupo_curso?: string | null
          password_hash?: string | null
          requiere_password?: boolean
          titulo?: string
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cursos_id_cursillo_fkey"
            columns: ["id_cursillo"]
            isOneToOne: false
            referencedRelation: "cursillos"
            referencedColumns: ["id_cursillo"]
          },
          {
            foreignKeyName: "cursos_id_docente_fkey"
            columns: ["id_docente"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id_usuario"]
          },
          {
            foreignKeyName: "cursos_id_grupo_curso_fkey"
            columns: ["id_grupo_curso"]
            isOneToOne: false
            referencedRelation: "grupos_cursos"
            referencedColumns: ["id_grupo_curso"]
          },
        ]
      }
      entregas_tareas: {
        Row: {
          calificacion: number | null
          comentario_docente: string | null
          comentario_estudiante: string | null
          estado: string
          fec_insercion: string | null
          fec_modificacion: string | null
          fecha_correccion: string | null
          fecha_entrega: string
          id_docente_corrector: string | null
          id_entrega: string
          id_tarea: string
          id_usuario: string
          retroalimentacion_archivo_url: string | null
          usu_insercion: string | null
          usu_modificacion: string | null
        }
        Insert: {
          calificacion?: number | null
          comentario_docente?: string | null
          comentario_estudiante?: string | null
          estado?: string
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_correccion?: string | null
          fecha_entrega?: string
          id_docente_corrector?: string | null
          id_entrega?: string
          id_tarea: string
          id_usuario: string
          retroalimentacion_archivo_url?: string | null
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Update: {
          calificacion?: number | null
          comentario_docente?: string | null
          comentario_estudiante?: string | null
          estado?: string
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_correccion?: string | null
          fecha_entrega?: string
          id_docente_corrector?: string | null
          id_entrega?: string
          id_tarea?: string
          id_usuario?: string
          retroalimentacion_archivo_url?: string | null
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entregas_tareas_id_docente_corrector_fkey"
            columns: ["id_docente_corrector"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id_usuario"]
          },
          {
            foreignKeyName: "entregas_tareas_id_tarea_fkey"
            columns: ["id_tarea"]
            isOneToOne: false
            referencedRelation: "tareas"
            referencedColumns: ["id_tarea"]
          },
          {
            foreignKeyName: "entregas_tareas_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      evaluaciones: {
        Row: {
          descripcion: string | null
          fec_insercion: string | null
          fec_modificacion: string | null
          fecha_creacion: string
          id_evaluacion: string
          id_leccion: string
          intentos_max: number
          tiempo_limite_min: number | null
          titulo: string
          usu_insercion: string | null
          usu_modificacion: string | null
        }
        Insert: {
          descripcion?: string | null
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_creacion?: string
          id_evaluacion?: string
          id_leccion: string
          intentos_max?: number
          tiempo_limite_min?: number | null
          titulo: string
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Update: {
          descripcion?: string | null
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_creacion?: string
          id_evaluacion?: string
          id_leccion?: string
          intentos_max?: number
          tiempo_limite_min?: number | null
          titulo?: string
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluaciones_id_leccion_fkey"
            columns: ["id_leccion"]
            isOneToOne: false
            referencedRelation: "lecciones"
            referencedColumns: ["id_leccion"]
          },
        ]
      }
      grupos_cursos: {
        Row: {
          descripcion: string | null
          es_activo: boolean
          fec_insercion: string | null
          fec_modificacion: string | null
          fecha_creacion: string
          id_cursillo: string
          id_grupo_curso: string
          nombre: string
          orden: number
          password_hash: string | null
          requiere_password: boolean
          usu_insercion: string | null
          usu_modificacion: string | null
        }
        Insert: {
          descripcion?: string | null
          es_activo?: boolean
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_creacion?: string
          id_cursillo: string
          id_grupo_curso?: string
          nombre: string
          orden?: number
          password_hash?: string | null
          requiere_password?: boolean
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Update: {
          descripcion?: string | null
          es_activo?: boolean
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_creacion?: string
          id_cursillo?: string
          id_grupo_curso?: string
          nombre?: string
          orden?: number
          password_hash?: string | null
          requiere_password?: boolean
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grupos_cursos_id_cursillo_fkey"
            columns: ["id_cursillo"]
            isOneToOne: false
            referencedRelation: "cursillos"
            referencedColumns: ["id_cursillo"]
          },
        ]
      }
      imagenes_resolucion_intento: {
        Row: {
          bucket: string
          fec_insercion: string | null
          fec_modificacion: string | null
          fecha_subida: string
          id_imagen: string
          id_intento: string
          nombre_archivo: string | null
          ruta_storage: string
          tamano_bytes: number | null
          tipo_mime: string | null
          usu_insercion: string | null
          usu_modificacion: string | null
        }
        Insert: {
          bucket?: string
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_subida?: string
          id_imagen?: string
          id_intento: string
          nombre_archivo?: string | null
          ruta_storage: string
          tamano_bytes?: number | null
          tipo_mime?: string | null
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Update: {
          bucket?: string
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_subida?: string
          id_imagen?: string
          id_intento?: string
          nombre_archivo?: string | null
          ruta_storage?: string
          tamano_bytes?: number | null
          tipo_mime?: string | null
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imagenes_resolucion_intento_id_intento_fkey"
            columns: ["id_intento"]
            isOneToOne: false
            referencedRelation: "intentos_evaluacion"
            referencedColumns: ["id_intento"]
          },
        ]
      }
      inscripciones: {
        Row: {
          fec_insercion: string | null
          fec_modificacion: string | null
          fecha_inscripcion: string
          id_curso: string
          id_inscripcion: string
          id_usuario: string
          usu_insercion: string | null
          usu_modificacion: string | null
        }
        Insert: {
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_inscripcion?: string
          id_curso: string
          id_inscripcion?: string
          id_usuario: string
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Update: {
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_inscripcion?: string
          id_curso?: string
          id_inscripcion?: string
          id_usuario?: string
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inscripciones_id_curso_fkey"
            columns: ["id_curso"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id_curso"]
          },
          {
            foreignKeyName: "inscripciones_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      intentos_evaluacion: {
        Row: {
          estado: string
          fec_insercion: string | null
          fec_modificacion: string | null
          fecha_envio: string | null
          fecha_inicio: string
          id_evaluacion: string
          id_intento: string
          id_usuario: string
          puntaje_obtenido: number
          usu_insercion: string | null
          usu_modificacion: string | null
        }
        Insert: {
          estado?: string
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_envio?: string | null
          fecha_inicio?: string
          id_evaluacion: string
          id_intento?: string
          id_usuario: string
          puntaje_obtenido?: number
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Update: {
          estado?: string
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_envio?: string | null
          fecha_inicio?: string
          id_evaluacion?: string
          id_intento?: string
          id_usuario?: string
          puntaje_obtenido?: number
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intentos_evaluacion_id_evaluacion_fkey"
            columns: ["id_evaluacion"]
            isOneToOne: false
            referencedRelation: "evaluaciones"
            referencedColumns: ["id_evaluacion"]
          },
          {
            foreignKeyName: "intentos_evaluacion_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      lecciones: {
        Row: {
          contenido_texto: string | null
          es_publicada: boolean
          fec_insercion: string | null
          fec_modificacion: string | null
          id_leccion: string
          id_modulo: string
          orden: number
          tipo_contenido: string
          titulo: string
          url_contenido: string | null
          usu_insercion: string | null
          usu_modificacion: string | null
        }
        Insert: {
          contenido_texto?: string | null
          es_publicada?: boolean
          fec_insercion?: string | null
          fec_modificacion?: string | null
          id_leccion?: string
          id_modulo: string
          orden?: number
          tipo_contenido?: string
          titulo: string
          url_contenido?: string | null
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Update: {
          contenido_texto?: string | null
          es_publicada?: boolean
          fec_insercion?: string | null
          fec_modificacion?: string | null
          id_leccion?: string
          id_modulo?: string
          orden?: number
          tipo_contenido?: string
          titulo?: string
          url_contenido?: string | null
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lecciones_id_modulo_fkey"
            columns: ["id_modulo"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id_modulo"]
          },
        ]
      }
      modulos: {
        Row: {
          fec_insercion: string | null
          fec_modificacion: string | null
          id_curso: string
          id_modulo: string
          orden: number
          titulo: string
          usu_insercion: string | null
          usu_modificacion: string | null
        }
        Insert: {
          fec_insercion?: string | null
          fec_modificacion?: string | null
          id_curso: string
          id_modulo?: string
          orden?: number
          titulo: string
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Update: {
          fec_insercion?: string | null
          fec_modificacion?: string | null
          id_curso?: string
          id_modulo?: string
          orden?: number
          titulo?: string
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "modulos_id_curso_fkey"
            columns: ["id_curso"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id_curso"]
          },
        ]
      }
      notificaciones: {
        Row: {
          fec_insercion: string | null
          fec_modificacion: string | null
          fecha_envio: string
          id_cursillo: string | null
          id_notificacion: string
          id_usuario: string
          leido: boolean
          link: string | null
          mensaje: string
          tipo: string
          titulo: string | null
          usu_insercion: string | null
          usu_modificacion: string | null
        }
        Insert: {
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_envio?: string
          id_cursillo?: string | null
          id_notificacion?: string
          id_usuario: string
          leido?: boolean
          link?: string | null
          mensaje: string
          tipo: string
          titulo?: string | null
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Update: {
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_envio?: string
          id_cursillo?: string | null
          id_notificacion?: string
          id_usuario?: string
          leido?: boolean
          link?: string | null
          mensaje?: string
          tipo?: string
          titulo?: string | null
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notificaciones_id_cursillo_fkey"
            columns: ["id_cursillo"]
            isOneToOne: false
            referencedRelation: "cursillos"
            referencedColumns: ["id_cursillo"]
          },
          {
            foreignKeyName: "notificaciones_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      opciones_pregunta: {
        Row: {
          es_correcta: boolean
          fec_insercion: string | null
          fec_modificacion: string | null
          id_opcion: string
          id_pregunta: string
          texto: string
          usu_insercion: string | null
          usu_modificacion: string | null
        }
        Insert: {
          es_correcta?: boolean
          fec_insercion?: string | null
          fec_modificacion?: string | null
          id_opcion?: string
          id_pregunta: string
          texto: string
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Update: {
          es_correcta?: boolean
          fec_insercion?: string | null
          fec_modificacion?: string | null
          id_opcion?: string
          id_pregunta?: string
          texto?: string
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opciones_pregunta_id_pregunta_fkey"
            columns: ["id_pregunta"]
            isOneToOne: false
            referencedRelation: "preguntas_evaluacion"
            referencedColumns: ["id_pregunta"]
          },
        ]
      }
      password_reset_codes: {
        Row: {
          attempts: number
          code: string
          created_at: string
          email: string
          expires_at: string
          fec_insercion: string | null
          fec_modificacion: string | null
          id: string
          used: boolean
          usu_insercion: string | null
          usu_modificacion: string | null
        }
        Insert: {
          attempts?: number
          code: string
          created_at?: string
          email: string
          expires_at?: string
          fec_insercion?: string | null
          fec_modificacion?: string | null
          id?: string
          used?: boolean
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Update: {
          attempts?: number
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          fec_insercion?: string | null
          fec_modificacion?: string | null
          id?: string
          used?: boolean
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Relationships: []
      }
      preguntas_evaluacion: {
        Row: {
          enunciado: string
          fec_insercion: string | null
          fec_modificacion: string | null
          id_evaluacion: string
          id_pregunta: string
          puntaje: number
          tipo: string
          usu_insercion: string | null
          usu_modificacion: string | null
        }
        Insert: {
          enunciado: string
          fec_insercion?: string | null
          fec_modificacion?: string | null
          id_evaluacion: string
          id_pregunta?: string
          puntaje?: number
          tipo?: string
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Update: {
          enunciado?: string
          fec_insercion?: string | null
          fec_modificacion?: string | null
          id_evaluacion?: string
          id_pregunta?: string
          puntaje?: number
          tipo?: string
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "preguntas_evaluacion_id_evaluacion_fkey"
            columns: ["id_evaluacion"]
            isOneToOne: false
            referencedRelation: "evaluaciones"
            referencedColumns: ["id_evaluacion"]
          },
        ]
      }
      progreso_lecciones: {
        Row: {
          completado: boolean
          fec_insercion: string | null
          fec_modificacion: string | null
          fecha_completado: string | null
          id_leccion: string
          id_progreso: string
          id_usuario: string
          usu_insercion: string | null
          usu_modificacion: string | null
        }
        Insert: {
          completado?: boolean
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_completado?: string | null
          id_leccion: string
          id_progreso?: string
          id_usuario: string
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Update: {
          completado?: boolean
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_completado?: string | null
          id_leccion?: string
          id_progreso?: string
          id_usuario?: string
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "progreso_lecciones_id_leccion_fkey"
            columns: ["id_leccion"]
            isOneToOne: false
            referencedRelation: "lecciones"
            referencedColumns: ["id_leccion"]
          },
          {
            foreignKeyName: "progreso_lecciones_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      reclamos_evaluacion: {
        Row: {
          estado: string
          fec_insercion: string | null
          fec_modificacion: string | null
          fecha_reclamo: string
          fecha_resolucion: string | null
          id_docente_resolutor: string | null
          id_estudiante: string
          id_intento: string
          id_reclamo: string
          id_respuesta: string
          justificacion: string
          puntaje_original: number
          puntaje_resuelto: number | null
          respuesta_docente: string | null
          usu_insercion: string | null
          usu_modificacion: string | null
        }
        Insert: {
          estado?: string
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_reclamo?: string
          fecha_resolucion?: string | null
          id_docente_resolutor?: string | null
          id_estudiante: string
          id_intento: string
          id_reclamo?: string
          id_respuesta: string
          justificacion: string
          puntaje_original?: number
          puntaje_resuelto?: number | null
          respuesta_docente?: string | null
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Update: {
          estado?: string
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_reclamo?: string
          fecha_resolucion?: string | null
          id_docente_resolutor?: string | null
          id_estudiante?: string
          id_intento?: string
          id_reclamo?: string
          id_respuesta?: string
          justificacion?: string
          puntaje_original?: number
          puntaje_resuelto?: number | null
          respuesta_docente?: string | null
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reclamos_evaluacion_id_docente_resolutor_fkey"
            columns: ["id_docente_resolutor"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id_usuario"]
          },
          {
            foreignKeyName: "reclamos_evaluacion_id_estudiante_fkey"
            columns: ["id_estudiante"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id_usuario"]
          },
          {
            foreignKeyName: "reclamos_evaluacion_id_intento_fkey"
            columns: ["id_intento"]
            isOneToOne: false
            referencedRelation: "intentos_evaluacion"
            referencedColumns: ["id_intento"]
          },
          {
            foreignKeyName: "reclamos_evaluacion_id_respuesta_fkey"
            columns: ["id_respuesta"]
            isOneToOne: false
            referencedRelation: "respuestas_intento"
            referencedColumns: ["id_respuesta"]
          },
        ]
      }
      respuestas_intento: {
        Row: {
          es_correcta: boolean | null
          fec_insercion: string | null
          fec_modificacion: string | null
          id_intento: string
          id_opcion: string | null
          id_pregunta: string
          id_respuesta: string
          puntaje_obtenido: number
          respuesta_texto: string | null
          usu_insercion: string | null
          usu_modificacion: string | null
        }
        Insert: {
          es_correcta?: boolean | null
          fec_insercion?: string | null
          fec_modificacion?: string | null
          id_intento: string
          id_opcion?: string | null
          id_pregunta: string
          id_respuesta?: string
          puntaje_obtenido?: number
          respuesta_texto?: string | null
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Update: {
          es_correcta?: boolean | null
          fec_insercion?: string | null
          fec_modificacion?: string | null
          id_intento?: string
          id_opcion?: string | null
          id_pregunta?: string
          id_respuesta?: string
          puntaje_obtenido?: number
          respuesta_texto?: string | null
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "respuestas_intento_id_intento_fkey"
            columns: ["id_intento"]
            isOneToOne: false
            referencedRelation: "intentos_evaluacion"
            referencedColumns: ["id_intento"]
          },
          {
            foreignKeyName: "respuestas_intento_id_opcion_fkey"
            columns: ["id_opcion"]
            isOneToOne: false
            referencedRelation: "opciones_pregunta"
            referencedColumns: ["id_opcion"]
          },
          {
            foreignKeyName: "respuestas_intento_id_opcion_fkey"
            columns: ["id_opcion"]
            isOneToOne: false
            referencedRelation: "opciones_pregunta_estudiante"
            referencedColumns: ["id_opcion"]
          },
          {
            foreignKeyName: "respuestas_intento_id_pregunta_fkey"
            columns: ["id_pregunta"]
            isOneToOne: false
            referencedRelation: "preguntas_evaluacion"
            referencedColumns: ["id_pregunta"]
          },
        ]
      }
      retroalimentacion_intento: {
        Row: {
          ajuste_puntaje: number
          archivo_url: string | null
          comentario: string | null
          fec_insercion: string | null
          fec_modificacion: string | null
          fecha_retro: string
          id_docente: string
          id_intento: string
          id_retro: string
          usu_insercion: string | null
          usu_modificacion: string | null
        }
        Insert: {
          ajuste_puntaje?: number
          archivo_url?: string | null
          comentario?: string | null
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_retro?: string
          id_docente: string
          id_intento: string
          id_retro?: string
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Update: {
          ajuste_puntaje?: number
          archivo_url?: string | null
          comentario?: string | null
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_retro?: string
          id_docente?: string
          id_intento?: string
          id_retro?: string
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "retroalimentacion_intento_id_docente_fkey"
            columns: ["id_docente"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id_usuario"]
          },
          {
            foreignKeyName: "retroalimentacion_intento_id_intento_fkey"
            columns: ["id_intento"]
            isOneToOne: true
            referencedRelation: "intentos_evaluacion"
            referencedColumns: ["id_intento"]
          },
        ]
      }
      roles: {
        Row: {
          fec_insercion: string | null
          fec_modificacion: string | null
          id_rol: number
          nombre_rol: string
          usu_insercion: string | null
          usu_modificacion: string | null
        }
        Insert: {
          fec_insercion?: string | null
          fec_modificacion?: string | null
          id_rol: number
          nombre_rol: string
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Update: {
          fec_insercion?: string | null
          fec_modificacion?: string | null
          id_rol?: number
          nombre_rol?: string
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Relationships: []
      }
      tareas: {
        Row: {
          descripcion: string | null
          fec_insercion: string | null
          fec_modificacion: string | null
          fecha_creacion: string
          fecha_limite: string | null
          id_leccion: string
          id_tarea: string
          max_reintentos: number
          permite_reintentos: boolean
          puntaje_maximo: number
          titulo: string
          usu_insercion: string | null
          usu_modificacion: string | null
        }
        Insert: {
          descripcion?: string | null
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_creacion?: string
          fecha_limite?: string | null
          id_leccion: string
          id_tarea?: string
          max_reintentos?: number
          permite_reintentos?: boolean
          puntaje_maximo?: number
          titulo: string
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Update: {
          descripcion?: string | null
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_creacion?: string
          fecha_limite?: string | null
          id_leccion?: string
          id_tarea?: string
          max_reintentos?: number
          permite_reintentos?: boolean
          puntaje_maximo?: number
          titulo?: string
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tareas_id_leccion_fkey"
            columns: ["id_leccion"]
            isOneToOne: false
            referencedRelation: "lecciones"
            referencedColumns: ["id_leccion"]
          },
        ]
      }
      usuarios: {
        Row: {
          apellidos: string | null
          avatar_url: string | null
          biografia: string | null
          correo: string | null
          es_activo: boolean
          fec_insercion: string | null
          fec_modificacion: string | null
          fecha_creacion: string
          id_auth: string | null
          id_usuario: string
          nombres: string | null
          telefono: string | null
          usu_insercion: string | null
          usu_modificacion: string | null
        }
        Insert: {
          apellidos?: string | null
          avatar_url?: string | null
          biografia?: string | null
          correo?: string | null
          es_activo?: boolean
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_creacion?: string
          id_auth?: string | null
          id_usuario?: string
          nombres?: string | null
          telefono?: string | null
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Update: {
          apellidos?: string | null
          avatar_url?: string | null
          biografia?: string | null
          correo?: string | null
          es_activo?: boolean
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_creacion?: string
          id_auth?: string | null
          id_usuario?: string
          nombres?: string | null
          telefono?: string | null
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Relationships: []
      }
      usuarios_cursillos: {
        Row: {
          estado: string
          fec_insercion: string | null
          fec_modificacion: string | null
          fecha_asignacion: string
          id_cursillo: string
          id_rol: number | null
          id_usuario: string
          id_usuario_cursillo: string
          usu_insercion: string | null
          usu_modificacion: string | null
        }
        Insert: {
          estado?: string
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_asignacion?: string
          id_cursillo: string
          id_rol?: number | null
          id_usuario: string
          id_usuario_cursillo?: string
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Update: {
          estado?: string
          fec_insercion?: string | null
          fec_modificacion?: string | null
          fecha_asignacion?: string
          id_cursillo?: string
          id_rol?: number | null
          id_usuario?: string
          id_usuario_cursillo?: string
          usu_insercion?: string | null
          usu_modificacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_cursillos_id_cursillo_fkey"
            columns: ["id_cursillo"]
            isOneToOne: false
            referencedRelation: "cursillos"
            referencedColumns: ["id_cursillo"]
          },
          {
            foreignKeyName: "usuarios_cursillos_id_rol_fkey"
            columns: ["id_rol"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id_rol"]
          },
          {
            foreignKeyName: "usuarios_cursillos_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
    }
    Views: {
      opciones_pregunta_estudiante: {
        Row: {
          id_opcion: string | null
          id_pregunta: string | null
          texto: string | null
        }
        Insert: {
          id_opcion?: string | null
          id_pregunta?: string | null
          texto?: string | null
        }
        Update: {
          id_opcion?: string | null
          id_pregunta?: string | null
          texto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opciones_pregunta_id_pregunta_fkey"
            columns: ["id_pregunta"]
            isOneToOne: false
            referencedRelation: "preguntas_evaluacion"
            referencedColumns: ["id_pregunta"]
          },
        ]
      }
    }
    Functions: {
      can_access_curso_content: {
        Args: { p_curso_id: string }
        Returns: boolean
      }
      can_access_leccion_content: {
        Args: { p_leccion_id: string }
        Returns: boolean
      }
      can_admin_or_own_curso: { Args: { p_curso_id: string }; Returns: boolean }
      can_manage_curso: { Args: { p_curso_id: string }; Returns: boolean }
      can_manage_evaluacion: {
        Args: { p_evaluacion_id: string }
        Returns: boolean
      }
      can_manage_leccion: { Args: { p_leccion_id: string }; Returns: boolean }
      can_manage_tarea: { Args: { p_tarea_id: string }; Returns: boolean }
      can_read_contenido_lecciones: {
        Args: { p_name: string }
        Returns: boolean
      }
      can_view_curso: { Args: { p_id_curso: string }; Returns: boolean }
      can_view_leccion: { Args: { p_id_leccion: string }; Returns: boolean }
      can_write_contenido_lecciones: {
        Args: { p_name: string }
        Returns: boolean
      }
      current_id_usuario: { Args: never; Returns: string }
      has_cursillo_role: {
        Args: { p_cursillo: string; p_nombre_rol: string }
        Returns: boolean
      }
      is_admin_or_docente: { Args: never; Returns: boolean }
      is_curso_docente: { Args: { p_curso_id: string }; Returns: boolean }
      is_enrolled_in_evaluacion_course: {
        Args: { p_evaluacion_id: string }
        Returns: boolean
      }
      is_enrolled_in_tarea_course: {
        Args: { p_tarea_id: string }
        Returns: boolean
      }
      is_usuario_docente_activo_en_cursillo: {
        Args: { p_id_cursillo: string; p_id_usuario: string }
        Returns: boolean
      }
      is_usuario_staff_activo_en_cursillo: {
        Args: { p_id_cursillo: string; p_id_usuario: string }
        Returns: boolean
      }
      row_is_estudiante: {
        Args: { p_cursillo: string; p_target_id_usuario: string }
        Returns: boolean
      }
      rpc_asignar_rol_usuario: {
        Args: { p_id_cursillo: string; p_id_rol: number; p_id_usuario: string }
        Returns: undefined
      }
      rpc_dashboard_entregas_por_calificar:
        | {
            Args: never
            Returns: {
              calificacion: number
              comentario_docente: string
              comentario_estudiante: string
              curso_titulo: string
              estado: string
              fecha_entrega: string
              id_entrega: string
              id_tarea: string
              id_usuario: string
              retroalimentacion_archivo_url: string
              tarea_titulo: string
              usuario_apellidos: string
              usuario_correo: string
              usuario_nombres: string
            }[]
          }
        | {
            Args: { p_id_cursillo: string }
            Returns: {
              calificacion: number
              comentario_docente: string
              comentario_estudiante: string
              curso_titulo: string
              estado: string
              fecha_entrega: string
              id_entrega: string
              id_tarea: string
              id_usuario: string
              retroalimentacion_archivo_url: string
              tarea_titulo: string
              usuario_apellidos: string
              usuario_correo: string
              usuario_nombres: string
            }[]
          }
      rpc_dashboard_estudiante: {
        Args: { p_id_cursillo: string; p_id_usuario: string }
        Returns: {
          id_curso: string
          id_grupo_curso: string
          lecciones_completadas: number
          nombre_grupo: string
          titulo: string
          total_lecciones: number
        }[]
      }
      rpc_dashboard_staff: {
        Args: { p_id_cursillo: string }
        Returns: {
          active_courses: number
          enrollments: number
          pending_users: number
          recent_activity: Json
          total_users: number
        }[]
      }
      rpc_dashboard_tareas_pendientes: {
        Args: { p_id_cursillo?: string; p_id_usuario: string }
        Returns: {
          curso_titulo: string
          descripcion: string
          fecha_creacion: string
          fecha_limite: string
          id_leccion: string
          id_tarea: string
          leccion_titulo: string
          max_reintentos: number
          permite_reintentos: boolean
          puntaje_maximo: number
          titulo: string
        }[]
      }
      rpc_enviar_reclamo_evaluacion: {
        Args: { p_id_respuesta: string; p_justificacion: string }
        Returns: string
      }
      rpc_get_cursillo_stats: {
        Args: { p_id_cursillo: string }
        Returns: {
          cursos_publicados: number
          total_cursos: number
          total_inscripciones: number
          total_usuarios: number
        }[]
      }
      rpc_get_curso_docentes_publicos: {
        Args: { p_id_curso: string }
        Returns: {
          ayudantes: Json
          propietario_apellidos: string
          propietario_id: string
          propietario_nombres: string
        }[]
      }
      rpc_get_cursos_reporte:
        | {
            Args: never
            Returns: {
              id_curso: string
              id_grupo_curso: string
              nombre_grupo: string
              titulo: string
            }[]
          }
        | {
            Args: { p_id_cursillo: string }
            Returns: {
              id_curso: string
              id_grupo_curso: string
              nombre_grupo: string
              titulo: string
            }[]
          }
      rpc_inscribirse_curso: {
        Args: { p_id_curso: string; p_password?: string }
        Returns: string
      }
      rpc_list_all_inscripciones: {
        Args: { p_id_cursillo: string }
        Returns: {
          apellidos: string
          correo: string
          fecha_inscripcion: string
          id_curso: string
          id_grupo_curso: string
          id_inscripcion: string
          id_usuario: string
          nombre_grupo: string
          nombres: string
          titulo_curso: string
        }[]
      }
      rpc_list_comentarios_leccion_publicos: {
        Args: { p_id_leccion: string }
        Returns: {
          contenido: string
          fecha_comentario: string
          id_comentario: string
          id_usuario: string
          usuario_apellidos: string
          usuario_nombres: string
        }[]
      }
      rpc_list_grupos_cursos: {
        Args: { p_id_cursillo: string }
        Returns: {
          cursos_publicados: number
          descripcion: string
          es_activo: boolean
          id_cursillo: string
          id_grupo_curso: string
          nombre: string
          orden: number
          requiere_password: boolean
          total_cursos: number
        }[]
      }
      rpc_list_inscritos_curso: {
        Args: { p_id_curso: string }
        Returns: {
          apellidos: string
          correo: string
          fecha_inscripcion: string
          id_inscripcion: string
          id_usuario: string
          nombres: string
        }[]
      }
      rpc_list_usuarios_cursillo: {
        Args: { p_id_cursillo: string }
        Returns: {
          apellidos: string
          correo: string
          estado: string
          id_rol: number
          id_usuario: string
          nombre_rol: string
          nombres: string
        }[]
      }
      rpc_reporte_participacion_curso: {
        Args: { p_id_curso: string }
        Returns: Database["public"]["CompositeTypes"]["reporte_participacion_curso_row"][]
        SetofOptions: {
          from: "*"
          to: "reporte_participacion_curso_row"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      rpc_reporte_progreso_estudiante: {
        Args: { p_id_curso: string; p_id_usuario: string }
        Returns: Database["public"]["CompositeTypes"]["reporte_progreso_estudiante_row"][]
        SetofOptions: {
          from: "*"
          to: "reporte_progreso_estudiante_row"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      rpc_resolver_reclamo_evaluacion: {
        Args: { p_id_intento: string; p_respuesta_docente?: string }
        Returns: string
      }
      rpc_set_curso_colaboradores: {
        Args: { p_docente_ids?: string[]; p_id_curso: string }
        Returns: undefined
      }
      rpc_set_curso_password: {
        Args: {
          p_id_curso: string
          p_password?: string
          p_requiere_password: boolean
        }
        Returns: undefined
      }
      rpc_set_grupo_curso_password: {
        Args: {
          p_id_grupo_curso: string
          p_password?: string
          p_requiere_password: boolean
        }
        Returns: undefined
      }
      rpc_submit_intento: { Args: { p_id_intento: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      reporte_participacion_curso_row: {
        id_usuario: string | null
        nombres: string | null
        apellidos: string | null
        lecciones_completadas: number | null
        total_lecciones: number | null
        tareas_entregadas: number | null
        total_tareas: number | null
        tareas_a_tiempo: number | null
        evaluaciones_completadas: number | null
        total_evaluaciones: number | null
        promedio_tareas: number | null
        promedio_evaluaciones: number | null
        ultima_actividad: string | null
      }
      reporte_progreso_estudiante_row: {
        tipo: string | null
        id: string | null
        titulo: string | null
        modulo: string | null
        estado: string | null
        fecha_entrega: string | null
        fecha_limite: string | null
        calificacion: number | null
        puntaje_maximo: number | null
        intentos: number | null
        intentos_max: number | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
