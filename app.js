(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* mobile drawer */
  var burger = document.querySelector('.burger');
  var drawer = document.getElementById('mnav');
  function setNav(open) {
    if (!burger || !drawer) return;
    drawer.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    root.classList.toggle('nav-open', open);
  }
  if (burger && drawer) {
    burger.addEventListener('click', function () { setNav(!drawer.classList.contains('open')); });
    drawer.addEventListener('click', function (e) { if (e.target.closest('a')) setNav(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setNav(false); });
    window.matchMedia('(min-width: 900px)').addEventListener('change', function (m) { if (m.matches) setNav(false); });
  }

  /* menu jump bar: highlight the section in view */
  var jump = document.querySelector('.mjump');
  if (jump) {
    var jt = jump.querySelector('.mj-track');
    var links = Array.prototype.slice.call(jt.querySelectorAll('a'));
    var secs = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
    var cur = null, spyTick = false;
    var setCur = function (i) {
      if (i === cur) return;
      cur = i;
      links.forEach(function (a, k) { if (k === i) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
      var a = links[i];
      if (a) {
        var left = a.offsetLeft - (jt.clientWidth - a.offsetWidth) / 2;
        jt.scrollTo({ left: left, behavior: reduce.matches ? 'auto' : 'smooth' });
      }
    };
    var spy = function () {
      spyTick = false;
      var line = (parseFloat(getComputedStyle(root).getPropertyValue('--hdr')) || 64) + jump.offsetHeight + 24;
      var idx = -1;
      secs.forEach(function (s, k) { if (s && s.getBoundingClientRect().top <= line) idx = k; });
      setCur(idx);
    };
    window.addEventListener('scroll', function () { if (!spyTick) { spyTick = true; requestAnimationFrame(spy); } }, { passive: true });
    window.addEventListener('resize', spy);
    jt.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (a) setCur(links.indexOf(a));
    });
    spy();
  }

  /* reveals and draw-in */
  var targets = document.querySelectorAll('[data-reveal], .art[data-draw]');
  if ('IntersectionObserver' in window && !reduce.matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    targets.forEach(function (t) { io.observe(t); });
  } else {
    targets.forEach(function (t) { t.classList.add('is-in'); });
  }

  /* the in-between strip: pinned horizontal scroll on large screens, native swipe elsewhere */
  var strip = document.querySelector('.strip');
  if (strip) {
    var pin = strip.querySelector('.pin');
    var track = strip.querySelector('.track');
    var fill = strip.querySelector('.sh-fill');
    var wide = window.matchMedia('(min-width: 900px)');
    var pinned = false, shift = 0, ticking = false;

    var hdr = function () { return parseFloat(getComputedStyle(root).getPropertyValue('--hdr')) || 64; };
    var clamp = function (v) { return Math.max(0, Math.min(1, v)); };

    function layout() {
      pinned = wide.matches && !reduce.matches;
      strip.classList.toggle('is-pinned', pinned);
      if (pinned) {
        track.style.transform = '';
        shift = Math.max(0, track.scrollWidth - pin.clientWidth);
        strip.style.height = (shift + pin.offsetHeight) + 'px';
      } else {
        strip.style.height = '';
        track.style.transform = '';
      }
      update();
    }
    function update() {
      ticking = false;
      var p;
      if (pinned) {
        var total = strip.offsetHeight - pin.offsetHeight;
        p = total > 0 ? clamp((hdr() - strip.getBoundingClientRect().top) / total) : 0;
        track.style.transform = 'translate3d(' + (-p * shift).toFixed(1) + 'px,0,0)';
      } else {
        var max = track.scrollWidth - track.clientWidth;
        p = max > 0 ? clamp(track.scrollLeft / max) : 0;
      }
      strip.style.setProperty('--p', Math.max(0.04, p).toFixed(4));
      strip.dataset.progress = p.toFixed(3);
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }

    window.addEventListener('scroll', onScroll, { passive: true });
    track.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', layout);
    window.addEventListener('load', layout);
    wide.addEventListener('change', layout);
    reduce.addEventListener('change', layout);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
    Array.prototype.forEach.call(strip.querySelectorAll('img'), function (im) {
      if (!im.complete) im.addEventListener('load', layout);
    });
    layout();

    /* focus inside the pinned strip: scroll the page, never the clipped box */
    pin.addEventListener('scroll', function () { pin.scrollLeft = 0; });
    strip.addEventListener('focusin', function (e) {
      if (!pinned || e.target === track) return;
      var el = e.target.closest('.slide') || e.target;
      var total = strip.offsetHeight - pin.offsetHeight;
      var want = clamp((el.offsetLeft - parseFloat(getComputedStyle(track).paddingLeft)) / (shift || 1));
      var top = strip.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({ top: top - hdr() + want * total, behavior: 'auto' });
    });

    /* keyboard users: bring a focused photo's neighbours into view in pinned mode */
    track.addEventListener('keydown', function (e) {
      if (pinned) return;
      if (e.key === 'ArrowRight') track.scrollBy({ left: 320, behavior: 'smooth' });
      if (e.key === 'ArrowLeft') track.scrollBy({ left: -320, behavior: 'smooth' });
    });
  }
})();
