// ── WIRE UP NEW PAGES ─────────────────────────────────────────────────

let TARGET_POS='RB';
function setTargetPos(pos,btn){
  TARGET_POS=pos;
  document.querySelectorAll('.target-pos-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderTargets();
}

function renderTargets(){
  const el=document.getElementById('targets-content');
  if(!el) return;
  const pos=TARGET_POS;
  const posColor=POS_COLORS[pos]||'var(--text)';
  if(!MODAL_DATA||!MODAL_DATA.length){
    const players=DATA.filter(d=>d.pos===pos&&d.type==='player').slice(0,20);
    el.innerHTML=`<div style="font-size:12px;color:var(--text3);margin-bottom:14px;">Load your Sleeper league for full analysis. Top ${pos}s by value:</div>
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r8);overflow:hidden;">
      ${players.map(p=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:1px solid rgba(37,40,54,0.4);">
        <div><div style="font-family:Oswald,sans-serif;font-size:13px;font-weight:600;color:var(--text);">${p.name} <span class="pb2 pos-${p.pos}">${p.pos}</span></div>
        <div style="font-size:10px;color:var(--text3);">${p.team} · Age ${p.age}</div></div>
        <div style="font-family:'Russo One',sans-serif;font-size:14px;color:${tierColor(tierLetter(getScore(p)))};">${tierLetter(getScore(p))}</div>
      </div>`).join('')}
      </div>`;
    return;
  }

  const leaguePosAvg=MODAL_DATA.reduce((s,r)=>{
    const best=r.all.filter(p=>p.pos===pos).sort((a,b)=>getScore(b)-getScore(a))[0];
    return s+(best?getScore(best):0);
  },0)/MODAL_DATA.length;

  const teams=MODAL_DATA.map(r=>{
    const pp=r.all.filter(p=>p.pos===pos).sort((a,b)=>getScore(b)-getScore(a));
    const topScore=pp[0]?getScore(pp[0]):0;
    const surplus=topScore-leaguePosAvg+(pp.slice(1).reduce((s,p)=>s+getScore(p)*0.4,0));
    return{owner:r.owner,players:pp,topScore,surplus,r};
  }).sort((a,b)=>b.surplus-a.surplus);

  const sellers=teams.filter(t=>t.surplus>8).slice(0,4);
  const buyers=teams.filter(t=>t.surplus<-4).slice(0,3);

  let html=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">`;

  html+=`<div><div style="font-family:Oswald,sans-serif;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:var(--text3);margin-bottom:10px;">Likely sellers</div>
    ${sellers.map(t=>{
      const fairScore=t.players[0]?getScore(t.players[0]):0;
      const fairReturn=DATA.filter(d=>d.type==='player'&&d.pos!==pos&&Math.abs(getScore(d)-fairScore)<fairScore*0.25)
        .sort((a,b)=>Math.abs(getScore(a)-fairScore)-Math.abs(getScore(b)-fairScore)).slice(0,3);
      return `<div class="target-team-card">
        <div class="target-team-head"><div class="target-team-name">${t.owner}</div>
        <span class="target-surplus ${t.surplus>20?'surplus-high':'surplus-med'}">${t.surplus>20?'Deep surplus':'Has depth'}</span></div>
        <div class="target-players">${t.players.slice(0,4).map(p=>`<span style="background:var(--bg3);border:1px solid rgba(220,136,136,0.4);color:var(--rb);font-family:Oswald,sans-serif;font-size:10px;padding:3px 8px;border-radius:3px;">${p.name.split(' ').pop()}</span>`).join('')}</div>
        <div class="target-ask">Fair ask: ${fairReturn.map(p=>p.name.split(' ').pop()).join(' · ')}</div>
      </div>`;
    }).join('')}
  </div>`;

  html+=`<div><div style="font-family:Oswald,sans-serif;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:var(--text3);margin-bottom:10px;">Buyers / needy teams</div>
    ${buyers.length?buyers.map(t=>{
      const offers=t.r.all.filter(p=>p.pos!==pos).sort((a,b)=>getScore(b)-getScore(a)).slice(0,4);
      return `<div class="target-team-card">
        <div class="target-team-head"><div class="target-team-name">${t.owner}</div>
        <span class="target-surplus" style="background:rgba(136,170,220,0.12);color:var(--qb);">Needs ${pos}</span></div>
        <div class="target-players">${offers.map(p=>`<span style="background:var(--bg3);border:1px solid var(--border);color:var(--text2);font-family:Oswald,sans-serif;font-size:10px;padding:3px 8px;border-radius:3px;">${p.name.split(' ').pop()} <span style="color:${POS_COLORS[p.pos]}">${p.pos}</span></span>`).join('')}</div>
        <div class="target-ask">Can offer: ${offers.slice(0,2).map(p=>p.name.split(' ').pop()).join(' + ')}</div>
      </div>`;
    }).join(''):`<div style="font-size:12px;color:var(--text3);padding:20px;">No obvious buyers at ${pos}.</div>`}
  </div></div>`;

  html+=`<div style="font-family:Oswald,sans-serif;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:var(--text3);margin-bottom:10px;">${pos} depth across all rosters</div>
  <div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r8);overflow:hidden;">
  ${MODAL_DATA.map(r=>{
    const pp=r.all.filter(p=>p.pos===pos).sort((a,b)=>getScore(b)-getScore(a));
    if(!pp.length) return `<div style="display:flex;align-items:center;gap:12px;padding:8px 16px;border-bottom:1px solid rgba(37,40,54,0.3);"><span style="font-family:Oswald,sans-serif;font-size:12px;color:var(--text);min-width:120px;">${r.owner}</span><span style="font-size:11px;color:var(--text3);">None rostered</span></div>`;
    const bar=Math.round((getScore(pp[0])/100)*100);
    return `<div style="display:flex;align-items:center;gap:12px;padding:8px 16px;border-bottom:1px solid rgba(37,40,54,0.3);">
      <span style="font-family:Oswald,sans-serif;font-size:12px;color:var(--text);min-width:120px;">${r.owner}</span>
      <div style="flex:1;height:4px;background:var(--border);border-radius:2px;"><div style="width:${bar}%;height:100%;background:${posColor};border-radius:2px;"></div></div>
      <span style="font-family:Oswald,sans-serif;font-size:11px;color:var(--text2);min-width:200px;text-align:right;">${pp.slice(0,3).map(p=>p.name.split(' ').pop()).join(', ')}</span>
    </div>`;
  }).join('')}</div>`;
  el.innerHTML=html;
}

