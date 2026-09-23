/**
 * GEMA V3.2 / V4 — data/comments.data.js
 * Almacén base de revisiones y anotaciones del equipo fundador.
 *
 * Estructura de revisión limpia para captura en tiempo real:
 * Usuario - Fecha - Hora - Bloque referenciado.
 */
(function (global) {
  'use strict';

  // Base limpia para comenzar captura de revisiones desde cero
  var SEED_COMMENTS = [];

  global.GEMA_COMMENTS_DATA = SEED_COMMENTS;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SEED_COMMENTS: SEED_COMMENTS };
  }
})(typeof window !== 'undefined' ? window : global);
