// Prevent Import button from triggering file picker — strictly toggles menu.
const STORAGE_ROOT_KEY = 'milkLoggerProfiles_v2';
const DEFAULT_EMAIL = 'guest';

function parseCSV(text){
  const rows=[]; let row=[],val='',i=0,inQ=false;
  while(i<text.length){const c=text[i];
    if(inQ){ if(c=='"'){ if(text[i+1]=='"'){val+='"'; i+=2; continue;} inQ=false; i++; continue;} else {val+=c; i++; continue;} }
    else { if(c=='"'){inQ=true; i++; continue;}
      if(c==','){row.push(val); val=''; i++; continue;}
      if(c=='\r'){i++; continue;}
      if(c=='\n'){row.push(val); rows.push(row); row=[]; val=''; i++; continue;}
      val+=c; i++; continue; } }
  row.push(val); rows.push(row);
  if(rows.length && rows[rows.length-1].length===1 && rows[rows.length-1][0]==='') rows.pop();
  return rows;
}
async function sha256(text){const enc=new TextEncoder().encode(text);const buf=await crypto.subtle.digest('SHA-256',enc);return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');}
function readRoot(){try{const raw=localStorage.getItem(STORAGE_ROOT_KEY);return raw?JSON.parse(raw):{currentEmail:DEFAULT_EMAIL,profiles:{[DEFAULT_EMAIL]:{entries:[]}}};}catch{ return {currentEmail:DEFAULT_EMAIL,profiles:{[DEFAULT_EMAIL]:{entries:[]}}};}
function writeRoot(r){localStorage.setItem(STORAGE_ROOT_KEY, JSON.stringify(r));}
function getCurrent(){const r=readRoot(); return {root:r, email:r.currentEmail, profile:(r.profiles[r.currentEmail] ||= {entries:[]})};}
function setCurrentEmail(e){const r=readRoot(); if(!r.profiles[e]) r.profiles[e]={entries:[]}; r.currentEmail=e; writeRoot(r);}
function getEntries(){return getCurrent().profile.entries||[];}
function saveEntries(a){const r=readRoot(); (r.profiles[r.currentEmail] ||= {}).entries=a; writeRoot(r);}
function ensureEntryIds(a){let c=false; a.forEach(e=>{if(!e.id){e.id=Math.random().toString(36).slice(2)+Date.now().toString(36); c=true;}}); if(c) saveEntries(a); return a;}
function supportsHover(){return matchMedia && matchMedia('(hover: hover)').matches;}
function fmtDT(d){return new Intl.DateTimeFormat(undefined,{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(d);}
function fmtDate(d){return new Intl.DateTimeFormat(undefined,{weekday:'short',year:'numeric',month:'short',day:'numeric'}).format(d);}
function fmtRange(s,e){const f=new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',year:'numeric'}); return f.format(s)+' – '+f.format(e);}
function parseTS(e){if(e.tsISO) return new Date(e.tsISO); const d=new Date(e.ts); return isNaN(d)?new Date():d;}
function toKey(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),da=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${da}`;}

const gramsInput=document.getElementById('grams');
const addBtn=document.getElementById('addBtn');
const exportBtn=document.getElementById('exportBtn');
const importBtn=document.getElementById('importBtn');
const importMenu=document.getElementById('importMenu');
const importFileBtn=document.getElementById('importFileBtn');
const importPasteBtn=document.getElementById('importPasteBtn');
const importInput=document.getElementById('importInput');
const clearLogsBtn=document.getElementById('clearLogsBtn');
const clearFieldsBtn=document.getElementById('clearFieldsBtn');
const tzInfo=document.getElementById('tzInfo');
const profileBtn=document.getElementById('profileBtn');
const profileLabel=document.getElementById('profileLabel');

const toggleCustom=document.getElementById('toggleCustom');
const customPanel=document.getElementById('customPanel');
const dateInput=document.getElementById('dateInput');
const hh=document.getElementById('hh');
const mm=document.getElementById('mm');
const ss=document.getElementById('ss');
const resetNow=document.getElementById('resetNow');

const emptyState=document.getElementById('emptyState');
const last7Days=document.getElementById('last7Days');
const daysContainer=document.getElementById('daysContainer');
const lastWeekBlock=document.getElementById('lastWeekBlock');
const lastWeekTitle=document.getElementById('lastWeekTitle');
const lastWeekTotal=document.getElementById('lastWeekTotal');
const grandTotalBlock=document.getElementById('grandTotalBlock');
const grandTotal=document.getElementById('grandTotal');

const sheet=document.getElementById('actionSheet');
const sheetEdit=document.getElementById('sheetEdit');
const sheetDelete=document.getElementById('sheetDelete');
const sheetCancel=document.getElementById('sheetCancel');
let sheetTargetId=null;

const profileSheet=document.getElementById('profileSheet');
const emailInput=document.getElementById('emailInput');
const pinInput=document.getElementById('pinInput');
const saveProfileBtn=document.getElementById('saveProfileBtn');
const setPinBtn=document.getElementById('setPinBtn');
const removePinBtn=document.getElementById('removePinBtn');
const profileCancel=document.getElementById('profileCancel');

const pasteSheet=document.getElementById('pasteSheet');
const pasteArea=document.getElementById('pasteArea');
const pasteImportBtn=document.getElementById('pasteImportBtn');
const pasteCancel=document.getElementById('pasteCancel');

let editingId=null;

function showProfileLabel(){const {email}=getCurrent(); profileLabel.textContent=email||'Guest';}
async function requirePin(action){const {profile}=getCurrent(); if(!profile.pinHash){action(); return;} const entered=pinInput.value||prompt('Enter PIN'); if(!entered) return; const ok=await sha256(entered); if(ok!==profile.pinHash){alert('Wrong PIN'); return;} action();}

function openProfileSheet(){const {email,profile}=getCurrent(); emailInput.value=email===DEFAULT_EMAIL?'':email; pinInput.value=''; profileSheet.hidden=false; removePinBtn.disabled=!profile.pinHash;}
function closeProfileSheet(){profileSheet.hidden=true;}
profileBtn.addEventListener('click',openProfileSheet);
profileCancel.addEventListener('click',closeProfileSheet);
profileSheet.addEventListener('click',e=>{if(e.target===profileSheet) closeProfileSheet();});

saveProfileBtn.addEventListener('click',async ()=>{
  const email=(emailInput.value||'').trim().toLowerCase()||DEFAULT_EMAIL;
  const root=readRoot();
  if(root.profiles[email] && root.profiles[email].pinHash){
    const entered=pinInput.value||prompt('Enter PIN to unlock'); if(!entered) return;
    const ok=await sha256(entered)===root.profiles[email].pinHash; if(!ok){alert('Wrong PIN'); return;}
  }
  setCurrentEmail(email); showProfileLabel(); render(); closeProfileSheet();
});
setPinBtn.addEventListener('click', async ()=>{
  const first=pinInput.value||prompt('Set 4-digit PIN'); if(!first) return; if(!/^\d{4}$/.test(first)){alert('PIN must be 4 digits'); return;}
  const confirmPin=prompt('Confirm PIN'); if(confirmPin!==first){alert('PINs do not match'); return;}
  const {root,email}=getCurrent(); (root.profiles[email] ||= {entries:[]}).pinHash=await sha256(first); writeRoot(root); removePinBtn.disabled=false; alert('PIN set');
});
removePinBtn.addEventListener('click', ()=>{ requirePin(()=>{ const {root,email}=getCurrent(); if(root.profiles[email]) delete root.profiles[email].pinHash; writeRoot(root); removePinBtn.disabled=true; alert('PIN removed'); }); });

function render(){
  closeSheet(true);
  showProfileLabel();
  const entries=ensureEntryIds(getEntries());
  if(entries.length===0){ emptyState.hidden=false; last7Days.hidden=true; lastWeekBlock.hidden=true; grandTotalBlock.hidden=true; return; }
  emptyState.hidden=true;

  const today=new Date();
  const last7=[]; for(let i=0;i<7;i++){const d=new Date(today); d.setDate(d.getDate()-i); last7.push(toKey(d));}
  const curr=new Date(today); const day=(curr.getDay()+6)%7;
  const monday=new Date(curr); monday.setDate(curr.getDate()-day); monday.setHours(0,0,0,0);
  const lastWeekStart=new Date(monday); lastWeekStart.setDate(monday.getDate()-7);
  const lastWeekEnd=new Date(monday); lastWeekEnd.setDate(monday.getDate()-1); lastWeekEnd.setHours(23,59,59,999);

  const byDate=new Map(); let totalAll=0, totalLW=0;
  entries.forEach(e=>{ const d=parseTS(e); const g=Number(e.grams)||0; totalAll+=g; const key=toKey(d); if(!byDate.has(key)) byDate.set(key,[]); byDate.get(key).push({id:e.id,date:d,grams:g}); if(d>=lastWeekStart && d<=lastWeekEnd && !last7.includes(key)) totalLW+=g; });

  daysContainer.innerHTML=''; let any=false;
  last7.forEach(key=>{ const items=(byDate.get(key)||[]).sort((a,b)=>a.date-b.date); if(!items.length) return; any=true; const [Y,M,D]=key.split('-'); const dObj=new Date(+Y, +M-1, +D);
    const card=document.createElement('div'); card.className='day-card';
    let dayTotal=0;
    const rows=items.map(it=>{ dayTotal+=it.grams; const t=new Intl.DateTimeFormat(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(it.date);
      const hoverUI=supportsHover()?`<div class="row-actions"><button class="icon-btn trash" data-action="delete" data-id="${it.id}" title="Delete">🗑</button><button class="icon-btn" data-action="edit" data-id="${it.id}" title="Edit">✎</button></div>`:'';
      return `<tr class="row" data-id="${it.id}"><td>${t}</td><td>${it.grams}</td>${supportsHover()?`<td style="position:relative;">${hoverUI}</td>`:''}</tr>`; }).join('');
    const head=`<thead><tr><th>Time</th><th>Grams</th>${supportsHover()?`<th style="width:60px"></th>`:''}</tr></thead>`;
    card.innerHTML=`<div class="day-head"><div class="day-title">${fmtDate(dObj)}</div><div class="day-total">${dayTotal} g</div></div><table class="table">${head}<tbody>${rows}</tbody><tfoot><tr><td>Total</td><td>${dayTotal} g</td>${supportsHover()?'<td></td>':''}</tr></tfoot></table>`;
    daysContainer.appendChild(card);
  });
  last7Days.hidden=!any;
  lastWeekTitle.textContent=`Last Week (${fmtRange(lastWeekStart,lastWeekEnd)})`; lastWeekTotal.textContent=`${totalLW} g`; lastWeekBlock.hidden=(totalLW===0);
  grandTotal.textContent=`${totalAll} g`; grandTotalBlock.hidden=false;

  if(supportsHover()){ daysContainer.querySelectorAll('.icon-btn').forEach(b=>{ const id=b.getAttribute('data-id'); const act=b.getAttribute('data-action'); b.addEventListener('click',e=>{e.stopPropagation(); if(act==='delete') onDelete(id); if(act==='edit') onStartEdit(id);});}); }
  else { daysContainer.querySelectorAll('.row').forEach(r=>{ r.addEventListener('click',()=>{ sheetTargetId=r.getAttribute('data-id'); sheet.hidden=false; });}); }
}

function onDelete(id){ requirePin(()=>{ const a=getEntries(); const i=a.findIndex(e=>e.id===id); if(i>-1){a.splice(i,1); saveEntries(a); render();} }); }
function onStartEdit(id){ const a=getEntries(); const it=a.find(e=>e.id===id); if(!it) return; editingId=id; gramsInput.value=Number(it.grams)||0; const d=parseTS(it); const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), da=String(d.getDate()).padStart(2,'0'); const h=String(d.getHours()).padStart(2,'0'), mi=String(d.getMinutes()).padStart(2,'0'), s=String(d.getSeconds()).padStart(2,'0'); customPanel.hidden=false; toggleCustom.textContent='Auto time'; dateInput.value=`${y}-${m}-${da}`; hh.value=h; mm.value=mi; ss.value=s; addBtn.textContent='Save'; gramsInput.focus(); }
function finishEdit(g,when){ const a=getEntries(); const i=a.findIndex(e=>e.id===editingId); if(i>-1){ a[i].grams=g; a[i].tsISO=when.toISOString(); a[i].ts=fmtDT(when); saveEntries(a);} editingId=null; addBtn.textContent='Add'; render(); }
function addEntry(g){ const when=buildCustomDateOrNull() || new Date(); const a=getEntries(); a.push({id:Math.random().toString(36).slice(2)+Date.now().toString(36), ts:fmtDT(when), tsISO:when.toISOString(), grams:Number(g)}); saveEntries(a); render(); }

function buildCustomDateOrNull(){ const dVal=dateInput.value; const H=hh.value.trim(), M=mm.value.trim(), S=ss.value.trim(); if(!dVal && !H && !M && !S) return null; const base=new Date(); const [y,m,da]=dVal?[...dVal.split('-')]:[String(base.getFullYear()), String(base.getMonth()+1).padStart(2,'0'), String(base.getDate()).padStart(2,'0')]; const h=Math.max(0,Math.min(23,parseInt(H||'0',10))); const mi=Math.max(0,Math.min(59,parseInt(M||'0',10))); const s=Math.max(0,Math.min(59,parseInt(S||'0',10))); return new Date(+y, +m-1, +da, h, mi, s, 0); }
toggleCustom.addEventListener('click',()=>{ const open=customPanel.hidden===false; if(open){ customPanel.hidden=true; toggleCustom.textContent='Custom time'; dateInput.value=''; hh.value=''; mm.value=''; ss.value=''; } else { customPanel.hidden=false; toggleCustom.textContent='Auto time'; } });
resetNow.addEventListener('click',()=>{ dateInput.value=''; hh.value=''; mm.value=''; ss.value=''; });

function tryAddFromField(){ const v=gramsInput.value.trim(); if(!v || isNaN(v) || Number(v)<0) return; const when=buildCustomDateOrNull() || new Date(); if(editingId){ finishEdit(Number(v), when); } else { addEntry(Number(v)); } gramsInput.value=''; gramsInput.focus(); }
addBtn.addEventListener('click', tryAddFromField);
gramsInput.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); tryAddFromField(); }});
gramsInput.addEventListener('change', tryAddFromField);
function digits(s){return s.replace(/\D/g,'');}
function seg(curr,next,max){ curr.value=digits(curr.value).slice(0,2); if(curr.value.length===2){ const n=Math.max(0,Math.min(max,parseInt(curr.value,10))); curr.value=String(n).padStart(2,'0'); if(next) next.focus(); } }
hh.addEventListener('input',()=>seg(hh,mm,23)); mm.addEventListener('input',()=>seg(mm,ss,59)); ss.addEventListener('input',()=>seg(ss,null,59));
dateInput.addEventListener('change',()=>{ dateInput.blur(); });

exportBtn.addEventListener('click', ()=>{ const e=getEntries(); if(!e.length){alert('No entries to export'); return;} let csv='ID,ISO Timestamp,Local Timestamp,Grams\n'; e.forEach(x=>{ csv+=`"${x.id}","${x.tsISO||''}","${x.ts||''}",${Number(x.grams)||0}\n`; }); const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='mass-gainer-log.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); });

// Import dropdown logic — prevent accidental file picker
function closeMenus(){ importMenu.hidden=true; importBtn.setAttribute('aria-expanded','false'); }
importBtn.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); const isOpen = importMenu.hidden===false; importMenu.hidden = isOpen; importBtn.setAttribute('aria-expanded', String(!isOpen)); });
document.addEventListener('click', (e)=>{ if(!e.target.closest('#importWrap')) closeMenus(); });
importFileBtn.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); closeMenus(); importInput.click(); });
importPasteBtn.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); closeMenus(); pasteArea.value=''; pasteSheet.hidden=false; });
pasteCancel.addEventListener('click', ()=>{ pasteSheet.hidden=true; });
pasteSheet.addEventListener('click', (e)=>{ if(e.target===pasteSheet) pasteSheet.hidden=true; });

function parseAndMergeCSVText(text){
  const rows=parseCSV(text); if(!rows.length){alert('Empty CSV'); return;}
  const headers=rows[0].map(h=>h.trim().toLowerCase());
  const idx={ id:headers.indexOf('id'), iso:headers.indexOf('iso timestamp'), local:headers.indexOf('local timestamp'), grams:headers.indexOf('grams') };
  const imported=[];
  for(let r=1;r<rows.length;r++){ const cols=rows[r]; if(!cols || !cols.length) continue; const g=Number((idx.grams>=0? cols[idx.grams]:'').trim()); if(Number.isNaN(g)) continue; const iso=idx.iso>=0?(cols[idx.iso]||'').trim():''; const local=idx.local>=0?(cols[idx.local]||'').trim():''; const id=idx.id>=0?(cols[idx.id]||'').trim():''; imported.push({id, tsISO:iso, ts:local, grams:g}); }
  const current=getEntries(); const byId=new Map(current.filter(e=>e.id).map(e=>[e.id,e])); const bySig=new Set(current.map(e=>(e.tsISO||'')+'|'+(e.grams||0)));
  let added=0, updated=0;
  imported.forEach(r=>{ if(r.id && byId.has(r.id)){ const e=byId.get(r.id); const newISO=r.tsISO||e.tsISO; e.grams=r.grams ?? e.grams; e.tsISO=newISO; e.ts=newISO? fmtDT(new Date(newISO)) : (r.ts||e.ts); updated++; } else { const sig=(r.tsISO||'')+'|'+(r.grams||0); if(bySig.has(sig)) return; const id=r.id || Math.random().toString(36).slice(2)+Date.now().toString(36); current.push({id, tsISO:r.tsISO||'', ts:r.ts || (r.tsISO? fmtDT(new Date(r.tsISO)) : ''), grams:r.grams||0}); bySig.add(sig); added++; } });
  saveEntries(current); render(); alert(`Imported ${imported.length} rows (added ${added}, updated ${updated}).`);
}
importInput.addEventListener('change', async (e)=>{ const file=e.target.files && e.target.files[0]; if(!file) return; const text=await file.text(); parseAndMergeCSVText(text); importInput.value=''; });

function closeSheet(){ sheet.hidden=true; sheetTargetId=null; }
sheetCancel.addEventListener('click', closeSheet);
sheet.addEventListener('click', e=>{ if(e.target===sheet) closeSheet(); });
sheetDelete.addEventListener('click', ()=>{ if(sheetTargetId){ onDelete(sheetTargetId); } closeSheet(); });
sheetEdit.addEventListener('click', ()=>{ if(sheetTargetId){ onStartEdit(sheetTargetId); } closeSheet(); });

document.addEventListener('DOMContentLoaded', ()=>{ const tz=Intl.DateTimeFormat().resolvedOptions().timeZone||'local time'; tzInfo.textContent=`Time zone: ${tz}`; showProfileLabel(); render(); });
