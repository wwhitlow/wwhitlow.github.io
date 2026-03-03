/*
 * settings.js
 * Builds the settings panel, binds all form inputs to window.CONFIG,
 * and calls window.PAGE.render() on any change for live preview.
 * The "Save to GitHub" button delegates to window.GITHUB.save().
 */

(function () {
  'use strict';

  // ── Deep get/set on CONFIG using dot-path strings ──────────────────────
  // e.g. getPath(CONFIG, "identity.candidateName") → "Gabriel Whitlow"
  function getPath(obj, path) {
    return path.split('.').reduce(function (o, k) {
      return (o && o[k] !== undefined) ? o[k] : '';
    }, obj);
  }

  function setPath(obj, path, value) {
    var parts = path.split('.');
    var cur   = obj;
    for (var i = 0; i < parts.length - 1; i++) {
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  }

  // ── Panel HTML ─────────────────────────────────────────────────────────
  // Uses a template string for readability. All dynamic values are
  // populated in populatePanel() — nothing from CONFIG is injected here.
  var PANEL_HTML = [
    // Header
    '<div class="sp-header">',
    '  <span class="sp-title">Customize Your Page</span>',
    '  <button class="sp-close" id="spClose" aria-label="Close settings">&times;</button>',
    '</div>',

    // Tab bar
    '<nav class="sp-tabs" role="tablist">',
    '  <button class="sp-tab active" data-tab="identity"   role="tab">Identity</button>',
    '  <button class="sp-tab"        data-tab="events"     role="tab">Events</button>',
    '  <button class="sp-tab"        data-tab="links"      role="tab">Links</button>',
    '  <button class="sp-tab"        data-tab="appearance" role="tab">Appearance</button>',
    '  <button class="sp-tab"        data-tab="sections"   role="tab">Sections</button>',
    '  <button class="sp-tab"        data-tab="add"        role="tab">Add Elements</button>',
    '</nav>',

    // ── TAB: Identity ────────────────────────────────────────────────────
    '<section class="sp-tab-content active" data-panel="identity">',
    '  <label class="sp-field">',
    '    <span>Candidate Name</span>',
    '    <input type="text" data-path="identity.candidateName" placeholder="Full name">',
    '  </label>',
    '  <label class="sp-field">',
    '    <span>Page Title (large heading)</span>',
    '    <input type="text" data-path="identity.eventTitle" placeholder="e.g. Diaconate Ordination — 2026">',
    '  </label>',
    '  <label class="sp-field">',
    '    <span>Eyebrow Text (small text above the title, e.g. diocese name)</span>',
    '    <input type="text" data-path="identity.eyebrow" placeholder="e.g. Archdiocese of Atlanta">',
    '  </label>',
    '  <label class="sp-field">',
    '    <span>Opening Paragraph</span>',
    '    <textarea rows="5" data-path="identity.leadText"></textarea>',
    '  </label>',
    '</section>',

    // ── TAB: Events ──────────────────────────────────────────────────────
    '<section class="sp-tab-content" data-panel="events">',
    '  <p class="sp-hint">Edit the dates, times, and locations for your events.</p>',

    '  <p class="sp-section-heading">Countdown Timer</p>',
    '  <label class="sp-field">',
    '    <span>Target Date & Time (ISO format with timezone)</span>',
    '    <input type="text" data-path="countdown.targetDate" placeholder="2026-05-23T10:00:00-04:00">',
    '  </label>',
    '  <label class="sp-field">',
    '    <span>Countdown Reflection Text</span>',
    '    <textarea rows="3" data-path="countdown.reflectionText"></textarea>',
    '  </label>',

    '  <p class="sp-section-heading">Event Details Card</p>',
    '  <label class="sp-field">',
    '    <span>Card Heading</span>',
    '    <input type="text" data-path="details.heading" placeholder="e.g. Ordination Day">',
    '  </label>',
    '  <label class="sp-field">',
    '    <span>Date Display Text</span>',
    '    <input type="text" data-path="details.dateDisplay" placeholder="e.g. May 23, 2026">',
    '  </label>',
    '  <label class="sp-field">',
    '    <span>Body Text</span>',
    '    <textarea rows="3" data-path="details.body"></textarea>',
    '  </label>',

    '  <p class="sp-section-heading">Mass of Ordination</p>',
    '  <label class="sp-field"><span>Parish Name</span><input type="text" data-path="ordinationMass.parish"></label>',
    '  <label class="sp-field"><span>Date (display text)</span><input type="text" data-path="ordinationMass.date" placeholder="May 23, 2026"></label>',
    '  <label class="sp-field"><span>Time</span><input type="text" data-path="ordinationMass.time" placeholder="10:00 AM Eastern"></label>',
    '  <label class="sp-field"><span>Address</span><input type="text" data-path="ordinationMass.address"></label>',
    '  <label class="sp-field"><span>Parking / Notes</span><textarea rows="2" data-path="ordinationMass.parking"></textarea></label>',
    '  <label class="sp-field"><span>Card Description</span><textarea rows="2" data-path="ordinationMass.description"></textarea></label>',

    '  <p class="sp-section-heading">Mass of Thanksgiving</p>',
    '  <label class="sp-field"><span>Parish Name</span><input type="text" data-path="thanksgivingMass.parish"></label>',
    '  <label class="sp-field"><span>Date (display text)</span><input type="text" data-path="thanksgivingMass.date" placeholder="May 24, 2026"></label>',
    '  <label class="sp-field"><span>Time</span><input type="text" data-path="thanksgivingMass.time" placeholder="11:00 AM Eastern"></label>',
    '  <label class="sp-field"><span>Address</span><input type="text" data-path="thanksgivingMass.address"></label>',
    '  <label class="sp-field"><span>Reception / Notes</span><textarea rows="2" data-path="thanksgivingMass.parking"></textarea></label>',
    '  <label class="sp-field"><span>Card Description</span><textarea rows="2" data-path="thanksgivingMass.description"></textarea></label>',
    '</section>',

    // ── TAB: Links ───────────────────────────────────────────────────────
    '<section class="sp-tab-content" data-panel="links">',
    '  <p class="sp-hint">Paste embed URLs from Google Forms, Google Maps, or a livestream service.</p>',

    '  <p class="sp-section-heading">RSVP Form</p>',
    '  <label class="sp-field">',
    '    <span>Google Form Embed URL</span>',
    '    <textarea rows="3" data-path="rsvp.formEmbedUrl" placeholder="https://docs.google.com/forms/d/e/.../viewform?embedded=true"></textarea>',
    '  </label>',

    '  <p class="sp-section-heading">Livestream</p>',
    '  <label class="sp-field">',
    '    <span>Livestream URL (leave empty to show "Coming Soon")</span>',
    '    <input type="url" data-path="livestream.url" placeholder="https://youtube.com/live/...">',
    '  </label>',
    '  <label class="sp-field">',
    '    <span>"Coming Soon" Message</span>',
    '    <input type="text" data-path="livestream.comingSoonText">',
    '  </label>',

    '  <p class="sp-section-heading">Google Maps Embeds</p>',
    '  <label class="sp-field">',
    '    <span>Ordination Mass — Maps Embed URL</span>',
    '    <textarea rows="3" data-path="ordinationMass.mapsEmbedUrl" placeholder="https://www.google.com/maps/embed?pb=..."></textarea>',
    '  </label>',
    '  <label class="sp-field">',
    '    <span>Mass of Thanksgiving — Maps Embed URL</span>',
    '    <textarea rows="3" data-path="thanksgivingMass.mapsEmbedUrl" placeholder="https://www.google.com/maps/embed?pb=..."></textarea>',
    '  </label>',
    '</section>',

    // ── TAB: Appearance ──────────────────────────────────────────────────
    '<section class="sp-tab-content" data-panel="appearance">',
    '  <p class="sp-hint">Click a theme to apply it instantly. Click "Save to GitHub" when you are happy with the result.</p>',
    '  <div class="sp-swatches">',

    '    <button class="sp-swatch" data-theme="burgundy">',
    '      <span class="swatch-preview">',
    '        <span class="swatch-dot" style="background:#7d1a44"></span>',
    '        <span class="swatch-dot" style="background:#d4a843"></span>',
    '      </span>',
    '      Burgundy',
    '    </button>',

    '    <button class="sp-swatch" data-theme="navy">',
    '      <span class="swatch-preview">',
    '        <span class="swatch-dot" style="background:#1f3b76"></span>',
    '        <span class="swatch-dot" style="background:#f4c542"></span>',
    '      </span>',
    '      Navy Blue',
    '    </button>',

    '    <button class="sp-swatch" data-theme="forest">',
    '      <span class="swatch-preview">',
    '        <span class="swatch-dot" style="background:#255f33"></span>',
    '        <span class="swatch-dot" style="background:#d4a843"></span>',
    '      </span>',
    '      Forest Green',
    '    </button>',

    '    <button class="sp-swatch" data-theme="slate">',
    '      <span class="swatch-preview">',
    '        <span class="swatch-dot" style="background:#3d506a"></span>',
    '        <span class="swatch-dot" style="background:#c5a95f"></span>',
    '      </span>',
    '      Slate',
    '    </button>',

    '  </div>',
    '</section>',

    // ── TAB: Sections ────────────────────────────────────────────────────
    '<section class="sp-tab-content" data-panel="sections">',
    '  <p class="sp-hint">Toggle any section on or off. Changes preview instantly.</p>',
    '  <label class="sp-toggle-row"><span>Countdown Banner</span>      <input type="checkbox" data-path="sections.countdown"></label>',
    '  <label class="sp-toggle-row"><span>Hero / Intro</span>           <input type="checkbox" data-path="sections.hero"></label>',
    '  <label class="sp-toggle-row"><span>Event Details Card</span>    <input type="checkbox" data-path="sections.details"></label>',
    '  <label class="sp-toggle-row"><span>Prayer Intentions</span>     <input type="checkbox" data-path="sections.intentions"></label>',
    '  <label class="sp-toggle-row"><span>Catechesis Section</span>    <input type="checkbox" data-path="sections.catechesis"></label>',
    '  <label class="sp-toggle-row"><span>Livestream</span>            <input type="checkbox" data-path="sections.livestream"></label>',
    '  <label class="sp-toggle-row"><span>RSVP / Stay in Touch</span>  <input type="checkbox" data-path="sections.rsvp"></label>',
    '  <label class="sp-toggle-row"><span>Mass of Ordination</span>    <input type="checkbox" data-path="sections.ordinationMass"></label>',
    '  <label class="sp-toggle-row"><span>Mass of Thanksgiving</span>  <input type="checkbox" data-path="sections.thanksgivingMass"></label>',
    '</section>',

    // ── TAB: Add Elements ────────────────────────────────────────────────
    '<section class="sp-tab-content" data-panel="add">',
    '  <p class="sp-hint">Add optional blocks to the bottom of your page. Click a button to add one, then save.</p>',
    '  <div class="sp-add-grid">',
    '    <button class="sp-add-btn" data-add="scripture">+ Scripture / Quote Block</button>',
    '    <button class="sp-add-btn" data-add="customText">+ Custom Text Section</button>',
    '    <button class="sp-add-btn" data-add="prayerPartners">+ Prayer Partners List</button>',
    '    <button class="sp-add-btn" data-add="venue">+ Second Venue Card</button>',
    '    <button class="sp-add-btn" data-add="youtubeEmbed">+ YouTube Video Embed</button>',
    '  </div>',
    '  <p class="sp-extras-list-label">Added Elements</p>',
    '  <div id="sp-extras-list"></div>',
    '</section>',

    // ── Footer: Save button ──────────────────────────────────────────────
    '<div class="sp-footer">',
    '  <div class="sp-save-status" id="spSaveStatus" role="status" aria-live="polite"></div>',
    '  <button class="sp-save-btn" id="spSaveBtn">Save to GitHub</button>',
    '</div>',
  ].join('\n');

  // ── Default values for each stock element type ─────────────────────────
  var ELEMENT_DEFAULTS = {
    scripture:      { type: 'scripture',      reference: 'Book Chapter:Verse', text: 'Enter the scripture or quote text here.' },
    customText:     { type: 'customText',     heading: 'New Section',          body: 'Enter your text here.' },
    prayerPartners: { type: 'prayerPartners', heading: 'Prayer Partners',      names: ['Name One', 'Name Two'] },
    venue:          { type: 'venue',          eyebrow: 'Additional Event',     heading: 'Venue Name',
                      description: '',         parish: '', date: '', time: '',
                      address: '',             parking: '', mapsEmbedUrl: '' },
    youtubeEmbed:   { type: 'youtubeEmbed',   heading: 'Video',               videoId: '' },
  };

  // ── Render the list of added extra elements ────────────────────────────
  function renderExtrasList() {
    var list = document.getElementById('sp-extras-list');
    if (!list) return;

    var extras = window.CONFIG.extraElements || [];

    if (extras.length === 0) {
      list.innerHTML = '<p class="sp-hint">No extra elements added yet.</p>';
      return;
    }

    var html = extras.map(function (el, i) {
      var label = el.heading || el.reference || el.type;
      return [
        '<div class="sp-extra-row">',
        '  <span>' + el.type + (label ? ' — ' + label : '') + '</span>',
        '  <button class="sp-remove-btn" data-index="' + i + '" aria-label="Remove element">Remove</button>',
        '</div>',
      ].join('\n');
    }).join('\n');

    list.innerHTML = html;

    list.querySelectorAll('.sp-remove-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.dataset.index, 10);
        window.CONFIG.extraElements.splice(idx, 1);
        renderExtrasList();
        window.PAGE.render();
      });
    });
  }

  // ── Populate all inputs from window.CONFIG ─────────────────────────────
  function populatePanel() {
    var panel = document.getElementById('settingsPanel');

    // Text inputs and textareas
    panel.querySelectorAll('[data-path]').forEach(function (el) {
      var path = el.dataset.path;
      var val  = getPath(window.CONFIG, path);

      if (el.type === 'checkbox') {
        el.checked = !!val;
      } else {
        el.value = (val === null || val === undefined) ? '' : val;
      }
    });

    // Mark the active theme swatch
    var currentTheme = window.CONFIG.appearance.theme || 'burgundy';
    panel.querySelectorAll('.sp-swatch').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.theme === currentTheme);
    });

    renderExtrasList();
  }

  // ── Bind all inputs so every change updates CONFIG + re-renders ────────
  function bindInputs(panel) {
    panel.querySelectorAll('[data-path]').forEach(function (el) {
      var eventType = (el.type === 'checkbox') ? 'change' : 'input';
      el.addEventListener(eventType, function () {
        var path  = el.dataset.path;
        var value = (el.type === 'checkbox') ? el.checked : el.value;
        setPath(window.CONFIG, path, value);
        window.PAGE.render();
      });
    });

    // Theme swatch buttons
    panel.querySelectorAll('.sp-swatch').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var theme = btn.dataset.theme;
        window.CONFIG.appearance.theme = theme;
        window.PAGE.applyTheme(theme);
        panel.querySelectorAll('.sp-swatch').forEach(function (b) {
          b.classList.toggle('active', b.dataset.theme === theme);
        });
      });
    });

    // Stock element add buttons
    panel.querySelectorAll('.sp-add-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var type = btn.dataset.add;
        var defaults = ELEMENT_DEFAULTS[type];
        if (!defaults) return;

        if (!window.CONFIG.extraElements) window.CONFIG.extraElements = [];
        // Deep-clone defaults so multiple adds don't share the same object
        window.CONFIG.extraElements.push(JSON.parse(JSON.stringify(defaults)));

        renderExtrasList();
        window.PAGE.render();
      });
    });
  }

  // ── Tab switching ──────────────────────────────────────────────────────
  function bindTabs(panel) {
    panel.querySelectorAll('.sp-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        var target = tab.dataset.tab;

        panel.querySelectorAll('.sp-tab').forEach(function (t) {
          t.classList.toggle('active', t.dataset.tab === target);
          t.setAttribute('aria-selected', t.dataset.tab === target ? 'true' : 'false');
        });

        panel.querySelectorAll('.sp-tab-content').forEach(function (c) {
          c.classList.toggle('active', c.dataset.panel === target);
        });
      });
    });
  }

  // ── Open / close panel ─────────────────────────────────────────────────
  function openPanel() {
    var panel   = document.getElementById('settingsPanel');
    var overlay = document.getElementById('settingsOverlay');
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    overlay.classList.add('visible');
    populatePanel();
    // Move focus into the panel for accessibility
    var firstInput = panel.querySelector('input, textarea, button');
    if (firstInput) firstInput.focus();
  }

  function closePanel() {
    var panel   = document.getElementById('settingsPanel');
    var overlay = document.getElementById('settingsOverlay');
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('visible');
    document.getElementById('settingsTrigger').focus();
  }

  // ── Initialise ─────────────────────────────────────────────────────────
  function init() {
    var panel = document.getElementById('settingsPanel');
    if (!panel) return;

    // Inject the panel HTML
    panel.innerHTML = PANEL_HTML;

    // Wire up open/close
    var trigger = document.getElementById('settingsTrigger');
    var overlay = document.getElementById('settingsOverlay');
    var closeBtn = document.getElementById('spClose');
    var saveBtn  = document.getElementById('spSaveBtn');

    if (trigger) trigger.addEventListener('click', openPanel);
    if (closeBtn) closeBtn.addEventListener('click', closePanel);
    if (overlay)  overlay.addEventListener('click', closePanel);

    // Close on Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('open')) closePanel();
    });

    // Save button delegates to github.js
    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        if (window.GITHUB && typeof window.GITHUB.save === 'function') {
          window.GITHUB.save();
        } else {
          setStatus('GitHub save is not yet configured.', true);
        }
      });
    }

    bindTabs(panel);
    bindInputs(panel);
  }

  // ── Status message helper (called by github.js) ────────────────────────
  function setStatus(msg, isError) {
    var el = document.getElementById('spSaveStatus');
    if (!el) return;
    el.textContent = msg;
    el.style.color = isError ? '#c0392b' : '#27ae60';
  }

  // Expose setStatus so github.js can update the panel footer
  window.SETTINGS = { setStatus: setStatus };

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());
