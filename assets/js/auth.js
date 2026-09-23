/* ==========================================================================
 * GEMA V3.2 — auth.js
 * Módulo Oficial de Autenticación con Google Identity Services (GIS) & OAuth 2.0
 * Replicado exactamente de la solución de Proyecto Chimay (chimay-operaciones).
 * Control estricto de whitelist para socios (Arturo A., Arturo B., Gema R.).
 * ========================================================================== */
(function (global) {
  'use strict';

  // Catálogo oficial de especialistas y socios del Ecosistema IN2TECHMX
  var TEAM_INFO = {
    "Arturo A.": {
      id: "USR-AAA",
      name: "Arturo A.",
      key: "arturo-a",
      rol: "Web Master (Master Admon)",
      email: "in2techmx@gmail.com",
      aliasEmail: "arnaiz.art@gmail.com",
      avatarBg: "#9333ea",
      avatarColor: "arturo-a",
      initials: "AA"
    },
    "Arturo B.": {
      id: "USR-ABR",
      name: "Arturo B.",
      key: "arturo-b",
      rol: "Gerente Operativo",
      email: "arturo.dlb.r@gmail.com",
      avatarBg: "#059669",
      avatarColor: "arturo-b",
      initials: "AB"
    },
    "Gema R.": {
      id: "USR-GR",
      name: "Gema R.",
      key: "gema",
      rol: "Gerente Legal",
      email: "gemaromerom22@gmail.com",
      avatarBg: "#2563eb",
      avatarColor: "gema",
      initials: "GR"
    }
  };

  // Clave de almacenamiento compatible con chimay-operaciones
  var STORAGE_KEY_ACTIVE_USER = 'chimay_active_user';
  var STORAGE_KEY_CLIENT_ID = 'chimay_google_client_id';
  var DEFAULT_CLIENT_ID = '38872065730-0em7shsrjtnl8d4mhrer5oeenv7m6vm6.apps.googleusercontent.com';

  var currentUser = null;

  function getGoogleClientId() {
    var stored = '';
    try {
      stored = (localStorage.getItem(STORAGE_KEY_CLIENT_ID) || '').trim();
    } catch (e) {}
    if (stored && stored.indexOf('.apps.googleusercontent.com') >= 0) {
      return stored;
    }
    return DEFAULT_CLIENT_ID;
  }

  function parseJwt(token) {
    try {
      var base64Url = token.split('.')[1];
      var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('Error al decodificar Google JWT:', e);
      return null;
    }
  }

  /* ------------------------------------------------------------------ *
   * CONTROL DE ACCESO ESTRICTO: REGLA DE WHITELIST GOOGLE
   * Solo permite el ingreso con Google si la dirección existe en los socios registrados
   * ------------------------------------------------------------------ */
  function findAuthorizedUserByEmail(email) {
    if (!email) return null;
    var clean = email.toLowerCase().trim();

    for (var k in TEAM_INFO) {
      var t = TEAM_INFO[k];
      if (t.email && t.email.toLowerCase().trim() === clean) return t;
      if (t.aliasEmail && t.aliasEmail.toLowerCase().trim() === clean) return t;
    }

    if (clean === 'in2techmx@gmail.com' || clean === 'arnaiz.art@gmail.com') {
      return TEAM_INFO['Arturo A.'];
    }
    return null;
  }

  function isArturoArnaiz(user) {
    if (!user) return false;
    var k = (user.key || '').toLowerCase();
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

  function showAuthAlert(htmlContent) {
    var alertEl = document.getElementById('googleAuthAlert');
    if (!alertEl) return;
    alertEl.innerHTML = htmlContent;
    alertEl.style.display = 'block';
  }

  function clearAuthAlert() {
    var alertEl = document.getElementById('googleAuthAlert');
    if (alertEl) {
      alertEl.innerHTML = '';
      alertEl.style.display = 'none';
    }
  }

  function authenticateGoogleEmail(emailInput, picture) {
    if (!emailInput) return;
    var cleanEmail = emailInput.trim().toLowerCase();

    if (cleanEmail.indexOf('@') < 0) {
      showAuthAlert(
        '<div class="auth-alert auth-alert--warn">' +
          '<span>⚠️ Por favor ingresa una dirección de correo de Google válida.</span>' +
        '</div>'
      );
      return;
    }

    // 1. REGLA ESTRICTA: La cuenta DEBE existir en los usuarios registrados
    var matched = findAuthorizedUserByEmail(cleanEmail);

    if (!matched) {
      // ACCESO DENEGADO: La dirección de Google no existe en ningún usuario autorizado
      console.warn('⛔ ACCESO DENEGADO: Cuenta de Google no registrada:', cleanEmail);
      showAuthAlert(
        '<div class="auth-alert auth-alert--danger">' +
          '<div style="font-weight:700; margin-bottom:4px;">⛔ Acceso Denegado</div>' +
          '<p style="margin:0 0 6px 0; font-size:11px;">' +
            'La cuenta de Google <strong style="text-decoration:underline;">' + esc(cleanEmail) + '</strong> no está registrada en el sistema del Proyecto Chimay.' +
          '</p>' +
          '<p style="margin:0; font-size:10px; opacity:0.85;">' +
            'Solo usuarios autorizados pueden ingresar. Si formas parte del equipo, solicita tu alta al Web Master (<a href="mailto:in2techmx@gmail.com" style="color:var(--brand-2); text-decoration:underline;">in2techmx@gmail.com</a>).' +
          '</p>' +
        '</div>'
      );
      currentUser = null;
      try {
        sessionStorage.removeItem(STORAGE_KEY_ACTIVE_USER);
        localStorage.removeItem(STORAGE_KEY_ACTIVE_USER);
        localStorage.removeItem('gema32.user');
      } catch (e) {}
      renderUserAuth();
      return;
    }

    // 2. ACCESO CONCEDIDO
    currentUser = {
      id: matched.id,
      name: matched.name,
      email: matched.email || cleanEmail,
      aliasEmail: matched.aliasEmail || '',
      picture: picture || matched.picture || '',
      rol: matched.rol || 'Especialista de Proyecto',
      avatarBg: matched.avatarBg || '#059669',
      avatarColor: matched.avatarColor || 'arturo-b',
      initials: matched.initials || 'US',
      key: matched.key,
      isGoogleReal: true
    };

    try {
      sessionStorage.setItem(STORAGE_KEY_ACTIVE_USER, JSON.stringify(currentUser));
      localStorage.setItem('gema32.user', JSON.stringify(currentUser));
      localStorage.removeItem(STORAGE_KEY_ACTIVE_USER);
    } catch (e) {}

    showAuthAlert(
      '<div class="auth-alert auth-alert--success">' +
        '<span>✓ Bienvenido <strong>' + esc(currentUser.name) + '</strong> (' + esc(currentUser.rol) + '). Acceso concedido…</span>' +
      '</div>'
    );

    setTimeout(function () {
      closeGoogleAuthModal();
      clearAuthAlert();
      renderUserAuth();
      notifyAuthChange();
    }, 500);
  }

  function handleGoogleCredentialResponse(response) {
    if (!response || !response.credential) return;
    var payload = parseJwt(response.credential);
    if (payload && payload.email) {
      authenticateGoogleEmail(payload.email, payload.picture);
    }
  }

  /* ------------------------------------------------------------------ *
   * INICIALIZACIÓN OFICIAL DE GOOGLE IDENTITY SERVICES (GIS)
   * ------------------------------------------------------------------ */
  function initGoogleIdentity() {
    renderGoogleAccountsList();

    var clientId = getGoogleClientId();
    var inp = document.getElementById('inputGoogleClientId');
    if (inp) inp.value = clientId;

    var renderButtons = function () {
      if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
        try {
          google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleCredentialResponse,
            auto_select: false
          });

          var modalContainer = document.getElementById('gsiButtonContainer');
          if (modalContainer) {
            modalContainer.innerHTML = '';
            google.accounts.id.renderButton(modalContainer, {
              type: 'standard',
              theme: 'outline',
              size: 'large',
              text: 'continue_with',
              shape: 'pill',
              width: 300,
              logo_alignment: 'left'
            });
          }

          // Invocar Google One Tap si es compatible
          try {
            google.accounts.id.prompt();
          } catch (e) {}

        } catch (err) {
          console.warn('Google Identity init notice:', err);
        }
      } else {
        setTimeout(renderButtons, 200);
      }
    };

    renderButtons();
  }

  function renderGoogleAccountsList() {
    var list = document.getElementById('googleAccountsList');
    if (!list) return;

    var teamArray = Object.keys(TEAM_INFO).map(function (k) { return TEAM_INFO[k]; });
    list.innerHTML = '';

    teamArray.forEach(function (spec) {
      var isCurrent = currentUser && (currentUser.email === spec.email || currentUser.aliasEmail === spec.aliasEmail);
      var card = document.createElement('div');
      card.className = 'g-account-card' + (isCurrent ? ' is-active' : '');
      card.setAttribute('data-auth-action', 'switch-user');
      card.setAttribute('data-email', spec.email);

      var photoHtml = (isCurrent && currentUser.picture)
        ? '<img src="' + esc(currentUser.picture) + '" class="g-account-avatar" alt="' + esc(spec.name) + '">'
        : '<span class="g-account-avatar" style="background:' + spec.avatarBg + ';">' + esc(spec.initials) + '</span>';

      card.innerHTML = 
        '<div style="display:flex; align-items:center; gap:10px; min-width:0;">' +
          photoHtml +
          '<div style="min-width:0;">' +
            '<div style="font-weight:700; font-size:12px; color:var(--text);">' + esc(spec.name) + '</div>' +
            '<div style="font-size:11px; color:var(--text-3); font-family:var(--font-mono);">' + esc(spec.email) + '</div>' +
            '<div style="font-size:10px; color:var(--brand-2); font-weight:600;">' + esc(spec.rol) + '</div>' +
          '</div>' +
        '</div>' +
        (isCurrent 
          ? '<span class="g-active-badge">Activo</span>' 
          : '<span style="color:var(--text-3); font-size:11px;">Entrar &rarr;</span>');

      list.appendChild(card);
    });
  }

  function switchGoogleUser(email) {
    var matched = findAuthorizedUserByEmail(email);
    if (matched) {
      currentUser = {
        id: matched.id,
        name: matched.name,
        email: matched.email,
        aliasEmail: matched.aliasEmail || '',
        picture: (currentUser && currentUser.email === matched.email) ? currentUser.picture : '',
        rol: matched.rol,
        avatarBg: matched.avatarBg,
        avatarColor: matched.avatarColor,
        initials: matched.initials,
        key: matched.key,
        isGoogleReal: false
      };
      try {
        sessionStorage.setItem(STORAGE_KEY_ACTIVE_USER, JSON.stringify(currentUser));
        localStorage.setItem('gema32.user', JSON.stringify(currentUser));
      } catch (e) {}

      renderUserAuth();
      renderGoogleAccountsList();
      closeGoogleAuthModal();
      notifyAuthChange();
    }
  }

  function logoutGoogleUser() {
    currentUser = null;
    try {
      sessionStorage.removeItem(STORAGE_KEY_ACTIVE_USER);
      localStorage.removeItem(STORAGE_KEY_ACTIVE_USER);
      localStorage.removeItem('gema32.user');
    } catch (e) {}
    renderUserAuth();
    var drop = document.getElementById('userDropdown');
    if (drop) drop.classList.add('hidden');
    notifyAuthChange();
  }

  function toggleClientIdConfig(forceOpen) {
    var panel = document.getElementById('clientIdConfigPanel');
    var icon = document.getElementById('iconToggleClientId');
    if (!panel) return;
    if (forceOpen === true) panel.style.display = 'block';
    else panel.style.display = (panel.style.display === 'none' || !panel.style.display) ? 'block' : 'none';
    if (icon) {
      icon.style.transform = panel.style.display === 'block' ? 'rotate(180deg)' : 'rotate(0deg)';
    }
  }

  function saveGoogleClientId() {
    var inp = document.getElementById('inputGoogleClientId');
    var lbl = document.getElementById('clientIdStatusLabel');
    if (!inp) return;
    var val = (inp.value || '').trim();
    if (val && val.indexOf('.apps.googleusercontent.com') >= 0) {
      localStorage.setItem(STORAGE_KEY_CLIENT_ID, val);
      if (lbl) {
        lbl.className = 'text-status text-status--ok';
        lbl.textContent = '✓ Client ID guardado exitosamente. Inicializando Google Identity...';
      }
      initGoogleIdentity();
    } else if (!val) {
      localStorage.removeItem(STORAGE_KEY_CLIENT_ID);
      if (lbl) {
        lbl.className = 'text-status text-status--info';
        lbl.textContent = 'Client ID restablecido a valor predeterminado.';
      }
      initGoogleIdentity();
    } else {
      if (lbl) {
        lbl.className = 'text-status text-status--err';
        lbl.textContent = '⚠ Formato inválido. Debe terminar en .apps.googleusercontent.com';
      }
    }
  }

  /* ------------------------------------------------------------------ *
   * Renderizado de Botón en Topbar y Dropdown (Exacto a chimay-operaciones)
   * ------------------------------------------------------------------ */
  function renderUserAuth() {
    var container = document.getElementById('authTopbarWidget');
    if (!container) return;

    if (currentUser) {
      var photoHtml = currentUser.picture
        ? '<img src="' + esc(currentUser.picture) + '" class="topbar-user-avatar" alt="' + esc(currentUser.name) + '">'
        : '<span class="topbar-user-avatar" style="background:' + (currentUser.avatarBg || '#9333ea') + ';">' + esc(currentUser.initials || 'AA') + '</span>';

      var isMaster = isArturoArnaiz(currentUser);

      var masterDirectBtn = isMaster
        ? '<button type="button" class="btn-topbar-master" data-auth-action="master-clear-comments" style="background:#dc2626; color:#ffffff; font-weight:700; border:1px solid #b91c1c; border-radius:6px; font-size:11px; padding:5px 10px; cursor:pointer; display:inline-flex; align-items:center; gap:5px; box-shadow:0 1px 4px rgba(220,38,38,0.4);" title="Vaciar y limpiar todas las anotaciones (Exclusivo Arturo Arnaiz)">' +
            '<span>🗑 Limpiar notas</span>' +
          '</button>'
        : '';

      var masterDropdownBtn = isMaster
        ? '<button type="button" class="user-dropdown-item user-dropdown-item--danger" data-auth-action="master-clear-comments" style="color:#ef4444; font-weight:700; background:rgba(239, 68, 68, 0.1); border-color:rgba(239, 68, 68, 0.3);">' +
            '<span>🗑 Limpiar todas las notas (Master)</span>' +
          '</button>'
        : '';

      container.innerHTML = 
        '<div class="auth-pill-container" style="position:relative; display:flex; align-items:center; gap:6px;">' +
          masterDirectBtn +
          '<button type="button" class="auth-user-pill" id="authUserPill" data-auth-action="toggle-dropdown">' +
            photoHtml +
            '<div class="auth-user-info">' +
              '<span class="auth-user-name">' + esc(currentUser.name) + '</span>' +
              '<span class="auth-user-google-badge" title="Autenticado con Google">&#9679; Google</span>' +
            '</div>' +
            '<span class="auth-chevron">▾</span>' +
          '</button>' +

          '<!-- Menú Desplegable de Usuario -->' +
          '<div id="userDropdown" class="user-auth-dropdown hidden">' +
            '<div class="user-dropdown-header">' +
              '<div style="display:flex; align-items:center; gap:8px;">' +
                photoHtml +
                '<div style="min-width:0;">' +
                  '<div style="font-weight:700; font-size:12px; color:var(--text);">' + esc(currentUser.name) + '</div>' +
                  '<div style="font-size:10.5px; color:var(--text-3); font-family:var(--font-mono);">' + esc(currentUser.email) + '</div>' +
                '</div>' +
              '</div>' +
              '<div style="margin-top:6px;"><span class="auth-role-tag">' + esc(currentUser.rol) + '</span></div>' +
            '</div>' +
            '<div class="user-dropdown-menu">' +
              '<button type="button" class="user-dropdown-item" data-auth-action="open-modal">' +
                '<span>🔑 Cambiar de Cuenta Google</span>' +
              '</button>' +
              masterDropdownBtn +
              '<button type="button" class="user-dropdown-item user-dropdown-item--danger" data-auth-action="logout">' +
                '<span>🚪 Cerrar Sesión</span>' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>';
    } else {
      // Botón Oficial: "Acceder con Google" con SVG multicolor de Google
      container.innerHTML = 
        '<button type="button" class="btn-google-auth" data-auth-action="open-modal">' +
          '<svg class="g-logo-svg" viewBox="0 0 24 24" width="16" height="16">' +
            '<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>' +
            '<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>' +
            '<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>' +
            '<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>' +
          '</svg>' +
          '<span>Acceder con Google</span>' +
        '</button>';
    }
  }

  function toggleUserDropdown() {
    var drop = document.getElementById('userDropdown');
    if (drop) drop.classList.toggle('hidden');
  }

  /* ------------------------------------------------------------------ *
   * Renderizado e Inyección del Modal Oficial `#googleAuthModal`
   * ------------------------------------------------------------------ */
  function ensureGoogleAuthModalInDom() {
    if (document.getElementById('googleAuthModal')) return;

    var modalHtml = 
      '<div id="googleAuthModal" class="google-auth-overlay hidden">' +
        '<div class="google-auth-dialog">' +
          '<div class="google-auth-head">' +
            '<div style="display:flex; align-items:center; gap:10px;">' +
              '<svg class="g-logo-svg" viewBox="0 0 24 24" width="24" height="24">' +
                '<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>' +
                '<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>' +
                '<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>' +
                '<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>' +
              '</svg>' +
              '<div>' +
                '<h3 style="margin:0; font-size:15px; font-weight:800; color:var(--text);">Acceso Oficial con Google</h3>' +
                '<p style="margin:0; font-size:11px; color:var(--text-3);">Google Identity Services (GIS) &bull; Ecosistema IN2TECHMX</p>' +
              '</div>' +
            '</div>' +
            '<button type="button" class="google-auth-close" data-auth-action="close-modal">&times;</button>' +
          '</div>' +

          '<div id="googleAuthAlert" style="display:none;"></div>' +

          '<!-- Contenedor Oficial del Botón de Google Identity -->' +
          '<div class="google-auth-box">' +
            '<p style="margin:0 0 8px 0; font-size:12px; font-weight:700; color:var(--text);">Inicia sesión con tu cuenta oficial de Google:</p>' +
            '<div id="gsiButtonContainer" style="display:flex; justify-content:center; min-height:44px; margin:4px 0;">' +
              '<span style="font-size:11px; color:var(--text-3);">Cargando Google Identity Services...</span>' +
            '</div>' +
            '<p style="margin:4px 0 0 0; font-size:10px; color:var(--text-3);">Autentica tu foto oficial, correo verificado y firma de trazabilidad.</p>' +
          '</div>' +

          '<!-- Configuración de Google OAuth Client ID -->' +
          '<div class="google-clientid-panel">' +
            '<div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" data-auth-action="toggle-client-id">' +
              '<span style="font-size:11px; font-weight:700; color:var(--text-2);">⚙ Configurar Google Client ID (Google Cloud)</span>' +
              '<span id="iconToggleClientId" style="font-size:10px; color:var(--text-3);">▾</span>' +
            '</div>' +
            '<div id="clientIdConfigPanel" style="display:none; margin-top:8px; padding-top:8px; border-top:1px solid var(--line);">' +
              '<div style="font-size:10.5px; color:var(--text-3); margin-bottom:6px; line-height:1.4;">' +
                'Para evitar el <code>Error 401: invalid_client</code>, asegúrate de que tu Client ID tenga autorizado el origen <code>https://in2techmx.github.io</code> y <code>http://localhost</code>.' +
              '</div>' +
              '<div style="display:flex; gap:6px;">' +
                '<input id="inputGoogleClientId" type="text" placeholder="ej: 123456789-abc.apps.googleusercontent.com" style="flex:1; padding:4px 8px; font-size:11px; font-family:var(--font-mono); border-radius:4px; border:1px solid var(--line); background:var(--surface-1); color:var(--text);">' +
                '<button type="button" class="btn" style="padding:4px 10px; font-size:11px;" data-auth-action="save-client-id">Guardar</button>' +
              '</div>' +
              '<div id="clientIdStatusLabel" style="font-size:10px; margin-top:4px;"></div>' +
            '</div>' +
          '</div>' +

          '<!-- Acceso Rápido con Cuentas del Equipo (1-clic activo) -->' +
          '<div style="margin-top:10px;">' +
            '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">' +
              '<span style="font-size:11px; font-weight:700; color:var(--text-3); text-transform:uppercase; letter-spacing:0.04em;">Perfiles de Socios del Proyecto:</span>' +
              '<span class="g-active-badge">1-clic activo</span>' +
            '</div>' +
            '<div class="google-accounts-list" id="googleAccountsList"></div>' +
          '</div>' +

          '<div style="margin-top:14px; text-align:right;">' +
            '<button type="button" class="btn btn--ghost" style="font-size:11px; padding:3px 10px;" data-auth-action="close-modal">Cerrar</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    var div = document.createElement('div');
    div.innerHTML = modalHtml;
    document.body.appendChild(div.firstElementChild);
  }

  function openGoogleAuthModal() {
    ensureGoogleAuthModalInDom();
    var m = document.getElementById('googleAuthModal');
    if (m) {
      m.classList.remove('hidden');
      renderGoogleAccountsList();
      initGoogleIdentity();
    }
  }

  function closeGoogleAuthModal() {
    var m = document.getElementById('googleAuthModal');
    if (m) m.classList.add('hidden');
    clearAuthAlert();
  }

  function notifyAuthChange() {
    try {
      var ev = new CustomEvent('gema32:auth-change', { detail: { user: currentUser } });
      window.dispatchEvent(ev);
    } catch (e) {}
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Delegación de eventos para data-auth-action
  document.addEventListener('click', function (e) {
    var target = e.target.closest('[data-auth-action]');
    if (target) {
      var act = target.getAttribute('data-auth-action');
      if (act === 'open-modal') {
        openGoogleAuthModal();
        var drop = document.getElementById('userDropdown');
        if (drop) drop.classList.add('hidden');
      } else if (act === 'close-modal') {
        closeGoogleAuthModal();
      } else if (act === 'toggle-dropdown') {
        toggleUserDropdown();
      } else if (act === 'logout') {
        logoutGoogleUser();
      } else if (act === 'toggle-client-id') {
        toggleClientIdConfig();
      } else if (act === 'save-client-id') {
        saveGoogleClientId();
      } else if (act === 'switch-user') {
        var em = target.getAttribute('data-email');
        if (em) switchGoogleUser(em);
      } else if (act === 'master-clear-comments') {
        if (confirm('¿Deseas vaciar y purgar todas las anotaciones para comenzar desde cero?')) {
          if (global.GEMA_COMMENTS && typeof global.GEMA_COMMENTS.clearAllComments === 'function') {
            global.GEMA_COMMENTS.clearAllComments();
            alert('✓ Se han limpiado todas las anotaciones exitosamente.');
          }
        }
      }
      return;
    }

    // Cerrar dropdown si se hace click fuera
    var drop = document.getElementById('userDropdown');
    var pill = document.getElementById('authUserPill');
    if (drop && !drop.classList.contains('hidden')) {
      if (pill && pill.contains(e.target)) return;
      if (!drop.contains(e.target)) {
        drop.classList.add('hidden');
      }
    }
  });

  /* ------------------------------------------------------------------ *
   * API GLOBAL
   * ------------------------------------------------------------------ */
  var api = {
    getUser: function () {
      if (currentUser) return currentUser;
      try {
        var raw = sessionStorage.getItem(STORAGE_KEY_ACTIVE_USER) || localStorage.getItem('gema32.user');
        if (raw) currentUser = JSON.parse(raw);
      } catch (e) {}
      if (!currentUser) {
        // Socio predeterminado inicial: Arturo A.
        currentUser = TEAM_INFO['Arturo A.'];
      }
      return currentUser;
    },
    isArturoArnaiz: isArturoArnaiz,
    openGoogleAuthModal: openGoogleAuthModal,
    closeGoogleAuthModal: closeGoogleAuthModal,
    toggleUserDropdown: toggleUserDropdown,
    toggleClientIdConfig: toggleClientIdConfig,
    saveGoogleClientId: saveGoogleClientId,
    switchGoogleUser: switchGoogleUser,
    logoutGoogleUser: logoutGoogleUser,
    init: function () {
      api.getUser();
      ensureGoogleAuthModalInDom();
      renderUserAuth();
      if (window.google) initGoogleIdentity();
      else window.addEventListener('load', initGoogleIdentity);
    }
  };

  global.GEMA_AUTH = api;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', api.init);
  } else {
    api.init();
  }

})(typeof window !== 'undefined' ? window : global);
