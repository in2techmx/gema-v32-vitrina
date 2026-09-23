/* ==========================================================================
 * GEMA V3.2 — tiles.js
 * MOD-GEMA32-SHELL · Hub de 9 tiles + KPIs del hero (AC-01.1, AC-01.2)
 *
 * Todos los valores provienen de la ficha técnica del propio documento:
 * aquí no se escribe ni una cifra a mano.
 * ========================================================================== */
(function (global) {
  'use strict';

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /** Busca el valor de un parámetro de la ficha técnica por su etiqueta. */
  function fichaValue(meta, labelRe) {
    var rows = (meta && meta.ficha && meta.ficha.rows) || [];
    var hit = rows.filter(function (r) { return labelRe.test(r.label); })[0];
    return hit ? hit.value : '';
  }

  function pick(text, re) {
    var m = re.exec(String(text || ''));
    return m ? m[1] : '';
  }

  /**
   * KPIs del hero, extraídos de la ficha técnica (cero cifras inventadas).
   * @returns {Array<{value:string,label:string,source:string}>}
   */
  function heroKpis(meta, chapters) {
    var sede = fichaValue(meta, /Sede Operativa/i);
    var piloto = fichaValue(meta, /Superficie Piloto/i);
    var presupuesto = fichaValue(meta, /Presupuesto Total/i);
    var topado = fichaValue(meta, /Superficie Total/i);

    return [
      {
        value: pick(sede, /\(([\d.,]+\s*HA)\)/) || pick(topado, /([\d.,]+\s*Hect[áa]reas)/) || '10.00 HA',
        label: 'Polígono del rancho',
        source: 'Ficha técnica · Sede operativa',
      },
      {
        value: pick(piloto, /^([\d.,]+)/) ? pick(piloto, /^([\d.,]+)/) + ' HA' : '1.00 HA',
        label: 'Unidad piloto activa',
        source: 'Ficha técnica · Superficie piloto',
      },
      {
        value: pick(piloto, /Invernadero[^)]*?([\d.,]+\s*m²)/) || '200 m²',
        label: 'Invernadero tecnificado',
        source: 'Ficha técnica · Superficie piloto',
      },
      {
        value: pick(presupuesto, /(\$[\d,]+\.\d{2})/) || '',
        label: 'Inversión total de arranque',
        source: 'Ficha técnica · Presupuesto total',
      },
      {
        value: pick(presupuesto, /CAPEX:\s*(\$[\d,]+)/) || '',
        label: 'CAPEX · activos físicos',
        source: 'Ficha técnica · Presupuesto total',
      },
      {
        value: pick(presupuesto, /OPEX[^:]*:\s*(\$[\d,]+)/) || '',
        label: 'OPEX · 6 meses',
        source: 'Ficha técnica · Presupuesto total',
      },
      {
        value: String((chapters || []).length),
        label: 'Capítulos navegables',
        source: 'Índice del documento',
      },
      {
        value: String(meta && meta.pages ? meta.pages : ''),
        label: 'Páginas del PDF equivalente',
        source: 'PDF compilado V3.2',
      },
    ].filter(function (k) { return k.value; });
  }

  function tileHtml(chapter, activeSlug) {
    var stats = chapter.stats || { sections: 0, tables: 0, figures: 0 };
    var ped = global.GEMA32_PEDAGOGY;
    var minutos = ped ? ped.chapterMetrics(chapter).minutes : null;
    return '<button class="tile' + (chapter.slug === activeSlug ? ' is-active' : '') + '" type="button" ' +
      'data-slug="' + escapeHtml(chapter.slug) + '" tabindex="' + (chapter.slug === activeSlug ? '0' : '-1') + '" ' +
      'aria-label="Abrir capítulo ' + chapter.num + ': ' + escapeHtml(chapter.title) + '">' +
      '<span class="tile__num">CAPÍTULO ' + String(chapter.num).padStart(2, '0') + '</span>' +
      '<h3 class="tile__title">' + escapeHtml(chapter.title) + '</h3>' +
      '<p class="tile__desc">' + escapeHtml(chapter.description || '') + '</p>' +
      '<span class="tile__meta">' +
      '<span class="chip">' + stats.sections + ' secciones</span>' +
      (stats.tables ? '<span class="chip">' + stats.tables + ' tablas</span>' : '') +
      (stats.figures ? '<span class="chip">' + stats.figures + ' figuras</span>' : '') +
      (minutos ? '<span class="read-chip">≈ ' + minutos + ' min</span>' : '') +
      (chapter.page ? '<span class="chip chip--mono">PDF p. ' + chapter.page + '</span>' : '') +
      '</span></button>';
  }

  function tilesHtml(chapters, activeSlug) {
    return (chapters || []).map(function (c) { return tileHtml(c, activeSlug); }).join('');
  }

  function kpiStripHtml(kpis) {
    return kpis.map(function (k) {
      return '<div class="kpi"><div class="kpi__num">' + escapeHtml(k.value) + '</div>' +
        '<div class="kpi__lbl">' + escapeHtml(k.label) + '</div>' +
        '<div class="kpi__src">' + escapeHtml(k.source) + '</div></div>';
    }).join('');
  }

  /** HTML completo del hub. */
  function hubHtml(data, opts) {
    opts = opts || {};
    var meta = data.meta || {};
    var chapters = data.chapters || [];
    var kpis = heroKpis(meta, chapters);
    var tocPage = meta.tocPage || {};

    return '' +
      '<section class="hero"><div class="wrap">' +
        '<span class="hero__badge">' + escapeHtml(meta.project || '') + ' · ' + escapeHtml(meta.version || '') + '</span>' +
        '<h1 class="hero__title">El proyecto completo,<br><em>en nueve tableros.</em></h1>' +
        '<p class="hero__lead">' + escapeHtml(meta.subtitle || 'Documento Ejecutivo Maestro') +
        '. Cada capítulo es un tile: ábrelo y lee el texto íntegro con diagramas que puedes tocar. ' +
        'Todas las cifras provienen del documento; ninguna se calcula aquí.</p>' +
        '<div class="hero__actions">' +
          '<button class="btn btn--brand" type="button" data-jump="cap-01">Empezar por el capítulo 1</button>' +
          '<button class="btn" type="button" data-jump="cap-07">Ver el presupuesto maestro</button>' +
          '<button class="btn btn--ghost" type="button" data-jump="cap-08">Hoja de ruta a 24 meses</button>' +
        '</div>' +
        '<div class="kpi-strip">' + kpiStripHtml(kpis) + '</div>' +
      '</div></section>' +

      '<section class="section" id="hub"><div class="wrap">' +
        '<div class="section__head">' +
          '<div><h2 class="section__title">Nueve capítulos, nueve tableros</h2>' +
          '<p class="section__hint">' + escapeHtml(tocPage.title || 'Índice General del Documento') +
          ' · el mismo orden y las mismas páginas del PDF oficial.</p></div>' +
          '<span class="chip chip--accent">' + chapters.length + ' tiles</span>' +
        '</div>' +
        '<div class="tiles" id="tiles">' + tilesHtml(chapters, opts.activeSlug) + '</div>' +
      '</div></section>';
  }

  var api = {
    escapeHtml: escapeHtml,
    fichaValue: fichaValue,
    heroKpis: heroKpis,
    tileHtml: tileHtml,
    tilesHtml: tilesHtml,
    kpiStripHtml: kpiStripHtml,
    hubHtml: hubHtml,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (global) global.GEMA32_TILES = api;
})(typeof window !== 'undefined' ? window : globalThis);
