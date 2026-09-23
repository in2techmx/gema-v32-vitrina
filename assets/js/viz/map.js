/* ==========================================================================
 * GEMA V3.2 — viz/map.js
 * MOD-GEMA32-MAPS · Mapas SVG interactivos (AC-06)
 *
 * Dos mapas autocontenidos, sin Leaflet ni teselas remotas (la vitrina debe
 * funcionar sin internet, y ese requisito está medido por un test):
 *   1. Polígono de 10.00 HA con sus 4 zonas a ÁREA PROPORCIONAL (dato del documento).
 *   2. Esquema de contexto regional con las distancias reales que declara el documento.
 *
 * El mapa es un ESQUEMA: la interfaz lo advierte explícitamente para no engañar.
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
  function tokensText(tokens) {
    return (tokens || []).map(function (t) { return (t && typeof t === 'object') ? t.v : t; }).join('');
  }
  function sectionOf(ch, num) {
    return ((ch && ch.sections) || []).filter(function (s) { return s.num === num; })[0] || null;
  }

  var COLORES = ['#10b981', '#0284c7', '#7c3aed', '#65a30d'];

  /**
   * Zonas del polígono tomadas del §1.2 (una zona por elemento de nivel 0 de la lista).
   * @returns {{ zones:Array, totalHa:number, declaredTotal:number, coordinates:string, source:string }}
   */
  function buildZones(doc) {
    var ch = findChapter(doc, 1);
    var sec = sectionOf(ch, '1.2');
    var zones = [];
    var declaredTotal = 0;

    ((sec && sec.blocks) || []).filter(function (b) { return b.type === 'list'; }).forEach(function (list) {
      (list.items || []).forEach(function (it) {
        var texto = tokensText(it.tokens).trim();
        if ((it.depth || 0) !== 0) {
          // viñeta anidada: pertenece a la última zona (equipamiento interno)
          var mDet = /^([^:]{3,60}):\s*(.*)$/.exec(texto);
          if (zones.length && mDet) {
            zones[zones.length - 1].items.push({ title: mDet[1].trim(), detail: mDet[2].trim() });
          }
          return;
        }
        // El marcador de la lista vive en `it.marker` (por ejemplo "1."), NO dentro del
        // texto del elemento: hay que usarlo para numerar la zona.
        var etiqueta = String(it.marker || '').trim();
        var esNumerado = it.ordered || /^\d+\.$/.test(etiqueta);
        if (!esNumerado) return;
        var numZona = parseInt(etiqueta.replace(/\D/g, ''), 10);
        var cuerpo = texto.replace(/^\d+\.\s*/, '');
        var ha = /\(([\d.]+)\s*HA/i.exec(cuerpo) || /([\d.]+)\s*HA/i.exec(cuerpo);
        var m2 = /([\d,]{3,})\s*m²/.exec(cuerpo);
        if (!ha) return;
        var titulo = cuerpo.split(':')[0].replace(/\(.*$/, '').replace(/\*/g, '').trim();
        zones.push({
          num: numZona,
          key: 'zona-' + numZona,
          title: titulo,
          ha: parseFloat(ha[1]),
          m2: m2 ? parseInt(m2[1].replace(/,/g, ''), 10) : null,
          detail: (cuerpo.split(':').slice(1).join(':') || '').trim(),
          items: [],
          color: COLORES[(numZona - 1) % COLORES.length],
          section: '1.2',
        });
      });
    });

    // Superficie total declarada: vive en la tabla del §1.1 («Superficie Total del Polígono»).
    var sec11 = sectionOf(ch, '1.1');
    var tabla = ((sec11 && sec11.blocks) || []).filter(function (b) { return b.type === 'table'; })[0];
    if (tabla) {
      (tabla.rows || []).forEach(function (r) {
        var etiqueta = tokensText(r[0]);
        if (/Superficie Total/i.test(etiqueta)) {
          var valor = tokensText(r[1] || []);
          var mt = /([\d.]+)\s*Hect/i.exec(valor) || /([\d.]+)\s*HA/i.exec(valor);
          if (mt) declaredTotal = parseFloat(mt[1]);
        }
      });
    }
    // Respaldo: la ficha técnica, si declarara el total
    if (!declaredTotal) {
      var ficha = (doc.meta && doc.meta.ficha && doc.meta.ficha.rows) || [];
      var fila = ficha.filter(function (r) { return /Superficie Total/i.test(r.label); })[0];
      if (fila) {
        var mf = /([\d.]+)\s*Hect/i.exec(fila.value) || /([\d.]+)\s*HA/i.exec(fila.value);
        if (mf) declaredTotal = parseFloat(mf[1]);
      }
    }

    // Coordenadas declaradas
    var coord = '';
    var filaCoord = ((doc.meta && doc.meta.ficha && doc.meta.ficha.rows) || [])
      .filter(function (r) { return /Coordenadas/i.test(r.label); })[0];
    if (filaCoord) {
      var mc = /([\d.]+°\s*N[^|]*)/.exec(filaCoord.value);
      coord = mc ? mc[1].trim() : filaCoord.value.split('|')[0].trim();
    }

    var ctx = buildContext(doc);
    ctx.coordinates = coord;

    return {
      zones: zones,
      totalHa: Number(zones.reduce(function (a, z) { return a + z.ha; }, 0).toFixed(2)),
      declaredTotal: declaredTotal,
      coordinates: coord,
      context: ctx,
      source: 'Capítulo 1 · §1.2 Zonificación del Polígono Dinámico',
    };
  }

  /** Datos del contexto regional, tomados del texto del §6.1 y de la ficha. */
  function buildContext(doc) {
    var ch6 = findChapter(doc, 6);
    var sec = sectionOf(ch6, '6.1');
    var texto = ((sec && sec.blocks) || []).map(function (b) {
      if (b.tokens) return tokensText(b.tokens);
      if (b.items) return b.items.map(function (i) { return tokensText(i.tokens); }).join(' ');
      if (b.rows) return b.rows.map(function (r) { return r.map(tokensText).join(' '); }).join(' ');
      return '';
    }).join(' ');

    function pick(re, def) { var m = re.exec(texto); return m ? m[1] : def; }
    return {
      dPeriferico: pick(/(\d+)\s*kilómetros? al sur del anillo periférico/i, '14'),
      dHacienda: pick(/(\d+)\s*metros de la afamada/i, '800'),
      minGourmet: (/menos de (\d+) minutos/i.exec(texto) || [])[1] || '25',
      circuitoMin: (/menos de (\d+) a (\d+) minutos/i.exec(texto) || [])[1] || '15',
      circuitoMax: (/menos de (\d+) a (\d+) minutos/i.exec(texto) || [])[2] || '25',
      coordinates: (doc && doc.meta && doc.meta.coordinates) || '',
      reserve: /Reserva (Ecológica )?Cuxtal/i.test(texto + JSON.stringify((doc && doc.meta) || {})) ? 'Reserva Cuxtal' : '',
      source: 'Capítulo 6 · §6.1 (distancias) y ficha técnica (coordenadas)',
    };
  }

  /** Mapa del polígono: 4 franjas de área proporcional + infraestructura. */
  function polygonSvg(data, activeKey) {
    var W = 1000, H = 520, PAD = 18;
    var usable = W - PAD * 2;
    var total = data.totalHa || 1;
    var x = PAD;

    var franjas = data.zones.map(function (z) {
      var w = (z.ha / total) * usable;
      // Zona de impacto transparente: ancho EXACTAMENTE proporcional a la superficie
      // (además agranda el área de clic). El rectángulo visible lleva un margen de 6 px.
      var g = '<g class="zone" data-zone="' + z.key + '" tabindex="0" role="button" ' +
        'aria-pressed="' + (activeKey === z.key ? 'true' : 'false') + '" ' +
        'aria-label="' + esc(z.title + ', ' + z.ha + ' hectáreas') + '">' +
        '<rect class="zone__hit" x="' + x.toFixed(1) + '" y="' + PAD + '" width="' + w.toFixed(2) +
        '" height="' + (H - PAD * 2) + '" fill="transparent"/>' +
        '<rect class="zone__box" x="' + (x + 3).toFixed(1) + '" y="' + PAD + '" width="' + Math.max(4, w - 6).toFixed(1) +
        '" height="' + (H - PAD * 2) + '" rx="10" fill="' + z.color + '" fill-opacity="0.16" ' +
        'stroke="' + z.color + '" stroke-width="1.5"/>' +
        '<rect class="zone__hatch" x="' + (x + 3).toFixed(1) + '" y="' + PAD + '" width="' + Math.max(4, w - 6).toFixed(1) +
        '" height="' + (H - PAD * 2) + '" rx="10" fill="url(#hatch)"/>' +
        '<text class="zone__ha" x="' + (x + w / 2).toFixed(1) + '" y="' + (PAD + 46) + '" text-anchor="middle">' +
        z.ha.toFixed(2) + ' HA</text>' +
        '<text class="zone__label" x="' + (x + w / 2).toFixed(1) + '" y="' + (PAD + 70) + '" text-anchor="middle">' +
        esc(z.title.length > 26 ? z.title.slice(0, 24) + '…' : z.title) + '</text>' +
        '<text class="zone__num" x="' + (x + 14).toFixed(1) + '" y="' + (H - PAD - 14) + '">ZONA ' + z.num + '</text>' +
        '</g>';
      x += w;
      return g;
    }).join('');

    // Marcadores de infraestructura dentro de la zona piloto (primera franja)
    var piloto = data.zones[0];
    var marcadores = '';
    if (piloto) {
      var anchoPiloto = (piloto.ha / total) * usable;
      var etiquetas = (piloto.items || []).slice(0, 4).map(function (it, i) {
        var y = PAD + 104 + i * 34;
        return '<g class="map-pin"><circle cx="' + (PAD + anchoPiloto / 2).toFixed(1) + '" cy="' + y +
          '" r="4.5" fill="#f59e0b"/>' +
          '<text class="map-pin__t" x="' + (PAD + anchoPiloto / 2 + 12).toFixed(1) + '" y="' + (y + 4) +
          '">' + esc(it.title.slice(0, 30)) + '</text></g>';
      }).join('');
      marcadores = etiquetas;
    }

    return '<svg class="map" viewBox="0 0 ' + W + ' ' + H + '" role="img" ' +
      'aria-label="Esquema del polígono de ' + total + ' hectáreas dividido en ' + data.zones.length + ' zonas a área proporcional">' +
      '<defs><pattern id="hatch" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">' +
      '<line x1="0" y1="0" x2="0" y2="8" stroke="currentColor" stroke-opacity="0.10" stroke-width="2"/></pattern></defs>' +
      franjas + marcadores +
      '<text class="map__scale" x="' + PAD + '" y="' + (H - 4) + '">Ancho de cada franja proporcional a su superficie · esquema, no a escala cartográfica</text>' +
      '</svg>';
  }

  /** Esquema de contexto regional con las distancias reales del documento. */
  function contextSvg(ctx) {
    ctx = ctx || {};
    var dPeriferico = ctx.dPeriferico || '14';
    var dHacienda = ctx.dHacienda || '800';
    var minGourmet = ctx.minGourmet || '25';
    var circuito = ctx.circuitoMin || '15';

    var W = 1000, H = 300;
    var nodos = [
      { x: 96, y: 96, r: 30, t: 'Mérida', s: 'Anillo Periférico', color: '#0284c7' },
      { x: 430, y: 96, r: 34, t: 'Rancho Gema', s: 'San Pedro Chimay', color: '#10b981' },
      { x: 430, y: 232, r: 24, t: 'Hacienda San Pedro Chimay', s: 'recinto de eventos', color: '#f59e0b' },
      { x: 820, y: 96, r: 28, t: 'Circuito de haciendas', s: 'Tahdzibichén · Teya · Petectunich', color: '#7c3aed' },
      { x: 820, y: 232, r: 24, t: 'Reserva Cuxtal', s: 'zona de recarga hídrica', color: '#65a30d' },
    ];

    var nodosSvg = nodos.map(function (n) {
      return '<g class="ctx-node"><circle cx="' + n.x + '" cy="' + n.y + '" r="' + n.r + '" fill="' + n.color +
        '" fill-opacity="0.18" stroke="' + n.color + '" stroke-width="1.6"/>' +
        '<text class="ctx-node__t" x="' + n.x + '" y="' + (n.y + 4) + '" text-anchor="middle">' + esc(n.t.split(' ')[0]) + '</text>' +
        '<text class="ctx-node__s" x="' + n.x + '" y="' + (n.y + n.r + 16) + '" text-anchor="middle">' + esc(n.s) + '</text></g>';
    }).join('');

    function enlace(x1, y1, x2, y2, etiqueta) {
      var mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      return '<g class="ctx-link"><line class="flow-line" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/>' +
        '<text class="ctx-link__t" x="' + mx + '" y="' + (my - 8) + '" text-anchor="middle">' + esc(etiqueta) + '</text></g>';
    }

    return '<svg class="map map--context" viewBox="0 0 ' + W + ' ' + H + '" role="img" ' +
      'aria-label="Esquema de contexto: distancias del rancho a Mérida, a la hacienda y al circuito de haciendas">' +
      enlace(126, 96, 396, 96, dPeriferico + ' km') +
      enlace(430, 130, 430, 208, dHacienda + ' m') +
      enlace(464, 96, 792, 96, circuito + ' a 25 min') +
      enlace(430, 130, 800, 224, 'colindancia con la reserva') +
      nodosSvg +
      '<text class="map__scale" x="18" y="20">Esquema de relaciones y distancias · no a escala cartográfica · ' +
      esc(ctx.coordinates || '') + (minGourmet ? ' · ' + esc(minGourmet) + ' min a circuitos gourmet' : '') + '</text>' +
      '</svg>';
  }

  function zonePanel(zone) {
    if (!zone) {
      return '<div class="map-panel"><p class="viz__hint">Selecciona una zona del polígono para ver su superficie, ' +
        'su uso y la sección del documento de la que proviene.</p></div>';
    }
    return '<div class="map-panel">' +
      '<div class="map-panel__head"><span class="chip chip--mono">Zona ' + zone.num + '</span>' +
      '<span class="chip">§' + esc(zone.section) + ' del documento</span></div>' +
      '<h4 class="map-panel__t">' + esc(zone.title) + '</h4>' +
      '<p class="map-panel__ha"><strong>' + zone.ha.toFixed(2) + ' HA</strong>' +
      (zone.m2 ? ' · ' + zone.m2.toLocaleString('es-MX') + ' m²' : '') + ' · ' +
      ((zone.ha / 10) * 100).toFixed(1) + ' % del polígono</p>' +
      (zone.detail ? '<p class="map-panel__d">' + esc(zone.detail) + '</p>' : '') +
      (zone.items.length ? '<ul class="map-panel__list">' + zone.items.map(function (it) {
        return '<li><strong>' + esc(it.title) + ':</strong> ' + esc(it.detail) + '</li>';
      }).join('') + '</ul>' : '') +
      '</div>';
  }

  function bodyHtml(data, activeKey) {
    if (!data.zones.length) return '<p class="viz__hint">Sin datos de zonificación.</p>';
    var activa = data.zones.filter(function (z) { return z.key === activeKey; })[0] || data.zones[0];
    var cuadra = Math.abs(data.totalHa - data.declaredTotal) < 0.01;

    return '<div class="map-stack">' +
        polygonSvg(data, activa.key) +
        '<div data-map-panel>' + zonePanel(activa) + '</div>' +
      '</div>' +
      '<h4 class="viz__sub">Contexto regional</h4>' +
      contextSvg(data.context) +
      '<p class="viz__note">Fuente: ' + data.source +
        ' · Las 4 zonas suman <strong>' + data.totalHa.toFixed(2) + ' HA</strong>' +
        (data.declaredTotal ? (cuadra ? ', que coincide exactamente con el total declarado en la ficha técnica (' +
          data.declaredTotal.toFixed(2) + ' HA).' : ', mientras la ficha declara ' + data.declaredTotal.toFixed(2) + ' HA.') : '.') +
      '</p>';
  }

  var api = {
    buildZones: buildZones,
    buildContext: buildContext,
    polygonSvg: polygonSvg,
    contextSvg: contextSvg,
    zonePanel: zonePanel,
    bodyHtml: bodyHtml,
    esc: esc,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (global) global.GEMA32_VIZ_MAP = api;
})(typeof window !== 'undefined' ? window : globalThis);
