// Lee la configuración del archivo .env de la raíz del proyecto y abre la conexión.
// Las variables de entorno del sistema tienen prioridad sobre las del .env.
// La URI nunca se imprime, porque lleva la contraseña.
globalThis.conexion = globalThis.conexion || (() => {
  const fs = require('fs');
  const path = require('path');
  const RAIZ_PROYECTO = path.resolve(__dirname, '..', '..');

  function leerEnv() {
    const ruta = path.join(RAIZ_PROYECTO, '.env');
    if (!fs.existsSync(ruta)) return {};
    const variables = {};
    for (const linea of fs.readFileSync(ruta, 'utf8').split(/\r?\n/)) {
      const m = linea.match(/^\s*([A-Za-z_]\w*)\s*=\s*(.*?)\s*$/);
      if (m) variables[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
    return variables;
  }

  function configuracion() {
    const env = { ...leerEnv(), ...process.env };
    return { uri: env.MONGODB_URI, nombreBD: env.MONGODB_DB || 'agencia_viajes' };
  }

  function conectar(nombreBD) {
    const cfg = configuracion();
    if (!cfg.uri) {
      print('Falta MONGODB_URI. Copie .env.example como .env y escriba la URI del cluster.');
      quit(1);
    }
    try {
      const bd = new Mongo(cfg.uri).getDB(nombreBD || cfg.nombreBD);
      bd.runCommand({ ping: 1 });
      return bd;
    } catch (e) {
      print(`No se pudo conectar a MongoDB: ${e.message}`);
      print('Revise la URI en .env y que su IP esté autorizada en Atlas (Security > Network Access).');
      quit(1);
    }
  }

  return { configuracion, conectar };
})();