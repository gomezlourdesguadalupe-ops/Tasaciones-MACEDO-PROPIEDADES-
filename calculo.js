// calculo.js
// Contiene la formula de tasacion. Aislada en su propio archivo para
// que sea facil de auditar y ajustar sin tocar el resto del backend.
//
// LOGICA:
// 1. Se parte de un rango base: m2_terreno * ($/m2 minimo y maximo).
// 2. Se suma un % por ubicacion en la cuadra (esquina suma, mitad de cuadra no).
// 3. Se suma (o resta) un % por inundabilidad.
// 4. Se suma el % de cada servicio presente (luz, gas, agua, internet, asfalto).
// 5. Si hay construccion, se suma un % adicional sobre el valor del terreno.
// 6. El resultado final es un rango minimo-maximo en pesos, y tambien
//    se devuelve el $/m2 final equivalente para poder compararlo
//    contra los terrenos comparables cargados.

function calcularTasacion(datos) {
  const {
    metros_cuadrados,
    valor_m2_min,
    valor_m2_max,
    ubicacion_cuadra, // 'esquina' | 'mitad'
    pct_esquina,
    es_inundable,
    pct_inundable,
    servicio_luz, pct_luz,
    servicio_gas, pct_gas,
    servicio_agua, pct_agua,
    servicio_internet, pct_internet,
    servicio_asfalto, pct_asfalto,
    tiene_construccion,
    metros_construidos,
    pct_construccion,
  } = datos;

  // 1. Valor base del terreno (rango)
  const baseMin = metros_cuadrados * valor_m2_min;
  const baseMax = metros_cuadrados * valor_m2_max;

  // 2-5. Acumulamos el porcentaje total de ajuste
  let pctTotal = 0;
  const detalle = [];

  if (ubicacion_cuadra === 'esquina') {
    pctTotal += Number(pct_esquina) || 0;
    detalle.push({ concepto: 'Esquina', porcentaje: Number(pct_esquina) || 0 });
  }

  if (es_inundable) {
    pctTotal += Number(pct_inundable) || 0;
    detalle.push({ concepto: 'Zona inundable', porcentaje: Number(pct_inundable) || 0 });
  }

  if (servicio_luz) {
    pctTotal += Number(pct_luz) || 0;
    detalle.push({ concepto: 'Luz', porcentaje: Number(pct_luz) || 0 });
  }
  if (servicio_gas) {
    pctTotal += Number(pct_gas) || 0;
    detalle.push({ concepto: 'Gas', porcentaje: Number(pct_gas) || 0 });
  }
  if (servicio_agua) {
    pctTotal += Number(pct_agua) || 0;
    detalle.push({ concepto: 'Agua de red', porcentaje: Number(pct_agua) || 0 });
  }
  if (servicio_internet) {
    pctTotal += Number(pct_internet) || 0;
    detalle.push({ concepto: 'Internet', porcentaje: Number(pct_internet) || 0 });
  }
  if (servicio_asfalto) {
    pctTotal += Number(pct_asfalto) || 0;
    detalle.push({ concepto: 'Calles asfaltadas', porcentaje: Number(pct_asfalto) || 0 });
  }

  if (tiene_construccion) {
    pctTotal += Number(pct_construccion) || 0;
    detalle.push({ concepto: `Construccion (${metros_construidos || 0} m2)`, porcentaje: Number(pct_construccion) || 0 });
  }

  const factor = 1 + pctTotal / 100;

  const valorMinCalculado = Math.round(baseMin * factor);
  const valorMaxCalculado = Math.round(baseMax * factor);

  const valorM2MinFinal = metros_cuadrados > 0 ? Math.round(valorMinCalculado / metros_cuadrados) : 0;
  const valorM2MaxFinal = metros_cuadrados > 0 ? Math.round(valorMaxCalculado / metros_cuadrados) : 0;

  return {
    base_min: Math.round(baseMin),
    base_max: Math.round(baseMax),
    porcentaje_total: pctTotal,
    detalle_ajustes: detalle,
    valor_min_calculado: valorMinCalculado,
    valor_max_calculado: valorMaxCalculado,
    valor_m2_min_final: valorM2MinFinal,
    valor_m2_max_final: valorM2MaxFinal,
  };
}

// Compara el resultado calculado contra los comparables cargados,
// devolviendo el rango de $/m2 que muestran esos comparables.
function analizarComparables(comparables) {
  if (!comparables || comparables.length === 0) {
    return null;
  }
  const valoresM2 = comparables
    .filter(c => c.metros_cuadrados > 0)
    .map(c => c.precio / c.metros_cuadrados);

  if (valoresM2.length === 0) return null;

  const min = Math.min(...valoresM2);
  const max = Math.max(...valoresM2);
  const promedio = valoresM2.reduce((a, b) => a + b, 0) / valoresM2.length;

  return {
    m2_min_comparables: Math.round(min),
    m2_max_comparables: Math.round(max),
    m2_promedio_comparables: Math.round(promedio),
    cantidad: comparables.length,
  };
}

module.exports = { calcularTasacion, analizarComparables };
