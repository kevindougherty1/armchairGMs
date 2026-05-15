// ── VALUE MOVERS ──────────────────────────────────────────────────────
const MOVERS_LS='agm_score_snapshot';

function saveMoversSnapshot(){
  const snap={};
  DATA.forEach(d=>{ if(d.type==='player') snap[d.rank]=getScore(d); });
  try{localStorage.setItem(MOVERS_LS,JSON.stringify({scores:snap,ts:Date.now(),mode:SCORING}));}catch(e){}
  renderMovers();
}

function clearMoversSnapshot(){
  try{localStorage.removeItem(MOVERS_LS);}catch(e){}
  renderMovers();
}

function renderMovers(){
  const el=document.getElementById('movers-content');
  const meta=document.getElementById('movers-meta');
  if(!el) return;

  let snap=null;
  try{snap=JSON.parse(localStorage.getItem(MOVERS_LS)||'null');}catch(e){}

  if(!snap){
    meta.textContent='No snapshot saved. Hit "Save Snapshot" to start tracking changes.';
    el.innerHTML=`<div style="text-align:center;padding:40px;color:var(--text3);font-size:13px;">Save a snapshot now to start tracking value changes over time.</div>`;
    return;
  }

  const d=new Date(snap.ts);
  const age=Math.round((Date.now()-snap.ts)/(1000*60*60));
  meta.textContent=`Snapshot from ${d.toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})} (${age}h ago) · ${snap.mode} scoring`;

  // Compare current scores to snapshot
  const changes=DATA.filter(d=>d.type==='player'&&snap.scores[d.rank]!==undefined)
    .map(d=>{
      const now=getScore(d);
      const then=snap.scores[d.rank];
      const delta=Math.round((now-then)*10)/10;
      return{...d,now,then,delta};
    })
    .filter(d=>Math.abs(d.delta)>=0.5)
    .sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta));

  const risers=changes.filter(d=>d.delta>0).slice(0,15);
  const fallers=changes.filter(d=>d.delta<0).slice(0,15);

  const makeRows=(players,up)=>players.map(p=>{
    const pc=POS_COLORS[p.pos]||'var(--text)';
    const dc=up?'var(--gt)':'var(--rt)';
    const arrow=up?'▲':'▼';
    const tier=tierLetter(p.now);
    return `<div class="mover-row">
      <div>
        <div style="font-family:Oswald,sans-serif;font-size:13px;font-weight:600;color:var(--text);">${p.name} <span class="pb2 pos-${p.pos}">${p.pos}</span></div>
        <div style="font-size:10px;color:var(--text3);">${p.team==='FA'?'Free Agent':p.team} · Age ${p.age} · #${p.rank} Overall</div>
      </div>
      <div style="font-family:'Russo One',sans-serif;font-size:14px;color:${tierColor(tier)};">${tier}</div>
      <div class="mover-delta" style="color:${dc};">${arrow}</div>
    </div>`;
  }).join('');

  el.innerHTML=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
    <div>
      <div style="font-family:Oswald,sans-serif;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:var(--gt);margin-bottom:8px;">Rising ▲</div>
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r8);overflow:hidden;">
        ${risers.length?makeRows(risers,true):'<div style="padding:20px;text-align:center;color:var(--text3);font-size:12px;">No risers since snapshot.</div>'}
      </div>
    </div>
    <div>
      <div style="font-family:Oswald,sans-serif;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:var(--rt);margin-bottom:8px;">Falling ▼</div>
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r8);overflow:hidden;">
        ${fallers.length?makeRows(fallers,false):'<div style="padding:20px;text-align:center;color:var(--text3);font-size:12px;">No fallers since snapshot.</div>'}
      </div>
    </div>
  </div>`;
}

