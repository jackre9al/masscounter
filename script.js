// Sticky header + date auto-close + number pad Done => auto Add
const STORAGE_KEY = 'milkLoggerEntries_v7';

const gramsInput = document.getElementById('grams');
const addBtn = document.getElementById('addBtn');
const exportBtn = document.getElementById('exportBtn');
const clearBtn = document.getElementById('clearBtn');
const tzInfo = document.getElementById('tzInfo');

const toggleCustom = document.getElementById('toggleCustom');
const customPanel = document.getElementById('customPanel');
const dateInput = document.getElementById('dateInput');
const hh = document.getElementById('hh');
const mm = document.getElementById('mm');
const ss = document.getElementById('ss');
const resetNow = document.getElementById('resetNow');

const emptyState = document.getElementById('emptyState');
const last7Days = document.getElementById('last7Days');
const daysContainer = document.getElementById('daysContainer');

const lastWeekBlock = document.getElementById('lastWeekBlock');
const lastWeekTitle = document.getElementById('lastWeekTitle');
const lastWeekTotal = document.getElementById('lastWeekTotal');

const grandTotalBlock = document.getElementById('grandTotalBlock');
const grandTotal = document.getElementById('grandTotal');

const sheet = document.getElementById('actionSheet');
const sheetEdit = document.getElementById('sheetEdit');
const sheetDelete = document.getElementById('sheetDelete');
const sheetCancel = document.getElementById('sheetCancel');
let sheetTargetId = null;
let editingId = null;

function supportsHover(){
  return window.matchMedia && window.matchMedia('(hover: hover)').matches;
}

function fmtDT(d){
  return new Intl.DateTimeFormat(undefined, {
    year:'numeric', month:'short', day:'numeric',
    hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false
  }).format(d);
}
function fmtDate(d){
  return new Intl.DateTimeFormat(undefined, {weekday:'short', year:'numeric', month:'short', day:'numeric'}).format(d);
}
function fmtRange(start, end){
  const df = new Intl.DateTimeFormat(undefined, {month:'short', day:'numeric', year:'numeric'});
  return df.format(start) + ' – ' + df.format(end);
}
function parseTS(entry){
  if (entry.tsISO) return new Date(entry.tsISO);
  const d = new Date(entry.ts);
  if (!isNaN(d)) return d;
  return new Date();
}
function toLocalDateKey(d){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function loadEntries(){
  try{ const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : []; }
  catch(e){ console.error(e); return []; }
}
function saveEntries(arr){ localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); }

function ensureIds(arr){
  let changed = false;
  arr.forEach(e=>{
    if(!e.id){
      e.id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      changed = true;
    }
  });
  if (changed) saveEntries(arr);
  return arr;
}

// Build Date from segmented inputs; if all blank -> null
function buildCustomDateOrNull(){
  const dVal = dateInput.value;
  const hour = hh.value.trim();
  const min = mm.value.trim();
  const sec = ss.value.trim();
  if (!dVal && !hour && !min && !sec) return null;
  const base = new Date();
  const [y, m, day] = dVal ? dVal.split('-') : [String(base.getFullYear()), String(base.getMonth()+1).padStart(2,'0'), String(base.getDate()).padStart(2,'0')];
  const H = Math.max(0, Math.min(23, parseInt(hour||'0', 10)));
  const M = Math.max(0, Math.min(59, parseInt(min||'0', 10)));
  const S = Math.max(0, Math.min(59, parseInt(sec||'0', 10)));
  return new Date(Number(y), Number(m)-1, Number(day), H, M, S, 0);
}

function render(){
  closeSheet(true);
  const entriesRaw = ensureIds(loadEntries());

  if (entriesRaw.length === 0){
    emptyState.hidden = false;
    last7Days.hidden = true;
    lastWeekBlock.hidden = true;
    grandTotalBlock.hidden = true;
    return;
  }
  emptyState.hidden = true;

  const today = new Date();
  const last7Keys = [];
  for (let i=0;i<7;i++){
    const d = new Date(today);
    d.setDate(d.getDate()-i);
    last7Keys.push(toLocalDateKey(d));
  }

  const curr = new Date(today);
  const day = (curr.getDay()+6)%7;
  const mondayThisWeek = new Date(curr);
  mondayThisWeek.setDate(curr.getDate()-day);
  mondayThisWeek.setHours(0,0,0,0);
  const lastWeekStart = new Date(mondayThisWeek);
  lastWeekStart.setDate(mondayThisWeek.getDate()-7);
  const lastWeekEnd = new Date(mondayThisWeek);
  lastWeekEnd.setDate(mondayThisWeek.getDate()-1);
  lastWeekEnd.setHours(23,59,59,999);

  const byDate = new Map();
  let totalAll = 0;
  let totalLastWeek = 0;

  entriesRaw.forEach(e=>{
    const d = parseTS(e);
    const g = Number(e.grams)||0;
    totalAll += g;
    const key = toLocalDateKey(d);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key).push({id:e.id, date:d, grams:g});
    if (d >= lastWeekStart && d <= lastWeekEnd && !last7Keys.includes(key)){
      totalLastWeek += g;
    }
  });

  daysContainer.innerHTML = '';
  let anyDayShown = false;
  last7Keys.forEach(key=>{
    const items = (byDate.get(key)||[]).sort((a,b)=>a.date-b.date);
    if (items.length===0) return;
    anyDayShown = true;
    const [Y,M,D] = key.split('-');
    const dObj = new Date(Number(Y), Number(M)-1, Number(D));
    const card = document.createElement('div'); card.className = 'day-card';

    let dayTotal = 0;
    const rows = items.map(it=>{
      dayTotal += it.grams;
      const timeFmt = new Intl.DateTimeFormat(undefined, {hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false}).format(it.date);
      const hoverUI = supportsHover() ? `<div class="row-actions">
          <button class="icon-btn trash" data-action="delete" data-id="${it.id}" title="Delete">🗑</button>
          <button class="icon-btn" data-action="edit" data-id="${it.id}" title="Edit">✎</button>
        </div>` : '';
      return `<tr class="row" data-id="${it.id}"><td>${timeFmt}</td><td>${it.grams}</td>${hoverUI ? `<td style="position:relative;">${hoverUI}</td>` : ''}</tr>`;
    }).join('');

    const tableHead = `<thead><tr><th>Time</th><th>Grams</th>${supportsHover() ? `<th style="width:60px"></th>`:''}</tr></thead>`;
    card.innerHTML = `
      <div class="day-head">
        <div class="day-title">${fmtDate(dObj)}</div>
        <div class="day-total">${dayTotal} g</div>
      </div>
      <table class="table">
        ${tableHead}
        <tbody>${rows}</tbody>
        <tfoot><tr><td>Total</td><td>${dayTotal} g</td>${supportsHover()?'<td></td>':''}</tr></tfoot>
      </table>
    `;
    daysContainer.appendChild(card);
  });
  last7Days.hidden = !anyDayShown;

  if (supportsHover()){
    daysContainer.querySelectorAll('.icon-btn').forEach(btn=>{
      const id = btn.getAttribute('data-id');
      const act = btn.getAttribute('data-action');
      btn.addEventListener('click', (e)=>{
        e.stopPropagation();
        if (act==='delete') onDelete(id);
        if (act==='edit') onStartEdit(id);
      });
    });
  } else {
    daysContainer.querySelectorAll('.row').forEach(row=>{
      row.addEventListener('click', ()=>{
        sheetTargetId = row.getAttribute('data-id');
        openSheet();
      });
    });
  }

  lastWeekTitle.textContent = `Last Week (${fmtRange(lastWeekStart, lastWeekEnd)})`;
  lastWeekTotal.textContent = `${totalLastWeek} g`;
  lastWeekBlock.hidden = (totalLastWeek===0);

  grandTotal.textContent = `${totalAll} g`;
  grandTotalBlock.hidden = false;
}

function openSheet(){ if (!sheetTargetId) return; sheet.hidden = false; }
function closeSheet(){ sheet.hidden = true; sheetTargetId = null; }
sheetCancel.addEventListener('click', closeSheet);
sheet.addEventListener('click', (e)=>{ if(e.target===sheet) closeSheet(); });
sheetDelete.addEventListener('click', ()=>{ if(sheetTargetId){ onDelete(sheetTargetId); } closeSheet(); });
sheetEdit.addEventListener('click', ()=>{ if(sheetTargetId){ onStartEdit(sheetTargetId); } closeSheet(); });

function onDelete(id){
  const arr = loadEntries();
  const idx = arr.findIndex(e=>e.id===id);
  if (idx>-1){
    if(confirm('Delete this entry?')){
      arr.splice(idx,1);
      saveEntries(arr);
      render();
    }
  }
}

function onStartEdit(id){
  const arr = loadEntries();
  const item = arr.find(e=>e.id===id);
  if (!item) return;
  editingId = id;
  gramsInput.value = Number(item.grams)||0;

  const d = parseTS(item);
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  const h = String(d.getHours()).padStart(2,'0');
  const mi = String(d.getMinutes()).padStart(2,'0');
  const s = String(d.getSeconds()).padStart(2,'0');

  customPanel.hidden = false;
  toggleCustom.textContent = 'Auto time';
  dateInput.value = `${y}-${m}-${day}`;
  hh.value = h; mm.value = mi; ss.value = s;

  addBtn.textContent = 'Save';
  gramsInput.focus();
}

function finishEdit(newGrams, when){
  const arr = loadEntries();
  const idx = arr.findIndex(e=>e.id===editingId);
  if (idx>-1){
    arr[idx].grams = newGrams;
    arr[idx].tsISO = when.toISOString();
    arr[idx].ts = fmtDT(when);
    saveEntries(arr);
  }
  editingId = null;
  addBtn.textContent = 'Add';
  render();
}

function addEntry(newGrams){
  const custom = buildCustomDateOrNull();
  const when = custom || new Date();
  const arr = loadEntries();
  const entry = {
    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    ts: fmtDT(when),
    tsISO: when.toISOString(),
    grams: Number(newGrams)
  };
  arr.push(entry);
  saveEntries(arr);
  render();
}

// Toggle: 'Custom time' <-> 'Auto time'
toggleCustom.addEventListener('click', ()=>{
  const open = customPanel.hidden === false;
  if (open){
    customPanel.hidden = true;
    toggleCustom.textContent = 'Custom time';
    dateInput.value = ''; hh.value=''; mm.value=''; ss.value='';
  } else {
    customPanel.hidden = false;
    toggleCustom.textContent = 'Auto time';
  }
});
resetNow.addEventListener('click', ()=>{ dateInput.value=''; hh.value=''; mm.value=''; ss.value=''; });

// Auto-add on iOS "Done" (change) and Enter
function tryAddFromField(){
  const val = gramsInput.value.trim();
  if(!val || isNaN(val) || Number(val)<0) return;
  const custom = buildCustomDateOrNull();
  const when = custom || new Date();
  if (editingId){
    finishEdit(Number(val), when);
  } else {
    addEntry(Number(val));
  }
  gramsInput.value = '';
  gramsInput.focus();
}
addBtn.addEventListener('click', tryAddFromField);
gramsInput.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); tryAddFromField(); }});
gramsInput.addEventListener('change', tryAddFromField);

// Segmented time auto-advance + clamp
function onlyDigits(str){ return str.replace(/\D/g,''); }
function handleSegInput(curr, next, max){
  curr.value = onlyDigits(curr.value).slice(0,2);
  if (curr.value.length === 2){
    const n = Math.max(0, Math.min(max, parseInt(curr.value,10)));
    curr.value = String(n).padStart(2,'0');
    if (next) next.focus();
  }
}
hh.addEventListener('input', ()=>handleSegInput(hh, mm, 23));
mm.addEventListener('input', ()=>handleSegInput(mm, ss, 59));
ss.addEventListener('input', ()=>handleSegInput(ss, null, 59));

// Date picker: auto-close once date picked (final tap)
function closeDatePicker(){ dateInput.blur(); }
dateInput.addEventListener('change', closeDatePicker);
dateInput.addEventListener('input', closeDatePicker);

exportBtn.addEventListener('click', ()=>{
  const entries = loadEntries();
  if(entries.length===0){ alert('No entries to export'); return; }
  let csv = 'ID,ISO Timestamp,Local Timestamp,Grams\n';
  entries.forEach(e=>{
    csv += `"${e.id}","${e.tsISO||''}","${e.ts||''}",${Number(e.grams)||0}\n`;
  });
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mass-gainer-log.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

clearBtn.addEventListener('click', ()=>{
  if(!confirm('Clear all entries on this device?')) return;
  localStorage.removeItem(STORAGE_KEY);
  editingId = null;
  addBtn.textContent = 'Add';
  render();
});

document.addEventListener('DOMContentLoaded', ()=>{
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'local time';
  tzInfo.textContent = `Time zone: ${tz}`;
  render();
});
