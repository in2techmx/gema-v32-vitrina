/* ==========================================================================
 * GEMA V3.2 — viz/roadmap.js
 * MOD-GEMA32-VIZ · Línea de tiempo modular del roadmap (AC-03.3)
 *
 * Fuente: capítulo 8 (§8.1). 3 etapas + 2 Decision Gates con sus meses reales.
 * ========================================================================== */
(function (global) {
  'use strict';

  function findChapter(doc, num) {
    return (doc.chapters || []).filter(function (c) { return c.num === num; })[0] || null;
  }
  function blocksOf(ch) {
    if (!ch) return [];
    return (ch.intro || []).concat((ch.sections || []).reduce(function (a, s) { return a.concat(s.blocks); }, []));
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /** @returns {{phases:Array, gates:Array, nodes:Array, source:string}} */
  function buildRoadmap(doc) {
    var ch = findChapter(doc, 8);
    var stepsBlocks = blocksOf(ch).filter(function (b) { return b.type === 'steps'; });
    // El tablero del roadmap es el que declara meses concretos y contiene los gates.
    var board = stepsBlocks.filter(function (b) {
      return b.items.some(function (i) { return /^Meses?\s/i.test(i.tag) && /^Mes\s/i.test(i.tag); });
    })[0] || stepsBlocks[0];

    var nodes = ((board && board.items) || []).map(function (it, i) {
      return {
        index: i,
        badge: it.badge,
        title: it.title,
        tag: it.tag,
        isGate: !!it.isGate,
        desc: it.desc,
        bullets: it.bullets || [],
        phase: i + 1,
      };
    });

    return {
      nodes: nodes,
      phases: nodes.filter(function (n) { return !n.isGate; }),
      gates: nodes.filter(function (n) { return n.isGate; }),
      source: 'Capítulo 8 · §8.1 Arquitectura Temporal y Secuencia por Fases',
    };
  }

  function detailHtml(node) {
    if (!node) return '<div class="tl-detail"><p class="tl-detail__d">Selecciona una etapa o compuerta de decisión para ver su alcance.</p></div>';
    return '<div class="tl-detail">' +
      '<div class="tl-detail__t">' + escapeHtml(node.badge) + ' · ' + escapeHtml(node.title) + '</div>' +
      (node.desc ? '<p class="tl-detail__d">' + escapeHtml(node.desc) + '</p>' : '') +
      (node.bullets.length ? '<ul class="tl-detail__b">' + node.bullets.map(function (b) {
        return '<li>' + escapeHtml(b) + '</li>';
      }).join('') + '</ul>' : '') +
      '<div class="viz__hint">' + escapeHtml(node.tag) + (node.isGate ? ' · compuerta de decisión colegiada' : ' · etapa operativa') + '</div>' +
      '</div>';
  }

  function bodyHtml(data, activeIndex) {
    if (!data.nodes.length) return '<p class="viz__hint">Sin datos de roadmap.</p>';
    var active = (activeIndex == null) ? 0 : activeIndex;

    var markers = data.nodes.map(function (n, i) {
      return '<button class="tl-node' + (n.isGate ? ' tl-node--gate' : '') + '" type="button" data-idx="' + i +
        '" aria-pressed="' + (i === active ? 'true' : 'false') + '">' +
        '<span class="tl-node__marker">' + escapeHtml(n.isGate ? 'G' + (data.gates.indexOf(n) + 1) : String(n.phase)) + '</span>' +
        '<span class="tl-node__t">' + escapeHtml(n.title.split('—')[0].trim()) + '</span>' +
        '<span class="tl-node__m">' + escapeHtml(n.tag) + '</span></button>';
    }).join('');

    return '<div class="timeline">' +
      '<div class="timeline__rail"><div class="timeline__progress" data-w="66"></div></div>' +
      '<div class="timeline__row">' + markers + '</div>' +
      '<div data-tl-detail>' + detailHtml(data.nodes[active]) + '</div>' +
      '</div>' +
      '<p class="viz__note">Fuente: ' + data.source + ' · ' + data.phases.length + ' etapas y ' + data.gates.length +
      ' Decision Gates. El avance de la barra es ilustrativo (fase piloto en curso).</p>';
  }

  var api = { buildRoadmap: buildRoadmap, bodyHtml: bodyHtml, detailHtml: detailHtml };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (global) global.GEMA32_VIZ_ROADMAP = api;
})(typeof window !== 'undefined' ? window : globalThis);
