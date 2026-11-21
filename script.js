(function () {
    var root = document.documentElement, $ = function (q) { return [].slice.call(document.querySelectorAll(q)); };
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    document.getElementById('yr').textContent = new Date().getFullYear();


    // entry intro: plays once per session, never blocks interaction
    (function () {
        var intro = document.getElementById('intro');
        if (!intro) return;
        if (!root.classList.contains('intro-on')) { intro.remove(); return; }

        var done = false, timer;
        function finish() {
            if (done) return;
            done = true;
            clearTimeout(timer);
            try { sessionStorage.setItem('introSeen', '1'); } catch (e) { }
            ['pointerdown', 'keydown'].forEach(function (t) { removeEventListener(t, skip); });
            intro.classList.add('out');               // curtain lifts
            root.classList.remove('intro-on');        // hero animations start
            setTimeout(function () { intro.remove(); }, 1200);
        }
        // a deliberate click or key press skips, but only after a short grace period
        // (stray scroll / touch events no longer cut the intro off mid-way)
        var t0 = Date.now();
        function skip() { if (Date.now() - t0 > 900) finish(); }
        ['pointerdown', 'keydown'].forEach(function (t) { addEventListener(t, skip, { passive: true }); });

        // wait briefly for the two fonts so the signature never swaps mid-write
        var fonts = document.fonts && document.fonts.load
            ? Promise.race([
                Promise.all([document.fonts.load('800 1em Manrope'), document.fonts.load('1em Allura')]),
                new Promise(function (r) { setTimeout(r, 450); })
            ]).catch(function () { })
            : Promise.resolve();

        fonts.then(function () {
            if (done) return;
            intro.classList.add('intro-go');
            timer = setTimeout(finish, 4300);
        });
    })();

    // theme
    var tbtn = document.getElementById('theme'), meta = document.querySelector('meta[name="theme-color"]');
    function paint() {
        var dark = root.dataset.theme === 'dark';
        tbtn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
        meta.content = dark ? '#121110' : '#F7F4ED';
    }
    tbtn.addEventListener('click', function () {
        root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
        try { localStorage.setItem('theme', root.dataset.theme); } catch (e) { }
        paint();
    });
    paint();

    // mobile nav
    var burger = document.getElementById('burger'), nav = document.getElementById('nav');
    function menu(open) { nav.classList.toggle('open', open); burger.setAttribute('aria-expanded', open); burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); }
    burger.addEventListener('click', function () { menu(!nav.classList.contains('open')); });
    nav.addEventListener('click', function (e) { if (e.target.tagName === 'A') menu(false); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape') menu(false); });

    // hero name: "Darshan" is split into letters so they can rise one by one
    var dar = document.querySelector('.dar');
    if (dar && !reduce) {
        var txt = dar.textContent;
        dar.textContent = '';
        dar.setAttribute('aria-hidden', 'true');
        txt.split('').forEach(function (c, i) {
            var s = document.createElement('span');
            s.className = 'ch'; s.textContent = c; s.style.setProperty('--d', i);
            dar.appendChild(s);
        });
    }

    // staggered reveal: tag children, give each a delay by its column
    function stagger(sel, cols) {
        $(sel).forEach(function (el, i) {
            el.classList.add('rv');
            el.style.setProperty('--i', i % cols);
        });
    }
    $('.sk-group').forEach(function (g) {
        g.querySelector('h3').classList.add('rv');
        [].forEach.call(g.querySelectorAll('.sk-item'), function (el, i) { el.classList.add('rv'); el.style.setProperty('--i', i % 6); });
    });
    stagger('.contact a', 5);

    // project tech list becomes chips that pop in one by one
    $('.tags').forEach(function (t) {
        var parts = t.textContent.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
        t.textContent = '';
        t.setAttribute('role', 'list');
        parts.forEach(function (p, i) {
            var c = document.createElement('span');
            c.className = 'chip'; c.setAttribute('role', 'listitem'); c.textContent = p; c.style.setProperty('--k', i);
            t.appendChild(c);
        });
    });

    // mockup pieces build in sequence
    $('.bars').forEach(function (b) { [].forEach.call(b.children, function (s, i) { s.style.setProperty('--k', i); }); });
    $('.mock').forEach(function (m) { [].forEach.call(m.querySelectorAll('b,u'), function (s, i) { s.style.setProperty('--k', i); }); });

    // scroll-linked effects
    var navLock = 0;
    var ids = ['home', 'about', 'work', 'journey', 'skills', 'contact'], secs = ids.map(function (i) { return document.getElementById(i); }),
        links = $('#nav a'), header = document.getElementById('top'), ghost = document.getElementById('ghost'),
        prog = document.getElementById('progress'), grid = document.querySelector('.hero-grid'),
        tl = document.querySelector('.tl'), tlis = $('.tl > li'), wins = $('.win'),
        tick = false;

    function setActive(cur) {
        links.forEach(function (a) { var on = a.getAttribute('href') === '#' + cur; a.classList.toggle('on', on); on ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'); });
    }
    // clicking a nav link highlights it straight away and holds it while the page scrolls smoothly there
    links.forEach(function (a) {
        a.addEventListener('click', function () {
            var id = (a.getAttribute('href') || '').slice(1);
            if (ids.indexOf(id) < 0) return;
            navLock = Date.now() + 1100;
            setActive(id);
        });
    });

    function onScroll() {
        var cur = ids[0], vh = innerHeight;
        secs.forEach(function (s, i) { if (s.getBoundingClientRect().top < vh * .4) cur = ids[i]; });
        if (Date.now() > navLock) setActive(cur);
        header.classList.toggle('stuck', scrollY > 8);

        // reading progress bar
        var max = root.scrollHeight - vh;
        prog.style.transform = 'scaleX(' + (max > 0 ? Math.min(scrollY / max, 1) : 0).toFixed(4) + ')';

        if (reduce) {
            tl.style.setProperty('--tp', 1);
            tlis.forEach(function (li) { li.classList.add('reached'); });
            tick = false;
            return;
        }

        // hero: ghost word drifts, content fades and lifts away
        if (scrollY < vh) {
            var p = scrollY / vh;
            ghost.style.transform = 'translate3d(' + (scrollY * -.06) + 'px,' + (scrollY * .12) + 'px,0)';
            grid.style.opacity = Math.max(1 - p * 1.15, 0).toFixed(3);
            grid.style.transform = 'translate3d(0,' + (p * -48).toFixed(1) + 'px,0)';
        }

        // timeline: line draws down as you scroll, dots fill when reached
        var r = tl.getBoundingClientRect();
        tl.style.setProperty('--tp', Math.min(Math.max((vh * .6 - r.top) / r.height, 0), 1).toFixed(4));
        tlis.forEach(function (li) { li.classList.toggle('reached', li.getBoundingClientRect().top < vh * .6); });

        // project mockups float slightly against the page
        wins.forEach(function (w) {
            var b = w.getBoundingClientRect();
            if (b.bottom < 0 || b.top > vh) return;
            w.style.transform = 'translate3d(0,' + (((b.top + b.height / 2 - vh / 2) / vh) * -10).toFixed(1) + 'px,0)';
        });

        tick = false;
    }
    addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(onScroll); } }, { passive: true });
    addEventListener('resize', onScroll);
    onScroll();

    // reveal
    if (reduce || !('IntersectionObserver' in window)) { $('.rv').forEach(function (e) { e.classList.add('in'); }); }
    else {
        var io = new IntersectionObserver(function (es) {
            es.forEach(function (e) {
                if (!e.isIntersecting) return;
                var el = e.target;
                el.classList.add('in'); io.unobserve(el);
                // clear the stagger delay afterwards so hover effects stay instant
                setTimeout(function () { el.style.removeProperty('--i'); }, 1200);
            });
        }, { threshold: .05, rootMargin: '0px 0px -8% 0px' });
        $('.rv').forEach(function (el) { io.observe(el); });
    }

    // pointer effects (mouse only)
    if (!reduce && fine) {
        var pw = document.querySelector('.portrait-wrap'), pt = document.querySelector('.portrait');
        pw.addEventListener('pointermove', function (e) {
            var r = pw.getBoundingClientRect();
            pt.style.setProperty('--ry', (((e.clientX - r.left) / r.width - .5) * 12).toFixed(2) + 'deg');
            pt.style.setProperty('--rx', ((.5 - (e.clientY - r.top) / r.height) * 12).toFixed(2) + 'deg');
        });
        pw.addEventListener('pointerleave', function () { pt.style.removeProperty('--rx'); pt.style.removeProperty('--ry'); });

        $('.btn.solid, .hire').forEach(function (b) {
            b.addEventListener('pointermove', function (e) {
                var r = b.getBoundingClientRect();
                b.style.setProperty('--mx', ((e.clientX - r.left - r.width / 2) * .2).toFixed(1) + 'px');
                b.style.setProperty('--my', ((e.clientY - r.top - r.height / 2) * .3).toFixed(1) + 'px');
            });
            b.addEventListener('pointerleave', function () { b.style.removeProperty('--mx'); b.style.removeProperty('--my'); });
        });
    }

    // open-to-work dialog
    var d = document.getElementById('workDlg');
    function closeDlg() { if (d.close) d.close(); else d.removeAttribute('open'); }
    document.getElementById('workBtn').addEventListener('click', function () { if (d.showModal) d.showModal(); else d.setAttribute('open', ''); });
    document.getElementById('workX').addEventListener('click', closeDlg);
    d.addEventListener('click', function (e) { if (e.target === d) closeDlg(); });
})();

/* background: scroll fade + gentle mouse parallax (desktop only). Theme is handled in CSS. */
(function () {
    var fx = document.querySelector('.bgfx');
    if (!fx) return;
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    var ticking = false;

    function onScroll() {
        var p = Math.min(Math.max(window.scrollY / (innerHeight * .9), 0), 1);
        fx.style.setProperty('--sf', p.toFixed(3));
        ticking = false;
    }
    addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();

    if (reduce || !fine) return;
    var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    function loop() {
        cx += (tx - cx) * .06; cy += (ty - cy) * .06;
        fx.style.setProperty('--px', cx.toFixed(3));
        fx.style.setProperty('--py', cy.toFixed(3));
        raf = (Math.abs(tx - cx) > .001 || Math.abs(ty - cy) > .001) ? requestAnimationFrame(loop) : 0;
    }
    function go() { if (!raf) raf = requestAnimationFrame(loop); }
    addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        tx = e.clientX / innerWidth * 2 - 1; ty = e.clientY / innerHeight * 2 - 1; go();
    }, { passive: true });
    document.addEventListener('mouseleave', function () { tx = 0; ty = 0; go(); });
})();

/* hover grid: cells light up under the pointer, then fade out behind it (ported from 21st.dev Interactive Grid) */
(function () {
    var svg = document.getElementById('hovergrid');
    if (!svg) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !matchMedia('(hover: hover) and (pointer: fine)').matches) { svg.remove(); return; }
    var CELL = 40, cols = 0, rows = 0, rects = [], active = -1, NS = 'http://www.w3.org/2000/svg', timer = 0;

    function build() {
        var w = innerWidth, h = innerHeight;
        cols = Math.ceil(w / CELL); rows = Math.ceil(h / CELL);
        svg.textContent = '';
        rects = [];
        var frag = document.createDocumentFragment();
        for (var i = 0; i < cols * rows; i++) {
            var r = document.createElementNS(NS, 'rect');
            r.setAttribute('x', (i % cols) * CELL);
            r.setAttribute('y', Math.floor(i / cols) * CELL);
            r.setAttribute('width', CELL);
            r.setAttribute('height', CELL);
            frag.appendChild(r);
            rects.push(r);
        }
        svg.appendChild(frag);
        active = -1;
    }
    function light(i) {
        if (i === active) return;
        if (active >= 0 && rects[active]) rects[active].classList.remove('on');
        active = i;
        if (i >= 0 && rects[i]) rects[i].classList.add('on');
    }
    addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        var c = Math.floor(e.clientX / CELL), r = Math.floor(e.clientY / CELL);
        light(c >= 0 && r >= 0 && c < cols && r < rows ? r * cols + c : -1);
    }, { passive: true });
    document.addEventListener('mouseleave', function () { light(-1); });
    addEventListener('resize', function () { clearTimeout(timer); timer = setTimeout(build, 150); });
    build();
})();

/* about text: words light up as you scroll past (scroll-linked word reveal, like 21st.dev "Text Reveal" / "Reading Text Reveal").
   No pinning or scroll-jacking: the page scrolls normally. */
(function () {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var paras = [].slice.call(document.querySelectorAll('#about .body'));
    if (!paras.length) return;
    var data = paras.map(function (p) {
        var words = p.textContent.replace(/\s+/g, ' ').trim().split(' ');
        p.textContent = '';
        var spans = words.map(function (w, i) {
            var s = document.createElement('span');
            s.className = 'sw'; s.textContent = w;
            p.appendChild(s);
            if (i < words.length - 1) p.appendChild(document.createTextNode(' '));
            return s;
        });
        return { p: p, spans: spans };
    });
    var busy = false;
    function update() {
        var vh = innerHeight;
        data.forEach(function (d) {
            var r = d.p.getBoundingClientRect();
            var prog = (vh * .88 - r.top) / (r.height + vh * .22);
            prog = Math.min(Math.max(prog, 0), 1);
            var n = d.spans.length, t = prog * (n + 6);
            d.spans.forEach(function (s, i) {
                var o = Math.min(Math.max(t - i, 0), 1);
                s.style.opacity = (.16 + .84 * o).toFixed(3);
            });
        });
        busy = false;
    }
    addEventListener('scroll', function () { if (!busy) { busy = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update);
    update();
})();

/* rotating role line (hero): one role at a time, vertical slide.
   "I build ..." line (about): typewriter, types a word, holds, deletes, next word.
   Plain text stays if motion is reduced. */
(function () {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var els = [].slice.call(document.querySelectorAll('[data-roles]'));
    els.forEach(function (el) {
        var pre = el.getAttribute('data-prefix') || '';
        var full = el.getAttribute('data-roles') || el.textContent.trim();
        var words = full.split('|').map(function (w) { return w.trim(); }).filter(Boolean);
        if (words.length < 2) return;
        el.textContent = '';
        var sr = document.createElement('span'); sr.className = 'sr'; sr.textContent = pre ? pre + ' ' + words.join(', ') : full;
        el.appendChild(sr);

        if (pre) {                                   // typewriter
            var p = document.createElement('span'); p.className = 'rb-pre'; p.setAttribute('aria-hidden', 'true'); p.textContent = pre;
            var tw = document.createElement('span'); tw.className = 'tw'; tw.setAttribute('aria-hidden', 'true');
            var caret = document.createElement('span'); caret.className = 'caret'; caret.setAttribute('aria-hidden', 'true');
            el.appendChild(p); el.appendChild(tw); el.appendChild(caret);
            var wi = 0, ci = 0, del = false;
            (function step() {
                if (document.hidden) { setTimeout(step, 500); return; }
                var w = words[wi];
                if (!del) {
                    ci++; tw.textContent = w.slice(0, ci);
                    if (ci === w.length) { del = true; setTimeout(step, 1900); return; }
                    setTimeout(step, 85);
                } else {
                    ci--; tw.textContent = w.slice(0, ci);
                    if (ci === 0) { del = false; wi = (wi + 1) % words.length; setTimeout(step, 350); return; }
                    setTimeout(step, 45);
                }
            })();
            return;
        }

        var win = document.createElement('span'); win.className = 'role-win'; win.setAttribute('aria-hidden', 'true');   // vertical slide
        var nodes = words.map(function (w) {
            var s = document.createElement('span'); s.className = 'rw'; s.textContent = w; win.appendChild(s); return s;
        });
        el.appendChild(win);
        var i = 0; nodes[0].classList.add('is-on');
        setInterval(function () {
            if (document.hidden) return;
            var prev = nodes[i]; i = (i + 1) % nodes.length;
            prev.classList.remove('is-on'); prev.classList.add('is-out');
            nodes[i].classList.remove('is-out'); nodes[i].classList.add('is-on');
            setTimeout(function () { prev.classList.remove('is-out'); }, 700);
        }, 2600);
    });
})();


/* logos from the CDN: if one fails to load, show a small initials badge instead of an empty gap */
(function () {
    [].slice.call(document.querySelectorAll('.sk-logo img, .ct-logo img')).forEach(function (img) {
        function swap() {
            var item = img.closest('.sk-item, a'), n = item && item.querySelector('.sk-name, .ct-name');
            var b = document.createElement('span'); b.className = 'sk-mono';
            b.textContent = ((n && n.textContent) || '?').trim().slice(0, 2).toUpperCase();
            if (img.parentNode) img.parentNode.replaceChild(b, img);
        }
        img.addEventListener('error', swap);
        if (img.complete && img.naturalWidth === 0) swap();
    });
})();


/* planet: scroll-linked revolve. The small spheres orbit the planet, the ring spins up and the whole
   planet drifts along a small ellipse as you scroll. Eased, no pinning, the page scrolls normally. */
(function () {
    var sc = document.querySelector('.bgfx .sc');
    if (!sc || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var cur = scrollY, target = scrollY, raf = 0;

    function apply(s) {
        var t = s * .002;
        sc.style.setProperty('--sa', (s * .08).toFixed(2));   // inner sphere (faster)
        sc.style.setProperty('--sb', (s * .05).toFixed(2));   // outer pearl (slower)
        sc.style.setProperty('--sr', (s * .04).toFixed(2));   // ring, on top of its own slow spin
        sc.style.setProperty('--ox', (2.8 * Math.sin(t)).toFixed(3));
        sc.style.setProperty('--oy', (-1.8 * (1 - Math.cos(t))).toFixed(3));
    }
    function loop() {
        cur += (target - cur) * .06;
        if (Math.abs(target - cur) < .3) { cur = target; raf = 0; } else { raf = requestAnimationFrame(loop); }
        apply(cur);
    }
    addEventListener('scroll', function () { target = scrollY; if (!raf) raf = requestAnimationFrame(loop); }, { passive: true });
    apply(cur);
})();
