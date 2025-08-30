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
    // for now expect file: libros-<id>.json inside same folder (/recursos/)
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
      const item = document.createElement('div');
      item.style.minWidth = '100%';
      item.style.boxSizing = 'border-box';
      item.innerHTML = `
        <div style="display:flex;gap:12px;align-items:flex-start">
          <img src="${(p.images && p.images[0]) ? p.images[0] : 'assets/recursos/placeholder.jpg'}" class="scroll-image" alt="${p.title||''}" style="max-width:320px; width:40%;"/>
          <div style="width:60%">
            <h3 style="margin-top:0">${escapeHtml(p.title||'Sin título')}</h3>
            <div style="color:#6b6b6b;font-size:13px;margin-bottom:8px">${escapeHtml(p.date||'')}</div>
            <div>${escapeHtml(p.body||'')}</div>
          </div>
        </div>
      `;
      slidesEl.appendChild(item);
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

  // small helper
  function escapeHtml(str){ return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
})();
