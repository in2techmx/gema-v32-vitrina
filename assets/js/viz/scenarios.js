/* ==========================================================================
 * GEMA V3.2 — viz/scenarios.js
 * MOD-GEMA32-VIZ · Comparador de los 3 escenarios financieros (AC-03.1)
 *
 * Fuente: capítulo 8 (§7.11) del documento. 12 puntos por escenario.
 * Todo dato se deriva del JSON generado; ninguna cifra se inventa aquí.
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

  /** '$ 120,000.00' | '-$ 21,000.00' | '+$ 500.00' -> número */
  function money(text) {
    var s = String(text == null ? '' : text);
    var neg = /-\s*\$/.test(s) || /^\(.*\)$/.test(s);
    var m = /([\d][\d,]*(?:\.\d+)?)/.exec(s);
    if (!m) return 0;
    var n = parseFloat(m[1].replace(/,/g, ''));
    if (isNaN(n)) return 0;
    return neg ? -n : n;
  }

  var KEYS = ['optimista', 'normal', 'pesimista'];

  function keyFor(title) {
    var t = String(title).toUpperCase();
    if (t.indexOf('OPTIMISTA') >= 0) return 'optimista';
    if (t.indexOf('PESIMISTA') >= 0) return 'pesimista';
    if (t.indexOf('NORMAL') >= 0) return 'normal';
    return null;
  }

  /**
   * @returns {{months:number, source:string, scenarios:Array}}
   */
  function buildScenarios(doc) {
    // Los escenarios viven en el §7.11, dentro del CAPÍTULO 7 (presupuesto financiero).
    var ch = findChapter(doc, 7);
    var blocks = blocksOf(ch);
    var scenarios = [];
    var current = null;

    blocks.forEach(function (b) {
      if (b.type === 'heading' && /ESCENARIO/i.test(tokensText(b.tokens))) {
        var k = keyFor(tokensText(b.tokens));
        if (k) {
          current = {
            key: k,
            title: tokensText(b.tokens).replace(/^\d+\.\s*/, ''),
            metrics: [],
            points: [],
            breakEvenMonth: null,
          };
          scenarios.push(current);
        }
        return;
      }
      if (!current) return;

      if (b.type === 'list' && !current.metrics.length) {
        (b.items || []).forEach(function (it) {
          var text = tokensText(it.tokens);
          var m = /^([^:]{4,60}):\s*(.+)$/.exec(text);
          if (m) current.metrics.push({ label: m[1].trim(), value: m[2].trim() });
        });
        return;
      }

      if (b.type === 'table' && !current.points.length) {
        var head = (b.headers || []).map(tokensText).map(function (h) { return h.toLowerCase(); });
        var iMonth = head.findIndex(function (h) { return /^mes/.test(h); });
        var iIng = head.findIndex(function (h) { return /ingresos/.test(h); });
        var iOpex = head.findIndex(function (h) { return /costos|opex/.test(h); });
        var iFlujo = head.findIndex(function (h) { return /flujo/.test(h); });
        var iSaldo = (function () {
          for (var i = head.length - 1; i >= 0; i--) if (/saldo final/.test(head[i])) return i;
          return -1;
        })();
        var iHito = (function () {
          for (var i = head.length - 1; i >= 0; i--) if (/hito/.test(head[i])) return i;
          return -1;
        })();

        (b.rows || []).forEach(function (r) {
          var label = tokensText(r[iMonth >= 0 ? iMonth : 0]);
          var mn = /(\d{1,2})/.exec(label);
          if (!mn) return;
          current.points.push({
            month: parseInt(mn[1], 10),
            label: label,
            ingresos: iIng >= 0 ? money(tokensText(r[iIng])) : 0,
            opex: iOpex >= 0 ? money(tokensText(r[iOpex])) : 0,
            flujo: iFlujo >= 0 ? money(tokensText(r[iFlujo])) : 0,
            saldoFinal: iSaldo >= 0 ? money(tokensText(r[iSaldo])) : 0,
            hito: iHito >= 0 ? tokensText(r[iHito]) : '',
          });
        });
      }
    });

    scenarios.forEach(function (s) {
      var be = s.points.filter(function (p) { return p.flujo > 0; })[0];
      s.breakEvenMonth = be ? be.month : null;
      s.metricByLabel = function (re) {
        var hit = s.metrics.filter(function (m) { return re.test(m.label); })[0];
        return hit ? hit.value : '';
      };
      s.sumIngresos = s.points.reduce(function (a, p) { return a + p.ingresos; }, 0);
      s.sumOpex = s.points.reduce(function (a, p) { return a + p.opex; }, 0);
      s.declaredIngresos = money(s.metricByLabel(/Ingresos Brutos/i));
      s.declaredOpex = money(s.metricByLabel(/Costo Operativo|OPEX/i));
      s.declaredEbitda = money(s.metricByLabel(/EBITDA|Utilidad/i));
      // Deltas entre la suma de los 12 meses y el resumen anual declarado.
      // Si el documento no cuadra, la vitrina lo DICE en lugar de corregirlo.
      s.ingresosDelta = Number((s.sumIngresos - s.declaredIngresos).toFixed(2));
      s.opexDelta = Number((s.sumOpex - s.declaredOpex).toFixed(2));
      s.ebitdaDelta = Number(((s.sumIngresos - s.sumOpex) - Math.abs(s.declaredEbitda)).toFixed(2));
      s.hasDiscrepancy = s.opexDelta !== 0 || s.ingresosDelta !== 0;
    });

    // Orden estable: optimista, normal, pesimista
    scenarios.sort(function (a, b) { return KEYS.indexOf(a.key) - KEYS.indexOf(b.key); });

    return {
      months: scenarios.length ? scenarios[0].points.length : 0,
      source: 'Capítulo 8 · §7.11 Modelación Financiera a 12 Meses',
      scenarios: scenarios,
    };
  }

  function fmtMXN(n) {
    return '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /** Conmutador de escenario. Vive en el componente para que sea verificable sin DOM. */
  function segHtml(data, activeKey) {
    return '<div class="seg" data-seg="scenarios">' + (data.scenarios || []).map(function (sc) {
      var label = sc.key.charAt(0).toUpperCase() + sc.key.slice(1);
      return '<button class="seg__btn" type="button" data-scen="' + sc.key + '" aria-pressed="' +
        (activeKey === sc.key ? 'true' : 'false') + '">' + label + '</button>';
    }).join('') + '</div>';
  }

  /** SVG del escenario activo: barras de ingreso + línea de caja acumulada. */
  function chartSvg(scenario) {
    var W = 720, H = 264, PL = 54, PR = 16, PT = 14, PB = 30;
    var pts = (scenario && scenario.points) || [];
    if (!pts.length) return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Sin datos"></svg>';

    var maxV = 0;
    pts.forEach(function (p) {
      maxV = Math.max(maxV, p.saldoFinal, p.ingresos);
    });
    maxV = maxV || 1;
    var nice = Math.pow(10, Math.floor(Math.log10(maxV))) * Math.ceil(maxV / Math.pow(10, Math.floor(Math.log10(maxV))));

    var iw = W - PL - PR;
    var ih = H - PT - PB;
    var step = iw / pts.length;
    var bw = Math.max(6, step * 0.42);

    var x = function (i) { return PL + step * i + step / 2; };
    var y = function (v) { return PT + ih - (v / nice) * ih; };

    var grid = '';
    for (var g = 0; g <= 4; g++) {
      var val = (nice / 4) * g;
      var yy = y(val);
      grid += '<line class="chart__grid" x1="' + PL + '" x2="' + (W - PR) + '" y1="' + yy.toFixed(1) + '" y2="' + yy.toFixed(1) + '"/>' +
        '<text class="chart__axis" x="' + (PL - 8) + '" y="' + (yy + 3).toFixed(1) + '" text-anchor="end">' +
        (val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val.toFixed(0)) + '</text>';
    }

    var bars = pts.map(function (p, i) {
      var h = Math.max(1, (p.ingresos / nice) * ih);
      return '<rect class="chart__bar" x="' + (x(i) - bw / 2).toFixed(1) + '" y="' + (PT + ih - h).toFixed(1) +
        '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="3"><title>Mes ' + p.month +
        ' · Ingresos ' + fmtMXN(p.ingresos) + '</title></rect>';
    }).join('');

    var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.saldoFinal).toFixed(1); }).join(' ');
    var area = line + ' L' + x(pts.length - 1).toFixed(1) + ' ' + (PT + ih) + ' L' + x(0).toFixed(1) + ' ' + (PT + ih) + ' Z';

    var dots = pts.map(function (p, i) {
      var isBreak = p.month === scenario.breakEvenMonth;
      return '<circle class="chart__dot' + (isBreak ? ' chart__dot--break' : '') + '" cx="' + x(i).toFixed(1) +
        '" cy="' + y(p.saldoFinal).toFixed(1) + '" r="' + (isBreak ? 5 : 3.4) + '"><title>Mes ' + p.month +
        ' · Caja ' + fmtMXN(p.saldoFinal) + (isBreak ? ' · punto de equilibrio' : '') + '</title></circle>';
    }).join('');

    var labels = pts.map(function (p, i) {
      if (p.month % 2 !== 1 && p.month !== pts.length) return '';
      return '<text class="chart__axis" x="' + x(i).toFixed(1) + '" y="' + (H - 10) + '" text-anchor="middle">M' + p.month + '</text>';
    }).join('');

    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Escenario ' + scenario.key +
      ': ingresos mensuales y caja acumulada">' +
      '<defs><linearGradient id="g32grad" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#10b981" stop-opacity="0.5"/><stop offset="100%" stop-color="#10b981" stop-opacity="0"/>' +
      '</linearGradient></defs>' +
      grid + bars +
      '<path class="chart__area" d="' + area + '"/>' +
      '<path class="chart__line" d="' + line + '"/>' + dots + labels + '</svg>';
  }

  /** Cuerpo completo del componente para un escenario dado. */
  function bodyHtml(data, activeKey) {
    var s = (data.scenarios || []).filter(function (x) { return x.key === activeKey; })[0] || data.scenarios[0];
    if (!s) return '<p class="viz__hint">Sin datos de escenarios.</p>';
    var neg = /^-/.test(s.metricByLabel(/EBITDA|Utilidad/i).replace(/\s/g, ''));

    var kpis = [
      { l: 'Ingresos brutos año 1', v: s.metricByLabel(/Ingresos Brutos/i), warn: false },
      { l: 'OPEX año 1', v: s.metricByLabel(/Costo Operativo|OPEX/i), warn: false },
      { l: 'EBITDA año 1', v: s.metricByLabel(/EBITDA|Utilidad/i), warn: neg },
      { l: 'Punto de equilibrio', v: 'Mes ' + s.breakEvenMonth, warn: false },
      { l: s.metricByLabel(/ROI/i) ? 'ROI anual' : 'Retorno', v: s.metricByLabel(/ROI/i) || s.metricByLabel(/Retorno|Payback/i), warn: false },
    ];

    var rows = (s.points || []).map(function (p) {
      return '<tr><td class="is-num">' + p.month + '</td>' +
        '<td class="is-num">' + fmtMXN(p.ingresos) + '</td>' +
        '<td class="is-num">' + fmtMXN(-p.opex) + '</td>' +
        '<td class="is-num">' + (p.flujo >= 0 ? '+' : '-') + fmtMXN(Math.abs(p.flujo)) + '</td>' +
        '<td class="is-num">' + fmtMXN(p.saldoFinal) + '</td>' +
        '<td>' + (p.hito || '') + '</td></tr>';
    }).join('');

    return '' +
      '<div class="scen-kpis">' + kpis.map(function (k) {
        return '<div class="scen-kpi' + (k.warn ? ' scen-kpi--warn' : '') + '">' +
          '<div class="scen-kpi__l">' + k.l + '</div><div class="scen-kpi__v">' + (k.v || '—') + '</div></div>';
      }).join('') + '</div>' +
      chartSvg(s) +
      '<p class="viz__hint">Barras: ingresos brutos del mes · Línea: caja acumulada · Punto naranja: mes de punto de equilibrio.</p>' +
      '<div class="scen-table-wrap"><div class="table-wrap"><div class="table-scroll"><table>' +
      '<thead><tr><th class="is-num">Mes</th><th class="is-num">Ingresos</th><th class="is-num">OPEX</th>' +
      '<th class="is-num">Flujo neto</th><th class="is-num">Caja acumulada</th><th>Hito operativo / comercial</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div></div></div>' +
      (s.hasDiscrepancy
        ? '<p class="viz__note viz__note--warn"><strong>Aviso de consistencia del documento:</strong> la suma de los 12 meses de este escenario no coincide con el resumen anual que declara el propio documento. ' +
          'En meses, el OPEX suma <span data-computed="suma-opex-meses">' + fmtMXN(s.sumOpex) + '</span> mientras el resumen anual declara <strong>' +
          fmtMXN(s.declaredOpex) + '</strong> (diferencia de <span data-computed="delta-opex">' + fmtMXN(Math.abs(s.opexDelta)) + '</span>). ' +
          'La vitrina muestra ambas cifras tal como aparecen en el origen: no corrige ni recalcula el documento.</p>'
        : '') +
      '<p class="viz__note">Fuente: ' + data.source + ' · ' + data.months + ' meses por escenario. Cifras tomadas del documento, sin recalcular.</p>';
  }

  var api = { buildScenarios: buildScenarios, chartSvg: chartSvg, bodyHtml: bodyHtml, segHtml: segHtml, money: money, fmtMXN: fmtMXN, findChapter: findChapter, blocksOf: blocksOf, tokensText: tokensText };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (global) global.GEMA32_VIZ_SCENARIOS = api;
})(typeof window !== 'undefined' ? window : globalThis);
