// ---------- Demo file data ----------
const files = [
  { name: 'Assets',      ext: 'folder', type: 'folder', color: 'var(--orange)' },
  { name: 'Stuff',       ext: 'folder', type: 'folder', color: 'var(--orange)' },
  { name: 'Mountain',    ext: '.jpeg',  type: 'image',  color: 'var(--blue)' },
  { name: 'Record',      ext: '.mp3',   type: 'audio',  color: 'var(--pink)' },
  { name: 'Results',     ext: '.xls',   type: 'sheet',  color: 'var(--green)' },
  { name: 'Project',     ext: '.docx',  type: 'doc',    color: 'var(--accent-1)' },
  { name: 'Archive',     ext: '.zip',   type: 'zip',    color: 'var(--blue)' },
  { name: 'Illustration',ext: '.eps',   type: 'design', color: 'var(--orange)' },
  { name: 'Artwork',     ext: '.psd',   type: 'design', color: 'var(--pink)' },
];

const icons = {
  folder: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" fill="#fff" fill-opacity="0.95"/></svg>',
  image:  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" stroke="#fff" stroke-width="1.6"/><circle cx="9" cy="10" r="1.6" fill="#fff"/><path d="M4 17l5-5 4 4 3-3 4 4" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>',
  audio:  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 15v-4M8 17v-8M12 18v-11M16 16v-6M20 13v-2" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>',
  sheet:  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="2" stroke="#fff" stroke-width="1.6"/><path d="M4 9h16M9 9v12" stroke="#fff" stroke-width="1.4"/></svg>',
  doc:    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="2" stroke="#fff" stroke-width="1.6"/><path d="M8 8h8M8 12h8M8 16h5" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/></svg>',
  zip:    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="5" y="3" width="14" height="18" rx="2" stroke="#fff" stroke-width="1.6"/><path d="M12 3v18" stroke="#fff" stroke-width="1.4" stroke-dasharray="2 2"/></svg>',
  design: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="#fff" stroke-width="1.6"/><path d="M12 4v16M4 12h16" stroke="#fff" stroke-width="1.2" stroke-opacity="0.6"/></svg>',
};

const grid = document.getElementById('fileGrid');
const emptyState = document.getElementById('emptyState');

function renderFiles(list) {
  if (!grid) return;
  grid.innerHTML = '';
  emptyState.classList.toggle('show', list.length === 0);
  list.forEach(f => {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.innerHTML = `
      <div class="file-icon" style="background:${f.color}">${icons[f.type]}</div>
      <div class="file-meta">
        <div class="file-name">${f.name}</div>
        <div class="file-ext">${f.ext}</div>
      </div>`;
    item.addEventListener('click', () => showToast(`Opening "${f.name}"...`));
    grid.appendChild(item);
  });
}

renderFiles(files);

// storage summary
const folderCount = files.filter(f => f.type === 'folder').length;
const fileCountLabel = document.getElementById('fileCountLabel');
if (fileCountLabel) fileCountLabel.textContent = `${files.length - folderCount} files, ${folderCount} folders`;

const freeLabel = document.getElementById('freeLabel');
if (freeLabel) freeLabel.textContent = '60 GB free of 128 GB';

const storageFill = document.getElementById('storageFill');
if (storageFill) {
  requestAnimationFrame(() => { storageFill.style.width = '53%'; });
}

// ---------- Search ----------
const searchInput = document.getElementById('searchInput');
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    renderFiles(files.filter(f => f.name.toLowerCase().includes(q)));
  });
}

// ---------- Grid / list toggle ----------
const gridBtn = document.getElementById('gridBtn');
const listBtn = document.getElementById('listBtn');
if (gridBtn && listBtn) {
  gridBtn.addEventListener('click', () => {
    grid.classList.remove('list-view');
    gridBtn.classList.add('active');
    listBtn.classList.remove('active');
  });
  listBtn.addEventListener('click', () => {
    grid.classList.add('list-view');
    listBtn.classList.add('active');
    gridBtn.classList.remove('active');
  });
}

// ---------- Sync button ----------
const syncBtn = document.getElementById('syncBtn');
if (syncBtn) {
  syncBtn.addEventListener('click', () => {
    syncBtn.classList.add('spinning');
    showToast('Syncing your files...');
    setTimeout(() => {
      syncBtn.classList.remove('spinning');
      showToast('All files are up to date');
    }, 900);
  });
}

// ---------- Avatar menu ----------
const avatarBtn = document.getElementById('avatarBtn');
const menuPanel = document.getElementById('menuPanel');
if (avatarBtn && menuPanel) {
  avatarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    menuPanel.classList.toggle('open');
  });
  document.addEventListener('click', () => menuPanel.classList.remove('open'));
}

const profileBtn = document.getElementById('profileBtn');
if (profileBtn) profileBtn.addEventListener('click', () => showToast('Profile settings coming soon'));

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('nimbus_logged_in');
    showToast('Logged out (demo)');
  });
}

// ---------- Clay line-menu drawer ----------
const menuBtn = document.getElementById('menuBtn');
const clayOverlay = document.getElementById('clayOverlay');
if (menuBtn && clayOverlay) {
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    clayOverlay.classList.add('open');
  });
  clayOverlay.addEventListener('click', (e) => {
    if (e.target === clayOverlay) clayOverlay.classList.remove('open');
  });
}
document.querySelectorAll('.clay-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    showToast(`Opening ${btn.dataset.label}...`);
    clayOverlay.classList.remove('open');
  });
});

// ---------- Bottom nav ----------
document.querySelectorAll('.bottom-nav button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.bottom-nav button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    showToast(btn.dataset.view === 'recent' ? 'Showing recent activity' : 'Home');
  });
});

// ---------- Toast ----------
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

// ---------- Login form ----------
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorMsg = document.getElementById('errorMsg');

    if (!email || !password) {
      errorMsg.textContent = 'Please fill in both fields.';
      errorMsg.classList.add('show');
      return;
    }
    errorMsg.classList.remove('show');
    showToast('Sign in (demo) — not linked yet');
  });
}