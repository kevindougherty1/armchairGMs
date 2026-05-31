// ── DEEPER ROSTER CONSTRUCTION ────────────────────────────────────────
function showRosterBreakdown(rosterIdx){
  const r=MODAL_DATA[rosterIdx];if(!r)return;
  const modal=document.getElementById('roster-modal');
  const title=document.getElementById('modal-team-name');
  const body=document.getElementById('modal-body');
  if(!modal||!title||!body)return;
  title.textContent=`${r.owner} — Roster Analysis`;

  // ── POSITIONAL RANKINGS (vs whole league) ──
  const POSITIONS_PR=['QB','WR','RB','TE'];
  function posTotal(roster,pos){return roster.all.filter(p=>p.pos===pos).reduce((s,p)=>s+getScore(p),0);}
  function pickTotal(roster){return (roster.picks||[]).reduce((s,pk)=>{const m=DATA.find(d=>d.type==='pick'&&d.year===pk.season&&d.round===pk.round);return s+(m?getScore(m):0);},0);}
  let posRankSection='';
  if(MODAL_DATA&&MODAL_DATA.length>1){
    const posRankings=[...POSITIONS_PR,'PICK'].map(pos=>{
      const ranked=[...MODAL_DATA].sort((a,b)=>(pos==='PICK'?pickTotal(b)-pickTotal(a):posTotal(b,pos)-posTotal(a,pos)));
      const myRank=ranked.findIndex(x=>x.owner===r.owner)+1;
      const myVal=pos==='PICK'?pickTotal(r):posTotal(r,pos);
      const maxVal=ranked[0]?(pos==='PICK'?pickTotal(ranked[0]):posTotal(ranked[0],pos)):1;
      const pct=maxVal>0?Math.round((myVal/maxVal)*100):0;
      const posColor=pos==='QB'?'var(--qb)':pos==='WR'?'var(--wr)':pos==='RB'?'var(--rb)':pos==='TE'?'var(--te)':'var(--pick)';
      return {pos,rank:myRank,val:myVal.toFixed(1),pct,posColor};
    });
    const posRankHtml=posRankings.map(pr=>'<div style="display:grid;grid-template-columns:44px 1fr 36px 24px;align-items:center;gap:8px;margin-bottom:7px;">'
      +'<span class="pb2 pos-'+pr.pos+'" style="font-size:9px;text-align:center;">'+pr.pos+'</span>'
      +'<div style="position:relative;height:8px;background:var(--border);border-radius:4px;overflow:hidden;"><div style="position:absolute;left:0;top:0;height:100%;width:'+pr.pct+'%;background:'+pr.posColor+';border-radius:4px;opacity:0.8;"></div></div>'
      +'<div style="font-family:Oswald,sans-serif;font-weight:700;font-size:12px;color:'+pr.posColor+';text-align:right;">'+pr.val+'</div>'
      +'<div style="font-family:Oswald,sans-serif;font-size:10px;color:var(--text3);text-align:right;">#'+pr.rank+'</div>'
      +'</div>').join('');
    posRankSection='<div style="border-top:1px solid var(--border);">'
      +'<div onclick="var b=this.nextElementSibling;var a=this.querySelector(\'.pos-arr\');b.style.display=b.style.display===\'none\'?\'block\':\'none\';a.textContent=b.style.display===\'none\'?\'▼\':\'▲\';" style="display:flex;align-items:center;justify-content:space-between;padding:10px 20px;cursor:pointer;background:var(--bg2);">'
      +'<div style="font-family:Oswald,sans-serif;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:var(--text3);">Positional League Rankings</div>'
      +'<span class="pos-arr" style="font-family:Oswald,sans-serif;font-size:11px;color:var(--accent);">▼</span>'
      +'</div>'
      +'<div style="display:none;padding:12px 20px;background:var(--bg3);">'
      +'<div style="display:grid;grid-template-columns:44px 1fr 36px 24px;gap:8px;margin-bottom:6px;font-family:Oswald,sans-serif;font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:var(--text3);"><div></div><div>Value</div><div style=\"text-align:right;\">Total</div><div style=\"text-align:right;\">Rank</div></div>'
      +posRankHtml
      +'<div style="font-size:10px;color:var(--text3);font-family:Oswald,sans-serif;margin-top:6px;">Ranked among '+MODAL_DATA.length+' teams by total positional value</div>'
      +'</div></div>';
  }

  const POSS=['QB','WR','RB','TE'];
  const posAvg={};
  POSS.forEach(pos=>{
    posAvg[pos]=MODAL_DATA.reduce((s,r2)=>{
      const best=r2.all.filter(p=>p.pos===pos).sort((a,b)=>getScore(b)-getScore(a))[0];
      return s+(best?getScore(best):0);
    },0)/MODAL_DATA.length;
  });
  const posRows=POSS.map(pos=>{
    const players=r.all.filter(p=>p.pos===pos).sort((a,b)=>getScore(b)-getScore(a));
    const best=players[0];const score=best?getScore(best):0;const avg=posAvg[pos]||1;
    const pct=Math.min(100,Math.round((score/Math.max(avg*1.5,score))*100));
    const pc=POS_COLORS[pos]||'var(--text)';const vsAvg=score-avg;
    const vc=vsAvg>5?'var(--gt)':vsAvg<-5?'var(--rt)':'var(--gold)';
    const depth=players.length;
    const grade=score>=avg*1.3?'A':score>=avg*1.05?'B':score>=avg*0.85?'C':score>=avg*0.65?'D':'F';
    return `<div class="rb-pos-row">
      <div style="font-family:Oswald,sans-serif;font-size:12px;font-weight:600;color:${pc};">${pos}</div>
      <div><div style="font-family:Oswald,sans-serif;font-size:12px;color:var(--text);">${best?best.name:'None'}</div>
      <div class="rb-bar-wrap" style="margin-top:4px;"><div class="rb-bar-fill" style="width:${pct}%;background:${pc};opacity:0.7;"></div></div>
      <div style="font-size:10px;color:var(--text3);margin-top:2px;">${depth} rostered · <span style="color:${vc};">${vsAvg>0?'Above':vsAvg<-5?'Below':'Near'} league avg</span></div></div>
      <div class="dg-grade dg-grade-${grade}" style="font-size:14px;">${grade}</div>
    </div>`;
  }).join('');
  const holes=POSS.filter(pos=>{const b=r.all.filter(p=>p.pos===pos).sort((a,b2)=>getScore(b2)-getScore(a))[0];return !b||getScore(b)<posAvg[pos]*0.75;});
  const strengths=POSS.filter(pos=>{const players=r.all.filter(p=>p.pos===pos);const cnt=players.filter(p=>getScore(p)>=posAvg[pos]*1.1).length;return cnt>=2;});
  const ageCounts={young:0,peak:0,old:0};
  r.all.slice(0,10).forEach(p=>{const pk={QB:30,WR:27,RB:25,TE:28}[p.pos]||27;const age=p.age||pk;if(age<pk-2)ageCounts.young++;else if(age<=pk+1)ageCounts.peak++;else ageCounts.old++;});
  const tradeTargets=holes.length?holes.map(pos=>{
    const top=DATA.filter(d=>d.pos===pos&&d.type==='player').slice(0,3);
    return `<div style="margin-bottom:8px;"><span style="font-family:Oswald,sans-serif;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:${POS_COLORS[pos]};margin-right:6px;">${pos}</span>${top.map(p=>p.name).join(', ')}</div>`;
  }).join(''):'<div style="font-size:12px;color:var(--gt);">No major holes.</div>';

  let html=posRankSection+`<div style="padding:8px 20px 0;"><div style="font-family:Oswald,sans-serif;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:var(--text3);margin-bottom:4px;">Full Roster</div></div>`;

  const posOrder={QB:0,WR:1,RB:2,TE:3};
  const sorted=[...r.all].sort((a,b)=>(posOrder[a.pos]??9)-(posOrder[b.pos]??9)||getScore(b)-getScore(a));
  let playerHtml='';let curPos='';
  sorted.forEach(p=>{
    if(p.pos!==curPos){curPos=p.pos;playerHtml+=`<div class="modal-section">${p.pos}</div>`;}
    const pid=p.sleeper_id||SLEEPER_PID[normName(p.name)];
    const pc=POS_COLORS[p.pos]||'var(--text3)';
    const photo=pid?`<img style="width:36px;height:36px;border-radius:50%;object-fit:cover;object-position:top center;border:1px solid var(--border);" src="https://sleepercdn.com/content/nfl/players/${pid}.jpg" onerror="this.style.display='none'">`:`<div style="width:36px;height:36px;border-radius:50%;background:var(--bg3);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-family:Oswald,sans-serif;font-size:10px;color:${pc};">${p.pos}</div>`;
    playerHtml+=`<div class="modal-player-row" onclick="selectFromModal(${p.rank})" style="cursor:pointer;">${photo}<div style="flex:1;"><div class="modal-player-name" style="text-decoration:underline;text-decoration-color:rgba(176,96,48,0.3);text-underline-offset:2px;">${p.name}</div><div class="modal-player-meta">${p.team==='FA'?'Free Agent':p.team}${p.age?' · Age '+p.age:''}</div></div><div class="modal-player-score" style="color:${tierColor(tierLetter(getScore(p)))};font-family:'Russo One',sans-serif;">${tierLetter(getScore(p))}</div><div style="color:var(--border2);font-size:12px;margin-left:4px;">›</div></div>`;
  });
  const picks=(r.picks||[]).slice().sort((a,b)=>a.season-b.season||a.round-b.round);

  if(picks.length){
    playerHtml+=`<div class="modal-section">Draft Capital</div>`;
    // Build roster_id → owner name map from MODAL_DATA
    const ridToOwner={};
    MODAL_DATA.forEach(md=>{ 
      if(md.rid!==undefined){ 
        ridToOwner[md.rid]=md.owner;
        ridToOwner[parseInt(md.rid)]=md.owner;
        ridToOwner[String(md.rid)]=md.owner;
      }
    });
    picks.forEach(pk=>{
      const slot='Mid';
      const tier=tierLetter(pk.matchedScore||0);
      const rd=pk.round;
      const yr=pk.season;
      const rdLabel=rd===1?'1st':rd===2?'2nd':rd===3?'3rd':'4th';
      // Only 2027 picks have a meaningful slot projection — see trade-search.js
      const pickLabel=yr===2027?`${yr} ${rdLabel} · ${slot}`:`${yr} ${rdLabel}`;
      const pc=pickColor(rd);
      const origRid=pk._orig;
      const origOwner=(origRid!==undefined&&origRid!==r.rid)?ridToOwner[origRid]:null;
      const meta=origOwner?`via ${origOwner.split(' ')[0]}`:'Dynasty Pick';
      playerHtml+=`<div class="modal-player-row"><div style="width:36px;height:36px;border-radius:50%;background:rgba(155,138,191,0.12);border:1px solid ${pc};display:flex;align-items:center;justify-content:center;font-family:Oswald,sans-serif;font-size:9px;font-weight:600;color:${pc};flex-shrink:0;">R${rd}</div><div style="flex:1;"><div class="modal-player-name" style="color:${pc};">${pickLabel}</div><div class="modal-player-meta">${meta}</div></div><div class="modal-player-score" style="color:${tierColor(tier)};font-family:'Russo One',sans-serif;">${tier}</div></div>`;
    });
  }
  body.innerHTML=html+playerHtml;
  document.getElementById('modal-total').textContent=(r.all.reduce((s,p)=>s+getScore(p),0)+(r.pickVal||0)).toFixed(1);
  modal.style.display='flex';
}

// ── ROSTER NEEDS CONTEXT (Trade Page) ────────────────────────────────
function renderRosterNeedsContext(){
  const wrap=document.getElementById('roster-needs-ctx');
  const el=document.getElementById('roster-needs-rows');
  if(!el||!MODAL_DATA||!MODAL_DATA.length){if(wrap)wrap.style.display='none';return;}
  wrap.style.display='block';
  const POSITIONS=['QB','WR','RB','TE'];
  const posAvg={};
  POSITIONS.forEach(pos=>{
    posAvg[pos]=MODAL_DATA.reduce((s,r2)=>{const b=r2.all.filter(p=>p.pos===pos).sort((a,b2)=>getScore(b2)-getScore(a))[0];return s+(b?getScore(b):0);},0)/MODAL_DATA.length;
  });
  const rows=MODAL_DATA.slice(0,14).map(r=>{
    const holes=POSITIONS.filter(pos=>{const b=r.all.filter(p=>p.pos===pos).sort((a,b2)=>getScore(b2)-getScore(a))[0];return !b||getScore(b)<posAvg[pos]*0.8;});
    const sur=POSITIONS.filter(pos=>{const pp=r.all.filter(p=>p.pos===pos);return pp.filter(p=>getScore(p)>=posAvg[pos]*1.1).length>=2;});
    if(!holes.length&&!sur.length) return '';
    return `<div style="padding:7px 0;border-bottom:1px solid rgba(37,40,54,0.4);">
      <span style="font-family:Oswald,sans-serif;font-size:12px;font-weight:600;color:var(--text);">${r.owner}</span>
      ${holes.map(p=>`<span style="font-family:Oswald,sans-serif;font-size:10px;background:rgba(220,136,136,0.1);color:var(--rt);padding:1px 7px;border-radius:3px;margin-left:5px;">needs ${p}</span>`).join('')}
      ${sur.map(p=>`<span style="font-family:Oswald,sans-serif;font-size:10px;background:rgba(118,196,144,0.1);color:var(--gt);padding:1px 7px;border-radius:3px;margin-left:5px;">surplus ${p}</span>`).join('')}
    </div>`;
  }).filter(Boolean).join('');
  el.innerHTML=rows||'<div style="font-size:11px;color:var(--text3);">No clear imbalances found.</div>';
}

