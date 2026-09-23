/**
 * GEMA V3.2 — data/comments.data.js
 * Almacén base de revisiones y anotaciones del equipo fundador.
 *
 * Estructura de revisión con Usuario - Fecha - Hora - Bloque referenciado.
 * Permite persistencia local (localStorage) y respaldo exportable a GitHub.
 */
(function (global) {
  'use strict';

  var SEED_COMMENTS = [
    {
      id: "rev-20260920-001",
      chapterSlug: "cap-01",
      chapterTitle: "Capítulo 1: Carátula, Ficha Técnica Ejecutiva & Localización",
      sectionNum: "1.2",
      sectionTitle: "Zonificación del Polígono Dinámico (10.00 HA Totales)",
      blockId: "blk-cap01-sec1.2-p1",
      blockQuote: "Etapa 1 (3.00 HA): Área designada para cultivo intensivo a cielo abierto con fertirriego por goteo de Chile Habanero...",
      authorName: "Arturo de la Barrera",
      authorRole: "Gerencia Operativa",
      authorEmail: "arturo.dlb.r@gmail.com",
      authorKey: "arturo-b",
      timestamp: "2026-09-20T10:15:00Z",
      formattedDate: "20 Sep 2026, 10:15",
      content: "Excelente integración del espacio para talleres y food trucks en Etapa 1. Es fundamental que la explanada cuente con pendiente ligera para desagüe pluvial en temporada de lluvias y mantener el suelo Kankab estabilizado con grava fina o zacate."
    },
    {
      id: "rev-20260921-002",
      chapterSlug: "cap-02",
      chapterTitle: "Capítulo 2: Resumen Ejecutivo & Modelo de Negocio (Fase Piloto)",
      sectionNum: "2.2",
      sectionTitle: "Desglose de la Paleta Vegetal y Líneas de Producto de la Fase Piloto",
      blockId: "blk-cap02-sec2.2-h4-3",
      blockQuote: "Espacio para Food Truck & 'Happenings' Gastronómicos con Chefs...",
      authorName: "Arturo Arnaiz",
      authorRole: "Dirección de Negocios",
      authorEmail: "arnaiz.art@gmail.com",
      authorKey: "arturo-a",
      timestamp: "2026-09-21T16:45:00Z",
      formattedDate: "21 Sep 2026, 16:45",
      content: "Desde la perspectiva comercial y SaaS, este modelo de happenings con chefs y food trucks representa un flujo de caja directo de alto margen (70%+) con pago 100% anticipado vía boletaje digital en la plataforma. Hay que formalizar convenios de cuota del 15% al 20% con los operadores."
    },
    {
      id: "rev-20260922-003",
      chapterSlug: "cap-05",
      chapterTitle: "Capítulo 5: Marco Legal, Gobernanza Corporativa & Cumplimiento Patronal IMSS",
      sectionNum: "5.5",
      sectionTitle: "Organigrama Funcional y Matriz de Responsabilidades Operativas",
      blockId: "blk-cap05-sec5.5-bridge",
      blockQuote: "Célula de Integración Operativa Financiera y Tesorería Local (Gema Romero & Arturo de la Barrera)...",
      authorName: "Gema Romero",
      authorRole: "Dirección Legal & RRPP",
      authorEmail: "gemaromerom22@gmail.com",
      authorKey: "gema",
      timestamp: "2026-09-22T11:30:00Z",
      formattedDate: "22 Sep 2026, 11:30",
      content: "Confirmado. Para los eventos y happenings con chefs, prepararemos un convenio marco de corresponsabilidad civil y uso de instalaciones temporales para deslindar cualquier eventualidad en finca y garantizar el apego a la normativa sanitaria de Yucatán."
    },
    {
      id: "rev-20260922-004",
      chapterSlug: "cap-06",
      chapterTitle: "Capítulo 6: Estudio de Mercado, Canales & Comercialización Mérida / Riviera Maya",
      sectionNum: "6.1",
      sectionTitle: "Validación del Mercado Gastronómico, Tendencia Farm-to-Table y Turismo de Bodas",
      blockId: "blk-cap06-sec6.1-p4",
      blockQuote: "Happenings Gastronómicos, Food Trucks y Eventos Híbridos Culturales-Market en Finca...",
      authorName: "Gema Romero",
      authorRole: "Dirección Legal & RRPP",
      authorEmail: "gemaromerom22@gmail.com",
      authorKey: "gema",
      timestamp: "2026-09-22T12:10:00Z",
      formattedDate: "22 Sep 2026, 12:10",
      content: "Excelente sinergia con Hacienda San Pedro Chimay. Podemos coordinar para que los días previos a grandes bodas, los invitados y wedding planners puedan tener un cóctel privado o happening en nuestro espacio ajardinado."
    },
    {
      id: "rev-20260923-005",
      chapterSlug: "cap-08",
      chapterTitle: "Capítulo 8: Hoja de Ruta Estratégica (Roadmap Detallado Meses 1 a 24)",
      sectionNum: "8.1",
      sectionTitle: "Roadmap General de Hitos Temporales (Meses 1 a 24)",
      blockId: "blk-cap08-sec8.1-gate1",
      blockQuote: "DECISION GATE 1 — Comité de Dirección General (Mes 6)...",
      authorName: "Arturo de la Barrera",
      authorRole: "Gerencia Operativa",
      authorEmail: "arturo.dlb.r@gmail.com",
      authorKey: "arturo-b",
      timestamp: "2026-09-23T09:20:00Z",
      formattedDate: "23 Sep 2026, 09:20",
      content: "De acuerdo con iniciar las mesas de diálogo para la Etapa 1 a partir del mes 4. Así llegaremos a la compuerta del mes 6 con el proyecto ejecutivo de los talleres y la explanada de food trucks completamente presupuestado y listo para ejecución."
    }
  ];

  global.GEMA_COMMENTS_DATA = SEED_COMMENTS;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SEED_COMMENTS: SEED_COMMENTS };
  }
})(typeof window !== 'undefined' ? window : global);
