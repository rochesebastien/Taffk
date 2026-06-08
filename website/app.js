/* Taffk — interactions du site vitrine. Vanilla, aucune dépendance. */
(function () {
  'use strict';

  /* ── Thème clair / sombre (persisté) ─────────────────────────────────── */
  var root = document.documentElement;
  var stored = null;
  try {
    stored = localStorage.getItem('taffk.site.theme');
  } catch (e) {}
  if (stored) {
    root.setAttribute('data-theme', stored);
  } else if (
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    root.setAttribute('data-theme', 'dark');
  }

  var toggle = document.getElementById('themeToggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try {
        localStorage.setItem('taffk.site.theme', next);
      } catch (e) {}
    });
  }

  /* ── Nav : fond au scroll ────────────────────────────────────────────── */
  var nav = document.getElementById('nav');
  var onScroll = function () {
    if (window.scrollY > 12) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── Reveal au scroll ────────────────────────────────────────────────── */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add('in');
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    reveals.forEach(function (el) {
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) {
      el.classList.add('in');
    });
  }

  /* ── Démo de saisie clavier (#tag @projet) ───────────────────────────── */
  var typeEl = document.getElementById('kbType');
  var resultEl = document.getElementById('kbResult');
  if (typeEl && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Segments : texte brut, étiquette (#), projet (@)
    var segments = [
      { t: 'Écrire les textes de la landing ', c: '' },
      { t: '#refonte', c: 'tok-tag' },
      { t: ' ', c: '' },
      { t: '@Site', c: 'tok-proj' },
    ];

    var caret = '<span class="caret"></span>';

    function render(plainLen) {
      // Reconstruit le HTML jusqu'à plainLen caractères tapés
      var remaining = plainLen;
      var html = '';
      for (var i = 0; i < segments.length; i++) {
        var seg = segments[i];
        if (remaining <= 0) break;
        var take = Math.min(seg.t.length, remaining);
        var chunk = seg.t.slice(0, take);
        var safe = chunk.replace(/&/g, '&amp;').replace(/</g, '&lt;');
        if (seg.c) html += '<span class="' + seg.c + '">' + safe + '</span>';
        else html += safe;
        remaining -= take;
      }
      typeEl.innerHTML = html + caret;
    }

    var total = segments.reduce(function (n, s) {
      return n + s.t.length;
    }, 0);

    function runCycle() {
      var i = 0;
      resultEl.classList.remove('show');
      render(0);

      var typer = setInterval(function () {
        i++;
        render(i);
        if (i >= total) {
          clearInterval(typer);
          setTimeout(function () {
            resultEl.classList.add('show');
          }, 350);
          // Pause, puis on recommence
          setTimeout(runCycle, 4200);
        }
      }, 55);
    }

    // Démarre quand la démo entre dans le viewport
    var started = false;
    if ('IntersectionObserver' in window) {
      var demoIo = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting && !started) {
              started = true;
              setTimeout(runCycle, 400);
              demoIo.disconnect();
            }
          });
        },
        { threshold: 0.4 }
      );
      demoIo.observe(typeEl);
    } else {
      runCycle();
    }
  }

  /* ── Parallaxe douce de la maquette ──────────────────────────────────── */
  var mock = document.querySelector('.mock');
  if (mock && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var ticking = false;
    window.addEventListener(
      'scroll',
      function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(function () {
          var y = Math.min(window.scrollY, 600);
          var tilt = Math.max(4 - y / 90, 0);
          mock.style.transform = 'rotateX(' + tilt.toFixed(2) + 'deg)';
          ticking = false;
        });
      },
      { passive: true }
    );
  }
})();
