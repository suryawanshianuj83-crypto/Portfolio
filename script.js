/* Core: boot sequence, scroll engine, navigation and UI interactions.
   Feature modules (hero-field, story, neural, skills) live in /js and register
   their init functions on window.AS. Each init is wrapped so that one failing
   module can never break the rest of the page. */
(function () {
  'use strict';

  var AS = (window.AS = window.AS || {});
  var root = document.documentElement;
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mqFine = window.matchMedia('(hover: hover) and (pointer: fine)');

  AS.reduceMotion = function () { return mqReduce.matches; };

  var disposers = [];
  AS.onDispose = function (fn) { disposers.push(fn); };

  var scrollFns = [];
  AS.onScroll = function (fn) { scrollFns.push(fn); };

  var ac = new AbortController();
  var passive = { signal: ac.signal, passive: true };

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function clamp(n, a, b) { return Math.min(b, Math.max(a, n)); }
  function safe(name, fn) {
    try { fn(); } catch (err) { if (window.console) console.error('[portfolio] ' + name + ' failed:', err); }
  }

  /* ---------------------------------------------------------------- ready */
  var readyDone = false;
  function setReady() {
    if (readyDone) return;
    readyDone = true;
    root.classList.add('ready');
    updateIndicator();
  }
  function scheduleReady() {
    if (AS.reduceMotion()) { setReady(); return; }
    var t0 = performance.now();
    var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    var cap = new Promise(function (res) { setTimeout(res, 1500); });
    Promise.race([fontsReady, cap]).then(function () {
      var wait = Math.max(0, 900 - (performance.now() - t0));
      setTimeout(setReady, wait);
    });
    setTimeout(setReady, 3000); /* failsafe: never leave the curtain up */
  }

  /* ---------------------------------------------------------- text split */
  function splitHero() {
    var i = 0;
    $$('[data-split]').forEach(function (line) {
      var text = line.textContent;
      line.textContent = '';
      for (var c = 0; c < text.length; c++) {
        var s = document.createElement('span');
        s.className = 'ch';
        s.style.setProperty('--i', i++);
        s.textContent = text.charAt(c);
        line.appendChild(s);
      }
    });
  }

  var words = [];
  function splitStatement() {
    var el = $('#statement');
    if (!el) return;
    var text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.textContent = '';
    text.split(/\s+/).forEach(function (w, idx, arr) {
      var s = document.createElement('span');
      s.className = 'w'; s.setAttribute('aria-hidden', 'true'); s.textContent = w;
      el.appendChild(s);
      words.push(s);
      if (idx < arr.length - 1) el.appendChild(document.createTextNode(' '));
    });
  }

  /* ------------------------------------------------------------- reveals */
  function initReveals() {
    var items = $$('[data-reveal], #trail');
    if (!('IntersectionObserver' in window) || AS.reduceMotion()) {
      items.forEach(function (n) { n.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
    items.forEach(function (n) { io.observe(n); });
    AS.onDispose(function () { io.disconnect(); });
  }

  /* ---------------------------------------------------------- navigation */
  var nav = $('#nav'), navLinks = $('#navLinks'), toggle = $('#navToggle'), menu = $('#menu');
  var sections = $$('main [data-nav]');
  var activeKey = '';

  function updateIndicator() {
    if (!navLinks) return;
    var a = $('a.is-active', navLinks);
    if (!a) { navLinks.style.setProperty('--io', 0); return; }
    navLinks.style.setProperty('--ix', a.offsetLeft + 'px');
    navLinks.style.setProperty('--iw', a.offsetWidth + 'px');
    navLinks.style.setProperty('--io', 1);
  }
  function setActive(key) {
    if (key === activeKey) return;
    activeKey = key;
    $$('[data-link]').forEach(function (a) {
      var on = a.getAttribute('data-link') === key;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    });
    updateIndicator();
  }

  function openMenu(open) {
    if (!menu || !toggle) return;
    menu.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (nav) nav.classList.toggle('is-glass', open || window.pageYOffset > 40);
  }
  function initNav() {
    if (toggle) toggle.addEventListener('click', function () { openMenu(!menu.classList.contains('is-open')); }, { signal: ac.signal });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { openMenu(false); }, { signal: ac.signal }); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu && menu.classList.contains('is-open')) { openMenu(false); toggle.focus(); }
    }, { signal: ac.signal });
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 1000 && menu.classList.contains('is-open')) openMenu(false);
      updateIndicator();
    }, passive);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(updateIndicator);
  }

  /* ------------------------------------------------------- scroll engine */
  var ticking = false, lastY = window.pageYOffset, heroInner = $('#heroInner'), progress = $('#progress');
  var timeline = $('#timeline'), tlItems = $$('.tl');

  function update() {
    ticking = false;
    var y = window.pageYOffset, vh = window.innerHeight;
    var docH = Math.max(1, document.documentElement.scrollHeight - vh);

    if (progress) progress.style.transform = 'scaleX(' + clamp(y / docH, 0, 1).toFixed(4) + ')';

    if (nav) {
      var menuOpen = menu && menu.classList.contains('is-open');
      nav.classList.toggle('is-glass', menuOpen || y > 40);
      var dy = y - lastY;
      if (!menuOpen) {
        if (y > 360 && dy > 6) nav.classList.add('is-hidden');
        else if (dy < -6 || y < 200) nav.classList.remove('is-hidden');
      }
    }
    lastY = y;

    /* hero depth + fade as it scrolls away */
    if (heroInner && y < vh * 1.2 && !AS.reduceMotion()) {
      heroInner.style.transform = 'translate3d(0,' + (y * 0.16).toFixed(1) + 'px,0)';
      heroInner.style.opacity = clamp(1 - y / (vh * 0.85), 0, 1).toFixed(3);
    }

    /* about statement: words light up with scroll */
    if (words.length) {
      var r = words[0].parentNode.getBoundingClientRect();
      var p = AS.reduceMotion() ? 1 : clamp((vh * 0.88 - r.top) / (vh * 0.5), 0, 1);
      for (var i = 0; i < words.length; i++) {
        var o = clamp(p * words.length * 1.15 - i, 0, 1);
        words[i].style.opacity = (0.14 + 0.86 * o).toFixed(3);
      }
    }

    /* experience timeline line + nodes */
    if (timeline) {
      var tr = timeline.getBoundingClientRect();
      timeline.style.setProperty('--fill', clamp((vh * 0.62 - tr.top) / tr.height, 0, 1).toFixed(3));
      tlItems.forEach(function (it) {
        it.classList.toggle('is-lit', it.getBoundingClientRect().top < vh * 0.62);
      });
    }

    /* active section */
    var probe = vh * 0.4, key = sections.length ? sections[0].getAttribute('data-nav') : '';
    for (var s = 0; s < sections.length; s++) {
      if (sections[s].getBoundingClientRect().top <= probe) key = sections[s].getAttribute('data-nav');
    }
    if (y + vh >= document.documentElement.scrollHeight - 4) key = 'contact';
    setActive(key);

    for (var f = 0; f < scrollFns.length; f++) safe('scroll handler', scrollFns[f]);
  }
  function requestUpdate() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }

  /* ------------------------------------------------- pointer interactions */
  var pointer = { x: 0, y: 0, cx: 0, cy: 0, gx: 0, gy: 0, active: false, loop: 0 };
  var cursor = $('#cursor'), hero = $('#home'), heroGlow = $('#heroGlow');

  function pointerLoop() {
    pointer.cx += (pointer.x - pointer.cx) * 0.2;
    pointer.cy += (pointer.y - pointer.cy) * 0.2;
    pointer.gx += (pointer.x - pointer.gx) * 0.07;
    pointer.gy += (pointer.y - pointer.gy) * 0.07;
    if (cursor) cursor.style.transform = 'translate3d(' + pointer.cx.toFixed(1) + 'px,' + pointer.cy.toFixed(1) + 'px,0)';
    if (hero && heroGlow) {
      var hr = hero.getBoundingClientRect();
      if (hr.bottom > 0) {
        heroGlow.style.setProperty('--mx', (pointer.gx - hr.left).toFixed(0) + 'px');
        heroGlow.style.setProperty('--my', (pointer.gy - hr.top).toFixed(0) + 'px');
      }
    }
    var settled = Math.abs(pointer.x - pointer.cx) < 0.3 && Math.abs(pointer.y - pointer.cy) < 0.3 &&
                  Math.abs(pointer.x - pointer.gx) < 0.5 && Math.abs(pointer.y - pointer.gy) < 0.5;
    pointer.loop = settled ? 0 : requestAnimationFrame(pointerLoop);
  }
  function initPointer() {
    if (!mqFine.matches) return;
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      if (!pointer.active) { pointer.cx = pointer.gx = e.clientX; pointer.cy = pointer.gy = e.clientY; pointer.active = true; if (cursor) cursor.classList.add('is-on'); }
      pointer.x = e.clientX; pointer.y = e.clientY;
      if (!pointer.loop) pointer.loop = requestAnimationFrame(pointerLoop);
    }, passive);
    document.addEventListener('pointerleave', function () { pointer.active = false; if (cursor) cursor.classList.remove('is-on'); }, passive);
    document.addEventListener('pointerover', function (e) {
      if (!cursor) return;
      cursor.classList.toggle('is-link', !!(e.target.closest && e.target.closest('a, button, .sk, .topic')));
    }, passive);
    AS.onDispose(function () { cancelAnimationFrame(pointer.loop); });
  }

  function initMagnetic() {
    if (!mqFine.matches || AS.reduceMotion()) return;
    $$('.magnetic').forEach(function (btn) {
      var inner = $('.btn__in', btn);
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        btn.style.transition = 'transform .15s linear, border-color .3s, color .3s, background .3s';
        btn.style.transform = 'translate3d(' + (dx * 0.22).toFixed(1) + 'px,' + (dy * 0.3).toFixed(1) + 'px,0)';
        if (inner) inner.style.transform = 'translate3d(' + (dx * 0.1).toFixed(1) + 'px,' + (dy * 0.14).toFixed(1) + 'px,0)';
      }, { signal: ac.signal });
      btn.addEventListener('pointerleave', function () {
        btn.style.transition = 'transform .6s cubic-bezier(.2,.7,.1,1), border-color .3s, color .3s, background .3s';
        btn.style.transform = ''; if (inner) inner.style.transform = '';
      }, { signal: ac.signal });
    });
  }

  function initTilt() {
    $$('[data-tilt]').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'touch') return;
        var r = card.getBoundingClientRect();
        var nx = (e.clientX - r.left) / r.width, ny = (e.clientY - r.top) / r.height;
        card.style.setProperty('--px', (nx * 100).toFixed(1) + '%');
        card.style.setProperty('--py', (ny * 100).toFixed(1) + '%');
        if (mqFine.matches && !AS.reduceMotion()) {
          card.classList.add('is-tilting');
          card.style.setProperty('--ry', ((nx - 0.5) * 7).toFixed(2) + 'deg');
          card.style.setProperty('--rx', (-(ny - 0.5) * 5).toFixed(2) + 'deg');
        }
      }, { signal: ac.signal });
      card.addEventListener('pointerleave', function () {
        card.classList.remove('is-tilting');
        card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg');
      }, { signal: ac.signal });
    });
  }

  /* ---------------------------------------------------------- components */
  function initTimeline() {
    $$('.tl__head').forEach(function (b) {
      b.addEventListener('click', function () {
        b.setAttribute('aria-expanded', b.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');
        requestUpdate();
      }, { signal: ac.signal });
    });
  }

  function initMaatriTabs() {
    var tabs = $$('.mtab'), panels = $$('.mpanel');
    if (!tabs.length) return;
    function select(i, focus) {
      tabs.forEach(function (t, k) {
        var on = k === i;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        panels[k].hidden = !on;
        panels[k].classList.toggle('is-active', on);
      });
      if (focus) tabs[i].focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i); }, { signal: ac.signal });
      t.addEventListener('keydown', function (e) {
        var n = tabs.length, k = -1;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') k = (i + 1) % n;
        else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') k = (i - 1 + n) % n;
        else if (e.key === 'Home') k = 0;
        else if (e.key === 'End') k = n - 1;
        if (k > -1) { e.preventDefault(); select(k, true); }
      }, { signal: ac.signal });
    });
  }

  /* ---------------------------------------------------------------- boot */
  function boot() {
    safe('splitHero', splitHero);
    safe('splitStatement', splitStatement);
    safe('nav', initNav);
    safe('reveals', initReveals);
    safe('pointer', initPointer);
    safe('magnetic', initMagnetic);
    safe('tilt', initTilt);
    safe('timeline', initTimeline);
    safe('maatri tabs', initMaatriTabs);
    safe('hero field', function () { if (AS.initHero) AS.initHero(); });
    safe('story', function () { if (AS.initStory) AS.initStory(); });
    safe('neural', function () { if (AS.initNeural) AS.initNeural(); });
    safe('skills', function () { if (AS.initSkills) AS.initSkills(); });

    window.addEventListener('scroll', requestUpdate, passive);
    window.addEventListener('resize', requestUpdate, passive);
    update();
    scheduleReady();
  }

  window.addEventListener('pagehide', function () {
    ac.abort();
    disposers.forEach(function (fn) { safe('dispose', fn); });
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
