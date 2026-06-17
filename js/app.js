'use strict';

const STORAGE_KEY = 'inventario_pda_expedicion_github_pages_v5';
const INITIAL_CODES = [
  ...Array.from({ length: 80 }, (_, i) => `CA${String(i + 1).padStart(3, '0')}`),
  ...Array.from({ length: 80 }, (_, i) => `EX${String(i + 1).padStart(3, '0')}`),
];

const STATE = {
  selectedCode: null,
  view: 'todas',
  sortKey: 'codigo',
  sortDirection: 'asc',
  data: [],
};

const DOM = {};

function init() {
  cacheDom();
  loadInventory();
  bindEvents();
  if (!STATE.selectedCode && STATE.data.length) STATE.selectedCode = STATE.data[0].codigo;
  renderAll();
  fillEditorFromSelected();
}

function cacheDom() {
  DOM.tableBody = document.getElementById('pdaTableBody');
  DOM.emptyState = document.getElementById('emptyState');
  DOM.resultCount = document.getElementById('resultCount');
  DOM.searchInput = document.getElementById('searchInput');
  DOM.filterEstado = document.getElementById('filterEstado');
  DOM.filterAccion = document.getElementById('filterAccion');
  DOM.tabs = [...document.querySelectorAll('.tab')];
  DOM.sortHeaders = [...document.querySelectorAll('[data-sort]')];

  DOM.statTotal = document.getElementById('statTotal');
  DOM.statOperativas = document.getElementById('statOperativas');
  DOM.statIncidencias = document.getElementById('statIncidencias');
  DOM.statReparacion = document.getElementById('statReparacion');
  DOM.statNoLocalizadas = document.getElementById('statNoLocalizadas');

  DOM.selectedTitle = document.getElementById('selectedTitle');
  DOM.selectedStatus = document.getElementById('selectedStatus');
  DOM.codigo = document.getElementById('codigo');
  DOM.seccion = document.getElementById('seccion');
  DOM.estado = document.getElementById('estado');
  DOM.accion = document.getElementById('accion');
  DOM.fecha = document.getElementById('fecha');
  DOM.revisadoPor = document.getElementById('revisadoPor');
  DOM.observaciones = document.getElementById('observaciones');
  DOM.incidenceChecks = [...document.querySelectorAll('.incidence-box input[type="checkbox"]')];

  DOM.btnExportExcel = document.getElementById('btnExportExcel');
  DOM.btnPrint = document.getElementById('btnPrint');
  DOM.btnReset = document.getElementById('btnReset');
  DOM.btnClearFilters = document.getElementById('btnClearFilters');
  DOM.btnSave = document.getElementById('btnSave');
  DOM.btnMarkOk = document.getElementById('btnMarkOk');
  DOM.btnClearIncidences = document.getElementById('btnClearIncidences');
}

function bindEvents() {
  DOM.searchInput.addEventListener('input', renderAll);
  DOM.filterEstado.addEventListener('change', renderAll);
  DOM.filterAccion.addEventListener('change', renderAll);

  DOM.tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      STATE.view = tab.dataset.view;
      DOM.tabs.forEach((item) => item.classList.toggle('is-active', item === tab));
      renderAll();
    });
  });

  DOM.sortHeaders.forEach((header) => {
    header.addEventListener('click', () => {
      const key = header.dataset.sort;
      if (STATE.sortKey === key) {
        STATE.sortDirection = STATE.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        STATE.sortKey = key;
        STATE.sortDirection = 'asc';
      }
      renderAll();
    });
  });

  DOM.btnClearFilters.addEventListener('click', clearFilters);
  DOM.btnExportExcel.addEventListener('click', exportExcel);
  DOM.btnPrint.addEventListener('click', () => window.print());
  DOM.btnReset.addEventListener('click', resetInventory);
  DOM.btnSave.addEventListener('click', saveSelectedFromEditor);
  DOM.btnMarkOk.addEventListener('click', markSelectedAsOperative);
  DOM.btnClearIncidences.addEventListener('click', clearSelectedIncidences);

  [DOM.estado, DOM.accion, DOM.fecha, DOM.revisadoPor, DOM.observaciones, ...DOM.incidenceChecks].forEach((el) => {
    el.addEventListener('change', saveSelectedFromEditor);
  });
  DOM.observaciones.addEventListener('blur', saveSelectedFromEditor);
  DOM.revisadoPor.addEventListener('blur', saveSelectedFromEditor);
}

function createPda(codigo) {
  return {
    codigo,
    seccion: 'Expedición',
    estado: 'Operativa',
    incidencias: [],
    accion: 'Ninguna',
    fecha: '',
    revisadoPor: '',
    observaciones: '',
  };
}

function initialInventory() {
  return INITIAL_CODES.map(createPda);
}

function loadInventory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    STATE.data = Array.isArray(parsed) && parsed.length ? normalizeInventory(parsed) : initialInventory();
  } catch (error) {
    STATE.data = initialInventory();
  }
  persistInventory();
}

function normalizeInventory(savedData) {
  const byCode = new Map(savedData.map((item) => [item.codigo, item]));
  return INITIAL_CODES.map((codigo) => ({ ...createPda(codigo), ...(byCode.get(codigo) || {}) }));
}

function persistInventory() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE.data));
}

function getSelectedPda() {
  return STATE.data.find((item) => item.codigo === STATE.selectedCode) || null;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function getFilteredData() {
  const search = DOM.searchInput.value.trim().toUpperCase();
  const estado = DOM.filterEstado.value;
  const accion = DOM.filterAccion.value;

  return STATE.data
    .filter((item) => {
      if (search && !item.codigo.includes(search)) return false;
      if (estado && item.estado !== estado) return false;
      if (accion && item.accion !== accion) return false;
      if (STATE.view === 'incidencias' && !item.incidencias.length) return false;
      if (STATE.view === 'reparar' && !isForRepair(item)) return false;
      if (STATE.view === 'nolocalizadas' && item.estado !== 'No localizada') return false;
      return true;
    })
    .sort(sortInventory);
}

function sortInventory(a, b) {
  const direction = STATE.sortDirection === 'asc' ? 1 : -1;
  const av = String(a[STATE.sortKey] || '').toUpperCase();
  const bv = String(b[STATE.sortKey] || '').toUpperCase();
  return av.localeCompare(bv, 'es', { numeric: true }) * direction;
}

function isForRepair(item) {
  return item.accion === 'Reparar' || item.estado === 'En reparación' || item.estado === 'No operativa';
}

function renderAll() {
  renderStats();
  renderTable();
}

function renderStats() {
  DOM.statTotal.textContent = STATE.data.length;
  DOM.statOperativas.textContent = STATE.data.filter((item) => item.estado === 'Operativa' && !item.incidencias.length).length;
  DOM.statIncidencias.textContent = STATE.data.filter((item) => item.incidencias.length > 0 || item.estado === 'Operativa con incidencias').length;
  DOM.statReparacion.textContent = STATE.data.filter(isForRepair).length;
  DOM.statNoLocalizadas.textContent = STATE.data.filter((item) => item.estado === 'No localizada').length;
}

function renderTable() {
  const rows = getFilteredData();
  DOM.tableBody.innerHTML = '';
  DOM.emptyState.classList.toggle('hidden', rows.length > 0);
  DOM.resultCount.textContent = `Mostrando ${rows.length} terminal${rows.length === 1 ? '' : 'es'}`;

  const fragment = document.createDocumentFragment();
  rows.forEach((item) => {
    const tr = document.createElement('tr');
    tr.className = item.codigo === STATE.selectedCode ? 'is-selected' : '';
    tr.innerHTML = `
      <td class="code-cell">${escapeHtml(item.codigo)}</td>
      <td><span class="badge ${statusClass(item.estado)}">${escapeHtml(item.estado)}</span></td>
      <td>${item.incidencias.length ? escapeHtml(item.incidencias.join(', ')) : '<span class="muted-text">Sin incidencias</span>'}</td>
      <td>${escapeHtml(item.accion)}</td>
      <td>${item.fecha ? escapeHtml(item.fecha) : '<span class="muted-text">Pendiente</span>'}</td>
      <td>${item.revisadoPor ? escapeHtml(item.revisadoPor) : '<span class="muted-text">-</span>'}</td>
    `;
    tr.addEventListener('click', () => selectPda(item.codigo));
    fragment.appendChild(tr);
  });
  DOM.tableBody.appendChild(fragment);
}

function selectPda(codigo) {
  STATE.selectedCode = codigo;
  fillEditorFromSelected();
  renderTable();
}

function fillEditorFromSelected() {
  const item = getSelectedPda();
  if (!item) return;

  DOM.selectedTitle.textContent = item.codigo;
  DOM.selectedStatus.textContent = item.estado;
  DOM.selectedStatus.className = `status-pill ${statusClass(item.estado)}`;
  DOM.codigo.value = item.codigo;
  DOM.seccion.value = item.seccion;
  DOM.estado.value = item.estado;
  DOM.accion.value = item.accion;
  DOM.fecha.value = item.fecha || '';
  DOM.revisadoPor.value = item.revisadoPor || '';
  DOM.observaciones.value = item.observaciones || '';
  DOM.incidenceChecks.forEach((checkbox) => {
    checkbox.checked = item.incidencias.includes(checkbox.value);
  });
}

function saveSelectedFromEditor() {
  const item = getSelectedPda();
  if (!item) return;

  item.estado = DOM.estado.value;
  item.accion = DOM.accion.value;
  item.fecha = DOM.fecha.value || todayIso();
  item.revisadoPor = DOM.revisadoPor.value.trim();
  item.observaciones = DOM.observaciones.value.trim();
  item.incidencias = DOM.incidenceChecks.filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.value);

  if (item.incidencias.length && item.estado === 'Operativa') item.estado = 'Operativa con incidencias';
  if (!item.incidencias.length && item.estado === 'Operativa con incidencias') item.estado = 'Operativa';

  persistInventory();
  fillEditorFromSelected();
  renderAll();
}

function markSelectedAsOperative() {
  const item = getSelectedPda();
  if (!item) return alert('Selecciona una PDA del listado.');

  item.estado = 'Operativa';
  item.accion = 'Ninguna';
  item.incidencias = [];
  item.fecha = todayIso();
  persistInventory();
  fillEditorFromSelected();
  renderAll();
}

function clearSelectedIncidences() {
  const item = getSelectedPda();
  if (!item) return alert('Selecciona una PDA del listado.');

  item.incidencias = [];
  if (item.estado === 'Operativa con incidencias') item.estado = 'Operativa';
  if (item.accion === 'Reparar') item.accion = 'Revisar';
  item.fecha = todayIso();
  persistInventory();
  fillEditorFromSelected();
  renderAll();
}

function clearFilters() {
  DOM.searchInput.value = '';
  DOM.filterEstado.value = '';
  DOM.filterAccion.value = '';
  STATE.view = 'todas';
  DOM.tabs.forEach((tab) => tab.classList.toggle('is-active', tab.dataset.view === 'todas'));
  renderAll();
}

function resetInventory() {
  const confirmed = confirm('Se restaurará el inventario inicial CA001-CA080 y EX001-EX080. Se borrarán los cambios guardados en este navegador.');
  if (!confirmed) return;

  STATE.data = initialInventory();
  STATE.selectedCode = STATE.data[0].codigo;
  persistInventory();
  clearFilters();
  fillEditorFromSelected();
}

function exportExcel() {
  const rows = getFilteredData();
  const table = [
    ['Código PDA', 'Sección', 'Estado operativo', 'Incidencias detectadas', 'Acción requerida', 'Fecha última revisión', 'Revisado por', 'Observaciones'],
    ...rows.map((item) => [
      item.codigo,
      item.seccion,
      item.estado,
      item.incidencias.join(', '),
      item.accion,
      item.fecha,
      item.revisadoPor,
      item.observaciones,
    ]),
  ];

  const html = `<table>${table.map((row, index) => `<tr>${row.map((cell) => index === 0 ? `<th>${escapeHtml(cell)}</th>` : `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</table>`;
  const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Inventario_PDA_Expedicion_${todayIso()}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function statusClass(status) {
  if (status === 'Operativa') return 'ok';
  if (status === 'Operativa con incidencias') return 'warn';
  if (status === 'No localizada') return 'muted';
  return 'bad';
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[char]));
}

document.addEventListener('DOMContentLoaded', init);
