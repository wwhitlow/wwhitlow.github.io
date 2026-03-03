/*
 * github.js
 * Saves window.CONFIG back to config.js in the user's GitHub repository
 * using the GitHub REST API — entirely from the browser, no server needed.
 *
 * Flow:
 *   1. If no token is stored, show a step-by-step setup dialog.
 *   2. GET /repos/{owner}/{repo}/contents/config.js  → retrieve the file's SHA.
 *   3. Serialize window.CONFIG to a JS string, base64-encode it.
 *   4. PUT /repos/{owner}/{repo}/contents/config.js  → commit the new content.
 *   5. Show a success message; reload the page after 3 seconds.
 *
 * Security notes:
 *   - The Personal Access Token (PAT) is stored only in localStorage.
 *   - It is sent only to api.github.com over HTTPS — never to any other server.
 *   - The token is never injected into the page HTML.
 */

(function () {
  'use strict';

  var TOKEN_KEY = 'gh_pat';   // localStorage key for the PAT
  var REPO_KEY  = 'gh_repo';  // localStorage key for "owner/repo-name"

  // ── Status helper — updates the footer message in the settings panel ───
  function setStatus(msg, isError) {
    if (window.SETTINGS && typeof window.SETTINGS.setStatus === 'function') {
      window.SETTINGS.setStatus(msg, isError);
    }
  }

  // ── Serialize CONFIG to a valid config.js file string ─────────────────
  function serializeConfig(cfg) {
    var json = JSON.stringify(cfg, null, 2);
    return [
      '/*',
      ' * config.js  —  The single source of truth for your ordination page.',
      ' *',
      ' * HOW TO CUSTOMIZE',
      ' * ─────────────────',
      ' * The easiest way to customize this page is via the settings panel:',
      ' *   1. Open your live site',
      ' *   2. Click the ⚙ gear icon in the bottom-right corner',
      ' *   3. Edit your details and click "Save to GitHub"',
      ' *',
      ' * You can also edit this file directly in GitHub\'s web editor (click the',
      ' * pencil icon on this file). Change the values between the quotation marks,',
      ' * then click "Commit changes". Your site will update within a minute or two.',
      ' *',
      ' * IMPORTANT: Do not change the structure of this file — only change the',
      ' * values inside the quotation marks (or true/false for on/off settings).',
      ' */',
      '',
      'window.CONFIG = ' + json + ';',
      '',
    ].join('\n');
  }

  // ── Encode a string to base64, safely handling Unicode characters ──────
  // btoa() alone fails on characters outside Latin-1; TextEncoder handles them.
  function toBase64(str) {
    var bytes  = new TextEncoder().encode(str);
    var binary = '';
    bytes.forEach(function (b) { binary += String.fromCharCode(b); });
    return btoa(binary);
  }

  // ── Auto-detect the repo from the GitHub Pages URL ────────────────────
  // GitHub Pages URLs follow the pattern: https://owner.github.io/repo-name/
  // Returns "owner/repo-name" or null if the page is not served from GitHub Pages.
  function detectRepo() {
    var saved = localStorage.getItem(REPO_KEY);
    if (saved) return saved;

    var host  = window.location.hostname;   // e.g. "johndoe.github.io"
    var path  = window.location.pathname;   // e.g. "/my-ordination-site/"

    var ownerMatch = host.match(/^([^.]+)\.github\.io$/);
    if (!ownerMatch) return null;

    var owner    = ownerMatch[1];
    var segments = path.split('/').filter(Boolean);
    var repo     = segments[0];

    return (owner && repo) ? (owner + '/' + repo) : null;
  }

  // ── First-time setup dialog ────────────────────────────────────────────
  // Walks the user through creating a Personal Access Token and entering
  // their repo name, then calls callback(token, repo) to continue saving.
  function showTokenSetup(callback) {
    var dialog = document.createElement('div');
    dialog.className = 'sp-token-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', 'Connect to GitHub');

    var detected = detectRepo() || '';

    dialog.innerHTML = [
      '<div class="sp-token-dialog-inner">',
      '  <h3>Connect to GitHub (one-time setup)</h3>',
      '  <p>To save your customizations directly to GitHub, you need a <strong>Personal Access Token</strong>. This takes about 2 minutes to set up.</p>',
      '  <ol>',
      '    <li>Go to <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer"><strong>github.com → Settings → Tokens → New token (classic)</strong></a></li>',
      '    <li>Give it a name like <code>Ordination Site</code></li>',
      '    <li>Set an expiration (90 days or longer)</li>',
      '    <li>Under <strong>Scopes</strong>, check the box next to <strong>repo</strong></li>',
      '    <li>Scroll down and click <strong>Generate token</strong></li>',
      '    <li>Copy the token that appears (it starts with <code>ghp_</code>)</li>',
      '    <li>Paste it in the field below and click <strong>Save & Continue</strong></li>',
      '  </ol>',
      '  <p class="sp-hint">⚠️ Your token is stored only in this browser. It is sent only to GitHub when you click Save — never anywhere else.</p>',
      '  <label class="sp-field">',
      '    <span>Your GitHub repository (username/repo-name)</span>',
      '    <input type="text" id="dlg-repo" placeholder="e.g. johndoe/my-ordination-site" value="' + detected + '">',
      '  </label>',
      '  <label class="sp-field">',
      '    <span>Personal Access Token</span>',
      '    <input type="password" id="dlg-token" placeholder="ghp_..." autocomplete="off">',
      '  </label>',
      '  <div class="sp-token-btns">',
      '    <button id="dlg-cancel">Cancel</button>',
      '    <button id="dlg-confirm">Save &amp; Continue</button>',
      '  </div>',
      '</div>',
    ].join('\n');

    document.body.appendChild(dialog);

    // Focus the first relevant input
    var repoInput = dialog.querySelector('#dlg-repo');
    if (repoInput) {
      if (detected) {
        dialog.querySelector('#dlg-token').focus();
      } else {
        repoInput.focus();
      }
    }

    dialog.querySelector('#dlg-cancel').addEventListener('click', function () {
      document.body.removeChild(dialog);
      setStatus('Save cancelled.', false);
    });

    dialog.querySelector('#dlg-confirm').addEventListener('click', function () {
      var token = (dialog.querySelector('#dlg-token').value || '').trim();
      var repo  = (dialog.querySelector('#dlg-repo').value  || '').trim();

      if (!token) {
        alert('Please paste your Personal Access Token before continuing.');
        return;
      }
      if (!repo || repo.indexOf('/') === -1) {
        alert('Please enter your repository in the format: username/repo-name');
        return;
      }

      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(REPO_KEY,  repo);
      document.body.removeChild(dialog);
      performSave(token, repo);
    });
  }

  // ── Core save: GET SHA → PUT new content ──────────────────────────────
  function performSave(token, repo) {
    var saveBtn = document.getElementById('spSaveBtn');
    if (saveBtn) saveBtn.disabled = true;

    setStatus('Connecting to GitHub…', false);

    var content = serializeConfig(window.CONFIG);
    var encoded = toBase64(content);
    var apiUrl  = 'https://api.github.com/repos/' + repo + '/contents/config.js';
    var headers = {
      'Authorization':        'Bearer ' + token,
      'Accept':               'application/vnd.github+json',
      'Content-Type':         'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    // Step 1: GET the current file to obtain its SHA
    // (PUT on an existing file requires the current SHA to avoid conflicts)
    fetch(apiUrl, { headers: headers })
      .then(function (res) {
        if (res.status === 401 || res.status === 403) {
          // Token is invalid or expired — clear it so we re-prompt next time
          localStorage.removeItem(TOKEN_KEY);
          throw new Error(
            'GitHub rejected the token (status ' + res.status + '). ' +
            'Please click "Save to GitHub" again to enter a new token.'
          );
        }
        if (res.status === 404) {
          // File doesn't exist yet — that's fine, we'll create it
          return null;
        }
        if (!res.ok) {
          throw new Error('GitHub API error while reading file (status ' + res.status + ').');
        }
        return res.json();
      })
      .then(function (existing) {
        setStatus('Saving your changes…', false);

        var body = {
          message: 'Update config.js via settings panel',
          content: encoded,
        };

        // SHA is required when updating an existing file
        if (existing && existing.sha) {
          body.sha = existing.sha;
        }

        // Step 2: PUT the updated file
        return fetch(apiUrl, {
          method:  'PUT',
          headers: headers,
          body:    JSON.stringify(body),
        });
      })
      .then(function (res) {
        if (!res.ok) {
          return res.json().then(function (err) {
            throw new Error(
              'Save failed (status ' + res.status + '): ' +
              (err && err.message ? err.message : 'Unknown error.')
            );
          });
        }
        return res.json();
      })
      .then(function () {
        setStatus('Saved! Your site will update in about 60 seconds. Reloading…', false);
        // Reload after 4 seconds; append timestamp to bypass any browser cache
        setTimeout(function () {
          window.location.href = window.location.pathname + '?v=' + Date.now();
        }, 4000);
      })
      .catch(function (err) {
        setStatus('Error: ' + err.message, true);
        if (saveBtn) saveBtn.disabled = false;
      });
  }

  // ── Public save entry point — called by settings.js save button ───────
  function save() {
    var token = localStorage.getItem(TOKEN_KEY);
    var repo  = localStorage.getItem(REPO_KEY) || detectRepo();

    if (!token || !repo) {
      showTokenSetup(performSave);
    } else {
      performSave(token, repo);
    }
  }

  // ── Allow users to disconnect / reset their stored token ──────────────
  function disconnect() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REPO_KEY);
    setStatus('Disconnected from GitHub. Click Save to reconnect.', false);
  }

  window.GITHUB = {
    save:       save,
    disconnect: disconnect,
  };

}());
