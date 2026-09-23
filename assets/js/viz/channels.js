/* ==========================================================================
 * GEMA V3.2 — viz/channels.js
 * MOD-GEMA32-VIZ · Explorador de los 7 canales comerciales (AC-03.4)
 *
 * Fuente: capítulo 6 (§6.3). Cada canal con segmento, dinámica y margen.
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

  /**
   * Toma la lista numerada de §6.3: cada elemento de nivel 0 inicia un canal y
   * sus sub-viñetas son los campos (Segmento, Dinámica, Portafolio, ...).
   * @returns {{channels:Array, source:string}}
   */
  function buildChannels(doc) {
    var ch = findChapter(doc, 6);
    var sec = (ch && ch.sections || []).filter(function (s) { return s.num === '6.3'; })[0];
    // El markdown separa cada canal con una línea en blanco, por lo que el
    // generador produce VARIOS bloques de lista: hay que recorrerlos todos.
    var lists = ((sec && sec.blocks) || []).filter(function (b) { return b.type === 'list'; });
    var channels = [];
    var current = null;

    lists.forEach(function (list) {
      (list.items || []).forEach(function (it) {
        var text = tokensText(it.tokens).trim();
        if ((it.depth || 0) === 0) {
          var m = /^Canal\s+(\d+)\s*:\s*(.+)$/i.exec(text);
          if (m) {
            current = { num: parseInt(m[1], 10), title: m[2].trim(), fields: [] };
            channels.push(current);
          }
          return;
        }
        if (!current) return;
        var f = /^([^:]{3,46}):\s*(.+)$/.exec(text);
        if (f) current.fields.push({ label: f[1].trim(), value: f[2].trim() });
      });
    });

    // Los canales de un mismo nivel pueden repetirse entre bloques: se ordenan por número.
    channels.sort(function (a, b) { return a.num - b.num; });

    return {
      channels: channels,
      source: 'Capítulo 6 · §6.3 Desglose de los 7 Canales Comerciales de Venta (Fase Piloto)',
    };
  }

  function detailHtml(channel) {
    if (!channel) return '<div class="chan-detail"><p class="viz__hint">Selecciona un canal para ver su segmento, dinámica y condiciones comerciales.</p></div>';
    return '<div class="chan-detail"><dl>' +
      channel.fields.map(function (f) {
        return '<dt>' + escapeHtml(f.label) + '</dt><dd>' + escapeHtml(f.value) + '</dd>';
      }).join('') +
      '</dl></div>';
  }

  function bodyHtml(data, activeNum) {
    if (!data.channels.length) return '<p class="viz__hint">Sin datos de canales.</p>';
    var active = activeNum || (data.channels[0] && data.channels[0].num);

    var cards = data.channels.map(function (c) {
      var seg = (c.fields.filter(function (f) { return /segmento/i.test(f.label); })[0] || {}).value || '';
      return '<button class="chan" type="button" data-chan="' + c.num + '" aria-pressed="' + (c.num === active ? 'true' : 'false') + '">' +
        '<span class="chan__n">CANAL ' + String(c.num).padStart(2, '0') + '</span>' +
        '<span class="chan__t">' + escapeHtml(c.title) + '</span>' +
        '<span class="chan__d">' + escapeHtml(seg.slice(0, 96)) + (seg.length > 96 ? '…' : '') + '</span>' +
        '</button>';
    }).join('');

    var cur = data.channels.filter(function (c) { return c.num === active; })[0];

    return '<div class="channels">' + cards + '</div>' +
      '<div data-chan-detail>' + detailHtml(cur) + '</div>' +
      '<p class="viz__note">Fuente: ' + data.source + ' · ' + data.channels.length +
      ' canales complementarios. Se muestran literalmente los campos declarados en el documento.</p>';
  }

  var api = { buildChannels: buildChannels, bodyHtml: bodyHtml, detailHtml: detailHtml };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (global) global.GEMA32_VIZ_CHANNELS = api;
})(typeof window !== 'undefined' ? window : globalThis);
