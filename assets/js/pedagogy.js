/* ==========================================================================
 * GEMA V3.2 — pedagogy.js
 * MOD-GEMA32-PEDAGOGY · Capa pedagógica (AC-08)
 *
 *   - Glosario construido con DEFINICIONES TOMADAS DEL PROPIO DOCUMENTO
 *     (nunca redactadas por la vitrina): se extraen los elementos de lista con
 *     la forma «Término: descripción» y se conserva la sección de origen.
 *   - Tiempo de lectura por capítulo, calculado de su número real de palabras.
 *   - Atajos de teclado, declarados aquí para que la interfaz y las pruebas
 *     compartan una única fuente de verdad.
 * ========================================================================== */
(function (global) {
  'use strict';

  var PALABRAS_POR_MINUTO = 200;

  function tokensText(tokens) {
    return (tokens || []).map(function (t) { return (t && typeof t === 'object') ? t.v : t; }).join('');
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /** Términos que NO son conceptos explicables (personas, cargos, programas con nombre propio). */
  var EXCLUIR = /^(arturo|gema|don |argos|dr\.|lic\.)/i;

  /**
   * Etiquetas ESTRUCTURALES del documento: son encabezados de apartado, no conceptos.
   * Sin este filtro el glosario se llena de ruido («Alcance y Funciones», «Aplicación»…).
   */
  var ESTRUCTURAL = new RegExp('^(' + [
    'alcance', 'mec[aá]nica', 'aplicaci[oó]n', 'justificaci[oó]n', 'nota', 'descripci[oó]n',
    'objetivo', 'mecanismo', 'impacto', 'resultado', 'criterio', 'uso', 'funci[oó]n', 'funciones',
    'ventaja', 'din[aá]mica', 'portafolio', 'segmento', 'estrategia', 'prop[oó]sito', 'control',
    'ejecutor', 'ejecutores', 'instrumento', 'conceptos', 'beneficio', 'c[aá]lculo', 'f[oó]rmula',
    'fecha', 'costo', 'precio', 'total', 'subtotal', 'cantidad', 'unidad', 'c[oó]digo', 'partida',
    'hito', 'rubro', 'estatus', 'modalidad', 'tipo', 'monto', 'plazo', 'riesgo', 'supuesto',
    'modo', 'forma', 'proceso', 'paso', 'resumen', 's[ií]ntesis', 'contexto', 'marco', 'conclusi[oó]n',
    'recomendaci[oó]n', 'observaci[oó]n', 'comentario', 'detalle', 'ejemplo', 'caso', 'prueba',
    'dato', 'cifra', 'meta', 'indicador', 'kpi', 'insumo', 'producto', 'servicio', 'cliente',
    'canal', 'precio', 'venta', 'compra', 'pago', 'cobro', 'gasto', 'ingreso', 'utilidad',
  ].join('|') + ')\\b', 'i');

  /** Cota del glosario: se conservan los términos más presentes en el documento. */
  var MAX_TERMINOS = 60;

  /**
   * Glosario del documento.
   *
   * Solo entran términos que el documento define explícitamente («Término: descripción»)
   * y que superan el filtro de ruido estructural. La definición se conserva literal.
   *
   * @param {object} doc  documento generado
   * @param {string} [markdown]  fuente, para puntuar por frecuencia real de uso
   * @returns {Array<{term:string, definition:string, section:string, chapter:number}>}
   */
  function buildGlossary(doc, markdown) {
    var vistos = {};
    var out = [];
    var fuente = String(markdown || '').toLowerCase();

    var considerar = function (texto, secNum, capNum) {
      var m = /^([A-ZÁÉÍÓÚÑ][^:]{2,44}):\s*(.{25,260})$/.exec(String(texto).trim());
      if (!m) return;
      var term = m[1].replace(/\*/g, '').trim();
      var def = m[2].replace(/\*/g, '').trim();
      var clave = term.toLowerCase();
      if (vistos[clave]) return;
      if (EXCLUIR.test(term) || ESTRUCTURAL.test(term)) return;
      if (term.split(/\s+/).length > 5) return;          // las definiciones largas son apartados, no términos
      if (/^[\d\s.,%-]+$/.test(term)) return;
      if (def.length < 25) return;
      vistos[clave] = true;
      out.push({
        term: term,
        definition: def,
        section: secNum,
        chapter: capNum,
        // Frecuencia de uso en el documento: sirve para priorizar el glosario
        usos: fuente ? fuente.split(term.toLowerCase()).length - 1 : 0,
      });
    };

    (doc.chapters || []).forEach(function (ch) {
      (ch.sections || []).forEach(function (sec) {
        (sec.blocks || []).forEach(function (b) {
          if (b.type === 'list') {
            (b.items || []).forEach(function (it) {
              if ((it.depth || 0) !== 0) return;
              considerar(tokensText(it.tokens), sec.num, ch.num);
            });
          }
          if (b.type === 'steps' || b.type === 'cards') {
            (b.items || []).forEach(function (it) {
              (it.bullets || []).forEach(function (bl) { considerar(bl, sec.num, ch.num); });
            });
          }
        });
      });
    });

    // Se conservan los términos más usados del documento y se ordenan alfabéticamente.
    var priorizados = out.slice().sort(function (a, b) {
      if (b.usos !== a.usos) return b.usos - a.usos;
      return a.term.localeCompare(b.term, 'es');
    }).slice(0, MAX_TERMINOS);

    return priorizados.sort(function (a, b) { return a.term.localeCompare(b.term, 'es'); });
  }

  /** Minutos de lectura a 200 palabras por minuto (mínimo 1). */
  function readingTime(words) {
    return Math.max(1, Math.round(Number(words || 0) / PALABRAS_POR_MINUTO));
  }

  function chapterMetrics(chapter) {
    var stats = (chapter && chapter.stats) || { words: 0, sections: 0 };
    return {
      words: stats.words || 0,
      sections: (chapter && chapter.sections ? chapter.sections.length : 0),
      minutes: readingTime(stats.words || 0),
      tables: stats.tables || 0,
      figures: stats.figures || 0,
    };
  }

  var SHORTCUTS = [
    { keys: '/', action: 'Buscar en los 9 capítulos' },
    { keys: 'T', action: 'Cambiar entre tema claro y oscuro' },
    { keys: 'G', action: 'Volver al hub de tiles' },
    { keys: 'N / P', action: 'Capítulo siguiente / anterior' },
    { keys: '← → ↑ ↓', action: 'Recorrer los tiles (y Enter para abrir)' },
    { keys: '?', action: 'Mostrar u ocultar esta ayuda' },
    { keys: 'Esc', action: 'Cerrar la ayuda, la búsqueda o volver al hub' },
    { keys: 'Espacio / AvPág', action: 'Avanzar por el capítulo' },
  ];

  /** Panel de ayuda con los atajos. */
  function shortcutsHtml() {
    return SHORTCUTS.map(function (s) {
      return '<div class="sc-row"><kbd class="sc-key">' + esc(s.keys) + '</kbd><span class="sc-desc">' + esc(s.action) + '</span></div>';
    }).join('');
  }

  /** Glosario en formato de panel, agrupado por capítulo. */
  function glossaryHtml(glossary) {
    if (!glossary || !glossary.length) return '<p class="viz__hint">Sin términos definidos en el documento.</p>';
    var porCapitulo = {};
    glossary.forEach(function (g) { (porCapitulo[g.chapter] = porCapitulo[g.chapter] || []).push(g); });
    return Object.keys(porCapitulo).sort(function (a, b) { return a - b; }).map(function (cap) {
      return '<section class="gl-chapter"><h4 class="gl-chapter__t">Capítulo ' + cap + '</h4>' +
        '<dl class="gl-list">' + porCapitulo[cap].map(function (g) {
          return '<dt id="gl-' + esc(g.term.toLowerCase().replace(/[^a-z0-9]+/g, '-')) + '">' + esc(g.term) +
            '<span class="gl-src">§' + esc(g.section) + '</span></dt>' +
            '<dd>' + esc(g.definition) + '</dd>';
        }).join('') + '</dl></section>';
    }).join('');
  }

  /**
   * Envuelve la primera aparición de cada término del glosario dentro de un
   * contenedor, para ofrecer su definición al pasar el cursor o enfocar.
   * Se ejecuta sobre el DOM ya renderizado y NO introduce texto nuevo.
   */
  function annotate(root, glossary) {
    if (!root || !glossary || !glossary.length) return 0;
    var marcados = 0;
    glossary.forEach(function (g) {
      if (marcados >= 60) return; // cota: no convertir el texto en un campo de tooltips
      var objetivo = g.term.split('(')[0].trim();
      if (objetivo.length < 4) return;
      walkText(root, function (nodo) {
        if (nodo.parentElement && nodo.parentElement.closest('.gloss, code, pre, .sec-head, .table-wrap, .viz, kbd')) return false;
        var i = nodo.nodeValue.toLowerCase().indexOf(objetivo.toLowerCase());
        if (i < 0) return false;
        var antes = nodo.nodeValue.slice(0, i);
        var medio = nodo.nodeValue.slice(i, i + objetivo.length);
        var despues = nodo.nodeValue.slice(i + objetivo.length);
        var span = document.createElement('span');
        span.className = 'gloss';
        span.setAttribute('tabindex', '0');
        span.setAttribute('role', 'note');
        span.setAttribute('data-term', g.term);
        span.setAttribute('aria-label', g.term + ': ' + g.definition + ' (§' + g.section + ')');
        span.textContent = medio;
        var tip = document.createElement('span');
        tip.className = 'gloss__tip';
        tip.setAttribute('aria-hidden', 'true');
        tip.textContent = g.definition + ' — §' + g.section;
        span.appendChild(tip);
        var frag = document.createDocumentFragment();
        if (antes) frag.appendChild(document.createTextNode(antes));
        frag.appendChild(span);
        if (despues) frag.appendChild(document.createTextNode(despues));
        nodo.parentNode.replaceChild(frag, nodo);
        marcados++;
        return true; // una aparición por término
      });
    });
    return marcados;
  }

  function walkText(root, visitar) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodo;
    var pendientes = [];
    while ((nodo = walker.nextNode())) pendientes.push(nodo);
    for (var i = 0; i < pendientes.length; i++) {
      if (visitar(pendientes[i])) return;
    }
  }

  var api = {
    PALABRAS_POR_MINUTO: PALABRAS_POR_MINUTO,
    buildGlossary: buildGlossary,
    readingTime: readingTime,
    chapterMetrics: chapterMetrics,
    SHORTCUTS: SHORTCUTS,
    shortcutsHtml: shortcutsHtml,
    glossaryHtml: glossaryHtml,
    annotate: annotate,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (global) global.GEMA32_PEDAGOGY = api;
})(typeof window !== 'undefined' ? window : globalThis);
