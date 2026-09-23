/* ==========================================================================
 * GEMA V3.2 — viz/subsidies.js
 * MOD-GEMA32-VIZ · Mapa de apoyos gubernamentales por nivel (AC-03.6)
 *
 * Fuente: capítulo 4 (§4.1 arquitectura de fondos y §4.3 matriz de articulación).
 * ========================================================================== */
(function (global) {
  'use strict';

  function findChapter(doc, num) {
    return (doc.chapters || []).filter(function (c) { return c.num === num; })[0] || null;
  }
  function tokensText(tokens) {
    return (tokens || []).map(function (t) { return (t && typeof t === 'object') ? t.v : t; }).join('');
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /** @returns {{levels:Array, matrix:Array, source:string}} */
  function buildSubsidies(doc) {
    var ch = findChapter(doc, 4);
    var blocks = (ch && ch.sections || []).reduce(function (a, s) { return a.concat(s.blocks); }, []);

    var levels = [];
    blocks.filter(function (b) { return b.type === 'cards'; }).forEach(function (b) {
      b.items.forEach(function (c) {
        levels.push({
          title: c.title.replace(/^\d+\.\s*/, ''),
          scope: c.sub,
          programs: c.bullets || [],
          board: b.title || '',
        });
      });
    });

    var table = blocks.filter(function (b) { return b.type === 'table'; })[0];
    var matrix = [];
    if (table) {
      var head = (table.headers || []).map(tokensText).map(function (h) { return h.toLowerCase(); });
      var iPhase = head.findIndex(function (h) { return /fase/.test(h); });
      var iProg = head.findIndex(function (h) { return /programa/.test(h); });
      var iType = head.findIndex(function (h) { return /tipo/.test(h); });
      var iAmt = head.findIndex(function (h) { return /monto|beneficio/.test(h); });
      var iAct = head.findIndex(function (h) { return /estatus|acci/.test(h); });
      (table.rows || []).forEach(function (r) {
        matrix.push({
          phase: tokensText(r[iPhase >= 0 ? iPhase : 0]),
          program: tokensText(r[iProg >= 0 ? iProg : 1]),
          type: tokensText(r[iType >= 0 ? iType : 2]),
          amount: tokensText(r[iAmt >= 0 ? iAmt : 3]),
          action: tokensText(r[iAct >= 0 ? iAct : 4]),
        });
      });
    }

    return {
      levels: levels,
      matrix: matrix,
      source: 'Capítulo 4 · §4.1 Arquitectura de fondos y §4.3 Matriz de articulación',
    };
  }

  function bodyHtml(data) {
    if (!data.levels.length) return '<p class="viz__hint">Sin datos de apoyos.</p>';

    var cols = data.levels.map(function (l) {
      return '<div class="gov-col">' +
        '<div class="gov-col__head"><div class="gov-col__k">' + escapeHtml(l.scope) + '</div>' +
        '<div class="gov-col__t">' + escapeHtml(l.title) + '</div></div>' +
        '<ul>' + l.programs.map(function (p) {
          var txt = escapeHtml(p);
          // Resalta el nombre del programa (antes de los dos puntos)
          txt = txt.replace(/^([^:]{3,60}):/, '<strong>$1:</strong>');
          return '<li>' + txt + '</li>';
        }).join('') + '</ul></div>';
    }).join('');

    var rows = data.matrix.map(function (m) {
      return '<tr><td>' + escapeHtml(m.phase) + '</td><td>' + escapeHtml(m.program) + '</td>' +
        '<td>' + escapeHtml(m.type) + '</td><td class="is-num">' + escapeHtml(m.amount) + '</td>' +
        '<td>' + escapeHtml(m.action) + '</td></tr>';
    }).join('');

    return '<div class="gov-grid">' + cols + '</div>' +
      (rows ? '<div style="margin-top:1.4rem" class="table-wrap"><div class="table-scroll"><table>' +
        '<thead><tr><th>Fase del proyecto</th><th>Programa institucional</th><th>Tipo de apoyo</th>' +
        '<th>Monto / beneficio</th><th>Estatus / acción requerida</th></tr></thead><tbody>' + rows +
        '</tbody></table></div></div>' : '') +
      '<p class="viz__note">Fuente: ' + data.source + ' · ' + data.levels.length + ' niveles de gobierno y ' +
      data.matrix.length + ' renglones de matriz. Montos y beneficios tal como los declara el documento.</p>';
  }

  var api = { buildSubsidies: buildSubsidies, bodyHtml: bodyHtml };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (global) global.GEMA32_VIZ_SUBSIDIES = api;
})(typeof window !== 'undefined' ? window : globalThis);
