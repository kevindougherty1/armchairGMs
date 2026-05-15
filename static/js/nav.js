// ── MULTI-LEAGUE MANAGEMENT ───────────────────────────────────────────────
// LEAGUES: array of {id, name} saved across sessions for this user.
// DEFAULT_LID: the league that auto-loads on startup (first one synced).
let LEAGUES=[];
let DEFAULT_LID='';
let LOAD_TOKEN=0; // increments each time a load starts; stale loads are abandoned

function _lgStoreKey(){const k=(CU&&CU.uid)?CU.uid:(CU&&CU.em)?CU.em:'guest';return 'agm_leagues_'+k;}
function _defStoreKey(){const k=(CU&&CU.uid)?CU.uid:(CU&&CU.em)?CU.em:'guest';return 'agm_default_lid_'+k;}

function loadLeaguesLocal(){
  try{LEAGUES=JSON.parse(localStorage.getItem(_lgStoreKey())||'[]');}catch(e){LEAGUES=[];}
  try{DEFAULT_LID=localStorage.getItem(_defStoreKey())||'';}catch(e){DEFAULT_LID='';}
  // Migration: if CU has a legacy lid and it's not in LEAGUES yet, seed it
  if(CU&&CU.lid&&!LEAGUES.find(l=>l.id===CU.lid)){
    LEAGUES.push({id:CU.lid,name:''});
    if(!DEFAULT_LID) DEFAULT_LID=CU.lid;
    saveLeaguesLocal();
  }
}
function saveLeaguesLocal(){
  try{localStorage.setItem(_lgStoreKey(),JSON.stringify(LEAGUES));}catch(e){}
  try{localStorage.setItem(_defStoreKey(),DEFAULT_LID||'');}catch(e){}
}
async function saveLeaguesRemote(){
  // Attempt to persist to Supabase. Field name `leagues` is JSONB; if the column
  // doesn't exist, this is a no-op (localStorage remains source of truth).
  if(!CU?.token||!CU?.uid||CU.em==='Guest') return;
  try{
    await sbUpsertProfile(CU.token,CU.uid,{
      email:CU.em,
      league_id:DEFAULT_LID||CU.lid||'',
      scoring:SCORING||'SF',
      leagues:LEAGUES
    });
  }catch(e){}
}
async function loadLeaguesRemote(){
  if(!CU?.token||CU.em==='Guest') return;
  try{
    const pr=await sbGetProfile(CU.token);
    if(pr.ok&&pr.data?.length){
      const row=pr.data[0];
      if(Array.isArray(row.leagues)&&row.leagues.length){
        // Merge remote into local (remote wins for any duplicates by id)
        const byId={};
        LEAGUES.forEach(l=>{byId[l.id]=l;});
        row.leagues.forEach(l=>{if(l&&l.id) byId[l.id]={id:l.id,name:l.name||byId[l.id]?.name||''};});
        LEAGUES=Object.values(byId);
      }
      if(row.league_id&&!DEFAULT_LID) DEFAULT_LID=row.league_id;
      saveLeaguesLocal();
    }
  }catch(e){}
}

function addOrUpdateLeague(id,name){
  if(!id) return;
  const existing=LEAGUES.find(l=>l.id===id);
  if(existing){
    if(name) existing.name=name;
  } else {
    LEAGUES.push({id,name:name||''});
  }
  if(!DEFAULT_LID) DEFAULT_LID=id;
  saveLeaguesLocal();
  saveLeaguesRemote();
  renderLeagueDropdown();
}

function removeLeague(id){
  LEAGUES=LEAGUES.filter(l=>l.id!==id);
  if(DEFAULT_LID===id) DEFAULT_LID=LEAGUES[0]?.id||'';
  saveLeaguesLocal();
  saveLeaguesRemote();
  renderLeagueDropdown();
}

function renderLeagueDropdown(){
  const sel=document.getElementById('nav-lg-select');
  if(!sel) return;
  const cur=window._lastLeagueId||DEFAULT_LID||'';
  if(!LEAGUES.length){
    sel.innerHTML='<option value="">No leagues saved</option>';
    sel.style.display='none';
    const star=document.getElementById('nav-lg-default');
    if(star) star.style.display='none';
    return;
  }
  sel.style.display='';
  sel.innerHTML=LEAGUES.map(l=>{
    // Cleaner labels: just the league name. Prefix the default with ★ so it's
    // obvious which one loads on startup. Fall back to a short ID if we
    // somehow don't have a name yet (pre-sync edge case).
    const base=l.name||('League '+(l.id||'').slice(-4));
    const label=(l.id===DEFAULT_LID?'★ ':'')+base;
    const sel2=l.id===cur?' selected':'';
    return `<option value="${l.id}"${sel2}>${label}</option>`;
  }).join('');
  // Update the star button to reflect whether the currently-loaded league is
  // the default. Tap it to set/unset.
  const star=document.getElementById('nav-lg-default');
  if(star){
    // Only meaningful when a league is actually loaded — otherwise hide
    if(!window._lastLeagueId){
      star.style.display='none';
    } else {
      const isDef=window._lastLeagueId===DEFAULT_LID;
      star.style.display='';
      star.textContent=isDef?'★':'☆';
      star.style.color=isDef?'var(--accent)':'var(--text3)';
      star.title=isDef?'This is your default league (loads on startup)':'Set this league as your default (loads on startup)';
    }
  }
}

function onLgSelect(){
  const sel=document.getElementById('nav-lg-select');
  if(!sel||!sel.value) return;
  const id=sel.value;
  if(id===window._lastLeagueId) return; // already loaded
  document.getElementById('lid').value=id;
  document.getElementById('nav-lid').value='';
  showPg('rankings',document.querySelectorAll('.nt')[0]);
  loadLeague();
}

// Toggle the currently-loaded league as the default. The default is what
// auto-loads when the user opens the app — it's pinned to whatever was first
// synced, but the user can change it from here at any time.
function toggleDefaultLeague(){
  const cur=window._lastLeagueId;
  if(!cur||!LEAGUES.find(l=>l.id===cur)) return;
  DEFAULT_LID=cur;
  // Mirror to CU.lid so the existing launch-time auto-load picks this up
  if(CU){CU.lid=cur;sSess(CU);}
  saveLeaguesLocal();
  saveLeaguesRemote();
  if(CU&&CU.em!=='Guest') saveProfile();
  renderLeagueDropdown();
}

function syncNavLeague(){
  // Priority: paste field has content → use it (new league). Otherwise dropdown.
  const pasted=(document.getElementById('nav-lid').value||'').trim();
  const dropdownVal=(document.getElementById('nav-lg-select')?.value||'').trim();
  const id=pasted||dropdownVal;
  if(!id){
    document.getElementById('lerr').textContent='Paste a Sleeper League ID first.';
    document.getElementById('lerr').style.display='block';
    return;
  }
  document.getElementById('lid').value=id;
  // Clear the paste field so subsequent syncs pick from the dropdown unless re-pasted
  document.getElementById('nav-lid').value='';
  // Brief visual feedback on the sync button
  const sb=document.getElementById('nav-sync-btn');
  if(sb){const orig=sb.textContent;sb.textContent='Syncing...';sb.disabled=true;setTimeout(()=>{sb.textContent=orig;sb.disabled=false;},900);}
  showPg('rankings',document.querySelectorAll('.nt')[0]);
  loadLeague();
}


function normName(n){
  return (n||'').toLowerCase().replace(/['\u2019`.\-]/g,'').replace(/\s+(jr|sr|ii|iii|iv)$/,'').replace(/\s+/g,' ').trim();
}
function posGlyph(pos){return {QB:'QB',WR:'WR',RB:'RB',TE:'TE'}[pos]||'?';}
function posColor(pos){return {QB:'var(--qb)',WR:'var(--wr)',RB:'var(--rb)',TE:'var(--te)'}[pos]||'var(--text3)';}

function avatarHtml(d,dim=28){
  if(d.type==='pick'){
    const lbl=d.round+(d.slot==='Early'?'E':d.slot==='Mid'?'M':'L');
    return `<div style="width:${dim}px;height:${dim}px;border-radius:50%;background:rgba(155,138,191,0.12);border:1px solid var(--pick);display:flex;align-items:center;justify-content:center;font-family:Oswald,sans-serif;font-size:${Math.round(dim*0.25)}px;color:var(--pick);flex-shrink:0;">${lbl}</div>`;
  }
  const pid=SLEEPER_PID[normName(d.name)];
  const pc=posColor(d.pos);
  const pg=posGlyph(d.pos);
  // Safe fallback: no quotes inside the onerror attribute, uses a global helper
  const fbId='fb_'+Math.random().toString(36).slice(2,7);
  window._fbCache=window._fbCache||{};
  window._fbCache[fbId]={dim,pc,pg};
  if(!pid) return `<div style="width:${dim}px;height:${dim}px;border-radius:50%;background:var(--bg2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-family:Oswald,sans-serif;font-size:${Math.round(dim*0.25)}px;color:${pc};flex-shrink:0;">${pg}</div>`;
  return `<img data-fbid="${fbId}" style="width:${dim}px;height:${dim}px;border-radius:50%;object-fit:cover;object-position:top center;border:1px solid var(--border);background:var(--bg2);flex-shrink:0;" src="https://sleepercdn.com/content/nfl/players/${pid}.jpg" onerror="imgFb(this)">`;
}
function imgFb(el){
  const id=el.getAttribute('data-fbid');
  const cfg=(window._fbCache||{})[id]||{dim:28,pc:'var(--text3)',pg:'?'};
  const d=document.createElement('div');
  d.style.cssText=`width:${cfg.dim}px;height:${cfg.dim}px;border-radius:50%;background:var(--bg2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-family:Oswald,sans-serif;font-size:${Math.round(cfg.dim*0.25)}px;color:${cfg.pc};flex-shrink:0;`;
  d.textContent=cfg.pg;
  el.parentNode.replaceChild(d,el);
}

function showPg(id,el){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nt').forEach(t=>t.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  if(el)el.classList.add('active');
  if(id==='history') renderHistory();
  if(id==='trades') renderTrades();
  if(id==='targets') renderTargets();
  if(id==='trade') renderRosterNeedsContext();
  if(id==='myteam') initMyTeam();
  if(id==='startsit'){SS_A=null;SS_B=null;document.getElementById('ss-a-search').value='';document.getElementById('ss-b-search').value='';document.getElementById('ss-a-card').innerHTML='';document.getElementById('ss-b-card').innerHTML='';document.getElementById('ss-verdict').style.display='none';}
  if(id==='rookies') renderRookies();
  if(id==='rankings'){try{const top=DATA.find(d=>d.rank===1);if(top){SEL=top;renderTable();renderCard();}}catch(e){}}
}

