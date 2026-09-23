/* ==========================================================================
 * GEMA V3.2 — viz/seeds.js
 * MOD-GEMA32-VIZ · Catálogo de semillas con validación de subtotales (AC-03.5)
 *
 * Fuente: capítulo 7 (§7.8). 3 proveedores; los totales deben cuadrar con el
 * consolidado declarado en el documento (3,310.00 + 1,200.00 + 2,445.00 = 6,955.00).
 * ========================================================================== */
(function (global) {
  'use strict';

  function findChapter(doc, num) {
    return (doc.chapters || []).filter(function (c) { return c.num === num; })[0] || null;
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
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /**
   * @returns {{providers:Array, grandTotal:number, declaredGrandTotal:number, source:string}}
   */
  function buildSeeds(doc) {
    var ch = findChapter(doc, 7);
    var sec = (ch && ch.sections || []).filter(function (s) { return s.num === '7.8'; })[0];
    var blocks = (sec && sec.blocks) || [];
    var providers = [];
    var current = null;
    var declaredGrandTotal = 0;

    blocks.forEach(function (b) {
      if (b.type === 'heading' && /proveedor|producci/i.test(tokensText(b.tokens))) {
        var title = tokensText(b.tokens).replace(/^\d+\.\s*/, '').trim();
        current = { title: title, items: [], declaredTotal: 0, rows: [] };
        providers.push(current);
        return;
      }
      if (!current) return;

      if (b.type === 'table') {
        var head = (b.headers || []).map(tokensText).map(function (h) { return h.toLowerCase(); });
        var iSub = (function () {
          for (var i = head.length - 1; i >= 0; i--) if (/subtotal|total/.test(head[i])) return i;
          return head.length - 1;
        })();
        var iQty = head.findIndex(function (h) { return /cantidad/.test(h); });
        var iPrice = head.findIndex(function (h) { return /precio|unitario/.test(h); });

        (b.rows || []).forEach(function (r) {
          var first = tokensText(r[0]).trim();
          var isTotal = /^total/i.test(first.replace(/\*/g, ''));
          var cells = r.map(tokensText);
          if (isTotal) {
            var tot = money(cells[iSub]);
            if (tot) current.declaredTotal = tot;
            return;
          }
          var name = cells[1] || '';
          current.items.push({
            row: first,
            name: name,
            presentation: cells[2] || '',
            qty: iQty >= 0 ? money(cells[iQty]) : 0,
            price: iPrice >= 0 ? money(cells[iPrice]) : 0,
            subtotal: money(cells[iSub]),
          });
        });
        return;
      }

      if (b.type === 'quote' || b.type === 'paragraph') {
        var txt = b.type === 'quote' ? (b.lines || []).map(tokensText).join(' ') : tokensText(b.tokens);
        // El consolidado es la ÚLTIMA cifra de la frase ("... = $ 6,955.00 MXN"):
        // tomar la primera devolvería el subtotal del primer proveedor.
        if (/consolidaci/i.test(txt) || /=\s*\*{0,2}\s*\$/.test(txt)) {
          var todas = txt.match(/\$\s?[\d,]+\.\d{2}/g) || [];
          if (todas.length) declaredGrandTotal = money(todas[todas.length - 1]);
        }
      }
    });

    // Si un proveedor no declara fila TOTAL, se usa la suma de sus partidas.
    providers.forEach(function (p) {
      p.computed = p.items.reduce(function (a, it) { return a + it.subtotal; }, 0);
      if (!p.declaredTotal) p.declaredTotal = p.computed;
    });

    var grandTotal = providers.reduce(function (a, p) { return a + p.declaredTotal; }, 0);
    providers.forEach(function (p) { p.provider = p.title; });

    return {
      providers: providers,
      grandTotal: grandTotal,
      declaredGrandTotal: declaredGrandTotal,
      source: 'Capítulo 7 · §7.8 Desglose del Catálogo de Semillas y Brotes',
    };
  }

  function bodyHtml(data, activeKey) {
    if (!data.providers.length) return '<p class="viz__hint">Sin datos de catálogo.</p>';
    var active = activeKey || 'all';

    var chips = '<button class="seg__btn" type="button" data-prov="all" aria-pressed="' + (active === 'all' ? 'true' : 'false') + '">Todos (' +
      data.providers.reduce(function (a, p) { return a + p.items.length; }, 0) + ')</button>' +
      data.providers.map(function (p, i) {
        return '<button class="seg__btn" type="button" data-prov="' + i + '" aria-pressed="' + (String(active) === String(i) ? 'true' : 'false') + '">' +
          escapeHtml(p.title.replace(/^Proveedor:\s*/i, '').split('(')[0].trim()) + ' (' + p.items.length + ')</button>';
      }).join('');

    var shown = data.providers.filter(function (p, i) { return active === 'all' || String(active) === String(i); });

    var table = '<div class="table-wrap"><div class="table-scroll"><table>' +
      '<thead><tr><th>#</th><th>Especie / insumo</th><th>Presentación</th><th class="is-num">Cantidad</th>' +
      '<th class="is-num">P. unitario</th><th class="is-num">Subtotal</th></tr></thead><tbody>' +
      shown.reduce(function (acc, p) {
        acc.push('<tr><td colspan="6"><strong>' + escapeHtml(p.title) + '</strong></td></tr>');
        p.items.forEach(function (it) {
          acc.push('<tr><td class="is-num">' + escapeHtml(it.row) + '</td><td>' + escapeHtml(it.name) + '</td>' +
            '<td>' + escapeHtml(it.presentation) + '</td><td class="is-num">' + (it.qty || '') + '</td>' +
            '<td class="is-num">' + fmtMXN(it.price) + '</td><td class="is-num">' + fmtMXN(it.subtotal) + '</td></tr>');
        });
        acc.push('<tr><td colspan="5" style="text-align:right"><strong>Total ' + escapeHtml(p.title.split('(')[0].trim()) +
          '</strong></td><td class="is-num"><strong>' + fmtMXN(p.declaredTotal) + '</strong></td></tr>');
        return acc;
      }, []).join('') +
      '</tbody></table></div></div>';

    var totals = '<div class="seed-totals">' +
      data.providers.map(function (p) {
        return '<div class="seed-total"><div class="seed-total__l">' + escapeHtml(p.title.split('(')[0].trim()) +
          '</div><div class="seed-total__v">' + fmtMXN(p.declaredTotal) + '</div></div>';
      }).join('') +
      '<div class="seed-total seed-total--main"><div class="seed-total__l">Consolidado rubro B.1</div>' +
      '<div class="seed-total__v">' + fmtMXN(data.grandTotal) + '</div></div></div>';

    var cuadra = data.declaredGrandTotal ? (Math.abs(data.grandTotal - data.declaredGrandTotal) < 0.01) : null;
    var veredicto = cuadra === null ? '' :
      '<p class="viz__note">Validación aritmética: la suma de los 3 proveedores (' + fmtMXN(data.grandTotal) + ') ' +
      (cuadra ? 'cuadra exactamente con el consolidado declarado en el documento (' : 'NO cuadra con el consolidado declarado (') +
      fmtMXN(data.declaredGrandTotal) + ').</p>';

    return '<div class="prov-chips seg">' + chips + '</div>' + table + totals + veredicto +
      '<p class="viz__note">Fuente: ' + data.source + ' · Cifras literales del documento, sin recálculo.</p>';
  }

  var api = { buildSeeds: buildSeeds, bodyHtml: bodyHtml, fmtMXN: fmtMXN, money: money };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (global) global.GEMA32_VIZ_SEEDS = api;
})(typeof window !== 'undefined' ? window : globalThis);
