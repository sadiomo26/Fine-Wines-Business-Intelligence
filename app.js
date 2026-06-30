/* Application controller */
let allRows = [];
let filteredRows = [];

const state = { files: [] };
const statusEl = document.getElementById('status');
const fileInput = document.getElementById('fileInput');
const buildBtn = document.getElementById('buildBtn');
const exportBtn = document.getElementById('exportBtn');
const dropZone = document.getElementById('dropZone');

function setStatus(msg){ statusEl.textContent = msg; }
function inferYear(file){ const n = file.name.toLowerCase(); if(n.includes('2024') || n.includes('24')) return 2024; if(n.includes('2025') || n.includes('25')) return 2025; return null; }

fileInput.addEventListener('change', e => { state.files = [...e.target.files]; setStatus(`${state.files.length} file(s) selected.`); });
['dragenter','dragover'].forEach(evt => dropZone.addEventListener(evt, e => { e.preventDefault(); dropZone.classList.add('drag'); }));
['dragleave','drop'].forEach(evt => dropZone.addEventListener(evt, e => { e.preventDefault(); dropZone.classList.remove('drag'); }));
dropZone.addEventListener('drop', e => { state.files = [...e.dataTransfer.files]; setStatus(`${state.files.length} file(s) selected.`); });

buildBtn.addEventListener('click', buildDashboard);
exportBtn.addEventListener('click', exportCsv);
document.getElementById('resetBtn').addEventListener('click', () => location.reload());
document.getElementById('demoBtn').addEventListener('click', loadDemo);
['searchInput','groupFilter','typeFilter','countryFilter','departmentFilter'].forEach(id => document.getElementById(id).addEventListener('input', applyFilters));

async function buildDashboard(){
  if(!state.files.length){ setStatus('Please choose the 2024 and 2025 overall sales files.'); return; }
  setStatus('Reading Excel files...');
  let rows2024 = [], rows2025 = [];
  for(const file of state.files){
    const year = inferYear(file);
    if(!year) continue;
    const rows = await FWExcel.readWorkbook(file);
    const parsed = FWExcel.parseRows(rows, year);
    if(year === 2024) rows2024.push(...parsed);
    if(year === 2025) rows2025.push(...parsed);
  }
  if(!rows2024.length || !rows2025.length){ setStatus('Could not find both 2024 and 2025 sales files. Make sure filenames contain 2024 and 2025.'); return; }
  allRows = FWExcel.compareProducts(rows2024, rows2025);
  FWDashboard.fillSelect('groupFilter', allRows.map(r=>r.productGroup));
  FWDashboard.fillSelect('typeFilter', allRows.map(r=>r.productType));
  FWDashboard.fillSelect('countryFilter', allRows.map(r=>r.country));
  FWDashboard.fillSelect('departmentFilter', allRows.map(r=>r.department));
  applyFilters();
  exportBtn.disabled = false;
  setStatus(`Dashboard built. ${rows2024.length} rows from 2024 and ${rows2025.length} rows from 2025 loaded.`);
}

function applyFilters(){
  const q = document.getElementById('searchInput').value.toLowerCase().trim();
  const g = document.getElementById('groupFilter').value;
  const t = document.getElementById('typeFilter').value;
  const c = document.getElementById('countryFilter').value;
  const d = document.getElementById('departmentFilter').value;
  filteredRows = allRows.filter(r => (!q || r.sku.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)) && (!g || r.productGroup===g) && (!t || r.productType===t) && (!c || r.country===c) && (!d || r.department===d));
  renderAll(filteredRows);
}

function renderAll(rows){
  FWDashboard.renderKPIs(rows);
  FWDashboard.renderBarChart('groupChart', FWExcel.groupBy(rows,'productGroup'), 'sales2025', 14);
  FWDashboard.renderBarChart('typeChart', FWExcel.groupBy(rows,'productType'), 'sales2025', 14);
  FWDashboard.renderBarChart('countryChart', FWExcel.groupBy(rows,'country'), 'sales2025', 14);
  FWDashboard.renderBarChart('departmentChart', FWExcel.groupBy(rows,'department'), 'sales2025', 14);
  FWDashboard.renderRankList('winnersList', rows, 'winners');
  FWDashboard.renderRankList('declinersList', rows, 'decliners');
  FWDashboard.renderTable(rows);
}

function exportCsv(){
  const headers = ['SKU','Description','Product Group','Product Type','Country','Department','2024 Sales','2025 Sales','Growth','Growth %','2024 Qty','2025 Qty','Qty Growth','2025 Profit','2025 GP%','2025 Cases'];
  const lines = [headers.join(',')].concat(filteredRows.map(r => [r.sku,r.description,r.productGroup,r.productType,r.country,r.department,r.sales2024,r.sales2025,r.salesGrowth,r.salesGrowthPct,r.qty2024,r.qty2025,r.qtyGrowth,r.profit2025,r.gpPct2025,r.cases2025].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')));
  const blob = new Blob([lines.join('\n')], {type:'text/csv'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'fine-wines-bi-summary.csv'; a.click(); URL.revokeObjectURL(a.href);
}

function loadDemo(){
  allRows = [
    {sku:'1001',description:'Demo Red Wine',productGroup:'Wine',productType:'Red Wine',country:'France',department:'Wines',sales2024:15000,sales2025:21000,salesGrowth:6000,salesGrowthPct:40,qty2024:720,qty2025:930,qtyGrowth:210,profit2025:7800,gpPct2025:37.1,cases2025:78},
    {sku:'2001',description:'Demo Irish Whiskey',productGroup:'Spirits',productType:'Whiskey',country:'Ireland',department:'Spirits',sales2024:24000,sales2025:28000,salesGrowth:4000,salesGrowthPct:16.7,qty2024:400,qty2025:470,qtyGrowth:70,profit2025:10100,gpPct2025:36.1,cases2025:39},
    {sku:'3001',description:'Demo Gift Hamper',productGroup:'Hampers',productType:'Gift Hamper',country:'Ireland',department:'Gifts',sales2024:12000,sales2025:9000,salesGrowth:-3000,salesGrowthPct:-25,qty2024:220,qty2025:160,qtyGrowth:-60,profit2025:4300,gpPct2025:47.8,cases2025:20}
  ];
  FWDashboard.fillSelect('groupFilter', allRows.map(r=>r.productGroup)); FWDashboard.fillSelect('typeFilter', allRows.map(r=>r.productType)); FWDashboard.fillSelect('countryFilter', allRows.map(r=>r.country)); FWDashboard.fillSelect('departmentFilter', allRows.map(r=>r.department));
  applyFilters(); exportBtn.disabled=false; setStatus('Sample dashboard loaded.');
}
