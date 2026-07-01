// informe-template.js
// Genera el HTML completo del informe de tasacion a partir de los datos
// de una tasacion y sus comparables. Se usa en la ruta GET /informe/:id

function formatoMoneda(valor) {
  if (!valor && valor !== 0) return '$0';
  return '$' + Math.round(valor).toLocaleString('es-AR');
}

function formatoFecha(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const meses = ['enero','febrero','marzo','abril','mayo','junio',
                  'julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}

function listaServicios(t) {
  const servicios = [];
  if (t.servicio_luz) servicios.push('Luz');
  if (t.servicio_gas) servicios.push('Gas natural');
  if (t.servicio_agua) servicios.push('Agua de red');
  if (t.servicio_internet) servicios.push('Internet');
  if (t.servicio_asfalto) servicios.push('Calles asfaltadas');
  return servicios.length > 0 ? servicios.join(', ') : 'Sin servicios registrados';
}

function filasComparables(comparables) {
  if (!comparables || comparables.length === 0) {
    return '<tr><td colspan="4" style="text-align:center;color:#999;">Sin comparables cargados</td></tr>';
  }
  return comparables.map(c => `
    <tr>
      <td>${c.direccion || '—'}</td>
      <td>${c.metros_cuadrados} m²</td>
      <td>${formatoMoneda(c.precio)}</td>
      <td>${c.caracteristicas || '—'}</td>
    </tr>
  `).join('');
}

function filasAjustes(calculo) {
  if (!calculo.detalle_ajustes || calculo.detalle_ajustes.length === 0) {
    return '<tr><td>Sin ajustes adicionales</td><td>—</td></tr>';
  }
  return calculo.detalle_ajustes.map(a => {
    const signo = a.porcentaje > 0 ? '+' : '';
    const clase = a.porcentaje > 0 ? 'positivo' : (a.porcentaje < 0 ? 'negativo' : '');
    return `<tr><td>${a.concepto}</td><td class="${clase}">${signo}${a.porcentaje}%</td></tr>`;
  }).join('');
}

function generarHTML(tasacion, comparables, calculo) {
  const t = tasacion;
  const ubicacion = [t.direccion, t.barrio, t.ciudad].filter(Boolean).join(', ');
  const fecha = formatoFecha(t.creado_en || new Date().toISOString());

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Informe de Tasacion — ${t.direccion || 'Sin direccion'}</title>
<style>
  @page { size: A4; margin: 16mm 15mm; }
  :root {
    --verde: #599F78;
    --verde-oscuro: #3F7259;
    --carbon: #2B2D2A;
    --carbon-suave: #5C5E59;
    --borde: #D8D3C6;
    --fondo-tabla: #EAF1EF;
  }
  * { box-sizing: border-box; }
  body {
    font-family: Georgia, 'Times New Roman', serif;
    color: var(--carbon);
    font-size: 10.5pt;
    line-height: 1.45;
    margin: 0; padding: 0;
  }
  .hoja { max-width: 800px; margin: 0 auto; padding: 36px 32px; background: white; }

  .encabezado {
    display: flex; align-items: center; gap: 16px;
    border-bottom: 3px solid var(--verde);
    padding-bottom: 14px; margin-bottom: 20px;
  }
  .encabezado img { height: 52px; width: auto; }
  .encabezado h1 {
    font-family: Arial, sans-serif; font-size: 18pt;
    color: var(--verde-oscuro); margin: 0 0 2px; letter-spacing: 0.02em;
  }
  .encabezado p { margin: 0; font-size: 8.5pt; color: var(--carbon-suave); font-family: Arial, sans-serif; }

  .titulo-informe { text-align: center; margin-bottom: 20px; }
  .titulo-informe h2 { font-family: Arial, sans-serif; font-size: 14pt; margin: 0 0 4px; }
  .titulo-informe .subtitulo { font-size: 10.5pt; color: var(--carbon-suave); }
  .titulo-informe .fecha { font-size: 9pt; color: var(--carbon-suave); margin-top: 3px; }

  .seccion { margin-bottom: 18px; }
  .seccion h3 {
    font-family: Arial, sans-serif; font-size: 10.5pt;
    color: var(--verde-oscuro); border-bottom: 1.5px solid var(--borde);
    padding-bottom: 4px; margin: 0 0 10px; letter-spacing: 0.03em;
  }
  .seccion p { margin: 0 0 8px; text-align: justify; font-size: 10pt; }

  table.datos { width: 100%; border-collapse: collapse; font-size: 10pt; }
  table.datos td { padding: 6px 10px; border: 1px solid var(--borde); }
  table.datos td:first-child {
    font-family: Arial, sans-serif; font-weight: 700;
    background: var(--fondo-tabla); width: 38%; font-size: 9pt; letter-spacing: 0.02em;
  }

  table.comparables { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  table.comparables th {
    font-family: Arial, sans-serif; background: var(--verde-oscuro);
    color: white; text-align: left; padding: 7px 10px; font-size: 8.5pt;
  }
  table.comparables td { padding: 7px 10px; border-bottom: 1px solid var(--borde); }
  table.comparables tr:nth-child(even) td { background: #F7F5EF; }

  table.ajustes { width: 100%; border-collapse: collapse; font-size: 10pt; }
  table.ajustes th {
    font-family: Arial, sans-serif; background: var(--fondo-tabla);
    text-align: left; padding: 6px 10px; font-size: 9pt; border: 1px solid var(--borde);
  }
  table.ajustes td { padding: 6px 10px; border: 1px solid var(--borde); }
  td.positivo { color: var(--verde-oscuro); font-weight: 700; }
  td.negativo { color: #B0473A; font-weight: 700; }

  .resultado-final {
    background: linear-gradient(135deg, var(--verde-oscuro), var(--verde));
    color: white; border-radius: 6px; padding: 16px 24px;
    margin: 14px 0; text-align: center;
  }
  .resultado-final .etiqueta {
    font-family: Arial, sans-serif; font-size: 8pt;
    letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.9; margin-bottom: 4px;
  }
  .resultado-final .monto { font-family: Arial, sans-serif; font-size: 20pt; font-weight: 700; }
  .resultado-final .m2 { font-size: 9pt; opacity: 0.9; margin-top: 4px; }

  .legal {
    font-size: 8.5pt; color: var(--carbon-suave); text-align: justify;
    border-top: 1px solid var(--borde); padding-top: 12px; margin-top: 18px;
  }
  .legal p { margin: 0 0 6px; }

  .firma { margin-top: 36px; text-align: center; }
  .firma .linea { width: 220px; border-top: 1px solid var(--carbon); margin: 0 auto 5px; }
  .firma strong { display: block; font-family: Arial, sans-serif; font-size: 10pt; }
  .firma span { display: block; font-size: 8.5pt; color: var(--carbon-suave); }

  .barra-accion {
    max-width: 800px; margin: 0 auto 14px; padding: 0 32px;
    display: flex; justify-content: space-between; align-items: center;
  }
  .barra-accion a {
    font-family: Arial, sans-serif; font-size: 9pt;
    color: var(--verde-oscuro); text-decoration: none;
  }
  .barra-accion button {
    background: var(--verde); color: white; border: none;
    padding: 9px 20px; border-radius: 6px;
    font-family: Arial, sans-serif; font-weight: 700; font-size: 9.5pt; cursor: pointer;
  }
  @media print {
    .barra-accion { display: none; }
    body { background: white; }
    .hoja { padding: 0; }
  }
  @media screen {
    body { background: #E9E6DD; padding: 20px 0; }
  }
</style>
</head>
<body>

<div class="barra-accion">
  <a href="/">← Volver a tasaciones</a>
  <button onclick="window.print()">Imprimir / Guardar como PDF</button>
</div>

<div class="hoja">

  <div class="encabezado">
    <img src="/logo.png" alt="Macedo Propiedades">
    <div>
      <h1>MACEDO PROPIEDADES</h1>
      <p>Martillero y Corredor Publico Nacional — Claudio Macedo — Col. 7493 | La Plata, Buenos Aires</p>
      <p>www.macedopropiedades.com.ar</p>
    </div>
  </div>

  <div class="titulo-informe">
    <h2>INFORME DE TASACION</h2>
    <div class="subtitulo">Lote Urbano — ${ubicacion}</div>
    <div class="fecha">Fecha: ${fecha}</div>
  </div>

  <div class="seccion">
    <h3>1. DATOS DEL INMUEBLE</h3>
    <table class="datos">
      ${t.nombre_cliente ? `<tr><td>CLIENTE</td><td>${t.nombre_cliente}</td></tr>` : ''}
      <tr><td>UBICACION</td><td>${ubicacion}</td></tr>
      <tr><td>SUPERFICIE TOTAL</td><td>${t.metros_cuadrados} m2</td></tr>
      <tr><td>VALOR REFERENCIA POR m2</td><td>${formatoMoneda(t.valor_m2_min)} - ${formatoMoneda(t.valor_m2_max)}</td></tr>
      <tr><td>UBICACION EN LA CUADRA</td><td>${t.ubicacion_cuadra === 'esquina' ? 'Esquina' : 'Mitad de cuadra'}</td></tr>
      <tr><td>SERVICIOS</td><td>${listaServicios(t)}</td></tr>
      <tr><td>ZONA INUNDABLE</td><td>${t.es_inundable ? 'Si' : 'No'}</td></tr>
      <tr><td>CONSTRUCCION EXISTENTE</td><td>${t.tiene_construccion ? `Si (${t.metros_construidos} m2 construidos)` : 'No posee'}</td></tr>
      ${t.notas ? `<tr><td>OBSERVACIONES</td><td>${t.notas}</td></tr>` : ''}
    </table>
  </div>

  <div class="seccion">
    <h3>2. TERRENOS COMPARATIVOS</h3>
    <p>Se relevaron propiedades comparables en la zona con caracteristicas similares en cuanto a superficie y servicios, utilizados como referencia de mercado.</p>
    <table class="comparables">
      <tr><th>Direccion</th><th>m2</th><th>Precio</th><th>Caracteristicas</th></tr>
      ${filasComparables(comparables)}
    </table>
  </div>

  <div class="seccion">
    <h3>3. FACTORES DE AJUSTE APLICADOS</h3>
    <p>Sobre el valor base del terreno se aplicaron los siguientes ajustes porcentuales a criterio profesional del tasador:</p>
    <table class="ajustes">
      <tr><th>Factor</th><th>Ajuste aplicado</th></tr>
      ${filasAjustes(calculo)}
      <tr>
        <td><strong>Ajuste total acumulado</strong></td>
        <td class="${calculo.porcentaje_total > 0 ? 'positivo' : (calculo.porcentaje_total < 0 ? 'negativo' : '')}">
          <strong>${calculo.porcentaje_total > 0 ? '+' : ''}${calculo.porcentaje_total}%</strong>
        </td>
      </tr>
    </table>
  </div>

  <div class="seccion">
    <h3>4. DETERMINACION DEL VALOR</h3>
    <p>Tomando como base la superficie del terreno (${t.metros_cuadrados} m2) y el valor de referencia
    por m2 establecido para la zona (${formatoMoneda(t.valor_m2_min)} - ${formatoMoneda(t.valor_m2_max)} /m2),
    ajustado segun los factores detallados en el punto anterior
    (${calculo.porcentaje_total > 0 ? '+' : ''}${calculo.porcentaje_total}% total),
    se obtiene el siguiente rango de valor estimado:</p>

    <div class="resultado-final">
      <div class="etiqueta">Valor de Tasacion Estimado</div>
      <div class="monto">${formatoMoneda(calculo.valor_min_calculado)} — ${formatoMoneda(calculo.valor_max_calculado)}</div>
      <div class="m2">${formatoMoneda(calculo.valor_m2_min_final)} - ${formatoMoneda(calculo.valor_m2_max_final)} por m2</div>
    </div>
  </div>

  <div class="legal">
    <p>El presente informe de tasacion ha sido elaborado conforme a las condiciones del mercado inmobiliario local vigentes a la fecha de su emision, aplicando el metodo comparativo de mercado mediante el analisis de antecedentes de inmuebles de caracteristicas similares.</p>
    <p>Se deja expresa constancia de que los valores de oferta publicados en portales y sitios inmobiliarios constituyen precios de publicacion y no necesariamente reflejan el valor efectivo de cierre de las operaciones, el cual habitualmente resulta inferior.</p>
    <p>La presente tasacion tendra una vigencia de sesenta (60) dias corridos contados a partir de su fecha de emision, pudiendo variar con posterioridad en funcion de las condiciones del mercado.</p>
  </div>

  <div class="firma">
    <div class="linea"></div>
    <strong>Claudio Macedo</strong>
    <span>Martillero y Corredor Publico — Col: 7493</span>
  </div>

</div>
</body>
</html>`;
}

module.exports = { generarHTML };
