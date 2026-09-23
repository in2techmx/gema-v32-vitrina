/* ==========================================================================
 * GEMA V3.2 — router.js
 * MOD-GEMA32-SHELL · Navegación direccionable por hash (AC-01.3)
 *
 * Rutas:
 *   ''  o  #/            -> hub de tiles
 *   #/cap-07             -> capítulo 7
 *   #/cap-07/sec-7.3     -> capítulo 7, sección 7.3
 *
 * Núcleo puro (require-able en Node, sin DOM).
 * ========================================================================== */
(function (global) {
  'use strict';

  var HUB = 'hub';
  var CHAPTER = 'chapter';

  function normalizeHash(hash) {
    var h = String(hash == null ? '' : hash).trim();
    if (h.charAt(0) === '#') h = h.slice(1);
    if (h.charAt(0) !== '/') h = '/' + h;
    return h === '/' ? '/' : h.replace(/\/+$/, '');
  }

  /** @returns {{view:string, slug:(string|null), section:(string|null), hash:string}} */
  function parseHash(hash) {
    var h = normalizeHash(hash);
    if (h === '/') return { view: HUB, slug: null, section: null, hash: '#/' };

    var parts = h.split('/').filter(Boolean); // ['cap-07','sec-7.3']
    var slug = parts[0] || null;
    var section = null;

    if (slug && /^sec-/.test(parts[1] || '')) section = String(parts[1]).replace(/^sec-/, '');

    if (!slug || !/^cap-\d{1,2}$/.test(slug)) {
      return { view: HUB, slug: null, section: null, hash: '#/' };
    }
    return {
      view: CHAPTER,
      slug: slug,
      section: section,
      hash: '#/' + slug + (section ? '/sec-' + section : ''),
    };
  }

  function toHubHash() {
    return '#/';
  }

  function toChapterHash(slug, section) {
    var base = '#/' + slug;
    return section ? base + '/sec-' + section : base;
  }

  function chapterNumber(slug) {
    var m = /^cap-(\d{1,2})$/.exec(String(slug || ''));
    return m ? parseInt(m[1], 10) : null;
  }

  function slugFor(num) {
    return 'cap-' + String(num).padStart(2, '0');
  }

  /** Navega al capítulo adyacente (1..total) o devuelve null si no existe. */
  function neighbor(num, delta, total) {
    var n = num + delta;
    if (n < 1 || n > total) return null;
    return slugFor(n);
  }

  var api = {
    HUB: HUB,
    CHAPTER: CHAPTER,
    normalizeHash: normalizeHash,
    parseHash: parseHash,
    toHubHash: toHubHash,
    toChapterHash: toChapterHash,
    chapterNumber: chapterNumber,
    slugFor: slugFor,
    neighbor: neighbor,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (global) global.GEMA32_ROUTER = api;
})(typeof window !== 'undefined' ? window : globalThis);
