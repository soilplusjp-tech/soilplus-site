/* SOIL+ — motion layer. Loaded after main.js on every page.
   Respects prefers-reduced-motion: if set, nothing here runs and the page stays static. */
(() => {
  const d = document;
  const html = d.documentElement;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  html.classList.add('motion');
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

  /* ---------- 1. split headings into characters ---------- */
  const ASCII = /^[\x21-\x7e]+$/;
  const split = el => {
    let i = 0;
    const charSpan = ch => {
      const s = d.createElement('span');
      s.className = 'ch';
      s.style.setProperty('--i', i++);
      s.textContent = ch;
      return s;
    };
    const walk = node => {
      Array.from(node.childNodes).forEach(n => {
        if (n.nodeType === 3) {
          const frag = d.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(d.createTextNode(' ')); return; }
            if (ASCII.test(part)) {                       // latin words stay unbroken
              const w = d.createElement('span');
              w.className = 'w';
              Array.from(part).forEach(ch => w.appendChild(charSpan(ch)));
              frag.appendChild(w);
            } else {
              Array.from(part).forEach(ch => frag.appendChild(charSpan(ch)));
            }
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') {
          if (n.classList.contains('plus')) {             // the "+" moves as one piece
            n.classList.add('ch');
            n.style.setProperty('--i', i++);
          } else {
            walk(n);
          }
        }
      });
    };
    walk(el);
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
  };
  const heads = d.querySelectorAll('.jp-h, .concept__lead, .phead h1, .svc5__row h3, .scope__grid h3');
  heads.forEach(split);
  const so = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-split-in'); so.unobserve(e.target); }
  }), { rootMargin: '0px 0px -12% 0px' });
  heads.forEach(h => so.observe(h));

  /* ---------- 2. parallax targets ---------- */
  const pxImgs = Array.from(d.querySelectorAll('.c3__photo img, .c3__side img, .wgrid img, .witem__fig img, .mbody__fig img, .wide-photo img'));
  pxImgs.forEach(img => img.classList.add('px'));
  const pheads = Array.from(d.querySelectorAll('.phead'));
  const hero = d.querySelector('.hero');
  const skew = d.querySelector('.marquee__skew');

  /* ---------- 3. one scroll loop for hero, parallax and marquee skew ---------- */
  let lastY = scrollY, vel = 0, ticking = false;
  const frame = () => {
    ticking = false;
    const vh = innerHeight;
    if (hero) {
      const total = hero.offsetHeight - vh;
      const p = total > 0 ? clamp(-hero.getBoundingClientRect().top / total, 0, 1) : 0;
      hero.style.setProperty('--p', p.toFixed(4));
    }
    pxImgs.forEach(img => {
      const r = img.parentElement.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      const c = (r.top + r.height / 2 - vh / 2) / vh;      // -1 … 1 across the viewport
      img.style.translate = '0 ' + (c * -7).toFixed(2) + '%';
    });
    pheads.forEach(ph => {
      const r = ph.getBoundingClientRect();
      if (r.bottom < 0) return;
      ph.style.backgroundPosition = 'center calc(50% + ' + (-r.top * 0.35).toFixed(1) + 'px)';
    });
    if (skew) {
      const y = scrollY;
      vel = vel * 0.8 + (y - lastY) * 0.2;
      lastY = y;
      skew.style.transform = 'skewX(' + clamp(-vel * 0.25, -12, 12).toFixed(2) + 'deg)';
      if (Math.abs(vel) > 0.05) request();
    }
  };
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', request);
  request();

  /* ---------- 4. cursor follower + floating service images ---------- */
  if (fine) {
    const cur = d.createElement('div');
    cur.className = 'cursor';
    cur.setAttribute('aria-hidden', 'true');
    cur.innerHTML = '<b>View</b>';
    d.body.appendChild(cur);

    const hov = d.createElement('div');
    hov.className = 'hover-img';
    hov.setAttribute('aria-hidden', 'true');
    hov.innerHTML = '<img alt="">';
    d.body.appendChild(hov);
    const hovImg = hov.firstChild;

    let mx = -100, my = -100, cx = mx, cy = my, hx = mx, hy = my;
    addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; cur.classList.add('is-on'); }, { passive: true });
    d.addEventListener('mouseleave', () => cur.classList.remove('is-on'));
    const follow = () => {
      cx += (mx - cx) * 0.22; cy += (my - cy) * 0.22;
      hx += (mx - hx) * 0.12; hy += (my - hy) * 0.12;
      cur.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)';
      hov.style.transform = 'translate3d(' + hx + 'px,' + hy + 'px,0)';
      requestAnimationFrame(follow);
    };
    follow();

    d.addEventListener('mouseover', e => {
      const t = e.target;
      const view = t.closest('.wgrid a, .witem__fig');
      cur.classList.toggle('is-view', !!view);
      cur.classList.toggle('is-link', !view && !!t.closest('a, button, label, input, textarea'));
      const row = t.closest('.svc5__row[data-img]');
      if (row) {
        if (hovImg.getAttribute('src') !== row.dataset.img) hovImg.src = row.dataset.img;
        hov.classList.add('is-on');
      } else {
        hov.classList.remove('is-on');
      }
    });

    /* magnetic buttons */
    d.querySelectorAll('.cta, .btn, .inquiry__dm a').forEach(el => {
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.25;
        const y = (e.clientY - r.top - r.height / 2) * 0.35;
        el.style.translate = x.toFixed(1) + 'px ' + y.toFixed(1) + 'px';
      });
      el.addEventListener('mouseleave', () => { el.style.translate = '0 0'; });
    });
  }

  /* ---------- 5. page transition curtain ---------- */
  const pt = d.createElement('div');
  pt.className = 'pt';
  pt.setAttribute('aria-hidden', 'true');
  pt.innerHTML = '<img src="assets/img/logo-mark.png" alt="">';
  d.body.appendChild(pt);
  let arriving = false;
  try { arriving = sessionStorage.getItem('soil-pt') === '1'; sessionStorage.removeItem('soil-pt'); } catch (e) { /* ignore */ }
  if (arriving && !d.querySelector('.splash:not(.is-out)')) {
    pt.classList.add('is-cover');
    requestAnimationFrame(() => requestAnimationFrame(() => { pt.classList.remove('is-cover'); pt.classList.add('is-out'); }));
  } else if (arriving) {
    // first visit with the splash still up: the splash is the transition
  }
  d.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.protocol === 'mailto:') return;
    if (url.pathname === location.pathname) return;            // same-page anchors scroll normally
    e.preventDefault();
    try { sessionStorage.setItem('soil-pt', '1'); } catch (err) { /* ignore */ }
    pt.classList.remove('is-out');
    pt.classList.add('is-in');
    setTimeout(() => { location.href = url.href; }, 650);
  });
  addEventListener('pageshow', e => {
    if (e.persisted) { pt.classList.remove('is-in', 'is-cover'); pt.classList.add('is-out'); }
  });
})();

/* contact page: ink the line art in once the page has painted */
(() => {
  const art = document.querySelector(".cx-hero");
  if (!art || !document.documentElement.classList.contains('motion')) return;
  setTimeout(() => art.classList.add("is-shown"), 80);
})();

/* hero: the water flow. Slides the turbulence field under the displacement map, slowly and without a seam. */
(() => {
  return;   // 2026-10-11: still image (owner: quality over motion)
  const off = document.querySelector('#flow feOffset');
  const img = document.querySelector('.hero__img--flow');
  if (!off || !img || !document.documentElement.classList.contains('motion')) return;
  if (innerWidth <= 900) return;
  const t0 = performance.now();
  const tick = now => {
    const t = (now - t0) / 1000;
    off.setAttribute('dx', (-t * 9 + 60 * Math.sin(t / 7)).toFixed(1));   // steady current + a slow swell
    off.setAttribute('dy', (26 * Math.sin(t / 11)).toFixed(1));
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();
