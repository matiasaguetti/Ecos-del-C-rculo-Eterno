// recursos/js/libros.js (versión modal — reemplaza todo el archivo con esto)
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
  const PLACEHOLDER = '/assets/recursos/placeholder.jpg';
  let posts = [], current = 0;

  chapterCards.forEach(c => c.addEventListener('click', async () => {
    const id = c.dataset.id;
    chapterCards.forEach(x=>x.classList.toggle('active', x===c));
    await openChapter(id);
  }));

  async function openChapter(id){
    const path = `libros-${id}.json`;
    try {
      const arr = await fetch(path, {cache:'no-store'}).then(r=>{ if(!r.ok) throw new Error('Not found'); return r.json() });
      if(!Array.isArray(arr) || arr.length===0){
        alert('No hay pergaminos registrados para el capítulo ' + id);
        return;
      }
      posts = arr;
      current = 0;
      renderSlides();
      // set title: use chapter title or first post's subtitle if available
      const chapterLabel = `Capítulo ${id}`;
      scrollTitle.textContent = chapterLabel;
      overlay.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      // show big modal nav buttons
      if(modalPrev && modalNext){ modalPrev.parentElement.style.display='block'; modalNext.parentElement.style.display='block'; }
    } catch (e) {
      console.error(e);
      alert('Error cargando datos: ' + (e.message||e));
    }
  }

  function normalizeImagePath(p) {
    if(!p) return PLACEHOLDER;
    p = String(p).trim();
    if (/^data:/.test(p) || /^https?:\/\//i.test(p) || p.startsWith('/')) return p;
    if (/^assets[\/\\]/i.test(p)) return '/' + p.replace(/^[\/\\]+/, '');
    if (/^(\.\/|\.\.\/)/.test(p)) return p;
    return '/assets/' + p.replace(/^[\/\\]+/, '');
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
      img.onerror = function(){ console.warn('Imagen no cargada:', img.src); img.src = PLACEHOLDER; };

      const textWrap = document.createElement('div');
      textWrap.className = 'scroll-text';

      const h3 = document.createElement('h3'); h3.textContent = p.title || 'Sin título';
      const subtitle = document.createElement('div');
      if(p.subtitle) {
        const em = document.createElement('div');
        em.style.fontStyle = 'italic';
        em.style.marginBottom = '8px';
        em.textContent = p.subtitle;
        subtitle.appendChild(em);
      }
      const dateEl = document.createElement('div'); dateEl.className='date'; dateEl.style.color='#6b6b6b'; dateEl.style.marginBottom='8px'; dateEl.textContent = p.date || '';

      const bodyEl = document.createElement('div');
      const bodyStr = p.body || '';
      const looksLikeHTML = /<\/?[a-z][\s\S]*>/i.test(bodyStr);
      if(looksLikeHTML){
        bodyEl.innerHTML = bodyStr;
      } else {
        // preserve line breaks: convert \n to <p>
        const paragraphs = String(bodyStr).split(/\n{2,}/).map(s=>s.replace(/\n/g,'<br>'));
        bodyEl.innerHTML = paragraphs.map(t=>`<p>${t}</p>`).join('');
      }

      textWrap.appendChild(h3);
      if(p.subtitle) textWrap.appendChild(subtitle);
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
