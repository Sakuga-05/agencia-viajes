// Documentos de ejemplo de las 11 colecciones, coherentes entre sí: cada
// referencia apunta a un documento que también está aquí. Los usan:
// - cargar_ejemplos.js, que los deja en la base del proyecto;
// - test_setup_mongodb.js, que parte del primero de cada colección para armar
//   los casos de prueba y comprueba que todos pasen la validación.
//
// Los textos están abreviados y los vectores son de relleno. Los reales los
// genera el pipeline de ingesta (Entrega 2); en una guía real, cada chunk
// fixed-size tiene 256 tokens.
// Documentos de ejemplo con información de imágenes embebida directamente en 'guias'.
globalThis.ejemplos = globalThis.ejemplos || (() => {
  if (!globalThis.esquemas) load(require('path').join(__dirname, 'esquemas.js'));

  const oid = n => new ObjectId(`66f0${'0'.repeat(15)}${String(n).padStart(5, '0')}`);
  const ID = {
    cartagena: oid(101), santaMarta: oid(102),
    ana: oid(301), luis: oid(302),
    agente: oid(401),
    proveedorTerrestre: oid(501), proveedorAereo: oid(502),
    hotelCartagena: oid(601), hotelSantaMarta: oid(602),
    resenaAna: oid(701), resenaLuis: oid(702),
    guiaEs: oid(801), guiaEn: oid(802),
    chunk1: oid(901),
    paquete: oid(1001),
    reserva: oid(1101),
    incidenteResuelto: oid(1202),
  };

  const vector = n => Array.from({ length: n }, (_, i) => Number((Math.sin((i + 1) * 0.3) * 0.1).toFixed(6)));

  const CONTENIDO_GUIA =
    "Cartagena de Indias es una ciudad portuaria del Caribe colombiano fundada en 1533. " +
    "Su centro histórico está rodeado por cerca de once kilómetros de murallas coloniales que hoy son Patrimonio de la Humanidad. " +
    "Se recomienda recorrer el Centro Amurallado a primera hora para evitar el calor y las multitudes.";

  function documentos() {
    const fechaIngesta = new Date('2026-10-11T12:00:00Z');

    return {
      destinos: [
        {
          _id: ID.cartagena,
          nombre: 'Cartagena',
          descripcion: 'Ciudad amurallada del Caribe colombiano.',
          ubicacion: { pais: 'Colombia', region: 'Bolívar' },
          calificacion_promedio: 4.8,
          total_resenas: 12,
        },
        {
          _id: ID.santaMarta,
          nombre: 'Santa Marta',
          descripcion: 'Ciudad costera, puerta de entrada al Parque Tayrona.',
          ubicacion: { pais: 'Colombia', region: 'Magdalena' },
          calificacion_promedio: 4.5,
          total_resenas: 8,
        },
      ],

      usuarios: [
        {
          _id: ID.ana,
          nombre: 'Ana Ruiz',
          documento: 'CC 1053000111',
          email: 'ana.ruiz@example.com',
          contacto: { correo: 'ana.ruiz@example.com', telefono: '+57 300 000 0000' },
          fecha_nacimiento: new Date('1990-04-12'),
          fecha_registro: new Date('2026-01-10'),
          idioma_preferido: 'es',
          historial_consultas: [
            { consulta: '¿Qué destinos son buenos para ecoturismo?', texto: 'ecoturismo', endpoint: '/rag', fecha: new Date('2026-09-20') },
          ],
        },
      ],

      agentes: [
        { _id: ID.agente, nombre: 'Carlos Pérez', email: 'carlos.perez@example.com', codigo: 'AG-001', sede: 'Manizales' },
      ],

      proveedores: [
        {
          _id: ID.proveedorTerrestre,
          nombre: 'Transportes del Caribe',
          tipo: 'transporte_terrestre',
          contacto: { email: 'ventas@transportes.example.com', correo: 'ventas@transportes.example.com', telefono: '+57 300 000 0000' },
        },
      ],

      hoteles: [
        {
          _id: ID.hotelCartagena,
          nombre: 'Hotel Las Murallas',
          estrellas: 4,
          direccion: 'Calle del Arsenal 10',
          destino_id: ID.cartagena,
          habitaciones: [{ tipo: 'doble', capacidad: 2, precio_noche: 350000 }],
        },
      ],

      resenas: [
        {
          _id: ID.resenaAna,
          usuario_id: ID.ana,
          destino_id: ID.cartagena,
          calificacion: 5,
          comentario: 'Excelente ciudad para caminar de noche.',
          fecha: new Date('2026-03-02'),
        },
      ],

      guias: [
        {
          _id: ID.guiaEs,
          titulo: 'Cartagena de Indias: guía completa',
          idioma: 'es',
          fecha: new Date('2024-08-15'),
          contenido: CONTENIDO_GUIA,
          contenido_texto: CONTENIDO_GUIA,
          destino_id: ID.cartagena,
          destino_nombre: 'Cartagena',
          etiquetas: ['playa', 'historia'],
          imagenes: [
            {
              url: 'https://example.org/imagenes/cartagena_torre_del_reloj.jpg',
              miniatura_url: 'https://example.org/imagenes/320px/cartagena_torre_del_reloj.jpg',
              pie: 'Torre del Reloj, entrada a la ciudad amurallada',
              tipo: 'jpeg',
              autor: 'Autor de ejemplo',
              licencia: 'CC BY-SA 4.0',
            },
            {
              url: 'https://example.org/imagenes/cartagena_castillo_san_felipe.jpg',
              miniatura_url: 'https://example.org/imagenes/320px/cartagena_castillo_san_felipe.jpg',
              pie: 'Castillo de San Felipe',
              tipo: 'jpeg',
              autor: 'Autor de ejemplo',
              licencia: 'CC BY-SA 4.0',
            },
          ],
        },
      ],

      chunks: [
        {
          _id: ID.chunk1,
          doc_id: ID.guiaEs,
          chunk_index: 0,
          estrategia_chunking: 'sentence-aware',
          chunk_texto: CONTENIDO_GUIA,
          contexto: 'Fragmento introductorio de la guía de Cartagena de Indias.',
          embedding: vector(384),
          modelo: esquemas.MODELO_TEXTO,
          fecha_ingesta: fechaIngesta,
          n_tokens: 42,
          metadatos: { idioma: 'es', fecha: new Date('2024-08-15'), etiquetas: ['playa', 'historia'], destino_id: ID.cartagena, destino_nombre: 'Cartagena' },
        },
      ],

      paquetes: [
        {
          _id: ID.paquete,
          nombre: 'Caribe colombiano 3 días',
          descripcion: 'Cartagena y Santa Marta en tres días.',
          duracion: 3,
          duracion_dias: 3,
          precio: 2400000,
          cupos: 20,
          fecha_viaje: new Date('2026-12-15'),
          destinos: [{ destino_id: ID.cartagena, nombre: 'Cartagena' }],
          hoteles: [{ hotel_id: ID.hotelCartagena, nombre: 'Hotel Las Murallas' }],
          itinerario: [
            { dia: 1, titulo: 'Llegada', actividades: [{ nombre: 'Recorrido', hora: '15:00' }] },
            { dia: 2, titulo: 'Playa', actividades: [{ nombre: 'Lancha', hora: '08:30' }] },
            { dia: 3, titulo: 'Regreso', actividades: [{ nombre: 'Traslado', hora: '09:00' }] },
          ],
          transportes: [{ tipo: 'terrestre', proveedor_id: ID.proveedorTerrestre }],
        },
      ],

      reservas: [
        {
          _id: ID.reserva,
          usuario_id: ID.ana,
          agente_id: ID.agente,
          paquete_id: ID.paquete,
          paquete_nombre: 'Caribe colombiano 3 días',
          precio_pactado: 2400000,
          total: 4800000,
          fecha_reserva: new Date('2026-10-01'),
          fecha_viaje: new Date('2026-12-15'),
          estado: 'confirmada',
          pasajeros: [{ nombre: 'Ana Ruiz', documento: 'CC 1053000111', fecha_nacimiento: new Date('1990-04-12') }],
          pagos: [{ fecha: new Date('2026-10-01'), monto: 2400000, metodo: 'tarjeta' }],
        },
      ],

      incidentes: [
        {
          _id: ID.incidenteResuelto,
          reserva_id: ID.reserva,
          usuario_id: ID.ana,
          tipo: 'datos_pasajero',
          descripcion: 'El documento de un pasajero quedó mal escrito.',
          fecha_reporte: new Date('2026-10-02'),
          prioridad: 'baja',
          estado: 'resuelto',
          solucion: { agente_id: ID.agente, texto: 'Se corrigió el documento.', descripcion: 'Se corrigió el documento.', fecha: new Date('2026-10-03') },
        },
      ],
    };
  }

  return { ID, documentos, vector };
})();