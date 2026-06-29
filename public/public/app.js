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
let timeoutRecalculo = null;

function recalcular() {
  clearTimeout(timeoutRecalculo);
  timeoutRecalculo = setTimeout(async () => {
    const datos = leerFormulario();
    if (!datos.metros_cuadrados || !datos.valor_m2_min || !datos.valor_m2_max) {
      pintarResultado(null, null);
      return;
    }
    try {
      const resp = await fetch(`${API}/calcular`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      const data = await resp.json();
      pintarResultado(data.calculo, data.analisis_comparables);
    } catch (err) {
      console.error('Error al recalcular', err);
    }
  }, 250);
}

function pintarResultado(calculo, analisisComparables) {
  if (!calculo) {
    document.getElementById('res-min').textContent = '$0';
    document.getElementById('res-max').textContent = '$0';
    document.getElementById('res-m2-min').textContent = '$0';
    document.getElementById('res-m2-max').textContent = '$0';
    document.getElementById('lista-ajustes').innerHTML = '';
    document.getElementById('bloque-comparables-resumen').classList.add('oculto');
    return;
  }

  document.getElementById('res-min').textContent = formatoMoneda(calculo.valor_min_calculado);
  document.getElementById('res-max').textContent = formatoMoneda(calculo.valor_max_calculado);
  document.getElementById('res-m2-min').textContent = formatoMoneda(calculo.valor_m2_min_final);
  document.getElementById('res-m2-max').textContent = formatoMoneda(calculo.valor_m2_max_final);

  const lista = document.getElementById('lista-ajustes');
  lista.innerHTML = '';
  if (calculo.detalle_ajustes && calculo.detalle_ajustes.length > 0) {
    calculo.detalle_ajustes.forEach(a => {
      const li = document.createElement('li');
      const signo = a.porcentaje > 0 ? '+' : '';
      li.textContent = `${a.concepto}: ${signo}${a.porcentaje}%`;
      lista.appendChild(li);
    });
  } else {
    const li = document.createElement('li');
    li.textContent = 'Sin ajustes adicionales (solo valor base por m²)';
    lista.appendChild(li);
  }

  const bloqueComp = document.getElementById('bloque-comparables-resumen');
  if (analisisComparables) {
    bloqueComp.classList.remove('oculto');
    document.getElementById('res-comparables-rango').textContent =
      `${formatoMoneda(analisisComparables.m2_min_comparables)} – ${formatoMoneda(analisisComparables.m2_max_comparables)} /m²`;
  } else {
    bloqueComp.classList.add('oculto');
  }
}

// Evitar que presionar Enter en un input dispare un submit nativo (recarga de pagina)
document.getElementById('form-tasacion').addEventListener('submit', (e) => {
  e.preventDefault();
});

// Escuchar cambios en todo el formulario para recalcular en vivo
document.getElementById('form-tasacion').addEventListener('input', () => {
  refrescarEstilosToggles();
  recalcular();
});
document.getElementById('form-tasacion').addEventListener('change', () => {
  refrescarEstilosToggles();
  recalcular();
});
// ---------- Reset / carga del formulario ----------

function resetearFormulario() {
  tasacionEditandoId = null;
  document.getElementById('form-tasacion').reset();
  document.getElementById('tasacion-id').value = '';
  document.getElementById('titulo-formulario').textContent = 'Nueva tasación';
  document.getElementById('btn-guardar').textContent = 'Guardar tasación';

  // Restaurar defaults que el reset() del form no respeta bien en algunos navegadores
  document.getElementById('pct_esquina').value = 10;
  document.getElementById('pct_inundable').value = -15;
  document.getElementById('pct_luz').value = 3;
  document.getElementById('pct_gas').value = 3;
  document.getElementById('pct_agua').value = 4;
  document.getElementById('pct_internet').value = 2;
  document.getElementById('pct_asfalto').value = 5;
  document.getElementById('pct_construccion').value = 20;

  comparablesActuales = [];
  renderizarComparables();
  refrescarEstilosToggles();
  pintarResultado(null, null);
}

function cargarEnFormulario(tasacion, comparables) {
  tasacionEditandoId = tasacion.id;
  document.getElementById('tasacion-id').value = tasacion.id;
  document.getElementById('titulo-formulario').textContent = 'Editar tasación';
  document.getElementById('btn-guardar').textContent = 'Actualizar tasación';

  document.getElementById('nombre_cliente').value = tasacion.nombre_cliente || '';
  document.getElementById('direccion').value = tasacion.direccion || '';
  document.getElementById('barrio').value = tasacion.barrio || '';
  document.getElementById('ciudad').value = tasacion.ciudad || '';
  document.getElementById('notas').value = tasacion.notas || '';

  document.getElementById('metros_cuadrados').value = tasacion.metros_cuadrados;
  document.getElementById('valor_m2_min').value = tasacion.valor_m2_min;
  document.getElementById('valor_m2_max').value = tasacion.valor_m2_max;

  document.getElementById('ubicacion_cuadra').value = tasacion.ubicacion_cuadra;
  document.getElementById('pct_esquina').value = tasacion.pct_esquina;

  document.getElementById('es_inundable').checked = tasacion.es_inundable;
  document.getElementById('pct_inundable').value = tasacion.pct_inundable;

  document.getElementById('servicio_luz').checked = tasacion.servicio_luz;
  document.getElementById('pct_luz').value = tasacion.pct_luz;
  document.getElementById('servicio_gas').checked = tasacion.servicio_gas;
  document.getElementById('pct_gas').value = tasacion.pct_gas;
  document.getElementById('servicio_agua').checked = tasacion.servicio_agua;
  document.getElementById('pct_agua').value = tasacion.pct_agua;
  document.getElementById('servicio_internet').checked = tasacion.servicio_internet;
  document.getElementById('pct_internet').value = tasacion.pct_internet;
  document.getElementById('servicio_asfalto').checked = tasacion.servicio_asfalto;
  document.getElementById('pct_asfalto').value = tasacion.pct_asfalto;

  document.getElementById('tiene_construccion').checked = tasacion.tiene_construccion;
  document.getElementById('metros_construidos').value = tasacion.metros_construidos;
  document.getElementById('pct_construccion').value = tasacion.pct_construccion;

  comparablesActuales = (comparables || []).map(c => ({
    direccion: c.direccion,
    metros_cuadrados: c.metros_cuadrados,
    precio: c.precio,
    caracteristicas: c.caracteristicas,
  }));
  renderizarComparables();
  refrescarEstilosToggles();
  recalcular();
}

// ---------- Guardar (crear o actualizar) ----------

document.getElementById('btn-guardar').addEventListener('click', async (e) => {
  e.preventDefault();
  const datos = leerFormulario();

  if (!datos.direccion || !datos.metros_cuadrados || !datos.valor_m2_min || !datos.valor_m2_max) {
    mostrarToast('Completá dirección, metros cuadrados y valor por m² (mín/máx).', true);
    return;
  }
  if (datos.valor_m2_min > datos.valor_m2_max) {
    mostrarToast('El valor mínimo por m² no puede ser mayor que el máximo.', true);
    return;
  }

  try {
    let resp;
    if (tasacionEditandoId) {
      resp = await fetch(`${API}/tasaciones/${tasacionEditandoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
    } else {
      resp = await fetch(`${API}/tasaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
    }

    if (!resp.ok) {
      const err = await resp.json();
      mostrarToast(err.error || 'Ocurrió un error al guardar.', true);
      return;
    }

    mostrarToast(tasacionEditandoId ? 'Tasación actualizada.' : 'Tasación guardada.');
    tasacionEditandoId = null;
    mostrarVista('lista');
  } catch (err) {
    console.error(err);
    mostrarToast('No se pudo conectar con el servidor.', true);
  }
});

// ---------- Listado ----------

async function cargarListado() {
  const cont = document.getElementById('lista-tasaciones');
  try {
    const resp = await fetch(`${API}/tasaciones`);
    const tasaciones = await resp.json();

    if (tasaciones.length === 0) {
      cont.innerHTML = `
        <div class="vacio">
          <p><strong>Todavía no hay tasaciones cargadas.</strong></p>
          <p>Creá la primera para empezar a estimar valores de terrenos.</p>
        </div>`;
      return;
    }

    cont.innerHTML = '';
    tasaciones.forEach(t => {
      const item = document.createElement('div');
      item.className = 'item';
      item.innerHTML = `
        <div class="principal">
          <strong>${t.direccion}</strong>
          <span>${[t.barrio, t.ciudad].filter(Boolean).join(', ') || 'Sin barrio/ciudad'} · ${t.metros_cuadrados} m² · ${t.nombre_cliente || 'Sin cliente asignado'}</span>
        </div>
        <div class="valores">
          ${formatoMoneda(t.valor_min_calculado)} – ${formatoMoneda(t.valor_max_calculado)}
          <span>Valor estimado</span>
        </div>
      `;
      item.addEventListener('click', () => abrirParaEditar(t.id));
      cont.appendChild(item);
    });
  } catch (err) {
    console.error(err);
    cont.innerHTML = `<div class="vacio"><p>No se pudo conectar con el servidor.</p></div>`;
  }
}

async function abrirParaEditar(id) {
  try {
    const resp = await fetch(`${API}/tasaciones/${id}`);
    if (!resp.ok) {
      mostrarToast('No se encontró la tasación.', true);
      return;
    }
    const data = await resp.json();
    mostrarVista('nueva');
    cargarEnFormulario(data.tasacion, data.comparables);
  } catch (err) {
    console.error(err);
    mostrarToast('No se pudo cargar la tasación.', true);
  }
}

// ---------- Inicio ----------

mostrarVista('lista');
