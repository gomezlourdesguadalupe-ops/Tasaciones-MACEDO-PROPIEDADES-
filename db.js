// db.js
// Almacenamiento simple basado en un archivo JSON en disco.
// Se eligio este enfoque (en vez de una base de datos con dependencias
// nativas como SQLite) para que la instalacion en Render sea 100%
// confiable, sin pasos de compilacion que puedan fallar.
//
// Para el volumen de uso de una tasadora (decenas/cientos de tasaciones)
// esto es mas que suficiente. Si en el futuro crece mucho el volumen,
// se puede migrar a una base de datos real sin cambiar el resto del
// codigo, ya que toda la logica de acceso a datos esta aislada aqui.

const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_FILE = path.join(DATA_DIR, 'tasaciones.json');

function estadoVacio() {
  return {
    siguiente_id_tasacion: 1,
    siguiente_id_comparable: 1,
    tasaciones: [],
    comparables: [],
  };
}

function leer() {
  if (!fs.existsSync(DB_FILE)) {
    const vacio = estadoVacio();
    guardar(vacio);
    return vacio;
  }
  try {
    const contenido = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(contenido);
  } catch (err) {
    console.error('Error leyendo la base de datos, se reinicia el archivo:', err);
    const vacio = estadoVacio();
    guardar(vacio);
    return vacio;
  }
}

function guardar(estado) {
  // Escritura atomica: primero a un archivo temporal, luego rename.
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(estado, null, 2), 'utf-8');
  fs.renameSync(tmp, DB_FILE);
}

function ahora() {
  return new Date().toISOString();
}

// ---------- API de tasaciones ----------

function listarTasaciones() {
  const estado = leer();
  return [...estado.tasaciones].sort(
    (a, b) => new Date(b.actualizado_en) - new Date(a.actualizado_en)
  );
}

function obtenerTasacion(id) {
  const estado = leer();
  return estado.tasaciones.find(t => t.id === Number(id)) || null;
}

function crearTasacion(datos) {
  const estado = leer();
  const id = estado.siguiente_id_tasacion++;
  const registro = {
    id,
    creado_en: ahora(),
    actualizado_en: ahora(),
    ...datos,
  };
  estado.tasaciones.push(registro);
  guardar(estado);
  return registro;
}

function actualizarTasacion(id, datos) {
  const estado = leer();
  const idx = estado.tasaciones.findIndex(t => t.id === Number(id));
  if (idx === -1) return null;
  estado.tasaciones[idx] = {
    ...estado.tasaciones[idx],
    ...datos,
    id: Number(id),
    actualizado_en: ahora(),
  };
  guardar(estado);
  return estado.tasaciones[idx];
}

function eliminarTasacion(id) {
  const estado = leer();
  const idx = estado.tasaciones.findIndex(t => t.id === Number(id));
  if (idx === -1) return false;
  estado.tasaciones.splice(idx, 1);
  // Borrado en cascada de sus comparables
  estado.comparables = estado.comparables.filter(c => c.tasacion_id !== Number(id));
  guardar(estado);
  return true;
}

// ---------- API de comparables ----------

function listarComparables(tasacionId) {
  const estado = leer();
  return estado.comparables.filter(c => c.tasacion_id === Number(tasacionId));
}

function agregarComparable(tasacionId, datos) {
  const estado = leer();
  const id = estado.siguiente_id_comparable++;
  const registro = {
    id,
    tasacion_id: Number(tasacionId),
    creado_en: ahora(),
    ...datos,
  };
  estado.comparables.push(registro);
  guardar(estado);
  return registro;
}

function reemplazarComparables(tasacionId, listaComparables) {
  const estado = leer();
  estado.comparables = estado.comparables.filter(c => c.tasacion_id !== Number(tasacionId));
  const nuevos = [];
  for (const c of listaComparables) {
    if (!c.metros_cuadrados || !c.precio) continue;
    const id = estado.siguiente_id_comparable++;
    const registro = {
      id,
      tasacion_id: Number(tasacionId),
      direccion: c.direccion || null,
      metros_cuadrados: c.metros_cuadrados,
      precio: c.precio,
      caracteristicas: c.caracteristicas || null,
      creado_en: ahora(),
    };
    estado.comparables.push(registro);
    nuevos.push(registro);
  }
  guardar(estado);
  return nuevos;
}

function eliminarComparable(id) {
  const estado = leer();
  const idx = estado.comparables.findIndex(c => c.id === Number(id));
  if (idx === -1) return false;
  estado.comparables.splice(idx, 1);
  guardar(estado);
  return true;
}

module.exports = {
  listarTasaciones,
  obtenerTasacion,
  crearTasacion,
  actualizarTasacion,
  eliminarTasacion,
  listarComparables,
  agregarComparable,
  reemplazarComparables,
  eliminarComparable,
};
