# Tasaciones — Macedo Propiedades

App para calcular el valor estimado (mínimo y máximo) de un terreno, a partir de datos cargados manualmente: valor por m², ubicación, características, servicios, construcción existente y terrenos comparativos.

## ¿Cómo funciona el cálculo?

1. **Valor base** = metros cuadrados del terreno × valor mínimo/máximo por m² (los dos números que cargás a mano).
2. Sobre ese valor base se suman/restan **porcentajes de ajuste**, todos editables desde el formulario:
   - **Esquina**: +10% por defecto (si el terreno está a mitad de cuadra, no se aplica).
   - **Zona inundable**: -15% por defecto (solo se aplica si está marcado como inundable).
   - **Servicios**: cada uno suma su propio %, independiente del resto — luz (+3%), gas (+3%), agua de red (+4%), internet (+2%), calles asfaltadas (+5%).
   - **Construcción existente**: +20% por defecto si hay construcción en el terreno.
3. El resultado es un **rango final**: valor mínimo y máximo en pesos, y su equivalente en $/m².
4. Los **terrenos comparativos** que cargues (dirección, m², precio) se muestran aparte, con su propio rango de $/m², para que puedas contrastar el cálculo teórico contra el mercado real.

Todos los porcentajes son editables tasación por tasación.

## Correr el proyecto en tu computadora

Necesitás [Node.js](https://nodejs.org) (versión 18 o más nueva).
