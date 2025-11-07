// Minimalist Mass Gainer Logger with grouping: Last 7 days (detailed), Last Week (total only), Grand Total.
// Scroll lock stays active only while entries < MAX_ENTRIES.
const STORAGE_KEY = 'milkLoggerEntries_v2';
const MAX_ENTRIES = 10;

const gramsInput = document.getElementById('grams');
const addBtn = document.getElementById('addBtn');
const exportBtn = document.getElementById('exportBtn');
const clearBtn = document.getElementById('clearBtn');
const tzInfo = document.getElementById('tzInfo');

const emptyState = document.getElementById('emptyState');
const last7Days = document.getElementById('last7Days');
const daysContainer = document.getElementById('daysContainer');

const lastWeekBlock = document.getElementById('lastWeekBlock');
const lastWeekTitle = document.getElementById('lastWeekTitle');
const lastWeekTotal = document.getElementById('lastWeekTotal');

const grandTotalBlock = document.getElementById('grandTotalBlock');
const grandTotal = document.getElementById('grandTotal');

function nowISO(){
  return new Date().toISOString();
}
function fmtDT(d){
  return new Intl.DateTimeFormat(undefined, {
    year:'numeric', month:'short', day:'numeric',
    hour:'2-digit', minute:'2-digit', second:'2-digit',
    hour12:false
  }).format(d);
}
function fmtDate(d){
  return new Intl.DateTimeFormat(undefined, {
    weekday:'short', year:'numeric', month:'short', day:'numeric'
  }).format(d);
}
function fmtRange(start, end){
  const df = new Intl.DateTimeFormat(undefined, {month:'short', day:'numeric', year:'numeric'});
  return df.format(start) + ' – ' + df.format(end);
}
function parseTS(entry){
  // Support both new iso and legacy ts-only entries
  if (entry.tsISO) return new Date(entry.tsISO);
  // fallback: parse best-effort
  const d = new Date(entry.ts);
  if (!isNaN(d)) return d;
  // worst case: now
  return new Date();
}
function toLocalDateKey(d){
  // YYYY-MM-DD in local time
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function loadEntries(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch(e){ console.error(e); return []; }
}
function saveEntries(arr){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}
function applyScrollLock(length){
  const root = document.documentElement, body = document.body;
  if (length < MAX_ENTRIES){
    root.classList.add('no-scroll'); body.classList.add('no-scroll');
  } else {
    root.classList.remove('no-scroll'); body.classList.remove('no-scroll');
  }
}

function render(){
  const entries = loadEntries();
  applyScrollLock(entries.length);

  if (entries.length === 0){
    emptyState.hidden = false;
    last7Days.hidden = true;
    lastWeekBlock.hidden = true;
    grandTotalBlock.hidden = true;
    return;
  }
  emptyState.hidden = true;

  // Build maps
  const today = new Date();
  const last7Keys = [];
  for (let i=0;i<7;i++){
    const d = new Date(today);
    d.setDate(d.getDate()-i);
    last7Keys.push(toLocalDateKey(d));
  }
  // Determine last calendar week range (Mon-Sun) before current week
  const curr = new Date(today);
  const day = (curr.getDay()+6)%7; // 0=Mon..6=Sun
  const mondayThisWeek = new Date(curr);
  mondayThisWeek.setDate(curr.getDate()-day);
  mondayThisWeek.setHours(0,0,0,0);
  const lastWeekStart = new Date(mondayThisWeek);
  lastWeekStart.setDate(mondayThisWeek.getDate()-7);
  const lastWeekEnd = new Date(mondayThisWeek);
  lastWeekEnd.setDate(mondayThisWeek.getDate()-1);
  lastWeekEnd.setHours(23,59,59,999);

  // Group entries
  const byDate = new Map();
  let totalAll = 0;
  let totalLastWeek = 0;

  entries.forEach(e=>{
    const d = parseTS(e);
    const g = Number(e.grams)||0;
    totalAll += g;
    const key = toLocalDateKey(d);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key).push({date:d, grams:g});
    // Count toward "last week" only if within last week range and not within current last 7 days details
    if (d >= lastWeekStart && d <= lastWeekEnd && !last7Keys.includes(key)){
      totalLastWeek += g;
    }
  });

  // Render last 7 days with details
  daysContainer.innerHTML = '';
  let anyDayShown = false;
  last7Keys.forEach(key=>{
    const items = (byDate.get(key)||[]).sort((a,b)=>a.date-b.date);
    if (items.length===0) return;
    anyDayShown = true;
    const dParts = key.split('-'); // YYYY-MM-DD
    const dObj = new Date(Number(dParts[0]), Number(dParts[1])-1, Number(dParts[2]));
    const card = document.createElement('div');
    card.className = 'day-card';

    let dayTotal = 0;
    const rows = items.map((it, idx)=>{
      dayTotal += it.grams;
      const timeFmt = new Intl.DateTimeFormat(undefined, {hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false}).format(it.date);
      return `<tr><td>${timeFmt}</td><td>${it.grams}</td></tr>`;
    }).join('');

    card.innerHTML = `
      <div class="day-head">
        <div class="day-title">${fmtDate(dObj)}</div>
        <div class="day-total">${dayTotal} g</div>
      </div>
      <table class="table">
        <thead><tr><th>Time</th><th>Grams</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td>Total</td><td>${dayTotal} g</td></tr></tfoot>
      </table>
    `;
    daysContainer.appendChild(card);
  });
  last7Days.hidden = !anyDayShown;

  // Render last week block (total only) and title with date range
  lastWeekTitle.textContent = `Last Week (${fmtRange(lastWeekStart, lastWeekEnd)})`;
  lastWeekTotal.textContent = `${totalLastWeek} g`;
  lastWeekBlock.hidden = (totalLastWeek===0);

  // Grand total
  grandTotal.textContent = `${totalAll} g`;
  grandTotalBlock.hidden = false;
}

function addEntry(grams){
  const arr = loadEntries();
  arr.push({
    ts: fmtDT(new Date()),
    tsISO: nowISO(),
    grams: Number(grams)
  });
  saveEntries(arr);
  render();
}

addBtn.addEventListener('click', ()=>{
  const val = gramsInput.value.trim();
  if(!val || isNaN(val) || Number(val)<0){ gramsInput.focus(); return; }
  addEntry(Number(val));
  gramsInput.value = '';
  gramsInput.focus();
});
gramsInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ addBtn.click(); }});

exportBtn.addEventListener('click', ()=>{
  const entries = loadEntries();
  if(entries.length===0){ alert('No entries to export'); return; }
  let csv = 'ISO Timestamp,Local Timestamp,Grams\n';
  entries.forEach(e=>{
    csv += `"${e.tsISO||''}","${e.ts||''}",${Number(e.grams)||0}\n`;
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
  render();
});

document.addEventListener('DOMContentLoaded', ()=>{
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'local time';
  tzInfo.textContent = `Time zone: ${tz}`;
  render();
});
