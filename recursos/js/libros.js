// recursos/js/libros.js (versión corregida: layoutSlides + actualización tras carga de imágenes)
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

  // IMPORTANTE: ruta relativa desde recursos/libros.html -> ../assets/recursos/...
  const PLACEHOLDER = '../assets/recursos/placeholder.jpg';
  let posts = [], current = 0;
  let slideWidth = 0; // ancho efectivo de cada slide en píxeles

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
      // abrimos modal (antes de layout para que el contenedor tenga tamaño)
      overlay.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      scrollTitle.textContent = `Capítulo ${id}`;
      // Esperar un tick para que el modal se pinte y tenga layout
      requestAnimationFrame(()=> {
        // fijar tamaños de las slides según el ancho final del contenedor
        layoutSlides();
      });
      if(modalPrev && modalNext){ modalPrev.parentElement.style.display='block'; modalNext.parentElement.style.display='block'; }
    } catch (e) {
      console.error('openChapter error:', e);
      alert('Error cargando datos: ' + (e.message||e));
    }
  }

  // construir candidatos de ruta para las imágenes (robusto ante project-site / root / relative)
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
        // cuando una imagen carga, recalculamos layout (por si cambia dimensiones)
        requestAnimationFrame(layoutSlides);
      };
      // asigna la src (disparará load/error)
      img.src = candidate;
    }
    tryNext();
  }

  function renderSlides(){
    slidesEl.innerHTML = '';
    posts.forEach((p, idx) => {
      const slideWrap = document.createElement('div');
      slideWrap.style.flex = '0 0 100%'; // fallback si CSS no aplica
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
    // después de construir slides intentamos calcular layout
    requestAnimationFrame(layoutSlides);
  }

  // Calcula ancho en px de la "ventana" visible y fija el ancho de cada slide en px
  function layoutSlides(){
    if(!slidesEl) return;
    // ancho visible del viewport del slideshow
    const visibleWidth = slidesEl.getBoundingClientRect().width;
    // si visibleWidth es 0, el modal probablemente esté oculto; reinentar más tarde
    if(!visibleWidth || visibleWidth < 20) {
      // quita la comprobación y reintenta pronto
      setTimeout(layoutSlides, 120);
      return;
    }
    slideWidth = visibleWidth;
    // fijar cada frame en píxeles para que el translateX funcione con precisión
    Array.from(slidesEl.children).forEach(child => {
      child.style.flex = '0 0 ' + slideWidth + 'px';
      child.style.minWidth = slideWidth + 'px';
    });
    // forzar recálculo y posicionar en la diapositiva actual
    updatePosition();
  }

  function updatePosition(){
    if(!slidesEl) return;
    // si slideWidth no estuviera fijado, usar el ancho actual como fallback
    const w = slideWidth || slidesEl.getBoundingClientRect().width || slidesEl.clientWidth || 0;
    slidesEl.style.transform = `translateX(${ - current * w }px)`;
  }

  // Controles
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

  // cuando cambia el tamaño de la ventana, recalcular
  window.addEventListener('resize', ()=> {
    // re-layout con debounce corto
    clearTimeout(window.__libros_layout_timer);
    window.__libros_layout_timer = setTimeout(()=> {
      layoutSlides();
    }, 120);
  });

})();
