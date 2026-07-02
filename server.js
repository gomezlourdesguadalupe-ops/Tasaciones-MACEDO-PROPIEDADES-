// server.js
// Servidor principal de la app de Tasaciones Macedo Propiedades.

const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const { calcularTasacion, analizarComparables } = require('./calculo');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Helpers ----------

function normalizarEntrada(d) {
  return {
    nombre_cliente: d.nombre_cliente || null,
    direccion: d.direccion,
    barrio: d.barrio || null,
    ciudad: d.ciudad || null,
    notas: d.notas || null,

    metros_cuadrados: Number(d.metros_cuadrados) || 0,
    valor_m2_min: Number(d.valor_m2_min) || 0,
    valor_m2_max: Number(d.valor_m2_max) || 0,

    ubicacion_cuadra: d.ubicacion_cuadra === 'esquina' ? 'esquina' : 'mitad',
    pct_esquina: d.pct_esquina ?? 10,

    es_inundable: !!d.es_inundable,
    pct_inundable: d.pct_inundable ?? -15,

    servicio_luz: !!d.servicio_luz,
    pct_luz: d.pct_luz ?? 3,
    servicio_gas: !!d.servicio_gas,
    pct_gas: d.pct_gas ?? 3,
    servicio_agua: !!d.servicio_agua,
    pct_agua: d.pct_agua ?? 4,
    servicio_internet: !!d.servicio_internet,
    pct_internet: d.pct_internet ?? 2,
    servicio_asfalto: !!d.servicio_asfalto,
    pct_asfalto: d.pct_asfalto ?? 5,

    tiene_construccion: !!d.tiene_construccion,
    metros_construidos: Number(d.metros_construidos) || 0,
    pct_construccion: d.pct_construccion ?? 20,
  };
}

function calcularYAdjuntar(datosNormalizados) {
  const calculo = calcularTasacion(datosNormalizados);
  return {
    ...datosNormalizados,
    valor_min_calculado: calculo.valor_min_calculado,
    valor_max_calculado: calculo.valor_max_calculado,
    valor_m2_min_final: calculo.valor_m2_min_final,
    valor_m2_max_final: calculo.valor_m2_max_final,
  };
}

// ---------- Rutas API ----------

// Listar todas las tasaciones (resumen)
app.get('/api/tasaciones', (req, res) => {
  const tasaciones = db.listarTasaciones().map(t => ({
    id: t.id,
    nombre_cliente: t.nombre_cliente,
    direccion: t.direccion,
    barrio: t.barrio,
    ciudad: t.ciudad,
    metros_cuadrados: t.metros_cuadrados,
    valor_min_calculado: t.valor_min_calculado,
    valor_max_calculado: t.valor_max_calculado,
    creado_en: t.creado_en,
    actualizado_en: t.actualizado_en,
  }));
  res.json(tasaciones);
});

// Obtener una tasación completa, con sus comparables y el cálculo
app.get('/api/tasaciones/:id', (req, res) => {
  const tasacion = db.obtenerTasacion(req.params.id);
  if (!tasacion) return res.status(404).json({ error: 'Tasación no encontrada' });

  const comparables = db.listarComparables(tasacion.id);
  const calculo = calcularTasacion(tasacion);
  const analisisComparables = analizarComparables(comparables);

  res.json({ tasacion, comparables, calculo, analisis_comparables: analisisComparables });
});

// Crear una nueva tasación
app.post('/api/tasaciones', (req, res) => {
  const d = req.body;

  if (!d.direccion || !d.metros_cuadrados || !d.valor_m2_min || !d.valor_m2_max) {
    return res.status(400).json({
      error: 'Faltan datos obligatorios: dirección, metros cuadrados y valor por m² (mín/máx).',
    });
  }

  const normalizado = normalizarEntrada(d);
  const conCalculo = calcularYAdjuntar(normalizado);
  const tasacion = db.crearTasacion(conCalculo);

  let comparables = [];
  if (Array.isArray(d.comparables) && d.comparables.length > 0) {
    comparables = db.reemplazarComparables(tasacion.id, d.comparables);
  }

  const calculo = calcularTasacion(tasacion);
  res.status(201).json({
    tasacion,
    comparables,
    calculo,
    analisis_comparables: analizarComparables(comparables),
  });
});

// Actualizar una tasación existente
app.put('/api/tasaciones/:id', (req, res) => {
  const id = req.params.id;
  const existente = db.obtenerTasacion(id);
  if (!existente) return res.status(404).json({ error: 'Tasación no encontrada' });

  const normalizado = normalizarEntrada({ ...existente, ...req.body });
  const conCalculo = calcularYAdjuntar(normalizado);
  const tasacion = db.actualizarTasacion(id, conCalculo);

  let comparables = db.listarComparables(id);
  if (Array.isArray(req.body.comparables)) {
    comparables = db.reemplazarComparables(id, req.body.comparables);
  }

  const calculo = calcularTasacion(tasacion);
  res.json({
    tasacion,
    comparables,
    calculo,
    analisis_comparables: analizarComparables(comparables),
  });
});

// Eliminar una tasación
app.delete('/api/tasaciones/:id', (req, res) => {
  const ok = db.eliminarTasacion(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Tasación no encontrada' });
  res.json({ ok: true });
});

// ---- Comparables individuales ----

app.post('/api/tasaciones/:id/comparables', (req, res) => {
  const tasacion = db.obtenerTasacion(req.params.id);
  if (!tasacion) return res.status(404).json({ error: 'Tasación no encontrada' });

  const { direccion, metros_cuadrados, precio, caracteristicas } = req.body;
  if (!metros_cuadrados || !precio) {
    return res.status(400).json({ error: 'Faltan metros cuadrados o precio del comparable.' });
  }

  const comparable = db.agregarComparable(tasacion.id, {
    direccion: direccion || null,
    metros_cuadrados: Number(metros_cuadrados),
    precio: Number(precio),
    caracteristicas: caracteristicas || null,
  });

  res.status(201).json(comparable);
});

app.delete('/api/comparables/:id', (req, res) => {
  const ok = db.eliminarComparable(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Comparable no encontrado' });
  res.json({ ok: true });
});

// Recalcular sin guardar (para previsualizar mientras se edita el formulario)
app.post('/api/calcular', (req, res) => {
  const normalizado = normalizarEntrada(req.body);
  const calculo = calcularTasacion(normalizado);
  const analisis = analizarComparables(req.body.comparables || []);
  res.json({ calculo, analisis_comparables: analisis });
});
// ---------- Informe de tasación ----------
const { generarHTML } = require('./informe-template');

app.get('/informe/:id', (req, res) => {
  const tasacion = db.obtenerTasacion(req.params.id);
  if (!tasacion) return res.status(404).send('<h2>Tasación no encontrada</h2>');

  const comparables = db.listarComparables(tasacion.id);
  const calculo = calcularTasacion(tasacion);
  const html = generarHTML(tasacion, comparables, calculo);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});
// ---------- Fallback al frontend ----------
// Cualquier ruta que no sea /api/* y no coincida con un archivo estatico
// devuelve el index.html (para que la navegacion del lado del cliente funcione).
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Tasaciones Macedo Propiedades corriendo en puerto ${PORT}`);
});
