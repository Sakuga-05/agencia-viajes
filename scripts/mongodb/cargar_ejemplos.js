// Carga los documentos de ejemplo de ejemplos.js en la base del proyecto, para
// verlos en Atlas o Compass. Cada documento pasa por el validador de su colección.
//
// Se puede ejecutar varias veces: los _id son fijos, así que cada carga
// reemplaza los ejemplos anteriores en vez de duplicarlos.
//
// Uso, desde la raíz del proyecto y después de setup_mongodb.js:
//   mongosh --nodb --quiet scripts/mongodb/cargar_ejemplos.js
// Carga los documentos de ejemplo de ejemplos.js en la base del proyecto.
(() => {
  const path = require('path');
  if (!globalThis.conexion) load(path.join(__dirname, 'conexion.js'));
  if (!globalThis.ejemplos) load(path.join(__dirname, 'ejemplos.js'));

  const bd = conexion.conectar();
  print(`Cargando ejemplos en la base "${bd.getName()}"`);

  let errores = 0;
  for (const [coleccion, docs] of Object.entries(ejemplos.documentos())) {
    let cargados = 0;
    for (const doc of docs) {
      try {
        bd.getCollection(coleccion).replaceOne({ _id: doc._id }, doc, { upsert: true });
        cargados++;
      } catch (e) {
        errores++;
        print(`  ${coleccion}: ERROR en ${doc._id}: ${e.message}`.slice(0, 300));
      }
    }
    print(`  ${coleccion.padEnd(16)} ${cargados} de ${docs.length} documento(s)`);
  }

  print(errores ? `Terminó con ${errores} error(es).` : 'Listo.');
  quit(errores ? 1 : 0);
})();
