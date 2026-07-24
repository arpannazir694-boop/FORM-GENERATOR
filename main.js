// ---------- Sync button ----------
const syncBtn = document.getElementById('syncBtn');
if (syncBtn) {
  syncBtn.addEventListener('click', () => {
    syncBtn.classList.add('spinning');
    showToast('Syncing workspace...');
    setTimeout(() => {
      syncBtn.classList.remove('spinning');
      showToast('Workspace is up to date');
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

// ---------- Line-stage cards ----------
document.querySelectorAll('.clay-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    showToast(`Opening ${btn.dataset.label}...`);
  });
});

// ---------- Bottom nav ----------
document.querySelectorAll('.bottom-nav button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.bottom-nav button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    showToast(btn.dataset.view === 'reports' ? 'Opening reports' : 'Home');
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
