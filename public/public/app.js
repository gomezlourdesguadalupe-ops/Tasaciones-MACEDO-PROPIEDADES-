// app.js
// Logica del frontend: navegacion, formulario, calculo en vivo,
// comparables dinamicos y comunicacion con la API.

const API = '/api';

let comparablesActuales = []; // [{direccion, metros_cuadrados, precio, caracteristicas}]
let tasacionEditandoId = null;

// ---------- Navegación entre vistas ----------

function mostrarVista(nombre) {
  document.getElementById('vista-lista').classList.toggle('oculto', nombre !== 'lista');
  document.getElementById('vista-nueva').classList.toggle('oculto', nombre !== 'nueva');

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('activo', btn.dataset.vista === nombre);
  });

  if (nombre === 'lista') {
    cargarListado();
  }
  if (nombre === 'nueva' && tasacionEditandoId === null) {
    resetearFormulario();
  }
}

document.querySelectorAll('[data-vista]').forEach(el => {
  el.addEventListener('click', () => mostrarVista(el.dataset.vista));
});

document.getElementById('btn-cancelar').addEventListener('click', (e) => {
  e.preventDefault();
  mostrarVista('lista');
});

// ---------- Toast de feedback ----------

function mostrarToast(mensaje, esError = false) {
  const contenedor = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast' + (esError ? ' error' : '');
  toast.textContent = mensaje;
  contenedor.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// ---------- Formato de moneda ----------

function formatoMoneda(valor) {
  if (valor === null || valor === undefined || isNaN(valor)) return '$0';
  return '$' + Math.round(valor).toLocaleString('es-AR');
}

// ---------- Comparables (UI dinámica) ----------

function renderizarComparables() {
  const cont = document.getElementById('lista-comparables');
  cont.innerHTML = '';

  comparablesActuales.forEach((c, i) => {
    const fila = document.createElement('div');
    fila.className = 'fila-comparable';
    fila.innerHTML = `
      <div class="campo">
        <label>Dirección</label>
        <input type="text" value="${c.direccion || ''}" data-campo="direccion" data-idx="${i}" placeholder="Dirección del comparable">
      </div>
      <div class="campo">
        <label>m²</label>
        <input type="number" min="0" step="0.01" value="${c.metros_cuadrados || ''}" data-campo="metros_cuadrados" data-idx="${i}">
      </div>
      <div class="campo">
        <label>Precio</label>
        <input type="number" min="0" step="0.01" value="${c.precio || ''}" data-campo="precio" data-idx="${i}">
      </div>
      <div class="campo">
        <label>Características</label>
        <input type="text" value="${c.caracteristicas || ''}" data-campo="caracteristicas" data-idx="${i}" placeholder="Ej: esquina, con servicios">
      </div>
      <button type="button" class="btn btn-peligro btn-chico" data-eliminar="${i}">Quitar</button>
    `;
    cont.appendChild(fila);
  });

  cont.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = Number(e.target.dataset.idx);
      const campo = e.target.dataset.campo;
      let valor = e.target.value;
      if (campo === 'metros_cuadrados' || campo === 'precio') valor = parseFloat(valor) || 0;
      comparablesActuales[idx][campo] = valor;
      recalcular();
    });
  });

  cont.querySelectorAll('[data-eliminar]').forEach(btn => {
    btn.addEventListener('click', () => {
      comparablesActuales.splice(Number(btn.dataset.eliminar), 1);
      renderizarComparables();
      recalcular();
    });
  });
}

document.getElementById('btn-agregar-comparable').addEventListener('click', () => {
  comparablesActuales.push({ direccion: '', metros_cuadrados: '', precio: '', caracteristicas: '' });
  renderizarComparables();
});

// ---------- Toggles visuales (fila activa) ----------

function actualizarEstiloToggle(checkboxId, filaSelector, claseActiva = 'activa') {
  const chk = document.getElementById(checkboxId);
  const fila = filaSelector.startsWith('#') ? document.querySelector(filaSelector) : chk.closest('.fila-toggle');
  if (!fila) return;
  fila.classList.toggle(claseActiva, chk.checked);
}

function refrescarEstilosToggles() {
  actualizarEstiloToggle('es_inundable', '#fila-inundable', 'alerta-activa');
  actualizarEstiloToggle('tiene_construccion', '#fila-construccion');
  ['luz', 'gas', 'agua', 'internet', 'asfalto'].forEach(s => {
    actualizarEstiloToggle('servicio_' + s, `[data-servicio="${s}"]`);
  });
}

// ---------- Recolección de datos del formulario ----------

function leerFormulario() {
  return {
    nombre_cliente: document.getElementById('nombre_cliente').value.trim(),
    direccion: document.getElementById('direccion').value.trim(),
    barrio: document.getElementById('barrio').value.trim(),
    ciudad: document.getElementById('ciudad').value.trim(),
    notas: document.getElementById('notas').value.trim(),

    metros_cuadrados: parseFloat(document.getElementById('metros_cuadrados').value) || 0,
    valor_m2_min: parseFloat(document.getElementById('valor_m2_min').value) || 0,
    valor_m2_max: parseFloat(document.getElementById('valor_m2_max').value) || 0,

    ubicacion_cuadra: document.getElementById('ubicacion_cuadra').value,
    pct_esquina: parseFloat(document.getElementById('pct_esquina').value) || 0,

    es_inundable: document.getElementById('es_inundable').checked,
    pct_inundable: parseFloat(document.getElementById('pct_inundable').value) || 0,

    servicio_luz: document.getElementById('servicio_luz').checked,
    pct_luz: parseFloat(document.getElementById('pct_luz').value) || 0,
    servicio_gas: document.getElementById('servicio_gas').checked,
    pct_gas: parseFloat(document.getElementById('pct_gas').value) || 0,
    servicio_agua: document.getElementById('servicio_agua').checked,
    pct_agua: parseFloat(document.getElementById('pct_agua').value) || 0,
    servicio_internet: document.getElementById('servicio_internet').checked,
    pct_internet: parseFloat(document.getElementById('pct_internet').value) || 0,
    servicio_asfalto: document.getElementById('servicio_asfalto').checked,
    pct_asfalto: parseFloat(document.getElementById('pct_asfalto').value) || 0,

    tiene_construccion: document.getElementById('tiene_construccion').checked,
    metros_construidos: parseFloat(document.getElementById('metros_construidos').value) || 0,
    pct_construccion: parseFloat(document.getElementById('pct_construccion').value) || 0,

    comparables: comparablesActuales.filter(c => c.metros_cuadrados && c.precio),
  };
}

// ---------- Cálculo en vivo (preview, sin guardar) ----
