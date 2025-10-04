// recursos/js/libros.js (versión corregida: layoutSlides + gap-aware translate)
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

  // ruta relativa desde recursos/libros.html hacia assets/recursos
  const PLACEHOLDER = '../assets/recursos/placeholder.jpg';
  let posts = [], current = 0;
  let slideWidth = 0;  // ancho visible por slide (px)
  let slideGap = 0;    // gap entre slides (px)
  let slideStep = 0;   // paso = slideWidth + slideGap

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
      overlay.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      scrollTitle.textContent = `Capítulo ${id}`;
      // forzar layout después de pintar
      requestAnimationFrame(()=> layoutSlides());
      if(modalPrev && modalNext){ modalPrev.parentElement.style.display='block'; modalNext.parentElement.style.display='block'; }
    } catch (e) {
      console.error('openChapter error:', e);
      alert('Error cargando datos: ' + (e.message||e));
    }
  }

  function buildImageCandidates(p) {
    if(!p) return [PLACEHOLDER];
    p = String(p).trim();
    if (/^data:/.test(p) || /^https?:\/\//i.test(p)) return [p];
    const noLeading = p.replace(/^\/+/, '');
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    let repoPrefix = '/';
    if (pathParts.length > 0) repoPrefix = '/' + pathParts[0] + '/';
    const candidates = [
      repoPrefix + noLeading,
      '/' + noLeading,
      '../' + noLeading,
      noLeading,
      './' + noLeading,
    ];
    return [...new Set(candidates)];
  }

  function setImageWithFallback(img, candidates) {
    let idx = 0;
    function tryNext() {
      if (idx >= candidates.length) {
        img.onerror = null;
        img.src = PLACEHOLDER;
        return;
      }
      const candidate = candidates[idx++];
      img.onerror = function(){
        img.onerror = null;
        tryNext();
      };
      img.onload = function(){
        img.onload = null;
        // recalc layout cuando una imagen termine de cargar
        requestAnimationFrame(layoutSlides);
      };
      img.src = candidate;
    }
    tryNext();
  }

  function renderSlides(){
    slidesEl.innerHTML = '';
    posts.forEach((p, idx) => {
      const slideWrap = document.createElement('div');
      slideWrap.style.flex = '0 0 100%';
      slideWrap.style.boxSizing = 'border-box';
      slideWrap.style.padding = '12px';

      const slideInner = document.createElement('div');
      slideInner.className = 'scroll-slide';

      const img = document.createElement('img');
      img.className = 'scroll-image';
      img.alt = p.title || '';
      const raw = (p.images && p.images[0]) ? p.images[0] : null;
      const candidates = buildImageCandidates(raw);
      setImageWithFallback(img, candidates);

      const textWrap = document.createElement('div');
      textWrap.className = 'scroll-text';
      const h3 = document.createElement('h3'); h3.textContent = p.title || 'Sin título';
      textWrap.appendChild(h3);
      if(p.subtitle){
        const em = document.createElement('div'); em.style.fontStyle = 'italic'; em.style.marginBottom = '8px'; em.textContent = p.subtitle;
        textWrap.appendChild(em);
      }
      if(p.date){
        const dateEl = document.createElement('div'); dateEl.className = 'date'; dateEl.style.color = '#6b6b6b'; dateEl.style.marginBottom = '8px'; dateEl.textContent = p.date;
        textWrap.appendChild(dateEl);
      }

      const bodyEl = document.createElement('div');
      const bodyStr = p.body || '';
      const looksLikeHTML = /<\/?[a-z][\s\S]*>/i.test(bodyStr);
      if(looksLikeHTML){
        bodyEl.innerHTML = bodyStr;
      } else {
        const paragraphs = String(bodyStr).split(/\n{2,}/).map(s => s.replace(/\n/g,'<br>'));
        bodyEl.innerHTML = paragraphs.map(t => `<p>${t}</p>`).join('');
      }
      textWrap.appendChild(bodyEl);

      slideInner.appendChild(img);
      slideInner.appendChild(textWrap);
      slideWrap.appendChild(slideInner);
      slidesEl.appendChild(slideWrap);
    });

    // después de crear slides intentar layout
    requestAnimationFrame(layoutSlides);
  }

  // layoutSlides ahora calcula gap y paso (slideWidth + gap)
  function layoutSlides(){
    if(!slidesEl) return;
    const visibleWidth = slidesEl.getBoundingClientRect().width;
    if(!visibleWidth || visibleWidth < 20) { setTimeout(layoutSlides, 120); return; }
    slideWidth = visibleWidth;
    const cs = getComputedStyle(slidesEl);
    // 'gap' es soportado por los navegadores modernos; fallback a columnGap si existe
    slideGap = parseFloat(cs.gap) || parseFloat(cs.columnGap) || 0;
    slideStep = slideWidth + slideGap;
    // fijar cada frame en píxeles (evita porcentajes problemáticos)
    Array.from(slidesEl.children).forEach(child => {
      child.style.flex = '0 0 ' + slideWidth + 'px';
      child.style.minWidth = slideWidth + 'px';
    });
    updatePosition();
  }

  function updatePosition(){
    if(!slidesEl) return;
    const step = slideStep || (slideWidth || slidesEl.getBoundingClientRect().width);
    slidesEl.style.transform = `translateX(${ - current * step }px)`;
  }

  // controles
  if(nextBtn) nextBtn.addEventListener('click', ()=>{ if(current < posts.length-1) current++; updatePosition(); });
  if(prevBtn) prevBtn.addEventListener('click', ()=>{ if(current > 0) current--; updatePosition(); });
  if(modalNext) modalNext.addEventListener('click', ()=>{ if(current < posts.length-1) current++; updatePosition(); });
  if(modalPrev) modalPrev.addEventListener('click', ()=>{ if(current > 0) current--; updatePosition(); });

  // cerrar modal
  if(closeBtn) closeBtn.addEventListener('click', closeOverlay);
  overlay.addEventListener('click', (e)=>{ if(e.target === overlay) closeOverlay(); });
  window.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closeOverlay(); });

  function closeOverlay(){
    overlay.style.display = 'none';
    document.body.style.overflow = '';
    posts = [];
    slidesEl.innerHTML = '';
    if(modalPrev && modalNext){ modalPrev.parentElement.style.display = 'none'; modalNext.parentElement.style.display = 'none'; }
  }

  // resize -> relayout
  window.addEventListener('resize', ()=> {
    clearTimeout(window.__libros_layout_timer);
    window.__libros_layout_timer = setTimeout(()=> { layoutSlides(); }, 120);
  });

})();
