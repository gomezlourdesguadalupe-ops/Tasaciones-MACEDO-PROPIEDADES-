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
Abrí `http://localhost:3000` en el navegador.

## Desplegar en Render

1. Entrá a [render.com](https://render.com) y conectá tu cuenta de GitHub.
2. "New" → "Web Service" → elegí este repositorio.
3. Render va a detectar `render.yaml` y configurar todo solo. Si no, configurá a mano:
   - **Build command**: `npm install`
   - **Start command**: `npm start`
   - **Runtime**: Node

### Importante sobre la persistencia de datos

En el **plan gratuito de Render**, el disco se borra cada vez que el servicio se reinicia o "duerme" por inactividad — vas a perder las tasaciones guardadas cada tanto. Para que los datos queden guardados para siempre, Render requiere un plan pago con disco persistente (a partir de unos USD 7/mes, conviene confirmar el precio actual en render.com/pricing).

## Colores de marca

| Color | Uso |
|---|---|
| `#599F78` Verde sage | Color principal, botones, resultado |
| `#3F7259` Verde oscuro | Hover, encabezados de resultado |
| `#4A4C48` Carbón | Texto principal |
| `#FAF8F4` Crema | Fondo general |
| `#C1604A` Terracota | Alertas (zona inundable) |
