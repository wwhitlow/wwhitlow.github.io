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

  // ── Countdown date helpers ─────────────────────────────────────────────
  // Split "2026-05-23T10:00:00-04:00" into its three parts and back again.
  function parseCountdownDate(isoStr) {
    var m = (isoStr || '').match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?([-+]\d{2}:\d{2}|Z)?/);
    if (!m) return { date: '', time: '10:00', tz: '-05:00' };
    return { date: m[1], time: m[2], tz: m[3] === 'Z' ? '+00:00' : (m[3] || '-05:00') };
  }

  function buildCountdownISO(date, time, tz) {
    if (!date || !time) return '';
    return date + 'T' + time + ':00' + (tz || '-05:00');
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

    // Lock banner — shown when no GitHub token is stored; hidden via JS when unlocked
    '<div class="sp-lock-banner" id="spLockBanner" style="display:none">',
    '  <div class="sp-lock-banner-icon">&#128274;</div>',
    '  <div class="sp-lock-banner-body">',
    '    <strong>Connect GitHub to edit settings</strong>',
    '    <p>Link your repository once to unlock all settings and save changes to your live site.</p>',
    '    <button class="sp-connect-btn" id="spConnectBtn">Connect to GitHub &rsaquo;</button>',
    '  </div>',
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

    '  <p class="sp-section-heading">Announcement Title</p>',
    '  <label class="sp-field">',
    '    <span>Text before the name</span>',
    '    <input type="text" data-path="announcementTitle.prefix" placeholder="Announcing the Ordination of">',
    '  </label>',
    '  <label class="sp-field">',
    '    <span>Name</span>',
    '    <input type="text" data-path="announcementTitle.name" placeholder="Full Name">',
    '  </label>',
    '  <label class="sp-field">',
    '    <span>Text after the name</span>',
    '    <input type="text" data-path="announcementTitle.suffix" placeholder="to the Sacred Order of Deacons">',
    '  </label>',
    '  <label class="sp-field">',
    '    <span>Photo URL (optional &mdash; paste a public image link for a circular headshot)</span>',
    '    <input type="url" data-path="announcementTitle.photoUrl" placeholder="https://example.com/photo.jpg">',
    '  </label>',
    '</section>',

    // ── TAB: Events ──────────────────────────────────────────────────────
    '<section class="sp-tab-content" data-panel="events">',
    '  <p class="sp-hint">Edit the dates, times, and locations for your events.</p>',

    '  <p class="sp-section-heading">Countdown Timer</p>',
    '  <div class="sp-field">',
    '    <span>Target Date &amp; Time</span>',
    '    <div class="sp-date-time-row">',
    '      <input type="date" id="sp-cd-date" aria-label="Event date">',
    '      <input type="time" id="sp-cd-time" aria-label="Event time">',
    '    </div>',
    '  </div>',
    '  <label class="sp-field">',
    '    <span>Timezone</span>',
    '    <select id="sp-cd-tz">',
    '      <optgroup label="United States">',
    '        <option value="-10:00">UTC-10 \u00b7 Hawaii (HST)</option>',
    '        <option value="-09:00">UTC-9 \u00b7 Alaska Standard (AKST)</option>',
    '        <option value="-08:00">UTC-8 \u00b7 Pacific Standard (PST) / Alaska Daylight (AKDT)</option>',
    '        <option value="-07:00">UTC-7 \u00b7 Mountain Standard (MST) / Pacific Daylight (PDT)</option>',
    '        <option value="-06:00">UTC-6 \u00b7 Central Standard (CST) / Mountain Daylight (MDT)</option>',
    '        <option value="-05:00">UTC-5 \u00b7 Eastern Standard (EST) / Central Daylight (CDT)</option>',
    '        <option value="-04:00">UTC-4 \u00b7 Eastern Daylight (EDT) / Atlantic Standard (AST)</option>',
    '      </optgroup>',
    '      <optgroup label="International">',
    '        <option value="-03:00">UTC-3 \u00b7 Atlantic Daylight / Brazil</option>',
    '        <option value="+00:00">UTC+0 \u00b7 Greenwich Mean Time (GMT)</option>',
    '        <option value="+01:00">UTC+1 \u00b7 British Summer (BST) / Central Europe winter</option>',
    '        <option value="+02:00">UTC+2 \u00b7 Central European Summer (CEST)</option>',
    '        <option value="+03:00">UTC+3 \u00b7 Moscow / East Africa</option>',
    '        <option value="+05:30">UTC+5:30 \u00b7 India (IST)</option>',
    '        <option value="+08:00">UTC+8 \u00b7 China / Singapore</option>',
    '        <option value="+09:00">UTC+9 \u00b7 Japan (JST) / Korea (KST)</option>',
    '        <option value="+10:00">UTC+10 \u00b7 Australia Eastern (AEST)</option>',
    '        <option value="+12:00">UTC+12 \u00b7 New Zealand (NZST)</option>',
    '      </optgroup>',
    '    </select>',
    '  </label>',
    '  <p class="sp-hint">US Eastern is UTC-5 in winter (Nov\u2013Mar) and UTC-4 in summer (Mar\u2013Nov).</p>',
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
    '        <span class="swatch-dot" style="background:#d4b870"></span>',
    '      </span>',
    '      Slate',
    '    </button>',

    '  </div>',
    '</section>',

    // ── TAB: Sections ────────────────────────────────────────────────────
    '<section class="sp-tab-content" data-panel="sections">',
    '  <p class="sp-hint">Toggle any section on or off. Changes preview instantly.</p>',
    '  <label class="sp-toggle-row"><span>Announcement Title</span>    <input type="checkbox" data-path="sections.announcementTitle"></label>',
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
    '    <button class="sp-add-btn" data-add="imageBlock">+ Image / Photo Block</button>',
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
    '  <div class="sp-footer-secondary">',
    '    <button class="sp-secondary-btn" id="spExportBtn" title="Download your settings as a backup file">&#8595; Export Settings</button>',
    '    <button class="sp-secondary-btn" id="spImportBtn" title="Restore settings from a backup file">&#8593; Import Settings</button>',
    '  </div>',
    '  <button class="sp-secondary-btn sp-update-btn" id="spUpdateBtn" title="Replace site code with the latest version from the template repository">&#8635; Update from Template</button>',
    '</div>',
  ].join('\n');

  // ── Default values for each stock element type ─────────────────────────
  var ELEMENT_DEFAULTS = {
    imageBlock:     { type: 'imageBlock',     url: '', alt: '', caption: '' },
    scripture:      { type: 'scripture',      reference: 'Book Chapter:Verse', text: 'Enter the scripture or quote text here.' },
    customText:     { type: 'customText',     heading: 'New Section',          body: 'Enter your text here.' },
    prayerPartners: { type: 'prayerPartners', heading: 'Prayer Partners',      names: ['Name One', 'Name Two'] },
    venue:          { type: 'venue',          eyebrow: 'Additional Event',     heading: 'Venue Name',
                      description: '',         parish: '', date: '', time: '',
                      address: '',             parking: '', mapsEmbedUrl: '' },
    youtubeEmbed:   { type: 'youtubeEmbed',   heading: 'Video',               videoId: '' },
  };

  // Which extra element is currently being edited (null = showing the list)
  var editingIndex = null;

  // Field definitions for each element type's edit form
  var EDIT_FIELDS = {
    imageBlock: [
      { path: 'url',     label: 'Image URL (paste a public link)',         tag: 'input',    placeholder: 'https://example.com/photo.jpg' },
      { path: 'alt',     label: 'Alt text (describes the image)',          tag: 'input',    placeholder: 'e.g. Gabriel Whitlow at ordination' },
      { path: 'caption', label: 'Caption (optional, shown below image)',   tag: 'textarea', rows: 2 },
    ],
    scripture: [
      { path: 'reference', label: 'Scripture Reference', tag: 'input', placeholder: 'e.g. John 13:35' },
      { path: 'text',      label: 'Quote Text',          tag: 'textarea', rows: 4 },
    ],
    customText: [
      { path: 'heading', label: 'Section Heading', tag: 'input' },
      { path: 'body',    label: 'Body Text',       tag: 'textarea', rows: 5 },
    ],
    prayerPartners: [
      { path: 'heading', label: 'Section Heading',        tag: 'input' },
      { path: 'names',   label: 'Names (one per line)',   tag: 'textarea', rows: 5, isArray: true },
    ],
    venue: [
      { path: 'eyebrow',      label: 'Eyebrow',                tag: 'input' },
      { path: 'heading',      label: 'Heading',                tag: 'input' },
      { path: 'description',  label: 'Description',            tag: 'textarea', rows: 2 },
      { path: 'parish',       label: 'Parish',                 tag: 'input' },
      { path: 'date',         label: 'Date',                   tag: 'input', placeholder: 'May 23, 2026' },
      { path: 'time',         label: 'Time',                   tag: 'input', placeholder: '10:00 AM Eastern' },
      { path: 'address',      label: 'Address',                tag: 'input' },
      { path: 'parking',      label: 'Parking / Notes',        tag: 'textarea', rows: 2 },
      { path: 'mapsEmbedUrl', label: 'Google Maps Embed URL',  tag: 'textarea', rows: 3 },
    ],
    youtubeEmbed: [
      { path: 'heading', label: 'Section Heading',                                tag: 'input' },
      { path: 'videoId', label: 'YouTube Video ID (the part after ?v= in the URL)', tag: 'input', placeholder: 'dQw4w9WgXcQ' },
    ],
  };

  var TYPE_LABELS = {
    imageBlock:     'Image / Photo',
    scripture:      'Scripture / Quote',
    customText:     'Custom Text',
    prayerPartners: 'Prayer Partners',
    venue:          'Venue Card',
    youtubeEmbed:   'YouTube Embed',
  };

  // ── Export / Import helpers ──────────────────────────────────────────────
  // Deep merge: overlays source onto target so new template fields are preserved
  // when importing an older config.json that predates them.
  function deepMerge(target, source) {
    Object.keys(source).forEach(function (key) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key] || typeof target[key] !== 'object') target[key] = {};
        deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    });
    return target;
  }

  function exportConfig() {
    var json = JSON.stringify(window.CONFIG, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href     = url;
    a.download = 'ordination-config.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importConfig() {
    var input    = document.createElement('input');
    input.type   = 'file';
    input.accept = '.json,application/json';
    input.onchange = function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (evt) {
        try {
          var parsed = JSON.parse(evt.target.result);
          deepMerge(window.CONFIG, parsed);
          window.PAGE.render();
          populatePanel();
          setStatus('Settings imported \u2014 click Save to GitHub to apply.', false);
        } catch (err) {
          setStatus('Import failed: file is not valid JSON.', true);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // ── Auth helpers ────────────────────────────────────────────────────────
  function isLocked() {
    return !localStorage.getItem('gh_pat');
  }

  // Enable or disable all editable fields based on whether a PAT is stored.
  // The Appearance tab (theme swatches) is always usable — no data-path inputs there.
  function applyLockState() {
    var panel = document.getElementById('settingsPanel');
    if (!panel) return;

    var locked = isLocked();
    var banner = document.getElementById('spLockBanner');
    if (banner) banner.style.display = locked ? 'flex' : 'none';

    // Disable/enable all data-path inputs that are NOT in the appearance tab
    panel.querySelectorAll('[data-path]').forEach(function (el) {
      var tabContent = el.closest('[data-panel]');
      var isAppearance = tabContent && tabContent.dataset.panel === 'appearance';
      if (!isAppearance) el.disabled = locked;
    });

    // Disable/enable Add Elements buttons
    panel.querySelectorAll('.sp-add-btn').forEach(function (btn) {
      btn.disabled = locked;
    });

    // Disable/enable custom countdown inputs (no data-path, handled separately)
    ['sp-cd-date', 'sp-cd-time', 'sp-cd-tz'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.disabled = locked;
    });

    // Wire the Connect button (use .onclick to avoid stacking listeners)
    var connectBtn = document.getElementById('spConnectBtn');
    if (connectBtn) {
      connectBtn.onclick = function () {
        if (window.GITHUB && typeof window.GITHUB.connect === 'function') {
          window.GITHUB.connect();
        }
      };
    }
  }

  // ── Render the list of added extra elements (or the edit form) ─────────
  function renderExtrasList() {
    var list = document.getElementById('sp-extras-list');
    if (!list) return;

    var extras = window.CONFIG.extraElements || [];

    // Guard: editingIndex may have become stale if elements were removed
    if (editingIndex !== null && !extras[editingIndex]) editingIndex = null;

    // Show edit form when a specific element is selected
    if (editingIndex !== null) {
      var el = extras[editingIndex];
      var fields = EDIT_FIELDS[el.type] || [];
      var title  = TYPE_LABELS[el.type] || el.type;

      var fieldsHtml = fields.map(function (f) {
        var ctrl = f.tag === 'textarea'
          ? '<textarea rows="' + (f.rows || 3) + '" data-edit-path="' + f.path + '"' +
            (f.placeholder ? ' placeholder="' + f.placeholder + '"' : '') + '></textarea>'
          : '<input type="text" data-edit-path="' + f.path + '"' +
            (f.placeholder ? ' placeholder="' + f.placeholder + '"' : '') + '>';
        return '<label class="sp-field"><span>' + f.label + '</span>' + ctrl + '</label>';
      }).join('\n');

      list.innerHTML = [
        '<div class="sp-edit-header">',
        '  <span class="sp-edit-title">Editing: ' + title + '</span>',
        '  <button class="sp-done-btn" aria-label="Back to elements list">\u2190 Back</button>',
        '</div>',
        fieldsHtml || '<p class="sp-hint">No editable fields for this type.</p>',
      ].join('\n');

      // Populate current values
      list.querySelectorAll('[data-edit-path]').forEach(function (input) {
        var val = el[input.dataset.editPath];
        input.value = Array.isArray(val) ? val.join('\n') : (val == null ? '' : val);
      });

      // Bind live edits → CONFIG update → page re-render
      list.querySelectorAll('[data-edit-path]').forEach(function (input) {
        input.addEventListener('input', function () {
          var field = fields.find(function (f) { return f.path === input.dataset.editPath; });
          el[input.dataset.editPath] = (field && field.isArray)
            ? input.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean)
            : input.value;
          window.PAGE.render();
        });
      });

      list.querySelector('.sp-done-btn').addEventListener('click', function () {
        editingIndex = null;
        renderExtrasList();
      });

      return;
    }

    // ── Normal list view ──────────────────────────────────────────────────
    if (extras.length === 0) {
      list.innerHTML = '<p class="sp-hint">No extra elements added yet.</p>';
      return;
    }

    var locked  = isLocked();
    var html = extras.map(function (el, i) {
      var label   = el.heading || el.reference || el.type;
      var disAttr = locked ? ' disabled' : '';
      return [
        '<div class="sp-extra-row">',
        '  <span>' + (TYPE_LABELS[el.type] || el.type) + (label && label !== el.type ? ' \u2014 ' + label : '') + '</span>',
        '  <div class="sp-extra-btns">',
        '    <button class="sp-edit-btn"' + disAttr + '   data-index="' + i + '">Edit</button>',
        '    <button class="sp-remove-btn"' + disAttr + ' data-index="' + i + '">Remove</button>',
        '  </div>',
        '</div>',
      ].join('\n');
    }).join('\n');

    list.innerHTML = html;

    list.querySelectorAll('.sp-edit-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        editingIndex = parseInt(btn.dataset.index, 10);
        renderExtrasList();
      });
    });

    list.querySelectorAll('.sp-remove-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.dataset.index, 10);
        window.CONFIG.extraElements.splice(idx, 1);
        if (editingIndex !== null && editingIndex >= idx) editingIndex = null;
        renderExtrasList();
        window.PAGE.render();
      });
    });
  }

  // ── Populate all inputs from window.CONFIG ─────────────────────────────
  function populatePanel() {
    editingIndex = null;   // always start Add Elements tab in list view
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

    // Populate countdown date / time / timezone (custom inputs — not data-path bound)
    var cdParsed = parseCountdownDate(getPath(window.CONFIG, 'countdown.targetDate'));
    var cdDateEl = document.getElementById('sp-cd-date');
    var cdTimeEl = document.getElementById('sp-cd-time');
    var cdTzEl   = document.getElementById('sp-cd-tz');
    if (cdDateEl) cdDateEl.value = cdParsed.date;
    if (cdTimeEl) cdTimeEl.value = cdParsed.time;
    if (cdTzEl)   { cdTzEl.value = cdParsed.tz; if (!cdTzEl.value) cdTzEl.value = '-05:00'; }

    // Mark the active theme swatch
    var currentTheme = window.CONFIG.appearance.theme || 'burgundy';
    panel.querySelectorAll('.sp-swatch').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.theme === currentTheme);
    });

    renderExtrasList();
    applyLockState();
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

    // Countdown date / time / timezone → rebuild ISO string in CONFIG
    (function () {
      var cdDateEl = panel.querySelector('#sp-cd-date');
      var cdTimeEl = panel.querySelector('#sp-cd-time');
      var cdTzEl   = panel.querySelector('#sp-cd-tz');
      function syncCountdown() {
        var iso = buildCountdownISO(
          cdDateEl ? cdDateEl.value : '',
          cdTimeEl ? cdTimeEl.value : '',
          cdTzEl   ? cdTzEl.value   : '-05:00'
        );
        setPath(window.CONFIG, 'countdown.targetDate', iso);
        window.PAGE.render();
      }
      if (cdDateEl) cdDateEl.addEventListener('change', syncCountdown);
      if (cdTimeEl) cdTimeEl.addEventListener('change', syncCountdown);
      if (cdTzEl)   cdTzEl.addEventListener('change',  syncCountdown);
    }());

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

    // Export / Import / Update buttons
    var exportBtn = document.getElementById('spExportBtn');
    var importBtn = document.getElementById('spImportBtn');
    var updateBtn = document.getElementById('spUpdateBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportConfig);
    if (importBtn) importBtn.addEventListener('click', importConfig);
    if (updateBtn) updateBtn.addEventListener('click', function () {
      if (window.GITHUB && typeof window.GITHUB.update === 'function') {
        window.GITHUB.update();
      }
    });
  }

  // ── Status message helper (called by github.js) ────────────────────────
  function setStatus(msg, isError) {
    var el = document.getElementById('spSaveStatus');
    if (!el) return;
    el.textContent = msg;
    el.style.color = isError ? '#c0392b' : '#27ae60';
  }

  // Re-apply lock state after a token is stored (called by github.js connect flow)
  function refreshLock() {
    applyLockState();
    renderExtrasList();
  }

  // Expose setStatus so github.js can update the panel footer
  window.SETTINGS = { setStatus: setStatus, refreshLock: refreshLock, exportConfig: exportConfig };

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());
