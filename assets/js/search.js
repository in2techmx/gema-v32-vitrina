/* ==========================================================================
 * GEMA V3.2 — search.js
 * MOD-GEMA32-CONTENT · Buscador de texto completo (AC-02.4)
 *
 * Índice y búsqueda puros (require-able en Node, sin DOM).
 * Búsqueda insensible a acentos y mayúsculas; resultados agrupados por capítulo.
 * ========================================================================== */
(function (global) {
  'use strict';

  function stripAccents(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function normalize(s) {
    return stripAccents(s).toLowerCase();
  }

  function tokensToText(tokens) {
    return (tokens || []).map(function (t) { return (t && typeof t === 'object') ? t.v : t; }).join('');
  }

  /** Texto plano de un bloque, para indexar. */
  function blockText(block) {
    if (!block) return '';
    var parts = [];
    if (block.tokens) parts.push(tokensToText(block.tokens));
    if (block.lines) block.lines.forEach(function (l) { parts.push(tokensToText(l)); });
    if (block.items) block.items.forEach(function (it) {
      if (it.tokens) parts.push(tokensToText(it.tokens));
      if (it.bullets) parts.push(it.bullets.join(' '));
      if (it.title) parts.push(it.title);
      if (it.desc) parts.push(it.desc);
    });
    if (block.headers) block.headers.forEach(function (h) { parts.push(tokensToText(h)); });
    if (block.rows) block.rows.forEach(function (r) {
      r.forEach(function (c) { parts.push(tokensToText(c)); });
    });
    if (block.title) parts.push(block.title);
    if (block.desc) parts.push(block.desc);
    if (block.body) parts.push(block.body);
    if (block.bullets) parts.push(block.bullets.join(' '));
    if (block.mainTitle) parts.push(block.mainTitle);
    if (block.bridgeTitle) parts.push(block.bridgeTitle);
    if (block.bridgeDesc) parts.push(block.bridgeDesc);
    if (block.blocks) block.blocks.forEach(function (b) { parts.push(b.name + ' ' + b.role + ' ' + b.desc); });
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  /** Índice: un registro por capítulo y sección. */
  function buildIndex(chapters) {
    return (chapters || []).map(function (c) {
      var sections = [];
      sections.push({
        num: null,
        title: 'Introducción',
        text: (c.intro || []).map(blockText).join(' '),
      });
      (c.sections || []).forEach(function (s) {
        sections.push({
          num: s.num,
          title: s.title,
          text: (s.blocks || []).map(blockText).join(' '),
        });
      });
      return {
        slug: c.slug,
        num: c.num,
        title: c.title,
        description: c.description || '',
        haystack: normalize(c.title + ' ' + (c.description || '') + ' ' + sections.map(function (s) { return s.title + ' ' + s.text; }).join(' ')),
        sections: sections.map(function (s) {
          return { num: s.num, title: s.title, text: s.text, hay: normalize(s.title + ' ' + s.text) };
        }),
      };
    });
  }

  function snippet(text, q, radius) {
    var r = radius || 90;
    var hay = normalize(text);
    var at = hay.indexOf(q);
    if (at < 0) return text.slice(0, r * 2) + (text.length > r * 2 ? '…' : '');
    var from = Math.max(0, at - r);
    var to = Math.min(text.length, at + q.length + r);
    return (from > 0 ? '…' : '') + text.slice(from, to).trim() + (to < text.length ? '…' : '');
  }

  /**
   * Busca en el índice.
   * @returns {{ total:number, query:string, groups:Array<{slug,num,title,hits:Array<{secNum,secTitle,snippet}>}> }}
   */
  function search(index, query, limitPerGroup) {
    var q = normalize(String(query || '').trim());
    var groups = [];
    var total = 0;
    if (q.length < 2) return { total: 0, query: q, groups: [] };

    var maxHits = limitPerGroup || 3;

    (index || []).forEach(function (ch) {
      var hits = [];
      ch.sections.forEach(function (s) {
        if (hits.length >= maxHits) return;
        if (s.hay.indexOf(q) >= 0) {
          hits.push({ secNum: s.num, secTitle: s.title, snippet: snippet(s.text, q) });
        }
      });
      if (hits.length) {
        total += hits.length;
        groups.push({ slug: ch.slug, num: ch.num, title: ch.title, hits: hits });
      }
    });

    return { total: total, query: q, groups: groups };
  }

  /** Resalta el término dentro de un texto ya escapado, sin romper etiquetas. */
  function highlight(escapedText, query) {
    var q = normalize(String(query || '')).trim();
    if (!q) return escapedText;
    var plain = stripAccents(String(escapedText));
    var out = '';
    var i = 0;
    var lower = plain.toLowerCase();
    while (i < escapedText.length) {
      var at = lower.indexOf(q, i);
      if (at < 0) { out += escapedText.slice(i); break; }
      out += escapedText.slice(i, at) + '<mark>' + escapedText.slice(at, at + q.length) + '</mark>';
      i = at + q.length;
    }
    return out;
  }

  var api = {
    normalize: normalize,
    stripAccents: stripAccents,
    blockText: blockText,
    buildIndex: buildIndex,
    search: search,
    snippet: snippet,
    highlight: highlight,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (global) global.GEMA32_SEARCH = api;
})(typeof window !== 'undefined' ? window : globalThis);
