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

  // ── Template update constants ──────────────────────────────────────────
  var TEMPLATE_REPO  = 'wwhitlow/wwhitlow.github.io';
  var TEMPLATE_FILES = [
    'index.html',
    'config.js',        // replaced wholesale — users re-import their exported settings
    'css/themes.css',
    'css/styles.css',
    'js/page.js',
    'js/settings.js',
    'js/github.js',
    'README.md',
  ];

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
      if (callback) callback(token, repo);
    });
  }

  // ── Core save: GET SHA → PUT new content ──────────────────────────────
  function performSave(token, repo) {
    var saveBtn     = document.getElementById('spSaveBtn');
    var saveStartTime = new Date();   // captured before any async work
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
        // Commit succeeded — now wait for GitHub Pages to actually deploy it.
        // We poll the Deployments API until the github-pages environment shows
        // a "success" state, then reload so the browser fetches the fresh config.
        waitForDeployment(token, repo, saveStartTime, saveBtn);
      })
      .catch(function (err) {
        setStatus('Error: ' + err.message, true);
        if (saveBtn) saveBtn.disabled = false;
      });
  }

  // ── Poll GitHub Deployments API until github-pages env reports success ─
  //
  // GitHub Pages (both classic branch-based and Actions-based) creates a
  // Deployment record under the "github-pages" environment whenever a new
  // commit triggers a rebuild. We look for a deployment created at or after
  // saveStartTime, then watch its status until it reaches "success".
  //
  // API endpoints used (all require the same Bearer token / repo scope):
  //   GET /repos/{owner}/{repo}/deployments?environment=github-pages&per_page=5
  //   GET /repos/{owner}/{repo}/deployments/{id}/statuses?per_page=1
  //
  function waitForDeployment(token, repo, saveStartTime, saveBtn) {
    var apiBase = 'https://api.github.com/repos/' + repo;
    var headers = {
      'Authorization':        'Bearer ' + token,
      'Accept':               'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    var INITIAL_DELAY_MS = 8000;   // GitHub needs a moment to register the commit
    var POLL_INTERVAL_MS = 6000;   // check every 6 s
    var MAX_WAIT_MS      = 3 * 60 * 1000;  // give up after 3 minutes

    var startedAt  = Date.now();
    var deploymentId = null;

    setStatus('✓ Saved! Waiting for GitHub to deploy…', false);

    // Short initial pause before the first poll
    var pollTimer = null;
    var initialTimer = setTimeout(function () {
      pollTimer = setInterval(doPoll, POLL_INTERVAL_MS);
      doPoll();
    }, INITIAL_DELAY_MS);

    function doPoll() {
      if (Date.now() - startedAt > MAX_WAIT_MS) {
        finish(false, 'Saved, but deployment is taking longer than expected. Reload the page manually when ready.');
        return;
      }

      // If we already found the deployment ID, jump straight to status check
      if (deploymentId !== null) {
        checkStatus(deploymentId);
        return;
      }

      // Look for a deployment created at or after our save started
      fetch(apiBase + '/deployments?environment=github-pages&per_page=5', { headers: headers })
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (list) {
          if (!list || !list.length) return;

          // Find the most-recent deployment created >= saveStartTime
          var match = list.find(function (d) {
            return new Date(d.created_at) >= saveStartTime;
          });

          if (!match) return;  // deployment not yet registered, keep polling

          deploymentId = match.id;
          checkStatus(deploymentId);
        })
        .catch(function () { /* ignore transient errors — keep polling */ });
    }

    function checkStatus(id) {
      fetch(apiBase + '/deployments/' + id + '/statuses?per_page=1', { headers: headers })
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (statuses) {
          if (!statuses || !statuses.length) return;
          var state = statuses[0].state;

          if (state === 'success') {
            finish(true, null);
          } else if (state === 'failure' || state === 'error') {
            finish(false, 'Deployment failed. Check your repository\'s Actions tab for details.');
          } else {
            // pending / in_progress / queued — keep polling
            var elapsed = Math.round((Date.now() - startedAt) / 1000);
            setStatus('✓ Saved! Deploying… (' + elapsed + 's elapsed)', false);
          }
        })
        .catch(function () { /* ignore transient errors */ });
    }

    function finish(success, errorMsg) {
      clearTimeout(initialTimer);
      clearInterval(pollTimer);
      if (saveBtn) saveBtn.disabled = false;

      if (success) {
        setStatus('✓ Deployed! Reloading…', false);
        // Small pause so the user sees the success message, then reload.
        // Append ?v= to bust any in-browser cache of config.js.
        setTimeout(function () {
          window.location.href = window.location.pathname + '?v=' + Date.now();
        }, 1500);
      } else {
        setStatus(errorMsg, !success);
      }
    }
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

  // ── Update availability check ──────────────────────────────────────────
  // Uses the GitHub Releases API to fetch the latest published release from
  // the template repo and compares its tag to the version stored in localStorage.
  // Returns { available: bool, release: { tag, name, body, url } | null }.
  // Result is cached per browser session so repeated panel opens don't
  // trigger multiple API calls. A 404 (no releases yet) is silently ignored.
  var _updateAvailable = null;   // null = not yet checked this session
  var _latestRelease   = null;   // release metadata when an update is available

  function checkForUpdates() {
    if (_updateAvailable !== null) {
      return Promise.resolve({ available: _updateAvailable, release: _latestRelease });
    }

    var token = localStorage.getItem(TOKEN_KEY);
    if (!token) return Promise.resolve({ available: false, release: null });

    var headers = {
      'Authorization':        'Bearer ' + token,
      'Accept':               'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    return fetch('https://api.github.com/repos/' + TEMPLATE_REPO + '/releases/latest', { headers: headers })
      .then(function (r) {
        if (r.status === 404) return null;   // no releases published yet — not an error
        return r.ok ? r.json() : null;
      })
      .then(function (release) {
        if (!release || !release.tag_name) {
          _updateAvailable = false;
          _latestRelease   = null;
          return { available: false, release: null };
        }

        var templateTag = release.tag_name;
        var siteVersion = localStorage.getItem('site_version');

        if (!siteVersion) {
          // First connection — baseline to the current release tag so no
          // spurious "update available" fires for a freshly-installed site.
          localStorage.setItem('site_version', templateTag);
          _updateAvailable = false;
          _latestRelease   = null;
          return { available: false, release: null };
        }

        _updateAvailable = (templateTag !== siteVersion);
        _latestRelease   = _updateAvailable ? {
          tag:  release.tag_name,
          name: release.name || ('Update ' + release.tag_name),
          body: release.body || '',
          url:  release.html_url || '',
        } : null;

        return { available: _updateAvailable, release: _latestRelease };
      })
      .catch(function () {
        _updateAvailable = false;
        _latestRelease   = null;
        return { available: false, release: null };
      });
  }

  // ── Template update helpers ────────────────────────────────────────────

  // Fetch one file from the public template repo (no auth needed).
  function fetchFromTemplate(path) {
    return fetch('https://api.github.com/repos/' + TEMPLATE_REPO + '/contents/' + path)
      .then(function (r) {
        if (!r.ok) throw new Error('Template file not found: ' + path + ' (status ' + r.status + ')');
        return r.json();
      });
  }

  // Confirmation dialog — shown before any files are changed.
  // Includes an "Export Settings First" button that triggers the download
  // from settings.js, giving the user a safety copy before proceeding.
  function showUpdateDialog(onConfirm) {
    var dialog = document.createElement('div');
    dialog.className = 'sp-token-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', 'Update from Template');

    dialog.innerHTML = [
      '<div class="sp-token-dialog-inner">',
      '  <h3>Update Site from Template</h3>',
      '  <p>This replaces all site files \u2014 including <code>config.js</code> \u2014 with the latest version from the template. Your personal details will be reset to the template defaults.</p>',
      '  <p><strong>Export your settings first</strong>, then import them again after the update to restore your customizations.</p>',
      '  <p class="sp-hint">&#9888;&#65039; The export file contains all your personal data. Keep it somewhere safe before continuing.</p>',
      '  <button id="dlg-export-first" class="sp-update-export-btn">&#8595; Export My Settings First</button>',
      '  <div class="sp-token-btns">',
      '    <button id="dlg-update-cancel">Cancel</button>',
      '    <button id="dlg-update-confirm">Update Now</button>',
      '  </div>',
      '</div>',
    ].join('\n');

    document.body.appendChild(dialog);

    dialog.querySelector('#dlg-export-first').addEventListener('click', function () {
      if (window.SETTINGS && typeof window.SETTINGS.exportConfig === 'function') {
        window.SETTINGS.exportConfig();
      }
    });

    dialog.querySelector('#dlg-update-cancel').addEventListener('click', function () {
      document.body.removeChild(dialog);
      setStatus('Update cancelled.', false);
    });

    dialog.querySelector('#dlg-update-confirm').addEventListener('click', function () {
      document.body.removeChild(dialog);
      onConfirm();
    });
  }

  // Core update: use the Git Data API to create a single commit that
  // replaces all TEMPLATE_FILES at once — clean git history.
  function performUpdate(token, repo, updateBtn) {
    var apiBase = 'https://api.github.com/repos/' + repo;
    var headers = {
      'Authorization':        'Bearer ' + token,
      'Accept':               'application/vnd.github+json',
      'Content-Type':         'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    var updateStartTime = new Date();

    if (updateBtn) updateBtn.disabled = true;
    setStatus('Connecting to repository\u2026', false);

    var defaultBranch, headSha, treeSha;

    // Step 1 — get the default branch name (main vs master)
    fetch(apiBase, { headers: headers })
      .then(function (r) {
        if (r.status === 401 || r.status === 403) {
          localStorage.removeItem(TOKEN_KEY);
          throw new Error('GitHub rejected the token. Click Connect to GitHub to re-enter it.');
        }
        if (!r.ok) throw new Error('Cannot access repository (status ' + r.status + ').');
        return r.json();
      })
      .then(function (info) {
        defaultBranch = info.default_branch || 'main';
        setStatus('Reading current version\u2026', false);

        // Step 2 — get HEAD ref → commit SHA
        return fetch(apiBase + '/git/ref/heads/' + defaultBranch, { headers: headers })
          .then(function (r) { return r.json(); })
          .then(function (ref) {
            headSha = ref.object.sha;

            // Step 3 — get tree SHA from commit
            return fetch(apiBase + '/git/commits/' + headSha, { headers: headers })
              .then(function (r) { return r.json(); })
              .then(function (commit) { treeSha = commit.tree.sha; });
          });
      })
      .then(function () {
        setStatus('Downloading template files\u2026', false);

        // Step 4 — fetch each template file then create a blob in the user's repo
        var blobs = [];
        var chain = Promise.resolve();

        TEMPLATE_FILES.forEach(function (path) {
          chain = chain
            .then(function () { return fetchFromTemplate(path); })
            .then(function (templateFile) {
              // GitHub Contents API returns content as base64 with embedded newlines — strip them.
              var b64 = (templateFile.content || '').replace(/\n/g, '');
              return fetch(apiBase + '/git/blobs', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ content: b64, encoding: 'base64' }),
              });
            })
            .then(function (r) { return r.json(); })
            .then(function (blob) { blobs.push({ path: path, sha: blob.sha }); });
        });

        return chain.then(function () { return blobs; });
      })
      .then(function (blobs) {
        setStatus('Creating update commit\u2026', false);

        // Step 5 — create a new tree overlaying the updated files
        var treeItems = blobs.map(function (b) {
          return { path: b.path, mode: '100644', type: 'blob', sha: b.sha };
        });

        return fetch(apiBase + '/git/trees', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({ base_tree: treeSha, tree: treeItems }),
        })
          .then(function (r) { return r.json(); })
          .then(function (newTree) {
            // Step 6 — create commit
            return fetch(apiBase + '/git/commits', {
              method: 'POST',
              headers: headers,
              body: JSON.stringify({
                message: 'Update site files from template (' + TEMPLATE_REPO + ')',
                tree:    newTree.sha,
                parents: [headSha],
              }),
            }).then(function (r) { return r.json(); });
          });
      })
      .then(function (newCommit) {
        // Step 7 — advance the branch ref to the new commit
        return fetch(apiBase + '/git/refs/heads/' + defaultBranch, {
          method: 'PATCH',
          headers: headers,
          body: JSON.stringify({ sha: newCommit.sha }),
        });
      })
      .then(function () {
        // Store the new release tag so the update-available check correctly
        // shows "up to date" until the next release is published.
        var releaseHeaders = {
          'Authorization':        'Bearer ' + token,
          'Accept':               'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        };
        return fetch('https://api.github.com/repos/' + TEMPLATE_REPO + '/releases/latest', { headers: releaseHeaders })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (release) {
            if (release && release.tag_name) {
              localStorage.setItem('site_version', release.tag_name);
            }
            _updateAvailable = null;
            _latestRelease   = null;
          })
          .catch(function () { _updateAvailable = null; _latestRelease = null; });
      })
      .then(function () {
        waitForDeployment(token, repo, updateStartTime, updateBtn);
      })
      .catch(function (err) {
        setStatus('Update failed: ' + err.message, true);
        if (updateBtn) updateBtn.disabled = false;
      });
  }

  // ── Public update entry point ──────────────────────────────────────────
  function update() {
    var token = localStorage.getItem(TOKEN_KEY);
    var repo  = localStorage.getItem(REPO_KEY) || detectRepo();

    if (!token || !repo) {
      setStatus('Connect to GitHub first before updating from template.', true);
      return;
    }

    showUpdateDialog(function () {
      var updateBtn = document.getElementById('spUpdateBtn');
      performUpdate(token, repo, updateBtn);
    });
  }

  // ── Connect without saving — shows the token dialog, then unlocks the panel ─
  function connect() {
    showTokenSetup(function () {
      if (window.SETTINGS && typeof window.SETTINGS.refreshLock === 'function') {
        window.SETTINGS.refreshLock();
      }
    });
  }

  window.GITHUB = {
    save:            save,
    disconnect:      disconnect,
    connect:         connect,
    update:          update,
    checkForUpdates: checkForUpdates,
  };

}());
