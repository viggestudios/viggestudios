/* =========================================================
   VIGGE STUDIOS — interaction & 3D layer
   No dependencies. Everything is generated in the browser.
   ========================================================= */
(function () {
  "use strict";

  var doc = document;
  var body = doc.body;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia("(hover: none)").matches;
  var small = function () { return window.innerWidth < 720; };
  var touchLayout = function () { return window.innerWidth <= 900; };

  var BPM = parseFloat(body.dataset.beat || "124");
  var BEAT_MS = 60000 / BPM;

  function $(sel, root) { return (root || doc).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }
  function rand(a, b) { return a + Math.random() * (b - a); }

  /* ---------------------------------------------------------
     0. FORMULARMODTAGELSE (Web3Forms)

     Access key fra Vigge Studios' EGEN Web3Forms-konto, oprettet
     på viggestudiosprimary@gmail.com. Nøglen må gerne stå åbent i
     koden: den kan kun sende til den ene bekræftede modtager.

     Skiftes den tilbage til PLACEHOLDER viser begge formularer
     en fejl med telefon- og mail-udvej i stedet for at kvittere,
     så en kunde aldrig får en kvittering på noget der ikke blev sendt.
     --------------------------------------------------------- */
  var WEB3FORMS_KEY = "96e6cbf2-bace-4c70-9838-378c5c093e30";
  var WEB3FORMS_URL = "https://api.web3forms.com/submit";
  var MODTAGER_MAIL = "viggestudiosprimary@gmail.com";

  function keyMangler() {
    return !WEB3FORMS_KEY || WEB3FORMS_KEY === "PLACEHOLDER";
  }

  /* Sender en forespørgsel. Resolver ved succes, rejecter ved fejl,
     så kaldstedet selv bestemmer hvordan fejlen vises. */
  function sendForespoergsel(felter, emne, svarTil) {
    /* Uden nøgle må der ALDRIG vises kvittering. En falsk kvittering
       er værre end en fejl: kunden tror beskeden er afsendt og ringer
       ikke, og Mads opdager aldrig at han mistede en booking.
       Derfor afvises den her, så kunden får telefon/mail-udvejen. */
    if (keyMangler()) {
      console.warn(
        "[Vigge Studios] WEB3FORMS_KEY er ikke sat — formularen kan ikke sende. " +
        "Indsæt Mads' access key i script.js for at gøre siden live."
      );
      return Promise.reject(new Error("WEB3FORMS_KEY mangler"));
    }

    var payload = {
      access_key: WEB3FORMS_KEY,
      subject: emne,
      from_name: "Vigge Studios — hjemmeside",
      botcheck: false
    };
    Object.keys(felter).forEach(function (k) {
      if (felter[k] !== "" && felter[k] != null) payload[k] = felter[k];
    });
    // så Mads kan svare direkte i Gmail uden at copy-paste adressen
    if (svarTil) payload.replyto = svarTil;

    return fetch(WEB3FORMS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (json) {
        // 303 (redirect-tilstand) ender som 200 efter fetch følger den,
        // så status alene er ikke nok — json.success er facit.
        if (!res.ok || !json.success) {
          var e = new Error(json.message || "Web3Forms svarede " + res.status);
          e.rateLimited = res.status === 429;
          throw e;
        }
        return json;
      });
    });
  }

  /* Fejlbesked med mailto-udvej, så en kunde aldrig ender i en
     blindgyde hvis tjenesten er nede. */
  function visSendeFejl(el, tekstFelter, err) {
    if (!el) return;
    var krop = encodeURIComponent(
      Object.keys(tekstFelter)
        .map(function (k) { return k + ": " + tekstFelter[k]; })
        .join("\n")
    );
    var indledning = err && err.rateLimited
      ? "Der er lige nu for mange forespørgsler. "
      : "Beskeden kunne ikke sendes lige nu. ";
    el.innerHTML = indledning +
      '<a href="mailto:' + MODTAGER_MAIL + "?subject=" +
      encodeURIComponent("Forespørgsel til Vigge Studios") +
      "&body=" + krop + '">Send den som mail i stedet</a>' +
      " eller ring på 61 38 36 89.";
    el.hidden = false;
  }

  /* ---------------------------------------------------------
     1. DISCO BALL — a real sphere of mirror tiles in CSS 3D

     Perf note: the first version animated `filter: brightness`
     on every one of ~314 tiles, which repainted the whole ball
     each frame and stuttered on load. Now the tiles are static
     and all the sparkle comes from the ball's own rotation plus
     one blended highlight overlay — two composited layers total.
     --------------------------------------------------------- */
  function buildBall() {
    var ball = $("#ball");
    if (!ball) return;

    var isSmall = small();
    var R = isSmall ? 80 : 128;
    var latStep = isSmall ? 16 : 13;
    var maxLat = 78;
    var frag = doc.createDocumentFragment();
    var rad = Math.PI / 180;

    for (var lat = -maxLat; lat <= maxLat; lat += latStep) {
      var cos = Math.cos(lat * rad);
      var tileH = R * latStep * rad * 1.1;
      var circumference = 2 * Math.PI * R * cos;
      var count = Math.max(6, Math.round(circumference / tileH));
      var tileW = (circumference / count) * 1.1;

      for (var i = 0; i < count; i++) {
        var lon = (360 / count) * i;
        var tile = doc.createElement("div");
        tile.className = "facet";

        // top tiles catch more light, plus a little natural variation
        var lift = (lat + maxLat) / (maxLat * 2);
        var b = 0.6 + lift * 0.66 + Math.random() * 0.4;

        tile.style.cssText =
          "width:" + tileW.toFixed(1) + "px;" +
          "height:" + tileH.toFixed(1) + "px;" +
          "margin-left:" + (-tileW / 2).toFixed(1) + "px;" +
          "margin-top:" + (-tileH / 2).toFixed(1) + "px;" +
          "transform:rotateY(" + lon.toFixed(1) + "deg) rotateX(" + lat.toFixed(1) + "deg) translateZ(" + R + "px);" +
          "--b:" + b.toFixed(2) + ";";

        frag.appendChild(tile);
      }
    }

    ball.textContent = "";
    ball.appendChild(frag);
  }

  function buildBeams() {
    var wrap = $("#beams");
    if (!wrap) return;
    var n = small() ? 4 : 8;
    var html = "";
    for (var i = 0; i < n; i++) {
      var angle = -60 + (120 / (n - 1)) * i;
      html +=
        '<span class="beam" style="transform:rotate(' + angle.toFixed(1) + "deg);" +
        "--bd:" + rand(6, 12).toFixed(1) + "s;--bdl:-" + rand(0, 8).toFixed(1) + 's;"></span>';
    }
    wrap.innerHTML = html;
  }

  /* ---------------------------------------------------------
     2. LIGHT FIELD — the dots a mirror ball throws on the room
     One pre-rendered sprite is reused for every dot; building a
     radial gradient per dot per frame was far too slow.
     --------------------------------------------------------- */
  function lightField() {
    var canvas = $("#lightfield");
    if (!canvas || reduced) return;

    var ctx = canvas.getContext("2d", { alpha: true });
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0;
    var dots = [];
    var count = small() ? 34 : 76;
    var rad = Math.PI / 180;

    // pre-rendered dot sprites (warm yellow + orange)
    function makeSprite(rgb) {
      var s = doc.createElement("canvas");
      var size = 64;
      s.width = s.height = size;
      var c = s.getContext("2d");
      var g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      g.addColorStop(0, "rgba(" + rgb + ",1)");
      g.addColorStop(0.35, "rgba(" + rgb + ",0.32)");
      g.addColorStop(1, "rgba(" + rgb + ",0)");
      c.fillStyle = g;
      c.fillRect(0, 0, size, size);
      return s;
    }
    var spriteY = makeSprite("252,198,98");
    var spriteO = makeSprite("252,100,0");

    for (var i = 0; i < count; i++) {
      dots.push({
        lat: rand(-70, 70),
        lon: rand(0, 360),
        size: rand(26, 74),
        sprite: Math.random() < 0.24 ? spriteO : spriteY,
        flick: rand(0.45, 1)
      });
    }

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize, { passive: true });

    var start = performance.now();
    var visible = true;
    doc.addEventListener("visibilitychange", function () { visible = !doc.hidden; });

    function frame(now) {
      requestAnimationFrame(frame);
      if (!visible) return;

      var t = (now - start) / 1000;
      var spin = (t / 26) * 360; // matches the ball's 26s rotation
      var beatPhase = (now % BEAT_MS) / BEAT_MS;
      var pulse = 0.7 + Math.pow(1 - beatPhase, 3) * 0.5;

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      var cx = w * 0.5;
      var cy = h * 0.24;
      var spreadX = w * 0.92;
      var spreadY = h * 0.78;

      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        var lam = (d.lon + spin) * rad;
        var phi = d.lat * rad;

        var dx = Math.cos(phi) * Math.sin(lam);
        var dy = -Math.sin(phi);
        var dz = Math.cos(phi) * Math.cos(lam);

        // only the mirrors turned toward the room throw a visible spot
        var facing = (dz + 1) / 2;
        if (facing < 0.42) continue;

        var x = cx + dx * spreadX;
        var y = cy + (dy + 0.34) * spreadY;
        var r = d.size * (0.6 + facing * 0.7);
        if (x < -r || x > w + r || y < -r || y > h + r) continue;

        var a = (facing - 0.42) / 0.58;
        ctx.globalAlpha = Math.min(1, a * a * 0.62 * pulse * d.flick);
        ctx.drawImage(d.sprite, x - r / 2, y - r / 2, r, r);
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
    requestAnimationFrame(frame);
  }

  /* ---------------------------------------------------------
     3. VU METER — driven by the same beat clock
     --------------------------------------------------------- */
  function vuMeter() {
    var vu = $("#vu");
    if (!vu) return;

    var n = small() ? 14 : 22;
    var bars = [];
    for (var i = 0; i < n; i++) {
      var el = doc.createElement("i");
      vu.appendChild(el);
      bars.push({ el: el, seed: Math.random() * 100, v: 0.2 });
    }
    if (reduced) {
      bars.forEach(function (b) { b.el.style.height = "45%"; });
      return;
    }

    function frame(now) {
      requestAnimationFrame(frame);
      if (doc.hidden) return;
      var phase = (now % BEAT_MS) / BEAT_MS;
      var hit = Math.pow(1 - phase, 2.6);
      var t = now / 1000;

      for (var i = 0; i < bars.length; i++) {
        var b = bars[i];
        var wob = (Math.sin(t * 3.1 + b.seed) + Math.sin(t * 5.7 + b.seed * 1.7)) * 0.25 + 0.5;
        var target = 0.16 + hit * wob * 0.92;
        b.v += (target - b.v) * 0.4;
        b.el.style.height = Math.max(8, b.v * 100).toFixed(1) + "%";
      }
    }
    requestAnimationFrame(frame);
  }

  /* ---------------------------------------------------------
     4. ENTRANCE — no preloader, the page is usable immediately
     --------------------------------------------------------- */
  function entrance() {
    $$(".hero-title .w").forEach(function (w, i) {
      w.style.transitionDelay = (0.04 + i * 0.05).toFixed(3) + "s";
    });
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { body.classList.add("loaded"); });
    });
  }

  /* ---------------------------------------------------------
     5. CUSTOM CURSOR
     --------------------------------------------------------- */
  function cursor() {
    var el = $("#cursor");
    if (!el || coarse) return;

    var label = $(".cursor-label", el);
    var mx = window.innerWidth / 2, my = window.innerHeight / 2;
    var rx = mx, ry = my;

    doc.addEventListener("mousemove", function (e) {
      mx = e.clientX; my = e.clientY;
      if (!body.classList.contains("cursor-ready")) body.classList.add("cursor-ready");
    }, { passive: true });

    function frame() {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      // positions travel as custom properties so the CSS hover states
      // keep control of the scaling
      el.style.setProperty("--mx", mx.toFixed(1) + "px");
      el.style.setProperty("--my", my.toFixed(1) + "px");
      el.style.setProperty("--rx", rx.toFixed(1) + "px");
      el.style.setProperty("--ry", ry.toFixed(1) + "px");
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    doc.addEventListener("mouseover", function (e) {
      var media = e.target.closest(".g-video, .tilt-card, .reel-item");
      var link = e.target.closest("a, button, .chip, input, select, textarea, label");
      body.classList.toggle("cursor-media", !!media && !link);
      body.classList.toggle("cursor-hover", !!link);
      if (media && !link) label.textContent = media.querySelector("video") ? "Se" : "Kig";
    });
  }

  /* ---------------------------------------------------------
     6. HEADER + NAV + FAST BOOK-KNAP
     --------------------------------------------------------- */
  function header() {
    var el = $("#header");
    var burger = $("#burger");
    var menu = $("#mobile-menu");
    var sticky = $("#sticky-cta");
    var contact = $("#kontakt");
    var last = 0;

    function onScroll() {
      var y = window.scrollY;
      el.classList.toggle("is-stuck", y > 40);
      el.classList.toggle("is-hidden", y > 460 && y > last && !body.classList.contains("is-locked"));

      if (sticky) {
        // visible once past the hero, but hidden while the contact form is on
        // screen and as soon as any part of the footer credit appears, so the
        // button never sits on top of either
        var covering = false;
        if (contact) {
          var rc = contact.getBoundingClientRect();
          covering = rc.top < window.innerHeight * 0.72 && rc.bottom > 0;
        }
        if (!covering) {
          var credit = doc.querySelector(".credit");
          if (credit) {
            var rk = credit.getBoundingClientRect();
            covering = rk.top < window.innerHeight && rk.bottom > 0;
          }
        }
        sticky.classList.toggle("is-in", y > 560 && !covering);
      }
      last = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    if (burger && menu) {
      burger.addEventListener("click", function () {
        var open = menu.classList.toggle("is-open");
        burger.setAttribute("aria-expanded", open ? "true" : "false");
        body.classList.toggle("is-locked", open);
        $$("nav a", menu).forEach(function (a, i) {
          a.style.transitionDelay = open ? (0.08 + i * 0.05).toFixed(2) + "s" : "0s";
        });
      });
      $$("a", menu).forEach(function (a) {
        a.addEventListener("click", function () {
          menu.classList.remove("is-open");
          burger.setAttribute("aria-expanded", "false");
          body.classList.remove("is-locked");
        });
      });
    }

    var links = $$(".nav a");
    var sections = links.map(function (a) { return $(a.getAttribute("href")); }).filter(Boolean);
    if ("IntersectionObserver" in window && sections.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          links.forEach(function (a) {
            a.classList.toggle("is-active", a.getAttribute("href") === "#" + en.target.id);
          });
        });
      }, { rootMargin: "-46% 0px -50% 0px" });
      sections.forEach(function (s) { io.observe(s); });
    }
  }

  /* ---------------------------------------------------------
     7. REVEALS
     --------------------------------------------------------- */
  function reveals() {
    var items = $$("[data-reveal]");
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (i) { i.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var group = en.target.parentElement ? $$("[data-reveal]", en.target.parentElement) : [];
        var idx = group.indexOf(en.target);
        en.target.style.transitionDelay = (idx > 0 ? Math.min(idx, 5) * 0.09 : 0) + "s";
        en.target.classList.add("is-in");
        io.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });
    items.forEach(function (i) { io.observe(i); });
  }

  /* ---------------------------------------------------------
     8. VIDEO — autoplay in view
     All four source clips were exported without an audio track
     (verified with ffprobe: 0 audio streams each), so there is
     no sound to offer and no mute control to show.
     --------------------------------------------------------- */
  function videos() {
    var clips = $$("video[data-autoplay]");
    if (!clips.length) return;

    clips.forEach(function (video) {
      video.muted = true;
      video.setAttribute("muted", "");
    });

    if (!("IntersectionObserver" in window)) {
      clips.forEach(function (v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); });
      return;
    }

    // play whatever is on screen, pause the rest so we never decode
    // four clips at once
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var v = en.target;
        if (en.isIntersecting) {
          if (v.preload === "none") v.preload = "auto";
          var p = v.play();
          if (p && p.catch) p.catch(function () {});
        } else {
          v.pause();
        }
      });
    }, { threshold: 0.25 });

    clips.forEach(function (v) { io.observe(v); });
  }

  /* ---------------------------------------------------------
     9. PARALLAX + VINYL + TILT
     --------------------------------------------------------- */
  function motion() {
    if (reduced) return;

    var parallaxItems = $$("[data-parallax]");
    var vinyl = $("#vinyl-prop");
    var vinylDisc = vinyl ? $(".vinyl", vinyl) : null;
    var heroVideo = $("#hero-video");
    var ticking = false;

    function apply() {
      ticking = false;
      var y = window.scrollY;
      var vh = window.innerHeight;

      for (var i = 0; i < parallaxItems.length; i++) {
        var el = parallaxItems[i];
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) continue;
        var mid = r.top + r.height / 2 - vh / 2;
        var amt = parseFloat(el.dataset.parallax) || 0.05;
        var img = el.firstElementChild;
        if (img) img.style.transform = "translate3d(0," + (-mid * amt).toFixed(1) + "px,0) scale(1.1)";
      }

      if (vinylDisc) {
        var vr = vinyl.getBoundingClientRect();
        if (vr.top < vh && vr.bottom > 0) {
          vinylDisc.style.transform = "rotateX(58deg) rotateZ(" + (y * 0.24).toFixed(1) + "deg)";
        }
      }

      if (heroVideo && y < vh) {
        heroVideo.style.transform = "scale(1.08) translate3d(0," + (y * 0.16).toFixed(1) + "px,0)";
      }

      reelScroll();
    }

    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(apply); }
    }, { passive: true });
    window.addEventListener("resize", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(apply); }
    }, { passive: true });
    apply();

    if (!coarse) {
      $$("[data-tilt]").forEach(function (card) {
        var parent = card.parentElement;
        parent.addEventListener("mousemove", function (e) {
          var r = card.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width - 0.5;
          var py = (e.clientY - r.top) / r.height - 0.5;
          card.style.transform =
            "perspective(1000px) rotateY(" + (px * 9).toFixed(2) + "deg) rotateX(" +
            (-py * 9).toFixed(2) + "deg) translateZ(12px)";
        });
        parent.addEventListener("mouseleave", function () { card.style.transform = ""; });
      });
    }
  }

  /* ---------------------------------------------------------
     10. REEL — vertical scroll drives the horizontal track
     On touch layouts the CSS turns it into a native swipe
     strip, so this does nothing there.
     --------------------------------------------------------- */
  var reelEl, reelTrack, reelBar;

  function reelScroll() {
    if (!reelEl || !reelTrack || reduced || touchLayout()) return;

    var rect = reelEl.getBoundingClientRect();
    var vh = window.innerHeight;
    var travel = reelTrack.scrollWidth - window.innerWidth;
    if (travel <= 0) return;

    // progress through the tall section while it is pinned
    var total = reelEl.offsetHeight - vh;
    var passed = Math.min(Math.max(-rect.top, 0), total);
    var p = total > 0 ? passed / total : 0;

    reelTrack.style.transform = "translate3d(" + (-p * travel).toFixed(1) + "px,0,0)";
    if (reelBar) reelBar.style.width = (p * 100).toFixed(1) + "%";
  }

  function reelInit() {
    reelEl = $("#reel");
    reelTrack = $("#reel-track");
    reelBar = $("#reel-bar");
    reelScroll();
  }

  /* ---------------------------------------------------------
     11. MARQUEE (seamless)
     --------------------------------------------------------- */
  function marquee() {
    var track = $("#marquee-track");
    if (!track) return;
    track.innerHTML = track.innerHTML + track.innerHTML;
  }

  /* ---------------------------------------------------------
     12. CONTACT FORM — sender via Web3Forms
     --------------------------------------------------------- */
  function contactForm() {
    var form = $("#contact-form");
    var done = $("#form-done");
    if (!form || !done) return;

    var fejl = $("#form-error");
    var knap = $('button[type="submit"]', form);
    var knapTekst = knap ? $("span", knap) : null;
    var oprindeligTekst = knapTekst ? knapTekst.textContent : "";
    var sender = false;

    /* Flere afkrydsede ydelser samles til én linje, så mailen
       bliver læsbar i stedet for at tabe alle på nær den sidste.

       botcheck sendes med videre: det er Web3Forms' honeypot, som
       er usynlig for mennesker og kun udfyldes af bots. Bliver den
       filtreret fra her, når spam-signalet aldrig frem, og så er
       feltet i HTML'en ren pynt. Et menneske sender den aldrig med,
       for uafkrydsede checkboxe indgår slet ikke i FormData. */
    function saml() {
      var ud = {};
      new FormData(form).forEach(function (v, k) {
        ud[k] = ud[k] === undefined ? v : ud[k] + ", " + v;
      });
      return ud;
    }

    /* Kvitteringen er et overlay hen over HELE formularen, og teksten
       sidder centreret i midten af den. Formularen er omkring 1400px
       høj på mobil, og kunden står nederst ved Send-knappen når der
       trykkes — så uden dette scroll havner beskeden knap 700px over
       skærmkanten, og kunden ser ingen kvittering overhovedet.
       Målt på iPhone 13: y = -692px i et 664px højt viewport. */
    function visKvittering() {
      done.hidden = false;
      done.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
      requestAnimationFrame(function () { done.classList.add("is-in"); });
      setTimeout(function () {
        done.classList.remove("is-in");
        setTimeout(function () { done.hidden = true; form.reset(); }, 500);
      }, 6000);
    }

    /* Uden validering kunne en HELT tom formular sendes afsted, og
       kunden fik alligevel "Tak for din besked" mens Mads modtog en mail
       uden navn, mail eller telefon — altså en tabt booking han ikke
       engang kunne svare på. Det er nøjagtig den falske kvittering som
       keyMangler() ellers beskytter imod. Minimumskravet er et navn og
       mindst én måde at vende tilbage på. */
    function manglendeFelter(felter) {
      var mangler = [];
      var mail = (felter.email || "").trim();
      var tlf = (felter.telefon || "").trim();
      if (!(felter.navn || "").trim()) mangler.push("navn");
      if (!mail && !tlf) mangler.push("kontakt");
      else if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) mangler.push("mail");
      return mangler;
    }

    var FEJLTEKST = {
      navn: "Skriv dit navn, så vi ved hvem vi svarer.",
      kontakt: "Skriv enten din mail eller dit telefonnummer, så vi kan vende tilbage.",
      mail: "Mailadressen ser ikke helt rigtig ud — vil du tjekke den?"
    };

    function visManglerFejl(mangler) {
      var først = mangler[0];
      if (fejl) {
        fejl.textContent = FEJLTEKST[først];
        fejl.hidden = false;
      }
      $$("[name]", form).forEach(function (el) { el.classList.remove("is-invalid"); });
      var felt = $(først === "navn" ? '[name="navn"]' : '[name="email"]', form);
      if (!felt) return;
      felt.classList.add("is-invalid");
      felt.setAttribute("aria-invalid", "true");
      felt.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
      setTimeout(function () { try { felt.focus({ preventScroll: true }); } catch (e) {} }, reduced ? 0 : 420);
    }

    /* Fejlmarkeringen fjernes så snart kunden retter, i stedet for at
       blive hængende som en anklage mens hun skriver. */
    form.addEventListener("input", function (e) {
      if (e.target.classList && e.target.classList.contains("is-invalid")) {
        e.target.classList.remove("is-invalid");
        e.target.removeAttribute("aria-invalid");
        if (fejl) fejl.hidden = true;
      }
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (sender) return;

      var felter = saml();
      if (fejl) fejl.hidden = true;

      var mangler = manglendeFelter(felter);
      if (mangler.length) { visManglerFejl(mangler); return; }

      // mailen skal kunne sorteres i indbakken uden at åbnes
      var emne = "Forespørgsel" +
        (felter.type ? ": " + felter.type : "") +
        (felter.navn ? " — " + felter.navn : "");

      sender = true;
      form.classList.add("is-sending");
      if (knapTekst) knapTekst.textContent = "Sender…";
      if (knap) knap.disabled = true;

      sendForespoergsel(felter, emne, felter.email)
        .then(visKvittering)
        .catch(function (err) {
          console.error("[Vigge Studios] kontaktformular:", err);
          visSendeFejl(fejl, felter, err);
        })
        .then(function () {
          sender = false;
          form.classList.remove("is-sending");
          if (knapTekst) knapTekst.textContent = oprindeligTekst;
          if (knap) knap.disabled = false;
        });
    });
  }

  /* ---------------------------------------------------------
     13. BOOKING-OPLEVELSE
     One question per screen, scroll-snapped. Every answer is
     optional and there is a skip straight to the plain form,
     so the effects never stand between a customer and booking.
     --------------------------------------------------------- */
  function booking() {
    var root = $("#book");
    if (!root) return;

    var scroller = $("#book-scroll");
    var steps = $$(".book-step", root);
    var rail = $("#book-rail-fill");
    var ball = $(".book-ball", root);
    var summary = $("#book-summary");
    var done = $("#book-done");
    var lastFocus = null;

    var data = { type: "", ydelser: [], dato: "", gaester: "80", navn: "", tlf: "", mail: "", sted: "" };

    /* ---- open / close ---- */
    function open(e) {
      if (e) e.preventDefault();
      lastFocus = doc.activeElement;
      root.hidden = false;
      body.classList.add("is-locked");
      requestAnimationFrame(function () {
        root.classList.add("is-open");
        scroller.scrollTop = 0;
        setActive(0);
        if (ball) ball.style.setProperty("--ball-drop", "150px");
      });
      bookCanvas.start();
    }

    function close() {
      root.classList.remove("is-open");
      body.classList.remove("is-locked");
      bookCanvas.stop();
      if (ball) ball.style.setProperty("--ball-drop", "0px");
      setTimeout(function () {
        root.hidden = true;
        if (done) { done.hidden = true; done.classList.remove("is-in"); }
        if (lastFocus && lastFocus.focus) lastFocus.focus();
      }, 600);
    }

    $$('a[href="#kontakt"].sticky-cta, .hero-actions a[href="#kontakt"]').forEach(function (a) {
      a.addEventListener("click", open);
    });

    var closeBtn = $("#book-close");
    if (closeBtn) closeBtn.addEventListener("click", close);
    var doneClose = $("#book-done-close");
    if (doneClose) doneClose.addEventListener("click", close);

    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !root.hidden) close();
    });

    // the skip goes straight to the ordinary form — the fast path
    var skip = $("#book-skip");
    if (skip) {
      skip.addEventListener("click", function () {
        close();
        setTimeout(function () {
          var target = $("#kontakt");
          if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 620);
      });
    }

    /* ---- step tracking ---- */
    function setActive(i) {
      steps.forEach(function (s, n) { s.classList.toggle("is-active", n === i); });
      if (rail) rail.style.width = ((i / (steps.length - 1)) * 100).toFixed(1) + "%";
      // the ball drops for the opening screen, then tucks up behind the
      // header so it never sits on top of a question
      if (ball) ball.style.setProperty("--ball-drop", i === 0 ? "150px" : "62px");
      if (i === steps.length - 1) renderSummary();
    }

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting && en.intersectionRatio > 0.5) {
            setActive(steps.indexOf(en.target));
          }
        });
      }, { root: scroller, threshold: [0.5] });
      steps.forEach(function (s) { io.observe(s); });
    }

    function goto(i) {
      var target = steps[i];
      if (target) scroller.scrollTo({ top: target.offsetTop, behavior: "smooth" });
    }

    $$(".book-next", root).forEach(function (btn) {
      btn.addEventListener("click", function () { goto(parseInt(btn.dataset.goto, 10)); });
    });

    /* ---- single choice (type) auto-advances ---- */
    var typeWrap = $('[data-field="type"]', root);
    if (typeWrap) {
      typeWrap.addEventListener("click", function (e) {
        var btn = e.target.closest(".book-opt");
        if (!btn) return;
        $$(".book-opt", typeWrap).forEach(function (b) { b.classList.toggle("is-on", b === btn); });
        data.type = btn.dataset.value;
        setTimeout(function () { goto(2); }, 420);
      });
    }

    /* ---- multi choice (ydelser) ---- */
    var propWrap = $('[data-field="ydelser"]', root);
    if (propWrap) {
      propWrap.addEventListener("click", function (e) {
        var btn = e.target.closest(".book-prop");
        if (!btn) return;
        btn.classList.toggle("is-on");
        var v = btn.dataset.value;
        var at = data.ydelser.indexOf(v);
        if (at === -1) data.ydelser.push(v); else data.ydelser.splice(at, 1);
      });
    }

    /* ---- guests slider ---- */
    var range = $("#bk-gaester");
    var out = $("#bk-gaester-out");
    function paintRange() {
      if (!range) return;
      var pct = ((range.value - range.min) / (range.max - range.min)) * 100;
      range.style.setProperty("--fill", pct.toFixed(1) + "%");
      if (out) out.textContent = range.value >= 400 ? "400+" : range.value;
      data.gaester = range.value;
    }
    if (range) { range.addEventListener("input", paintRange); paintRange(); }

    /* ---- plain fields ---- */
    [["#bk-dato", "dato"], ["#bk-navn", "navn"], ["#bk-tlf", "tlf"], ["#bk-mail", "mail"], ["#bk-sted", "sted"]]
      .forEach(function (pair) {
        var el = $(pair[0]);
        if (el) el.addEventListener("input", function () { data[pair[1]] = el.value.trim(); });
      });

    /* ---- summary ---- */
    function row(label, value) {
      var empty = !value;
      return '<div class="book-sum-row"><dt>' + label + '</dt><dd class="' +
        (empty ? "is-empty" : "") + '">' + (empty ? "Ikke udfyldt" : value) + "</dd></div>";
    }
    function renderSummary() {
      if (!summary) return;
      var dato = data.dato;
      if (dato) {
        var p = dato.split("-");
        if (p.length === 3) dato = p[2] + "." + p[1] + "." + p[0];
      }
      summary.innerHTML =
        row("Arrangement", data.type) +
        row("Vi leverer", data.ydelser.join(" · ")) +
        row("Dato", dato) +
        row("Gæster", data.gaester >= 400 ? "400+" : "ca. " + data.gaester) +
        row("Navn", data.navn) +
        row("Telefon", data.tlf) +
        row("E-mail", data.mail) +
        row("Sted", data.sted);
    }

    /* ---- send ---- */
    var send = $("#book-send");
    var bookFejl = $("#book-error");
    var sender = false;

    if (send && done) {
      send.addEventListener("click", function () {
        if (sender) return;

        var dato = data.dato;
        if (dato) {
          var d = dato.split("-");
          if (d.length === 3) dato = d[2] + "." + d[1] + "." + d[0];
        }

        // samme labels som i opsummeringen, så mailen matcher
        // det kunden lige har set på skærmen
        var felter = {
          Arrangement: data.type,
          "Vi leverer": data.ydelser.join(" · "),
          Dato: dato,
          "Gæster": data.gaester >= 400 ? "400+" : "ca. " + data.gaester,
          Navn: data.navn,
          Telefon: data.tlf,
          "E-mail": data.mail,
          Sted: data.sted
        };

        var emne = "Booking" +
          (data.type ? ": " + data.type : "") +
          (data.navn ? " — " + data.navn : "");

        sender = true;
        send.disabled = true;
        var spanEl = $("span", send);
        var før = spanEl ? spanEl.textContent : "";
        if (spanEl) spanEl.textContent = "Sender…";
        if (bookFejl) bookFejl.hidden = true;

        sendForespoergsel(felter, emne, data.mail)
          .then(function () {
            done.hidden = false;
            requestAnimationFrame(function () { done.classList.add("is-in"); });
          })
          .catch(function (err) {
            console.error("[Vigge Studios] booking:", err);
            visSendeFejl(bookFejl, felter, err);
          })
          .then(function () {
            sender = false;
            send.disabled = false;
            if (spanEl) spanEl.textContent = før;
          });
      });
    }

    /* ---- background particles ---- */
    var bookCanvas = (function () {
      var canvas = $("#book-canvas");
      if (!canvas) return { start: function () {}, stop: function () {} };
      var ctx = canvas.getContext("2d");
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = 0, h = 0, raf = null, bits = [];

      function size() {
        w = root.clientWidth; h = root.clientHeight;
        canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      function seed() {
        bits = [];
        var n = small() ? 26 : 60;
        for (var i = 0; i < n; i++) {
          bits.push({ x: Math.random() * w, y: Math.random() * h, r: rand(1, 3.4), s: rand(6, 26), a: rand(0.15, 0.7), p: rand(0, 6.28) });
        }
      }
      function frame(now) {
        raf = requestAnimationFrame(frame);
        if (doc.hidden) return;
        var beat = (now % BEAT_MS) / BEAT_MS;
        var pulse = 0.7 + Math.pow(1 - beat, 3) * 0.6;
        ctx.clearRect(0, 0, w, h);
        ctx.globalCompositeOperation = "lighter";
        for (var i = 0; i < bits.length; i++) {
          var b = bits[i];
          b.y -= b.s * 0.016;
          if (b.y < -10) { b.y = h + 10; b.x = Math.random() * w; }
          var drift = Math.sin(now / 1400 + b.p) * 14;
          ctx.globalAlpha = b.a * pulse * 0.5;
          ctx.fillStyle = i % 5 === 0 ? "#FC6400" : "#FCC662";
          ctx.beginPath();
          ctx.arc(b.x + drift, b.y, b.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
      return {
        start: function () { if (reduced || raf) return; size(); seed(); raf = requestAnimationFrame(frame); },
        stop: function () { if (raf) { cancelAnimationFrame(raf); raf = null; } }
      };
    })();

    window.addEventListener("resize", function () {
      if (!root.hidden) { bookCanvas.stop(); bookCanvas.start(); }
    }, { passive: true });
  }

  /* ---------------------------------------------------------
     14. BOOT
     --------------------------------------------------------- */
  function boot() {
    var yearEl = $("#year");
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    buildBall();
    buildBeams();
    marquee();
    entrance();
    header();
    reveals();
    videos();
    contactForm();
    booking();
    reelInit();
    motion();
    vuMeter();
    cursor();
    if (!reduced) lightField();

    var rebuild;
    window.addEventListener("resize", function () {
      clearTimeout(rebuild);
      rebuild = setTimeout(function () {
        buildBall();
        buildBeams();
        reelScroll();
      }, 320);
    }, { passive: true });
  }

  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
