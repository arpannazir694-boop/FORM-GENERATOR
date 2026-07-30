// ---------- Access control (per-user section permissions, USERS sheet Col C) ----------
// At login, the USERS sheet's Col C (a multi-select dropdown of section
// names: Reports, End Of Line, Edge Paint, Pre-AQL, Post AQL, Production,
// Warehouse) is saved to localStorage as `nimbus_access`. Every section
// click below is checked against this list before it's allowed to open;
// if the user isn't permitted, they see a warning instead and nothing
// opens.
function getUserAccess() {
  try {
    const parsed = JSON.parse(localStorage.getItem('nimbus_access') || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

// Normalizes labels so "Pre-AQL" (sheet) / "Pre AQL" (UI) / "pre  aql"
// all compare equal — case, hyphens, and extra spaces are ignored.
function normalizeAccessLabel(str) {
  return (str || '').toString().toLowerCase().replace(/[-\s]+/g, ' ').trim();
}

function hasAccessTo(label) {
  const target = normalizeAccessLabel(label);
  if (!target) return true; // nothing to check against
  return getUserAccess().some(a => normalizeAccessLabel(a) === target);
}

// Shown whenever a user taps a section they don't have access to.
function showAccessDenied(label) {
  showToast(`You don't have access to ${label}. Please contact your admin.`);
}

// ---------- Fab (quick menu) — toggles Line Stages <-> Store/Warehouse KPIs ----------
const syncBtn = document.getElementById('syncBtn');
const stagesGrid = document.getElementById('stagesGrid');
const kpiGrid = document.getElementById('kpiGrid');
const stagesSectionLabel = document.getElementById('stagesSectionLabel');
let showingKpis = false;
let isFoldAnimating = false;

function toggleStagesView() {
  if (!stagesGrid || !kpiGrid || isFoldAnimating) return;
  isFoldAnimating = true;

  const outgoing = showingKpis ? kpiGrid : stagesGrid;
  const incoming = showingKpis ? stagesGrid : kpiGrid;

  outgoing.classList.remove('fold-in');
  outgoing.classList.add('fold-out');

  setTimeout(() => {
    outgoing.hidden = true;
    outgoing.classList.remove('fold-out');

    incoming.hidden = false;
    incoming.classList.remove('fold-in');
    void incoming.offsetWidth; // restart animation
    incoming.classList.add('fold-in');

    isFoldAnimating = false;
  }, 220); // matches foldOut animation duration

  showingKpis = !showingKpis;
  if (stagesSectionLabel) {
    stagesSectionLabel.textContent = showingKpis ? 'Inventory Transfer' : 'Line Stages';
  }
  showToast(showingKpis ? 'Showing Production & Warehouse' : 'Showing Line Stages');
}

if (syncBtn) {
  syncBtn.addEventListener('click', () => {
    if (!hasAccessTo('Warehouse')) {
      showAccessDenied('Warehouse');
      return;
    }
    toggleStagesView();
  });
}

// ---------- My Reports ----------
const myReportsBtn = document.getElementById('myReportsBtn');
const reportsSheet = document.getElementById('reportsSheet');
const reportsOverlay = document.getElementById('reportsOverlay');
const reportsCloseBtn = document.getElementById('reportsCloseBtn');
const reportsFromDate = document.getElementById('reportsFromDate');
const reportsToDate = document.getElementById('reportsToDate');
const reportsClearFilter = document.getElementById('reportsClearFilter');
const reportsEntryCount = document.getElementById('reportsEntryCount');
const reportsTableCount = document.getElementById('reportsTableCount');
const reportsTableBody = document.getElementById('reportsTableBody');
const reportsDateNote = document.getElementById('reportsDateNote');
const exportExcelBtn = document.getElementById('exportExcelBtn');
const exportPdfBtn = document.getElementById('exportPdfBtn');
let reportEntries = [];

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

function displayReportDate(value) {
  if (!value) return '—';
  const parts = String(value).slice(0, 10).split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : value;
}

function renderReports() {
  if (!reportsTableBody) return;
  const from = reportsFromDate ? reportsFromDate.value : '';
  const to = reportsToDate ? reportsToDate.value : '';
  const visibleEntries = reportEntries.filter(entry => (!from || entry.checkDate >= from) && (!to || entry.checkDate <= to));
  if (reportsEntryCount) reportsEntryCount.textContent = visibleEntries.length;
  if (reportsTableCount) reportsTableCount.textContent = `${visibleEntries.length} ${visibleEntries.length === 1 ? 'entry' : 'entries'}`;
  if (reportsDateNote) reportsDateNote.textContent = from || to ? 'Filtered range' : 'All time';
  reportsTableBody.innerHTML = visibleEntries.length ? visibleEntries.map(entry => `<tr><td>${escapeHtml(entry.batchId)}</td><td>${escapeHtml(entry.style)}</td><td>${escapeHtml(entry.colour)}</td><td>${escapeHtml(displayReportDate(entry.checkDate))}</td><td>${escapeHtml(entry.checkedQty)}</td><td>${escapeHtml(entry.repairQty)}</td><td>${escapeHtml(entry.whQty)}</td><td>${escapeHtml(entry.availableQty)}</td></tr>`).join('') : '<tr><td colspan="8" class="reports-state">No entries found for this date range.</td></tr>';
}

function getFilteredReportEntries() {
  const from = reportsFromDate ? reportsFromDate.value : '';
  const to = reportsToDate ? reportsToDate.value : '';
  return reportEntries.filter(entry => (!from || entry.checkDate >= from) && (!to || entry.checkDate <= to));
}

function reportExportRows() {
  // getFilteredReportEntries() comes back newest-first (server reverses it
  // for the "My Reports" view), so flip it back to the original chronological
  // entry order here — the last entry made should be the last row, not the
  // first one, in exported tables (Excel/PDF).
  return getFilteredReportEntries().slice().reverse().map(entry => ({
    'Batch ID': entry.batchId || '',
    Style: entry.style || '',
    Colour: entry.colour || '',
    'Check Date': displayReportDate(entry.checkDate),
    'Checked Qty': Number(entry.checkedQty) || 0,
    'Repair Qty': Number(entry.repairQty) || 0,
    'WH Qty': Number(entry.whQty) || 0,
    'Avl. Qty': Number(entry.availableQty) || 0
  }));
}

function reportFileSuffix() {
  const from = reportsFromDate && reportsFromDate.value;
  const to = reportsToDate && reportsToDate.value;
  return from || to ? `${from || 'start'}_to_${to || 'today'}` : new Date().toISOString().slice(0, 10);
}

function exportReportsExcel() {
  const rows = reportExportRows();
  if (!rows.length) return showToast('No report entries available to export.');
  if (!window.XLSX) return showToast('Excel export is loading. Please try again.');
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [14, 16, 16, 14, 14, 13, 11, 11].map(width => ({ wch: width }));
  XLSX.utils.book_append_sheet(workbook, worksheet, 'My Reports');
  XLSX.writeFile(workbook, `My_Reports_${reportFileSuffix()}.xlsx`);
  showToast('Excel report downloaded.');
}

// Computes the KPI figures shown on the stylish PDF report banner, from
// whatever set of entries is currently in view (already date-filtered).
function computeReportKpis(entries) {
  let totalChecked = 0, totalRepair = 0, totalWh = 0;
  const uniqueBatches = new Set();
  const uniqueStyles = new Set();

  entries.forEach(entry => {
    const checked = Number(entry.checkedQty) || 0;
    const repair = Number(entry.repairQty) || 0;
    const wh = Number(entry.whQty) || 0;

    totalChecked += checked;
    totalRepair += repair;
    totalWh += wh;

    if (entry.batchId) uniqueBatches.add(entry.batchId);
    if (entry.style) uniqueStyles.add(entry.style);
  });

  return {
    // "Total Batch Checked" = count of UNIQUE batches (Batch ID) across all entries.
    totalBatchChecked: uniqueBatches.size,
    // "Total Lot Checked" = count of entries (each entry = one lot submission;
    // a batch can be checked/submitted multiple times as separate lots).
    totalLotChecked: entries.length,
    // "Total Style Checked" = count of UNIQUE styles across all entries.
    totalStyleChecked: uniqueStyles.size,
    totalChecked,
    totalRepair,
    totalWh,
    // "Total Available Qty" = for each batch, take its LAST entry (by check
    // date) and sum that entry's Available Qty across all batches — not a
    // sum of every entry's available qty.
    totalAvl: computeLastEntryAvailableQtySum(entries),
    // "Repair (%)" = total repaired qty as a percentage of total checked qty.
    repairPercent: totalChecked ? (totalRepair / totalChecked) * 100 : 0
  };
}

// For each batch, finds the LAST entry made (true submission order) and
// sums that entry's Available Qty across batches.
//
// `entries` comes in newest-first (the server reverses the whole sheet for
// display), so entries belonging to the same batch also appear in
// reverse-chronological order relative to each other. Comparing checkDate
// alone isn't reliable here since multiple entries for a batch are often
// logged on the same date — so instead we flip to chronological order and
// simply let each later occurrence overwrite the previous one per batch;
// whichever entry is processed last for a batch IS that batch's last entry.
function computeLastEntryAvailableQtySum(entries) {
  const chronological = entries.slice().reverse();
  const lastByBatch = new Map();
  chronological.forEach(entry => {
    lastByBatch.set(entry.batchId || '', entry);
  });
  let total = 0;
  lastByBatch.forEach(entry => { total += Number(entry.availableQty) || 0; });
  return total;
}

// A single KPI card's markup — column wrapper + card, sized to sit 4-per-row
// (2 rows for 8 KPIs), so each card is smaller/more compact than before.
function kpiCardHtml(label, value, suffix) {
  return `
    <div style="width:25%;box-sizing:border-box;padding:5px;">
      <div style="background:#f7f5ff;border:2px solid #b9a3ff;border-radius:12px;padding:10px 8px;box-shadow:0 2px 6px rgba(90,60,200,0.08);text-align:center;">
        <div style="font-family:'IBM Plex Sans',sans-serif;font-size:9px;color:#8b81ab;font-weight:700;text-transform:uppercase;letter-spacing:.3px;margin-bottom:5px;text-align:center;">${escapeHtml(label)}</div>
        <div style="font-family:'Space Grotesk',sans-serif;font-weight:800;font-size:18px;color:#4527a0;text-align:center;">${escapeHtml(String(value))}${suffix}</div>
      </div>
    </div>`;
}

// Formats a Date as dd/mm/yyyy, hh:mm:ss AM/PM for the PDF banner.
function formatGeneratedTimestamp(date) {
  const pad = n => String(n).padStart(2, '0');
  const dd = pad(date.getDate());
  const mm = pad(date.getMonth() + 1);
  const yyyy = date.getFullYear();
  let hours = date.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const hh = pad(hours);
  const min = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${dd}/${mm}/${yyyy}, ${hh}:${min}:${ss} ${ampm}`;
}

// Builds the off-screen banner (company letterhead + KPI cards) that gets
// snapshotted via html2canvas and dropped into the PDF as an image — this
// is what lets the report actually use Space Grotesk / IBM Plex Sans,
// since jsPDF's native text can only use its built-in PDF fonts.
function buildPdfReportBanner(kpis, rangeLabel) {
  const wrap = document.createElement('div');
  wrap.style.position = 'fixed';
  wrap.style.left = '-10000px';
  wrap.style.top = '0';
  wrap.style.width = '700px';
  wrap.style.background = '#ffffff';
  wrap.style.padding = '26px 28px 20px';
  wrap.style.boxSizing = 'border-box';
  wrap.style.fontFamily = "'IBM Plex Sans', sans-serif";

  wrap.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
      <div style="display:flex;align-items:center;">
        <img src="https://res.cloudinary.com/dnrgcigsj/image/upload/v1776343593/Screenshot_2026-03-06_181454-removebg-preview_hixdkx.png" alt="Logo" style="height:52px;width:auto;object-fit:contain;" crossorigin="anonymous" />
        <div style="margin-left:14px;">
          <div style="font-family:'Space Grotesk',sans-serif;font-weight:800;font-size:21px;color:#241a4d;line-height:1.2;">Trio Trend Exports Pvt. Ltd.</div>
          <div style="font-size:12px;color:#8b81ab;font-weight:600;margin-top:2px;">FMS Workspace &middot; End of Line Report</div>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;color:#a79ecb;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Generated</div>
        <div style="font-size:12.5px;color:#4b3f7a;font-weight:700;">${escapeHtml(formatGeneratedTimestamp(new Date()))}</div>
        <div style="font-size:11px;color:#a79ecb;font-weight:600;margin-top:4px;">${escapeHtml(rangeLabel)}</div>
      </div>
    </div>
    <div style="height:3px;border-radius:2px;background:linear-gradient(90deg,#4527a0,#7c5cf0,#c9b8ff);margin-bottom:16px;"></div>
    <div style="display:flex;flex-wrap:wrap;margin:-5px;">
      ${kpiCardHtml('Total Batch Checked', kpis.totalBatchChecked, '')}
      ${kpiCardHtml('Total Lot Checked', kpis.totalLotChecked, '')}
      ${kpiCardHtml('Total Style Checked', kpis.totalStyleChecked, '')}
      ${kpiCardHtml('Total Checked Qty', kpis.totalChecked, '')}
      ${kpiCardHtml('Total Repair Qty', kpis.totalRepair, '')}
      ${kpiCardHtml('Total Sent to WH', kpis.totalWh, '')}
      ${kpiCardHtml('Total Available Qty', kpis.totalAvl, '')}
      ${kpiCardHtml('Repair (%)', kpis.repairPercent.toFixed(1), '%')}
    </div>`;

  document.body.appendChild(wrap);
  return wrap;
}

async function exportReportsPdf() {
  const entries = getFilteredReportEntries();
  if (!entries.length) return showToast('No report entries available to export.');
  if (!window.jspdf || !window.jspdf.jsPDF) return showToast('PDF export is loading. Please try again.');
  if (!window.html2canvas) return showToast('PDF export is loading. Please try again.');

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const from = reportsFromDate && reportsFromDate.value ? displayReportDate(reportsFromDate.value) : 'All time';
  const to = reportsToDate && reportsToDate.value ? displayReportDate(reportsToDate.value) : 'Today';
  const rangeLabel = `${from} — ${to}`;

  const kpis = computeReportKpis(entries);
  const banner = buildPdfReportBanner(kpis, rangeLabel);

  // Make sure the Google Fonts have actually finished loading before we
  // snapshot the banner, otherwise it can get captured with a fallback font.
  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch (err) { /* ignore */ }
  }

  const imgWidthMm = 182; // A4 width (210mm) minus 14mm margins on each side
  let bannerHeightMm = 0;

  try {
    const canvas = await html2canvas(banner, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    bannerHeightMm = canvas.height * imgWidthMm / canvas.width;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 14, 12, imgWidthMm, bannerHeightMm);
  } catch (err) {
    // If the banner snapshot fails for any reason, fall back to plain text
    // so the export still works — just without the fancy fonts/KPI cards.
    console.error('PDF banner render failed, falling back to plain header:', err);
    pdf.setTextColor(69, 39, 160);
    pdf.setFontSize(16);
    pdf.text('Trio Trend Exports Pvt. Ltd. — End of Line Report', 14, 20);
    bannerHeightMm = 12;
  } finally {
    banner.remove();
  }

  const rows = reportExportRows();
  pdf.autoTable({
    startY: 12 + bannerHeightMm + 8,
    head: [['Batch ID', 'Style', 'Colour', 'Check Date', 'Checked Qty', 'Repair Qty', 'WH Qty', 'Avl. Qty']],
    body: rows.map(row => [row['Batch ID'], row.Style, row.Colour, row['Check Date'], row['Checked Qty'], row['Repair Qty'], row['WH Qty'], row['Avl. Qty']]),
    theme: 'grid',
    headStyles: { fillColor: [76, 39, 160], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', lineWidth: 0.3, lineColor: [60, 30, 130] },
    styles: { fontSize: 8.5, cellPadding: 2.6, halign: 'center', lineWidth: 0.3, lineColor: [120, 100, 180] },
    alternateRowStyles: { fillColor: [247, 245, 255] },
    margin: { top: 20, left: 14, right: 14, bottom: 18 },
    didDrawPage: function (data) {
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pageWidth = pdf.internal.pageSize.getWidth();
      pdf.setFontSize(8);
      pdf.setTextColor(150, 140, 190);
      pdf.text('Trio Trend Exports Pvt. Ltd. — FMS Workspace', 14, pageHeight - 8);
      pdf.text(`Page ${data.pageNumber}`, pageWidth - 24, pageHeight - 8);
    }
  });

  pdf.save(`My_Reports_${reportFileSuffix()}.pdf`);
  showToast('Stylish PDF report downloaded.');
}

async function loadMyReports() {
  if (!reportsTableBody) return;
  reportsTableBody.innerHTML = '<tr><td colspan="8" class="reports-state">Loading your entries…</td></tr>';
  try {
    const username = localStorage.getItem('nimbus_username') || '';
    const response = await fetch(`${WEB_APP_URL}?action=reports&username=${encodeURIComponent(username)}`);
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Could not load reports');
    reportEntries = Array.isArray(result.entries) ? result.entries : [];
    renderReports();
  } catch (error) {
    reportsTableBody.innerHTML = '<tr><td colspan="8" class="reports-state">Unable to load entries. Please try again.</td></tr>';
    if (reportsEntryCount) reportsEntryCount.textContent = '—';
    if (reportsTableCount) reportsTableCount.textContent = 'Unavailable';
  }
}

// Quietly re-fetches "My Reports" in the background — no loading state, no
// toast, table/filters/scroll position untouched unless the data actually
// changed. Used for the 5s auto-refresh while the sheet is open.
let myReportsRefreshInFlight = false;
async function loadMyReportsSilently() {
  if (!reportsTableBody || myReportsRefreshInFlight) return;
  myReportsRefreshInFlight = true;
  try {
    const username = localStorage.getItem('nimbus_username') || '';
    const response = await fetch(`${WEB_APP_URL}?action=reports&username=${encodeURIComponent(username)}`);
    const result = await response.json();
    if (!result.success) return;
    reportEntries = Array.isArray(result.entries) ? result.entries : [];
    renderReports();
  } catch (error) {
    // Silent by design — a background poll failing shouldn't interrupt the user.
  } finally {
    myReportsRefreshInFlight = false;
  }
}

function openReportsSheet() {
  if (!reportsSheet || !reportsOverlay) return;
  reportsSheet.classList.add('open');
  reportsSheet.setAttribute('aria-hidden', 'false');
  reportsOverlay.classList.add('open');
  loadMyReports();
}

function closeReportsSheet() {
  if (!reportsSheet || !reportsOverlay) return;
  reportsSheet.classList.remove('open');
  reportsSheet.setAttribute('aria-hidden', 'true');
  reportsOverlay.classList.remove('open');
}

if (myReportsBtn) {
  myReportsBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    openReportsSheet();
  });
  myReportsBtn.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      openReportsSheet();
    }
  });
}
if (reportsCloseBtn) reportsCloseBtn.addEventListener('click', closeReportsSheet);
if (reportsOverlay) reportsOverlay.addEventListener('click', closeReportsSheet);
if (reportsFromDate) reportsFromDate.addEventListener('change', renderReports);
if (reportsToDate) reportsToDate.addEventListener('change', renderReports);
if (reportsClearFilter) reportsClearFilter.addEventListener('click', () => {
  if (reportsFromDate) reportsFromDate.value = '';
  if (reportsToDate) reportsToDate.value = '';
  renderReports();
});
if (exportExcelBtn) exportExcelBtn.addEventListener('click', exportReportsExcel);
if (exportPdfBtn) exportPdfBtn.addEventListener('click', exportReportsPdf);

// ---------- Reports Page (bottom-nav "Reports" -> "End Of Line" sub-view) ----------
// Unlike "My Reports" (which is scoped to the logged-in user via
// ?action=reports&username=<me>), this page is the ALL-USERS view: calling
// the same endpoint with an empty username makes getUserEolReport() in
// Code.gs skip the username filter and return every entry in the
// "END OF LINE" sheet, from every user.
const reportsPage = document.getElementById('reportsPage');
const homeContent = document.getElementById('homeContent');
const heroSection = document.querySelector('.hero');
const eolRepFrom = document.getElementById('eolRepFrom');
const eolRepTo = document.getElementById('eolRepTo');
const eolRepClear = document.getElementById('eolRepClear');
const eolRepUserFilter = document.getElementById('eolRepUserFilter');
const reportKpiHeadingTag = document.querySelector('.report-kpi-heading-tag');
const eolRepTableBody = document.getElementById('eolRepTableBody');
const eolRepTableCount = document.getElementById('eolRepTableCount');
const eolRepExportExcelBtn = document.getElementById('eolRepExportExcelBtn');
const eolRepExportPdfBtn = document.getElementById('eolRepExportPdfBtn');
let eolAllReportEntries = [];
let eolAllReportsLoaded = false;

const reportsListView = document.getElementById('reportsListView');
const reportsDetailView = document.getElementById('reportsDetailView');
const eolReportCard = document.getElementById('eolReportCard');
const eolReportCardCountNum = document.getElementById('eolReportCardCountNum');
const reportsBackBtn = document.getElementById('reportsBackBtn');

// Tapping the "END OF LINE" report card opens the full KPI + table report.
function openEolReportDetail() {
  if (!hasAccessTo('End Of Line')) {
    showAccessDenied('End Of Line');
    return;
  }
  if (reportsListView) reportsListView.hidden = true;
  if (reportsDetailView) reportsDetailView.hidden = false;
  loadEolAllReports();
}

// Back button returns to the report cards list.
function closeEolReportDetail() {
  if (reportsDetailView) reportsDetailView.hidden = true;
  if (reportsListView) reportsListView.hidden = false;
}

if (eolReportCard) {
  eolReportCard.addEventListener('click', openEolReportDetail);
}
if (reportsBackBtn) {
  reportsBackBtn.addEventListener('click', closeEolReportDetail);
}

// Resets the Reports tab back to the list view (called whenever the
// bottom-nav "Reports" button is tapped) and refreshes the live entry
// count shown on the "END OF LINE" card.
function resetReportsToListView() {
  closeEolReportDetail();
  loadEolAllReports();
}

function setKpiText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function getFilteredEolAllEntries() {
  const from = eolRepFrom ? eolRepFrom.value : '';
  const to = eolRepTo ? eolRepTo.value : '';
  const user = eolRepUserFilter ? eolRepUserFilter.value : '';
  return eolAllReportEntries.filter(entry =>
    (!from || entry.checkDate >= from) &&
    (!to || entry.checkDate <= to) &&
    (!user || (entry.submittedBy || '').toLowerCase() === user.toLowerCase())
  );
}

// Rebuilds the User filter's <option> list from whatever users are present
// in the currently loaded entries. Keeps the user's current selection if it
// still exists after a refresh; otherwise falls back to "All Users".
function populateEolUserFilter() {
  if (!eolRepUserFilter) return;
  const previous = eolRepUserFilter.value;
  const users = Array.from(new Set(
    eolAllReportEntries.map(entry => (entry.submittedBy || '').trim()).filter(Boolean)
  )).sort((a, b) => a.localeCompare(b));

  eolRepUserFilter.innerHTML = '<option value="">All Users</option>' +
    users.map(user => `<option value="${escapeHtml(user)}">${escapeHtml(user)}</option>`).join('');

  eolRepUserFilter.value = users.some(u => u.toLowerCase() === previous.toLowerCase()) ? previous : '';
}

function renderEolReportPage() {
  if (!eolRepTableBody) return;
  const visibleEntries = getFilteredEolAllEntries();

  // 8 KPIs (All Users), 4-per-line — reuses the exact same figures the
  // "My Reports" PDF banner already computes, just for every user at once.
  const kpis = computeReportKpis(visibleEntries);
  setKpiText('eolRepKpiBatch', kpis.totalBatchChecked);
  setKpiText('eolRepKpiLot', kpis.totalLotChecked);
  setKpiText('eolRepKpiStyle', kpis.totalStyleChecked);
  setKpiText('eolRepKpiChecked', kpis.totalChecked);
  setKpiText('eolRepKpiRepair', kpis.totalRepair);
  setKpiText('eolRepKpiWh', kpis.totalWh);
  setKpiText('eolRepKpiAvl', kpis.totalAvl);
  setKpiText('eolRepKpiPercent', `${kpis.repairPercent.toFixed(1)}%`);

  if (eolRepTableCount) eolRepTableCount.textContent = `${visibleEntries.length} ${visibleEntries.length === 1 ? 'entry' : 'entries'}`;
  eolRepTableBody.innerHTML = visibleEntries.length
    ? visibleEntries.map(entry => `<tr><td>${escapeHtml(entry.batchId)}</td><td>${escapeHtml(entry.style)}</td><td>${escapeHtml(entry.colour)}</td><td>${escapeHtml(entry.submittedBy)}</td><td>${escapeHtml(displayReportDate(entry.checkDate))}</td><td>${escapeHtml(entry.checkedQty)}</td><td>${escapeHtml(entry.repairQty)}</td><td>${escapeHtml(entry.whQty)}</td><td>${escapeHtml(entry.availableQty)}</td></tr>`).join('')
    : '<tr><td colspan="9" class="reports-state">No entries found for this filter.</td></tr>';

  if (reportKpiHeadingTag) {
    reportKpiHeadingTag.textContent = eolRepUserFilter && eolRepUserFilter.value ? eolRepUserFilter.value : 'All Users';
  }
}

async function loadEolAllReports(force) {
  if (eolAllReportsLoaded && !force) { renderEolReportPage(); return; }
  if (!eolRepTableBody) return;
  eolRepTableBody.innerHTML = '<tr><td colspan="9" class="reports-state">Loading entries…</td></tr>';
  try {
    const response = await fetch(`${WEB_APP_URL}?action=reports&username=`);
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Could not load reports');
    eolAllReportEntries = Array.isArray(result.entries) ? result.entries : [];
    eolAllReportsLoaded = true;
    if (eolReportCardCountNum) eolReportCardCountNum.textContent = eolAllReportEntries.length;
    populateEolUserFilter();
    renderEolReportPage();
  } catch (error) {
    eolRepTableBody.innerHTML = '<tr><td colspan="9" class="reports-state">Unable to load entries. Please try again.</td></tr>';
    if (eolRepTableCount) eolRepTableCount.textContent = 'Unavailable';
    if (eolReportCardCountNum) eolReportCardCountNum.textContent = '—';
  }
}

// Quietly re-fetches the "End Of Line" all-users report in the background —
// no loading state, no toast, table/filters/dropdown selection/scroll
// position untouched unless the data actually changed. Used for the 5s
// auto-refresh while the report detail view is open.
let eolReportRefreshInFlight = false;
async function loadEolAllReportsSilently() {
  if (!eolRepTableBody || eolReportRefreshInFlight) return;
  eolReportRefreshInFlight = true;
  try {
    const response = await fetch(`${WEB_APP_URL}?action=reports&username=`);
    const result = await response.json();
    if (!result.success) return;
    eolAllReportEntries = Array.isArray(result.entries) ? result.entries : [];
    eolAllReportsLoaded = true;
    if (eolReportCardCountNum) eolReportCardCountNum.textContent = eolAllReportEntries.length;
    populateEolUserFilter();
    renderEolReportPage();
  } catch (error) {
    // Silent by design — a background poll failing shouldn't interrupt the user.
  } finally {
    eolReportRefreshInFlight = false;
  }
}

if (eolRepFrom) eolRepFrom.addEventListener('change', renderEolReportPage);
if (eolRepTo) eolRepTo.addEventListener('change', renderEolReportPage);
if (eolRepUserFilter) eolRepUserFilter.addEventListener('change', renderEolReportPage);
if (eolRepClear) eolRepClear.addEventListener('click', () => {
  if (eolRepFrom) eolRepFrom.value = '';
  if (eolRepTo) eolRepTo.value = '';
  if (eolRepUserFilter) eolRepUserFilter.value = '';
  renderEolReportPage();
});

function eolReportFileSuffix() {
  const from = eolRepFrom && eolRepFrom.value;
  const to = eolRepTo && eolRepTo.value;
  return from || to ? `${from || 'start'}_to_${to || 'today'}` : new Date().toISOString().slice(0, 10);
}

function eolReportExportRows() {
  // Newest-first from the server -> flip back to chronological order so
  // exported rows read top-to-bottom in the order entries were made.
  return getFilteredEolAllEntries().slice().reverse().map(entry => ({
    'Batch ID': entry.batchId || '',
    Style: entry.style || '',
    Colour: entry.colour || '',
    'Checked By': entry.submittedBy || '',
    'Check Date': displayReportDate(entry.checkDate),
    'Checked Qty': Number(entry.checkedQty) || 0,
    'Repair Qty': Number(entry.repairQty) || 0,
    'WH Qty': Number(entry.whQty) || 0,
    'Avl. Qty': Number(entry.availableQty) || 0
  }));
}

function exportEolReportExcel() {
  const rows = eolReportExportRows();
  if (!rows.length) return showToast('No report entries available to export.');
  if (!window.XLSX) return showToast('Excel export is loading. Please try again.');
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [14, 16, 16, 16, 14, 14, 13, 11, 11].map(width => ({ wch: width }));
  XLSX.utils.book_append_sheet(workbook, worksheet, 'End Of Line');
  XLSX.writeFile(workbook, `End_Of_Line_Report_${eolReportFileSuffix()}.xlsx`);
  showToast('Excel report downloaded.');
}

async function exportEolReportPdf() {
  const entries = getFilteredEolAllEntries();
  if (!entries.length) return showToast('No report entries available to export.');
  if (!window.jspdf || !window.jspdf.jsPDF) return showToast('PDF export is loading. Please try again.');
  if (!window.html2canvas) return showToast('PDF export is loading. Please try again.');

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const from = eolRepFrom && eolRepFrom.value ? displayReportDate(eolRepFrom.value) : 'All time';
  const to = eolRepTo && eolRepTo.value ? displayReportDate(eolRepTo.value) : 'Today';
  const rangeLabel = `${from} — ${to}`;

  const kpis = computeReportKpis(entries);
  const banner = buildPdfReportBanner(kpis, rangeLabel);

  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch (err) { /* ignore */ }
  }

  const imgWidthMm = 182;
  let bannerHeightMm = 0;

  try {
    const canvas = await html2canvas(banner, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    bannerHeightMm = canvas.height * imgWidthMm / canvas.width;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 14, 12, imgWidthMm, bannerHeightMm);
  } catch (err) {
    console.error('PDF banner render failed, falling back to plain header:', err);
    pdf.setTextColor(69, 39, 160);
    pdf.setFontSize(16);
    pdf.text('Trio Trend Exports Pvt. Ltd. — End of Line Report', 14, 20);
    bannerHeightMm = 12;
  } finally {
    banner.remove();
  }

  const rows = eolReportExportRows();
  pdf.autoTable({
    startY: 12 + bannerHeightMm + 8,
    head: [['Batch ID', 'Style', 'Colour', 'Checked By', 'Check Date', 'Checked Qty', 'Repair Qty', 'WH Qty', 'Avl. Qty']],
    body: rows.map(row => [row['Batch ID'], row.Style, row.Colour, row['Checked By'], row['Check Date'], row['Checked Qty'], row['Repair Qty'], row['WH Qty'], row['Avl. Qty']]),
    theme: 'grid',
    headStyles: { fillColor: [76, 39, 160], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5, halign: 'center', lineWidth: 0.3, lineColor: [60, 30, 130] },
    styles: { fontSize: 7, cellPadding: 2, halign: 'center', lineWidth: 0.3, lineColor: [120, 100, 180] },
    alternateRowStyles: { fillColor: [247, 245, 255] },
    margin: { top: 20, left: 14, right: 14, bottom: 18 },
    didDrawPage: function (data) {
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pageWidth = pdf.internal.pageSize.getWidth();
      pdf.setFontSize(8);
      pdf.setTextColor(150, 140, 190);
      pdf.text('Trio Trend Exports Pvt. Ltd. — FMS Workspace', 14, pageHeight - 8);
      pdf.text(`Page ${data.pageNumber}`, pageWidth - 24, pageHeight - 8);
    }
  });

  pdf.save(`End_Of_Line_Report_${eolReportFileSuffix()}.pdf`);
  showToast('Stylish PDF report downloaded.');
}

if (eolRepExportExcelBtn) eolRepExportExcelBtn.addEventListener('click', exportEolReportExcel);
if (eolRepExportPdfBtn) eolRepExportPdfBtn.addEventListener('click', exportEolReportPdf);

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
  if (!hasAccessTo(label)) {
    closeSidePanel();
    showAccessDenied(label);
    return;
  }
  if (label === 'End of Line') {
    closeSidePanel(); // Close side panel if it's open
    openEolSheet();
  } else {
    closeSidePanel();
    showToast(`Opening ${label}...`);
  }
}

// NOTE: report cards (e.g. #eolReportCard) also use the "stage-card" class
// for styling, but they open a report detail view (handled separately by
// their own listener below) rather than a stage sheet — so they're
// excluded here via [data-label], which only real stage cards have.
document.querySelectorAll('.stage-card[data-label]').forEach(btn => {
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
    const view = btn.dataset.view;
    if (view === 'reports' && !hasAccessTo('Reports')) {
      showAccessDenied('Reports');
      return; // stay on the current tab/view — don't switch active state
    }

    document.querySelectorAll('.bottom-nav button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (view === 'reports') {
      if (homeContent) homeContent.hidden = true;
      if (heroSection) heroSection.hidden = true;
      if (reportsPage) reportsPage.hidden = false;
      resetReportsToListView();
    } else {
      if (reportsPage) reportsPage.hidden = true;
      if (heroSection) heroSection.hidden = false;
      if (homeContent) homeContent.hidden = false;
    }
    showToast(view === 'reports' ? 'Opening reports' : 'Home');

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
const LOGIN_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbydC0_cPM6D2Nct5GztT6alfevNfHESwNuL4-L4ehs-u4tkQUpLjGCiFHFtEtXTlIjj/exec";
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
        localStorage.setItem('nimbus_access', JSON.stringify(match.access || []));
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
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbydC0_cPM6D2Nct5GztT6alfevNfHESwNuL4-L4ehs-u4tkQUpLjGCiFHFtEtXTlIjj/exec";
let eolDataCache = null; // Store fetched data

// ---------- Live entry count on the End of Line stage card ----------
const eolStageCountNum = document.getElementById('eolStageCountNum');

// Animates the badge number from whatever it currently shows up (or down)
// to `target`, with a little scale "bump" for extra visual feedback.
function animateEolStageCount(target) {
  if (!eolStageCountNum) return;
  const targetNum = Number(target) || 0;
  const startNum = parseInt(eolStageCountNum.textContent, 10) || 0;
  if (startNum === targetNum) return;

  eolStageCountNum.classList.add('bump');
  clearTimeout(eolStageCountNum._bumpTimer);
  eolStageCountNum._bumpTimer = setTimeout(() => eolStageCountNum.classList.remove('bump'), 260);

  const duration = 550; // ms
  const startTime = performance.now();

  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = Math.round(startNum + (targetNum - startNum) * eased);
    eolStageCountNum.textContent = current;
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      eolStageCountNum.textContent = targetNum;
    }
  }
  requestAnimationFrame(step);
}

// ---------- Today's entry count badge on the End of Line stage card ----------
const eolTodayCountNum = document.getElementById('eolTodayCountNum');
const eolTodayBar = document.getElementById('eolTodayBar');

// Simply sets the badge text and gives it a quick "bump" for feedback —
// no need for the number-ticker animation used on the bigger total badge.
function updateEolTodayCount(target) {
  if (!eolTodayCountNum) return;
  const targetNum = Number(target) || 0;
  const current = parseInt(eolTodayCountNum.textContent, 10) || 0;
  eolTodayCountNum.textContent = targetNum;

  if (current !== targetNum && eolTodayBar) {
    eolTodayBar.classList.add('bump');
    clearTimeout(eolTodayBar._bumpTimer);
    eolTodayBar._bumpTimer = setTimeout(() => eolTodayBar.classList.remove('bump'), 260);
  }
}

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
const batchCompleteWarning = document.getElementById('batchCompleteWarning');

function setBatchCompleteWarning(isComplete) {
  if (!batchCompleteWarning) return;
  batchCompleteWarning.hidden = !isComplete;

  if (isComplete) {
    batchCompleteWarning.classList.remove('pulse');
    void batchCompleteWarning.offsetWidth;
    batchCompleteWarning.classList.add('pulse');
  }
}

function getCurrentUserEolEntryCount(data) {
  const username = (localStorage.getItem('nimbus_username') || '').trim().toUpperCase();
  if (!username || !data || !data.eolEntryCountsByUser) return 0;
  return Number(data.eolEntryCountsByUser[username]) || 0;
}

function getCurrentUserEolTodayEntryCount(data) {
  const username = (localStorage.getItem('nimbus_username') || '').trim().toUpperCase();
  if (!username || !data || !data.eolTodayEntryCountsByUser) return 0;
  return Number(data.eolTodayEntryCountsByUser[username]) || 0;
}

// Fetch Data
async function fetchEolData() {
  if (eolDataCache) return eolDataCache; // Already fetched
  try {
    if (batchList) batchList.innerHTML = '<li class="dropdown-item disabled">Loading batches...</li>';
    const response = await fetch(WEB_APP_URL);
    const result = await response.json();
    if (result.success) {
      eolDataCache = result;
      eolDataCache.eolEntryCount = getCurrentUserEolEntryCount(result);
      populateBatchDropdown(result.production);
      animateEolStageCount(eolDataCache.eolEntryCount);
      updateEolTodayCount(getCurrentUserEolTodayEntryCount(result));
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

// Recomputes whether Submit should be disabled when Repair QTY exceeds
// Checked QTY.
function refreshSubmitAvailability() {
  if (!eolSubmitBtn) return;

  const availableVal = eolQty ? (parseInt(eolQty.value, 10) || 0) : 0;
  const checkedVal = eolChecked ? (parseInt(eolChecked.value, 10) || 0) : 0;
  const repairVal = eolRepair ? (parseInt(eolRepair.value, 10) || 0) : 0;
  const noAvailableQuantity = Boolean(eolBatchInput && eolBatchInput.value) && availableVal <= 0;
  const qtyInvalid = noAvailableQuantity || checkedVal > availableVal || (repairVal > checkedVal && repairVal > 0);

  const shouldDisable = qtyInvalid;
  eolSubmitBtn.disabled = shouldDisable;
  eolSubmitBtn.style.opacity = shouldDisable ? '0.5' : '1';
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
    setBatchCompleteWarning(false);
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
    if (eolQty) {
      eolQty.value = batchData.quantity || '';
      eolQty.max = batchData.quantity || '';
      eolQty.min = '0';
    }
    if (eolChecked) {
      eolChecked.max = batchData.quantity || '';
      eolChecked.min = '0';
    }
    if (eolRepair) eolRepair.min = '0';
    if (eolWh) eolWh.value = batchData.quantity || '';
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
    validateQuantities();
    showToast("Data auto-filled successfully");
  }
}

// Validation: Repair QTY <= Checked QTY
function validateQuantities() {
  if (!eolChecked || !eolRepair || !eolSubmitBtn) return;

  const availableVal = eolQty ? (parseInt(eolQty.value, 10) || 0) : 0;
  const checkedVal = parseInt(eolChecked.value, 10) || 0;
  const repairVal = parseInt(eolRepair.value, 10) || 0;
  const checkedInvalid = checkedVal > availableVal;
  const repairInvalid = repairVal > checkedVal && repairVal > 0;

  if (eolChecked) eolChecked.max = availableVal || '';
  if (eolRepair) eolRepair.max = checkedVal || '';
  if (eolWh) eolWh.value = checkedVal > 0 ? Math.max(0, checkedVal - repairVal) : availableVal;
  setBatchCompleteWarning(Boolean(eolBatchInput && eolBatchInput.value) && availableVal <= 0);

  if (checkedInvalid) {
    showToast("Warning: Checked QTY cannot exceed Available QTY!");
    eolChecked.style.boxShadow = "inset 3px 4px 9px rgba(255,0,0,0.2), inset -2px -2px 7px rgba(255,255,255,0.9), 0 0 0 2.5px rgba(255,0,0,0.5)";
  } else {
    eolChecked.style.boxShadow = "";
  }

  if (repairInvalid) {
    showToast("Warning: Repair QTY cannot exceed Checked QTY!");
    eolRepair.style.boxShadow = "inset 3px 4px 9px rgba(255,0,0,0.2), inset -2px -2px 7px rgba(255,255,255,0.9), 0 0 0 2.5px rgba(255,0,0,0.5)";
  } else {
    // Reset warning style
    eolRepair.style.boxShadow = "";
  }

  refreshSubmitAvailability();
}

if (eolChecked) eolChecked.addEventListener('input', validateQuantities);
if (eolRepair) eolRepair.addEventListener('input', validateQuantities);
if (eolQty) eolQty.addEventListener('input', validateQuantities);

// Reset validation state on reset
if (eolResetBtn) {
  eolResetBtn.addEventListener('click', () => {
    setTimeout(() => {
      validateQuantities();
      if (batchTriggerText) batchTriggerText.textContent = 'Select Batch...';
      if (eolBatchInput) eolBatchInput.value = '';
      setBatchCompleteWarning(false);
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
      reason: eolReason ? eolReason.value : '',
      submittedBy: localStorage.getItem('nimbus_username') || ''
    };

    try {
      // POST request to Web App — no 'mode: no-cors' here anymore, so we can
      // actually read back whether the server saved the row or rejected it
      // (e.g. duplicate Batch ID, sheet error, etc). Content-Type stays
      // 'text/plain' so this remains a "simple request" and doesn't trigger
      // a CORS preflight that Apps Script can't handle.
      const response = await fetch(WEB_APP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: JSON.stringify(formData)
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Could not save entry. Please try again.');
      }

      if (eolDataCache) {
        const username = (localStorage.getItem('nimbus_username') || '').trim().toUpperCase();
        eolDataCache.eolEntryCountsByUser = eolDataCache.eolEntryCountsByUser || {};
        eolDataCache.eolTodayEntryCountsByUser = eolDataCache.eolTodayEntryCountsByUser || {};
        if (username) {
          eolDataCache.eolEntryCountsByUser[username] = (Number(eolDataCache.eolEntryCountsByUser[username]) || 0) + 1;
          eolDataCache.eolTodayEntryCountsByUser[username] = (Number(eolDataCache.eolTodayEntryCountsByUser[username]) || 0) + 1;
        }
        eolDataCache.eolEntryCount = getCurrentUserEolEntryCount(eolDataCache);
        animateEolStageCount(eolDataCache.eolEntryCount);
        updateEolTodayCount(getCurrentUserEolTodayEntryCount(eolDataCache));

        // Keep the available balance current when the same Batch ID is
        // selected again without reloading the page.
        const whQuantity = Number(eolWh ? eolWh.value : 0) || 0;
        const batchData = eolDataCache.production.find(item =>
          item.batchId.toString().trim().toUpperCase() === eolBatchInput.value.toString().trim().toUpperCase()
        );
        if (batchData) {
          // batchData.quantity already reflects (batch qty - WH qty sent so
          // far), as computed by the server. Subtract just this submission's
          // WH qty from that running available balance — NOT from the full
          // original batch quantity — so repeated submissions for the same
          // batch keep shrinking correctly instead of resetting.
          const currentAvailable = Number(batchData.quantity) || 0;
          batchData.quantity = String(Math.max(0, currentAvailable - whQuantity));
        }
      }

      showToast('Data saved successfully to Google Sheets!');
      eolForm.reset();
      if (batchTriggerText) batchTriggerText.textContent = 'Select Batch...';
      if (eolBatchInput) eolBatchInput.value = '';
      setBatchCompleteWarning(false);

    } catch (error) {
      console.error('Submission Error:', error);
      showToast(error && error.message ? error.message : 'Error saving data. Please check your internet connection.');
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

// Also fetch on page load so the stage card's entry count is populated
// right away, without waiting for the user to open the End of Line sheet.
if (eolStageCountNum) {
  fetchEolData();
}

// ---------- Silent auto-refresh for the entry count badge ----------
// Every 5 seconds, quietly re-check how many entries exist in "END OF
// LINE" (e.g. someone else may have submitted one) and animate the badge
// to the new total. No toasts, no loading states, no disrupting whatever
// the user is doing in the form.
async function silentlyRefreshEolCount() {
  try {
    const response = await fetch(WEB_APP_URL);
    const result = await response.json();
    if (!result.success) return;

    // ---- Silent access-list refresh (USERS sheet Col C) ----
    // An admin can change a user's section access (Reports, End Of Line,
    // Edge Paint, etc.) at any time. This same request already returns the
    // full `users` list, so piggyback on it here to keep localStorage's
    // `nimbus_access` in sync with the sheet every 5s — access
    // granted/revoked mid-session takes effect immediately (next click),
    // with no toast, no reload, and no need to log out and back in.
    const currentUsername = (localStorage.getItem('nimbus_username') || '').trim();
    if (currentUsername && Array.isArray(result.users)) {
      const me = result.users.find(u => (u.username || '').toString().trim().toLowerCase() === currentUsername.toLowerCase());
      if (me) {
        localStorage.setItem('nimbus_access', JSON.stringify(me.access || []));
      }
    }

    const currentUserEntryCount = getCurrentUserEolEntryCount(result);
    const currentUserTodayCount = getCurrentUserEolTodayEntryCount(result);
    animateEolStageCount(currentUserEntryCount);
    updateEolTodayCount(currentUserTodayCount);

    if (eolDataCache) {
      eolDataCache.eolEntryCount = currentUserEntryCount;
      eolDataCache.eolEntryCountsByUser = result.eolEntryCountsByUser || {};
      eolDataCache.eolTodayEntryCountsByUser = result.eolTodayEntryCountsByUser || {};
      eolDataCache.production = result.production || eolDataCache.production;
    }
  } catch (error) {
    // Silent by design — don't toast/log-spam the user for a background poll.
  }
}

if (eolStageCountNum) {
  setInterval(silentlyRefreshEolCount, 5000);
}

// ---------- Silent auto-refresh for the Reports views ----------
// Every 5 seconds, quietly re-fetch whichever report table the user
// currently has open (My Reports sheet, or the End Of Line all-users
// report) and re-render it in place — no loading state, no toast, filters
// and scroll position left alone. Does nothing while neither is open, so
// it doesn't fire background requests for no reason.
setInterval(() => {
  if (reportsSheet && reportsSheet.classList.contains('open')) {
    loadMyReportsSilently();
  }
  if (reportsPage && !reportsPage.hidden && reportsDetailView && !reportsDetailView.hidden) {
    loadEolAllReportsSilently();
  }
}, 5000);
