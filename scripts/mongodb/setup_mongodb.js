// Crea las 12 colecciones con sus reglas de validación y sus índices.
// Si una colección ya existe, actualiza su validador (collMod) sin tocar los datos,
// así que se puede volver a ejecutar después de cambiar esquemas.js.
//
// Uso, desde la raíz del proyecto:
//   mongosh --nodb --quiet scripts/mongodb/setup_mongodb.js
// La conexión se toma de .env (MONGODB_URI y MONGODB_DB); ver .env.example.
//
// Los índices vectoriales y de Atlas Search no se crean aquí: dependen de la
// infraestructura y se configuran aparte.
(() => {
  const path = require('path');
  if (!globalThis.conexion) load(path.join(__dirname, 'conexion.js'));
  if (!globalThis.esquemas) load(path.join(__dirname, 'esquemas.js'));

  globalThis.configurarBase = function (bd) {
    const existentes = new Set(bd.getCollectionNames());
    let errores = 0;

    print('\n--- Configurando Esquemas e Índices Convencionales ---');
    for (const c of esquemas.COLECCIONES) {
      const opciones = { validator: c.validador, validationLevel: 'strict', validationAction: 'error' };
      try {
        let accion;
        if (existentes.has(c.nombre)) {
          const r = bd.runCommand({ collMod: c.nombre, ...opciones });
          if (r && r.ok !== 1) throw Object.assign(new Error(r.errmsg), { code: r.code });
          accion = 'validador actualizado';
        } else {
          bd.createCollection(c.nombre, opciones);
          accion = 'creada';
        }

        // Limpieza de índices obsoletos que inicien con ix_
        try {
          bd.getCollection(c.nombre).getIndexes()
            .filter(i => i.name.startsWith('ix_') || i.name === 'uq_imagen_guia_hash')
            .forEach(i => bd.getCollection(c.nombre).dropIndex(i.name));
        } catch (e) {}

        for (const i of c.indices) bd.getCollection(c.nombre).createIndex(i.claves, i.opciones);
        print(`  ${c.nombre.padEnd(16)} ${accion}, ${c.indices.length} índice(s) B-tree`);
      } catch (e) {
        errores++;
        print(`  ${c.nombre.padEnd(16)} ERROR ${e.code ?? ''}: ${e.message}`);
      }
    }

    print('\n--- Configurando Índices de Búsqueda Vectorial y Full-Text (Atlas) ---');
    for (const idx of esquemas.INDICES_BUSQUEDA || []) {
      const col = bd.getCollection(idx.coleccion);
      try {
        const existe = col.getSearchIndexes(idx.nombre).length > 0;
        if (existe) {
          col.updateSearchIndex(idx.nombre, idx.definicion);
          print(`  [actualizado] ${idx.coleccion}.${idx.nombre}`);
        } else {
          col.createSearchIndex({ name: idx.nombre, type: idx.tipo, definition: idx.definicion });
          print(`  [creado]      ${idx.coleccion}.${idx.nombre}`);
        }
      } catch (err) {
        print(`  [info] Búsqueda vectorial no soportada localmente en ${idx.coleccion}.${idx.nombre} (${err.message})`);
      }
    }

    return errores;
  };

  if (globalThis.SOLO_CARGAR_SETUP) return;

  const bd = conexion.conectar();
  print(`Configurando la base "${bd.getName()}" (MongoDB ${bd.version()})`);
  const errores = configurarBase(bd);
  print(errores ? `Terminó con ${errores} error(es).` : 'Listo.');
  quit(errores ? 1 : 0);
})();