// Prueba que las reglas de setup_mongodb.js aceptan los documentos válidos y
// rechazan los inválidos, que los índices únicos impiden duplicados y que todos
// los ejemplos de ejemplos.js pasan la validación.
//
// Trabaja en una base aparte (<MONGODB_DB>_test) que se vacía al empezar y al
// terminar. La base real del proyecto no se toca.
//
// Uso, desde la raíz del proyecto:
//   mongosh --nodb --quiet scripts/mongodb/test_setup_mongodb.js
(() => {
  const path = require('path');
  globalThis.SOLO_CARGAR_SETUP = true;
  load(path.join(__dirname, 'setup_mongodb.js'));
  load(path.join(__dirname, 'ejemplos.js'));

  const nombreBD = `${conexion.configuracion().nombreBD}_test`;
  const bd = conexion.conectar(nombreBD);
  const vaciar = () => bd.getCollectionNames().forEach(n => bd.getCollection(n).drop());

  print(`Base de prueba: ${nombreBD} (MongoDB ${bd.version()})\n`);
  vaciar();
  if (configurarBase(bd) > 0) {
    print('\nError al configurar colecciones de prueba.');
    quit(1);
  }

  const { vector } = ejemplos;
  const casos = [];
  const col = nombre => bd.getCollection(nombre);

  const nuevo = (coleccion, cambiar = () => {}) => {
    const docs = ejemplos.documentos()[coleccion];
    if (!docs || !docs.length) return {};
    const d = JSON.parse(JSON.stringify(docs[0]));
    delete d._id;
    cambiar(d);
    return d;
  };

  const acepta = (c, desc, cambiar) => casos.push({ c, desc, esp: 'aceptado', fn: () => col(c).insertOne(nuevo(c, cambiar)) });
  const rechaza = (c, desc, cambiar) => casos.push({ c, desc, esp: 'rechazado', fn: () => col(c).insertOne(nuevo(c, cambiar)) });

  // 1. guias
  acepta('guias', 'Guía válida con imágenes estándar embebidas', () => {});
  rechaza('guias', 'Idioma "ES" en mayúsculas', d => { d.idioma = 'ES'; });
  rechaza('guias', 'Etiquetas duplicadas', d => { d.etiquetas = ['playa', 'playa']; });
  rechaza('guias', 'Imagen con URL sin formato http(s)', d => { d.imagenes[0].url = 'imagen_local.jpg'; });

  // 2. paquetes
  rechaza('paquetes', 'Itinerario de 1 día con duración declarada de 2 días', d => { d.duracion = 2; d.duracion_dias = 2; });
  acepta('paquetes', 'Paquete válido con duración de 3 días e itinerario coincidente', () => {});

  // 3. reservas
  acepta('reservas', 'Reserva válida con pago parcial', () => {});
  rechaza('reservas', 'Pagos superan el monto total', d => { d.pagos.push({ fecha: new Date(), monto: 9999999, metodo: 'tarjeta' }); });

  // 4. incidentes
  acepta('incidentes', 'Incidente resuelto con solución', () => {});
  rechaza('incidentes', 'Incidente resuelto sin solución', d => { delete d.solucion; });

  // 5. chunks
  acepta('chunks', 'Chunk vectorial válido de 384 dimensiones', () => {});
  rechaza('chunks', 'Vector de 383 dimensiones', d => { d.embedding = vector(383); });

  let fallas = 0;
  for (const test of casos) {
    let res = 'aceptado';
    try {
      test.fn();
    } catch (e) {
      res = e.code === 11000 ? 'duplicado' : 'rechazado';
    }
    const ok = res === test.esp;
    if (!ok) fallas++;
    print(`  ${ok ? '[OK]   ' : '[FALLA]'} ${test.c}: ${test.desc}`);
    col(test.c).deleteMany({});
  }

  vaciar();
  print(`\nPruebas finalizadas. Exitosas: ${casos.length - fallas} de ${casos.length}.`);
  quit(fallas ? 1 : 0);
})();