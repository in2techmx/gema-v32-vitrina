/* ==========================================================================
 * GEMA V3.2 — viz/flows.js
 * MOD-GEMA32-FLOWS · Flujos y diagramas animados (AC-07)
 *
 * Tres flujos construidos con datos del documento:
 *   - funds:    arquitectura de fondos por nivel de gobierno (§4.1)
 *   - chain:    cadena de valor, del campo al cliente (§2.2 + §6.3)
 *   - treasury: niveles de autorización del gasto (§9.2)
 *
 * Los trazos se animan con guiones en movimiento y se detienen por completo
 * con prefers-reduced-motion (AC-07.4).
 * ========================================================================== */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function findChapter(doc, num) {
    return (doc.chapters || []).filter(function (c) { return c.num === num; })[0] || null;
  }
  function sectionOf(ch, num) {
    return ((ch && ch.sections) || []).filter(function (s) { return s.num === num; })[0] || null;
  }
  function tokensText(tokens) {
    return (tokens || []).map(function (t) { return (t && typeof t === 'object') ? t.v : t; }).join('');
  }
  function blocksOf(ch) {
    if (!ch) return [];
    return (ch.intro || []).concat((ch.sections || []).reduce(function (a, s) { return a.concat(s.blocks); }, []));
  }

  var COLORES = { federal: '#0284c7', estatal: '#10b981', municipal: '#7c3aed' };

  /* ---------------------- 1. Arquitectura de fondos (§4.1) --------------- */

  function buildFundsFlow(doc) {
    var sec = sectionOf(findChapter(doc, 4), '4.1');
    var cards = ((sec && sec.blocks) || []).filter(function (b) { return b.type === 'cards'; })[0];
    var levels = ((cards && cards.items) || []).map(function (c, i) {
      var clave = /federal/i.test(c.title) ? 'federal' : /estatal/i.test(c.title) ? 'estatal' : 'municipal';
      return {
        key: clave,
        title: c.title.replace(/^\d+\.\s*/, ''),
        scope: c.sub,
        programs: (c.bullets || []).map(function (b) {
          var m = /^([^:]{3,70}):\s*(.*)$/.exec(b);
          return m ? { name: m[1].trim(), detail: m[2].trim() } : { name: b, detail: '' };
        }),
        color: COLORES[clave] || '#10b981',
        index: i,
      };
    });
    return {
      levels: levels,
      board: (cards && cards.title) || '',
      source: 'Capítulo 4 · §4.1 Estrategia de Apalancamiento Institucional y Subsidios',
    };
  }

  /* ---------------------- 2. Cadena de valor (§2.2 + §6.3) --------------- */

  function buildValueChain(doc) {
    var sec = sectionOf(findChapter(doc, 2), '2.2');
    var stages = ((sec && sec.blocks) || []).filter(function (b) {
      return b.type === 'heading' && b.level === 4;
    }).map(function (b, i) {
      var t = tokensText(b.tokens).replace(/^\d+\.\s*/, '').trim();
      return { index: i, title: t.split('(')[0].trim(), full: t, subs: [] };
    });

    // Actividades internas de cada etapa (las viñetas que la siguen)
    var blocks = (sec && sec.blocks) || [];
    stages.forEach(function (st) {
      var i = blocks.findIndex(function (b) {
        return b.type === 'heading' && b.level === 4 && tokensText(b.tokens).indexOf(st.full.split('(')[0].trim()) >= 0;
      });
      for (var j = i + 1; j < blocks.length; j++) {
        if (blocks[j].type === 'heading' && blocks[j].level === 4) break;
        if (blocks[j].type === 'list') {
          (blocks[j].items || []).forEach(function (it) {
            if ((it.depth || 0) === 0) {
              var txt = tokensText(it.tokens);
              var m = /^([^:]{3,60}):/.exec(txt);
              st.subs.push(m ? m[1].trim() : txt.slice(0, 60));
            }
          });
        }
      }
    });

    // Destinos: los 7 canales comerciales del §6.3
    var channels = [];
    var ch6 = findChapter(doc, 6);
    ((sectionOf(ch6, '6.3') || {}).blocks || []).filter(function (b) { return b.type === 'list'; })
      .forEach(function (l) {
        (l.items || []).forEach(function (it) {
          if ((it.depth || 0) !== 0) return;
          var m = /^Canal\s+(\d+)\s*:\s*(.+)$/i.exec(tokensText(it.tokens).trim());
          if (m) channels.push({ num: parseInt(m[1], 10), title: m[2].trim() });
        });
      });
    channels.sort(function (a, b) { return a.num - b.num; });

    return {
      stages: stages,
      channels: channels,
      source: 'Capítulo 2 · §2.2 (etapas productivas) y Capítulo 6 · §6.3 (7 canales)',
    };
  }

  /* ---------------------- 3. Tesorería y autorizaciones (§9.2) ----------- */

  function buildTreasuryFlow(doc) {
    var sec = sectionOf(findChapter(doc, 9), '9.2');
    var steps = ((sec && sec.blocks) || []).filter(function (b) { return b.type === 'steps'; })[0];
    var ETIQUETAS = ['Ejecutor', 'Ejecutores', 'Instrumento', 'Conceptos', 'Control'];

    var levels = ((steps && steps.items) || []).map(function (it) {
      var campos = {};

      // Los campos de este tablero vienen en el propio paso (§9.2 usa <strong>+<br>,
      // no viñetas), así que se separan por sus etiquetas.
      var texto = [it.desc || ''].concat(it.bullets || []).join(' ').replace(/\s+/g, ' ').trim();
      ETIQUETAS.forEach(function (etq, i) {
        var re = new RegExp(etq + ':\\s*([\\s\\S]*?)(?=\\s*(?:' + ETIQUETAS.join('|') + '):|$)', 'i');
        var m = re.exec(texto);
        if (m) campos[etq.toLowerCase().replace(/es$/, '')] = m[1].trim();
      });

      return {
        badge: it.badge,
        title: it.title,
        limit: it.tag,
        executor: campos.ejecutor || '',
        instrument: campos.instrumento || '',
        concepts: campos.conceptos || '',
        control: campos.control || '',
        extra: '',
      };
    });
    return {
      levels: levels,
      source: 'Capítulo 9 · §9.2 Política de Gobernanza de Adquisiciones y Niveles de Autorización',
    };
  }

  /* ---------------------- Trazos animados reutilizables ------------------ */

  /** Enlace animado entre dos puntos (guiones en movimiento). */
  function linkPath(x1, y1, x2, y2, etiqueta) {
    var mx = (x1 + x2) / 2;
    var d = 'M' + x1 + ' ' + y1 + ' C' + mx + ' ' + y1 + ', ' + mx + ' ' + y2 + ', ' + x2 + ' ' + y2;
    return '<g class="flow-link">' +
      '<path class="flow-link__line" d="' + d + '"/>' +
      (etiqueta ? '<text class="flow-link__t" x="' + mx + '" y="' + ((y1 + y2) / 2 - 6) + '" text-anchor="middle">' +
        esc(etiqueta) + '</text>' : '') +
      '</g>';
  }

  /** Parte un texto en líneas sin cortar palabras (para etiquetas SVG multilínea). */
  function envolver(texto, maxCar) {
    var palabras = String(texto || '').split(/\s+/).filter(Boolean);
    var lineas = [];
    var actual = '';
    palabras.forEach(function (p) {
      if (!actual) { actual = p; return; }
      if ((actual + ' ' + p).length <= maxCar) actual += ' ' + p;
      else { lineas.push(actual); actual = p; }
    });
    if (actual) lineas.push(actual);
    return lineas;
  }

  /**
   * Nodo de flujo con etiqueta MULTILÍNEA.
   *
   * Las etiquetas de una sola línea se salían del nodo y se encimaban con el vecino
   * (el caso más grave: «Línea de Transformación Agroindustrial» invadía el nodo de
   * Experiencias). Aquí se envuelve el texto al ancho útil del nodo y se centra en
   * vertical, de modo que nunca desborda.
   */
  function flowNode(x, y, w, h, titulo, sub, color, extra) {
    var FS = 12.5;
    var ANCHO_CAR = FS * 0.58;                  // ancho medio por carácter
    var maxCar = Math.max(8, Math.floor((w - 26) / ANCHO_CAR));
    var lineas = envolver(titulo, maxCar).slice(0, 3);
    var lh = 15;
    var alto = lineas.length * lh + (sub ? 14 : 0);
    var yIni = y + (h - alto) / 2 + lh * 0.78;

    var tspans = lineas.map(function (l, i) {
      return '<tspan x="' + (x + w / 2) + '" y="' + (yIni + i * lh).toFixed(1) + '">' + esc(l) + '</tspan>';
    }).join('');

    return '<g class="flow-node"' + (extra || '') + '>' +
      '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="10" fill="' + color +
      '" fill-opacity="0.14" stroke="' + color + '" stroke-width="1.6"/>' +
      '<text class="flow-node__t" text-anchor="middle">' + tspans + '</text>' +
      (sub ? '<text class="flow-node__s" x="' + (x + w / 2) + '" y="' +
        (yIni + (lineas.length - 1) * lh + 17).toFixed(1) + '" text-anchor="middle">' + esc(sub) + '</text>' : '') +
      '</g>';
  }

  /* ---------------------- Vistas ---------------------------------------- */

  function fundsHtml(data, activeKey) {
    if (!data.levels.length) return '<p class="viz__hint">Sin datos de financiamiento.</p>';
    var W = 1000, H = 470;
    var ancho = 300, alto = 118, gap = 20;
    var activo = data.levels.filter(function (l) { return l.key === activeKey; })[0] || data.levels[0];

    var nodos = data.levels.map(function (l, i) {
      var x = 20 + i * (ancho + gap);
      return flowNode(x, 30, ancho, alto, l.title, l.scope, l.color,
        ' data-level="' + l.key + '" tabindex="0" role="button" aria-pressed="' + (l.key === activo.key ? 'true' : 'false') + '"' +
        ' style="opacity:' + (l.key === activo.key ? '1' : '0.55') + '"');
    }).join('');

    var enlaces = data.levels.map(function (l, i) {
      var x1 = 20 + i * (ancho + gap) + ancho / 2;
      return linkPath(x1, 148, 500, 262, '');
    }).join('');

    var destino = flowNode(320, 262, 360, 112, 'Gema Agroecología (Fase Piloto)',
      'Unidad piloto 1.00 HA + invernadero 200 m²', '#10b981');

    var detalle = '<div class="flow-detail"><div class="flow-detail__head">' +
      '<span class="chip" style="border-color:' + activo.color + '">' + esc(activo.scope) + '</span>' +
      '<span class="chip chip--mono">' + activo.programs.length + ' programa(s)</span></div>' +
      '<h4 class="flow-detail__t">' + esc(activo.title) + '</h4><ul class="flow-detail__list">' +
      activo.programs.map(function (p) {
        return '<li><strong>' + esc(p.name) + ':</strong> ' + esc(p.detail) + '</li>';
      }).join('') + '</ul></div>';

    return '<svg class="flow" viewBox="0 0 ' + W + ' ' + H + '" role="img" ' +
      'aria-label="Flujo de financiamiento: tres niveles de gobierno alimentan al proyecto">' +
      enlaces + nodos + destino + '</svg>' + detalle +
      '<p class="viz__note">Fuente: ' + data.source + ' · Selecciona un nivel para ver sus programas.</p>';
  }

  function chainHtml(data) {
    if (!data.stages.length) return '<p class="viz__hint">Sin datos de cadena de valor.</p>';
    var W = 1000, H = 290;
    var ancho = 216, alto = 124, gap = 20;
    var nodos = data.stages.map(function (s, i) {
      var x = 18 + i * (ancho + gap);
      return flowNode(x, 70, ancho, alto, s.title, (s.subs.length ? s.subs.length + ' líneas de trabajo' : ''), '#10b981',
        ' data-stage="' + i + '" tabindex="0" role="button" aria-pressed="false"');
    }).join('');
    var enlaces = [];
    for (var i = 0; i < data.stages.length - 1; i++) {
      var x1 = 18 + i * (ancho + gap) + ancho;
      enlaces.push(linkPath(x1, 132, x1 + gap, 132, ''));
    }
    var xUltimo = 18 + data.stages.length * (ancho + gap);
    var canales = flowNode(xUltimo, 70, Math.min(ancho + 40, W - 18 - xUltimo), alto,
      data.channels.length + ' canales comerciales', 'venta y cobro', '#f59e0b');
    enlaces.push(linkPath(xUltimo - gap, 132, xUltimo, 132, ''));

    return '<svg class="flow" viewBox="0 0 ' + W + ' ' + H + '" role="img" ' +
      'aria-label="Cadena de valor: etapas productivas hasta los canales comerciales">' +
      enlaces.join('') + nodos + canales +
      '<text class="map__scale" x="18" y="' + (H - 14) + '">Cada etapa alimenta a la siguiente · destinos comerciales a la derecha</text>' +
      '</svg>' +
      '<div class="flow-stages">' + data.stages.map(function (s, i) {
        return '<div class="flow-stage"><h5 class="flow-stage__t">' + (i + 1) + '. ' + esc(s.title) + '</h5>' +
          '<ul class="flow-stage__list">' + s.subs.slice(0, 6).map(function (x) {
            return '<li>' + esc(x) + '</li>';
          }).join('') + '</ul></div>';
      }).join('') +
      '<div class="flow-stage flow-stage--out"><h5 class="flow-stage__t">Destinos: ' + data.channels.length + ' canales</h5>' +
      '<ul class="flow-stage__list">' + data.channels.map(function (c) {
        return '<li>' + esc(c.title) + '</li>';
      }).join('') + '</ul></div></div>' +
      '<p class="viz__note">Fuente: ' + data.source + ' · Las etapas son las que declara el documento, sin reordenar.</p>';
  }

  function treasuryHtml(data) {
    if (!data.levels.length) return '<p class="viz__hint">Sin datos de tesorería.</p>';
    var W = 1000, H = 190;
    var ancho = 300, gap = 20;
    var nodos = data.levels.map(function (l, i) {
      var x = 20 + i * (ancho + gap);
      return flowNode(x, 30, ancho, 116, l.badge + ' — ' + l.limit,
        (l.executor || '').slice(0, 42), ['#10b981', '#0284c7', '#7c3aed'][i % 3]);
    }).join('');
    var enlaces = [];
    for (var i = 0; i < data.levels.length - 1; i++) {
      var x1 = 20 + i * (ancho + gap) + ancho;
      enlaces.push(linkPath(x1, 88, x1 + gap, 88, 'escala'));
    }
    return '<svg class="flow" viewBox="0 0 ' + W + ' ' + H + '" role="img" ' +
      'aria-label="Niveles de autorización del gasto, de menor a mayor monto">' +
      enlaces.join('') + nodos +
      '<text class="map__scale" x="20" y="' + (H - 12) + '">A mayor monto, más firmas y controles</text>' +
      '</svg>' +
      '<div class="flow-ladder">' + data.levels.map(function (l) {
        return '<div class="flow-rung"><div class="flow-rung__head"><span class="chip chip--mono">' + esc(l.badge) + '</span>' +
          '<span class="chip chip--accent">' + esc(l.limit) + '</span></div>' +
          '<div class="flow-rung__t">' + esc(l.title) + '</div>' +
          '<dl class="flow-rung__dl">' +
          (l.executor ? '<dt>Ejecutor</dt><dd>' + esc(l.executor) + '</dd>' : '') +
          (l.instrument ? '<dt>Instrumento</dt><dd>' + esc(l.instrument) + '</dd>' : '') +
          (l.concepts ? '<dt>Conceptos</dt><dd>' + esc(l.concepts) + '</dd>' : '') +
          (l.control ? '<dt>Control</dt><dd>' + esc(l.control) + '</dd>' : '') +
          '</dl></div>';
      }).join('') + '</div>' +
      '<p class="viz__note">Fuente: ' + data.source + ' · Un gasto mayor exige más firmas: el flujo muestra la escalera de autorización.</p>';
  }

  var api = {
    buildFundsFlow: buildFundsFlow,
    buildValueChain: buildValueChain,
    buildTreasuryFlow: buildTreasuryFlow,
    linkPath: linkPath,
    flowNode: flowNode,
    fundsHtml: fundsHtml,
    chainHtml: chainHtml,
    treasuryHtml: treasuryHtml,
    esc: esc,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (global) global.GEMA32_VIZ_FLOWS = api;
})(typeof window !== 'undefined' ? window : globalThis);
