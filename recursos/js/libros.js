// recursos/js/libros.js (corrección: rutas relativas, onerror seguro, debug)
(async function(){
  const chapterCards = Array.from(document.querySelectorAll('.chapter-card'));
  const overlay = document.getElementById('scrollOverlay');
  const modal = document.getElementById('scrollModal');
  const closeBtn = document.getElementById('closeScroll');
  const slidesEl = document.getElementById('librosSlides');
  const prevBtn = document.getElementById('libPrev');
  const nextBtn = document.getElementById('libNext');
  const modalPrev = document.getElementById('modalPrev');
  const modalNext = document.getElementById('modalNext');
  const scrollTitle = document.getElementById('scrollTitle');

  // Use rutas RELATIVAS (sin "/" inicial) para GitHub Pages en repositorios de proyecto.
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

  // Normaliza rutas: conserva rutas absolutas completas y quita "/" inicial para rutas locales.
  function normalizeImagePath(p) {
    if(!p) return PLACEHOLDER;
    p = String(p).trim();
    if (/^data:/.test(p) || /^https?:\/\//i.test(p)) return p; // data URL o URL externa -> OK
    // Si el autor puso una ruta con barra inicial "/assets/..." la convertimos a relativa "assets/..."
    if (p.startsWith('/')) p = p.replace(/^\/+/, '');
    // Si empieza por "assets/" la dejamos tal cual (ruta relativa desde la página)
    return p;
  }

  function renderSlides(){
    slidesEl.innerHTML = '';
    posts.forEach((p, i) => {
      const imgSrc = normalizeImagePath((p.images && p.images[0]) ? p.images[0] : null);
      const slideWrap = document.createElement('div');
      slideWrap.style.minWidth = '100%';
      slideWrap.style.boxSizing = 'border-box';

      const inner = document.createElement('div');
      inner.className = 'scroll-slide';

      const img = document.createElement('img');
      img.className = 'scroll-image';
      img.src = imgSrc;
      img.alt = p.title || '';
      // onerror seguro: solo asigna placeholder si no es ya el placeholder
      img.onerror = function(){
        console.warn('Imagen no cargada (requested):', imgSrc);
        // si ya es placeholder, no hacer nada más (evita bucle)
        if (!img.src || img.src.indexOf(PLACEHOLDER) !== -1) {
          console.warn('Placeholder también falló o ya está asignado:', img.src);
          return;
        }
        img.src = PLACEHOLDER;
      };

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

  nextBtn.addEventListener('click', ()=>{ if(current < posts.length-1) current++; updatePosition(); });
  prevBtn.addEventListener('click', ()=>{ if(current > 0) current--; updatePosition(); });
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
