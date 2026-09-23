/* ==========================================================================
 * GEMA V3.2 — render.js
 * MOD-GEMA32-CONTENT · Render del texto completo del documento (AC-02.1, AC-02.2)
 *
 * Todo el HTML se construye escapando primero el texto: el contenido del
 * documento nunca se interpreta como marcado. Funciones puras (require en Node).
 * ========================================================================== */
(function (global) {
  'use strict';

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Tokens inline -> HTML seguro. */
  function tokensToHtml(tokens) {
    if (!tokens) return '';
    return tokens.map(function (t) {
      if (t == null) return '';
      if (typeof t !== 'object') return escapeHtml(t);
      var v = escapeHtml(t.v);
      switch (t.t) {
        case 'strong': return '<strong>' + v + '</strong>';
        case 'em': return '<em>' + v + '</em>';
        case 'code': return '<code>' + v + '</code>';
        case 'link': {
          var href = String(t.href || '');
          var safe = /^(https?:|mailto:|#|\/)/i.test(href);
          return safe
            ? '<a href="' + escapeHtml(href) + '" rel="noopener noreferrer">' + v + '</a>'
            : v;
        }
        default: return v;
      }
    }).join('');
  }

  function listToHtml(items) {
    var out = '';
    var stack = [];
    var prev = -1;
    (items || []).forEach(function (it) {
      var depth = Math.max(0, Math.min(it.depth || 0, 4));
      if (depth > prev) {
        for (var d = prev + 1; d <= depth; d++) {
          out += it.ordered ? '<ol>' : '<ul>';
          stack.push(!!it.ordered);
        }
      } else if (depth < prev) {
        out += '</li>';
        for (var k = prev; k > depth; k--) out += stack.pop() ? '</ol>' : '</ul>';
      } else if (prev >= 0) {
        out += '</li>';
      }
      out += '<li' + (it.soft ? ' class="li--soft"' : '') + '>' + tokensToHtml(it.tokens);
      prev = depth;
    });
    if (prev >= 0) out += '</li>';
    while (stack.length) out += stack.pop() ? '</ol>' : '</ul>';
    return out;
  }

  function tableToHtml(block) {
    var align = block.align || [];
    var head = '<tr>' + (block.headers || []).map(function (h, i) {
      var a = align[i] || 'left';
      return '<th' + (a !== 'left' ? ' class="is-num"' : '') + '>' + tokensToHtml(h) + '</th>';
    }).join('') + '</tr>';

    var body = (block.rows || []).map(function (r) {
      return '<tr>' + r.map(function (c, i) {
        var a = align[i] || 'left';
        return '<td' + (a !== 'left' ? ' class="is-num"' : '') + '>' + tokensToHtml(c) + '</td>';
      }).join('') + '</tr>';
    }).join('');

    // tabindex=0 + role=region: una región con desplazamiento horizontal debe poder
    // recorrerse con el teclado (WCAG 2.1.1), no solo con el ratón o el trackpad.
    return '<div class="table-wrap"><div class="table-scroll" tabindex="0" role="region" ' +
      'aria-label="Tabla con desplazamiento horizontal">' +
      '<table><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div></div>';
  }

  function blockToHtml(block) {
    if (!block) return '';
    switch (block.type) {
      case 'heading': {
        var lvl = Math.max(3, Math.min(block.level || 3, 5));
        return '<h' + lvl + '>' + tokensToHtml(block.tokens) + '</h' + lvl + '>';
      }
      case 'paragraph':
        return '<p>' + tokensToHtml(block.tokens) + '</p>';

      case 'list':
        return listToHtml(block.items);

      case 'table':
        return tableToHtml(block);

      case 'quote':
        return '<blockquote>' + (block.lines || []).map(function (l) {
          return '<p>' + tokensToHtml(l) + '</p>';
        }).join('') + '</blockquote>';

      case 'hr':
        return '<hr>';

      case 'kpis':
        return '<div class="kpis">' + (block.items || []).map(function (k) {
          return '<div class="kpis__item"><div class="kpis__num">' + escapeHtml(k.value) +
            '</div><div class="kpis__lbl">' + escapeHtml(k.label) + '</div></div>';
        }).join('') + '</div>';

      case 'figures':
        return '<div class="figs">' + (block.items || []).map(function (f) {
          return '<figure class="fig">' +
            '<img src="' + escapeHtml(f.src) + '" alt="' + escapeHtml(f.alt) + '" loading="lazy" decoding="async">' +
            '<figcaption class="fig__cap"><span class="fig__t">' + escapeHtml(f.title) + '</span>' +
            '<span class="fig__n">' + escapeHtml(f.note) + '</span></figcaption></figure>';
        }).join('') + '</div>';

      case 'steps':
        return '<div class="steps-block">' +
          (block.title ? '<div class="steps-block__title">' + escapeHtml(block.title) + '</div>' : '') +
          (block.items || []).map(function (s) {
            return '<div class="step' + (s.isGate ? ' step--gate' : '') + '">' +
              '<div class="step__badge">' + escapeHtml(s.badge) + '</div>' +
              '<div class="step__body"><div class="step__head"><span class="step__t">' + escapeHtml(s.title) + '</span>' +
              (s.tag ? '<span class="step__tag">' + escapeHtml(s.tag) + '</span>' : '') + '</div>' +
              (s.desc ? '<p class="step__desc">' + escapeHtml(s.desc) + '</p>' : '') +
              (s.bullets && s.bullets.length ? '<div class="step__desc"><ul>' + s.bullets.map(function (b) {
                return '<li>' + escapeHtml(b) + '</li>';
              }).join('') + '</ul></div>' : '') +
              '</div></div>';
          }).join('') + '</div>';

      case 'cards':
        return '<div class="cards-block">' +
          (block.title ? '<div class="cards-block__title">' + escapeHtml(block.title) + '</div>' : '') +
          '<div class="cards">' + (block.items || []).map(function (c) {
            return '<div class="card"><div class="card__t">' + escapeHtml(c.title) + '</div>' +
              (c.sub ? '<div class="card__s">' + escapeHtml(c.sub) + '</div>' : '') +
              (c.bullets && c.bullets.length ? '<ul>' + c.bullets.map(function (b) {
                return '<li>' + escapeHtml(b) + '</li>';
              }).join('') + '</ul>' : '') + '</div>';
          }).join('') + '</div></div>';

      case 'callout':
        return '<div class="callout">' +
          (block.title ? '<div class="callout__t">' + escapeHtml(block.title) + '</div>' : '') +
          (block.body ? '<p class="callout__b">' + escapeHtml(block.body) + '</p>' : '') + '</div>';

      case 'org':
        return '<div class="org">' +
          (block.root ? '<div class="org__node org__node--root">' + escapeHtml(block.root) + '</div>' : '') +
          (block.mainTitle ? '<div class="org__node org__node--main"><div class="t">' + escapeHtml(block.mainTitle) +
            '</div>' + (block.mainSub ? '<div class="s">' + escapeHtml(block.mainSub) + '</div>' : '') + '</div>' : '') +
          '<div class="org__row">' + (block.cards || []).map(function (c) {
            return '<div class="card"><div class="card__t">' + escapeHtml(c.title) + '</div>' +
              '<div class="card__s">' + escapeHtml(c.name) + '</div>' +
              (c.bullets && c.bullets.length ? '<ul>' + c.bullets.map(function (b) {
                return '<li>' + escapeHtml(b) + '</li>';
              }).join('') + '</ul>' : '') + '</div>';
          }).join('') + '</div>' +
          (block.bridgeTitle ? '<div class="org__bridge"><div class="t">' + escapeHtml(block.bridgeTitle) + '</div>' +
            '<p class="d">' + escapeHtml(block.bridgeDesc) + '</p></div>' : '') +
          '</div>';

      case 'signatures':
        return '<div class="sigs">' +
          (block.title ? '<h3 class="sigs__title">' + escapeHtml(block.title) + '</h3>' : '') +
          (block.subtitles || []).map(function (s) { return '<div class="sigs__sub">' + escapeHtml(s) + '</div>'; }).join('') +
          '<div class="sigs__grid">' + (block.blocks || []).map(function (b) {
            return '<div class="sig"><div class="sig__line"></div><div class="sig__name">' + escapeHtml(b.name) +
              '</div><div class="sig__role">' + escapeHtml(b.role) + '</div>' +
              '<div class="sig__desc">' + escapeHtml(b.desc) + '</div></div>';
          }).join('') + '</div></div>';

      case 'ficha':
        return '<div class="ficha">' + (block.rows || []).map(function (r) {
          return '<div class="ficha__row"><div class="ficha__k">' + escapeHtml(r.label) + '</div>' +
            '<div class="ficha__v">' + escapeHtml(r.value) + '</div></div>';
        }).join('') + '</div>';

      case 'rawhtml':
        // Reserva honesta: si algún bloque HTML no tiene componente propio,
        // se muestra el texto (sin etiquetas) para no perder contenido.
        return '<div class="raw"><div class="raw__note">Bloque sin componente propio — contenido textual</div>' +
          escapeHtml(String(block.html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()) + '</div>';

      default:
        return '';
    }
  }

  function wrapBlock(html, blockId) {
    if (!html) return '';
    if (!blockId) return html;
    return '<div class="annotatable-block" data-block-id="' + escapeHtml(blockId) + '">' +
      html +
      '<button class="block-comment-btn" type="button" aria-label="Anotar en este bloque" title="Agregar anotación a este bloque" data-comment-target="' + escapeHtml(blockId) + '">' +
        '💬 <span class="comment-count-badge" data-count-for="' + escapeHtml(blockId) + '" hidden>0</span>' +
      '</button>' +
    '</div>';
  }

  function blocksToHtml(blocks, secNum) {
    return (blocks || []).map(function (b, idx) {
      var html = blockToHtml(b);
      if (!html) return '';
      if (!secNum) return html;
      var bId = 'blk-' + secNum + '-' + idx;
      return wrapBlock(html, bId);
    }).join('\n');
  }

  function sectionId(num) {
    return 'sec-' + String(num);
  }

  /** Capítulo completo (texto íntegro) con anclas por sección. */
  function chapterToHtml(chapter) {
    var out = [];
    if (chapter.intro && chapter.intro.length) out.push(blocksToHtml(chapter.intro, chapter.slug + '-intro'));
    (chapter.sections || []).forEach(function (s) {
      out.push('<div class="sec-head" id="' + sectionId(s.num) + '">' +
        '<span class="sec-head__num">' + escapeHtml(s.num) + '</span>' +
        '<h2 class="sec-head__title">' + escapeHtml(s.title) + '</h2></div>');
      out.push(blocksToHtml(s.blocks, 'sec' + s.num));
    });
    return out.join('\n');
  }

  var api = {
    escapeHtml: escapeHtml,
    tokensToHtml: tokensToHtml,
    listToHtml: listToHtml,
    tableToHtml: tableToHtml,
    blockToHtml: blockToHtml,
    wrapBlock: wrapBlock,
    blocksToHtml: blocksToHtml,
    sectionId: sectionId,
    chapterToHtml: chapterToHtml,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (global) global.GEMA32_RENDER = api;
})(typeof window !== 'undefined' ? window : globalThis);
