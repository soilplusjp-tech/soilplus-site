/* SOIL — brand site (top / philosophy / works)
   Opening sequence (top page only): cover → frames flip → hero settles → title → header
   Plays once per session. Add ?splash to the URL to force it. */
(() => {
  const d = document;
  const b = d.body;
  const html = d.documentElement;
  const header = d.querySelector('.header');

  const finish = () => {
    try { sessionStorage.setItem('soil-splash-seen', '1'); } catch (e) { /* ignore */ }
    html.classList.remove('is-locked');
    b.classList.add('is-loaded');
  };

  /* ---------- opening (only when the page has a splash) ---------- */
  const splash = d.querySelector('.splash');
  const hero = d.querySelector('.hero');
  const heroImg = d.querySelector('.hero__img');
  const frames = Array.from(d.querySelectorAll('.hero__frame'));

  if (!splash || !hero || !heroImg) {
    if (splash) splash.remove();
    finish();
  } else {
    const bar = splash.querySelector('.splash__bar i');
    const count = splash.querySelector('.splash__count');
    const force = /[?&]splash/.test(location.search);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let internal = false;                       // came here through a link inside the site?
    try { internal = sessionStorage.getItem('soil-pt') === '1'; } catch (e) { /* private mode */ }

    const srcs = frames.map(f => f.getAttribute('src')).concat([heroImg.getAttribute('src')]);
    let loaded = 0;
    const tick = () => {
      loaded += 1;
      const p = loaded / srcs.length;
      if (bar) bar.style.width = (p * 100) + '%';
      if (count) count.textContent = String(Math.round(p * 100)).padStart(3, '0');
    };
    const load = src => new Promise(res => {
      const i = new Image();
      i.onload = i.onerror = () => { tick(); res(); };
      i.src = src;
    });

    const instant = () => {
      b.classList.add('no-anim');
      splash.remove();
      frames.forEach(f => f.remove());
      heroImg.classList.add('is-in');
      hero.classList.add('is-ready');
      finish();
      requestAnimationFrame(() => requestAnimationFrame(() => b.classList.remove('no-anim')));
    };

    const play = () => {
      splash.classList.add('is-out');                        // 1. cover lifts
      const step = 240;
      let i = 1;
      const flip = () => {                                   // 2. frames flip
        frames.forEach(f => f.classList.remove('is-on'));
        if (i < frames.length) {
          frames[i].classList.add('is-on');
          i += 1;
          setTimeout(flip, step);
          return;
        }
        heroImg.classList.add('is-in');                      // 3. hero settles
        setTimeout(() => frames.forEach(f => f.remove()), 900);
        setTimeout(() => hero.classList.add('is-ready'), 700); // 4. title rises
        setTimeout(finish, 1300);                             // 5. header appears
      };
      if (frames[0]) frames[0].classList.add('is-on');
      setTimeout(flip, 300);
    };

    if (reduce || (internal && !force)) {   // 2026-10-10: opening on open/reload only, not on in-site navigation
      instant();
    } else {
      const timeout = new Promise(res => setTimeout(res, 7000));
      Promise.race([Promise.all(srcs.map(load)), timeout]).then(() => setTimeout(play, 350));
    }
  }

  /* ---------- menu (mobile / full-screen) ---------- */
  const nav = d.querySelector('.nav');
  const btn = d.querySelector('.menu-btn');
  const setMenu = open => {
    header.classList.toggle('is-open', open);
    nav.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
    html.classList.toggle('is-locked', open);
  };
  btn.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  d.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- header colour follows the section under it ---------- */
  const lights = Array.from(d.querySelectorAll('[data-header="light"]'));
  const active = new Set();
  let io = null;
  const watch = () => {
    if (io) io.disconnect();
    active.clear();
    io = new IntersectionObserver(es => {
      es.forEach(e => (e.isIntersecting ? active.add(e.target) : active.delete(e.target)));
      header.classList.toggle('is-light', active.size > 0);
    }, { rootMargin: '0px 0px -' + Math.max(innerHeight - 72, 0) + 'px 0px', threshold: 0 });
    lights.forEach(el => io.observe(el));
  };
  watch();
  let rt = null;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(watch, 200); });

  const onScroll = () => header.classList.toggle('is-scrolled', scrollY > 40);
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });

  /* ---------- reveal images once ---------- */
  const ro = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); ro.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  d.querySelectorAll('[data-reveal]').forEach(el => ro.observe(el));

  /* ---------- contact form → Formspree (sent in place, so no Formspree page appears) ---------- */
  const form = d.querySelector('.form');
  if (form) form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const err = form.querySelector('.form__error');
    if (err) err.hidden = true;
    // until the real endpoint is set, behave like the old mock so the page can still be reviewed
    if (/FORM_ID/.test(form.action)) { form.classList.add('is-sent'); return; }
    const data = new FormData(form);
    // checkboxes share one name; send them as one readable line
    const kinds = data.getAll('kind');
    data.delete('kind');
    data.append('ご依頼の内容', kinds.length ? kinds.join('、') : '（未選択）');
    btn.disabled = true;
    const label = btn.textContent;
    btn.textContent = '送信中…';
    try {
      const res = await fetch(form.action, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(String(res.status));
      form.classList.add('is-sent');
      const done = form.querySelector('.form__done');
      if (done) { done.focus(); done.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    } catch (x) {
      if (err) err.hidden = false;
      btn.disabled = false;
      btn.textContent = label;
    }
  });

  d.querySelectorAll('[data-year]').forEach(y => { y.textContent = String(new Date().getFullYear()); });
})();

/* Works: before / after slider + day/night switch */
(() => {
  document.querySelectorAll('[data-ba]').forEach(ba => {
    const r = ba.querySelector('.ba__range');
    const set = () => ba.style.setProperty('--x', r.value + '%');
    r.addEventListener('input', set); set();
  });
  document.querySelectorAll('.ba-switch').forEach(sw => {
    const img = sw.closest('.ba-item').querySelector('.ba__after');
    const night = new Image(); night.src = img.dataset.night;
    sw.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      sw.querySelectorAll('button').forEach(x => x.classList.toggle('is-on', x === b));
      img.style.opacity = 0;
      setTimeout(() => { img.src = img.dataset[b.dataset.mode]; img.style.opacity = 1; }, 250);
    }));
  });
})();

/* a link to the page you are already on (the logo, "Top") scrolls to the top instead of reloading */
document.addEventListener('click', e => {
  const a = e.target.closest('a[href]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || url.pathname !== location.pathname || url.hash) return;
  e.preventDefault();
  scrollTo({ top: 0, behavior: 'smooth' });
});
