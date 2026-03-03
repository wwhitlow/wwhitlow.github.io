/*
 * page.js
 * Reads window.CONFIG and renders all page sections into their mount-point divs.
 * Exposes window.PAGE.render() so the settings panel can trigger a re-render.
 * All user-supplied strings pass through esc() to prevent XSS.
 */

(function () {
  'use strict';

  // ── Security: HTML-escape all config strings before injecting into DOM ──
  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ── Pad a number to 2 digits ─────────────────────────────────────────────
  function pad(n) {
    return String(n).padStart(2, '0');
  }

  // ── Theme application ────────────────────────────────────────────────────
  function applyTheme(name) {
    var body = document.body;
    body.className = body.className.replace(/\btheme-\S+/g, '').trim();
    body.classList.add('theme-' + (name || 'burgundy'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION RENDERERS — each returns an HTML string or ''
  // ═══════════════════════════════════════════════════════════════════════════

  function renderCountdown(cfg) {
    return [
      '<section class="countdown-banner">',
      '  <div class="countdown-main">',
      '    <p class="countdown-label">' + esc(cfg.label) + '</p>',
      '    <div class="countdown-values" aria-live="polite" aria-atomic="true">',
      '      <div class="countdown-item"><span class="countdown-value" id="cd-days">--</span><span class="countdown-unit">Days</span></div>',
      '      <div class="countdown-item"><span class="countdown-value" id="cd-hours">--</span><span class="countdown-unit">Hours</span></div>',
      '      <div class="countdown-item"><span class="countdown-value" id="cd-minutes">--</span><span class="countdown-unit">Minutes</span></div>',
      '      <div class="countdown-item"><span class="countdown-value" id="cd-seconds">--</span><span class="countdown-unit">Seconds</span></div>',
      '    </div>',
      '  </div>',
      '  <p class="countdown-reflection">' + esc(cfg.reflectionText) + '</p>',
      '</section>',
    ].join('\n');
  }

  function renderHero(identity) {
    return [
      '<header class="hero">',
      '  <p class="eyebrow">' + esc(identity.eyebrow) + '</p>',
      '  <h1>' + esc(identity.eventTitle) + '</h1>',
      '  <p class="lead">' + esc(identity.leadText) + '</p>',
      '</header>',
    ].join('\n');
  }

  function renderDetailsRow(details, intentions, vis) {
    var parts = [];

    if (vis.details) {
      parts.push([
        '<div class="card milestone">',
        '  <h2>' + esc(details.heading) + '</h2>',
        '  <p class="date">' + esc(details.dateDisplay) + '</p>',
        '  <p>' + esc(details.body) + '</p>',
        '</div>',
      ].join('\n'));
    }

    if (vis.intentions) {
      var items = (intentions.items || [])
        .map(function (i) { return '    <li>' + esc(i) + '</li>'; })
        .join('\n');
      parts.push([
        '<div class="card intentions">',
        '  <h2>' + esc(intentions.heading) + '</h2>',
        '  <ul>',
        items,
        '  </ul>',
        '</div>',
      ].join('\n'));
    }

    if (parts.length === 0) return '';
    return '<section class="details">\n' + parts.join('\n') + '\n</section>';
  }

  function renderCatechesis(cfg) {
    var paras = (cfg.paragraphs || [])
      .map(function (p) { return '  <p>' + esc(p) + '</p>'; })
      .join('\n');
    return [
      '<section class="catechesis-section card">',
      '  <p class="eyebrow">' + esc(cfg.eyebrow) + '</p>',
      '  <h2>' + esc(cfg.heading) + '</h2>',
      paras,
      '</section>',
    ].join('\n');
  }

  function renderLivestream(cfg) {
    var inner = cfg.url
      ? [
          '<div class="embed-wrapper">',
          '  <iframe src="' + esc(cfg.url) + '" title="Ordination Livestream"',
          '    loading="lazy" allowfullscreen></iframe>',
          '</div>',
        ].join('\n')
      : '<p class="coming-soon">' + esc(cfg.comingSoonText) + '</p>';

    return [
      '<section class="livestream-section">',
      '  <div class="card livestream">',
      '    <h2>' + esc(cfg.heading) + '</h2>',
      '    ' + inner,
      '  </div>',
      '</section>',
    ].join('\n');
  }

  function renderRsvp(cfg) {
    return [
      '<section class="form-section">',
      '  <div class="card rsvp">',
      '    <h2>' + esc(cfg.heading) + '</h2>',
      '    <p>' + esc(cfg.introText) + '</p>',
      '    <div class="embed-wrapper">',
      '      <iframe src="' + esc(cfg.formEmbedUrl) + '" title="RSVP Form" loading="lazy"></iframe>',
      '    </div>',
      '  </div>',
      '</section>',
    ].join('\n');
  }

  function renderVenueCard(cfg) {
    return [
      '<section class="logistics-section">',
      '  <div class="card logistics-card">',
      '    <div class="logistics-copy">',
      '      <p class="eyebrow">' + esc(cfg.eyebrow) + '</p>',
      '      <h2>' + esc(cfg.heading) + '</h2>',
      '      <p>' + esc(cfg.description) + '</p>',
      '      <ul class="logistics-details">',
      '        <li><strong>Parish:</strong> '  + esc(cfg.parish)  + '</li>',
      '        <li><strong>Date:</strong> '    + esc(cfg.date)    + '</li>',
      '        <li><strong>Time:</strong> '    + esc(cfg.time)    + '</li>',
      '        <li><strong>Address:</strong> ' + esc(cfg.address) + '</li>',
      '        <li><strong>Note:</strong> '    + esc(cfg.parking) + '</li>',
      '      </ul>',
      '    </div>',
      cfg.mapsEmbedUrl ? [
        '    <div class="embed-wrapper logistics-map">',
        '      <iframe src="' + esc(cfg.mapsEmbedUrl) + '"',
        '        loading="lazy" referrerpolicy="no-referrer-when-downgrade"',
        '        aria-label="Google Maps: ' + esc(cfg.parish) + '"></iframe>',
        '    </div>',
      ].join('\n') : '',
      '  </div>',
      '</section>',
    ].join('\n');
  }

  // ── Extra / stock element renderers ─────────────────────────────────────
  function renderExtraElement(el) {
    switch (el.type) {
      case 'scripture':
        return [
          '<section class="card scripture-block">',
          '  <blockquote>' + esc(el.text) + '</blockquote>',
          '  <cite>' + esc(el.reference) + '</cite>',
          '</section>',
        ].join('\n');

      case 'customText':
        return [
          '<section class="card custom-text-block">',
          '  <h2>' + esc(el.heading) + '</h2>',
          '  <p>' + esc(el.body) + '</p>',
          '</section>',
        ].join('\n');

      case 'prayerPartners':
        var names = (el.names || [])
          .map(function (n) { return '  <li>' + esc(n) + '</li>'; })
          .join('\n');
        return [
          '<section class="card prayer-partners-block">',
          '  <h2>' + esc(el.heading) + '</h2>',
          '  <ul>',
          names,
          '  </ul>',
          '</section>',
        ].join('\n');

      case 'venue':
        return renderVenueCard(el);

      case 'youtubeEmbed':
        return [
          '<section class="card youtube-block">',
          '  <h2>' + esc(el.heading) + '</h2>',
          '  <div class="embed-wrapper">',
          '    <iframe src="https://www.youtube.com/embed/' + esc(el.videoId) + '"',
          '      title="' + esc(el.heading) + '" loading="lazy" allowfullscreen></iframe>',
          '  </div>',
          '</section>',
        ].join('\n');

      case 'announcementTitle':
        return [
          '<section class="announcement-title-block">',
          '  <div class="atb-inner">',
          '    <div class="atb-rule"></div>',
          el.prefix ? '    <p class="atb-prefix">' + esc(el.prefix) + '</p>' : '',
          '    <h2 class="atb-name">' + esc(el.name) + '</h2>',
          el.suffix ? '    <p class="atb-suffix">' + esc(el.suffix) + '</p>' : '',
          '    <div class="atb-rule"></div>',
          '  </div>',
          '</section>',
        ].join('\n');

      default:
        return '';
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MOUNT HELPER — writes HTML into a named mount-point div
  // ═══════════════════════════════════════════════════════════════════════════
  function mount(id, html) {
    var el = document.getElementById(id);
    if (!el) return;
    if (!html || html.trim() === '') {
      el.style.display = 'none';
      el.innerHTML = '';
    } else {
      el.style.display = '';
      el.innerHTML = html;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COUNTDOWN TIMER
  // ═══════════════════════════════════════════════════════════════════════════
  var _countdownTimer = null;

  function startCountdown(targetDateStr) {
    if (_countdownTimer) {
      clearInterval(_countdownTimer);
      _countdownTimer = null;
    }

    if (!targetDateStr) return;

    var targetTime = new Date(targetDateStr).getTime();
    if (isNaN(targetTime)) return;

    function tick() {
      var remaining = Math.max(0, targetTime - Date.now());
      var s  = Math.floor(remaining / 1000);
      var d  = Math.floor(s / 86400);
      var h  = Math.floor((s % 86400) / 3600);
      var m  = Math.floor((s % 3600) / 60);
      var sc = s % 60;

      var dEl  = document.getElementById('cd-days');
      var hEl  = document.getElementById('cd-hours');
      var mEl  = document.getElementById('cd-minutes');
      var sEl  = document.getElementById('cd-seconds');

      if (dEl)  dEl.textContent  = d;
      if (hEl)  hEl.textContent  = pad(h);
      if (mEl)  mEl.textContent  = pad(m);
      if (sEl)  sEl.textContent  = pad(sc);
    }

    tick();
    _countdownTimer = setInterval(tick, 1000);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  function render() {
    var C   = window.CONFIG;
    var vis = C.sections;

    // Apply theme class to <body>
    applyTheme(C.appearance.theme);

    // Update page <title>
    document.title = C.identity.eventTitle || 'Ordination Announcement';

    // Countdown
    mount('section-countdown',
      vis.countdown ? renderCountdown(C.countdown) : '');

    // Hero
    mount('section-hero',
      vis.hero ? renderHero(C.identity) : '');

    // Details row: two cards, shown/hidden individually inside the row
    mount('section-details-row',
      (vis.details || vis.intentions)
        ? renderDetailsRow(C.details, C.intentions, vis)
        : '');

    // Catechesis
    mount('section-catechesis',
      vis.catechesis ? renderCatechesis(C.catechesis) : '');

    // Livestream
    mount('section-livestream',
      vis.livestream ? renderLivestream(C.livestream) : '');

    // RSVP
    mount('section-rsvp',
      vis.rsvp ? renderRsvp(C.rsvp) : '');

    // Mass of Ordination
    mount('section-ordination-mass',
      vis.ordinationMass ? renderVenueCard(C.ordinationMass) : '');

    // Mass of Thanksgiving
    mount('section-thanksgiving-mass',
      vis.thanksgivingMass ? renderVenueCard(C.thanksgivingMass) : '');

    // Extra / stock elements
    var extras = (C.extraElements || []).map(renderExtraElement).join('\n');
    mount('section-extras', extras);

    // Start / restart the countdown timer after DOM is updated
    if (vis.countdown && C.countdown && C.countdown.targetDate) {
      startCountdown(C.countdown.targetDate);
    } else if (_countdownTimer) {
      clearInterval(_countdownTimer);
      _countdownTimer = null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC API — settings.js calls window.PAGE.render() after config changes
  // ═══════════════════════════════════════════════════════════════════════════
  window.PAGE = {
    render:     render,
    applyTheme: applyTheme,
  };

  // Run immediately on load
  render();

}());
