// recursos/js/recursos.js
// Helpers que pueden usarse desde otras páginas de recursos

function q(sel, root) { return (root||document).querySelector(sel); }
function qa(sel, root) { return Array.from((root||document).querySelectorAll(sel)); }

function fetchJson(path){
  return fetch(path, {cache:'no-store'}).then(r => {
    if(!r.ok) throw new Error('No se pudo cargar: ' + path + ' ('+r.status+')');
    return r.json();
  });
}
