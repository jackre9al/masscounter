// Profiles + Import CSV. Optional PIN protection (client-side).
const STORAGE_ROOT_KEY = 'milkLoggerProfiles_v2';
const DEFAULT_EMAIL = 'guest';

// ---- CSV Parser (handles quotes, commas, newlines)
function parseCSV(text){
  const rows = [];
  let row = [];
  let val = '';
  let i = 0, inQuotes = false;
  while (i < text.length){
    const c = text[i];
    if (inQuotes){
      if (c === '"'){
        if (text[i+1] === '"'){ val += '"'; i+=2; continue; }
        inQuotes = false; i++; continue;
      } else { val += c; i++; continue; }
    } else {
      if (c === '"'){ inQuotes = true; i++; continue; }
      if (c === ','){ row.push(val); val=''; i++; continue; }
      if (c === '\r'){ i++; continue; }
      if (c === '\n'){ row.push(val); rows.push(row); row=[]; val=''; i++; continue; }
      val += c; i++; continue;
    }
  }
  // last value
  row.push(val);
  rows.push(row);
  // trim trailing empty last line
  if (rows.length && rows[rows.length-1].length === 1 && rows[rows.length-1][0]===''){
    rows.pop();
  }
  return rows;
}

// ---- hashing for PIN
async function sha256(text){
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

// ---- storage helpers
function readRoot(){
  try{
    const raw = localStorage.getItem(STORAGE_ROOT_KEY);
    return raw ? JSON.parse(raw) : { currentEmail: DEFAULT_EMAIL, profiles: { [DEFAULT_EMAIL]: { entries: [] } } };
  }catch{ return { currentEmail: DEFAULT_EMAIL, profiles: { [DEFAULT_EMAIL]: { entries: [] } } }; }
}
function writeRoot(root){ localStorage.setItem(STORAGE_ROOT_KEY, JSON.stringify(root)); }
function getCurrent(){ const root = readRoot(); return { root, email: root.currentEmail, profile: (root.profiles[root.currentEmail] ||= { entries: [] }) }; }
function setCurrentEmail(email){ const root = readRoot(); if(!root.profiles[email]) root.profiles[email] = { entries: [] }; root.currentEmail = email; writeRoot(root); }
function getEntries(){ return getCurrent().profile.entries || []; }
function saveEntries(arr){ const r = readRoot(); (r.profiles[r.currentEmail] ||= {}).entries = arr; writeRoot(r); }

function ensureEntryIds(arr){ let changed=false; arr.forEach(e=>{ if(!e.id){ e.id = Math.random().toString(36).slice(2)+Date.now().toString(36); changed=true; } }); if(changed) saveEntries(arr); return arr; }

function supportsHover(){ return matchMedia && matchMedia('(hover: hover)').matches; }
function fmtDT(d){ return new Intl.DateTimeFormat(undefined,{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(d); }
function fmtDate(d){ return new Intl.DateTimeFormat(undefined,{weekday:'short',year:'numeric',month:'short',day:'numeric'}).format(d); }
function fmtRange(start,end){ const df=new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',year:'numeric'}); return df.format(start)+' – '+df.format(end); }
function parseTS(e){ if(e.tsISO) return new Date(e.tsISO); const d=new Date(e.ts); return isNaN(d)?new Date():d; }
function toLocalDateKey(d){ const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; }

// ---- UI bindings
const gramsInput = document.getElementById('grams');
const addBtn = document.getElementById('addBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importInput = document.getElementById('importInput');
const clearLogsBtn = document.getElementById('clearLogsBtn');
const clearFieldsBtn = document.getElementById('clearFieldsBtn');
const tzInfo = document.getElementById('tzInfo');
const profileBtn = document.getElementById('profileBtn');
const profileLabel = document.getElementById('profileLabel');

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

// action sheet (mobile list row)
const sheet = document.getElementById('actionSheet');
const sheetEdit = document.getElementById('sheetEdit');
const sheetDelete = document.getElementById('sheetDelete');
const sheetCancel = document.getElementById('sheetCancel');
let sheetTargetId = null;

// profile sheet
const profileSheet = document.getElementById('profileSheet');
const emailInput = document.getElementById('emailInput');
const pinInput = document.getElementById('pinInput');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const setPinBtn = document.getElementById('setPinBtn');
const removePinBtn = document.getElementById('removePinBtn');
const profileCancel = document.getElementById('profileCancel');

let editingId = null;

// ---- profile helpers
function showProfileLabel(){ const {email} = getCurrent(); profileLabel.textContent = email || 'Guest'; }

async function requirePinIfSet(action){
  const { profile } = getCurrent();
  if (!profile.pinHash){ action(); return; }
  const entered = pinInput.value || prompt('Enter PIN');
  if (!entered) return;
  const hash = await sha256(entered);
  if (hash !== profile.pinHash){ alert('Wrong PIN'); return; }
  action();
}

function openProfileSheet(){
  const { email, profile } = getCurrent();
  emailInput.value = email === DEFAULT_EMAIL ? '' : email;
  pinInput.value = '';
  profileSheet.hidden = false;
  removePinBtn.disabled = !profile.pinHash;
}
function closeProfileSheet(){ profileSheet.hidden = true; }

profileBtn.addEventListener('click', openProfileSheet);
profileCancel.addEventListener('click', closeProfileSheet);
profileSheet.addEventListener('click', (e)=>{ if(e.target===profileSheet) closeProfileSheet(); });

saveProfileBtn.addEventListener('click', async ()=>{
  const email = (emailInput.value || '').trim().toLowerCase() || DEFAULT_EMAIL;
  const root = readRoot();
  if (root.profiles[email] && root.profiles[email].pinHash){
    const entered = pinInput.value || prompt('Enter PIN to unlock');
    if (!entered) return;
    const ok = await sha256(entered) === root.profiles[email].pinHash;
    if (!ok){ alert('Wrong PIN'); return; }
  }
  setCurrentEmail(email);
  showProfileLabel();
  render();
  closeProfileSheet();
});

setPinBtn.addEventListener('click', async ()=>{
  const first = pinInput.value || prompt('Set 4-digit PIN');
  if (!first) return;
  if (!/^\d{4}$/.test(first)){ alert('PIN must be 4 digits'); return; }
  const confirmPin = prompt('Confirm PIN');
  if (confirmPin !== first){ alert('PINs do not match'); return; }
  const { root, email } = getCurrent();
  (root.profiles[email] ||= { entries: [] }).pinHash = await sha256(first);
  writeRoot(root);
  removePinBtn.disabled = false;
  alert('PIN set');
});

removePinBtn.addEventListener('click', async ()=>{
  await requirePinIfSet(()=>{
    const { root, email } = getCurrent();
    if (root.profiles[email]) delete root.profiles[email].pinHash;
    writeRoot(root);
    removePinBtn.disabled = true;
    alert('PIN removed');
  });
});

// ---- core render (same grouping logic) 
function render(){
  closeSheet(true);
  showProfileLabel();
  const entriesRaw = ensureEntryIds(getEntries());

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
  for (let i=0;i<7;i++){ const d = new Date(today); d.setDate(d.getDate()-i); last7Keys.push(toLocalDateKey(d)); }

  const curr = new Date(today);
  const day = (curr.getDay()+6)%7;
  const mondayThisWeek = new Date(curr); mondayThisWeek.setDate(curr.getDate()-day); mondayThisWeek.setHours(0,0,0,0);
  const lastWeekStart = new Date(mondayThisWeek); lastWeekStart.setDate(mondayThisWeek.getDate()-7);
  const lastWeekEnd = new Date(mondayThisWeek); lastWeekEnd.setDate(mondayThisWeek.getDate()-1); lastWeekEnd.setHours(23,59,59,999);

  const byDate = new Map();
  let totalAll = 0;
  let totalLastWeek = 0;

  entriesRaw.forEach(e=>{
    const d = parseTS(e);
    const g = Number(e.grams)||0;
    totalAll += g;
    const key = toLocalDateKey(d);
    (byDate.get(key) || byDate.set(key, []).get(key)).push({id:e.id, date:d, grams:g});
    if (d >= lastWeekStart && d <= lastWeekEnd && !last7Keys.includes(key)){ totalLastWeek += g; }
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
      const timeFmt = new Intl.DateTimeFormat(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(it.date);
      const hoverUI = supportsHover() ? `<div class="row-actions">
          <button class="icon-btn trash" data-action="delete" data-id="${it.id}" title="Delete">🗑</button>
          <button class="icon-btn" data-action="edit" data-id="${it.id}" title="Edit">✎</button>
        </div>` : '';
      return `<tr class="row" data-id="${it.id}"><td>${timeFmt}</td><td>${it.grams}</td>${hoverUI ? `<td style="position:relative;">${hoverUI}</td>` : ''}</tr>`;
    }).join('');

    const tableHead = `<thead><tr><th>Time</th><th>Grams</th>${supportsHover()?`<th style="width:60px"></th>`:''}</tr></thead>`;
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

  lastWeekTitle.textContent = `Last Week (${fmtRange(lastWeekStart, lastWeekEnd)})`;
  lastWeekTotal.textContent = `${totalLastWeek} g`;
  lastWeekBlock.hidden = (totalLastWeek===0);

  grandTotal.textContent = `${totalAll} g`;
  grandTotalBlock.hidden = false;

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
      row.addEventListener('click', ()=>{ sheetTargetId = row.getAttribute('data-id'); sheet.hidden = false; });
    });
  }
}

// ---- CRUD per-profile
function onDelete(id){
  requirePinIfSet(()=>{
    const arr = getEntries();
    const idx = arr.findIndex(e=>e.id===id);
    if (idx>-1){ arr.splice(idx,1); saveEntries(arr); render(); }
  });
}
function onStartEdit(id){
  const arr = getEntries();
  const item = arr.find(e=>e.id===id);
  if (!item) return;
  editingId = id;
  gramsInput.value = Number(item.grams)||0;

  const d = parseTS(item);
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
  const h = String(d.getHours()).padStart(2,'0'), mi = String(d.getMinutes()).padStart(2,'0'), s = String(d.getSeconds()).padStart(2,'0');

  customPanel.hidden = false;
  toggleCustom.textContent = 'Auto time';
  dateInput.value = `${y}-${m}-${day}`;
  hh.value = h; mm.value = mi; ss.value = s;

  addBtn.textContent = 'Save';
  gramsInput.focus();
}
function finishEdit(newGrams, when){
  const arr = getEntries();
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
  const arr = getEntries();
  arr.push({ id: Math.random().toString(36).slice(2)+Date.now().toString(36), ts: fmtDT(when), tsISO: when.toISOString(), grams: Number(newGrams) });
  saveEntries(arr);
  render();
}

// ---- Inputs & actions
function buildCustomDateOrNull(){
  const dVal = dateInput.value;
  const hour = hh.value.trim(), min = mm.value.trim(), sec = ss.value.trim();
  if (!dVal && !hour && !min && !sec) return null;
  const base = new Date();
  const [y,m,day] = dVal ? dVal.split('-') : [String(base.getFullYear()), String(base.getMonth()+1).padStart(2,'0'), String(base.getDate()).padStart(2,'0')];
  const H = Math.max(0, Math.min(23, parseInt(hour||'0',10)));
  const M = Math.max(0, Math.min(59, parseInt(min||'0',10)));
  const S = Math.max(0, Math.min(59, parseInt(sec||'0',10)));
  return new Date(Number(y), Number(m)-1, Number(day), H, M, S, 0);
}

toggleCustom.addEventListener('click', ()=>{
  const open = customPanel.hidden === false;
  if (open){ customPanel.hidden = true; toggleCustom.textContent = 'Custom time'; dateInput.value=''; hh.value=''; mm.value=''; ss.value=''; }
  else { customPanel.hidden = false; toggleCustom.textContent = 'Auto time'; }
});
resetNow.addEventListener('click', ()=>{ dateInput.value=''; hh.value=''; mm.value=''; ss.value=''; });

function tryAddFromField(){
  const val = gramsInput.value.trim();
  if(!val || isNaN(val) || Number(val)<0) return;
  const custom = buildCustomDateOrNull();
  const when = custom || new Date();
  if (editingId){ finishEdit(Number(val), when); }
  else { addEntry(Number(val)); }
  gramsInput.value = '';
  gramsInput.focus();
}
addBtn.addEventListener('click', tryAddFromField);
gramsInput.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); tryAddFromField(); }});
gramsInput.addEventListener('change', tryAddFromField);

// auto-advance time segments
function onlyDigits(s){ return s.replace(/\D/g,''); }
function handleSegInput(curr,next,max){
  curr.value = onlyDigits(curr.value).slice(0,2);
  if (curr.value.length===2){ const n=Math.max(0,Math.min(max,parseInt(curr.value,10))); curr.value=String(n).padStart(2,'0'); if(next) next.focus(); }
}
hh.addEventListener('input', ()=>handleSegInput(hh,mm,23));
mm.addEventListener('input', ()=>handleSegInput(mm,ss,59));
ss.addEventListener('input', ()=>handleSegInput(ss,null,59));

// Date picker: close only after a selection
dateInput.addEventListener('change', ()=>{ dateInput.blur(); });

exportBtn.addEventListener('click', ()=>{
  const entries = getEntries();
  if(entries.length===0){ alert('No entries to export'); return; }
  let csv = 'ID,ISO Timestamp,Local Timestamp,Grams\n';
  entries.forEach(e=>{ csv += `"${e.id}","${e.tsISO||''}","${e.ts||''}",${Number(e.grams)||0}\n`; });
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'mass-gainer-log.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});

// IMPORT CSV: merges rows into current profile; dedupe by ID, else by (iso,grams)
importBtn.addEventListener('click', ()=> importInput.click());
importInput.addEventListener('change', async (e)=>{
  const file = e.target.files && e.target.files[0];
  if (!file){ return; }
  const text = await file.text();
  const rows = parseCSV(text);
  if (!rows.length){ alert('Empty CSV'); return; }
  // header
  const headers = rows[0].map(h=>h.trim().toLowerCase());
  const idx = {
    id: headers.indexOf('id'),
    iso: headers.indexOf('iso timestamp'),
    local: headers.indexOf('local timestamp'),
    grams: headers.indexOf('grams'),
    profile: headers.indexOf('profile'),
  };
  const imported = [];
  for (let r=1; r<rows.length; r++){
    const cols = rows[r];
    if (!cols || cols.length===0) continue;
    const g = Number((idx.grams>=0? cols[idx.grams] : '').trim());
    if (Number.isNaN(g)) continue;
    const iso = idx.iso>=0 ? cols[idx.iso].trim() : '';
    const local = idx.local>=0 ? cols[idx.local].trim() : '';
    const id = idx.id>=0 ? cols[idx.id].trim() : '';
    const prof = idx.profile>=0 ? (cols[idx.profile]||'').trim().toLowerCase() : '';
    imported.push({ id, tsISO: iso || '', ts: local || '', grams: g, _profile: prof });
  }
  const { email } = getCurrent();
  // filter for this profile (Profile col empty or matches current)
  const rowsForMe = imported.filter(r=> !r._profile || r._profile===email);
  if (rowsForMe.length===0){ alert('No rows for this profile in CSV'); return; }
  // Normalize tsISO if missing, try parse local
  rowsForMe.forEach(r=>{
    if (!r.tsISO){
      const d = new Date(r.ts);
      if (!isNaN(d)) r.tsISO = d.toISOString();
    }
    if (!r.ts){ r.ts = r.tsISO ? fmtDT(new Date(r.tsISO)) : ''; }
  });
  // merge + dedupe
  const current = getEntries();
  const byId = new Map(current.filter(e=>e.id).map(e=>[e.id, e]));
  const bySig = new Set(current.map(e=>(e.tsISO||'')+'|'+(e.grams||0)));
  let added=0, updated=0;
  rowsForMe.forEach(r=>{
    // prefer ID match; else signature
    if (r.id && byId.has(r.id)){
      const e = byId.get(r.id);
      const newISO = r.tsISO || e.tsISO;
      e.grams = r.grams ?? e.grams;
      e.tsISO = newISO;
      e.ts = newISO ? fmtDT(new Date(newISO)) : (r.ts || e.ts);
      updated++;
    } else {
      const sig = (r.tsISO||'')+'|'+(r.grams||0);
      if (bySig.has(sig)) return;
      const id = r.id || Math.random().toString(36).slice(2)+Date.now().toString(36);
      current.push({ id, tsISO: r.tsISO || '', ts: r.ts || (r.tsISO? fmtDT(new Date(r.tsISO)) : ''), grams: r.grams||0 });
      bySig.add(sig);
      added++;
    }
  });
  saveEntries(current);
  render();
  alert(`Imported: ${rowsForMe.length} rows (added ${added}, updated ${updated}).`);
});

// Clear Logs (per profile, no confirm)
clearLogsBtn.addEventListener('click', ()=>{
  requirePinIfSet(()=>{
    const { root, email } = getCurrent();
    if (root.profiles[email]) root.profiles[email].entries = [];
    writeRoot(root);
    render();
  });
});

clearFieldsBtn.addEventListener('click', ()=>{
  gramsInput.value = ''; dateInput.value=''; hh.value=''; mm.value=''; ss.value = '';
  customPanel.hidden = true; toggleCustom.textContent = 'Custom time'; gramsInput.focus();
});

// action sheet (mobile rows)
function closeSheet(){ sheet.hidden = true; sheetTargetId = null; }
sheetCancel.addEventListener('click', closeSheet);
sheet.addEventListener('click', (e)=>{ if(e.target===sheet) closeSheet(); });
sheetDelete.addEventListener('click', ()=>{ if(sheetTargetId){ onDelete(sheetTargetId); } closeSheet(); });
sheetEdit.addEventListener('click', ()=>{ if(sheetTargetId){ onStartEdit(sheetTargetId); } closeSheet(); });

// Boot
document.addEventListener('DOMContentLoaded', ()=>{
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'local time';
  tzInfo.textContent = `Time zone: ${tz}`;
  showProfileLabel();
  render();
});
