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

  /** Nodo de flujo con etiqueta y subtítulo. */
  function flowNode(x, y, w, h, titulo, sub, color, extra) {
    return '<g class="flow-node"' + (extra || '') + '>' +
      '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="10" fill="' + color +
      '" fill-opacity="0.14" stroke="' + color + '" stroke-width="1.6"/>' +
      '<text class="flow-node__t" x="' + (x + w / 2) + '" y="' + (y + h / 2 - 3) + '" text-anchor="middle">' + esc(titulo) + '</text>' +
      (sub ? '<text class="flow-node__s" x="' + (x + w / 2) + '" y="' + (y + h / 2 + 15) + '" text-anchor="middle">' +
        esc(sub) + '</text>' : '') +
      '</g>';
  }

  /* ---------------------- Vistas ---------------------------------------- */

  function fundsHtml(data, activeKey) {
    if (!data.levels.length) return '<p class="viz__hint">Sin datos de financiamiento.</p>';
    var W = 1000, H = 430;
    var ancho = 288, alto = 96, gap = 32;
    var activo = data.levels.filter(function (l) { return l.key === activeKey; })[0] || data.levels[0];

    var nodos = data.levels.map(function (l, i) {
      var x = 30 + i * (ancho + gap);
      return flowNode(x, 40, ancho, alto, l.title, l.scope, l.color,
        ' data-level="' + l.key + '" tabindex="0" role="button" aria-pressed="' + (l.key === activo.key ? 'true' : 'false') + '"' +
        ' style="opacity:' + (l.key === activo.key ? '1' : '0.55') + '"');
    }).join('');

    var enlaces = data.levels.map(function (l, i) {
      var x1 = 30 + i * (ancho + gap) + ancho / 2;
      return linkPath(x1, 136, 500, 236, '');
    }).join('');

    var destino = flowNode(320, 236, 360, 92, 'Gema Agroecología (Fase Piloto)',
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
    var W = 1000, H = 250;
    var ancho = 200, alto = 92, gap = 34;
    var nodos = data.stages.map(function (s, i) {
      var x = 24 + i * (ancho + gap);
      return flowNode(x, 74, ancho, alto, s.title, (s.subs.length ? s.subs.length + ' líneas' : ''), '#10b981',
        ' data-stage="' + i + '" tabindex="0" role="button" aria-pressed="false"');
    }).join('');
    var enlaces = [];
    for (var i = 0; i < data.stages.length - 1; i++) {
      var x1 = 24 + i * (ancho + gap) + ancho;
      enlaces.push(linkPath(x1, 120, x1 + gap, 120, ''));
    }
    var canales = flowNode(24 + data.stages.length * (ancho + gap), 74, ancho, alto,
      data.channels.length + ' canales comerciales', 'venta y cobro', '#f59e0b');

    return '<svg class="flow" viewBox="0 0 ' + W + ' ' + H + '" role="img" ' +
      'aria-label="Cadena de valor: etapas productivas hasta los canales comerciales">' +
      enlaces.join('') + nodos + canales + '</svg>' +
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
    var W = 1000, H = 156;
    var ancho = 288, gap = 32;
    var nodos = data.levels.map(function (l, i) {
      var x = 30 + i * (ancho + gap);
      return flowNode(x, 26, ancho, 104, l.badge + ' — ' + l.limit,
        (l.executor || '').slice(0, 40), ['#10b981', '#0284c7', '#7c3aed'][i % 3]);
    }).join('');
    var enlaces = [];
    for (var i = 0; i < data.levels.length - 1; i++) {
      var x1 = 30 + i * (ancho + gap) + ancho;
      enlaces.push(linkPath(x1, 78, x1 + gap, 78, 'escala'));
    }
    return '<svg class="flow" viewBox="0 0 ' + W + ' ' + H + '" role="img" ' +
      'aria-label="Niveles de autorización del gasto, de menor a mayor monto">' +
      enlaces.join('') + nodos + '</svg>' +
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
