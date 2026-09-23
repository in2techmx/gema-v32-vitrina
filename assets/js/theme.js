/* ==========================================================================
 * GEMA V3.2 — theme.js
 * MOD-GEMA32-SHELL · Tema dual con persistencia (AC-01.6)
 *
 * Núcleo puro + adaptador DOM. El núcleo se puede require() en Node (sin DOM).
 * ========================================================================== */
(function (global) {
  'use strict';

  var KEY = 'gema32.theme';
  var THEMES = ['dark', 'light'];

  function isValidTheme(value) {
    return THEMES.indexOf(value) >= 0;
  }

  /** Resuelve el tema efectivo: preferencia guardada > preferencia del sistema > dark. */
  function resolveTheme(stored, prefersDark) {
    if (isValidTheme(stored)) return stored;
    return prefersDark ? 'dark' : 'light';
  }

  /** Lee el tema guardado tolerando storage ausente o que lanza excepción. */
  function readStored(storage) {
    try {
      if (!storage || typeof storage.getItem !== 'function') return null;
      var v = storage.getItem(KEY);
      return isValidTheme(v) ? v : null;
    } catch (e) {
      return null;
    }
  }

  /** Escribe el tema tolerando storage ausente o que lanza excepción. */
  function writeStored(storage, theme) {
    try {
      if (!storage || typeof storage.setItem !== 'function' || !isValidTheme(theme)) return false;
      storage.setItem(KEY, theme);
      return true;
    } catch (e) {
      return false;
    }
  }

  function prefersDark() {
    try {
      return !!(global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches);
    } catch (e) {
      return true;
    }
  }

  function storage() {
    try {
      return global.localStorage || null;
    } catch (e) {
      return null;
    }
  }

  function current() {
    try {
      return document.documentElement.getAttribute('data-theme') || 'dark';
    } catch (e) {
      return 'dark';
    }
  }

  function apply(theme) {
    var t = isValidTheme(theme) ? theme : 'dark';
    try {
      document.documentElement.setAttribute('data-theme', t);
      var meta = document.querySelector('meta[name="color-scheme"]');
      if (meta) meta.setAttribute('content', t);
    } catch (e) { /* sin DOM: no-op */ }
    return t;
  }

  function set(theme) {
    var t = apply(theme);
    writeStored(storage(), t);
    return t;
  }

  function toggle() {
    return set(current() === 'dark' ? 'light' : 'dark');
  }

  function init() {
    var t = resolveTheme(readStored(storage()), prefersDark());
    return apply(t);
  }

  var api = {
    KEY: KEY,
    THEMES: THEMES,
    isValidTheme: isValidTheme,
    resolveTheme: resolveTheme,
    readStored: readStored,
    writeStored: writeStored,
    apply: apply,
    set: set,
    get: current,
    toggle: toggle,
    init: init,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (global) global.GEMA32_THEME = api;
})(typeof window !== 'undefined' ? window : globalThis);
