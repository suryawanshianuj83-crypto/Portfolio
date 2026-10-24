/* Shipping case study — a scroll-driven, 7-step data story.
   An abstract SVG network (factories → routes → states → customers) is built
   from seeded random layout. It is a visual metaphor only: it contains no real
   route, geographic or numeric data beyond the figures stated in the copy. */
(function () {
  'use strict';
  var AS = (window.AS = window.AS || {});
  var NS = 'http://www.w3.org/2000/svg';

  var STEPS = [
    { v: 10000, suffix: '+', title: 'Orders', desc: 'Over 10,000 order records from factory-to-customer shipments are where the analysis starts.' },
    { v: 10000, suffix: '+', title: 'Clean & validate', desc: 'Cleaned and validated 10,000+ order records.' },
    { v: 5, suffix: '', title: 'Factories', desc: 'Mapped products to 5 factories.' },
    { v: 196, suffix: '', title: 'Routes', desc: 'Analyzed 196 shipping routes from factory to customer.' },
    { v: 4, suffix: ' KPIs', title: 'KPI analysis', desc: 'Built average lead time, route volume, delay frequency and a route efficiency score.' },
    { word: 'Ship modes', title: 'Bottleneck detection', desc: 'Compared ship modes and flagged regional bottlenecks.' },
    { word: 'Streamlit', title: 'Interactive dashboard', desc: 'An interactive dashboard with filters, a US map, route drill-downs and KPI views.' }
  ];

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function clamp(n, a, b) { return Math.min(b, Math.max(a, n)); }

  AS.initStory = function () {
    var root = document.getElementById('case-study');
    var track = document.getElementById('storyTrack');
    var stage = document.getElementById('storyStage');
    var svg = document.getElementById('storySvg');
    var viz = document.getElementById('storyViz');
    if (!root || !track || !stage || !svg || !viz) return;

    var numEl = document.getElementById('stepNum');
    var titleEl = document.getElementById('stepTitle');
    var descEl = document.getElementById('stepDesc');
    var nowEl = document.getElementById('stepNow');
    var dotsEl = document.getElementById('stepDots');
    var textBox = stage.querySelector('.story__text');
    var mq = window.matchMedia('(max-width: 860px)');
    var step = -1, shown = 0, tweenRaf = 0, swapT = 0;
    var overlays = Array.prototype.slice.call(viz.querySelectorAll(':scope > [data-from]'));
    var svgEls = [];

    /* ----- dashboard map placeholder dots (abstract) ----- */
    var dm = viz.querySelector('.dash__map svg');
    if (dm) {
      var r0 = rng(11);
      for (var i = 0; i < 46; i++) el('circle', { cx: (6 + r0() * 188).toFixed(1), cy: (6 + r0() * 88).toFixed(1), r: (1 + r0() * 1.6).toFixed(1), fill: i % 5 === 0 ? '#9277FF' : '#5B8CFF', opacity: '.75' }, dm);
    }

    /* ----- build svg for the current orientation ----- */
    function build() {
      var portrait = mq.matches;
      var W = portrait ? 400 : 800, H = portrait ? 470 : 520;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      var vMin = portrait ? 0.27 : 0.16, vMax = portrait ? 0.94 : 0.92;
      function P(u, v) { return portrait ? { x: v * W, y: u * H } : { x: u * W, y: v * H }; }
      function lerpV(i, n, a, b) { return a + (b - a) * (n === 1 ? 0.5 : i / (n - 1)); }
      var rand = rng(7);

      /* labels */
      var labels = [['Orders', 0.085, 0], ['Factories', 0.3, 2], ['Routes', 0.5, 3], ['States', 0.7, 3], ['Customers', 0.93, 3]];
      labels.forEach(function (l) {
        var p = P(l[1], 0);
        var t = el('text', { class: 'lbl', 'data-from': l[2], x: portrait ? 8 : p.x, y: portrait ? p.y + 4 : 28, 'text-anchor': portrait ? 'start' : 'middle' }, svg);
        t.textContent = l[0];
      });

      /* orders cloud: scatter → aligned grid */
      var go = el('g', { class: 'grp-o o keep', 'data-from': 0, 'data-to': 1 }, svg);
      var cols = portrait ? 14 : 10, rows = portrait ? 8 : 11, count = cols * rows;
      var uA = 0.025, uB = portrait ? 0.15 : 0.165;
      for (var k = 0; k < count; k++) {
        var s = P(uA + rand() * (uB - uA), vMin + rand() * (vMax - vMin));
        var c = k % cols, rr = Math.floor(k / cols);
        var gu = portrait ? uA + (rr / (rows - 1)) * (uB - uA) : uA + (c / (cols - 1)) * (uB - uA);
        var gv = portrait ? vMin + (c / (cols - 1)) * (vMax - vMin) : vMin + (rr / (rows - 1)) * (vMax - vMin);
        var g = P(gu, gv);
        var ci = el('circle', { cx: s.x.toFixed(1), cy: s.y.toFixed(1), r: 1.9 }, go);
        ci.style.setProperty('--dx', (g.x - s.x).toFixed(1) + 'px');
        ci.style.setProperty('--dy', (g.y - s.y).toFixed(1) + 'px');
      }

      var net = el('g', { class: 'net' }, svg);
      var fU = 0.3, sU = 0.7, nF = 5, nS = 9;
      var hot = { 2: 1, 5: 1, 7: 1 };

      /* routes + flow overlay (abstract subset; the real figure is 196) */
      var gr = el('g', { class: 'grp-r', 'data-from': 3 }, net);
      var gfl = el('g', { 'data-from': 3 }, net);
      var idx = 0;
      for (var f = 0; f < nF; f++) {
        for (var s2 = 0; s2 < nS; s2++) {
          var a = P(fU, lerpV(f, nF, vMin + 0.04, vMax - 0.04));
          var b = P(sU, lerpV(s2, nS, vMin, vMax));
          var mid = (fU + sU) / 2;
          var c1 = P(mid, lerpV(f, nF, vMin + 0.04, vMax - 0.04));
          var c2 = P(mid, lerpV(s2, nS, vMin, vMax));
          var d = 'M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + ' C' + c1.x.toFixed(1) + ' ' + c1.y.toFixed(1) + ' ' + c2.x.toFixed(1) + ' ' + c2.y.toFixed(1) + ' ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1);
          var flagged = hot[s2] && (f === 1 || f === 3);
          var path = el('path', { d: d, class: 'r' + (flagged ? ' flag' : ''), pathLength: 1 }, gr);
          path.style.setProperty('--i', idx);
          path.style.setProperty('--w', (0.8 + rand() * 2.2).toFixed(2));
          if ((f + s2) % 3 === 0) {
            var fl = el('path', { d: d, class: 'fl' }, gfl);
            fl.style.setProperty('--i', idx % 9);
          }
          idx++;
        }
      }

      /* factories */
      var gf = el('g', { class: 'grp-f', 'data-from': 2 }, net);
      for (var f2 = 0; f2 < nF; f2++) {
        var fp = P(fU, lerpV(f2, nF, vMin + 0.04, vMax - 0.04));
        var fg = el('g', { class: 'f' }, gf);
        fg.style.setProperty('--i', f2);
        el('circle', { class: 'f-halo', cx: fp.x.toFixed(1), cy: fp.y.toFixed(1), r: 14 }, fg);
        el('circle', { cx: fp.x.toFixed(1), cy: fp.y.toFixed(1), r: 6 }, fg);
      }

      /* states + customers */
      var gs = el('g', { class: 'grp-s', 'data-from': 3 }, net);
      var gc = el('g', { class: 'grp-c', 'data-from': 3 }, net);
      var gring = el('g', { 'data-from': 5 }, net);
      for (var q = 0; q < nS; q++) {
        var v = lerpV(q, nS, vMin, vMax);
        var sp = P(sU, v);
        el('circle', { class: 's' + (hot[q] ? ' hot' : ''), cx: sp.x.toFixed(1), cy: sp.y.toFixed(1), r: 5 }, gs);
        if (hot[q]) el('circle', { class: 'ring', cx: sp.x.toFixed(1), cy: sp.y.toFixed(1), r: 7 }, gring);
        [[0.89, -0.022], [0.955, 0.022]].forEach(function (o) {
          var cp = P(o[0], clamp(v + o[1], 0.02, 0.98));
          el('line', { x1: sp.x.toFixed(1), y1: sp.y.toFixed(1), x2: cp.x.toFixed(1), y2: cp.y.toFixed(1), stroke: 'rgba(237,235,229,.16)', 'stroke-width': 1 }, gc);
          el('circle', { class: 'c', cx: cp.x.toFixed(1), cy: cp.y.toFixed(1), r: 2.6 }, gc);
        });
      }

      svgEls = Array.prototype.slice.call(svg.querySelectorAll('[data-from]'));
      var prev = step; step = -1; apply(Math.max(prev, 0), true);
    }

    /* ----- text + counter ----- */
    function fmt(n, s) { return Math.round(n).toLocaleString('en-US') + s; }
    function setNum(s, instant) {
      cancelAnimationFrame(tweenRaf);
      if (s.word) { numEl.classList.add('is-word'); numEl.textContent = s.word; return; }
      numEl.classList.remove('is-word');
      if (instant || AS.reduceMotion()) { shown = s.v; numEl.textContent = fmt(s.v, s.suffix); return; }
      var from = shown, to = s.v, t0 = performance.now(), dur = 900;
      (function tick(now) {
        var p = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(1 - p, 3);
        shown = from + (to - from) * e;
        numEl.textContent = fmt(shown, s.suffix);
        if (p < 1) tweenRaf = requestAnimationFrame(tick);
      })(t0);
    }

    function apply(n, instant) {
      if (n === step) return;
      step = n;
      var s = STEPS[n];
      stage.setAttribute('data-step', n);
      svg.setAttribute('data-clean', n >= 1 ? 1 : 0);
      svg.setAttribute('data-weights', n >= 4 ? 1 : 0);
      svg.setAttribute('data-flag', n >= 5 ? 1 : 0);
      svg.setAttribute('data-dash', n >= 6 ? 1 : 0);
      svgEls.concat(overlays).forEach(function (node) {
        var from = +node.getAttribute('data-from');
        var toAttr = node.getAttribute('data-to');
        var on = n >= from && (toAttr === null || n <= +toAttr);
        node.setAttribute('data-state', on ? 'on' : 'off');
      });

      clearTimeout(swapT);
      if (instant) { titleEl.textContent = s.title; descEl.textContent = s.desc; }
      else {
        textBox.classList.add('is-swap');
        swapT = setTimeout(function () {
          titleEl.textContent = s.title; descEl.textContent = s.desc;
          textBox.classList.remove('is-swap');
        }, 180);
      }
      nowEl.textContent = ('0' + (n + 1)).slice(-2);
      setNum(s, instant);
      Array.prototype.forEach.call(dotsEl.children, function (b, i) {
        b.classList.toggle('is-on', i <= n);
        b.classList.toggle('is-cur', i === n);
        if (i === n) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      });
    }

    /* ----- step dots ----- */
    STEPS.forEach(function (s, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Step ' + (i + 1) + ': ' + s.title);
      b.addEventListener('click', function () {
        var total = track.offsetHeight - window.innerHeight;
        var top = track.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({ top: top + ((i + 0.5) / STEPS.length) * total, behavior: AS.reduceMotion() ? 'auto' : 'smooth' });
      });
      dotsEl.appendChild(b);
    });

    /* ----- scroll mapping ----- */
    function update() {
      var vh = window.innerHeight;
      var rect = track.getBoundingClientRect();
      root.classList.toggle('is-active', rect.top < vh && rect.bottom > 0);
      var total = track.offsetHeight - vh;
      if (total <= 0) return;
      var p = clamp(-rect.top / total, 0, 0.9999);
      apply(Math.min(STEPS.length - 1, Math.floor(p * STEPS.length)));
    }

    var onChange = function () { build(); };
    if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);

    build();
    apply(0, true);
    AS.onScroll(update);
    update();

    AS.onDispose(function () {
      cancelAnimationFrame(tweenRaf); clearTimeout(swapT);
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
    });
  };
})();
