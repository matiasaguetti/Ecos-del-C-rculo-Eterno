// recursos/js/libros-accordion.js
// Requiere: recursos/js/recursos.js (q, qa, fetchJson)

(function(){
  const PLACEHOLDER = '../assets/recursos/placeholder.jpg'; // relativo a recursos/libros.html
  const accordion = q('#chapterAccordion');
  const chapterButtons = qa('.chapter-btn');
  const overlay = q('#readOverlay');
  const closeBtn = q('#closeModal');
  const modalTitle = q('#modalTitle');
  const modalImage = q('#modalImage');
  const modalText = q('#modalText');

  // Construcción de candidatos de imagen (robusto)
  function buildImageCandidates(p){
    if(!p) return [PLACEHOLDER];
    p = String(p).trim();
    if(/^data:/.test(p) || /^https?:\/\//i.test(p)) return [p];
    const noLeading = p.replace(/^\/+/, '');
    const parts = window.location.pathname.split('/').filter(Boolean);
    const repoPrefix = parts.length ? '/' + parts[0] + '/' : '/';
    return [...new Set([
      repoPrefix + noLeading,
      '/' + noLeading,
      '../' + noLeading,
      noLeading,
      './' + noLeading
    ])];
  }

  // setImageWithFallback sencillo (intenta candidatos en orden)
  function setImageWithFallback(imgEl, candidates){
    let i=0;
    function tryNext(){
      if(i>=candidates.length){ imgEl.onerror = null; imgEl.src = PLACEHOLDER; return; }
      const c = candidates[i++];
      imgEl.onerror = function(){ imgEl.onerror = null; tryNext(); };
      imgEl.onload = function(){ imgEl.onload = null; }; // ok
      imgEl.src = c;
    }
    tryNext();
  }

  // render del acordeón: una lista de enlaces
  async function openChapterList(id, buttonEl){
    const path = `libros-${id}.json`;
    try {
      const posts = await fetchJson(path);
      if(!Array.isArray(posts) || posts.length===0){
        accordion.innerHTML = `<div class="empty-note">No hay entradas en el capítulo ${id}.</div>`;
        return;
      }
      // crear contenedor con animación (acordeón)
      const list = document.createElement('div');
      list.className = 'chapter-list';
      posts.forEach((p, idx) => {
        const item = document.createElement('article');
        item.className = 'chapter-item';
        item.innerHTML = `
          <div class="item-meta">
            <div class="item-title">${escapeHtml(p.title||'Sin título')}</div>
            <div class="item-sub">${p.subtitle ? escapeHtml(p.subtitle) : ''}</div>
            <div class="item-date">${p.date||''}</div>
          </div>
          <div class="item-actions"><a href="#" class="read-link" data-idx="${idx}">Leer →</a></div>
        `;
        list.appendChild(item);
      });
      // reemplazar acordeón (si ya existía, alternar)
      if(accordion.dataset.openFor === id){
        accordion.innerHTML = '';
        delete accordion.dataset.openFor;
      } else {
        accordion.innerHTML = '';
        accordion.appendChild(list);
        accordion.dataset.openFor = id;
      }

      // attach handlers para "Leer"
      Array.from(accordion.querySelectorAll('.read-link')).forEach(a=>{
        a.addEventListener('click', (ev)=>{
          ev.preventDefault();
          const idx = parseInt(a.dataset.idx,10);
          openModalForPost(posts[idx]);
        });
      });

    } catch(e){
      console.error('Error cargando capítulo', e);
      accordion.innerHTML = `<div class="error-note">Error cargando capítulo: ${escapeHtml(String(e.message||e))}</div>`;
    }
  }

  function openModalForPost(p){
    modalTitle.textContent = p.title || 'Sin título';
    // body: si hay subtitle, lo ponemos debajo
    let bodyHtml = '';
    if(p.subtitle) bodyHtml += `<div style="font-style:italic;margin-bottom:8px">${escapeHtml(p.subtitle)}</div>`;
    bodyHtml += formatBody(p.body || '');
    modalText.innerHTML = bodyHtml;
    // imagen
    const imgSrc = (p.images && p.images[0]) ? p.images[0] : null;
    const cands = buildImageCandidates(imgSrc);
    setImageWithFallback(modalImage, cands);
    modalImage.alt = p.title || '';
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeModal(){
    overlay.style.display = 'none';
    document.body.style.overflow = '';
    modalImage.src = ''; // limpiar
    modalText.innerHTML = '';
  }

  // helpers
  function escapeHtml(str){ return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,"&#39;"); }
  function formatBody(text){
    // si contiene HTML, devolver tal cual; sino convertir saltos en <p>
    if(/<\/?[a-z][\s\S]*>/i.test(text)) return text;
    const paras = String(text).split(/\n{2,}/).map(t => `<p>${escapeHtml(t).replace(/\n/g,'<br>')}</p>`);
    return paras.join('');
  }

  // attach events
  chapterButtons.forEach(btn=>{
    btn.addEventListener('click', ()=> openChapterList(btn.dataset.id, btn));
  });
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e)=> { if(e.target === overlay) closeModal(); });
  window.addEventListener('keydown', (e)=> { if(e.key === 'Escape') closeModal(); });

})();
