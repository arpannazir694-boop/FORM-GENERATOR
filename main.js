// ---------- Fab (quick menu) ----------
const syncBtn = document.getElementById('syncBtn');
if (syncBtn) {
  syncBtn.addEventListener('click', () => showToast('Quick menu coming soon'));
}

// ---------- Notification bell ----------
const bellBtn = document.getElementById('bellBtn');
if (bellBtn) {
  bellBtn.addEventListener('click', () => showToast('No new notifications'));
}

// ---------- Hamburger menu (side panel) ----------
const menuBtn = document.getElementById('menuBtn');
const sidePanel = document.getElementById('sidePanel');
const sideOverlay = document.getElementById('sideOverlay');
const sideCloseBtn = document.getElementById('sideCloseBtn');

function openSidePanel() {
  if (!sidePanel || !sideOverlay) return;
  sidePanel.classList.add('open');
  sideOverlay.classList.add('open');
}
function closeSidePanel() {
  if (!sidePanel || !sideOverlay) return;
  sidePanel.classList.remove('open');
  sideOverlay.classList.remove('open');
}

if (menuBtn) menuBtn.addEventListener('click', openSidePanel);
if (sideCloseBtn) sideCloseBtn.addEventListener('click', closeSidePanel);
if (sideOverlay) sideOverlay.addEventListener('click', closeSidePanel);

document.querySelectorAll('.side-item').forEach(btn => {
  btn.addEventListener('click', () => {
    showToast(`Opening ${btn.dataset.label}...`);
    closeSidePanel();
  });
});

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
document.querySelectorAll('.stage-card').forEach(btn => {
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

    const icon = btn.querySelector('.nav-icon');
    if (icon) {
      icon.classList.remove('pop');
      void icon.offsetWidth; // restart animation
      icon.classList.add('pop');
    }
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

// ---------- Login form (login.html) ----------
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
