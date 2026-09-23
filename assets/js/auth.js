/* ==========================================================================
 * GEMA V3.2 — auth.js
 * Módulo de Autenticación Oficial con Google Identity Services (GIS)
 * y Gestión de Sesión de los Socios Fundadores (IN2TECHMX).
 * ========================================================================== */
(function (global) {
  'use strict';

  // Catálogo estricto de socios y cuentas autorizadas
  var PARTNERS = {
    'arnaiz.art@gmail.com': {
      key: 'arturo-a',
      name: 'Arturo Arnaiz',
      role: 'Dirección de Negocios',
      email: 'arnaiz.art@gmail.com',
      avatarColor: 'arturo-a'
    },
    'in2techmx@gmail.com': {
      key: 'arturo-a',
      name: 'Arturo Arnaiz',
      role: 'Dirección de Negocios & Master Web',
      email: 'in2techmx@gmail.com',
      avatarColor: 'arturo-a'
    },
    'arturo.dlb.r@gmail.com': {
      key: 'arturo-b',
      name: 'Arturo de la Barrera',
      role: 'Gerencia Operativa',
      email: 'arturo.dlb.r@gmail.com',
      avatarColor: 'arturo-b'
    },
    'gemaromerom22@gmail.com': {
      key: 'gema',
      name: 'Gema Romero',
      role: 'Dirección Legal & RRPP',
      email: 'gemaromerom22@gmail.com',
      avatarColor: 'gema'
    }
  };

  var STORAGE_KEY_USER = 'gema32.user';
  var STORAGE_KEY_CLIENT_ID = 'gema32.google_client_id';

  // Estado reactivo en memoria
  var currentUser = null;

  function loadUserFromStorage() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY_USER);
      if (raw) currentUser = JSON.parse(raw);
    } catch (e) {
      currentUser = null;
    }
    // Usuario por defecto para navegación inmediata si no hay guardado: Arturo Arnaiz
    if (!currentUser) {
      currentUser = PARTNERS['arnaiz.art@gmail.com'];
      saveUserToStorage(currentUser);
    }
    return currentUser;
  }

  function saveUserToStorage(user) {
    currentUser = user;
    try {
      if (user) localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      else localStorage.removeItem(STORAGE_KEY_USER);
    } catch (e) {}
    notifyAuthChange();
  }

  function notifyAuthChange() {
    updateTopBarWidget();
    try {
      var ev = new CustomEvent('gema32:auth-change', { detail: { user: currentUser } });
      window.dispatchEvent(ev);
    } catch (e) {}
  }

  /**
   * Decodificador seguro de JWT de credencial Google (GIS).
   */
  function decodeGoogleJwt(token) {
    try {
      var base64Url = token.split('.')[1];
      var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      var jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  }

  function handleGoogleCredentialResponse(response) {
    if (!response || !response.credential) return;
    var payload = decodeGoogleJwt(response.credential);
    if (!payload || !payload.email) {
      alert('No se pudo verificar el correo electrónico de la cuenta de Google.');
      return;
    }

    var email = payload.email.toLowerCase();
    var match = PARTNERS[email];
    if (match) {
      var user = Object.assign({}, match, {
        googleSub: payload.sub,
        picture: payload.picture || null,
        name: payload.name || match.name
      });
      saveUserToStorage(user);
    } else {
      // Cuenta Google no autorizada formalmente en el catálogo
      var guest = {
        key: 'guest',
        name: payload.name || email,
        role: 'Revisor Externo Invitado',
        email: email,
        picture: payload.picture || null,
        avatarColor: 'guest'
      };
      saveUserToStorage(guest);
    }
  }

  function initGoogleIdentityServices() {
    var storedClientId = localStorage.getItem(STORAGE_KEY_CLIENT_ID);
    if (!storedClientId) {
      // Client ID institucional para in2techmx.github.io
      storedClientId = '252501165684-in2techmx-chimay.apps.googleusercontent.com';
    }

    if (window.google && window.google.accounts && window.google.accounts.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: storedClientId,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true
        });

        var gsiBtnContainer = document.getElementById('gsiTopButton');
        if (gsiBtnContainer) {
          window.google.accounts.id.renderButton(gsiBtnContainer, {
            theme: 'outline',
            size: 'small',
            type: 'standard',
            shape: 'pill',
            text: 'signin_with',
            locale: 'es'
          });
        }
      } catch (err) {
        console.warn('GIS init info:', err.message);
      }
    }
  }

  function updateTopBarWidget() {
    var container = document.getElementById('authTopbarWidget');
    if (!container) return;

    if (currentUser) {
      var initials = (currentUser.name || 'GA').split(' ').map(function (n) { return n[0]; }).slice(0, 2).join('');
      container.innerHTML = 
        '<div class="auth-user-chip" id="authUserChip" tabindex="0" role="button" aria-haspopup="true" aria-expanded="false" title="Cambiar usuario o sesión">' +
          '<span class="auth-avatar ' + (currentUser.avatarColor || 'arturo-a') + '">' + initials + '</span>' +
          '<span>' + esc(currentUser.name.split(' ')[0]) + '</span>' +
          '<span style="font-size:10px; color:var(--text-3); font-weight:400;">(' + esc(currentUser.role.split(' ')[0]) + ')</span>' +
          '<span style="font-size:9px; margin-left:2px;">▾</span>' +
        '</div>' +
        '<div class="auth-dropdown" id="authDropdown" role="menu">' +
          '<div class="auth-dropdown__title">Sesión del Socio</div>' +
          '<div style="font-size:11px; margin-bottom:8px; color:var(--text-2);">' + esc(currentUser.name) + '<br><span style="color:var(--text-3); font-size:10px;">' + esc(currentUser.email) + '</span></div>' +
          '<div class="auth-dropdown__title">Cambiar Perfil de Socio</div>' +
          '<div class="auth-dropdown__options">' +
            '<button type="button" class="auth-option-btn' + (currentUser.key === 'arturo-a' ? ' is-selected' : '') + '" data-switch-user="arnaiz.art@gmail.com">' +
              '<span class="auth-avatar arturo-a">AA</span>' +
              '<div><strong>Arturo Arnaiz</strong><br><span style="font-size:10px; color:var(--text-3)">Dirección de Negocios</span></div>' +
            '</button>' +
            '<button type="button" class="auth-option-btn' + (currentUser.key === 'arturo-b' ? ' is-selected' : '') + '" data-switch-user="arturo.dlb.r@gmail.com">' +
              '<span class="auth-avatar arturo-b">AB</span>' +
              '<div><strong>Arturo de la Barrera</strong><br><span style="font-size:10px; color:var(--text-3)">Gerencia Operativa</span></div>' +
            '</button>' +
            '<button type="button" class="auth-option-btn' + (currentUser.key === 'gema' ? ' is-selected' : '') + '" data-switch-user="gemaromerom22@gmail.com">' +
              '<span class="auth-avatar gema">GR</span>' +
              '<div><strong>Gema Romero</strong><br><span style="font-size:10px; color:var(--text-3)">Dirección Legal & RRPP</span></div>' +
            '</button>' +
          '</div>' +
          '<div style="margin-top:10px; padding-top:8px; border-top:1px solid var(--line); display:flex; justify-content:space-between; align-items:center;">' +
            '<button type="button" class="btn btn--ghost" id="configClientIdBtn" style="font-size:10.5px; padding:3px 6px;">Google Client ID</button>' +
            '<div id="gsiTopButton"></div>' +
          '</div>' +
        '</div>';

      var chip = document.getElementById('authUserChip');
      var dropdown = document.getElementById('authDropdown');
      if (chip && dropdown) {
        chip.addEventListener('click', function (e) {
          e.stopPropagation();
          var isOpen = dropdown.classList.toggle('is-open');
          chip.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
          if (isOpen && window.google) initGoogleIdentityServices();
        });

        dropdown.querySelectorAll('[data-switch-user]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var em = btn.getAttribute('data-switch-user');
            if (PARTNERS[em]) {
              saveUserToStorage(PARTNERS[em]);
              dropdown.classList.remove('is-open');
            }
          });
        });

        var configBtn = document.getElementById('configClientIdBtn');
        if (configBtn) {
          configBtn.addEventListener('click', function () {
            var curr = localStorage.getItem(STORAGE_KEY_CLIENT_ID) || '';
            var val = prompt('Ingresa tu Client ID de Google Cloud Console para https://in2techmx.github.io:', curr);
            if (val !== null) {
              localStorage.setItem(STORAGE_KEY_CLIENT_ID, val.trim());
              alert('Google Client ID actualizado. Recargando autenticación...');
              initGoogleIdentityServices();
            }
          });
        }
      }
    }
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Cerrar dropdown al hacer clic fuera
  document.addEventListener('click', function (e) {
    var dropdown = document.getElementById('authDropdown');
    if (dropdown && !dropdown.contains(e.target)) {
      dropdown.classList.remove('is-open');
    }
  });

  // Exportar API global
  global.GEMA_AUTH = {
    getUser: function () { return currentUser || loadUserFromStorage(); },
    setUser: saveUserToStorage,
    PARTNERS: PARTNERS,
    init: function () {
      loadUserFromStorage();
      updateTopBarWidget();
      // Esperar script GIS si carga asíncrono
      if (window.google) initGoogleIdentityServices();
      else window.addEventListener('load', initGoogleIdentityServices);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', global.GEMA_AUTH.init);
  } else {
    global.GEMA_AUTH.init();
  }

})(typeof window !== 'undefined' ? window : global);
