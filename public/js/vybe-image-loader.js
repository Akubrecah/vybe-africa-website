/**
 * VYBE Africa — Global Supabase Image Loader
 * ==========================================
 * Replaces ALL local `assets/images/...` references sitewide with
 * live Supabase Storage public URLs. Works on:
 *   - <img src="assets/images/...">
 *   - style="background-image: url('assets/images/...')"
 *   - Elements with data-bg="assets/images/..."
 *   - Hardcoded wrong-path Supabase logo URLs
 *
 * Include ONCE in every page (before </body>):
 *   <script src="js/vybe-image-loader.js"></script>
 */

(function () {
  'use strict';

// Configuration state
  let SUPABASE_URL = DEFAULT_CONFIG.supabaseUrl;
  let BUCKET = DEFAULT_CONFIG.storageBucket;
  let BASE_URL = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;
  const API_ENDPOINT = '/api/images';
  const CONFIG_ENDPOINT = '/api/config';

  // Expose config globally (will be updated after /api/config loads)
  window.VYBE_CONFIG = { ...DEFAULT_CONFIG };
  let configLoaded = false;

  // Helper to wait for config
  window.vybeWaitForConfig = async function () {
    if (configLoaded) return window.VYBE_CONFIG;
    await loadConfig();
    return window.VYBE_CONFIG;
  };

  // ── Fallback map: local path → bucket storage_path ──────────────────────────
  // Used when API is unavailable or for instant replacement before fetch completes.
  // Keys are the local path WITHOUT leading slash. Values are the bucket path.
  const FALLBACK_MAP = {
    'assets/images/logo.png':                         'images/logo.png',
    'assets/images/hero-bg.jpg':                      'images/hero-bg.jpg',
    'assets/images/work-child.jpg':                   'images/work-child.jpg',
    'assets/images/work-climate.jpg':                 'images/work-climate.jpg',
    'assets/images/work-gov.jpg':                     'images/work-gov.jpg',
    'assets/images/work-srhr.jpg':                    'images/work-srhr.jpg',
    'assets/images/IMG-20251211-WA0024.jpg':          'images/IMG-20251127-WA0024.jpg',
    'assets/images/IMG-20251211-WA0030.jpg':          'images/IMG-20251211-WA0030.jpg',
    'assets/images/IMG-20251211-WA0038.jpg':          'images/IMG-20251211-WA0038.jpg',
    'assets/images/IMG-20251211-WA0041.jpg':          'images/IMG-20251211-WA0041.jpg',
    'assets/images/IMG-20251211-WA0045.jpg':          'images/IMG-20251211-WA0045.jpg',
    'assets/images/IMG-20251211-WA0047.jpg':          'images/IMG-20251211-WA0047.jpg',
    'assets/images/IMG-20251211-WA0053.jpg':          'images/IMG-20251211-WA0053.jpg',
    'assets/images/gallery/VYBE004823.jpeg':          'images/gallery/VYBE004823.jpeg',
    // Team photos (names with spaces)
    'assets/images/team/Farex Nandwa.jpg':            'images/team/Farex Nandwa.jpg',
    'assets/images/team/Joe Junior.jpg':              'images/team/Joe Junior.jpg',
    'assets/images/team/Marcellina Cherubia.jpg':     'images/team/Marcellina Cherubia.jpg',
    'assets/images/team/Moses Kibet.jpg':             'images/team/Moses Kibet.jpg',
    'assets/images/team/Sharon Chepkite.jpg':         'images/team/Sharon Chepkite.jpg',
    'assets/images/team/Tony Barasa.jpg':             'images/team/Tony Barasa.jpg',
  };

  // Wrong-path hardcoded Supabase URLs → correct bucket paths
  // This will be updated after config loads
  let WRONG_SUPABASE_PATHS = {};

  // ── State ────────────────────────────────────────────────────────────────────
  // storagePath → full public URL  (populated from API or fallback)
  let imageUrlMap = {};
  let configLoaded = false;

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /** Update BASE_URL and WRONG_SUPABASE_PATHS after config loads */
  function updateBaseUrl() {
    BASE_URL = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;
    WRONG_SUPABASE_PATHS = {
      [`${BASE_URL}/general/logo.png`]: `${BASE_URL}/images/logo.png`,
    };
  }

  /** Convert a local asset path to a full Supabase public URL */
  function localToSupabase(localPath) {
    if (!localPath) return null;

    // 1. Decode percent-encoding (e.g. "%20" -> " ") and strip leading "./" or "/"
    const decoded = decodeURIComponent(localPath).replace(/^\.?\//, '').trim();
    const clean = decoded.replace(/\\/g, '/'); // standard slashes

    // 2. Direct lookup in the map
    if (imageUrlMap[clean]) return imageUrlMap[clean];
    if (imageUrlMap[clean.toLowerCase()]) return imageUrlMap[clean.toLowerCase()];

    // 3. Fallback map lookup
    if (FALLBACK_MAP[clean]) return `${BASE_URL}/${FALLBACK_MAP[clean]}`;
    if (FALLBACK_MAP[clean.toLowerCase()]) return `${BASE_URL}/${FALLBACK_MAP[clean.toLowerCase()]}`;

    // 4. File name matching (fuzzy match)
    const filename = clean.split('/').pop().toLowerCase();
    const fuzzyKey = `__filename__${filename}`;
    if (imageUrlMap[fuzzyKey]) return imageUrlMap[fuzzyKey];

    // Try keys ending with the clean path (e.g. map key has 'images/logo.png', clean is 'logo.png')
    const partialMatchKey = Object.keys(imageUrlMap).find(k => {
      return k.endsWith('/' + clean) || k.toLowerCase().endsWith('/' + clean.toLowerCase());
    });
    if (partialMatchKey) return imageUrlMap[partialMatchKey];

    return null;
  }

  /** Fix a wrong-path hardcoded Supabase URL if known */
  function fixWrongSupabasePath(url) {
    return WRONG_SUPABASE_PATHS[url] || url;
  }

  /** Encode path segments (handles spaces in team photo names) */
  function encodedUrl(url) {
    return url.replace(/(https?:\/\/[^/]+)(\/.*)/,
      (_, origin, path) => origin + path.split('/').map(s => encodeURIComponent(decodeURIComponent(s))).join('/')
    );
  }

  // ── Patch a single src value ─────────────────────────────────────────────────
  function patchSrc(src) {
    if (!src) return null;

    // 1. Already a correct Supabase URL → return as-is (but fix wrong paths)
    if (src.startsWith(SUPABASE_URL)) {
      const fixed = fixWrongSupabasePath(src);
      return fixed !== src ? fixed : null; // null = no change needed
    }

    // 2. Local assets/images/* or images/* path
    const decodedSrc = decodeURIComponent(src);
    if (decodedSrc.includes('assets/images/') || decodedSrc.includes('images/')) {
      const newUrl = localToSupabase(src);
      return newUrl ? encodedUrl(newUrl) : null;
    }

    return null;
  }

  // ── DOM Patching ─────────────────────────────────────────────────────────────

  /** Patch all <img> tags */
  function patchImgTags() {
    document.querySelectorAll('img[src]').forEach(img => {
      const newSrc = patchSrc(img.getAttribute('src'));
      if (newSrc) {
        img.setAttribute('src', newSrc);
        // Add error handler — always fall back to local LOGO.png, never show broken image
        if (!img.dataset.supabasePatched) {
          img.dataset.supabasePatched = '1';
          img.addEventListener('error', function () {
            this.onerror = null; // prevent infinite loop
            this.src = '/LOGO.png';
          }, { once: true });
        }
      }
    });
  }

  /** Patch inline style background-image: url(...) */
  function patchInlineStyles() {
    document.querySelectorAll('[style]').forEach(el => {
      const style = el.getAttribute('style');
      if (!style || !style.includes('background-image')) return;

      const newStyle = style.replace(
        /background-image\s*:\s*url\(['"]?([^'")\s]+)['"]?\)/gi,
        (match, urlVal) => {
          const newUrl = patchSrc(urlVal);
          return newUrl ? `background-image: url('${newUrl}')` : match;
        }
      );

      if (newStyle !== style) {
        el.setAttribute('style', newStyle);
      }
    });
  }

  /** Patch data-bg attributes (some templates use these) */
  function patchDataBg() {
    document.querySelectorAll('[data-bg]').forEach(el => {
      const bg = el.getAttribute('data-bg');
      const newUrl = patchSrc(bg);
      if (newUrl) {
        el.setAttribute('data-bg', newUrl);
        el.style.backgroundImage = `url('${newUrl}')`;
      }
    });
  }

  /** Run all patches */
  function patchAll() {
    patchImgTags();
    patchInlineStyles();
    patchDataBg();
  }

  // ── Build URL map from API ───────────────────────────────────────────────────
  async function loadImagesFromApi() {
    try {
      // Fetch ALL images (no limit — we want the full map)
      const res = await fetch(`${API_ENDPOINT}?limit=500`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      const images = json.data || json || [];

      images.forEach(img => {
        if (img.storage_path && img.image_url) {
          const cleanPath = decodeURIComponent(img.storage_path).replace(/^\.?\//, '').trim();
          imageUrlMap[cleanPath] = img.image_url;
          imageUrlMap[cleanPath.toLowerCase()] = img.image_url;

          // Expose raw filename for fuzzy match lookup
          const filename = cleanPath.split('/').pop();
          if (filename) {
            imageUrlMap[`__filename__${filename.toLowerCase()}`] = img.image_url;
            imageUrlMap[`assets/images/${filename.toLowerCase()}`] = img.image_url;
            imageUrlMap[`assets/images/team/${filename.toLowerCase()}`] = img.image_url;
            imageUrlMap[`assets/images/gallery/${filename.toLowerCase()}`] = img.image_url;
            
            const withoutImagesPrefix = cleanPath.replace(/^images\//, '');
            imageUrlMap[`assets/images/${withoutImagesPrefix.toLowerCase()}`] = img.image_url;
          }
        }
      });

      // Expose global for other scripts
      window.vybeImages = imageUrlMap;
      window.vybeImageBaseUrl = BASE_URL;

      console.log(`[VYBE] Loaded ${images.length} image URLs from Supabase`);
    } catch (err) {
      console.warn('[VYBE] API unavailable, using fallback map:', err.message);
      // Build fallback map from FALLBACK_MAP
      Object.entries(FALLBACK_MAP).forEach(([local, bucketPath]) => {
        const localClean = decodeURIComponent(local).replace(/^\.?\//, '').trim();
        imageUrlMap[localClean] = `${BASE_URL}/${bucketPath}`;
        imageUrlMap[localClean.toLowerCase()] = `${BASE_URL}/${bucketPath}`;
        imageUrlMap[bucketPath] = `${BASE_URL}/${bucketPath}`;
        imageUrlMap[bucketPath.toLowerCase()] = `${BASE_URL}/${bucketPath}`;
      });
    }
  }

  // ── Load configuration from /api/config ─────────────────────────────────────
  async function loadConfig() {
    try {
      const res = await fetch(CONFIG_ENDPOINT);
      if (res.ok) {
        const config = await res.json();
        if (config.supabaseUrl) SUPABASE_URL = config.supabaseUrl;
        if (config.storageBucket) BUCKET = config.storageBucket;
        updateBaseUrl();
        // Expose globally for other scripts
        window.VYBE_CONFIG = { 
          supabaseUrl: SUPABASE_URL,
          storageBucket: BUCKET,
          maxFileSize: config.maxFileSize,
          allowedMimeTypes: config.allowedMimeTypes
        };
        console.log('[VYBE] Config loaded from /api/config');
      }
    } catch (err) {
      console.warn('[VYBE] Config endpoint unavailable, using defaults:', err.message);
      // Set defaults
      window.VYBE_CONFIG = {
        supabaseUrl: SUPABASE_URL,
        storageBucket: BUCKET,
        maxFileSize: 52428800,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
      };
    }
    configLoaded = true;
  }

  // ── MutationObserver: catch dynamically injected images ─────────────────────
  function observeDomChanges() {
    const observer = new MutationObserver(mutations => {
      let needsPatch = false;
      for (const m of mutations) {
        if (m.type === 'childList' && m.addedNodes.length) {
          needsPatch = true;
          break;
        }
        if (m.type === 'attributes') {
          needsPatch = true;
          break;
        }
      }
      if (needsPatch) patchAll();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'style', 'data-bg'],
    });
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  async function init() {
    // 1. Load config first (async, but fast)
    await loadConfig();

    // 2. Apply fallback map immediately (zero-delay first paint)
    Object.entries(FALLBACK_MAP).forEach(([local, bucketPath]) => {
      imageUrlMap[local] = `${BASE_URL}/${bucketPath}`;
      imageUrlMap[`assets/${local.replace(/^assets\//, '')}`] = `${BASE_URL}/${bucketPath}`;
    });
    patchAll();

    // 3. Load full map from API, then re-patch with accurate URLs
    await loadImagesFromApi();
    patchAll();

    // 4. Watch for dynamic content (carousels, lazy loaders, SPAs)
    observeDomChanges();
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Also expose a manual trigger for pages that load content asynchronously
  window.vybeRefreshImages = patchAll;

})();