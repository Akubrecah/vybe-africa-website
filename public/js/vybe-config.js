/**
 * VYBE Africa — Config Loader
 * ============================
 * Fetches public configuration from /api/config and makes it available
 * as window.VYBE_CONFIG before other scripts load.
 *
 * Include this FIRST in every page (before other scripts):
 *   <script src="js/vybe-config.js"></script>
 *
 * Then other scripts can access:
 *   window.VYBE_CONFIG.supabaseUrl
 *   window.VYBE_CONFIG.storageBucket
 *   window.VYBE_CONFIG.maxFileSize
 *   window.VYBE_CONFIG.allowedMimeTypes
 */

(function () {
  'use strict';

  // Default fallback (used if /api/config fails)
  const DEFAULT_CONFIG = {
    supabaseUrl: 'https://uwfkqitmopqcbvwhkcgg.supabase.co',
    storageBucket: 'vybe-images',
    maxFileSize: 52428800,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
  };

  // State
  let configPromise = null;
  let configLoaded = false;

  async function loadConfig() {
    if (configPromise) return configPromise;

    configPromise = (async () => {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const config = await res.json();
          window.VYBE_CONFIG = { ...DEFAULT_CONFIG, ...config };
          console.log('[VYBE] Config loaded from /api/config');
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
      } catch (err) {
        console.warn('[VYBE] Config endpoint unavailable, using defaults:', err.message);
        window.VYBE_CONFIG = DEFAULT_CONFIG;
      }
      configLoaded = true;
      // Fire event for scripts waiting on config
      document.dispatchEvent(new CustomEvent('vybe:config-ready', { detail: window.VYBE_CONFIG }));
      return window.VYBE_CONFIG;
    })();

    return configPromise;
  }

  // Helper to wait for config
  window.vybeWaitForConfig = async function () {
    if (configLoaded) return window.VYBE_CONFIG;
    return loadConfig();
  };

  // Expose current config (may be defaults if not loaded yet)
  Object.defineProperty(window, 'VYBE_CONFIG', {
    get: () => window.VYBE_CONFIG || DEFAULT_CONFIG,
    configurable: true
  });

  // Auto-load on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadConfig);
  } else {
    loadConfig();
  }

  // Also expose a synchronous getter for scripts that need immediate access
  window.getVybeConfig = function () {
    return window.VYBE_CONFIG || DEFAULT_CONFIG;
  };
})();