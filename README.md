# Ajedrez de Imperios — Vitrina interactiva del Documento Ejecutivo V3.2

**Gema Agroecología (Nombre Preliminar)** · Rancho Gema, San Pedro Chimay, Yucatán

Esta es la **edición publicada** de la vitrina web interactiva del Documento Ejecutivo Maestro V3.2:
los **9 capítulos** del documento como *tiles* navegables, con el **texto íntegro** y **6 diagramas
dinámicos** construidos a partir de las cifras del propio documento.

## Cómo se usa

| Acción | Cómo |
|---|---|
| Leer | Abre la vitrina y elige un capítulo en el hub |
| Enlazar un capítulo | `#/cap-07` · una sección: `#/cap-07/sec-7.11` |
| Buscar | Campo de búsqueda en la barra superior (recorre los 9 capítulos) |
| Cambiar de tema | Botón *Tema claro / oscuro* (se recuerda en el navegador) |
| Documento original | `source/DOCUMENTO_EJECUTIVO_PROYECTO_CHIMAY_V3.2.pdf` (48 páginas) |

Funciona **sin servidor y sin internet**: los datos van en `data/document.data.js` y no hay ninguna
dependencia externa (cero CDN, tipografías del sistema).

## Qué contiene

- **9 tiles**, uno por capítulo, con su número, descripción y conteo de secciones.
- **Texto completo** del documento: 45 secciones, 20 tablas y 7 fotografías (cobertura de prosa 100 %).
- **6 diagramas manipulables**: comparador de los 3 escenarios financieros a 12 meses, presupuesto
  maestro (dona por rubros + corte CAPEX/OPEX), línea de tiempo del roadmap con sus 2 Decision Gates,
  explorador de los 7 canales comerciales, catálogo de semillas con validación de subtotales y mapa de
  apoyos gubernamentales por nivel de gobierno.

## Sobre las cifras

**Toda cifra mostrada existe literalmente en el documento fuente** (238 cifras monetarias verificadas,
0 inventadas). Cuando un componente calcula un agregado —por ejemplo la suma de los 12 meses de un
escenario— lo marca como cálculo propio.

> **Aviso de consistencia del documento original:** en el escenario *Normal* del §7.11, la suma de los
> 12 meses de OPEX es **$279,500.00** mientras el resumen anual declara **$281,500.00** (diferencia de
> $2,000.00). Los escenarios Optimista y Pesimista cuadran exactos. Esta edición **no corrige** el
> documento: muestra ambas cifras y publica el aviso.

## Nota sobre esta edición

Es una copia publicada de la vitrina. El desarrollo, las 92 verificaciones automatizadas, los 15 gates de
calidad y los scripts de generación viven en el repositorio privado del proyecto
(`PROJ-GEMA32-WEB-V1`, metodología in2techmx).

---

© 2026 · Documento Ejecutivo Maestro V3.2 · Los contenidos corresponden al documento fuente.
