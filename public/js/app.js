// ─── State ───────────────────────────────────────────────────────────────────
const state = {
  token: localStorage.getItem('tl_token'),
  user: null,
  currentScreen: 'auth',
  capturedFile: null,
  lastResult: null,
};

// ─── DOM helpers ─────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const showLoading = (text = 'Analysing label…') => {
  $('loading-text').textContent = text;
  $('loading-overlay').classList.remove('hidden');
};
const hideLoading = () => $('loading-overlay').classList.add('hidden');

let toastTimer;
function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

// ─── Router ──────────────────────────────────────────────────────────────────
function navigate(screen) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(`screen-${screen}`).classList.add('active');
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.toggle('active', t.dataset.screen === screen));
  state.currentScreen = screen;

  if (screen === 'profile') loadScanHistory();
  if (screen !== 'snap') stopCamera();
}

// ─── Auth ────────────────────────────────────────────────────────────────────
async function checkAuth() {
  // Pull token from URL hash (after Google OAuth redirect)
  const hash = window.location.hash;
  if (hash.startsWith('#token=')) {
    const token = hash.slice(7);
    localStorage.setItem('tl_token', token);
    state.token = token;
    window.history.replaceState(null, '', '/');
  }

  if (!state.token) return showAuthScreen();

  try {
    const res = await apiFetch('/api/auth/me');
    if (!res.ok) throw new Error('invalid');
    state.user = await res.json();
    showApp();
  } catch {
    localStorage.removeItem('tl_token');
    state.token = null;
    showAuthScreen();
  }
}

function showAuthScreen() {
  $('bottom-nav').style.display = 'none';
  navigate('auth');
}

function showApp() {
  $('bottom-nav').style.display = 'flex';
  navigate('home');
  renderProfile();
}

function signOut() {
  localStorage.removeItem('tl_token');
  state.token = null;
  state.user = null;
  stopCamera();
  showAuthScreen();
}

// ─── API fetch wrapper ────────────────────────────────────────────────────────
function apiFetch(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (state.token && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
  return fetch(url, { ...options, headers });
}

// ─── Camera ──────────────────────────────────────────────────────────────────
let cameraStream = null;

async function startCamera() {
  const video = $('snap-video');
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
    });
    video.srcObject = cameraStream;
    video.style.display = 'block';
    $('snap-preview').style.display = 'none';
    $('snap-hint').textContent = 'Point camera at label and tap to capture';
    $('snap-capture-btn').disabled = false;
    $('snap-delete-btn').classList.add('hidden');
    $('snap-analyze-btn').disabled = true;
    state.capturedFile = null;
  } catch {
    showToast('Camera access denied. Use the gallery button to upload an image.');
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
}

function capturePhoto() {
  const video = $('snap-video');
  const canvas = $('snap-canvas');
  canvas.width  = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);

  canvas.toBlob(blob => {
    state.capturedFile = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
    showPreview(URL.createObjectURL(blob));
  }, 'image/jpeg', 0.92);

  stopCamera();
}

function showPreview(url) {
  const preview = $('snap-preview');
  preview.src = url;
  preview.style.display = 'block';
  $('snap-video').style.display = 'none';
  $('snap-hint').textContent = '';
  $('snap-delete-btn').classList.remove('hidden');
  $('snap-analyze-btn').disabled = false;
}

function resetSnap() {
  state.capturedFile = null;
  $('snap-preview').style.display = 'none';
  $('snap-preview').src = '';
  $('snap-analyze-btn').disabled = true;
  $('snap-delete-btn').classList.add('hidden');
  startCamera();
}

// ─── Analysis ────────────────────────────────────────────────────────────────
async function analyzeLabel() {
  if (!state.capturedFile) return;
  showLoading('Analysing label…');

  try {
    const formData = new FormData();
    formData.append('image', state.capturedFile);

    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { Authorization: `Bearer ${state.token}` },
      body: formData,
    });

    const data = await res.json();
    hideLoading();

    if (!data.success) {
      showToast(data.error || 'Could not analyse the label. Please try again.');
      return;
    }

    state.lastResult = data;
    renderResults(data);
    navigate('results');
  } catch {
    hideLoading();
    showToast('Something went wrong. Check your connection and try again.');
  }
}

// ─── Results rendering ────────────────────────────────────────────────────────
function ratingClass(rating) {
  return { Bad: 'bad', OK: 'ok', Good: 'good', Great: 'great' }[rating] ?? 'ok';
}
function classLabel(cls) {
  return cls === 'Unclassified' ? 'Unclassified' : `Class ${cls}`;
}
function classBadgeClass(cls) {
  const map = { A: 'class-a', B: 'class-b', C: 'class-c', D: 'class-d', E: 'class-e' };
  return map[cls] ?? 'class-u';
}
function scoreColor(score) {
  if (score >= 80) return 'var(--color-great)';
  if (score >= 60) return 'var(--color-good)';
  if (score >= 40) return 'var(--color-ok)';
  return 'var(--color-bad)';
}

function renderResults(data) {
  const circumference = 2 * Math.PI * 34; // r=34
  const offset = circumference * (1 - data.score / 100);
  const color = scoreColor(data.score);
  const rc = ratingClass(data.rating);

  let html = `
    <!-- Score section -->
    <div class="score-section">
      <h2 class="section-title" style="font-size:20px">Sustainability Score</h2>
      <div class="score-ring-row">
        <div class="score-ring">
          <svg viewBox="0 0 80 80">
            <circle class="score-ring__track" cx="40" cy="40" r="34"/>
            <circle class="score-ring__fill" cx="40" cy="40" r="34"
              stroke="${color}"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${offset}"/>
          </svg>
          <div class="score-ring__icon">
            <svg fill="none" stroke="${color}" stroke-width="2" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M8 12l2.5 2.5L16 9"/></svg>
          </div>
        </div>
        <div class="score-info">
          <div class="score-number" style="color:${color}">${data.score}<span>/100</span></div>
          <span class="badge badge--${rc}">${data.rating}</span>
          <p class="score-description">${data.ratingDescription}</p>
        </div>
      </div>
    </div>`;

  if (data.confidence === 'low') {
    html += `<div class="confidence-warning">⚠️ Low confidence — the label may be partially obscured. Results could be inaccurate.</div>`;
  }

  // Garment type hint
  if (data.garmentType) {
    html += `
    <div class="garment-hint">
      <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/></svg>
      Feels similar to <strong>${data.garmentType}</strong>
    </div>`;
  }

  // Material Analysis section
  html += `<div><h2 class="section-title" style="font-size:20px">Material Analysis</h2>`;

  // Composition grid
  html += `<div class="material-grid">`;
  for (const m of data.materials) {
    html += `<div class="material-pill"><p class="material-pill__name">${m.name}</p><p class="material-pill__pct">Composition: ${m.percentage}%</p></div>`;
  }
  html += `</div>`;

  // Expandable cards
  for (const m of data.materials) {
    html += `
    <div class="material-card">
      <div class="material-card__header" onclick="this.parentElement.classList.toggle('open')">
        <span class="material-card__name">${m.name}</span>
        <div class="material-card__right">
          <span class="badge badge--${classBadgeClass(m.class)}">${classLabel(m.class)}*</span>
          <svg class="material-card__chevron" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
        </div>
      </div>
      <div class="material-card__body">${m.description}</div>
    </div>`;
  }

  html += `<p class="made-by-credit" style="margin-top:8px">*Made-by Environmental Benchmark for Fibres</p></div>`;

  $('results-content').innerHTML = html;
}

// ─── Profile & scan history ───────────────────────────────────────────────────
function renderProfile() {
  if (!state.user) return;
  const { name, email, avatar } = state.user;
  $('profile-name').textContent = name;
  $('profile-email').textContent = email;
  const avatarEl = $('profile-avatar');
  if (avatar) {
    avatarEl.innerHTML = `<img src="${avatar}" alt="${name}" />`;
  } else {
    avatarEl.textContent = name[0].toUpperCase();
  }
}

async function loadScanHistory() {
  const list = $('scan-history-list');
  list.innerHTML = '<p class="empty-state">Loading…</p>';
  try {
    const res = await apiFetch('/api/scans');
    const scans = await res.json();
    if (!scans.length) {
      list.innerHTML = '<p class="empty-state">No scans yet. Start by analysing a label!</p>';
      return;
    }
    list.innerHTML = scans.map(s => {
      const color = scoreColor(s.score);
      const date = new Date(s.created_at).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' });
      const label = s.garment_type ?? (JSON.parse(s.materials)[0]?.name ?? 'Scan');
      return `
        <div class="scan-history-item" style="margin-bottom:8px">
          <div class="scan-history-item__info">
            <p class="scan-history-item__garment">${label}</p>
            <p class="scan-history-item__date">${date}</p>
          </div>
          <span class="scan-history-item__score" style="color:${color}">${s.score}</span>
          <span class="badge badge--${ratingClass(s.rating)}">${s.rating}</span>
        </div>`;
    }).join('');
  } catch {
    list.innerHTML = '<p class="empty-state">Could not load history.</p>';
  }
}

// ─── Event wiring ─────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const screen = tab.dataset.screen;
    if (screen === 'snap') {
      navigate('snap');
      startCamera();
    } else {
      navigate(screen);
    }
  });
});

$('home-snap-btn').addEventListener('click', () => { navigate('snap'); startCamera(); });
$('home-profile-btn').addEventListener('click', () => navigate('profile'));

$('snap-close-btn').addEventListener('click', () => { resetSnap(); navigate('home'); });
$('snap-capture-btn').addEventListener('click', capturePhoto);
$('snap-delete-btn').addEventListener('click', resetSnap);
$('snap-analyze-btn').addEventListener('click', analyzeLabel);

$('snap-gallery-btn').addEventListener('click', () => $('snap-file-input').click());
$('snap-file-input').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  state.capturedFile = file;
  stopCamera();
  showPreview(URL.createObjectURL(file));
  e.target.value = '';
});

$('results-back-btn').addEventListener('click', () => { resetSnap(); navigate('snap'); startCamera(); });
$('profile-signout-btn').addEventListener('click', signOut);

// ─── Preview mode (skip login) ────────────────────────────────────────────────
$('preview-btn').addEventListener('click', () => {
  state.user = { id: 0, name: 'Preview User', email: 'preview@threadlightly.com', avatar: null };
  state.token = 'preview';
  showApp();
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
checkAuth();
