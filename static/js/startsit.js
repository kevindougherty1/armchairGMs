// ── START / SIT ───────────────────────────────────────────────────────
let SS_A=null, SS_B=null;

function ssSearch(side){
  const q=document.getElementById(`ss-${side}-search`).value.toLowerCase().trim();
  const res=document.getElementById(`ss-${side}-results`);
  if(!q||q.length<2){res.style.display='none';return;}
  const matches=DATA.filter(d=>d.type==='player'&&d.name.toLowerCase().includes(q)).slice(0,8);
  if(!matches.length){res.style.display='none';return;}
  res.style.display='block';
  res.innerHTML=matches.map(p=>{
    const pc=POS_COLORS[p.pos]||'var(--text)';
    const tier=tierLetter(getScore(p));
    return `<div style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;" onclick="ssSelect('${side}',${p.rank})">
      <div><div style="font-family:Oswald,sans-serif;font-size:12px;font-weight:600;color:var(--text);">${p.name} <span class="pb2 pos-${p.pos}">${p.pos}</span></div>
      <div style="font-size:10px;color:var(--text3);">${p.team} · Age ${p.age}</div></div>
      <div style="font-family:'Russo One',sans-serif;font-size:13px;color:${tierColor(tier)};">${tier}</div>
    </div>`;
  }).join('');
}

function ssSelect(side,rank){
  const p=DATA.find(d=>d.rank===rank);
  if(!p) return;
  if(side==='a') SS_A=p; else SS_B=p;
  document.getElementById(`ss-${side}-search`).value=p.name;
  document.getElementById(`ss-${side}-results`).style.display='none';
  renderSSCard(side,p);
  if(SS_A&&SS_B) renderSSVerdict();
}

function renderSSCard(side,p){
  const pc=POS_COLORS[p.pos]||'var(--text)';
  const score=getScore(p);
  const pid=SLEEPER_PID[normName(p.name)];
  const photo=pid?`<img src="https://sleepercdn.com/content/nfl/players/${pid}.jpg" style="width:44px;height:44px;border-radius:50%;object-fit:cover;object-position:top center;border:1px solid var(--border);flex-shrink:0;" onerror="this.style.display='none'">`:'';
  // Position-specific context
  const posCtx={
    QB:`Scoring mode: ${SCORING}. ${SCORING==='SF'?'Superflex — QBs are premium.':'1QB — QBs are functional starters only.'}`,
    WR:`Projected PPG tier: ${score>70?'Elite WR1':score>40?'WR1/2 range':score>20?'WR2/3':score>10?'Flex/depth':'Fringe'}.`,
    RB:`Projected PPG tier: ${score>70?'Elite RB1':score>40?'RB1/2 range':score>20?'RB2/3':score>10?'Flex':'Fringe'}.`,
    TE:`TE positional context: ${score>50?'Elite TE — positional advantage':score>25?'Solid starter':score>10?'Streamable':'Bench/stash'}.`
  }[p.pos]||'';
  document.getElementById(`ss-${side}-card`).innerHTML=`<div class="ss-card">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
      ${photo}
      <div style="flex:1;">
        <div class="ss-name">${p.name} <span class="pb2 pos-${p.pos}">${p.pos}</span></div>
        <div class="ss-meta">${p.team==='FA'?'Free Agent':p.team} · Age ${p.age||'?'} · #${p.rank} Overall</div>
      </div>
      <div class="ss-score" style="color:${tierColor(tierLetter(score))};">${tierLetter(score)}</div>
    </div>
    ${posCtx?`<div style="font-size:11px;color:var(--text3);line-height:1.5;padding-top:8px;border-top:1px solid var(--border);">${posCtx}</div>`:''}
  </div>`;
}

function renderSSVerdict(){
  if(!SS_A||!SS_B) return;
  const va=getScore(SS_A), vb=getScore(SS_B);
  const winner=va>=vb?SS_A:SS_B;
  const loser=va>=vb?SS_B:SS_A;
  const diff=Math.abs(va-vb);
  const pc=POS_COLORS[winner.pos]||'var(--accent)';
  const clarity=diff>20?'Clear start.':diff>8?'Lean start.':diff>3?'Slight edge.':'Coin flip.';
  const el=document.getElementById('ss-verdict');
  el.style.display='block';

  // Position mismatch warning
  let warning='';
  if(SS_A.pos!==SS_B.pos) warning=`<div style="font-size:11px;color:var(--gold);margin-top:8px;font-family:Oswald,sans-serif;">⚠ Different positions — make sure both fit your lineup slots.</div>`;

  // Trend / age context
  const ageCtx=winner.age&&winner.age>=30?` (age ${winner.age} — verify no recent news)`:'';

  el.innerHTML=`<div style="text-align:center;margin-bottom:14px;">
    <div style="font-family:Oswald,sans-serif;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:var(--text3);margin-bottom:6px;">Start</div>
    <div style="font-family:'Russo One',sans-serif;font-size:22px;color:${pc};">${winner.name}${ageCtx}</div>
    <div style="font-family:Oswald,sans-serif;font-size:13px;color:var(--text2);margin-top:4px;">${clarity} Over ${loser.name.split(' ').pop()}.</div>
    ${warning}
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
    <div style="background:var(--bg3);border:1px solid ${va>=vb?'var(--gt)':'var(--border)'};border-radius:var(--r6);padding:10px;text-align:center;">
      <div style="font-family:Oswald,sans-serif;font-size:11px;font-weight:600;color:var(--text);margin-bottom:4px;">${SS_A.name.split(' ').pop()}</div>
      <div style="font-family:'Russo One',sans-serif;font-size:20px;color:${tierColor(tierLetter(va))};">${tierLetter(va)}</div>
      <div style="font-size:10px;color:var(--text3);margin-top:2px;">${SS_A.pos} · ${SS_A.team}</div>
    </div>
    <div style="background:var(--bg3);border:1px solid ${vb>va?'var(--gt)':'var(--border)'};border-radius:var(--r6);padding:10px;text-align:center;">
      <div style="font-family:Oswald,sans-serif;font-size:11px;font-weight:600;color:var(--text);margin-bottom:4px;">${SS_B.name.split(' ').pop()}</div>
      <div style="font-family:'Russo One',sans-serif;font-size:20px;color:${tierColor(tierLetter(vb))};">${tierLetter(vb)}</div>
      <div style="font-size:10px;color:var(--text3);margin-top:2px;">${SS_B.pos} · ${SS_B.team}</div>
    </div>
  </div>`;
}

