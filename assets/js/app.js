/* ==========================================================================
 * GEMA V3.2 — app.js
 * MOD-GEMA32-SHELL + CONTENT + VIZ · Pegamento de la vitrina.
 *
 * Responsabilidades:
 *   - Pintar el hub de tiles y la vista de capítulo (texto íntegro).
 *   - Router por hash, tema dual, progreso de lectura, buscador, teclado.
 *   - Montar los diagramas dinámicos dentro de sus secciones.
 * ========================================================================== */
(function (global) {
  'use strict';

  var D = global.GEMA32_DATA;
  if (!D) {
    document.addEventListener('DOMContentLoaded', function () {
      var el = document.getElementById('app');
      if (el) el.innerHTML = '<div class="wrap section"><p>No se pudo cargar <code>data/document.data.js</code>. ' +
        'Genera los datos con <code>node scripts/gema-v32-build-data.js</code>.</p></div>';
    });
    return;
  }

  var T = global.GEMA32_THEME;
  var R = global.GEMA32_ROUTER;
  var REN = global.GEMA32_RENDER;
  var TILES = global.GEMA32_TILES;
  var SEARCH = global.GEMA32_SEARCH;

  var index = SEARCH.buildIndex(D.chapters);
  var reduced = false;
  try { reduced = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { }

  var app = document.getElementById('app');
  var searchInput = document.getElementById('search');
  var searchBox = document.getElementById('searchresults');
  var readbar = document.getElementById('readbar');
  var themeBtn = document.getElementById('themeToggle');

  var state = {
    view: 'hub',
    slug: null,
    section: null,
    viz: {
      scenarios: 'normal',
      roadmap: 0,
      channels: null,
      seeds: 'all',
    },
  };

  /* ------------------------------------------------------------------ *
   * Diagramas dinámicos: dónde se montan y con qué datos
   * ------------------------------------------------------------------ */
  var VIZ_MAP = {
    'cap-04': [{ section: '4.1', kind: 'subsidies' }],
    'cap-06': [{ section: '6.3', kind: 'channels' }],
    'cap-07': [
      { section: '7.1', kind: 'budget' },
      { section: '7.8', kind: 'seeds' },
      { section: '7.11', kind: 'scenarios' },
    ],
    'cap-08': [{ section: '8.1', kind: 'roadmap' }],
  };

  var VIZ_META = {
    subsidies: { title: 'Apoyos por nivel de gobierno', hint: 'Tres órdenes de gobierno y su matriz de gestión' },
    channels: { title: 'Los 7 canales comerciales', hint: 'Toca un canal para ver su dinámica y su margen' },
    budget: { title: 'Presupuesto maestro en una mirada', hint: 'Rubros A–F, corte CAPEX / OPEX y participación' },
    seeds: { title: 'Catálogo de semillas con validación', hint: 'Filtra por proveedor; los subtotales deben cuadrar' },
    scenarios: { title: 'Tres escenarios financieros a 12 meses', hint: 'Cambia de escenario y compara la caja mes a mes' },
    roadmap: { title: 'Hoja de ruta a 24 meses', hint: 'Etapas y Decision Gates con sus meses reales' },
  };

  var vizCache = {};

  function buildVizData(kind) {
    if (vizCache[kind]) return vizCache[kind];
    var mods = {
      subsidies: global.GEMA32_VIZ_SUBSIDIES,
      channels: global.GEMA32_VIZ_CHANNELS,
      budget: global.GEMA32_VIZ_BUDGET,
      seeds: global.GEMA32_VIZ_SEEDS,
      scenarios: global.GEMA32_VIZ_SCENARIOS,
      roadmap: global.GEMA32_VIZ_ROADMAP,
    };
    var builders = {
      subsidies: function (m) { return m.buildSubsidies(D); },
      channels: function (m) { return m.buildChannels(D); },
      budget: function (m) { return m.buildBudget(D); },
      seeds: function (m) { return m.buildSeeds(D); },
      scenarios: function (m) { return m.buildScenarios(D); },
      roadmap: function (m) { return m.buildRoadmap(D); },
    };
    var m = mods[kind];
    if (!m) return null;
    vizCache[kind] = builders[kind](m);
    return vizCache[kind];
  }

  function vizShellHtml(kind, inner) {
    var meta = VIZ_META[kind] || { title: kind, hint: '' };
    var seg = '';
    if (kind === 'scenarios') {
      var s = buildVizData('scenarios');
      seg = global.GEMA32_VIZ_SCENARIOS.segHtml(s, state.viz.scenarios);
    }
    return '<div class="viz" data-viz="' + kind + '">' +
      '<div class="viz__head"><div><h3 class="viz__title">' + meta.title + '</h3>' +
      '<p class="viz__hint">' + meta.hint + '</p></div>' + seg + '</div>' +
      '<div class="viz__body" data-viz-body>' + inner + '</div></div>';
  }

  function renderVizBody(kind) {
    var data = buildVizData(kind);
    if (!data) return '<p class="viz__hint">Componente no disponible.</p>';
    switch (kind) {
      case 'subsidies': return global.GEMA32_VIZ_SUBSIDIES.bodyHtml(data);
      case 'channels': return global.GEMA32_VIZ_CHANNELS.bodyHtml(data, state.viz.channels);
      case 'budget': return global.GEMA32_VIZ_BUDGET.bodyHtml(data);
      case 'seeds': return global.GEMA32_VIZ_SEEDS.bodyHtml(data, state.viz.seeds);
      case 'scenarios': return global.GEMA32_VIZ_SCENARIOS.bodyHtml(data, state.viz.scenarios);
      case 'roadmap': return global.GEMA32_VIZ_ROADMAP.bodyHtml(data, state.viz.roadmap);
      default: return '';
    }
  }

  function refreshViz(kind) {
    var host = app.querySelector('[data-viz="' + kind + '"] [data-viz-body]');
    if (!host) return;
    host.innerHTML = renderVizBody(kind);
    animateBars(host);
  }

  function animateBars(scope) {
    var fills = (scope || app).querySelectorAll('.bar__fill[data-w]');
    Array.prototype.forEach.call(fills, function (f, i) {
      var w = f.getAttribute('data-w') + '%';
      if (reduced) { f.style.width = w; return; }
      setTimeout(function () { f.style.width = w; }, 40 * i);
    });
  }

  /* ------------------------------------------------------------------ *
   * Vistas
   * ------------------------------------------------------------------ */
  function renderHub() {
    state.view = 'hub';
    app.innerHTML = TILES.hubHtml(D, { activeSlug: state.slug });
    bindTiles();
    bindJump();
    reveal();
    updateThemeBtn();
    document.title = (D.meta.project || 'Gema Agroecología') + ' · ' + (D.meta.version || '') + ' — Vitrina interactiva';
  }

  function sectionBlocksHtml(chapter, sectionNum) {
    var secs = (chapter.sections || []).filter(function (s) { return s.num === sectionNum; });
    if (!secs.length) return '';
    return REN.blocksToHtml(secs[0].blocks);
  }

  function chapterWithVizHtml(chapter) {
    var out = [];
    if (chapter.intro && chapter.intro.length) out.push(REN.blocksToHtml(chapter.intro));

    (chapter.sections || []).forEach(function (s) {
      out.push('<div class="sec-head" id="' + REN.sectionId(s.num) + '">' +
        '<span class="sec-head__num">' + TILES.escapeHtml(s.num) + '</span>' +
        '<h2 class="sec-head__title">' + TILES.escapeHtml(s.title) + '</h2></div>');
      out.push(REN.blocksToHtml(s.blocks));

      var extras = (VIZ_MAP[chapter.slug] || []).filter(function (v) { return v.section === s.num; });
      extras.forEach(function (v) {
        out.push(vizShellHtml(v.kind, renderVizBody(v.kind)));
      });
    });
    return out.join('\n');
  }

  function renderChapter(slug, section) {
    var chapter = D.chapters.filter(function (c) { return c.slug === slug; })[0];
    if (!chapter) { location.hash = R.toHubHash(); return; }

    state.view = 'chapter';
    state.slug = slug;
    state.section = section || null;

    var prev = R.neighbor(chapter.num, -1, D.chapters.length);
    var next = R.neighbor(chapter.num, 1, D.chapters.length);
    var prevC = prev ? D.chapters.filter(function (c) { return c.slug === prev; })[0] : null;
    var nextC = next ? D.chapters.filter(function (c) { return c.slug === next; })[0] : null;

    app.innerHTML = '' +
      '<article class="chapter" tabindex="-1" id="chapterRoot"><div class="wrap">' +
        '<button class="btn btn--ghost" type="button" data-back>&larr; Volver al hub de tiles</button>' +
        '<header class="chapter__head">' +
          '<div class="chapter__eyebrow">Capítulo ' + String(chapter.num).padStart(2, '0') +
            (chapter.page ? ' · PDF pág. ' + chapter.page : '') + '</div>' +
          '<h1 class="chapter__title">' + TILES.escapeHtml(chapter.title) + '</h1>' +
          '<p class="chapter__desc">' + TILES.escapeHtml(chapter.description || '') + '</p>' +
          '<div class="tile__meta">' +
            '<span class="chip">' + chapter.sections.length + ' secciones</span>' +
            '<span class="chip">' + chapter.stats.tables + ' tablas</span>' +
            (chapter.stats.figures ? '<span class="chip">' + chapter.stats.figures + ' figuras</span>' : '') +
            '<span class="chip chip--mono">' + chapter.stats.words.toLocaleString('es-MX') + ' palabras</span>' +
          '</div>' +
        '</header>' +
        '<div class="chapter__layout">' +
          '<div class="doc" id="doc">' + chapterWithVizHtml(chapter) + '</div>' +
          '<aside class="toc-side"><p class="toc-side__title">Secciones del capítulo</p>' +
            '<ul class="toc-side__list">' + chapter.sections.map(function (s) {
              return '<li><a class="toc-side__link" href="#/' + chapter.slug + '/sec-' + s.num + '" data-sec="' + s.num + '">' +
                '<span class="toc-side__num">' + s.num + '</span><span>' + TILES.escapeHtml(s.title) + '</span></a></li>';
            }).join('') + '</ul></aside>' +
        '</div>' +
        '<nav class="chapter__nav">' +
          '<a class="navcard' + (prevC ? '' : ' is-disabled') + '" href="' + (prevC ? '#/' + prevC.slug : '#/') + '">' +
            '<div class="navcard__lbl">&larr; Anterior</div><div class="navcard__t">' +
            (prevC ? TILES.escapeHtml(prevC.title) : 'Inicio') + '</div></a>' +
          '<a class="navcard navcard--next' + (nextC ? '' : ' is-disabled') + '" href="' + (nextC ? '#/' + nextC.slug : '#/') + '">' +
            '<div class="navcard__lbl">Siguiente &rarr;</div><div class="navcard__t">' +
            (nextC ? TILES.escapeHtml(nextC.title) : 'Fin del documento') + '</div></a>' +
        '</nav>' +
      '</div></article>';

    bindChapter(chapter);
    animateBars(app);
    updateThemeBtn();
    document.title = 'Cap. ' + chapter.num + ' · ' + chapter.title + ' — ' + (D.meta.project || '');
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });

    if (section) {
      var target = document.getElementById(REN.sectionId(section));
      if (target) setTimeout(function () {
        target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      }, 60);
    }
    var root = document.getElementById('chapterRoot');
    if (root) root.focus({ preventScroll: true });
    observeSections();
  }

  /* ------------------------------------------------------------------ *
   * Interacciones
   * ------------------------------------------------------------------ */
  function bindTiles() {
    var tiles = Array.prototype.slice.call(app.querySelectorAll('.tile'));
    tiles.forEach(function (tile, i) {
      tile.addEventListener('click', function () {
        location.hash = R.toChapterHash(tile.getAttribute('data-slug'));
      });
      tile.addEventListener('keydown', function (ev) {
        var cols = window.innerWidth > 1080 ? 3 : (window.innerWidth > 680 ? 2 : 1);
        var to = null;
        if (ev.key === 'ArrowRight') to = i + 1;
        else if (ev.key === 'ArrowLeft') to = i - 1;
        else if (ev.key === 'ArrowDown') to = i + cols;
        else if (ev.key === 'ArrowUp') to = i - cols;
        else if (ev.key === 'Home') to = 0;
        else if (ev.key === 'End') to = tiles.length - 1;
        if (to === null) return;
        ev.preventDefault();
        var t = tiles[Math.max(0, Math.min(to, tiles.length - 1))];
        if (t) { tiles.forEach(function (x) { x.setAttribute('tabindex', '-1'); }); t.setAttribute('tabindex', '0'); t.focus(); }
      });
    });
  }

  function bindJump() {
    Array.prototype.forEach.call(app.querySelectorAll('[data-jump]'), function (b) {
      b.addEventListener('click', function () { location.hash = R.toChapterHash(b.getAttribute('data-jump')); });
    });
  }

  function bindChapter(chapter) {
    var back = app.querySelector('[data-back]');
    if (back) back.addEventListener('click', function () { location.hash = R.toHubHash(); });

    Array.prototype.forEach.call(app.querySelectorAll('.toc-side__link'), function (a) {
      a.addEventListener('click', function (ev) {
        ev.preventDefault();
        var num = a.getAttribute('data-sec');
        var el = document.getElementById(REN.sectionId(num));
        if (el) el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
        history.replaceState(null, '', R.toChapterHash(chapter.slug, num));
        markCurrentSection(num);
      });
    });

    // Escenarios: cambio de pestaña
    Array.prototype.forEach.call(app.querySelectorAll('[data-seg="scenarios"] .seg__btn'), function (b) {
      b.addEventListener('click', function () {
        state.viz.scenarios = b.getAttribute('data-scen');
        Array.prototype.forEach.call(app.querySelectorAll('[data-seg="scenarios"] .seg__btn'), function (x) {
          x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
        });
        refreshViz('scenarios');
      });
    });

    // Roadmap: selección de nodo
    Array.prototype.forEach.call(app.querySelectorAll('.tl-node'), function (b) {
      b.addEventListener('click', function () {
        state.viz.roadmap = parseInt(b.getAttribute('data-idx'), 10) || 0;
        var data = buildVizData('roadmap');
        Array.prototype.forEach.call(app.querySelectorAll('.tl-node'), function (x) {
          x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
        });
        var host = app.querySelector('[data-tl-detail]');
        if (host) host.innerHTML = global.GEMA32_VIZ_ROADMAP.detailHtml(data.nodes[state.viz.roadmap]);
      });
    });

    // Canales: selección
    Array.prototype.forEach.call(app.querySelectorAll('.chan'), function (b) {
      b.addEventListener('click', function () {
        state.viz.channels = parseInt(b.getAttribute('data-chan'), 10);
        var data = buildVizData('channels');
        Array.prototype.forEach.call(app.querySelectorAll('.chan'), function (x) {
          x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
        });
        var host = app.querySelector('[data-chan-detail]');
        var cur = data.channels.filter(function (c) { return c.num === state.viz.channels; })[0];
        if (host) host.innerHTML = global.GEMA32_VIZ_CHANNELS.detailHtml(cur);
      });
    });

    // Semillas: filtro por proveedor
    Array.prototype.forEach.call(app.querySelectorAll('[data-prov]'), function (b) {
      b.addEventListener('click', function () {
        state.viz.seeds = b.getAttribute('data-prov');
        Array.prototype.forEach.call(app.querySelectorAll('[data-prov]'), function (x) {
          x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
        });
        refreshViz('seeds');
      });
    });
  }

  function markCurrentSection(num) {
    Array.prototype.forEach.call(app.querySelectorAll('.toc-side__link'), function (a) {
      a.classList.toggle('is-current', a.getAttribute('data-sec') === num);
    });
  }

  var lastSection = null;
  function observeSections() {
    var heads = Array.prototype.slice.call(app.querySelectorAll('.sec-head'));
    if (!heads.length || !global.IntersectionObserver) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          var num = (e.target.id || '').replace('sec-', '');
          if (num && num !== lastSection) { lastSection = num; markCurrentSection(num); }
        }
      });
    }, { rootMargin: '-25% 0px -65% 0px', threshold: 0 });
    heads.forEach(function (h) { io.observe(h); });
  }

  function reveal() {
    var items = app.querySelectorAll('.tile, .kpi');
    if (reduced || !global.IntersectionObserver) {
      Array.prototype.forEach.call(items, function (i) { i.classList.add('is-in'); });
      return;
    }
    Array.prototype.forEach.call(items, function (el, i) {
      el.classList.add('reveal');
      setTimeout(function () { el.classList.add('is-in'); }, 45 * i);
    });
  }

  function updateThemeBtn() {
    if (!themeBtn) return;
    var t = T.get();
    themeBtn.textContent = t === 'dark' ? 'Tema claro' : 'Tema oscuro';
    themeBtn.setAttribute('aria-label', 'Cambiar a tema ' + (t === 'dark' ? 'claro' : 'oscuro'));
  }

  /* ------------------------------------------------------------------ *
   * Buscador
   * ------------------------------------------------------------------ */
  function renderSearch(q) {
    if (!searchBox) return;
    var res = SEARCH.search(index, q, 3);
    if (!q || q.trim().length < 2) { searchBox.hidden = true; searchBox.innerHTML = ''; return; }
    if (!res.total) {
      searchBox.hidden = false;
      searchBox.innerHTML = '<div class="searchresults__empty">Sin coincidencias para «' + TILES.escapeHtml(q) + '» en los 9 capítulos.</div>';
      return;
    }
    searchBox.hidden = false;
    searchBox.innerHTML = '<div class="searchresults__group"><div class="searchresults__gtitle">' + res.total +
      ' coincidencia(s) en ' + res.groups.length + ' capítulo(s)</div></div>' +
      res.groups.map(function (g) {
        return '<div class="searchresults__group"><div class="searchresults__gtitle">Capítulo ' + g.num + ' · ' +
          TILES.escapeHtml(g.title) + '</div>' +
          g.hits.map(function (h) {
            var label = h.secNum ? h.secNum + ' · ' + h.secTitle : h.secTitle;
            var href = '#/' + g.slug + (h.secNum ? '/sec-' + h.secNum : '');
            return '<a class="searchresults__hit" href="' + href + '">' +
              SEARCH.highlight(TILES.escapeHtml(label), q) + '<br>' +
              SEARCH.highlight(TILES.escapeHtml(h.snippet), q) + '</a>';
          }).join('') + '</div>';
      }).join('');
  }

  /* ------------------------------------------------------------------ *
   * Arranque
   * ------------------------------------------------------------------ */
  function onRoute() {
    var r = R.parseHash(location.hash);
    state.slug = r.slug;
    if (r.view === R.CHAPTER) renderChapter(r.slug, r.section);
    else renderHub();
    if (searchBox) { searchBox.hidden = true; searchBox.innerHTML = ''; }
  }

  function init() {
    T.init();
    if (themeBtn) themeBtn.addEventListener('click', function () { T.toggle(); updateThemeBtn(); });

    if (searchInput) {
      var t = null;
      searchInput.addEventListener('input', function () {
        clearTimeout(t);
        var v = searchInput.value;
        t = setTimeout(function () { renderSearch(v); }, 120);
      });
      searchInput.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape') { searchInput.value = ''; renderSearch(''); searchInput.blur(); }
      });
      document.addEventListener('click', function (ev) {
        if (searchBox && !searchBox.hidden && !ev.target.closest('.searchbox') && !ev.target.closest('.searchresults')) {
          searchBox.hidden = true;
        }
      });
    }

    window.addEventListener('hashchange', onRoute);
    window.addEventListener('scroll', function () {
      if (!readbar) return;
      var h = document.documentElement.scrollHeight - window.innerHeight;
      readbar.style.width = (h > 0 ? Math.min(100, (window.scrollY / h) * 100) : 0) + '%';
    }, { passive: true });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && state.view === 'chapter' && !ev.target.closest('input')) location.hash = R.toHubHash();
    });

    onRoute();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  global.GEMA32_APP = { state: state, onRoute: onRoute, renderVizBody: renderVizBody, buildVizData: buildVizData };
})(typeof window !== 'undefined' ? window : globalThis);
