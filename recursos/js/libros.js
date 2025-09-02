// recursos/js/libros.js
// Slideshow modal para "Libros y Pergaminos" — versión robusta y auto-resolución de rutas.
(async function(){
  // elementos
  const chapterCards = Array.from(document.querySelectorAll('.chapter-card'));
  const overlay = document.getElementById('scrollOverlay');
  const closeBtn = document.getElementById('closeScroll');
  const slidesEl = document.getElementById('librosSlides');
  const prevBtn = document.getElementById('libPrev');
  const nextBtn = document.getElementById('libNext');
  const modalPrev = document.getElementById('modalPrev');
  const modalNext = document.getElementById('modalNext');
  const scrollTitle = document.getElementById('scrollTitle');

  const PLACEHOLDER = '../assets/recursos/placeholder.jpg'; // ruta relativa a recursos/libros.html -> assets/recursos/.. (puede resolverse)
  let posts = [], current = 0;

  // listener para capítulos
  chapterCards.forEach(c => c.addEventListener('click', async () => {
    const id = c.dataset.id;
    chapterCards.forEach(x => x.classList.toggle('active', x === c));
    await openChapter(id);
  }));

  async function openChapter(id){
    const path = `libros-${id}.json`;
    try {
      const arr = await fetch(path, {cache:'no-store'}).then(r=>{
        if(!r.ok) throw new Error(`${path} not found (${r.status})`);
        return r.json();
      });
      if(!Array.isArray(arr) || arr.length === 0){
        alert('No hay pergaminos registrados para el capítulo ' + id);
        return;
      }
      posts = arr;
      current = 0;
      renderSlides();
      scrollTitle.textContent = `Capítulo ${id}`;
      overlay.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      // mostrar flechas externas si existen
      if(modalPrev && modalNext){ modalPrev.parentElement.style.display = 'block'; modalNext.parentElement.style.display = 'block'; }
    } catch (e) {
      console.error('openChapter error', e);
      alert('Error cargando datos: ' + (e.message||e));
    }
  }

  // crea una lista de candidatos de ruta para intentar cargar la imagen
  function buildImageCandidates(p){
    if(!p) return [PLACEHOLDER];
    p = String(p).trim();
    if (/^data:/.test(p) || /^https?:\/\//i.test(p)) return [p];
    const noLeading = p.replace(/^\/+/, ''); // quita leading slash si existe
    // intenta distintas formas: prefix repo (project site), root absolute, parent-dir, relative
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    let repoPrefix = '/';
    if (pathParts.length > 0) repoPrefix = '/' + pathParts[0] + '/';
    const candidates = [
      repoPrefix + noLeading,   // /RepoName/assets/...
      '/' + noLeading,          // /assets/...
      '../' + noLeading,        // ../assets/...
      noLeading,                // assets/...
      './' + noLeading,         // ./assets/...
    ];
    // eliminar duplicados
    return [...new Set(candidates)];
  }

  // intenta asignar candidatos hasta que uno funcione (comprobamos con Image onload/onerror)
  function setImageWithFallback(img, candidates){
    let i = 0;
    function tryNext(){
      if(i >= candidates.length){
        img.onerror = null;
        img.src = PLACEHOLDER;
        return;
      }
      const candidate = candidates[i++];
      img.onerror = function(){
        // si falla, probar siguiente candidato
        img.onerror = null;
        tryNext();
      };
      img.onload = function(){
        img.onload = null;
        // ok, cargó
      };
      // asigna src (esto disparará onload/onerror)
      img.src = candidate;
    }
    tryNext();
  }

  function renderSlides(){
    slidesEl.innerHTML = '';
    // crear un slide por post
    posts.forEach((p, idx) => {
      const slideWrap = document.createElement('div');
      // fuerza anchura exacta: 100% del contenedor visible
      slideWrap.style.flex = '0 0 100%';
      slideWrap.style.boxSizing = 'border-box';
      // inner slide: estructura, img + texto
      const slideInner = document.createElement('div');
      slideInner.className = 'scroll-slide';

      // imagen (usar candidato)
      const img = document.createElement('img');
      img.className = 'scroll-image';
      img.alt = p.title || '';
      const raw = (p.images && p.images[0]) ? p.images[0] : null;
      const candidates = buildImageCandidates(raw);
      setImageWithFallback(img, candidates);

      // texto
      const textWrap = document.createElement('div');
      textWrap.className = 'scroll-text';
      const h3 = document.createElement('h3');
      h3.textContent = p.title || 'Sin título';
      textWrap.appendChild(h3);
      if(p.subtitle){
        const em = document.createElement('div');
        em.style.fontStyle = 'italic';
        em.style.marginBottom = '8px';
        em.textContent = p.subtitle;
        textWrap.appendChild(em);
      }
      const dateEl = document.createElement('div');
      dateEl.className = 'date';
      dateEl.style.color = '#6b6b6b';
      dateEl.style.marginBottom = '8px';
      dateEl.textContent = p.date || '';
      textWrap.appendChild(dateEl);

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

      // agregar a slide
      slideInner.appendChild(img);
      slideInner.appendChild(textWrap);
      slideWrap.appendChild(slideInner);
      slidesEl.appendChild(slideWrap);
    });

    // ajustar ancho del contenedor (no estrictamente necesario con flex, pero lo dejamos claro)
    // slidesEl.style.width = `${posts.length * 100}%`; // no necesario si usamos flex children fijos
    // posicion inicial
    current = 0;
    updatePosition();
  }

  // usamos desplazamiento en píxeles para evitar problemas de porcentajes dudosos
  function updatePosition(){
    const containerWidth = slidesEl.clientWidth;
    slidesEl.style.transform = `translateX(${ - current * containerWidth }px)`;
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

  // Recálculo cuando se redimensiona (mantener referencia de posición)
  window.addEventListener('resize', ()=> {
    // fuerza recálculo de posición en px cuando cambia el ancho del contenedor
    updatePosition();
  });

})();
