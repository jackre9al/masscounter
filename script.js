// Fixed: action sheet stays hidden until a row is tapped; robust [hidden] handling.
const STORAGE_KEY = 'milkLoggerEntries_v5';
const MAX_ENTRIES = 10;

const gramsInput = document.getElementById('grams');
const addBtn = document.getElementById('addBtn');
const exportBtn = document.getElementById('exportBtn');
const clearBtn = document.getElementById('clearBtn');
const tzInfo = document.getElementById('tzInfo');

const toggleCustom = document.getElementById('toggleCustom');
const customPanel = document.getElementById('customPanel');
const dateInput = document.getElementById('dateInput');
const timeInput = document.getElementById('timeInput');
const resetNow = document.getElementById('resetNow');

const emptyState = document.getElementById('emptyState');
const last7Days = document.getElementById('last7Days');
const daysContainer = document.getElementById('daysContainer');

const lastWeekBlock = document.getElementById('lastWeekBlock');
const lastWeekTitle = document.getElementById('lastWeekTitle');
const lastWeekTotal = document.getElementById('lastWeekTotal');

const grandTotalBlock = document.getElementById('grandTotalBlock');
const grandTotal = document.getElementById('grandTotal');

// Mobile action sheet
const sheet = document.getElementById('actionSheet');
const sheetEdit = document.getElementById('sheetEdit');
const sheetDelete = document.getElementById('sheetDelete');
const sheetCancel = document.getElementById('sheetCancel');
let sheetTargetId = null;

let editingId = null;

function supportsHover(){
  return window.matchMedia && window.matchMedia('(hover: hover)').matches;
}

function nowISO(){ return new Date().toISOString(); }
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
function applyScrollLock(length){
  const root = document.documentElement, body = document.body;
  if (length < MAX_ENTRIES){ root.classList.add('no-scroll'); body.classList.add('no-scroll'); }
  else { root.classList.remove('no-scroll'); body.classList.remove('no-scroll'); }
}
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

// Build a Date from optional local date+time inputs. If blank, return null to use "now".
function buildCustomDateOrNull(){
  const dVal = dateInput.value;
  const tVal = timeInput.value;
  if (!dVal && !tVal) return null;
  let [y,m,day] = (dVal ? dVal.split('-') : []) || [];
  const base = new Date();
  if (!y){ y = String(base.getFullYear()); m = String(base.getMonth()+1).padStart(2,'0'); day = String(base.getDate()).padStart(2,'0'); }
  let h='00', mi='00', s='00';
  if (tVal){
    const parts = tVal.split(':');
    h = parts[0]||'00'; mi = parts[1]||'00'; s = parts[2]||'00';
  }
  return new Date(Number(y), Number(m)-1, Number(day), Number(h), Number(mi), Number(s), 0);
}

function render(){
  // Always make sure sheet is closed when re-rendering
  closeSheet(true);

  const entriesRaw = ensureIds(loadEntries());
  applyScrollLock(entriesRaw.length);

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

  // Last calendar week (Mon-Sun) before current week
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

  // Render last 7 days details
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

  // Wire up actions
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

  // Last week total and title
  lastWeekTitle.textContent = `Last Week (${fmtRange(lastWeekStart, lastWeekEnd)})`;
  lastWeekTotal.textContent = `${totalLastWeek} g`;
  lastWeekBlock.hidden = (totalLastWeek===0);

  // Grand total
  grandTotal.textContent = `${totalAll} g`;
  grandTotalBlock.hidden = false;
}

function openSheet(){
  if (!sheetTargetId) return; // do not open if no target
  sheet.hidden = false;
  document.body.classList.add('no-scroll');
}
function closeSheet(silent=false){
  if (sheet.hidden && silent) return;
  sheet.hidden = true;
  document.body.classList.remove('no-scroll');
  sheetTargetId = null;
}
sheetCancel.addEventListener('click', ()=>closeSheet());
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
  timeInput.value = `${h}:${mi}:${s}`;

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
    dateInput.value = '';
    timeInput.value = '';
  } else {
    customPanel.hidden = false;
    toggleCustom.textContent = 'Auto time';
  }
});
resetNow.addEventListener('click', ()=>{ dateInput.value=''; timeInput.value=''; });

addBtn.addEventListener('click', ()=>{
  const val = gramsInput.value.trim();
  if(!val || isNaN(val) || Number(val)<0){ gramsInput.focus(); return; }
  const custom = buildCustomDateOrNull();
  const when = custom || new Date();
  if (editingId){
    finishEdit(Number(val), when);
  } else {
    addEntry(Number(val));
  }
  gramsInput.value = '';
  gramsInput.focus();
});
gramsInput.addEventListener('keydown', e=>{ if(e.key==='Enter') addBtn.click(); });

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
  // Force-close sheet on startup for safety
  closeSheet(true);
  render();
});
