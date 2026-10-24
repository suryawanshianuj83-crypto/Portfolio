/* Hero field — a depth-aware node network with data pulses and a slow wireframe
   solid. Plain Canvas 2D (no dependencies). Pauses off-screen and when the tab is
   hidden, scales down on small/touch screens, and draws one static frame under
   prefers-reduced-motion. */
(function () {
  'use strict';
  var AS = (window.AS = window.AS || {});

  AS.initHero = function () {
    var canvas = document.getElementById('field');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var hero = canvas.parentElement;
    var reduce = AS.reduceMotion();
    var ac = new AbortController();
    var sig = { signal: ac.signal, passive: true };

    var W = 0, H = 0, dpr = 1, small = false;
    var nodes = [], pulses = [];
    var raf = 0, running = false, onScreen = true, lastSpawn = 0, last = 0;
    var mouse = { x: 0, y: 0, sx: 0, sy: 0, on: false };
    var rot = { x: 0.4, y: 0.2 };

    /* ----- wireframe solid (icosahedron) ----- */
    var PHI = (1 + Math.sqrt(5)) / 2;
    var V = [
      [0, 1, PHI], [0, -1, PHI], [0, 1, -PHI], [0, -1, -PHI],
      [1, PHI, 0], [-1, PHI, 0], [1, -PHI, 0], [-1, -PHI, 0],
      [PHI, 0, 1], [-PHI, 0, 1], [PHI, 0, -1], [-PHI, 0, -1]
    ];
    var E = [];
    for (var i = 0; i < V.length; i++) {
      for (var j = i + 1; j < V.length; j++) {
        var dx = V[i][0] - V[j][0], dy = V[i][1] - V[j][1], dz = V[i][2] - V[j][2];
        if (Math.abs(dx * dx + dy * dy + dz * dz - 4) < 0.01) E.push([i, j]);
      }
    }

    function rotate(p, ax, ay) {
      var cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay);
      var x = p[0] * cy + p[2] * sy;
      var z = -p[0] * sy + p[2] * cy;
      var y = p[1] * cx - z * sx;
      z = p[1] * sx + z * cx;
      return [x, y, z];
    }

    function drawSolid(t, cx, cy, R, ax, ay, stroke, vertex, alpha) {
      var pts = [];
      for (var k = 0; k < V.length; k++) {
        var r = rotate(V[k], ax, ay);
        var f = 4 / (4 + r[2] * 0.5);
        pts.push([cx + r[0] * R * f * 0.5, cy + r[1] * R * f * 0.5, r[2]]);
      }
      ctx.lineWidth = 1;
      for (var e = 0; e < E.length; e++) {
        var a = pts[E[e][0]], b = pts[E[e][1]];
        var depth = (a[2] + b[2]) / 2;
        ctx.strokeStyle = stroke + ((0.18 + 0.32 * (depth + 1.7) / 3.4) * alpha).toFixed(3) + ')';
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      }
      for (var n = 0; n < pts.length; n++) {
        var q = pts[n];
        ctx.fillStyle = vertex + ((0.35 + 0.55 * (q[2] + 1.7) / 3.4) * alpha).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(q[0], q[1], 2.1, 0, 6.2832); ctx.fill();
      }
    }

    /* ----- sizing / nodes ----- */
    function seed() {
      var count = small ? 34 : (W > 1500 ? 96 : 72);
      nodes = [];
      for (var i = 0; i < count; i++) {
        var z = Math.random();
        nodes.push({
          x: Math.random() * W, y: Math.random() * H, z: z,
          vx: (Math.random() - 0.5) * 0.18 * (0.4 + z),
          vy: (Math.random() - 0.5) * 0.18 * (0.4 + z)
        });
      }
      pulses = [];
    }

    function resize() {
      var r = hero.getBoundingClientRect();
      small = r.width < 720 || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
      dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2);
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(r.height));
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      if (!running) frame(performance.now(), true);
    }

    /* ----- frame ----- */
    function frame(now, once) {
      var dt = Math.min(48, now - (last || now));
      last = now;
      var t = now * 0.001;

      mouse.sx += (mouse.x - mouse.sx) * 0.06;
      mouse.sy += (mouse.y - mouse.sy) * 0.06;
      var mx = (mouse.sx / W - 0.5), my = (mouse.sy / H - 0.5);
      if (!mouse.on) { mx = 0; my = 0; }

      ctx.clearRect(0, 0, W, H);

      var link = small ? 105 : 140;
      var link2 = link * link;

      /* integrate + parallax positions */
      var px = [], py = [];
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        if (!once) {
          n.x += n.vx * dt * 0.06 * 16; n.y += n.vy * dt * 0.06 * 16;
          if (n.x < -20) n.x = W + 20; else if (n.x > W + 20) n.x = -20;
          if (n.y < -20) n.y = H + 20; else if (n.y > H + 20) n.y = -20;
        }
        px[i] = n.x + mx * (n.z - 0.3) * 60;
        py[i] = n.y + my * (n.z - 0.3) * 60;
      }

      /* edges */
      ctx.lineWidth = 1;
      var edges = [];
      for (var a = 0; a < nodes.length; a++) {
        for (var b = a + 1; b < nodes.length; b++) {
          var dx = px[a] - px[b], dy = py[a] - py[b];
          var d2 = dx * dx + dy * dy;
          if (d2 < link2) {
            var k = 1 - Math.sqrt(d2) / link;
            var depth = (nodes[a].z + nodes[b].z) * 0.5;
            ctx.strokeStyle = 'rgba(120,152,255,' + (k * (0.10 + depth * 0.16)).toFixed(3) + ')';
            ctx.beginPath(); ctx.moveTo(px[a], py[a]); ctx.lineTo(px[b], py[b]); ctx.stroke();
            if (edges.length < 160) edges.push([a, b]);
          }
        }
      }

      /* cursor links */
      if (mouse.on && !small) {
        var cx = mouse.sx, cy = mouse.sy, cr = 170;
        for (var c = 0; c < nodes.length; c++) {
          var ddx = px[c] - cx, ddy = py[c] - cy, dd = Math.sqrt(ddx * ddx + ddy * ddy);
          if (dd < cr) {
            ctx.strokeStyle = 'rgba(70,221,235,' + ((1 - dd / cr) * 0.45).toFixed(3) + ')';
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px[c], py[c]); ctx.stroke();
          }
        }
        ctx.fillStyle = 'rgba(70,221,235,.55)';
        ctx.beginPath(); ctx.arc(cx, cy, 2.2, 0, 6.2832); ctx.fill();
      }

      /* nodes */
      for (var m = 0; m < nodes.length; m++) {
        var z = nodes[m].z;
        ctx.fillStyle = 'rgba(205,218,255,' + (0.22 + z * 0.55).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(px[m], py[m], 0.7 + z * 1.7, 0, 6.2832); ctx.fill();
      }

      /* data pulses travelling along edges */
      if (!once) {
        if (now - lastSpawn > (small ? 700 : 380) && pulses.length < (small ? 5 : 11) && edges.length) {
          var pick = edges[(Math.random() * edges.length) | 0];
          pulses.push({ a: pick[0], b: pick[1], t: 0, s: 0.0007 + Math.random() * 0.0009 });
          lastSpawn = now;
        }
        for (var p = pulses.length - 1; p >= 0; p--) {
          var pu = pulses[p];
          pu.t += pu.s * dt * 16;
          if (pu.t >= 1) { pulses.splice(p, 1); continue; }
          var x = px[pu.a] + (px[pu.b] - px[pu.a]) * pu.t;
          var y = py[pu.a] + (py[pu.b] - py[pu.a]) * pu.t;
          ctx.fillStyle = 'rgba(70,221,235,.16)';
          ctx.beginPath(); ctx.arc(x, y, 6, 0, 6.2832); ctx.fill();
          ctx.fillStyle = 'rgba(190,245,255,.95)';
          ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 6.2832); ctx.fill();
        }
      }

      /* wireframe solid */
      if (!once) { rot.y += dt * 0.00018; rot.x += dt * 0.00007; }
      var big = small ? Math.min(W * 0.34, 150) : Math.min(W * 0.2, H * 0.34, 330);
      var scx = small ? W * 0.72 : W * 0.74;
      var scy = small ? H * 0.2 : H * 0.4;
      var ax = rot.x + my * 0.5, ay = rot.y + mx * 0.9;
      drawSolid(t, scx, scy, big * 2, ax, ay, 'rgba(91,140,255,', 'rgba(190,210,255,', 1);
      drawSolid(t, scx, scy, big * 1.05, -ax * 1.3, -ay * 1.3, 'rgba(146,119,255,', 'rgba(220,205,255,', 0.9);

      if (!once && running) raf = requestAnimationFrame(frame);
    }

    function start() {
      if (reduce || running || !onScreen || document.hidden) return;
      running = true; last = 0;
      raf = requestAnimationFrame(frame);
    }
    function stop() { running = false; cancelAnimationFrame(raf); }

    /* ----- events ----- */
    window.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      if (e.clientY < r.top || e.clientY > r.bottom) { mouse.on = false; return; }
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
      if (!mouse.on) { mouse.sx = mouse.x; mouse.sy = mouse.y; }
      mouse.on = e.pointerType !== 'touch';
    }, sig);
    document.addEventListener('pointerleave', function () { mouse.on = false; }, sig);
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); }, sig);

    var io = new IntersectionObserver(function (en) {
      onScreen = en[0].isIntersecting;
      onScreen ? start() : stop();
    }, { threshold: 0 });
    io.observe(hero);

    var rt = 0;
    var ro = new ResizeObserver(function () { clearTimeout(rt); rt = setTimeout(resize, 120); });
    ro.observe(hero);

    resize();
    start();

    AS.onDispose(function () { stop(); ac.abort(); io.disconnect(); ro.disconnect(); });
  };
})();
