/* Skills constellation — buttons are real, keyboard-focusable controls.
   Hover / focus / tap lights a skill and the skills it is used with, and draws
   the connections between them in an SVG layer behind the buttons. */
(function () {
  'use strict';
  var AS = (window.AS = window.AS || {});
  var NS = 'http://www.w3.org/2000/svg';

  var INFO = {
    py: ['Python', 'My main language — analysis, dashboards and Flask apps.'],
    pandas: ['Pandas', 'Cleaning, reshaping and exploring tabular data; central to the shipping analysis.'],
    sql: ['SQL', 'Querying and storing data; CRUD and database integration from the ITS internship.'],
    pbi: ['Power BI', 'Reports and dashboards built on cleaned, structured data.'],
    viz: ['Data visualization', 'Turning cleaned data into charts, maps and dashboards people can read.'],
    clean: ['Data cleaning', 'Fixing, validating and standardizing records before any analysis.'],
    prep: ['Data preprocessing', 'Preparing data — encoding, scaling, splitting — for analysis and models.'],
    ml: ['Machine learning', 'Learning patterns from data; used in the Maatri.ai prototype.'],
    ai: ['Artificial intelligence', 'The wider field I am working toward, from classical ML to neural networks.'],
    nn: ['Neural networks', 'Currently exploring layers, activations, loss and backpropagation.'],
    dl: ['Deep learning', 'Stacking layers so models can learn richer representations.'],
    flask: ['Python Flask', 'Lightweight Python web framework behind the Maatri.ai prototype.'],
    js: ['JavaScript', 'Interactivity for the web: forms, UI behavior and animation.'],
    html: ['HTML', 'Semantic structure for pages and forms.'],
    css: ['CSS', 'Layout, responsive design and motion.'],
    bs: ['Bootstrap', 'Used for responsive multi-page websites during the ITS internship.'],
    st: ['Streamlit', 'Used to build the interactive shipping dashboard.'],
    plotly: ['Plotly', 'Interactive charts for the shipping analysis.'],
    git: ['Git', 'Version control for my projects.'],
    gh: ['GitHub', 'Where my projects live and are shared.'],
    docker: ['Docker', 'Packaging an app and its dependencies into a container.'],
    vsc: ['VS Code', 'My everyday editor.']
  };

  var PAIRS = [
    ['py', 'pandas'], ['py', 'plotly'], ['py', 'st'], ['py', 'flask'], ['py', 'ml'], ['py', 'sql'],
    ['pandas', 'clean'], ['pandas', 'prep'], ['pandas', 'viz'], ['pandas', 'plotly'],
    ['sql', 'clean'], ['sql', 'pbi'], ['pbi', 'viz'], ['viz', 'plotly'], ['viz', 'st'], ['plotly', 'st'],
    ['clean', 'prep'], ['prep', 'ml'], ['ml', 'ai'], ['ml', 'nn'], ['ml', 'flask'], ['ai', 'nn'], ['ai', 'dl'], ['nn', 'dl'],
    ['flask', 'html'], ['flask', 'js'], ['html', 'css'], ['html', 'js'], ['css', 'js'], ['css', 'bs'], ['bs', 'html'], ['js', 'bs'],
    ['git', 'gh'], ['git', 'vsc'], ['docker', 'flask'], ['docker', 'git']
  ];

  AS.initSkills = function () {
    var box = document.getElementById('constellation');
    var svg = document.getElementById('skLines');
    var nameEl = document.getElementById('skName');
    var descEl = document.getElementById('skDesc');
    if (!box || !svg) return;

    var ac = new AbortController();
    var btns = Array.prototype.slice.call(box.querySelectorAll('.sk'));
    var byId = {};
    btns.forEach(function (b) { byId[b.getAttribute('data-id')] = b; });
    var lines = [];
    var current = null;
    var DEFAULT = ['Select a skill', 'Connections light up between skills that I use together.'];

    function center(b, br) {
      var r = b.getBoundingClientRect();
      return { x: r.left - br.left + r.width / 2, y: r.top - br.top + r.height / 2 };
    }

    function draw() {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      lines = [];
      var br = box.getBoundingClientRect();
      svg.setAttribute('viewBox', '0 0 ' + br.width + ' ' + br.height);
      PAIRS.forEach(function (p) {
        var a = byId[p[0]], b = byId[p[1]];
        if (!a || !b) return;
        var ca = center(a, br), cb = center(b, br);
        var ln = document.createElementNS(NS, 'line');
        ln.setAttribute('x1', ca.x.toFixed(1)); ln.setAttribute('y1', ca.y.toFixed(1));
        ln.setAttribute('x2', cb.x.toFixed(1)); ln.setAttribute('y2', cb.y.toFixed(1));
        svg.appendChild(ln);
        lines.push({ a: p[0], b: p[1], el: ln });
      });
      if (current) activate(current, true);
    }

    function related(id) {
      var set = {};
      PAIRS.forEach(function (p) { if (p[0] === id) set[p[1]] = 1; else if (p[1] === id) set[p[0]] = 1; });
      return set;
    }

    function activate(id, keepText) {
      current = id;
      var rel = related(id);
      box.classList.add('is-hover');
      btns.forEach(function (b) {
        var k = b.getAttribute('data-id');
        b.classList.toggle('is-hot', k === id);
        b.classList.toggle('is-rel', !!rel[k]);
      });
      lines.forEach(function (l) { l.el.classList.toggle('hot', l.a === id || l.b === id); });
      if (!keepText && INFO[id]) { nameEl.textContent = INFO[id][0]; descEl.textContent = INFO[id][1]; }
    }

    function clear() {
      current = null;
      box.classList.remove('is-hover');
      btns.forEach(function (b) { b.classList.remove('is-hot', 'is-rel'); });
      lines.forEach(function (l) { l.el.classList.remove('hot'); });
      nameEl.textContent = DEFAULT[0]; descEl.textContent = DEFAULT[1];
    }

    var opt = { signal: ac.signal };
    btns.forEach(function (b) {
      var id = b.getAttribute('data-id');
      b.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'touch') activate(id); }, opt);
      b.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch') clear(); }, opt);
      b.addEventListener('focus', function () { activate(id); }, opt);
      b.addEventListener('blur', clear, opt);
      b.addEventListener('click', function () { activate(id); }, opt);
    });
    document.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch' && !box.contains(e.target)) clear();
    }, opt);

    var rt = 0;
    var ro = new ResizeObserver(function () { clearTimeout(rt); rt = setTimeout(draw, 80); });
    ro.observe(box);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
    draw();

    AS.onDispose(function () { ac.abort(); ro.disconnect(); clearTimeout(rt); });
  };
})();
