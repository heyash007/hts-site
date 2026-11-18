/* HTS first-visit loader
   - plays on every page load (the inline <head> script sets html.hts-loading)
   - 3 s pour (ease-in-out progress) -> hop + stars (0.43 s) -> lift (0.55 s)  ≈ 4 s on a fast connection
   - waits for window 'load' but never longer than 6 s; progress holds at 90% until then
   - skip button, click/tap anywhere, or Esc dismisses it                                          */
(function () {
  'use strict';
  var root = document.documentElement;
  var el = document.getElementById('hts-loader');
  if (!el) { root.classList.remove('hts-loading'); return; }

  var MIN = 3000, MAX = 6000;
  var fill = document.getElementById('hts-fill');
  var skip = document.getElementById('hts-skip');
  var page = document.querySelector('.page');
  var spark = document.getElementById('hts-spark');
  var len = fill.getTotalLength();
  fill.style.strokeDasharray = len;

  var t0, last, p, loaded, raf, finished = true, timers = [], restoreFocus = null;

  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

  function setP(v) {
    p = v;
    fill.style.strokeDashoffset = len * (1 - v);
    var pt = fill.getPointAtLength(len * v);
    spark.setAttribute('transform', 'translate(' + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1) + ')');
    el.style.setProperty('--heat', (0.25 + v * 0.75).toFixed(2));
  }

  function tick(now) {
    var t = now - t0, dt = now - last; last = now;
    var x = Math.min(1, t / MIN);
    var eased = x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;   // ease-in-out
    var target = Math.min(loaded ? 1 : .9, eased);                        // hold at 90% until loaded
    setP(Math.max(p, Math.min(target, p + dt * 0.0025)));                 // monotonic, quick catch-up after load
    if ((loaded && t >= MIN && p >= 1) || t >= MAX) return finish();
    raf = requestAnimationFrame(tick);
  }

  function finish() {
    if (finished) return;
    finished = true; cancelAnimationFrame(raf);
    setP(1);
    el.classList.remove('dance'); void el.offsetWidth; el.classList.add('done');
    later(function () { el.classList.add('out'); }, 430);
    later(close, 1000);
  }

  function close() {
    root.classList.remove('hts-loading');          // unlocks scroll, hides overlay (display:none)
    if (page) page.removeAttribute('inert');
    if (restoreFocus && restoreFocus.focus) { try { restoreFocus.focus({ preventScroll: true }); } catch (e) {} }
  }

  function fontReady() {
    // Caption must never show in a fallback font: reveal it only once Poppins 500 is usable (1.5 s safety net).
    var done = function () { el.classList.add('hts-font-ready'); };
    if (!document.fonts || !document.fonts.load) return done();
    Promise.race([
      document.fonts.load('500 15px Poppins', 'spilling the tea…'),
      new Promise(function (r) { setTimeout(r, 1500); })
    ]).then(done, done);
  }

  function start(loadPromise) {
    timers.forEach(clearTimeout); timers = [];
    cancelAnimationFrame(raf);
    root.classList.add('hts-loading');
    if (page) page.setAttribute('inert', '');
    el.className = 'hts-loader';
    finished = false; loaded = false; setP(0);
    restoreFocus = document.activeElement;
    fontReady();
    requestAnimationFrame(function () { el.classList.add('in'); });
    later(function () { if (!finished) el.classList.add('dance'); }, 380);
    loadPromise.then(function () { loaded = true; });
    skip.focus({ preventScroll: true });
    t0 = last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  skip.addEventListener('click', function (e) { e.stopPropagation(); finish(); });
  el.addEventListener('click', finish);
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && !finished) finish(); });

  var pageLoad = new Promise(function (r) {
    if (document.readyState === 'complete') r(); else addEventListener('load', function () { r(); }, { once: true });
  });

  if (root.classList.contains('hts-loading')) {
    start(pageLoad);
  }

  // demo helper: HTSLoader.replay(ms) pretends the page takes ms to load
  window.HTSLoader = { replay: function (ms) { start(new Promise(function (r) { setTimeout(r, ms); })); } };
})();
