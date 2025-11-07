// Milk / Mass Gainer Logger
// Persistent localStorage; scroll lock only while list is NOT full.
const STORAGE_KEY = 'milkLoggerEntries_v1';
const MAX_ENTRIES = 10; // When entries < MAX_ENTRIES => lock scroll; otherwise unlock
const HOW_MUCH_LABEL = 'Cumulative (g)'; // Change the text if you prefer another label

const gramsInput = document.getElementById('grams');
const addBtn = document.getElementById('addBtn');
const exportBtn = document.getElementById('exportBtn');
const clearBtn = document.getElementById('clearBtn');
const logBody = document.getElementById('logBody');
const logTable = document.getElementById('logTable');
const emptyState = document.getElementById('emptyState');
const tzInfo = document.getElementById('tzInfo');
const howMuchCol = document.getElementById('howMuchCol');

howMuchCol.textContent = HOW_MUCH_LABEL;

function nowFormatted(){
  const d = new Date();
  return new Intl.DateTimeFormat(undefined, {
    year:'numeric',month:'short',day:'numeric',
    hour:'2-digit',minute:'2-digit',second:'2-digit',
    hour12:false
  }).format(d);
}

function loadEntries(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch(e){ console.error(e); return []; }
}

function saveEntries(entries){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, (m)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m]));
}

function applyScrollLock(length){
  const root = document.documentElement;
  const body = document.body;
  if(length < MAX_ENTRIES){
    root.classList.add('no-scroll');
    body.classList.add('no-scroll');
  } else {
    root.classList.remove('no-scroll');
    body.classList.remove('no-scroll');
  }
}

function render(){
  const entries = loadEntries();
  if(entries.length === 0){
    logTable.style.display = 'none';
    emptyState.style.display = 'block';
  } else {
    logTable.style.display = '';
    emptyState.style.display = 'none';
    logBody.innerHTML = '';
    let cumulative = 0;
    entries.forEach((it, i) => {
      cumulative += Number(it.grams);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(it.ts)}</td>
        <td>#${i+1}</td>
        <td>${escapeHtml(it.grams)}</td>
        <td>${cumulative}</td>
      `;
      logBody.appendChild(tr);
    });
  }
  applyScrollLock(entries.length);
}

function addEntry(grams){
  const entries = loadEntries();
  entries.push({ ts: nowFormatted(), grams: Number(grams) });
  saveEntries(entries);
  render();
}

addBtn.addEventListener('click', ()=>{
  const val = gramsInput.value.trim();
  if(!val || isNaN(val) || Number(val) < 0){ gramsInput.focus(); return; }
  addEntry(Number(val));
  gramsInput.value = '';
  gramsInput.focus();
});

gramsInput.addEventListener('keydown', (e)=>{
  if(e.key === 'Enter'){
    addBtn.click();
  }
});

exportBtn.addEventListener('click', ()=>{
  const entries = loadEntries();
  if(entries.length === 0){ alert('No entries to export'); return; }
  let csv = 'Date & time,Dose #,Grams,' + HOW_MUCH_LABEL + '\n';
  let cumulative = 0;
  entries.forEach((it, i)=>{
    cumulative += Number(it.grams);
    csv += `"${it.ts}",${i+1},${it.grams},${cumulative}\n`;
  });
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'milk-logger.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

clearBtn.addEventListener('click', ()=>{
  if(!confirm('Clear all entries?')) return;
  localStorage.removeItem(STORAGE_KEY);
  render();
});

document.addEventListener('DOMContentLoaded', ()=>{
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'local time';
  tzInfo.textContent = `Device time zone: ${tz}`;
  render();
});
