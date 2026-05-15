// ── ROOKIE ADP TRACKER ────────────────────────────────────────────────
let ROOKIE_POS='ALL';

function setRookiePos(pos,btn){
  ROOKIE_POS=pos;
  document.querySelectorAll('.rookie-pos-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderRookies();
}

function renderRookies(){
  const el=document.getElementById('rookies-content');
  if(!el) return;

  const rookies=DATA.filter(d=>{
    if(d.type!=='player') return false;
    if((d.age||30)>23.9) return false;
    if(ROOKIE_POS!=='ALL'&&d.pos!==ROOKIE_POS) return false;
    return true;
  }).sort((a,b)=>getScore(b)-getScore(a));

  // Positional importance note for current scoring mode
  const posImportance={
    SF: {QB:'★★★★★ Elite in SF — can be QB1 just by existing.',WR:'★★★★ Premium. SF WRs still the deepest position.',RB:'★★★★ RBs age fast — youth is everything here.',TE:'★★★ Valuable but takes time to develop.'},
    '1QB':{QB:'★★★ Functional — only 1 starter needed.',WR:'★★★★★ Most valuable position in 1QB. Prioritize heavily.',RB:'★★★★★ #1 position in 1QB scoring. Top RBs are the prize.',TE:'★★★ Lower value than SF — stream unless elite.'}
  }[SCORING]||{};

  const posHeader=ROOKIE_POS!=='ALL'&&posImportance[ROOKIE_POS]?
    `<div style="background:rgba(192,120,72,0.08);border:1px solid var(--border);border-radius:var(--r8);padding:12px 16px;margin-bottom:16px;font-size:12px;color:var(--text2);line-height:1.6;">
      <strong style="color:var(--accent);font-family:Oswald,sans-serif;">${ROOKIE_POS} in ${SCORING}:</strong> ${posImportance[ROOKIE_POS]}
    </div>`:'';

  const sfScore=p=>getScore(p);
  const altScoring=SCORING==='SF'?'1QB':'SF';
  const altMults=SCORING==='SF'?QB_MULTS:{QB:1,WR:1,RB:1,TE:1,PICK:1};

  const rows=rookies.map((p,i)=>{
    const score=getScore(p);
    const altScore=p.type==='pick'?p.score:Math.min(99.9,Math.round(p.score*(altMults[p.pos]||1)*10)/10);
    const delta=score-altScore;
    // Direction-only indicator vs other scoring mode
    const deltaStr=Math.abs(delta)>1?` <span style="font-size:9px;color:${delta>0?'var(--gt)':'var(--rt)'};">${delta>0?'▲':'▼'} vs ${altScoring}</span>`:'';
    const pc=POS_COLORS[p.pos]||'var(--text)';
    const tier=tierLetter(score);
    const pid=SLEEPER_PID[normName(p.name)];
    const photo=pid?`<img src="https://sleepercdn.com/content/nfl/players/${pid}.jpg" style="width:34px;height:34px;border-radius:50%;object-fit:cover;object-position:top center;border:1px solid var(--border);" onerror="this.style.display='none'">`:`<div style="width:34px;height:34px;border-radius:50%;background:var(--bg3);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-family:Oswald,sans-serif;font-size:9px;color:${pc};">${p.pos}</div>`;
    const age=p.age||22;
    const ageBadge=age<21?`<span class="age-very-young">Age ${age}</span>`:age<22.5?`<span class="age-young">Age ${age}</span>`:`<span class="age-prospect">Age ${age}</span>`;
    return `<div class="rookie-row">
      <div class="rookie-rank">${i+1}</div>
      ${photo}
      <div>
        <div class="rookie-name">${p.name} <span class="pb2 pos-${p.pos}">${p.pos}</span></div>
        <div class="rookie-meta">${p.team==='FA'?'Pre-draft':p.team} · #${p.rank} Overall${deltaStr}</div>
      </div>
      ${ageBadge}
      <div class="rookie-score" style="color:${tierColor(tier)};">${tier}</div>
    </div>`;
  }).join('');

  const posImportanceAll=ROOKIE_POS==='ALL'?`<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:16px;">
    ${Object.entries(posImportance).map(([pos,txt])=>`<div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r6);padding:10px 14px;">
      <div style="font-family:Oswald,sans-serif;font-size:10px;font-weight:600;color:${POS_COLORS[pos]||'var(--text)'};margin-bottom:4px;">${pos} · ${SCORING}</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.5;">${txt}</div>
    </div>`).join('')}
  </div>`:posHeader;

  el.innerHTML=`${posImportanceAll}
  <div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r8);overflow:hidden;">
    <div style="font-family:Oswald,sans-serif;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:var(--text3);padding:8px 16px;background:var(--bg2);display:grid;grid-template-columns:34px 34px 1fr auto auto;gap:10px;">
      <span>#</span><span></span><span>Player</span><span></span><span>Value</span>
    </div>
    ${rows||`<div style="padding:30px;text-align:center;color:var(--text3);font-size:12px;">No prospects found at this position.</div>`}
  </div>`;
}

