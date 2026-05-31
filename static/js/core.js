// ── CORE STATE & HELPERS ──────────────────────────────────────────────────
const SLEEPER_PID={};
let MODE='ALL',SEL=null,GP=[],RP=[],RP2=[],SCORING='SF',TRADE_TYPE=2,ACTIVE_RECV='recv';

// ── DARK/LIGHT MODE ──────────────────────────────────────────────────
function toggleTheme(){
  const isLight=document.body.classList.toggle('light');
  document.getElementById('theme-btn').textContent=isLight?'☀️':'🌙';
  try{localStorage.setItem('agm_theme',isLight?'light':'dark');}catch(e){}
}
function initTheme(){
  try{
    const t=localStorage.getItem('agm_theme');
    // Default is light. Only go dark if explicitly saved as dark.
    if(t==='dark'){
      document.body.classList.remove('light');
      const b=document.getElementById('theme-btn');if(b)b.textContent='🌙';
    } else {
      document.body.classList.add('light');
      const b=document.getElementById('theme-btn');if(b)b.textContent='☀️';
    }
  }catch(e){document.body.classList.add('light');}
}

function toggleTheme(){
  const isLight=document.body.classList.toggle('light');
  document.getElementById('theme-btn').textContent=isLight?'☀️':'🌙';
  try{localStorage.setItem('agm_theme',isLight?'light':'dark');}catch(e){}
}

// ── 3-WAY TRADE ──────────────────────────────────────────────────────
function setTradeType(n){
  TRADE_TYPE=n;
  const col2=document.getElementById('trade-col-2');
  const wrap=document.getElementById('trade-sides-wrap');
  const toggle=document.getElementById('recv2-toggle');
  const btn2=document.getElementById('trade-2way-btn');
  const btn3=document.getElementById('trade-3way-btn');
  if(n===3){
    if(col2) col2.style.display='block';
    if(wrap) wrap.style.gridTemplateColumns='1fr 1fr 1fr';
    if(toggle) toggle.style.display='flex';
    btn2.style.background='transparent';btn2.style.color='var(--text3)';btn2.style.borderColor='var(--border2)';
    btn3.style.background='var(--accent)';btn3.style.color='var(--bg2)';btn3.style.borderColor='var(--accent)';
  } else {
    if(col2) col2.style.display='none';
    if(wrap) wrap.style.gridTemplateColumns='1fr 1fr';
    if(toggle) toggle.style.display='none';
    RP2=[];
    btn3.style.background='transparent';btn3.style.color='var(--text3)';btn3.style.borderColor='var(--border2)';
    btn2.style.background='var(--accent)';btn2.style.color='var(--bg2)';btn2.style.borderColor='var(--accent)';
  }
  renderTA();
}

function setActiveRecv(side){
  ACTIVE_RECV=side;
  const rb=document.getElementById('recv-btn');
  const r2b=document.getElementById('recv2-btn');
  if(rb&&r2b){
    rb.style.background=side==='recv'?'var(--accent)':'transparent';
    rb.style.color=side==='recv'?'var(--bg2)':'var(--text3)';
    rb.style.borderColor=side==='recv'?'var(--accent)':'var(--border)';
    r2b.style.background=side==='recv2'?'var(--accent)':'transparent';
    r2b.style.color=side==='recv2'?'var(--bg2)':'var(--text3)';
    r2b.style.borderColor=side==='recv2'?'var(--accent)':'var(--border)';
  }
}



// 1QB positional multipliers relative to Superflex
const QB_MULTS={QB:0.50,WR:1.15,RB:1.40,TE:0.50,PICK:1.00};

function getScore(d){
  if(!d) return 0;
  const isRookie = d.type==='player' && d.age && d.age <= 23 && d.rank >= 22;
  // Rookies and very young players get a premium — we trust Flock's upside ranking more
  // than the raw exponential decay suggests. Max +12% for youngest ranked rookies.
  const rookieBoost = isRookie ? Math.min(0.12, (24 - d.age) * 0.04) : 0;
  if(d.type==='pick' || SCORING==='SF'){
    return rookieBoost > 0
      ? Math.min(99.9, Math.round(d.score * (1 + rookieBoost) * 10) / 10)
      : d.score;
  }
  const base = Math.min(99.9, Math.round(d.score * (QB_MULTS[d.pos] || 1.0) * 10) / 10);
  return rookieBoost > 0
    ? Math.min(99.9, Math.round(base * (1 + rookieBoost) * 10) / 10)
    : base;
}

// Tier letter for a player/pick — unified 10-tier system (S through I) used
// EVERYWHERE: rankings page, roster modals, player cards, trade rec engine.
// Tight at the top so true elite players stand out, wider in the middle so
// pivotable trade targets cluster together. ~85% of ranked players land in
// tiers D–I.
function tierLetter(score){
  if(score>=90) return 'S'; // ~top 5
  if(score>=72) return 'A'; // ~top 13
  if(score>=55) return 'B'; // ~top 22
  if(score>=38) return 'C'; // ~top 30 — real RB1 / WR1 territory
  if(score>=25) return 'D'; // ~top 50
  if(score>=17) return 'E'; // ~top 75 — main trade-pivot cluster
  if(score>=10) return 'F'; // ~top 100
  if(score>=5)  return 'G'; // ~top 130
  if(score>=2)  return 'H'; // ~top 175
  return 'I';               // rest
}
function tierColor(letter){
  // S–H use distinct CSS tier-* classes; map to a coordinated palette so
  // text rendering matches the background pills shown on the rankings page.
  return {
    S:'#c8a030', A:'var(--accent)', B:'#5a9a5a', C:'#5a80c0',
    D:'#8060b0', E:'#a06060', F:'#8a6040', G:'#607060',
    H:'#706050', I:'var(--text3)'
  }[letter]||'var(--text3)';
}

function setScoring(mode){
  SCORING=mode;
  document.querySelectorAll('.scoring-btn').forEach(b=>{
    const active=b.getAttribute('data-s')===mode;
    b.style.background=active?'var(--accent)':'transparent';
    b.style.color=active?'var(--bg2)':'var(--text3)';
  });
  GP=[];RP=[];
  renderTable();
  renderTA();
  if(MODAL_DATA&&MODAL_DATA.length) reRenderLeague();
  // Re-render scoring-sensitive tabs
  const rookieEl=document.getElementById('rookies-content');
  if(rookieEl&&rookieEl.innerHTML) renderRookies();
  const moversEl=document.getElementById('movers-content');
  if(moversEl&&moversEl.innerHTML) renderMovers();
  if(SS_A&&SS_B) renderSSVerdict();
  // Re-render My Team if open (roster value + per-player scores depend on SCORING)
  if(typeof MY_TEAM_RID!=='undefined'&&MY_TEAM_RID&&MODAL_DATA&&MODAL_DATA.length){
    try{renderMyTeam(MY_TEAM_RID);}catch(e){}
  }
}

function showFlockRefresh(){
  const p=document.getElementById('flock-panel');
  p.style.display=p.style.display==='none'?'block':'none';
}

function processFlockRankings(){
  const raw=document.getElementById('flock-input').value.trim();
  if(!raw){document.getElementById('flock-status').textContent='Paste rankings first.';return;}
  const status=document.getElementById('flock-status');
  status.textContent='Parsing...';

  // Parse names from pasted text — handle numbered lists, CSV, newlines
  const lines=raw.split(/\n|,|;/).map(l=>l.trim()).filter(Boolean);
  const names=lines.map(l=>{
    // Strip rank numbers: "1. Josh Allen" or "1) Josh Allen" or "1 Josh Allen"
    return l.replace(/^\d+[\.\)\-\s]+/,'').trim();
  }).filter(n=>n.length>2);

  if(!names.length){status.textContent='Could not parse any names. Try a different format.';return;}

  // Match names to DATA entries
  const HARDCODED_RANKS=new Set(DATA.filter(d=>d.hardcoded).map(d=>d.rank));
  let matched=0, updated=0;
  const usedRanks=new Set();

  names.forEach((name,newRank0)=>{
    const newRank=newRank0+1;
    // Try exact match then normalized
    const norm=normName(name);
    const match=NM_EXACT[name.toLowerCase()]||NM_NORM[norm]||
      DATA.find(d=>d.type==='player'&&d.name.toLowerCase().includes(name.toLowerCase().split(' ').pop()));
    if(!match) return;
    matched++;
    // Don't touch hardcoded top-21
    if(HARDCODED_RANKS.has(match.rank)) return;
    usedRanks.add(match.rank);
    // Recalculate score based on new rank using our exponential formula
    // Score = 10000 * e^(-0.015*(rank-1)), normalized to 0-100
    const rawScore=10000*Math.exp(-0.015*(newRank-1));
    const maxRaw=10000; // rank 1
    const normScore=Math.min(59.9,(rawScore/maxRaw)*59.9); // non-hardcoded max = ~59.9
    match.score=Math.round(normScore*10)/10;
    match.rank=newRank;
    updated++;
  });

  // Rebuild lookup maps
  DATA.forEach(d=>{
    if(d.type==='player'){
      NM_EXACT[d.name.toLowerCase()]=d;
      NM_NORM[normName(d.name)]=d;
    }
  });

  status.style.color='var(--gt)';
  status.textContent=`✓ Matched ${matched}/${names.length} players. Updated ${updated} scores (top-21 preserved).`;
  renderTable();
  setTimeout(()=>{
    document.getElementById('flock-panel').style.display='none';
    document.getElementById('flock-input').value='';
    status.textContent='';
  },3000);
}

