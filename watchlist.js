/* watchlist.js — Fora prototype watchlist engine.
   Prototype: state persists in localStorage; "changes" come from the
   WATCHLIST_UPDATES fixture. In production, state is a per-user API record and
   updates come from real signal stores — the markup contract is identical. */
(function () {
  'use strict';

  var STORE_KEY = 'fora.watchlist.v1';

  /* ---- state store ---- */
  function getFollows() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveFollows(list) {
    localStorage.setItem(STORE_KEY, JSON.stringify(list));
  }
  function isFollowed(project, signal) {
    return getFollows().some(function (f) {
      return f.project === project && f.signal === signal;
    });
  }
  function toggleFollow(record) {
    var list = getFollows();
    var i = -1, j;
    for (j = 0; j < list.length; j++) {
      if (list[j].project === record.project && list[j].signal === record.signal) { i = j; break; }
    }
    if (i >= 0) { list.splice(i, 1); } else { list.push(record); }
    saveFollows(list);
    return i < 0;
  }

  /* ---- disclosure gate (the co-pilot rule) ----
     Good/neutral changes disclose immediately; a "down" (bad) change is held
     until a paired explanation note exists. */
  function shouldDisclose(update) {
    if (!update) { return false; }
    if (update.direction !== 'down') { return true; }
    return typeof update.note === 'string' && update.note.replace(/\s/g, '').length > 0;
  }

  /* ---- change-feed fixture (prototype only). Key: "<project>/<signal>".
     No entry = "no visible change". */
  var WATCHLIST_UPDATES = {
    'PR-KFT-0142/assurance-status':
      { direction: 'flat', summary: 'Assurance: Verified — unchanged', note: '' },
    'PR-KFT-0142/credits-by-vintage':
      { direction: 'up', summary: 'New 2025 vintage issued (+38,400 tCO₂e)', note: '' },
    'PR-KFT-0142/grievances':
      { direction: 'down', summary: 'Open grievances rose 1 → 3',
        note: 'Two new land-access cases logged, both within the response window. Mediation scheduled; no impact on carbon or consent status.' },
    'PR-KFT-0142/fire-disturbance':
      { direction: 'down', summary: 'New satellite hotspot alert (1 open)', note: '' }
  };
  function getUpdate(project, signal) {
    return WATCHLIST_UPDATES[project + '/' + signal] || null;
  }

  /* ---- label helper ---- */
  function labelFor(titleEl) {
    var clone = titleEl.cloneNode(true);
    var hint = clone.querySelector('.hint'); if (hint) { hint.parentNode.removeChild(hint); }
    var btn = clone.querySelector('.follow-btn'); if (btn) { btn.parentNode.removeChild(btn); }
    return clone.textContent.replace(/\s+/g, ' ').trim();
  }

  /* ---- button factory ---- */
  function bookmarkSvg(filled) {
    return '<svg class="follow-ico" viewBox="0 0 24 24" fill="' + (filled ? 'currentColor' : 'none') +
           '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
           '<path d="M6 3h12v18l-6-4-6 4V3z"/></svg>';
  }
  function labelText(followed) { return followed ? 'On watchlist' : 'Add to watchlist'; }
  function buttonInner(followed) {
    return bookmarkSvg(followed) + '<span class="follow-text">' + labelText(followed) + '</span>';
  }
  function makeButton(followed) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'follow-btn';
    b.setAttribute('aria-pressed', followed ? 'true' : 'false');
    b.innerHTML = buttonInner(followed);
    return b;
  }
  function paintButton(b, followed) {
    b.setAttribute('aria-pressed', followed ? 'true' : 'false');
    b.innerHTML = buttonInner(followed);
  }
  function pageFile() {
    var p = location.pathname.split('/').pop();
    return p || 'index.html';
  }

  /* ---- inject section-level buttons ---- */
  function injectSectionButtons() {
    var sections = document.querySelectorAll('[data-follow]');
    Array.prototype.forEach.call(sections, function (sec) {
      var signal = sec.getAttribute('data-follow');
      var scope = sec.closest('[data-project]'); if (!scope) { return; }
      var project = scope.getAttribute('data-project');
      var projectName = scope.getAttribute('data-project-name') || project;
      var title = sec.querySelector('.section-title');
      if (!title || title.querySelector('.follow-btn')) { return; }
      if (!sec.id) { sec.id = 'follow-' + signal; }
      title.classList.add('section-title--followable');
      var label = labelFor(title);
      var btn = makeButton(isFollowed(project, signal));
      btn.addEventListener('click', function () {
        var now = toggleFollow({
          signal: signal, project: project, projectName: projectName,
          label: label, href: pageFile() + '#' + sec.id
        });
        paintButton(btn, now);
      });
      title.appendChild(btn);
    });
  }

  /* ---- inject project-level (header) buttons ---- */
  function injectHeaderButtons() {
    var rows = document.querySelectorAll('[data-follow-project]');
    Array.prototype.forEach.call(rows, function (row) {
      var signal = row.getAttribute('data-follow-project');
      var scope = row.closest('[data-project]'); if (!scope) { return; }
      var project = scope.getAttribute('data-project');
      var projectName = scope.getAttribute('data-project-name') || project;
      var label = row.getAttribute('data-follow-label') || signal;
      if (row.querySelector('.follow-btn')) { return; }
      var btn = makeButton(isFollowed(project, signal));
      btn.className += ' follow-btn--chip';
      btn.addEventListener('click', function () {
        var now = toggleFollow({
          signal: signal, project: project, projectName: projectName,
          label: label, href: pageFile()
        });
        paintButton(btn, now);
      });
      row.appendChild(btn);
    });
  }

  window.Watchlist = {
    STORE_KEY: STORE_KEY,
    getFollows: getFollows, saveFollows: saveFollows,
    isFollowed: isFollowed, toggleFollow: toggleFollow,
    shouldDisclose: shouldDisclose, getUpdate: getUpdate
  };

  if (!window.WATCHLIST_NO_AUTORUN) {
    document.addEventListener('DOMContentLoaded', function () {
      injectSectionButtons();
      injectHeaderButtons();
    });
  }
})();
