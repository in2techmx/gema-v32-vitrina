/* ==========================================================================
 * GEMA V3.2 — comments.js
 * Módulo de Anotaciones, Revisiones por Bloque, Filtros de Socios
 * y Exportación Editorial a PDF / JSON (IN2TECHMX).
 * ========================================================================== */
(function (global) {
  'use strict';

  var STORAGE_KEY_COMMENTS = 'gema32.comments';
  var STORAGE_KEY_VERSION = 'gema32.comments_clean_v1';

  // Filtros activos por socio (por defecto todos activos)
  var activeFilters = {
    'arturo-a': true,
    'arturo-b': true,
    'gema': true,
    'guest': true
  };

  // Bloque actualmente enfocado (null = ver todas)
  var currentTarget = null; // { blockId, sectionNum, sectionTitle, chapterSlug, chapterTitle, quote }

  // ID de la nota en edición inline (null = ninguna)
  var editingCommentId = null;

  function getComments() {
    var list = [];
    try {
      // Si es la primera vez con la versión limpia, reiniciar localStorage
      if (!localStorage.getItem(STORAGE_KEY_VERSION)) {
        localStorage.removeItem(STORAGE_KEY_COMMENTS);
        localStorage.setItem(STORAGE_KEY_VERSION, 'clean');
      }
      var raw = localStorage.getItem(STORAGE_KEY_COMMENTS);
      if (raw) {
        list = JSON.parse(raw);
      }
    } catch (e) {
      list = [];
    }

    if (!list || !list.length) {
      if (global.GEMA_COMMENTS_DATA && Array.isArray(global.GEMA_COMMENTS_DATA) && global.GEMA_COMMENTS_DATA.length) {
        list = global.GEMA_COMMENTS_DATA.slice();
        saveComments(list);
      }
    }
    return list || [];
  }

  function isArturoArnaiz(user) {
    if (!user) return false;
    if (global.GEMA_AUTH && typeof global.GEMA_AUTH.isArturoArnaiz === 'function') {
      return global.GEMA_AUTH.isArturoArnaiz(user);
    }
    var k = (user.key || user.authorKey || '').toLowerCase();
    var em = (user.email || '').toLowerCase();
    var alias = (user.aliasEmail || '').toLowerCase();
    var n = (user.name || '').toLowerCase();
    return k === 'arturo-a' ||
           em === 'in2techmx@gmail.com' ||
           em === 'arnaiz.art@gmail.com' ||
           alias === 'in2techmx@gmail.com' ||
           alias === 'arnaiz.art@gmail.com' ||
           n.indexOf('arnaiz') >= 0;
  }

  function canEditOrDeleteComment(user, c) {
    if (!user || !c) return false;
    if (isArturoArnaiz(user)) return true;
    var userKey = (user.key || '').toLowerCase();
    var authorKey = (c.authorKey || '').toLowerCase();
    if (userKey && authorKey && userKey === authorKey) return true;
    var userEmail = (user.email || '').toLowerCase();
    var authorEmail = (c.authorEmail || '').toLowerCase();
    if (userEmail && authorEmail && userEmail === authorEmail) return true;
    var userAlias = (user.aliasEmail || '').toLowerCase();
    if (userAlias && authorEmail && userAlias === authorEmail) return true;
    return false;
  }

  function clearAllComments() {
    saveComments([]);
    renderDrawerMarkup();
  }

  function saveComments(list) {
    try {
      localStorage.setItem(STORAGE_KEY_COMMENTS, JSON.stringify(list));
    } catch (e) {
      console.warn('No se pudo guardar en localStorage:', e.message);
    }
    updateDocumentBadges();
    renderCommentsList();
  }

  function formatNow() {
    var now = new Date();
    var d = String(now.getDate()).padStart(2, '0');
    var m = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][now.getMonth()];
    var y = now.getFullYear();
    var hr = String(now.getHours()).padStart(2, '0');
    var min = String(now.getMinutes()).padStart(2, '0');
    return d + ' ' + m + ' ' + y + ', ' + hr + ':' + min;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ------------------------------------------------------------------ *
   * Renderizado del Cajón de Comentarios
   * ------------------------------------------------------------------ */
  function renderDrawerMarkup() {
    var drawer = document.getElementById('commentsDrawer');
    if (!drawer) return;

    var currentUser = (global.GEMA_AUTH && global.GEMA_AUTH.getUser) ? global.GEMA_AUTH.getUser() : {
      name: 'Arturo Arnaiz',
      role: 'Dirección de Negocios',
      avatarColor: 'arturo-a',
      key: 'arturo-a'
    };

    var isMaster = isArturoArnaiz(currentUser);

    var masterBannerHtml = isMaster
      ? '<div class="master-clear-banner" style="background:rgba(239,68,68,0.12); border:1.5px solid #ef4444; border-radius:8px; padding:10px 12px; margin:10px 12px 6px; display:flex; align-items:center; justify-content:space-between; gap:10px;">' +
          '<div style="min-width:0;">' +
            '<div style="font-weight:700; font-size:12px; color:#f87171; display:flex; align-items:center; gap:6px;">' +
              '<span>👑 Control Master — Arturo Arnaiz</span>' +
            '</div>' +
            '<div style="font-size:11px; color:var(--text-2); margin-top:2px;">Purga total de notas para comenzar de cero.</div>' +
          '</div>' +
          '<button type="button" id="masterDrawerClearBtn" style="background:#dc2626; color:#ffffff; font-weight:700; border:none; padding:7px 12px; border-radius:6px; font-size:11px; cursor:pointer; white-space:nowrap; box-shadow:0 2px 4px rgba(220,38,38,0.3);">' +
            '🗑 Limpiar todo' +
          '</button>' +
        '</div>'
      : '';

    var footerClearBtnHtml = isMaster
      ? '<button type="button" class="btn btn--ghost" id="clearAllCommentsBtn" title="Vaciar notas y comenzar desde cero" style="color:#ef4444; font-weight:700; font-size:11px;">🗑 Limpiar todo</button>'
      : '';

    var targetBlockHtml = '';
    if (currentTarget) {
      targetBlockHtml = 
        '<div class="comment-target-block">' +
          '<div style="display:flex; justify-content:space-between; align-items:center;">' +
            '<div class="comment-target-block__meta">' +
              (currentTarget.sectionNum ? '§ ' + esc(currentTarget.sectionNum) + ' ' : '') +
              (currentTarget.sectionTitle ? esc(currentTarget.sectionTitle) : esc(currentTarget.chapterTitle || 'Bloque seleccionado')) +
            '</div>' +
            '<button type="button" class="btn btn--ghost" id="clearTargetBtn" style="font-size:10px; padding:2px 6px;">Ver todas</button>' +
          '</div>' +
          (currentTarget.quote ? '<p class="comment-target-block__quote">“' + esc(currentTarget.quote) + '”</p>' : '') +
        '</div>';
    }

    drawer.innerHTML = 
      '<div class="comments-drawer__head">' +
        '<h2 class="comments-drawer__title">' +
          '<span>💬 Revisiones & Anotaciones</span>' +
        '</h2>' +
        '<button class="comments-drawer__close" type="button" id="closeCommentsBtn" title="Cerrar (Esc)">&times;</button>' +
      '</div>' +

      masterBannerHtml +

      '<div class="comments-filter-bar">' +
        '<span class="comments-filter-lbl">Socios:</span>' +
        '<label class="filter-chip ' + (activeFilters['arturo-a'] ? 'active-arturo-a' : '') + '">' +
          '<input type="checkbox" data-filter="arturo-a"' + (activeFilters['arturo-a'] ? ' checked' : '') + '> Arturo A.' +
        '</label>' +
        '<label class="filter-chip ' + (activeFilters['arturo-b'] ? 'active-arturo-b' : '') + '">' +
          '<input type="checkbox" data-filter="arturo-b"' + (activeFilters['arturo-b'] ? ' checked' : '') + '> Arturo B.' +
        '</label>' +
        '<label class="filter-chip ' + (activeFilters['gema'] ? 'active-gema' : '') + '">' +
          '<input type="checkbox" data-filter="gema"' + (activeFilters['gema'] ? ' checked' : '') + '> Gema R.' +
        '</label>' +
        '<button type="button" class="btn btn--ghost" id="toggleAllFiltersBtn" style="font-size:10px; padding:2px 5px; margin-left:auto;">Alternar</button>' +
      '</div>' +

      '<div class="comments-drawer__body" id="commentsDrawerBody">' +
        targetBlockHtml +
        '<div class="comments-thread-list" id="commentsThreadList"></div>' +
        
        '<form class="comment-form" id="newCommentForm">' +
          '<div class="comment-form__author-info">' +
            'Anotando como: <strong>' + esc(currentUser.name) + '</strong> (' + esc(currentUser.role) + ')' +
          '</div>' +
          '<textarea id="commentInput" placeholder="Escribe una observación técnica, sugerencia legal o propuesta comercial…" rows="3" required></textarea>' +
          '<div class="comment-form__actions">' +
            '<span style="font-size:10px; color:var(--text-3);">' + (currentTarget ? 'Vinculada al bloque' : 'Nota general del capítulo') + '</span>' +
            '<button type="submit" class="btn" style="padding:4px 12px; font-size:11px;">Guardar anotación</button>' +
          '</div>' +
        '</form>' +
      '</div>' +

      '<div class="comments-drawer__foot">' +
        '<button type="button" class="btn btn--ghost" id="exportPdfBtn">📄 Exportar a PDF</button>' +
        '<button type="button" class="btn btn--ghost" id="exportJsonBtn">💾 Respaldo JSON</button>' +
        footerClearBtnHtml +
      '</div>';

    bindDrawerEvents();
    renderCommentsList();
  }

  function bindDrawerEvents() {
    var closeBtn = document.getElementById('closeCommentsBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeCommentsDrawer);
    }

    var masterClear = document.getElementById('masterDrawerClearBtn');
    if (masterClear) {
      masterClear.addEventListener('click', function () {
        if (confirm('¿Deseas vaciar y purgar todas las anotaciones para comenzar desde cero?')) {
          clearAllComments();
          alert('✓ Se han limpiado todas las anotaciones exitosamente.');
        }
      });
    }

    var clearBtn = document.getElementById('clearTargetBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        currentTarget = null;
        document.querySelectorAll('.annotatable-block.is-active-target').forEach(function (el) {
          el.classList.remove('is-active-target');
        });
        renderDrawerMarkup();
      });
    }

    var clearAllBtn = document.getElementById('clearAllCommentsBtn');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', function () {
        if (confirm('¿Deseas vaciar y purgar todas las anotaciones para comenzar desde cero?')) {
          clearAllComments();
          alert('✓ Se han limpiado todas las anotaciones exitosamente.');
        }
      });
    }

    var filterInputs = document.querySelectorAll('.comments-filter-bar input[data-filter]');
    filterInputs.forEach(function (inp) {
      inp.addEventListener('change', function () {
        var f = inp.getAttribute('data-filter');
        activeFilters[f] = inp.checked;
        var chip = inp.closest('.filter-chip');
        if (chip) {
          chip.classList.toggle('active-' + f, inp.checked);
        }
        updateDocumentBadges();
        renderCommentsList();
      });
    });

    var toggleAll = document.getElementById('toggleAllFiltersBtn');
    if (toggleAll) {
      toggleAll.addEventListener('click', function () {
        var allActive = activeFilters['arturo-a'] && activeFilters['arturo-b'] && activeFilters['gema'];
        activeFilters['arturo-a'] = !allActive;
        activeFilters['arturo-b'] = !allActive;
        activeFilters['gema'] = !allActive;
        renderDrawerMarkup();
        updateDocumentBadges();
      });
    }

    var form = document.getElementById('newCommentForm');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var textarea = document.getElementById('commentInput');
        if (!textarea || !textarea.value.trim()) return;

        var user = (global.GEMA_AUTH && global.GEMA_AUTH.getUser) ? global.GEMA_AUTH.getUser() : {
          name: 'Arturo Arnaiz',
          role: 'Dirección de Negocios',
          email: 'arnaiz.art@gmail.com',
          key: 'arturo-a'
        };

        var curChap = null;
        if (location.hash) {
          var m = /#\/(cap-\d{2})/.exec(location.hash);
          if (m) curChap = m[1];
        }

        var newRev = {
          id: 'rev-' + Date.now(),
          chapterSlug: (currentTarget && currentTarget.chapterSlug) || curChap || 'cap-01',
          chapterTitle: (currentTarget && currentTarget.chapterTitle) || 'Capítulo en revisión',
          sectionNum: (currentTarget && currentTarget.sectionNum) || null,
          sectionTitle: (currentTarget && currentTarget.sectionTitle) || null,
          blockId: (currentTarget && currentTarget.blockId) || null,
          blockQuote: (currentTarget && currentTarget.quote) || null,
          authorName: user.name,
          authorRole: user.role,
          authorEmail: user.email,
          authorKey: user.key || 'guest',
          timestamp: new Date().toISOString(),
          formattedDate: formatNow(),
          content: textarea.value.trim()
        };

        var comments = getComments();
        comments.unshift(newRev);
        saveComments(comments);
        textarea.value = '';
      });
    }

    var pdfBtn = document.getElementById('exportPdfBtn');
    if (pdfBtn) pdfBtn.addEventListener('click', exportCommentsToPdf);

    var jsonBtn = document.getElementById('exportJsonBtn');
    if (jsonBtn) jsonBtn.addEventListener('click', exportCommentsToJson);

    var threadList = document.getElementById('commentsThreadList');
    if (threadList) {
      threadList.addEventListener('click', handleCommentAction);
      threadList.addEventListener('keydown', handleCommentKeydown);
    }
  }

  function handleCommentAction(e) {
    var btn = e.target.closest('[data-comment-action]');
    if (!btn) return;
    var act = btn.getAttribute('data-comment-action');
    var id = btn.getAttribute('data-comment-id');
    if (!act || !id) return;

    var list = getComments();
    var idx = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        idx = i;
        break;
      }
    }
    if (idx === -1) return;

    var currentUser = (global.GEMA_AUTH && global.GEMA_AUTH.getUser) ? global.GEMA_AUTH.getUser() : null;
    if (!canEditOrDeleteComment(currentUser, list[idx])) {
      alert('Solo el autor de la nota o el Administrador Master puede modificarla.');
      return;
    }

    if (act === 'delete') {
      if (confirm('¿Deseas eliminar permanentemente esta anotación?')) {
        list.splice(idx, 1);
        if (editingCommentId === id) editingCommentId = null;
        saveComments(list);
      }
    } else if (act === 'edit') {
      editingCommentId = id;
      renderCommentsList();
      var editCard = document.querySelector('.comment-card[data-comment-id="' + id + '"]');
      if (editCard) {
        var txt = editCard.querySelector('.comment-card__edit-textarea');
        if (txt) {
          txt.focus();
          txt.setSelectionRange(txt.value.length, txt.value.length);
        }
      }
    } else if (act === 'cancel-edit') {
      editingCommentId = null;
      renderCommentsList();
    } else if (act === 'save-edit') {
      var card = document.querySelector('.comment-card[data-comment-id="' + id + '"]');
      if (card) {
        var input = card.querySelector('.comment-card__edit-textarea');
        if (input) {
          var val = input.value.trim();
          if (!val) {
            alert('El texto de la anotación no puede estar vacío.');
            return;
          }
          list[idx].content = val;
          list[idx].formattedDate = formatNow() + ' (editado)';
          list[idx].editedAt = new Date().toISOString();
          editingCommentId = null;
          saveComments(list);
        }
      }
    }
  }

  function handleCommentKeydown(e) {
    if (e.target && e.target.classList.contains('comment-card__edit-textarea')) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        var card = e.target.closest('.comment-card');
        if (card) {
          var saveBtn = card.querySelector('[data-comment-action="save-edit"]');
          if (saveBtn) saveBtn.click();
        }
      } else if (e.key === 'Escape') {
        editingCommentId = null;
        renderCommentsList();
      }
    }
  }

  function renderCommentsList() {
    var container = document.getElementById('commentsThreadList');
    if (!container) return;

    var currentUser = (global.GEMA_AUTH && global.GEMA_AUTH.getUser) ? global.GEMA_AUTH.getUser() : null;
    var all = getComments();
    var filtered = all.filter(function (c) {
      // Filtro de autor
      var k = c.authorKey || 'guest';
      if (!activeFilters[k]) return false;

      // Filtro de bloque si hay uno seleccionado
      if (currentTarget && currentTarget.blockId) {
        if (c.blockId && c.blockId === currentTarget.blockId) return true;
        // Compatibilidad: si el comentario fue en la sección del bloque
        if (currentTarget.sectionNum && c.sectionNum === currentTarget.sectionNum) return true;
        return false;
      }
      return true;
    });

    if (!filtered.length) {
      container.innerHTML = 
        '<div style="text-align:center; padding:var(--sp-4); color:var(--text-3); font-size:var(--fs-xs); line-height:1.5;">' +
          (currentTarget 
            ? 'Aún no hay anotaciones para este bloque.<br><br>Sé el primero en ingresar una observación usando el formulario inferior.'
            : 'No hay revisiones registradas todavía.<br><br>Haz clic en el ícono 💬 de cualquier bloque o párrafo del documento para comenzar a agregar anotaciones.') +
        '</div>';
      return;
    }

    container.innerHTML = filtered.map(function (c) {
      var k = c.authorKey || 'guest';
      var initials = (c.authorName || 'GA').split(' ').map(function (n) { return n[0]; }).slice(0, 2).join('');
      var secRef = '';
      if (c.sectionNum) {
        secRef = '<span style="font-size:10px; font-family:var(--font-mono); color:var(--text-3);">§ ' + esc(c.sectionNum) + ' ' + esc(c.sectionTitle || '') + '</span>';
      }

      var quoteHtml = '';
      if (!currentTarget && c.blockQuote) {
        quoteHtml = '<div style="font-size:11px; font-style:italic; color:var(--text-3); margin-top:2px; padding-left:6px; border-left:2px solid var(--line);">“' + esc(c.blockQuote.slice(0, 110)) + '…”</div>';
      }

      var canManage = canEditOrDeleteComment(currentUser, c);

      var actionsHtml = '';
      if (canManage && editingCommentId !== c.id) {
        actionsHtml = 
          '<div class="comment-card__actions">' +
            '<button type="button" class="btn-card-action" data-comment-action="edit" data-comment-id="' + esc(c.id) + '" title="Editar anotación">' +
              '<span>✏️</span> <span>Editar</span>' +
            '</button>' +
            '<button type="button" class="btn-card-action btn-card-action--danger" data-comment-action="delete" data-comment-id="' + esc(c.id) + '" title="Eliminar anotación">' +
              '<span>🗑</span> <span>Borrar</span>' +
            '</button>' +
          '</div>';
      }

      var bodyHtml = '';
      if (editingCommentId === c.id) {
        bodyHtml = 
          '<div class="comment-card__edit-form" data-comment-edit-id="' + esc(c.id) + '">' +
            '<textarea class="comment-card__edit-textarea" rows="3" required>' + esc(c.content) + '</textarea>' +
            '<div class="comment-card__edit-actions">' +
              '<button type="button" class="btn btn--ghost" data-comment-action="cancel-edit" data-comment-id="' + esc(c.id) + '" style="font-size:10.5px; padding:3px 8px;">Cancelar</button>' +
              '<button type="button" class="btn" data-comment-action="save-edit" data-comment-id="' + esc(c.id) + '" style="font-size:10.5px; padding:3px 10px;">Guardar cambios</button>' +
            '</div>' +
          '</div>';
      } else {
        bodyHtml = '<div class="comment-card__body">' + esc(c.content) + '</div>';
      }

      return '<div class="comment-card author-' + esc(k) + '" data-comment-id="' + esc(c.id) + '">' +
        '<div class="comment-card__head">' +
          '<div class="comment-card__author">' +
            '<span class="auth-avatar ' + esc(k) + '">' + initials + '</span>' +
            '<div>' +
              '<div>' + esc(c.authorName) + '</div>' +
              '<div class="comment-card__role">' + esc(c.authorRole) + '</div>' +
            '</div>' +
          '</div>' +
          '<div style="display:flex; align-items:center; gap:8px;">' +
            '<div class="comment-card__time">' + esc(c.formattedDate) + '</div>' +
            actionsHtml +
          '</div>' +
        '</div>' +
        secRef +
        quoteHtml +
        bodyHtml +
      '</div>';
    }).join('');
  }

  /* ------------------------------------------------------------------ *
   * Conexión con los Bloques del Documento (Botones 💬 y Badges)
   * ------------------------------------------------------------------ */
  function bindBlockButtons() {
    var doc = document.getElementById('doc');
    if (!doc) return;

    var btns = doc.querySelectorAll('.block-comment-btn');
    btns.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var blockId = btn.getAttribute('data-comment-target');
        var parentBlock = btn.closest('.annotatable-block');

        // Desmarcar anterior
        document.querySelectorAll('.annotatable-block.is-active-target').forEach(function (el) {
          el.classList.remove('is-active-target');
        });

        if (parentBlock) {
          parentBlock.classList.add('is-active-target');
        }

        // Obtener texto del bloque para contexto
        var quoteText = '';
        if (parentBlock) {
          var clone = parentBlock.cloneNode(true);
          var bBtn = clone.querySelector('.block-comment-btn');
          if (bBtn) bBtn.remove();
          quoteText = clone.textContent.replace(/\s+/g, ' ').trim().slice(0, 140);
        }

        // Hallar sección más cercana
        var secHead = parentBlock ? parentBlock.closest('.doc').querySelector('.sec-head') : null;
        var prevSec = null;
        if (parentBlock) {
          var curr = parentBlock.previousElementSibling;
          while (curr) {
            if (curr.classList && curr.classList.contains('sec-head')) {
              prevSec = curr;
              break;
            }
            curr = curr.previousElementSibling;
          }
        }
        var secNum = null;
        var secTitle = null;
        if (prevSec) {
          var numEl = prevSec.querySelector('.sec-head__num');
          var titleEl = prevSec.querySelector('.sec-head__title');
          if (numEl) secNum = numEl.textContent.trim();
          if (titleEl) secTitle = titleEl.textContent.trim();
        }

        currentTarget = {
          blockId: blockId,
          quote: quoteText,
          sectionNum: secNum,
          sectionTitle: secTitle,
          chapterSlug: location.hash ? (/cap-\d{2}/.exec(location.hash) || [''])[0] : 'cap-01',
          chapterTitle: document.querySelector('.chapter__title') ? document.querySelector('.chapter__title').textContent.trim() : 'Capítulo'
        };

        openCommentsDrawer();
        renderDrawerMarkup();

        // Enfocar el input
        setTimeout(function () {
          var input = document.getElementById('commentInput');
          if (input) input.focus();
        }, 150);
      });
    });

    updateDocumentBadges();
  }

  function updateDocumentBadges() {
    var comments = getComments();
    // Agrupar conteo por blockId y por sectionNum
    var countsByBlock = {};
    var countsBySec = {};

    comments.forEach(function (c) {
      var k = c.authorKey || 'guest';
      if (!activeFilters[k]) return; // Respetar filtro de socio activo

      if (c.blockId) {
        countsByBlock[c.blockId] = (countsByBlock[c.blockId] || 0) + 1;
      }
      if (c.sectionNum) {
        countsBySec[c.sectionNum] = (countsBySec[c.sectionNum] || 0) + 1;
      }
    });

    var btns = document.querySelectorAll('.block-comment-btn');
    btns.forEach(function (btn) {
      var bId = btn.getAttribute('data-comment-target');
      var badge = btn.querySelector('.comment-count-badge');
      var count = countsByBlock[bId] || 0;

      // Si no tiene conteo por blockId, ver si la sección tiene
      if (!count && bId) {
        var m = /blk-sec([\d.]+)-/.exec(bId);
        if (m && countsBySec[m[1]]) {
          count = countsBySec[m[1]];
        }
      }

      if (badge) {
        if (count > 0) {
          badge.textContent = count;
          badge.hidden = false;
          btn.classList.add('has-notes');
        } else {
          badge.hidden = true;
          btn.classList.remove('has-notes');
        }
      }
    });

    // Actualizar badge en topbar si existe
    var topbarBtn = document.getElementById('commentsToggleBtn');
    if (topbarBtn) {
      var activeTotal = comments.filter(function (c) {
        return activeFilters[c.authorKey || 'guest'];
      }).length;
      var topbarBadge = topbarBtn.querySelector('.topbar-badge');
      if (!topbarBadge) {
        topbarBadge = document.createElement('span');
        topbarBadge.className = 'badge-counter topbar-badge';
        topbarBtn.appendChild(topbarBadge);
      }
      topbarBadge.textContent = activeTotal;
      topbarBadge.style.display = activeTotal > 0 ? 'inline-block' : 'none';
    }
  }

  /* ------------------------------------------------------------------ *
   * Control de Apertura / Cierre del Drawer
   * ------------------------------------------------------------------ */
  function openCommentsDrawer() {
    var drawer = document.getElementById('commentsDrawer');
    if (drawer) {
      drawer.classList.add('is-open');
      drawer.removeAttribute('hidden');
      var toggleBtn = document.getElementById('commentsToggleBtn');
      if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
    }
  }

  function closeCommentsDrawer() {
    var drawer = document.getElementById('commentsDrawer');
    if (drawer) {
      drawer.classList.remove('is-open');
      var toggleBtn = document.getElementById('commentsToggleBtn');
      if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
    }
    document.querySelectorAll('.annotatable-block.is-active-target').forEach(function (el) {
      el.classList.remove('is-active-target');
    });
  }

  function toggleCommentsDrawer() {
    var drawer = document.getElementById('commentsDrawer');
    if (drawer && drawer.classList.contains('is-open')) {
      closeCommentsDrawer();
    } else {
      openCommentsDrawer();
      renderDrawerMarkup();
    }
  }

  /* ------------------------------------------------------------------ *
   * Exportación Editorial a PDF
   * ------------------------------------------------------------------ */
  function exportCommentsToPdf() {
    var comments = getComments();
    var filtered = comments.filter(function (c) {
      return activeFilters[c.authorKey || 'guest'];
    });

    if (!filtered.length) {
      alert('No hay anotaciones visibles con los filtros de socios actuales.');
      return;
    }

    // Agrupar por capítulo y sección
    var grouped = {};
    filtered.forEach(function (c) {
      var chap = c.chapterTitle || 'General';
      if (!grouped[chap]) grouped[chap] = [];
      grouped[chap].push(c);
    });

    var rowsHtml = '';
    Object.keys(grouped).forEach(function (chap) {
      rowsHtml += '<div class="pdf-chapter"><h2 class="pdf-chap-title">' + esc(chap) + '</h2>';
      grouped[chap].forEach(function (c) {
        var k = c.authorKey || 'guest';
        var col = k === 'gema' ? '#9333ea' : (k === 'arturo-b' ? '#059669' : '#0284c7');
        rowsHtml += 
          '<div class="pdf-comment-card" style="border-left:4px solid ' + col + ';">' +
            '<div class="pdf-card-head">' +
              '<div>' +
                '<strong style="color:' + col + '; font-size:13px;">' + esc(c.authorName) + '</strong> ' +
                '<span class="pdf-role">(' + esc(c.authorRole) + ')</span>' +
              '</div>' +
              '<span class="pdf-date">' + esc(c.formattedDate) + '</span>' +
            '</div>' +
            (c.sectionNum ? '<div class="pdf-sec-meta">§ ' + esc(c.sectionNum) + ' ' + esc(c.sectionTitle || '') + '</div>' : '') +
            (c.blockQuote ? '<blockquote class="pdf-quote">“' + esc(c.blockQuote) + '”</blockquote>' : '') +
            '<div class="pdf-card-body">' + esc(c.content) + '</div>' +
          '</div>';
      });
      rowsHtml += '</div>';
    });

    var printHtml = 
      '<!DOCTYPE html>' +
      '<html lang="es">' +
      '<head>' +
      '<meta charset="utf-8">' +
      '<title>Gema Agroecología — Informe de Revisiones & Anotaciones</title>' +
      '<style>' +
        '@page { size: letter; margin: 18mm 16mm 18mm 16mm; }' +
        'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; background: #fff; margin: 0; padding: 20px; line-height: 1.45; font-size: 12px; }' +
        '.pdf-header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }' +
        '.pdf-title { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0; }' +
        '.pdf-sub { font-size: 12px; color: #64748b; margin: 0; }' +
        '.pdf-meta { font-size: 11px; color: #475569; text-align: right; line-height: 1.4; }' +
        '.pdf-chap-title { font-size: 14px; font-weight: 700; color: #047857; margin: 18px 0 10px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }' +
        '.pdf-comment-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; page-break-inside: avoid; }' +
        '.pdf-card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }' +
        '.pdf-role { font-size: 10.5px; color: #64748b; }' +
        '.pdf-date { font-family: monospace; font-size: 10px; color: #64748b; }' +
        '.pdf-sec-meta { font-size: 11px; font-weight: 600; color: #334155; margin-bottom: 4px; }' +
        '.pdf-quote { margin: 4px 0 6px 0; padding-left: 8px; border-left: 2px solid #cbd5e1; font-style: italic; color: #64748b; font-size: 11px; }' +
        '.pdf-card-body { font-size: 12px; color: #1e293b; white-space: pre-wrap; }' +
        '.pdf-footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; }' +
      '</style>' +
      '</head>' +
      '<body>' +
        '<div class="pdf-header">' +
          '<div>' +
            '<h1 class="pdf-title">GEMA AGROECOLOGÍA · INFORME CONSOLIDADO DE REVISIONES</h1>' +
            '<p class="pdf-sub">Rancho Gema, San Pedro Chimay, Yucatán · Documento Ejecutivo Maestro V3.2 / V4</p>' +
          '</div>' +
          '<div class="pdf-meta">' +
            '<div><strong>Fecha de emisión:</strong> ' + formatNow() + '</div>' +
            '<div><strong>Socios:</strong> Arturo Arnaiz · Arturo de la Barrera · Gema Romero</div>' +
            '<div><strong>Total revisiones:</strong> ' + filtered.length + ' anotaciones</div>' +
          '</div>' +
        '</div>' +
        rowsHtml +
        '<div class="pdf-footer">' +
          '<span>Ecosistema IN2TECHMX — Trazabilidad y Gobernanza Digital</span>' +
          '<span>Repositorio Oficial: in2techmx.github.io/gema-v32-vitrina</span>' +
        '</div>' +
        '<script>' +
          'window.addEventListener("load", function() { setTimeout(function(){ window.print(); }, 250); });' +
        '</script>' +
      '</body>' +
      '</html>';

    var printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(printHtml);
      printWin.document.close();
    } else {
      alert('Por favor permite ventanas emergentes para generar el informe PDF.');
    }
  }

  /* ------------------------------------------------------------------ *
   * Exportación JSON de Auditoría
   * ------------------------------------------------------------------ */
  function exportCommentsToJson() {
    var comments = getComments();
    var payload = {
      project: 'GEMA AGROECOLOGÍA (Rancho Gema, San Pedro Chimay, Yucatán)',
      documentVersion: 'V3.2 / V4',
      exportedAt: new Date().toISOString(),
      partners: [
        { name: 'Arturo Arnaiz', role: 'Dirección de Negocios', email: 'arnaiz.art@gmail.com' },
        { name: 'Arturo de la Barrera', role: 'Gerencia Operativa', email: 'arturo.dlb.r@gmail.com' },
        { name: 'Gema Romero', role: 'Dirección Legal & RRPP', email: 'gemaromerom22@gmail.com' }
      ],
      totalReviews: comments.length,
      reviews: comments
    };

    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'revisiones_socios_gema_v32.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* ------------------------------------------------------------------ *
   * Inicialización Global
   * ------------------------------------------------------------------ */
  var api = {
    init: function () {
      renderDrawerMarkup();
      bindBlockButtons();
      var toggleBtn = document.getElementById('commentsToggleBtn');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleCommentsDrawer);
      }
      // Escuchar cambios de autenticación para refrescar el formulario
      window.addEventListener('gema32:auth-change', function () {
        renderDrawerMarkup();
      });
      // Atajo de teclado Escape para cerrar drawer
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeCommentsDrawer();
      });
    },
    open: openCommentsDrawer,
    close: closeCommentsDrawer,
    toggle: toggleCommentsDrawer,
    bindBlockButtons: bindBlockButtons,
    updateDocumentBadges: updateDocumentBadges,
    getComments: getComments,
    saveComments: saveComments,
    clearAllComments: clearAllComments,
    exportCommentsToPdf: exportCommentsToPdf,
    exportCommentsToJson: exportCommentsToJson
  };

  global.GEMA_COMMENTS = api;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', api.init);
  } else {
    api.init();
  }

})(typeof window !== 'undefined' ? window : global);
