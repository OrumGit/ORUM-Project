/**
 * Tipos de la base de datos de ORUM (esquema `public`).
 *
 * Se mantiene junto al esquema de Supabase. Al agregar o cambiar tablas,
 * actualiza aquí Row, Insert, Update y Relationships; también se puede
 * regenerar con: `supabase gen types typescript --project-id <ID>`.
 *
 * Referencia: ver `docs/referencia/Esquema_BD.txt`.
 */

/** Códigos de rol tal como están en la tabla `roles`. */
export type RolCodigo = 'super_admin' | 'empleado' | 'comercio' | 'miembro'

/** Códigos de tipo_beneficio tal como están en la tabla `tipos_beneficio`. */
export type TipoBeneficioCodigo = 'porcentaje' | 'dos_por_uno' | 'monto_fijo' | 'regalo'

/** Valores del enum `metodo_registro_venta`. */
export type MetodoRegistroVenta = 'qr' | 'numero'

/** Valores del enum `tipo_membresia`. */
export type TipoMembresia = 'nueva' | 'renovada'
/** Valores del enum `estado_membresia`. */
export type EstadoMembresia = 'activa' | 'vencida' | 'cancelada' | 'suspendida'

type Timestamp = string // timestamptz llega como ISO string

export type Database = {
  public: {
    Tables: {
      anuncios: {
        Row: {
          /** Quién hizo el cambio. Solo viaja en la escritura: `fn_capturar_actor` lo pasa a la bitácora y lo vacía. */
          updated_by: string | null
          id: number
          titulo: string
          cuerpo: string
          imagen_url: string | null
          mostrar_publico: boolean
          mostrar_miembros: boolean
          activo: boolean
          /** uuid = perfiles.id de quien lo publicó. */
          creado_por: string | null
          created_at: Timestamp
          deleted_at: Timestamp | null
          /** Desde cuándo se ve; `null` = desde que se guarda (20261021120000_anuncios_programados.sql). */
          publicar_desde: Timestamp | null
          /** Hasta cuándo se ve; `null` = hasta que se retire. */
          publicar_hasta: Timestamp | null
        }
        Insert: {
          updated_by?: string | null
          id?: number
          titulo: string
          cuerpo: string
          imagen_url?: string | null
          mostrar_publico?: boolean
          mostrar_miembros?: boolean
          activo?: boolean
          creado_por?: string | null
          created_at?: Timestamp
          deleted_at?: Timestamp | null
          publicar_desde?: Timestamp | null
          publicar_hasta?: Timestamp | null
        }
        Update: Partial<Database['public']['Tables']['anuncios']['Insert']>
        Relationships: []
      }
      /** Las imágenes del carrusel de la portada (20261013120000_publicidad.sql). */
      publicidad: {
        Row: {
          id: number
          imagen_url: string
          /** Texto alternativo de la imagen. */
          descripcion: string
          /** Puesto en el carrusel, de menor a mayor. */
          orden: number
          /** false = guardada pero oculta. */
          activo: boolean
          creado_por: string | null
          created_at: Timestamp
        }
        Insert: {
          id?: number
          imagen_url: string
          descripcion?: string
          orden?: number
          activo?: boolean
          creado_por?: string | null
          created_at?: Timestamp
        }
        Update: Partial<Database['public']['Tables']['publicidad']['Insert']>
        Relationships: []
      }
      roles: {
        Row: {
          id: number
          codigo: RolCodigo
          nombre: string
          descripcion: string | null
        }
        Insert: {
          id?: number
          codigo: RolCodigo
          nombre: string
          descripcion?: string | null
        }
        Update: Partial<Database['public']['Tables']['roles']['Insert']>
        Relationships: []
      }
      perfiles: {
        Row: {
          /** Quién hizo el cambio. Solo viaja en la escritura: `fn_capturar_actor` lo pasa a la bitácora y lo vacía. */
          updated_by: string | null
          id: string // uuid = auth.users.id
          rol_id: number
          /** Foto de quien trabaja en el club. Se muestra en bitácora y reportes. */
          avatar_url: string | null
          activo: boolean
          created_at: Timestamp
          updated_at: Timestamp
        }
        Insert: {
          updated_by?: string | null
          id: string
          rol_id: number
          avatar_url?: string | null
          activo?: boolean
          created_at?: Timestamp
          updated_at?: Timestamp
        }
        Update: Partial<Database['public']['Tables']['perfiles']['Insert']>
        Relationships: []
      }
      empleados: {
        Row: {
          /** Quién hizo el cambio. Solo viaja en la escritura: `fn_capturar_actor` lo pasa a la bitácora y lo vacía. */
          updated_by: string | null
          id: number
          perfil_id: string | null
          nombres: string
          apellidos: string
          cedula: string | null
          telefono: string | null
          created_at: Timestamp
          updated_at: Timestamp
          deleted_at: Timestamp | null
        }
        Insert: {
          updated_by?: string | null
          id?: number
          perfil_id?: string | null
          nombres: string
          apellidos: string
          cedula?: string | null
          telefono?: string | null
          created_at?: Timestamp
          updated_at?: Timestamp
          deleted_at?: Timestamp | null
        }
        Update: Partial<Database['public']['Tables']['empleados']['Insert']>
        Relationships: []
      }
      comercios: {
        Row: {
          /** Quién hizo el cambio. Solo viaja en la escritura: `fn_capturar_actor` lo pasa a la bitácora y lo vacía. */
          updated_by: string | null
          id: number
          perfil_id: string | null
          marca_id: number | null
          categoria_id: number | null
          subcategoria_id: number | null
          nombre: string
          descripcion: string | null
          logo_url: string | null
          /** Foto de portada 16/9. Alimenta el carrusel público. Migración 20260913120000. */
          portada_url: string | null
          /** Si la ficha pública sale en buscadores (sitemap, sin noindex). Migración comercios_indexable. */
          indexable: boolean
          activo: boolean
          created_at: Timestamp
          updated_at: Timestamp
          deleted_at: Timestamp | null
        }
        Insert: {
          updated_by?: string | null
          id?: number
          perfil_id?: string | null
          marca_id?: number | null
          categoria_id?: number | null
          subcategoria_id?: number | null
          nombre: string
          descripcion?: string | null
          logo_url?: string | null
          portada_url?: string | null
          indexable?: boolean
          activo?: boolean
          created_at?: Timestamp
          updated_at?: Timestamp
          deleted_at?: Timestamp | null
        }
        Update: Partial<Database['public']['Tables']['comercios']['Insert']>
        Relationships: []
      }
      marcas: {
        Row: {
          id: number
          nombre: string
          logo_url: string | null
        }
        Insert: {
          id?: number
          nombre: string
          logo_url?: string | null
        }
        Update: Partial<Database['public']['Tables']['marcas']['Insert']>
        Relationships: []
      }
      categorias: {
        Row: {
          id: number
          nombre: string
        }
        Insert: {
          id?: number
          nombre: string
        }
        Update: Partial<Database['public']['Tables']['categorias']['Insert']>
        Relationships: []
      }
      subcategorias: {
        Row:{
          id: number
          subcategoria: string
          categoria_id: number
        }
        Insert: {
          id?: number
          subcategoria: string
          categoria_id: number
        }
        Update: Partial<Database['public']['Tables']['subcategorias']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'subcategorias_categoria_id_fkey'
            columns: ['categoria_id']
            isOneToOne: false
            referencedRelation: 'categorias'
            referencedColumns: ['id']
          },
        ]
      }
      ciudades: {
        Row: {
          id: number
          nombre: string
          departamento: string | null
        }
        Insert: {
          id?: number
          nombre: string
          departamento?: string | null
        }
        Update: Partial<Database['public']['Tables']['ciudades']['Insert']>
        Relationships: []
      }
      planes_membresia: {
        Row: {
          /** Quién hizo el cambio. Solo viaja en la escritura: `fn_capturar_actor` lo pasa a la bitácora y lo vacía. */
          updated_by: string | null
          id: number
          nombre: string
          descripcion: string | null
          precio: number
          duracion_meses: number
          activo: boolean
          created_at: Timestamp
          updated_at: Timestamp
          deleted_at: Timestamp | null
        }
        Insert: {
          updated_by?: string | null
          id?: number
          nombre: string
          descripcion?: string | null
          precio: number
          duracion_meses?: number
          activo?: boolean
          created_at?: Timestamp
          updated_at?: Timestamp
          deleted_at?: Timestamp | null
        }
        Update: Partial<Database['public']['Tables']['planes_membresia']['Insert']>
        Relationships: []
      }
      miembros: {
        Row: {
          /** Quién hizo el cambio. Solo viaja en la escritura: `fn_capturar_actor` lo pasa a la bitácora y lo vacía. */
          updated_by: string | null
          id: number
          perfil_id: string | null
          codigo_publico: string
          numero_membresia: string
          nombres: string
          apellidos: string
          cedula: string
          telefono: string | null
          direccion: string | null
          /** Foto del socio. Vive aquí y no en `perfiles` porque `perfil_id` es nullable. */
          foto_url: string | null
          /** Cuándo se declaró tener derecho sobre la foto. `null` = sin declaración. */
          foto_declaracion_at: Timestamp | null
          ciudad_id: number | null
          registrado_por: number | null
          fecha_registro: Timestamp
          created_at: Timestamp
          updated_at: Timestamp
          deleted_at: Timestamp | null
        }
        Insert: {
          updated_by?: string | null
          id?: number
          perfil_id?: string | null
          codigo_publico?: string
          numero_membresia: string
          nombres: string
          apellidos: string
          cedula: string
          telefono?: string | null
          direccion?: string | null
          foto_url?: string | null
          foto_declaracion_at?: Timestamp | null
          ciudad_id?: number | null
          registrado_por?: number | null
          fecha_registro?: Timestamp
          created_at?: Timestamp
          updated_at?: Timestamp
          deleted_at?: Timestamp | null
        }
        Update: Partial<Database['public']['Tables']['miembros']['Insert']>
        Relationships: []
      }
      numeros_registro: {
        Row: {
          numero: string
          miembro_id: number | null
          creado_por: number | null
          creado_at: Timestamp
          asignado_at: Timestamp | null
        }
        Insert: {
          numero: string
          miembro_id?: number | null
          creado_por?: number | null
          creado_at?: Timestamp
          asignado_at?: Timestamp | null
        }
        Update: Partial<Database['public']['Tables']['numeros_registro']['Insert']>
        // La pantalla de gestión embebe el miembro para mostrar a quién se
        // asignó cada número (`numeros_registro(..., miembros(nombres,…))`).
        Relationships: [
          {
            foreignKeyName: 'numeros_registro_miembro_id_fkey'
            columns: ['miembro_id']
            isOneToOne: false
            referencedRelation: 'miembros'
            referencedColumns: ['id']
          },
        ]
      }
      membresias: {
        Row: {
          /** Quién hizo el cambio. Solo viaja en la escritura: `fn_capturar_actor` lo pasa a la bitácora y lo vacía. */
          updated_by: string | null
          id: number
          miembro_id: number
          plan_id: number
          tipo: Database['public']['Enums']['tipo_membresia']
          estado: Database['public']['Enums']['estado_membresia']
          fecha_inicio: string
          fecha_fin: string
          precio_pagado: number
          /** Cortesía: existe pero no es una venta (no suma a ingresos). Siempre con `precio_pagado` 0. */
          es_cortesia: boolean
          comprobante_url: string | null
          vendido_por: number | null
          membresia_anterior_id: number | null
          created_at: Timestamp
          updated_at: Timestamp
        }
        Insert: {
          updated_by?: string | null
          id?: number
          miembro_id: number
          plan_id: number
          tipo: Database['public']['Enums']['tipo_membresia']
          estado?: Database['public']['Enums']['estado_membresia']
          fecha_inicio: string
          fecha_fin: string
          precio_pagado: number
          es_cortesia?: boolean
          comprobante_url?: string | null
          vendido_por?: number | null
          membresia_anterior_id?: number | null
          created_at?: Timestamp
          updated_at?: Timestamp
        }
        Update: Partial<Database['public']['Tables']['membresias']['Insert']>
        /*
          Este fichero se mantiene a mano y hasta ahora dejaba `Relationships`
          vacío en todas las tablas. El cliente de Supabase usa esa lista para
          tipar los embebidos: sin ella, un `select('… , planes_membresia(nombre)')`
          no compila —devuelve `SelectQueryError<"could not find the relation">`—
          aunque la clave foránea exista de verdad en la base.

          Se declara la que se usa. Si más adelante se embebe otra relación,
          hay que añadirla aquí igual (o regenerar el fichero con la CLI de
          Supabase, que ya está en devDependencies).
        */
        Relationships: [
          {
            foreignKeyName: 'membresias_plan_id_fkey'
            columns: ['plan_id']
            isOneToOne: false
            referencedRelation: 'planes_membresia'
            referencedColumns: ['id']
          },
        ]
      }
      sucursales: {
        Row: {
          /** Quién hizo el cambio. Solo viaja en la escritura: `fn_capturar_actor` lo pasa a la bitácora y lo vacía. */
          updated_by: string | null
          id: number
          comercio_id: number
          ciudad_id: number
          nombre: string | null
          direccion: string | null
          telefono: string | null
          activo: boolean
          created_at: Timestamp
          updated_at: Timestamp
          deleted_at: Timestamp | null
        }
        Insert: {
          updated_by?: string | null
          id?: number
          comercio_id: number
          ciudad_id: number
          nombre?: string | null
          direccion?: string | null
          telefono?: string | null
          activo?: boolean
          created_at?: Timestamp
          updated_at?: Timestamp
          deleted_at?: Timestamp | null
        }
        Update: Partial<Database['public']['Tables']['sucursales']['Insert']>
        Relationships: []
      }
      /**
       * Horario de una sucursal (20261024120000_sucursal_horarios.sql). `dia`:
       * 1 = lunes … 7 = domingo, 8 = festivos. Horas 'HH:MM:SS'; `abre` nulo =
       * cerrado. Sin filas = sin horario cargado. Solo escribe `service_role`,
       * por `reemplazar_horario_sucursal`.
       */
      sucursal_horarios: {
        Row: {
          sucursal_id: number
          dia: number
          abre: string | null
          cierra: string | null
          almuerzo_desde: string | null
          almuerzo_hasta: string | null
        }
        Insert: {
          sucursal_id: number
          dia: number
          abre?: string | null
          cierra?: string | null
          almuerzo_desde?: string | null
          almuerzo_hasta?: string | null
        }
        Update: Partial<Database['public']['Tables']['sucursal_horarios']['Insert']>
        Relationships: []
      }
      tipos_beneficio: {
        Row: {
          id: number
          codigo: TipoBeneficioCodigo
          nombre: string
          descripcion: string | null
        }
        Insert: {
          id?: number
          codigo: TipoBeneficioCodigo
          nombre: string
          descripcion?: string | null
        }
        Update: Partial<Database['public']['Tables']['tipos_beneficio']['Insert']>
        Relationships: []
      }
      promociones: {
        Row: {
          /** Quién hizo el cambio. Solo viaja en la escritura: `fn_capturar_actor` lo pasa a la bitácora y lo vacía. */
          updated_by: string | null
          id: number
          comercio_id: number
          tipo_beneficio_id: number
          titulo: string
          descripcion: string | null
          valor: number | null
          fecha_inicio: string | null
          fecha_fin: string | null
          /** Días de la semana ISO (lunes = 1 … domingo = 7) en que vale. `null` = todos. */
          dias_semana: number[] | null
          /** «Condiciones y restricciones»: cuándo o cómo NO aplica. 1–400 caracteres o `null`. Migración 20261024140000. */
          restricciones: string | null
          /**
           * Franjas en que vale: `[{dias, desde, hasta}]`, hora de Colombia; `null` = todo el día.
           * Opcional en el tipo porque la migración 20261028120000 se aplica a mano: hasta
           * entonces `select('*')` no la trae. Se lee SIEMPRE con `normalizarFranjas`.
           */
          franjas_horarias?: { dias: number[]; desde: string; hasta: string }[] | null
          activo: boolean
          created_at: Timestamp
          updated_at: Timestamp
          deleted_at: Timestamp | null
        }
        Insert: {
          updated_by?: string | null
          id?: number
          comercio_id: number
          tipo_beneficio_id: number
          titulo: string
          descripcion?: string | null
          valor?: number | null
          fecha_inicio?: string | null
          fecha_fin?: string | null
          dias_semana?: number[] | null
          restricciones?: string | null
          franjas_horarias?: { dias: number[]; desde: string; hasta: string }[] | null
          activo?: boolean
          created_at?: Timestamp
          updated_at?: Timestamp
          deleted_at?: Timestamp | null
        }
        Update: Partial<Database['public']['Tables']['promociones']['Insert']>
        Relationships: []
      }
      bitacora_actividad: {
        Row: {
          id: number
          actor_id: string | null
          accion: string
          entidad: string
          entidad_id: number | null
          datos_anteriores: Record<string, unknown> | null
          datos_nuevos: Record<string, unknown> | null
          fecha_hora: Timestamp
        }
        Insert: {
          id?: number
          actor_id?: string | null
          accion: string
          entidad: string
          entidad_id?: number | null
          datos_anteriores?: Record<string, unknown> | null
          datos_nuevos?: Record<string, unknown> | null
          fecha_hora?: Timestamp
        }
        Update: Partial<Database['public']['Tables']['bitacora_actividad']['Insert']>
        Relationships: []
      }
      ventas: {
        Row: {
          id: number
          miembro_id: number
          membresia_id: number | null
          sucursal_id: number
          promocion_id: number | null
          valor_compra: number
          valor_descuento: number
          valor_final: number
          metodo_registro: MetodoRegistroVenta
          registrada_por_perfil: string | null
          fecha_hora: Timestamp
          created_at: Timestamp
        }
        Insert: {
          id?: number
          miembro_id: number
          membresia_id?: number | null
          sucursal_id: number
          promocion_id?: number | null
          valor_compra: number
          valor_descuento?: number
          valor_final: number
          metodo_registro: MetodoRegistroVenta
          registrada_por_perfil?: string | null
          fecha_hora?: Timestamp
          created_at?: Timestamp
        }
        Update: Partial<Database['public']['Tables']['ventas']['Insert']>
        Relationships: []
      }
      favoritos: {
        Row: {
          miembro_id: number
          comercio_id: number
          created_at: Timestamp
        }
        Insert: {
          miembro_id: number
          comercio_id: number
          created_at?: Timestamp
        }
        Update: Partial<Database['public']['Tables']['favoritos']['Insert']>
        Relationships: []
      }
      /** Contadores de rate limiting; solo se manipulan mediante RPC con service_role. */
      limite_uso: {
        Row: {
          clave: string
          conteo: number
          ventana_inicia: Timestamp
        }
        Insert: {
          clave: string
          conteo: number
          ventana_inicia?: Timestamp
        }
        Update: Partial<Database['public']['Tables']['limite_uso']['Insert']>
        Relationships: []
      }
      comercio_imagenes: {
        Row: {
          id: number
          comercio_id: number
          url: string
          /** Texto alternativo. Vacío = imagen decorativa, nunca el nombre del archivo. */
          descripcion: string | null
          orden: number
          created_at: Timestamp
        }
        Insert: {
          id?: number
          comercio_id: number
          url: string
          descripcion?: string | null
          orden?: number
          created_at?: Timestamp
        }
        Update: Partial<Database['public']['Tables']['comercio_imagenes']['Insert']>
        Relationships: []
      }
      /**
       * Las categorías de un comercio (20261021130000_comercio_categorias.sql):
       * de 1 a 3, cada una con su subcategoría opcional. Solo escribe
       * `service_role`, por `reemplazar_categorias_comercio`.
       */
      comercio_categorias: {
        Row: {
          comercio_id: number
          categoria_id: number
          subcategoria_id: number | null
          /** 0–2: el orden en que se guardaron. */
          orden: number
        }
        Insert: {
          comercio_id: number
          categoria_id: number
          subcategoria_id?: number | null
          orden: number
        }
        Update: Partial<Database['public']['Tables']['comercio_categorias']['Insert']>
        Relationships: []
      }
      /**
       * Reseñas de socios a comercios (20261020150000_resenas.sql). Solo
       * escribe `service_role`; `trg_resenas_validar` exige compra previa,
       * comercio activo y membresía vigente. Socios y comercios leen por las
       * funciones `resenas_*`; la tabla solo la lee la administración.
       */
      resenas: {
        Row: {
          id: number
          comercio_id: number
          miembro_id: number
          /** 1 a 5. */
          estrellas: number
          /** `null` = solo estrellas. 1–500 caracteres. */
          mensaje: string | null
          respuesta_comercio: string | null
          /** La pone el trigger al escribir o cambiar la respuesta. */
          respuesta_comercio_at: Timestamp | null
          /** Se muestra como «ORUM». */
          respuesta_admin: string | null
          respuesta_admin_at: Timestamp | null
          created_at: Timestamp
          /** Último cambio de estrellas o mensaje; responder no la mueve. */
          updated_at: Timestamp
        }
        Insert: {
          id?: number
          comercio_id: number
          miembro_id: number
          estrellas: number
          mensaje?: string | null
          respuesta_comercio?: string | null
          respuesta_comercio_at?: Timestamp | null
          respuesta_admin?: string | null
          respuesta_admin_at?: Timestamp | null
          created_at?: Timestamp
          updated_at?: Timestamp
        }
        Update: Partial<Database['public']['Tables']['resenas']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'resenas_comercio_id_fkey'
            columns: ['comercio_id']
            isOneToOne: false
            referencedRelation: 'comercios'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'resenas_miembro_id_fkey'
            columns: ['miembro_id']
            isOneToOne: false
            referencedRelation: 'miembros'
            referencedColumns: ['id']
          },
        ]
      }
      configuracion: {
        Row: {
          id: number
          clave: string
          valor: string | null
          descripcion: string | null
          updated_at: Timestamp
        }
        Insert: {
          id?: number
          clave: string
          valor?: string | null
          descripcion?: string | null
          updated_at?: Timestamp
        }
        Update: Partial<Database['public']['Tables']['configuracion']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      buscar_miembro_comercio: {
        Args: { p_numero: string }
        Returns: {
          miembro_id: number
          nombres: string
          apellidos: string
          numero_membresia: string
          vigente: boolean
          membresia_id: number | null
          plan_nombre: string | null
        }[]
      }
      /**
       * Comercios donde el socio más ha usado su membresía.
       *
       * Es función y no consulta porque `ventas` guarda `sucursal_id`, no
       * `comercio_id`: contarlo desde el cliente serían dos consultas y un
       * agrupado en JavaScript sobre todo el historial.
       */
      /**
       * Descuentos más usados del CLUB (global), no los del socio.
       *
       * Es función y no consulta porque contar esto exige leer `ventas` de
       * todos los socios, y un socio no puede leer el historial de los demás.
       * La función devuelve solo el agregado: cuántas veces se usó cada
       * promoción, nunca quién la usó.
       */
      top_descuentos: {
        Args: { p_limite?: number }
        Returns: {
          promocion_id: number
          titulo: string
          valor: number | null
          tipo_beneficio_id: number
          comercio_id: number
          comercio_nombre: string
          logo_url: string | null
          usos: number
        }[]
      }
      comercios_mas_usados: {
        Args: { p_miembro_id: number; p_limite?: number }
        Returns: {
          comercio_id: number
          usos: number
          ultimo_uso: Timestamp
        }[]
      }
      /** Límite de uso: suma 1 al contador de la clave y dice si queda cupo. Solo `service_role`. */
      consumir_cupo: {
        Args: { p_clave: string; p_tope: number; p_ventana_segundos: number }
        Returns: boolean
      }
      /** Borra el contador de una clave (el login lo usa al acertar). Solo `service_role`. */
      reiniciar_cupo: {
        Args: { p_clave: string }
        Returns: undefined
      }
      /**
       * Reemplaza en una transacción las categorías de un comercio. `p_filas`:
       * `[{ categoria_id, subcategoria_id | null }, …]` en orden (hasta 3).
       * Solo `service_role`.
       */
      reemplazar_categorias_comercio: {
        Args: { p_comercio_id: number; p_filas: { categoria_id: number; subcategoria_id: number | null }[]; p_actor?: string | null }
        Returns: undefined
      }
      /**
       * Reemplaza TODO el horario de una sucursal en una transacción. Un
       * arreglo vacío la deja sin horario. Solo `service_role`.
       */
      reemplazar_horario_sucursal: {
        Args: {
          p_sucursal_id: number
          p_filas: {
            dia: number
            abre: string | null
            cierra: string | null
            almuerzo_desde: string | null
            almuerzo_hasta: string | null
          }[]
          p_actor?: string | null
        }
        Returns: undefined
      }
      /**
       * Cantidad y promedio (a un decimal) de las reseñas de un comercio.
       * Sin fila si el comercio no está activo; sin reseñas, `total` 0 y
       * `promedio` null. `numeric` llega como número por PostgREST.
       */
      resenas_resumen: {
        Args: { p_comercio_id: number }
        Returns: {
          total: number
          promedio: number | null
        }[]
      }
      /** Reseñas de un comercio activo, de la más nueva a la más vieja. `autor` = «María G.». */
      resenas_de_comercio: {
        Args: { p_comercio_id: number }
        Returns: {
          id: number
          estrellas: number
          mensaje: string | null
          autor: string
          created_at: Timestamp
          respuesta_comercio: string | null
          respuesta_admin: string | null
          /** La reseña es del socio de la sesión. */
          es_mia: boolean
        }[]
      }
      /** Si el socio de la sesión puede crear o editar su reseña. Pista para la interfaz; la barrera es el trigger. */
      puedo_resenar: {
        Args: { p_comercio_id: number }
        Returns: boolean
      }
    }
    Enums: {
      tipo_membresia: 'nueva' | 'renovada'
      estado_membresia: 'activa' | 'vencida' | 'cancelada' | 'suspendida'
    }
  }
}

/** Atajo para una fila de una tabla: `Row<'empleados'>`. */
export type Row<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
