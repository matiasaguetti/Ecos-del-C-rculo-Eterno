// === Data Loading ===
// Ahora loadSlidesJson intenta:
// 1) leer chapters.json -> por cada capítulo intenta cargar slides-<id>.json
// 2) si chapters.json no existe o no encuentra slides-<id>.json, hace fallback a slides.json
let allPosts = [];

async function loadSlidesJson() {
  allPosts = [];
  // try chapters.json
  try {
    const chResp = await fetch('chapters.json', { cache: 'no-store' });
    if (chResp.ok) {
      const chList = await chResp.json();
      if (Array.isArray(chList) && chList.length > 0) {
        // for each chapter try to load slides-<id>.json
        for (const ch of chList) {
          const cid = String(ch.id);
          const fname = `slides-${cid}.json`;
          try {
            const r = await fetch(fname, { cache: 'no-store' });
            if (r.ok) {
              const arr = await r.json();
              if (Array.isArray(arr)) {
                // mantén el orden tal como viene en cada archivo
                allPosts = allPosts.concat(arr);
                // make the chapter wrapper visible and set title if present
                const wrapper = document.getElementById(`chapter${cid.padStart(2,'0')}-wrapper`);
                if (wrapper) wrapper.style.display = '';
                const ct = document.querySelector(`#chapter${cid.padStart(2,'0')}-wrapper .chapter-title`);
                if (ct && ch.title) {
                  // Update chapter title while preserving the text-only link
                  const textOnlyLink = ct.querySelector('.text-only-link');
                  const newTitle = `Capítulo ${cid}: ${ch.title}`;
                  if (textOnlyLink) {
                    ct.innerHTML = `${newTitle} <a href="chapter-text.html?chapter=${cid}" target="_blank" class="text-only-link">[Versión Solo Texto]</a>`;
                  } else {
                    ct.textContent = newTitle;
                  }
                }
                // dynamic wrappers: if you used dynamic creation, initDynamicChapters will handle it
              } else {
                console.warn(fname, 'no contiene un array');
              }
            } else {
              // file not found -> continue silently
              console.warn('No existe', fname);
            }
          } catch (e) {
            console.warn('Error cargando', fname, e);
          }
        }
        return; // allPosts poblado por capítulos existentes
      }
    }
  } catch (e) {
    console.warn('No se pudo cargar chapters.json', e);
  }

  // fallback: cargar slides.json entero (antiguo comportamiento)
  try {
    const resp = await fetch('slides.json', { cache: 'no-store' });
    if (resp.ok) {
      const arr = await resp.json();
      if (Array.isArray(arr)) allPosts = arr;
    } else {
      console.warn('slides.json no disponible:', resp.status);
      allPosts = [];
    }
  } catch (e) {
    console.warn('Error al obtener slides.json', e);
    allPosts = [];
  }
}

function postsForChapter(chapter) {
  if (!Array.isArray(allPosts)) return [];
  return allPosts.filter(p => {
    if (p.chapter) return String(p.chapter) === String(chapter);
    return chapter === '01';
  });
}

// === Slideshow Factory ===
function createSlideshow(prefix, chapter) {
  const slidesContainer = document.getElementById(`slides-${prefix}`);
  const dotsContainer = document.getElementById(`dots-${prefix}`);
  const prevBtn = document.getElementById(`prev-${prefix}`);
  const nextBtn = document.getElementById(`next-${prefix}`);

  let posts = postsForChapter(chapter).slice();
  let current = 0;
  let timer = null;
  const interval = 6000;

  function build() {
    if (!slidesContainer || !dotsContainer) return;
    slidesContainer.innerHTML = '';
    dotsContainer.innerHTML = '';

    if (!posts.length) {
      slidesContainer.innerHTML = `
        <section class="slide">
          <div class="slide-media">
            <img src="assets/placeholder.jpg" alt="placeholder">
          </div>
          <div class="slide-meta">
            <h3>Sin entradas</h3>
            <div class="date">—</div>
            <p>No hay entradas para este capítulo.</p>
          </div>
        </section>`;
      const d = document.createElement('div');
      d.className = 'dot active';
      dotsContainer.appendChild(d);
      return;
    }

    posts.forEach((p, idx) => {
      const imgSrc = (p.images && p.images[0]) ? p.images[0] : 'assets/placeholder.jpg';
      const short = excerpt(p.body || '', 300);
      const slide = document.createElement('section');
      slide.className = 'slide';
      slide.innerHTML = `
        <div class="slide-media">
          <img src="${imgSrc}" alt="${escapeHtml(p.title || 'captura')}">
        </div>
        <div class="slide-meta">
          <h3>${escapeHtml(p.title || 'Sin título')}</h3>
          <div class="date">${escapeHtml(p.date || '')}</div>
          <p>${escapeHtml(short)}</p>
          <button class="read-more" data-id="${p.id}">Seguir leyendo</button>
        </div>`;
      slidesContainer.appendChild(slide);

      const d = document.createElement('div');
      d.className = 'dot';
      d.dataset.idx = idx;
      d.addEventListener('click', () => goTo(idx));
      dotsContainer.appendChild(d);
    });
    updateDots(0);
  }

  function show(i) {
    if (!slidesContainer) return;
    const slides = slidesContainer.children;
    const n = slides.length;
    if (n === 0) return;
    current = ((i % n) + n) % n;
    slidesContainer.style.transform = `translateX(${-current * 100}%)`;
    updateDots(current);
  }

  function next() { show(current + 1) }
  function prev() { show(current - 1) }
  function goTo(i) { show(i); resetTimer(); }

  function updateDots(active) {
    if (!dotsContainer) return;
    dotsContainer.querySelectorAll('.dot').forEach((d, idx) =>
      d.classList.toggle('active', idx === active));
  }

  // Timer controls
  function startTimer() {
    if (timer) clearInterval(timer);
    timer = setInterval(() => next(), interval);
  }

  function pause() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function resume() {
    if (!timer) {
      timer = setInterval(() => next(), interval);
    }
  }

  function resetTimer() {
    pause();
    startTimer();
  }

  // Event listeners
  nextBtn && nextBtn.addEventListener('click', () => {
    next();
    resetTimer();
  });

  prevBtn && prevBtn.addEventListener('click', () => {
    prev();
    resetTimer();
  });

  // Pause on hover
  const parentSlideshow = slidesContainer && slidesContainer.closest('.slideshow');
  if (parentSlideshow) {
    parentSlideshow.addEventListener('mouseenter', () => {
      if (timer) clearInterval(timer);
    });
    parentSlideshow.addEventListener('mouseleave', () => {
      startTimer();
    });
  }

  function indexOfPostId(postId) {
    for (let i = 0; i < posts.length; i++) {
      if (String(posts[i].id) === String(postId)) return i;
    }
    return -1;
  }

  // Register instance globally
  const instance = {
    prefix, chapter, build, show, startTimer, pause, resume, resetTimer, posts, indexOfPostId
  };
  window.ecdSlideshows = window.ecdSlideshows || [];
  window.ecdSlideshows.push(instance);

  return instance;
}

// === Utility Functions ===
function excerpt(text, max = 420) {
  if (!text) return '';
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return cut.slice(0, lastSpace > 40 ? lastSpace : max) + '…';
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, "&#39;");
}

// === Modal Logic ===
const modalOverlay = document.getElementById('modalOverlay');
const modalImage = document.getElementById('modalImage');
const modalTitle = document.getElementById('modalTitle');
const modalDate = document.getElementById('modalDate');
const modalText = document.getElementById('modalText');
const modalClose = document.getElementById('modalClose');
const modalPrevBtn = document.getElementById('modalPrev');
const modalNextBtn = document.getElementById('modalNext');
const modalNavLeft = document.getElementById('modalNavLeft');
const modalNavRight = document.getElementById('modalNavRight');

let modalContext = { instance: null, index: null };

function pauseAllSlides() {
  if (!window.ecdSlideshows) return;
  window.ecdSlideshows.forEach(s => {
    try {
      s.pause && s.pause();
    } catch (e) {
      console.warn('pause slide error', e);
    }
  });
}

function resumeAllSlides() {
  if (!window.ecdSlideshows) return;
  window.ecdSlideshows.forEach(s => {
    try {
      s.resume && s.resume();
    } catch (e) {
      console.warn('resume slide error', e);
    }
  });
}

function updateModalForContext() {
  const ctx = modalContext;
  if (!ctx.instance || typeof ctx.index !== 'number') return;
  const post = ctx.instance.posts[ctx.index];
  if (!post) return;

  // Update modal content
  const img = (post.images && post.images[0]) ? post.images[0] : 'assets/placeholder.jpg';
  modalImage.src = img;
  modalImage.alt = post.title || 'imagen';
  modalTitle.textContent = post.title || '';
  modalDate.textContent = post.date || '';
  modalText.textContent = post.body || '';

  // Update underlying slideshow
  try {
    ctx.instance.show(ctx.index);
  } catch (e) {
    // ignore
  }

  // Update navigation buttons
  if (ctx.index <= 0) {
    modalPrevBtn.setAttribute('disabled', 'disabled');
  } else {
    modalPrevBtn.removeAttribute('disabled');
  }

  if (ctx.index >= ctx.instance.posts.length - 1) {
    modalNextBtn.setAttribute('disabled', 'disabled');
  } else {
    modalNextBtn.removeAttribute('disabled');
  }
}

function openModalWithPost(post) {
  if (!post) return;

  pauseAllSlides();

  // Find instance that contains this post
  modalContext.instance = null;
  modalContext.index = null;

  if (window.ecdSlideshows && window.ecdSlideshows.length) {
    for (const inst of window.ecdSlideshows) {
      const idx = inst.indexOfPostId && inst.indexOfPostId(post.id);
      if (typeof idx === 'number' && idx >= 0) {
        modalContext.instance = inst;
        modalContext.index = idx;
        break;
      }
    }
  }

  // Fallback
  if (!modalContext.instance) {
    modalContext.instance = {
      posts: (allPosts || []),
      show: function(i) { /* no-op */ },
      indexOfPostId: function(id) {
        return (allPosts || []).findIndex(p => String(p.id) === String(id));
      }
    };
    modalContext.index = modalContext.instance.indexOfPostId(post.id);
    if (modalContext.index < 0) modalContext.index = 0;
  }

  updateModalForContext();

  // Show navigation
  modalNavLeft.style.display = 'block';
  modalNavRight.style.display = 'block';
  modalNavLeft.setAttribute('aria-hidden', 'false');
  modalNavRight.setAttribute('aria-hidden', 'false');

  // Show modal
  modalOverlay.style.display = 'flex';
  modalOverlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalOverlay.style.display = 'none';
  modalOverlay.setAttribute('aria-hidden', 'true');
  modalImage.src = '';
  document.body.style.overflow = '';

  // Hide navigation
  modalNavLeft.style.display = 'none';
  modalNavRight.style.display = 'none';
  modalNavLeft.setAttribute('aria-hidden', 'true');
  modalNavRight.setAttribute('aria-hidden', 'true');

  // Clear context and resume slides
  modalContext.instance = null;
  modalContext.index = null;
  resumeAllSlides();
}

// Modal event listeners
modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (ev) => {
  if (ev.target === modalOverlay) closeModal();
});

window.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') closeModal();
  // Arrow key navigation when modal is open
  if (modalOverlay.style.display === 'flex') {
    if (ev.key === 'ArrowLeft') modalPrevHandler();
    if (ev.key === 'ArrowRight') modalNextHandler();
  }
});

// Read more button delegation
document.addEventListener('click', (ev) => {
  const btn = ev.target.closest('.read-more');
  if (!btn) return;
  const id = btn.dataset.id;
  const post = (allPosts || []).find(p => String(p.id) === String(id));
  if (post) openModalWithPost(post);
});

// Modal navigation handlers
function modalPrevHandler() {
  const ctx = modalContext;
  if (!ctx.instance) return;
  const idx = ctx.index;
  if (typeof idx !== 'number' || idx <= 0) return;
  ctx.index = idx - 1;
  updateModalForContext();
}

function modalNextHandler() {
  const ctx = modalContext;
  if (!ctx.instance) return;
  const idx = ctx.index;
  if (typeof idx !== 'number' || idx >= ctx.instance.posts.length - 1) return;
  ctx.index = idx + 1;
  updateModalForContext();
}

modalPrevBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  modalPrevHandler();
});

modalNextBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  modalNextHandler();
});

// === Dynamic Chapters Initialization ===
async function initDynamicChapters() {
  await loadSlidesJson();

  // Reset global registry
  window.ecdSlideshows = [];

  let chaptersList = null;
  try {
    const r = await fetch('chapters.json', { cache: 'no-store' });
    if (r.ok) {
      const data = await r.json();
      if (Array.isArray(data) && data.length > 0) chaptersList = data;
    }
  } catch (e) {
    console.warn('No chapters.json or failed to load it', e);
  }

  if (!Array.isArray(chaptersList) || chaptersList.length === 0) {
    // Fallback to static chapters
    const ss1 = createSlideshow('01', '01');
    const ss2 = createSlideshow('02', '02');
    const ss3 = createSlideshow('03', '03');
    const ss4 = createSlideshow('04', '04');
    ss1.build(); ss1.show(0); ss1.startTimer();
    ss2.build(); ss2.show(0); ss2.startTimer();
    ss3.build(); ss3.show(0); ss3.startTimer();
    ss4.build(); ss4.show(0); ss4.startTimer();
    return;
  }

  // Remove static wrappers if present
  const staticIds = ['chapter01-wrapper', 'chapter02-wrapper', 'chapter03-wrapper', 'chapter04-wrapper'];
  staticIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });

  const mainWrap = document.querySelector('.wrap');
  const refNode = document.querySelector('.sections');

  for (const ch of chaptersList) {
    const id = String(ch.id);
    const title = ch.title || `Capítulo ${id}`;

    const wrapper = document.createElement('div');
    wrapper.className = 'slideshow-wrapper';
    wrapper.id = `chapter-${id}-dynamic`;

    wrapper.innerHTML = `
      <div class="chapter-title">
        ${escapeHtml('Capítulo ' + id + ': ' + title)}
        <a href="chapter-text.html?chapter=${id}" target="_blank" class="text-only-link">[Versión Solo Texto]</a>
      </div>
      <section class="slideshow" id="slideshow-${id}" aria-label="Capítulo ${escapeHtml(id)}">
        <div id="slides-${id}" class="slides" aria-live="polite"></div>
        <div class="controls">
          <button id="prev-${id}" class="ctrl-btn" aria-label="anterior">‹</button>
          <button id="next-${id}" class="ctrl-btn" aria-label="siguiente">›</button>
        </div>
        <div class="dots" id="dots-${id}" role="tablist"></div>
      </section>
    `;

    if (refNode && refNode.parentNode) {
      refNode.parentNode.insertBefore(wrapper, refNode);
    } else {
      mainWrap.appendChild(wrapper);
    }

    const ss = createSlideshow(id, id);
    ss.build();
    ss.show(0);
    ss.startTimer();
  }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  initDynamicChapters();
});