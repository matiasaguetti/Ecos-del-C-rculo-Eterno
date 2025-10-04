// recursos/js/recursos.js (mejorado - opcional)
function q(sel, root) { return (root||document).querySelector(sel); }
function qa(sel, root) { return Array.from((root||document).querySelectorAll(sel)); }

/**
 * fetchJson(path[, opts])
 * - path: URL relativa/absoluta del JSON
 * - opts.timeout: ms tras los cuales rechaza (opcional)
 */
async function fetchJson(path, opts = {}) {
  const controller = new AbortController();
  const timeout = opts.timeout || 8000;
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const resp = await fetch(path, { cache: 'no-store', signal: controller.signal });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`fetchJson: ${path} -> ${resp.status}`);
    const j = await resp.json();
    return j;
  } catch (err) {
    console.error('fetchJson error', path, err);
    throw err;
  }
}
