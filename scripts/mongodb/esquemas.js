// Reglas de validación e índices de las 11 colecciones.
globalThis.esquemas = globalThis.esquemas || (() => {
  const ESTRATEGIAS_CHUNKING = ['fixed-size', 'sentence-aware', 'semantic'];
  const PARAMETROS_CHUNKING = {
    'fixed-size': { tamano_tokens: 256, overlap_tokens: 32 },
    'sentence-aware': { max_oraciones: 5, overlap_oraciones: 1 },
    semantic: { umbral_similitud: 0.8 },
  };
  const MODELO_TEXTO = 'intfloat/multilingual-e5-small';
  const DIMENSIONES_TEXTO = 384;
  const ESTADOS_RESERVA = ['pendiente', 'confirmada', 'pagada', 'cancelada', 'completada'];
  const METODOS_PAGO = ['tarjeta', 'transferencia', 'efectivo', 'pse', 'tarjeta_credito', 'tarjeta_debito'];
  const TIPOS_TRANSPORTE = ['aereo', 'terrestre', 'maritimo', 'vuelo'];
  const ENDPOINTS = ['/search', '/rag'];
  const PRIORIDADES = ['baja', 'media', 'alta', 'critica', 'crítica'];
  const ESTADOS_INCIDENTE = ['abierto', 'resuelto'];

  const PATRON = {
    idioma: '^[a-z]{2}$',
    email: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$',
    url: '^https?://',
    hora: '^([01][0-9]|2[0-3]):[0-5][0-9]$',
  };

  const texto = (extra = {}) => ({ bsonType: 'string', minLength: 1, ...extra });
  const entero = (minimo, maximo) => ({
    bsonType: ['int', 'long', 'double'],
    multipleOf: 1,
    minimum: minimo,
    ...(maximo !== undefined && { maximum: maximo }),
  });
  const numero = (minimo, { exclusivo = false } = {}) => ({
    bsonType: ['int', 'long', 'double', 'decimal', 'number'],
    minimum: minimo,
    ...(exclusivo && { exclusiveMinimum: true }),
  });
  const fecha = { bsonType: 'date' };
  const ref = { bsonType: 'objectId' };
  const vector = dimensiones => ({
    bsonType: 'array',
    minItems: dimensiones,
    maxItems: dimensiones,
    items: { bsonType: ['double', 'int', 'long', 'number'] },
  });
  const objeto = (required, properties, extra = {}) => ({
    bsonType: 'object',
    ...(required.length && { required }),
    properties,
    ...extra,
  });
  const arreglo = (items, extra = {}) => ({ bsonType: 'array', items, ...extra });

  const validador = (esquema, ...expresiones) => (expresiones.length
    ? { $and: [{ $jsonSchema: esquema }, ...expresiones.map(e => ({ $expr: e }))] }
    : { $jsonSchema: esquema });

  const tamano = campo => ({ $cond: [{ $isArray: campo }, { $size: campo }, -1] });

  const COLECCIONES = [
    // 1. destinos
    {
      nombre: 'destinos',
      validador: validador(objeto(['nombre', 'descripcion', 'ubicacion'], {
        nombre: texto(),
        descripcion: texto(),
        ubicacion: objeto(['pais'], { pais: texto(), region: texto() }),
        calificacion_promedio: numero(0, 5),
        total_resenas: entero(0),
        embedding: vector(DIMENSIONES_TEXTO),
        modelo_embedding: texto(),
      })),
      indices: [
        { claves: { nombre: 1, 'ubicacion.pais': 1 }, opciones: { name: 'uq_destino_nombre_pais', unique: true } },
        { claves: { 'ubicacion.pais': 1, 'ubicacion.region': 1 }, opciones: { name: 'idx_destino_ubicacion' } },
        { claves: { calificacion_promedio: -1 }, opciones: { name: 'idx_destino_calificacion', partialFilterExpression: { total_resenas: { $gt: 0 } } } },
      ],
    },

    // 2. usuarios
    {
      nombre: 'usuarios',
      validador: validador(objeto(['nombre', 'documento', 'fecha_registro'], {
        nombre: texto(),
        documento: texto(),
        email: texto({ pattern: PATRON.email }),
        contacto: objeto([], { correo: texto({ pattern: PATRON.email }), telefono: texto() }),
        fecha_nacimiento: fecha,
        fecha_registro: fecha,
        idioma_preferido: texto({ pattern: PATRON.idioma }),
        historial_consultas: arreglo(objeto(['fecha'], {
          texto: texto(),
          consulta: texto(),
          respuesta: texto(),
          endpoint: { enum: ENDPOINTS },
          fecha,
        }), { maxItems: 50 }),
      })),
      indices: [
        { claves: { documento: 1 }, opciones: { name: 'uq_usuario_documento', unique: true } },
        { claves: { email: 1 }, opciones: { name: 'uq_usuario_email', unique: true, partialFilterExpression: { email: { $exists: true } } } },
        { claves: { 'contacto.correo': 1 }, opciones: { name: 'uq_usuario_correo', unique: true, partialFilterExpression: { 'contacto.correo': { $exists: true } } } },
      ],
    },

    // 3. agentes
    {
      nombre: 'agentes',
      validador: validador(objeto(['nombre', 'email', 'codigo', 'sede'], {
        nombre: texto(),
        email: texto({ pattern: PATRON.email }),
        codigo: texto(),
        sede: texto(),
      })),
      indices: [
        { claves: { codigo: 1 }, opciones: { name: 'uq_agente_codigo', unique: true } },
        { claves: { email: 1 }, opciones: { name: 'uq_agente_email', unique: true } },
        { claves: { sede: 1 }, opciones: { name: 'idx_agente_sede' } },
      ],
    },

    // 4. proveedores
    {
      nombre: 'proveedores',
      validador: validador(objeto(['nombre', 'tipo'], {
        nombre: texto(),
        tipo: texto(),
        contacto: objeto([], {
          email: texto({ pattern: PATRON.email }),
          correo: texto({ pattern: PATRON.email }),
          telefono: texto(),
        }),
      })),
      indices: [
        { claves: { nombre: 1 }, opciones: { name: 'uq_proveedor_nombre', unique: true } },
        { claves: { tipo: 1 }, opciones: { name: 'idx_proveedor_tipo' } },
      ],
    },

    // 5. hoteles
    {
      nombre: 'hoteles',
      validador: validador(objeto(['nombre', 'estrellas', 'destino_id', 'habitaciones'], {
        nombre: texto(),
        estrellas: entero(1, 5),
        direccion: texto(),
        destino_id: ref,
        habitaciones: arreglo(objeto(['tipo', 'capacidad', 'precio_noche'], {
          tipo: texto(),
          capacidad: entero(1),
          precio_noche: numero(0),
        }), { minItems: 1, maxItems: 30 }),
      })),
      indices: [
        { claves: { destino_id: 1, estrellas: -1 }, opciones: { name: 'idx_hotel_destino_estrellas' } },
      ],
    },

    // 6. resenas
    {
      nombre: 'resenas',
      validador: validador(objeto(['usuario_id', 'destino_id', 'calificacion', 'fecha'], {
        usuario_id: ref,
        destino_id: ref,
        calificacion: entero(1, 5),
        comentario: { bsonType: 'string', maxLength: 2000 },
        fecha,
        embedding: vector(DIMENSIONES_TEXTO),
        modelo_embedding: texto(),
      })),
      indices: [
        { claves: { destino_id: 1, fecha: -1 }, opciones: { name: 'idx_resena_destino_fecha' } },
        { claves: { usuario_id: 1, fecha: -1 }, opciones: { name: 'idx_resena_usuario_fecha' } },
      ],
    },

    // 7. guias (con atributos de imágenes estándar)
    {
      nombre: 'guias',
      validador: validador(objeto(['titulo', 'idioma', 'fecha', 'destino_id', 'destino_nombre'], {
        titulo: texto(),
        idioma: texto({ pattern: PATRON.idioma }),
        fecha,
        contenido: texto(),
        contenido_texto: texto(),
        destino_id: ref,
        destino_nombre: texto(),
        etiquetas: arreglo(texto(), { uniqueItems: true }),
        imagenes: arreglo(objeto(['url'], {
          url: texto({ pattern: PATRON.url }),
          miniatura_url: texto({ pattern: PATRON.url }),
          pie: texto(),
          tipo: texto(),
          autor: texto(),
          licencia: texto(),
        }), { maxItems: 50 }),
      })),
      indices: [
        { claves: { fecha: 1, idioma: 1 }, opciones: { name: 'idx_fecha_idioma' } },
        { claves: { contenido_texto: 'text' }, opciones: { name: 'idx_texto', default_language: 'spanish', language_override: 'idioma' } },
        { claves: { etiquetas: 1 }, opciones: { name: 'idx_etiquetas' } },
        { claves: { destino_id: 1, idioma: 1, titulo: 1 }, opciones: { name: 'uq_guia_destino_idioma_titulo', unique: true } },
      ],
    },

    // 8. chunks
    {
      nombre: 'chunks',
      validador: validador(
        objeto([
          'doc_id', 'chunk_index', 'estrategia_chunking', 'chunk_texto', 'embedding', 'modelo', 'fecha_ingesta',
          'n_tokens', 'metadatos',
        ], {
          doc_id: ref,
          chunk_index: entero(0),
          estrategia_chunking: { enum: ESTRATEGIAS_CHUNKING },
          chunk_texto: texto(),
          contexto: texto(),
          embedding: vector(DIMENSIONES_TEXTO),
          modelo: texto(),
          fecha_ingesta: fecha,
          n_tokens: entero(1, 512),
          metadatos: objeto(['idioma', 'fecha'], {
            idioma: texto({ pattern: PATRON.idioma }),
            fecha,
            etiquetas: arreglo(texto(), { uniqueItems: true }),
            destino_id: ref,
            destino_nombre: texto(),
          }),
        })
      ),
      indices: [
        { claves: { doc_id: 1, estrategia_chunking: 1, chunk_index: 1 }, opciones: { name: 'uq_chunk_doc_estrategia_indice', unique: true } },
      ],
    },

    // 9. paquetes
    {
      nombre: 'paquetes',
      validador: validador(
        objeto(['nombre', 'descripcion', 'precio', 'cupos', 'destinos', 'itinerario'], {
          nombre: texto(),
          descripcion: texto(),
          duracion: entero(1, 7),
          duracion_dias: entero(1, 7),
          precio: numero(0),
          cupos: entero(0),
          fecha_viaje: fecha,
          destinos: arreglo(objeto(['destino_id', 'nombre'], { destino_id: ref, nombre: texto() }), { minItems: 1 }),
          hoteles: arreglo(objeto(['hotel_id', 'nombre'], { hotel_id: ref, nombre: texto() }), { minItems: 1 }),
          itinerario: arreglo(objeto(['dia', 'titulo'], {
            dia: entero(1, 7),
            titulo: texto(),
            actividades: arreglo(objeto(['nombre'], {
              nombre: texto(),
              hora: texto({ pattern: PATRON.hora }),
              descripcion: texto(),
            })),
          }), { minItems: 1, maxItems: 7 }),
          transportes: arreglo(objeto(['tipo', 'proveedor_id'], {
            tipo: texto(),
            origen: texto(),
            destino: texto(),
            lugar_origen: texto(),
            lugar_destino: texto(),
            proveedor_id: ref,
          })),
        }),
        {
          $or: [
            { $eq: [tamano('$itinerario'), '$duracion_dias'] },
            { $eq: [tamano('$itinerario'), '$duracion'] },
          ],
        }
      ),
      indices: [
        { claves: { 'destinos.destino_id': 1, fecha_viaje: 1 }, opciones: { name: 'idx_paquete_destino_fecha' } },
        { claves: { 'hoteles.hotel_id': 1 }, opciones: { name: 'idx_paquete_hotel' } },
        { claves: { 'transportes.proveedor_id': 1 }, opciones: { name: 'idx_paquete_proveedor' } },
        { claves: { fecha_viaje: 1 }, opciones: { name: 'idx_paquete_disponibles', partialFilterExpression: { cupos: { $gt: 0 } } } },
      ],
    },

    // 10. reservas
    {
      nombre: 'reservas',
      validador: validador(
        objeto([
          'usuario_id', 'agente_id', 'paquete_id', 'paquete_nombre', 'precio_pactado', 'total',
          'fecha_reserva', 'fecha_viaje', 'estado', 'pasajeros',
        ], {
          usuario_id: ref,
          agente_id: ref,
          paquete_id: ref,
          paquete_nombre: texto(),
          precio_pactado: numero(0),
          total: numero(0),
          fecha_reserva: fecha,
          fecha_viaje: fecha,
          estado: { enum: ESTADOS_RESERVA },
          pasajeros: arreglo(objeto(['nombre', 'documento', 'fecha_nacimiento'], {
            nombre: texto(),
            documento: texto(),
            fecha_nacimiento: fecha,
          }), { minItems: 1 }),
          pagos: arreglo(objeto(['fecha', 'monto', 'metodo'], {
            fecha,
            monto: numero(0, { exclusivo: true }),
            metodo: { enum: METODOS_PAGO },
          })),
        }),
        { $lte: [{ $sum: '$pagos.monto' }, '$total'] },
        { $gte: ['$fecha_viaje', '$fecha_reserva'] }
      ),
      indices: [
        { claves: { usuario_id: 1, fecha_reserva: -1 }, opciones: { name: 'idx_reserva_usuario_fecha' } },
        { claves: { agente_id: 1, estado: 1 }, opciones: { name: 'idx_reserva_agente_estado' } },
        { claves: { paquete_id: 1, estado: 1 }, opciones: { name: 'idx_reserva_paquete_estado' } },
      ],
    },

    // 11. incidentes
    {
      nombre: 'incidentes',
      validador: validador(
        objeto([
          'reserva_id', 'usuario_id', 'tipo', 'descripcion', 'fecha_reporte', 'prioridad', 'estado',
        ], {
          reserva_id: ref,
          usuario_id: ref,
          tipo: texto(),
          descripcion: texto(),
          fecha_reporte: fecha,
          prioridad: { enum: PRIORIDADES },
          estado: { enum: ESTADOS_INCIDENTE },
          solucion: objeto(['agente_id', 'fecha'], {
            agente_id: ref,
            texto: texto(),
            descripcion: texto(),
            fecha,
          }),
        }),
        { $eq: [{ $eq: ['$estado', 'resuelto'] }, { $ne: [{ $type: '$solucion' }, 'missing'] }] }
      ),
      indices: [
        { claves: { usuario_id: 1, fecha_reporte: -1 }, opciones: { name: 'idx_incidente_usuario_fecha' } },
        { claves: { reserva_id: 1, fecha_reporte: -1 }, opciones: { name: 'idx_incidente_reserva_fecha' } },
        { claves: { prioridad: 1, fecha_reporte: 1 }, opciones: { name: 'idx_incidente_abiertos', partialFilterExpression: { estado: 'abierto' } } },
        { claves: { 'solucion.agente_id': 1, 'solucion.fecha': -1 }, opciones: { name: 'idx_incidente_solucion_agente', partialFilterExpression: { estado: 'resuelto' } } },
      ],
    },
  ];

  const INDICES_BUSQUEDA = [
    {
      coleccion: 'chunks',
      nombre: 'vector_index',
      tipo: 'vectorSearch',
      definicion: {
        fields: [
          { type: 'vector', path: 'embedding', numDimensions: 384, similarity: 'cosine' },
          { type: 'filter', path: 'metadatos.idioma' },
          { type: 'filter', path: 'metadatos.fecha' },
          { type: 'filter', path: 'metadatos.etiquetas' },
          { type: 'filter', path: 'metadatos.destino_id' },
          { type: 'filter', path: 'estrategia_chunking' },
          { type: 'filter', path: 'doc_id' },
        ],
      },
    },
    {
      coleccion: 'chunks',
      nombre: 'text_index',
      tipo: 'search',
      definicion: {
        mappings: {
          dynamic: false,
          fields: {
            chunk_texto: { type: 'string' },
            contexto: { type: 'string' },
            estrategia_chunking: { type: 'token' },
            metadatos: {
              type: 'document',
              fields: {
                idioma: { type: 'token' },
                etiquetas: { type: 'token' },
                fecha: { type: 'date' },
              },
            },
          },
        },
      },
    },
  ];

  return { COLECCIONES, INDICES_BUSQUEDA, PARAMETROS_CHUNKING, MODELO_TEXTO };
})();