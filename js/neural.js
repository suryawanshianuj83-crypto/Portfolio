/* Research section — an interactive 4-layer neural network (4-5-5-3).
   Layers reveal as the section scrolls into view; the cursor excites nearby
   neurons; each topic button switches what the animation demonstrates.
   It is a teaching illustration, not a trained model. */
(function () {
  'use strict';
  var AS = (window.AS = window.AS || {});

  var LAYERS = [4, 5, 5, 3];
  var INFO = {
    neurons: 'A neuron weighs its inputs, adds a bias and passes the result on. Move your cursor over the network to excite nearby neurons.',
    activation: 'Non-linear activation functions such as ReLU or sigmoid decide how strongly each neuron fires — they let a network model more than straight lines.',
    forward: 'Forward propagation: inputs flow layer by layer, each neuron combining the signals before it, until the output layer produces a prediction.',
    backprop: 'Backpropagation sends the error backward through the network so every weight learns how much it contributed to the mistake.',
    loss: 'A loss function reduces the gap between prediction and target to a single number. Training tries to make that number smaller.',
    optimization: 'Optimization (for example gradient descent) nudges each weight in the direction that lowers the loss. Line thickness here stands for changing weights.',
    architecture: 'Architecture — depth, width and layer types — decides what a network can represent. Here: an input layer, two hidden layers and an output layer.'
  };

  function clamp(n, a, b) { return Math.min(b, Math.max(a, n)); }

  AS.initNeural = function () {
    var canvas = document.getElementById('net');
    var wrap = document.getElementById('netWrap');
    var infoEl = document.getElementById('topicInfo');
    if (!canvas || !wrap || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var buttons = Array.prototype.slice.call(document.querySelectorAll('.topic'));
    var reduce = AS.reduceMotion();
    var ac = new AbortController();
    var sig = { signal: ac.signal, passive: true };

    var W = 0, H = 0, dpr = 1;
    var mode = 'neurons';
    var mouse = { x: -999, y: -999, on: false };
    var reveal = reduce ? 1 : 0;
    var pulses = [], lastSpawn = 0, last = 0, raf = 0, running = false, visible = false;
    var pos = [], edges = [];

    function layout() {
      pos = []; edges = [];
      var padY = H * 0.12;
      for (var l = 0; l < LAYERS.length; l++) {
        var col = [], n = LAYERS[l];
        var x = W * (l + 0.5) / LAYERS.length;
        for (var j = 0; j < n; j++) col.push({ x: x, y: padY + (H - 2 * padY) * (j + 0.5) / n, ph: (l * 1.7 + j * 0.9) });
        pos.push(col);
      }
      for (var a = 0; a < LAYERS.length - 1; a++)
        for (var i = 0; i < LAYERS[a]; i++)
          for (var k = 0; k < LAYERS[a + 1]; k++) edges.push({ a: a, i: i, k: k, ph: edges.length * 1.37 });
    }

    function resize() {
      var r = wrap.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layout();
      if (!running) draw(performance.now());
    }

    function layerAlpha(l) { return clamp(reveal * (LAYERS.length + 0.6) - l, 0, 1); }

    function spawn(dir) {
      var path = [];
      for (var l = 0; l < LAYERS.length; l++) path.push((Math.random() * LAYERS[l]) | 0);
      pulses.push({ path: path, s: dir > 0 ? 0 : LAYERS.length - 1, dir: dir });
    }

    function draw(now) {
      var dt = Math.min(48, now - (last || now));
      last = now;
      var t = now * 0.001;
      ctx.clearRect(0, 0, W, H);
      var animating = running;

      /* architecture sweep */
      if (mode === 'architecture') {
        var cl = Math.floor(t * 0.9) % LAYERS.length;
        var cx0 = W * cl / LAYERS.length;
        var gr = ctx.createLinearGradient(cx0, 0, cx0 + W / LAYERS.length, 0);
        gr.addColorStop(0, 'rgba(91,140,255,0)'); gr.addColorStop(0.5, 'rgba(91,140,255,.14)'); gr.addColorStop(1, 'rgba(91,140,255,0)');
        ctx.fillStyle = gr; ctx.fillRect(cx0, 0, W / LAYERS.length, H);
      }

      /* near-cursor neurons */
      var near = {};
      if (mouse.on) {
        for (var l0 = 0; l0 < pos.length; l0++)
          for (var j0 = 0; j0 < pos[l0].length; j0++) {
            var dx = pos[l0][j0].x - mouse.x, dy = pos[l0][j0].y - mouse.y;
            var d = Math.sqrt(dx * dx + dy * dy);
            if (d < 120) near[l0 + ':' + j0] = 1 - d / 120;
          }
      }

      /* edges */
      for (var e = 0; e < edges.length; e++) {
        var ed = edges[e];
        var al = Math.min(layerAlpha(ed.a), layerAlpha(ed.a + 1));
        if (al <= 0) continue;
        var A = pos[ed.a][ed.i], B = pos[ed.a + 1][ed.k];
        var boost = Math.max(near[ed.a + ':' + ed.i] || 0, near[(ed.a + 1) + ':' + ed.k] || 0);
        var w = 1, base = 0.10;
        if (mode === 'optimization') { w = 0.6 + 2.4 * Math.abs(Math.sin(t * 0.7 + ed.ph)); base = 0.2; }
        ctx.lineWidth = w;
        ctx.strokeStyle = 'rgba(' + (mode === 'optimization' ? '70,221,235' : '120,152,255') + ',' + ((base + boost * 0.5) * al).toFixed(3) + ')';
        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
      }

      /* pulses */
      if (animating) {
        var want = mode === 'forward' ? 7 : mode === 'backprop' ? 7 : 3;
        var interval = mode === 'forward' || mode === 'backprop' ? 380 : 900;
        if (reveal > 0.9 && now - lastSpawn > interval && pulses.length < want) {
          spawn(mode === 'backprop' ? -1 : 1); lastSpawn = now;
        }
        for (var p = pulses.length - 1; p >= 0; p--) {
          var pu = pulses[p];
          pu.s += pu.dir * dt * 0.00095;
          if ((pu.dir > 0 && pu.s >= LAYERS.length - 1) || (pu.dir < 0 && pu.s <= 0)) { pulses.splice(p, 1); continue; }
          var li = Math.floor(pu.s), f = pu.s - li;
          var P0 = pos[li][pu.path[li]], P1 = pos[li + 1][pu.path[li + 1]];
          var x = P0.x + (P1.x - P0.x) * f, y = P0.y + (P1.y - P0.y) * f;
          var back = pu.dir < 0 || mode === 'backprop';
          ctx.strokeStyle = back ? 'rgba(146,119,255,.85)' : 'rgba(70,221,235,.8)';
          ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(P0.x, P0.y); ctx.lineTo(P1.x, P1.y); ctx.stroke();
          ctx.fillStyle = back ? 'rgba(146,119,255,.22)' : 'rgba(70,221,235,.2)';
          ctx.beginPath(); ctx.arc(x, y, 8, 0, 6.2832); ctx.fill();
          ctx.fillStyle = back ? '#d8ccff' : '#c9f8ff';
          ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 6.2832); ctx.fill();
        }
      }

      /* neurons */
      var archL = Math.floor(t * 0.9) % LAYERS.length;
      for (var l = 0; l < pos.length; l++) {
        var la = layerAlpha(l);
        if (la <= 0) continue;
        for (var j = 0; j < pos[l].length; j++) {
          var n = pos[l][j];
          var r = 7, glow = 0.25;
          var nr = near[l + ':' + j] || 0;
          if (mode === 'neurons') { r += 1.2 * Math.sin(t * 2 + n.ph); glow = 0.3 + 0.2 * Math.sin(t * 2 + n.ph); }
          if (mode === 'activation') { var act = Math.max(0, Math.sin(t * 1.6 + n.ph)); r += act * 3; glow = 0.1 + act * 0.6; }
          if (mode === 'architecture' && l === archL) { glow = 0.8; r += 1.5; }
          if (mode === 'loss' && l === LAYERS.length - 1) {
            var ring = (t * 0.9 + j * 0.33) % 1;
            ctx.strokeStyle = 'rgba(146,119,255,' + ((1 - ring) * 0.8 * la).toFixed(3) + ')';
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(n.x, n.y, 8 + ring * 22, 0, 6.2832); ctx.stroke();
            glow = 0.7;
          }
          r += nr * 4; glow = Math.min(1, glow + nr * 0.6);
          ctx.fillStyle = 'rgba(91,140,255,' + (glow * 0.28 * la).toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(n.x, n.y, r + 7, 0, 6.2832); ctx.fill();
          ctx.fillStyle = 'rgba(8,10,16,' + la.toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, 6.2832); ctx.fill();
          ctx.strokeStyle = 'rgba(205,218,255,' + ((0.4 + glow * 0.6) * la).toFixed(3) + ')';
          ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, 6.2832); ctx.stroke();
          ctx.fillStyle = 'rgba(205,218,255,' + (glow * la).toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(n.x, n.y, Math.max(1.5, r * 0.38), 0, 6.2832); ctx.fill();
        }
      }

      if (running) raf = requestAnimationFrame(draw);
    }

    function start() {
      if (reduce || running || !visible || document.hidden) return;
      running = true; last = 0; raf = requestAnimationFrame(draw);
    }
    function stop() { running = false; cancelAnimationFrame(raf); }

    function setMode(m, btn) {
      mode = m; pulses = [];
      buttons.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      if (infoEl) infoEl.textContent = INFO[m] || '';
      if (!running) draw(performance.now());
    }

    buttons.forEach(function (b) {
      b.addEventListener('click', function () { setMode(b.getAttribute('data-mode'), b); }, { signal: ac.signal });
    });

    canvas.addEventListener('pointermove', function (e) {
      var r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.on = e.pointerType !== 'touch';
    }, sig);
    canvas.addEventListener('pointerleave', function () { mouse.on = false; }, sig);
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); }, sig);

    var io = new IntersectionObserver(function (en) {
      visible = en[0].isIntersecting;
      visible ? start() : stop();
    }, { threshold: 0.01 });
    io.observe(wrap);

    var rt = 0;
    var ro = new ResizeObserver(function () { clearTimeout(rt); rt = setTimeout(resize, 100); });
    ro.observe(wrap);

    /* Layer reveal is tied to scroll position */
    AS.onScroll(function () {
      if (reduce) return;
      var r = wrap.getBoundingClientRect(), vh = window.innerHeight;
      var next = clamp((vh * 0.92 - r.top) / (vh * 0.55), 0, 1);
      if (Math.abs(next - reveal) > 0.002) { reveal = next; if (!running) draw(performance.now()); }
    });

    setMode('neurons', buttons[0]);
    resize();

    AS.onDispose(function () { stop(); ac.abort(); io.disconnect(); ro.disconnect(); });
  };
})();
