// recursos/js/libros.js
(async function(){
  const chapterCards = Array.from(document.querySelectorAll('.chapter-card'));
  const overlay = document.getElementById('scrollOverlay');
  const modal = document.getElementById('scrollModal');
  const closeBtn = document.getElementById('closeScroll');
  const slidesEl = document.getElementById('librosSlides');
  const prevBtn = document.getElementById('libPrev');
  const nextBtn = document.getElementById('libNext');
  let posts = [], current = 0;

  chapterCards.forEach(c => c.addEventListener('click', async () => {
    const id = c.dataset.id;
    chapterCards.forEach(x=>x.classList.toggle('active', x===c));
    await openChapter(id);
  }));

  async function openChapter(id){
    const path = `libros-${id}.json`;
    try {
      const arr = await fetchJson(path);
      if(!Array.isArray(arr) || arr.length===0){
        alert('No hay pergaminos registrados para el capítulo ' + id);
        return;
      }
      posts = arr;
      current = 0;
      renderSlides();
      overlay.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    } catch (e) {
      console.error(e);
      alert('Error cargando datos: ' + (e.message||e));
    }
  }

  function renderSlides(){
    slidesEl.innerHTML = '';
    posts.forEach((p, i) => {
      const imgSrc = (p.images && p.images[0]) ? p.images[0] : 'assets/recursos/placeholder.jpg';
      const slideWrap = document.createElement('div');
      slideWrap.innerHTML = `
        <div class="scroll-slide">
          <img class="scroll-image" src="${escapeHtml(imgSrc)}" alt="${escapeHtml(p.title||'')}" />
          <div class="scroll-text">
            <h3>${escapeHtml(p.title||'Sin título')}</h3>
            <div class="date">${escapeHtml(p.date||'')}</div>
            <div class="body-content">${escapeHtml(p.body||'')}</div>
          </div>
        </div>
      `;
      slidesEl.appendChild(slideWrap);
    });
    updatePosition();
  }

  function updatePosition(){
    slidesEl.style.transform = `translateX(${ - current * 100 }%)`;
  }

  nextBtn.addEventListener('click', ()=>{ if(current < posts.length-1) current++; updatePosition(); });
  prevBtn.addEventListener('click', ()=>{ if(current > 0) current--; updatePosition(); });

  closeBtn.addEventListener('click', closeOverlay);
  overlay.addEventListener('click', (e)=>{ if(e.target === overlay) closeOverlay(); });
  window.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeOverlay(); });

  function closeOverlay(){
    overlay.style.display = 'none';
    document.body.style.overflow = '';
    posts = [];
    slidesEl.innerHTML = '';
  }

  function escapeHtml(str){ return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
})();
