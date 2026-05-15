// ── DRAFT GRADES ──────────────────────────────────────────────────────
function gradeDraft(){
  const raw=document.getElementById('dg-input').value.trim();
  const teams=parseInt(document.getElementById('dg-teams').value)||12;
  const mySlot=parseInt(document.getElementById('dg-slot').value)||0;
  const el=document.getElementById('dg-results');
  if(!raw||!el) return;
  const lines=raw.split('\n').map(l=>l.trim()).filter(Boolean);
  const picks=lines.map((l,i)=>{
    const m=l.match(/^(\d+)[.\-](\d{1,2})\s+(.+)$/);
    let round,pick,name;
    if(m){round=parseInt(m[1]);pick=parseInt(m[2]);name=m[3].trim();}
    else{round=Math.floor(i/teams)+1;pick=(i%teams)+1;name=l.replace(/^\d+[\.\)]\s*/,'').trim();}
    const overall=((round-1)*teams)+pick;
    const norm=normName(name);
    const player=NM_EXACT[name.toLowerCase()]||NM_NORM[norm]||
      DATA.find(d=>d.type==='player'&&name.length>3&&d.name.toLowerCase().includes(name.toLowerCase().split(' ').pop()));
    return{round,pick,overall,name,player,isMyPick:mySlot>0&&pick===mySlot};
  });
  if(!picks.length){el.innerHTML='<div style="color:var(--text3);padding:20px;">No picks parsed.</div>';return;}
  const sorted=DATA.filter(d=>d.type==='player').sort((a,b)=>getScore(b)-getScore(a));
  const graded=picks.map(pk=>{
    if(!pk.player) return{...pk,grade:'?',gradeClass:'dg-grade-C',diff:0,ev:0,score:0};
    const ev=getScore(sorted[Math.max(0,pk.overall-1)])||1;
    const score=getScore(pk.player);
    const pct=(score-ev)/ev;
    let grade,gradeClass;
    if(pct>0.25){grade='S';gradeClass='dg-grade-S';}
    else if(pct>0.10){grade='A';gradeClass='dg-grade-A';}
    else if(pct>-0.08){grade='B';gradeClass='dg-grade-B';}
    else if(pct>-0.20){grade='C';gradeClass='dg-grade-C';}
    else if(pct>-0.35){grade='D';gradeClass='dg-grade-D';}
    else{grade='F';gradeClass='dg-grade-F';}
    return{...pk,grade,gradeClass,diff:Math.round((score-ev)*10)/10,ev:Math.round(ev*10)/10,score:Math.round(score*10)/10};
  });
  const g2=graded.filter(p=>p.player);
  const avgDiff=g2.length?g2.reduce((s,p)=>s+p.diff,0)/g2.length:0;
  const steals=g2.filter(p=>p.diff>5).length;
  const reaches=g2.filter(p=>p.diff<-5).length;
  const og=avgDiff>8?'S':avgDiff>3?'A':avgDiff>-3?'B':avgDiff>-8?'C':avgDiff>-15?'D':'F';
  el.innerHTML=`<div class="dg-summary">
    <div class="dg-stat"><div class="dg-stat-v dg-grade-${og}">${og}</div><div class="dg-stat-l">Draft Grade</div></div>
    <div class="dg-stat"><div class="dg-stat-v">${avgDiff>0?'+':''}${avgDiff.toFixed(1)}</div><div class="dg-stat-l">Avg Val/Pick</div></div>
    <div class="dg-stat"><div class="dg-stat-v" style="color:var(--gt);">${steals}</div><div class="dg-stat-l">Value picks</div></div>
    <div class="dg-stat"><div class="dg-stat-v" style="color:var(--rt);">${reaches}</div><div class="dg-stat-l">Reaches</div></div>
  </div>
  <div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r8);overflow:hidden;">
    <div style="font-family:Oswald,sans-serif;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:var(--text3);padding:8px 16px;background:var(--bg2);display:grid;grid-template-columns:52px 1fr 60px 60px 30px;gap:12px;">
      <span>Pick</span><span>Player</span><span>Score</span><span>ADP val</span><span></span>
    </div>
    ${graded.map(pk=>{
      const pc=pk.player?POS_COLORS[pk.player.pos]||'var(--text)':'var(--text3)';
      const dc=pk.diff>2?'var(--gt)':pk.diff<-2?'var(--rt)':'var(--text3)';
      return `<div class="dg-pick" style="${pk.isMyPick?'background:rgba(192,120,72,0.06);':''}">
        <span class="dg-slot">${pk.round}.${String(pk.pick).padStart(2,'0')}${pk.isMyPick?' ★':''}</span>
        <div><div class="dg-player">${pk.player?pk.player.name:pk.name}${pk.player?` <span class="pb2 pos-${pk.player.pos}">${pk.player.pos}</span>`:''}</div>
        <div style="font-size:10px;color:var(--text3);">${pk.player?pk.player.team+' · Age '+(pk.player.age||'?'):'Not found in DB'}${pk.diff?` <span style="color:${dc}">${pk.diff>0?'+':''}${pk.diff}</span>`:''}</div></div>
        <span style="font-family:'Russo One',sans-serif;font-size:13px;color:${pc};">${pk.score||'—'}</span>
        <span style="font-size:11px;color:var(--text3);">${pk.ev||'—'}</span>
        <span class="dg-grade ${pk.gradeClass}">${pk.grade}</span>
      </div>`;
    }).join('')}
  </div>`;
}

