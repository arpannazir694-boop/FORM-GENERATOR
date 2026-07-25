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

// ---------- Line-stage cards & Sidebar Items (End of Line logic) ----------
const eolSheet = document.getElementById('eolSheet');
const eolOverlay = document.getElementById('eolOverlay');
const eolCloseBtn = document.getElementById('eolCloseBtn');
const eolForm = document.getElementById('eolForm');

function openEolSheet() {
  if (eolSheet && eolOverlay) {
    eolSheet.classList.add('open');
    eolOverlay.classList.add('open');
  }
}

function closeEolSheet() {
  if (eolSheet && eolOverlay) {
    eolSheet.classList.remove('open');
    eolOverlay.classList.remove('open');
  }
}

if (eolCloseBtn) eolCloseBtn.addEventListener('click', closeEolSheet);
if (eolOverlay) eolOverlay.addEventListener('click', closeEolSheet);

// NOTE: the actual eolForm 'submit' handler (the one that collects the
// auto-filled values and POSTs them to Google Sheets) is registered further
// down, in the "END OF LINE - AUTO-FILL & VALIDATION LOGIC" section. A
// duplicate placeholder listener used to live here too — it fired first,
// showed a fake "Form submitted successfully!" toast, and called
// eolForm.reset(), wiping out the auto-filled field values before the real
// handler could read and save them. It has been removed.

function handleStageClick(btn) {
  const label = btn.dataset.label;
  if (label === 'End of Line') {
    closeSidePanel(); // Close side panel if it's open
    openEolSheet();
  } else {
    closeSidePanel();
    showToast(`Opening ${label}...`);
  }
}

document.querySelectorAll('.stage-card').forEach(btn => {
  btn.addEventListener('click', () => handleStageClick(btn));
});

document.querySelectorAll('.side-item').forEach(btn => {
  btn.addEventListener('click', () => handleStageClick(btn));
});

// ---------- Avatar button = direct logout ----------
const avatarBtn = document.getElementById('avatarBtn');
if (avatarBtn) {
  avatarBtn.addEventListener('click', () => {
    localStorage.removeItem('nimbus_logged_in');
    localStorage.removeItem('nimbus_username');
    showToast('Logged out');
    setTimeout(() => { window.location.href = 'login.html'; }, 500);
  });
}

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

// ---------- Password show/hide toggle (login.html) ----------
const pwToggle = document.getElementById('pwToggle');
const pwInput = document.getElementById('password');
if (pwToggle && pwInput) {
  pwToggle.addEventListener('click', () => {
    const isVisible = pwInput.type === 'text';
    pwInput.type = isVisible ? 'password' : 'text';
    pwToggle.classList.toggle('is-visible', !isVisible);
    pwToggle.setAttribute('aria-pressed', String(!isVisible));
    pwToggle.setAttribute('aria-label', isVisible ? 'Show password' : 'Hide password');
  });
}

// ---------- Login form (login.html) ----------
// Uses the same web app URL / USERS sheet (Col A = username, Col B =
// password, starting row 2) as the rest of the app.
const LOGIN_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwrt8gRJvzEYANRPk3VR5bMH6BuKHWl6_N9fDbauFiYnWIaj-IKKsp9Q_MtP9-RdW8/exec";
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorMsg = document.getElementById('errorMsg');
    const submitBtn = loginForm.querySelector('.primary-btn');

    errorMsg.classList.remove('show');

    if (!username || !password) {
      errorMsg.textContent = 'Please fill in both fields.';
      errorMsg.classList.add('show');
      return;
    }

    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Signing in...';
    submitBtn.disabled = true;

    try {
      const response = await fetch(LOGIN_WEB_APP_URL);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Could not verify login.');
      }

      const users = result.users || [];
      const match = users.find(u =>
        u.username.toLowerCase() === username.toLowerCase() && u.password === password
      );

      if (match) {
        localStorage.setItem('nimbus_logged_in', 'true');
        localStorage.setItem('nimbus_username', match.username);
        window.location.href = 'index.html';
      } else {
        errorMsg.textContent = 'Invalid username or password.';
        errorMsg.classList.add('show');
      }
    } catch (error) {
      console.error('Login error:', error);
      errorMsg.textContent = 'Could not connect. Please check your internet connection.';
      errorMsg.classList.add('show');
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
}

// ==========================================
// END OF LINE - AUTO-FILL & VALIDATION LOGIC
// ==========================================
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwrt8gRJvzEYANRPk3VR5bMH6BuKHWl6_N9fDbauFiYnWIaj-IKKsp9Q_MtP9-RdW8/exec";
let eolDataCache = null; // Store fetched data

// Elements
const eolBatchInput = document.getElementById('eol_batch'); // Hidden input
const batchDropdown = document.getElementById('batchDropdown');
const batchTrigger = document.getElementById('batchTrigger');
const batchTriggerText = document.getElementById('batchTriggerText');
const batchSearch = document.getElementById('batchSearch');
const batchList = document.getElementById('batchList');

const eolStyle = document.getElementById('eol_style');
const eolColour = document.getElementById('eol_colour');
const eolPo = document.getElementById('eol_po');
const eolSku = document.getElementById('eol_sku');
const eolQty = document.getElementById('eol_qty');
const eolFloor = document.getElementById('eol_floor');
const eolUnit = document.getElementById('eol_unit');
const eolFabricator = document.getElementById('eol_fabricator');
const eolQcName = document.getElementById('eol_qcname');
const eolEtd = document.getElementById('eol_etd');
const eolCheckDate = document.getElementById('eol_checkdate');

// ---------- DD/MM/YYYY display for date fields ----------
// <input type="date">'s value is always ISO (YYYY-MM-DD) no matter what;
// only its on-screen text follows the device/browser locale (often
// MM/DD/YYYY on mobile). These helpers keep a same-looking overlay label
// that always reads DD/MM/YYYY, in sync with the real input.
function formatDDMMYYYY(isoStr) {
  if (!isoStr) return '';
  const m = isoStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '';
  const [, y, mo, d] = m;
  return `${d}/${mo}/${y}`;
}

function syncDateDisplay(inputEl, displayEl) {
  if (!inputEl || !displayEl) return;
  const formatted = formatDDMMYYYY(inputEl.value);
  if (formatted) {
    displayEl.textContent = formatted;
    displayEl.classList.add('has-value');
  } else {
    displayEl.textContent = 'DD/MM/YYYY';
    displayEl.classList.remove('has-value');
  }
}

const eolEtdDisplay = document.getElementById('eol_etd_display');
const eolCheckDateDisplay = document.getElementById('eol_checkdate_display');

[[eolEtd, eolEtdDisplay], [eolCheckDate, eolCheckDateDisplay]].forEach(([input, display]) => {
  if (!input || !display) return;
  syncDateDisplay(input, display);
  input.addEventListener('input', () => syncDateDisplay(input, display));
  input.addEventListener('change', () => syncDateDisplay(input, display));
});

if (eolForm) {
  // Native form.reset() clears input values without firing 'input'/'change'
  // on them, so the overlay labels need their own refresh here.
  eolForm.addEventListener('reset', () => {
    setTimeout(() => {
      syncDateDisplay(eolEtd, eolEtdDisplay);
      syncDateDisplay(eolCheckDate, eolCheckDateDisplay);
    }, 0);
  });
}

const eolChecked = document.getElementById('eol_checked');
const eolRepair = document.getElementById('eol_repair');
const eolWh = document.getElementById('eol_wh');
const eolReason = document.getElementById('eol_reason');

const eolSubmitBtn = document.querySelector('.form-btn-submit');
const eolResetBtn = document.getElementById('eolResetBtn');

// Fetch Data
async function fetchEolData() {
  if (eolDataCache) return eolDataCache; // Already fetched
  try {
    if (batchList) batchList.innerHTML = '<li class="dropdown-item disabled">Loading batches...</li>';
    const response = await fetch(WEB_APP_URL);
    const result = await response.json();
    if (result.success) {
      eolDataCache = result;
      populateBatchDropdown(result.production);
      return result;
    } else {
      throw new Error(result.error || 'Failed to fetch data');
    }
  } catch (error) {
    console.error("Error fetching EOL data:", error);
    if (batchList) batchList.innerHTML = '<li class="dropdown-item disabled">Error loading data</li>';
    showToast("Error loading Batch data.");
  }
}

// Populate Custom Dropdown
function populateBatchDropdown(productionList) {
  if (!batchList) return;
  batchList.innerHTML = '';
  const addedBatches = new Set();

  productionList.forEach(item => {
    if (item.batchId && !addedBatches.has(item.batchId)) {
      addedBatches.add(item.batchId);
      const li = document.createElement('li');
      li.className = 'dropdown-item';
      li.textContent = item.batchId;
      li.dataset.value = item.batchId;
      li.addEventListener('click', () => selectBatch(item.batchId));
      batchList.appendChild(li);
    }
  });
}

// Dropdown UI Logic
if (batchTrigger) {
  batchTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    batchDropdown.classList.toggle('open');
    if (batchDropdown.classList.contains('open') && batchSearch) {
      batchSearch.focus();
    }
  });
}

// Close dropdown on outside click
document.addEventListener('click', (e) => {
  if (batchDropdown && !batchDropdown.contains(e.target)) {
    batchDropdown.classList.remove('open');
  }
});

// Dropdown Search
if (batchSearch && batchList) {
  batchSearch.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const items = batchList.querySelectorAll('.dropdown-item:not(.disabled)');
    items.forEach(item => {
      const text = item.textContent.toLowerCase();
      item.style.display = text.includes(term) ? 'block' : 'none';
    });
  });
}

// Handle Batch Selection
function selectBatch(batchId) {
  if (!batchDropdown) return;
  batchDropdown.classList.remove('open');
  batchTriggerText.textContent = batchId || 'Select Batch...';
  if (eolBatchInput) eolBatchInput.value = batchId;

  if (!batchId || !eolDataCache) {
    // Clear auto-filled fields if no batch selected
    if (eolForm) eolForm.reset();
    batchTriggerText.textContent = 'Select Batch...';
    validateQuantities();
    return;
  }

  // Find the batch data
  const batchData = eolDataCache.production.find(item => item.batchId === batchId);
  if (batchData) {
    if (eolStyle) eolStyle.value = batchData.style || '';
    if (eolColour) eolColour.value = batchData.colour || '';
    if (eolPo) eolPo.value = batchData.po || '';
    if (eolSku) eolSku.value = batchData.sku || '';
    if (eolQty) eolQty.value = batchData.quantity || '';
    if (eolUnit) eolUnit.value = batchData.unit || '';
    if (eolFabricator) eolFabricator.value = batchData.fabricator || '';
    if (eolEtd) eolEtd.value = batchData.etd || '';
    syncDateDisplay(eolEtd, eolEtdDisplay);

    // Match QC Name based on Unit
    if (eolQcName && batchData.unit && eolDataCache.qcMapping) {
      eolQcName.value = eolDataCache.qcMapping[batchData.unit] || '';
    } else if (eolQcName) {
      eolQcName.value = '';
    }
    showToast("Data auto-filled successfully");
  }
}

// Validation: Repair QTY <= Checked QTY
function validateQuantities() {
  if (!eolChecked || !eolRepair || !eolSubmitBtn) return;

  const checkedVal = parseInt(eolChecked.value, 10) || 0;
  const repairVal = parseInt(eolRepair.value, 10) || 0;

  if (repairVal > checkedVal && repairVal > 0) {
    showToast("Warning: Repair QTY cannot exceed Checked QTY!");
    eolRepair.style.boxShadow = "inset 3px 4px 9px rgba(255,0,0,0.2), inset -2px -2px 7px rgba(255,255,255,0.9), 0 0 0 2.5px rgba(255,0,0,0.5)";
    eolSubmitBtn.disabled = true;
    eolSubmitBtn.style.opacity = '0.5';
  } else {
    // Reset warning style
    eolRepair.style.boxShadow = "";
    eolSubmitBtn.disabled = false;
    eolSubmitBtn.style.opacity = '1';
  }
}

if (eolChecked) eolChecked.addEventListener('input', validateQuantities);
if (eolRepair) eolRepair.addEventListener('input', validateQuantities);

// Reset validation state on reset
if (eolResetBtn) {
  eolResetBtn.addEventListener('click', () => {
    setTimeout(() => {
      validateQuantities();
      if (batchTriggerText) batchTriggerText.textContent = 'Select Batch...';
      if (eolBatchInput) eolBatchInput.value = '';
      if (batchSearch) batchSearch.value = '';
      // Reset search filter
      if (batchList) {
        batchList.querySelectorAll('.dropdown-item').forEach(item => item.style.display = 'block');
      }
    }, 50); // wait for form to reset
  });
}

// Handle Form Submission
if (eolForm) {
  eolForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (eolSubmitBtn.disabled) return;

    // Validate Batch ID
    if (!eolBatchInput || !eolBatchInput.value) {
      showToast('Please select a Batch ID first.');
      return;
    }

    const originalText = eolSubmitBtn.innerHTML;
    eolSubmitBtn.innerHTML = 'Saving...';
    eolSubmitBtn.disabled = true;

    const formData = {
      batchId: eolBatchInput.value,
      style: eolStyle ? eolStyle.value : '',
      colour: eolColour ? eolColour.value : '',
      po: eolPo ? eolPo.value : '',
      sku: eolSku ? eolSku.value : '',
      quantity: eolQty ? eolQty.value : '',
      floor: eolFloor ? eolFloor.value : '',
      unit: eolUnit ? eolUnit.value : '',
      fabricator: eolFabricator ? eolFabricator.value : '',
      qcName: eolQcName ? eolQcName.value : '',
      etd: eolEtd ? eolEtd.value : '',
      checkDate: eolCheckDate ? eolCheckDate.value : '',
      checkedQty: eolChecked ? eolChecked.value : '',
      repairQty: eolRepair ? eolRepair.value : '',
      whQty: eolWh ? eolWh.value : '',
      reason: eolReason ? eolReason.value : ''
    };

    try {
      // POST request to Web App using no-cors to prevent browser block
      await fetch(WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: JSON.stringify(formData)
      });

      // With no-cors, we can't read the response, so we assume success if no network error thrown.
      showToast('Data saved successfully to Google Sheets!');
      eolForm.reset();
      if (batchTriggerText) batchTriggerText.textContent = 'Select Batch...';
      if (eolBatchInput) eolBatchInput.value = '';
      setTimeout(() => closeEolSheet(), 1500);

    } catch (error) {
      console.error('Submission Error:', error);
      showToast('Error saving data. Please check your internet connection.');
    } finally {
      eolSubmitBtn.innerHTML = originalText;
      eolSubmitBtn.disabled = false;
    }
  });
}

// Hook fetching to opening the EOL sheet
const originalOpenEolSheet = openEolSheet;
openEolSheet = function () {
  originalOpenEolSheet();
  fetchEolData(); // fetch if not cached
};
