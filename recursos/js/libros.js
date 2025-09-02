// recursos/js/libros.js
// Versión robusta: resuelve rutas candidatas (repo-prefix, absoluta, ../, relativa),
// evita bucles onerror y muestra console.warn para depuración.

(async function(){
  const chapterCards = Array.from(document.querySelectorAll('.chapter-card'));
  const overlay = document.getElementById('scrollOverlay');
  const closeBtn = document.getElementById('closeScroll');
  const slidesEl = document.getElementById('librosSlides');
  const prevBtn = document.getElementById('libPrev');
  const nextBtn = document.getElementById('libNext');
  const modalPrev = document.getElementById('modalPrev');
  const modalNext = document.getElementById('modalNext');
  const scrollTitle = document.getElementById('scrollTitle');

  // Usamos ruta relativa (sin "/" inicial) por defecto.
  const PLACEHOLDER = 'assets/recursos/placeholder.jpg';
  let posts = [], current = 0;

  chapterCards.forEach(c => c.addEventListener('click', async () => {
    const id = c.dataset.id;
    chapterCards.forEach(x=>x.classList.toggle('active', x===c));
    await openChapter(id);
  }));

  async function openChapter(id){
    const path = `libros-${id}.json`;
    try {
      const res = await fetch(path, {cache:'no-store'});
      if(!res.ok) throw new Error('No se encontró ' + path + ' (' + res.status + ')');
      const arr = await res.json();
      if(!Array.isArray(arr) || arr.length===0){
        alert('No hay pergaminos registrados para el capítulo ' + id);
        return;
      }
      posts = arr;
      current = 0;
      renderSlides();
      scrollTitle.textContent = `Capítulo ${id}`;
      overlay.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      if(modalPrev && modalNext){ modalPrev.parentElement.style.display='block'; modalNext.parentElement.style.display='block'; }
    } catch (e) {
      console.error('openChapter error:', e);
      alert('Error cargando datos: ' + (e.message||e));
    }
  }

  // Genera una lista de candidatos para la ruta de imagen.
  function buildImageCandidates(p) {
    if(!p) return [PLACEHOLDER];
    p = String(p).trim();
    // si es data URL o URL absoluta, devolverla sola
    if (/^data:/.test(p) || /^https?:\/\//i.test(p)) return [p];
    // si el usuario puso una barra inicial `/assets/...`, quítasela para probar versiones relativas también
    const noLeading = p.replace(/^\/+/, '');
    // intenta prefix repo (para project pages), absoluto desde raíz, ../, y la ruta tal cual
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    let repoPrefix = '/';
    if (pathParts.length > 0) {
      // asumimos project site: primer segmento es el repo name (por ejemplo /RepoName/recursos/...)
      repoPrefix = '/' + pathParts[0] + '/';
    }
    const candidates = [];
    // 1) repoPrefix + noLeading  -> "/RepoName/assets/recursos/..."
    candidates.push(repoPrefix + noLeading);
    // 2) absolute from site root (leading slash) -> "/assets/recursos/..."
    candidates.push('/' + noLeading);
    // 3) relative one level up from current page -> "../assets/recursos/..."
    candidates.push('../' + noLeading);
    // 4) relative from current folder -> "assets/recursos/..."
    candidates.push(noLeading);
    // 5) two dirs up just in case
    candidates.push('../../' + noLeading);
    // dedupe preserving order
    return [...new Set(candidates)];
  }

  // Setea img.src probando candidatos uno a uno hasta que uno funcione.
  function setImageWithFallback(img, candidates) {
    let idx = 0;
    function tryNext() {
      if (idx >= candidates.length) {
        console.warn('Todas las rutas candidatas fallaron. Asignando placeholder:', PLACEHOLDER);
        img.onerror = null;
        img.src = PLACEHOLDER;
        return;
      }
      const candidate = candidates[idx++];
      // asignar y esperar onerror
      img.onerror = function() {
        console.warn('Falló cargar imagen, intentando siguiente candidato:', candidate);
        // quitar handler actual y probar siguiente
        img.onerror = null;
        tryNext();
      };
      img.src = candidate;
    }
    tryNext();
  }

  function renderSlides(){
    slidesEl.innerHTML = '';
    posts.forEach((p, i) => {
      const rawImg = (p.images && p.images[0]) ? p.images[0] : null;
      const candidates = buildImageCandidates(rawImg);

      const slideWrap = document.createElement('div');
      slideWrap.style.minWidth = '100%';
      slideWrap.style.boxSizing = 'border-box';

      const inner = document.createElement('div');
      inner.className = 'scroll-slide';

      const img = document.createElement('img');
      img.className = 'scroll-image';
      img.alt = p.title || '';

      // seteo con fallback
      setImageWithFallback(img, candidates);

      const textWrap = document.createElement('div');
      textWrap.className = 'scroll-text';

      const h3 = document.createElement('h3'); h3.textContent = p.title || 'Sin título';
      if(p.subtitle){
        const em = document.createElement('div'); em.style.fontStyle='italic'; em.style.marginBottom='8px'; em.textContent = p.subtitle;
        textWrap.appendChild(em);
      }
      const dateEl = document.createElement('div'); dateEl.className='date'; dateEl.style.color='#6b6b6b'; dateEl.style.marginBottom='8px'; dateEl.textContent = p.date || '';

      const bodyEl = document.createElement('div');
      const bodyStr = p.body || '';
      const looksLikeHTML = /<\/?[a-z][\s\S]*>/i.test(bodyStr);
      if(looksLikeHTML){
        bodyEl.innerHTML = bodyStr;
      } else {
        const paragraphs = String(bodyStr).split(/\n{2,}/).map(s=>s.replace(/\n/g,'<br>'));
        bodyEl.innerHTML = paragraphs.map(t=>`<p>${t}</p>`).join('');
      }

      textWrap.appendChild(h3);
      textWrap.appendChild(dateEl);
      textWrap.appendChild(bodyEl);

      inner.appendChild(img);
      inner.appendChild(textWrap);
      slideWrap.appendChild(inner);
      slidesEl.appendChild(slideWrap);
    });
    updatePosition();
  }

  function updatePosition(){
    slidesEl.style.transform = `translateX(${ - current * 100 }%)`;
  }

  // controls
  const nextBtnEl = document.getElementById('libNext');
  const prevBtnEl = document.getElementById('libPrev');
  if(nextBtnEl) nextBtnEl.addEventListener('click', ()=>{ if(current < posts.length-1) current++; updatePosition(); });
  if(prevBtnEl) prevBtnEl.addEventListener('click', ()=>{ if(current > 0) current--; updatePosition(); });
  if(modalNext) modalNext.addEventListener('click', ()=>{ if(current < posts.length-1) current++; updatePosition(); });
  if(modalPrev) modalPrev.addEventListener('click', ()=>{ if(current > 0) current--; updatePosition(); });

  closeBtn.addEventListener('click', closeOverlay);
  overlay.addEventListener('click', (e)=>{ if(e.target === overlay) closeOverlay(); });
  window.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeOverlay(); });

  function closeOverlay(){
    overlay.style.display = 'none';
    document.body.style.overflow = '';
    posts = [];
    slidesEl.innerHTML = '';
    if(modalPrev && modalNext){ modalPrev.parentElement.style.display='none'; modalNext.parentElement.style.display='none'; }
  }
})();
