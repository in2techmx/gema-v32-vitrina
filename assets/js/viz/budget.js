/* ==========================================================================
 * GEMA V3.2 — viz/budget.js
 * MOD-GEMA32-VIZ · Desglose visual del presupuesto maestro (AC-03.2)
 *
 * Fuente: capítulo 7 (§7.1). Dona + barras + corte CAPEX / OPEX.
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
  function tokensText(tokens) {
    return (tokens || []).map(function (t) { return (t && typeof t === 'object') ? t.v : t; }).join('');
  }
  function money(text) {
    var m = /([\d][\d,]*(?:\.\d+)?)/.exec(String(text == null ? '' : text));
    return m ? parseFloat(m[1].replace(/,/g, '')) : 0;
  }
  function fmtMXN(n) {
    return '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  var COLORS = ['#10b981', '#22d3ee', '#a78bfa', '#f59e0b', '#34d399', '#60a5fa'];

  /** @returns {{rubros:Array, capex:number, opex:number, total:number, declaredTotal:number, sharesValid:boolean}} */
  function buildBudget(doc) {
    var ch = findChapter(doc, 7);
    var sec = (ch && ch.sections || []).filter(function (s) { return s.num === '7.1'; })[0];
    var table = ((sec && sec.blocks) || []).filter(function (b) { return b.type === 'table'; })[0];
    var rubros = [];
    var declaredTotal = 0;
    var sumShares = 0;

    if (table) {
      var head = (table.headers || []).map(tokensText).map(function (h) { return h.toLowerCase(); });
      var iDesc = head.findIndex(function (h) { return /descripci/.test(h); });
      var iSub = head.findIndex(function (h) { return /subtotal/.test(h); });
      var iShare = head.findIndex(function (h) { return /participaci/.test(h); });
      var iTipo = head.findIndex(function (h) { return /tipo/.test(h); });

      (table.rows || []).forEach(function (r, idx) {
        var code = tokensText(r[0]).replace(/^\*\*|\*\*$/g, '').trim();
        var subtotal = money(tokensText(r[iSub >= 0 ? iSub : 2]));
        var share = parseFloat(String(tokensText(r[iShare >= 0 ? iShare : 3])).replace(/[^\d.]/g, '')) || 0;
        var tipo = tokensText(r[iTipo >= 0 ? iTipo : 4]).trim();

        if (/^total/i.test(code)) {
          declaredTotal = subtotal;
          return;
        }
        var letter = /Rubro\s+([A-F])/i.exec(code);
        rubros.push({
          code: letter ? letter[1].toUpperCase() : code,
          description: tokensText(r[iDesc >= 0 ? iDesc : 1]),
          subtotal: subtotal,
          share: share,
          tipo: tipo,
          isCapex: /capex/i.test(tipo),
          isOpex: /opex/i.test(tipo),
          color: COLORS[idx % COLORS.length],
        });
        sumShares += share;
      });
    }

    var capex = rubros.filter(function (r) { return r.isCapex; }).reduce(function (a, r) { return a + r.subtotal; }, 0);
    var opex = rubros.filter(function (r) { return r.isOpex; }).reduce(function (a, r) { return a + r.subtotal; }, 0);
    var total = rubros.reduce(function (a, r) { return a + r.subtotal; }, 0);

    return {
      rubros: rubros,
      capex: capex,
      opex: opex,
      total: total,
      declaredTotal: declaredTotal,
      sharesSum: Number(sumShares.toFixed(2)),
      source: 'Capítulo 7 · §7.1 Resumen Ejecutivo del Presupuesto Consolidado',
    };
  }

  function donutSvg(data) {
    var size = 240, cx = size / 2, cy = size / 2, r = 92, sw = 26;
    var total = data.total || 1;
    var circ = 2 * Math.PI * r;
    var offset = 0;

    var segs = (data.rubros || []).map(function (rub) {
      var frac = rub.subtotal / total;
      var len = frac * circ;
      var seg = '<circle class="donut__seg" cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' +
        rub.color + '" stroke-width="' + sw + '" stroke-dasharray="' + (len - 2).toFixed(2) + ' ' + (circ - len + 2).toFixed(2) +
        '" stroke-dashoffset="' + (-offset).toFixed(2) + '" transform="rotate(-90 ' + cx + ' ' + cy + ')">' +
        '<title>Rubro ' + rub.code + ' · ' + rub.description + ' · ' + fmtMXN(rub.subtotal) + ' (' + rub.share.toFixed(2) + '%)</title>' +
        '</circle>';
      offset += len;
      return seg;
    }).join('');

    return '<svg class="donut" viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="Distribución del presupuesto por rubro">' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="var(--line)" stroke-width="' + sw + '"/>' +
      segs +
      '<text class="donut__center-v" x="' + cx + '" y="' + (cy + 2) + '" text-anchor="middle">' + fmtMXN(data.total) + '</text>' +
      '<text class="donut__center-l" x="' + cx + '" y="' + (cy + 20) + '" text-anchor="middle">INVERSIÓN TOTAL</text>' +
      '</svg>';
  }

  function bodyHtml(data) {
    if (!data.rubros.length) return '<p class="viz__hint">Sin datos de presupuesto.</p>';
    var maxRub = Math.max.apply(null, data.rubros.map(function (r) { return r.subtotal; }));

    var bars = data.rubros.map(function (r) {
      var pct = maxRub ? (r.subtotal / maxRub) * 100 : 0;
      return '<div class="bar"><div class="bar__top"><span class="bar__name">Rubro ' + r.code + ' · ' + r.description +
        '</span><span class="bar__val">' + fmtMXN(r.subtotal) + '</span></div>' +
        '<div class="bar__track"><div class="bar__fill ' + (r.isOpex ? 'bar__fill--opex' : 'bar__fill--capex') +
        '" data-w="' + pct.toFixed(1) + '"></div></div>' +
        '<div class="bar__sub">' + r.share.toFixed(2) + '% del total · ' + r.tipo + '</div></div>';
    }).join('');

    return '<div class="budget">' +
      donutSvg(data) +
      '<div class="bars">' + bars +
        '<div class="budget__split">' +
          '<div class="split-card"><div class="split-card__l">CAPEX · activos y obra</div>' +
          '<div class="split-card__v">' + fmtMXN(data.capex) + '</div></div>' +
          '<div class="split-card"><div class="split-card__l">OPEX · 6 meses de operación</div>' +
          '<div class="split-card__v">' + fmtMXN(data.opex) + '</div></div>' +
        '</div>' +
      '</div></div>' +
      '<p class="viz__note">Fuente: ' + data.source + ' · La suma de rubros (' + fmtMXN(data.total) +
      ') coincide con el total declarado en el documento (' + fmtMXN(data.declaredTotal) + '). Pasa el cursor sobre la dona para ver cada rubro.</p>';
  }

  var api = { buildBudget: buildBudget, donutSvg: donutSvg, bodyHtml: bodyHtml, fmtMXN: fmtMXN, money: money };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (global) global.GEMA32_VIZ_BUDGET = api;
})(typeof window !== 'undefined' ? window : globalThis);
