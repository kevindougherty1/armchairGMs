function clearTrade(){GP=[];RP=[];RP2=[];renderTA();}

function ttag(d,s){
  const av=avatarHtml(d,22);
  const tier=tierLetter(getScore(d));
  return `<div class="ttag"><div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0;">${av}<div class="ttn">${(d.displayName||d.name).split(' ').pop()}</div></div><div style="display:flex;align-items:center;gap:3px;flex-shrink:0;"><span class="tts" style="color:${tierColor(tier)};font-family:'Russo One',sans-serif;">${tier}</span><span class="trm" onclick="remT(${d.rank},'${s}')">×</span></div></div>`;
}

function tradeTagFull(d,side){
  const owner=window._playerOwner&&d.type==='player'?window._playerOwner[normName(d.name)]:'';
  const ownerLine=owner?`<div style="font-size:9px;color:var(--accent);font-family:'Oswald',sans-serif;margin-top:1px;">🏈 ${owner}</div>`:'';
  const posCol=d.type==='pick'?'var(--pick)':(POS_COLORS&&POS_COLORS[d.pos])||'var(--accent)';
  return `<div class="ttag" style="margin-bottom:5px;padding:7px 10px 7px 11px;border-left:3px solid ${posCol};">
    <div style="flex:1;min-width:0;">
      <div class="ttn" style="max-width:160px;font-size:12px;">${d.displayName||d.name}</div>
      <div style="font-size:9px;color:var(--text3);font-family:'Oswald',sans-serif;letter-spacing:0.06em;margin-top:1px;">
        <span style="color:${posCol};font-weight:600;">${d.pos}</span>
        ${d.team&&d.team!=='FA'?' · '+d.team:''}
      </div>
      ${ownerLine}
    </div>
    <span class="trm" onclick="remT(${d.rank},'${side}')">×</span>
  </div>`;
}

function renderTA(){
  const gt=GP.reduce((s,d)=>s+getScore(d),0);
  const rt=RP.reduce((s,d)=>s+getScore(d),0);
  const rt2=RP2.reduce((s,d)=>s+getScore(d),0);

  // Quick trade sidebar
  const gq=document.getElementById('glq'),rq=document.getElementById('rlq');
  if(gq)gq.innerHTML=GP.length?GP.map(d=>ttag(d,'give')).join(''):'<div class="tre">Click + Give</div>';
  if(rq)rq.innerHTML=RP.length?RP.map(d=>ttag(d,'recv')).join(''):'<div class="tre">Click + Recv</div>';
  const tot2=gt+rt,dif2=rt-gt,abs2=Math.abs(dif2).toFixed(1);
  setV('q',gt,rt,tot2,dif2,abs2);

  // Full trade page
  const gf=document.getElementById('glf'),rf=document.getElementById('rlf'),r2f=document.getElementById('r2lf');
  if(gf)gf.innerHTML=GP.length?GP.map(d=>tradeTagFull(d,'give')).join(''):'<div class="trade-empty-drop">Search below to add pieces you\'d send</div>';
  if(rf)rf.innerHTML=RP.length?RP.map(d=>tradeTagFull(d,'recv')).join(''):'<div class="trade-empty-drop">Search below to add pieces you\'d receive</div>';
  if(r2f)r2f.innerHTML=RP2.length?RP2.map(d=>tradeTagFull(d,'recv2')).join(''):'<div class="trade-empty-drop">Add Team C\'s pieces</div>';

  // Team labels in column headers — show only piece count, no numbers
  const ta=document.getElementById('team-a-total'),tb=document.getElementById('team-b-total'),tc=document.getElementById('team-c-total');
  if(ta)ta.textContent=GP.length?`${GP.length} ${GP.length===1?'piece':'pieces'}`:'—';
  if(tb)tb.textContent=RP.length?`${RP.length} ${RP.length===1?'piece':'pieces'}`:'—';
  if(tc)tc.textContent=RP2.length?`${RP2.length} ${RP2.length===1?'piece':'pieces'}`:'—';

  if(TRADE_TYPE===2){
    setV('f',gt,rt,gt+rt,dif2,abs2);
  } else {
    // 3-way: combine RP + RP2 as "you receive" for the scale visualization.
    // The user is on Team A, evaluating fairness vs the combined return.
    const combinedRecv=rt+rt2;
    const combinedDif=combinedRecv-gt;
    const combinedCount=RP.length+RP2.length;
    renderScale(GP.length, combinedCount, combinedDif);
  }
}


function setV(id,gt,rt,tot,dif,abs){
  // The quick-trade sidebar (id='q') uses the old simple bar style
  if(id==='q'){
    const gte=document.getElementById('gtq'),rte=document.getElementById('rtq');
    const vg=document.getElementById('vgq'),vr=document.getElementById('vrq'),vt=document.getElementById('vtq');
    if(gte)gte.textContent=GP.length?`${GP.length} ${GP.length===1?'piece':'pieces'}`:'—';
    if(rte)rte.textContent=RP.length?`${RP.length} ${RP.length===1?'piece':'pieces'}`:'—';
    if(!GP.length||!RP.length){
      if(vg){vg.style.width='50%';vr.style.width='50%';}
      if(vt)vt.innerHTML='<span style="color:var(--text3)">Add pieces to both sides</span>';
      return;
    }
    const gp=tot>0?Math.round((gt/tot)*100):50;
    if(vg){vg.style.width=gp+'%';vr.style.width=(100-gp)+'%';}
    if(vt){
      if(dif>15)vt.innerHTML=`<span class="vwin">Heavily favors you.</span>`;
      else if(dif>5)vt.innerHTML=`<span class="vwin">Slight edge your way.</span>`;
      else if(dif>=-5)vt.innerHTML=`<span class="veven">Even — fair trade.</span>`;
      else if(dif>=-15)vt.innerHTML=`<span class="vlose">You're short.</span>`;
      else vt.innerHTML=`<span class="vlose">Bad deal.</span>`;
    }
    return;
  }

  // Full trade page (id='f') — drives the balance scale visualization
  renderScale(GP.length, RP.length, dif);
}

// Render the balance scale. giveLen/recvLen drive the pan counts and empty
// check; dif drives the tilt and verdict. Decoupled from GP/RP so 3-way
// trades can combine RP+RP2 and call this directly.
function renderScale(giveLen, recvLen, dif){
  const armGroup=document.getElementById('scale-arm-group');
  const pill=document.getElementById('verdict-pill');
  const sub=document.getElementById('trade-verdict-sub');
  const bg=document.getElementById('trade-verdict-bg');
  const giveCount=document.getElementById('scale-give-count');
  const recvCount=document.getElementById('scale-recv-count');
  const panLeft=document.getElementById('scale-pan-left');
  const panRight=document.getElementById('scale-pan-right');

  // Update piece counts in the pans
  if(giveCount) giveCount.textContent=giveLen||'0';
  if(recvCount) recvCount.textContent=recvLen||'0';

  // Empty state — perfectly level
  if(!giveLen||!recvLen){
    if(armGroup) armGroup.style.transform='rotate(0deg)';
    if(pill){
      pill.textContent='Add pieces to both sides';
      pill.style.background='var(--bg3)';
      pill.style.color='var(--text3)';
      pill.style.borderColor='var(--border)';
      pill.style.boxShadow='none';
    }
    if(sub) sub.textContent='The scale awaits.';
    if(bg) bg.style.opacity='0';
    if(panLeft) panLeft.style.filter='none';
    if(panRight) panRight.style.filter='none';
    const di=document.getElementById('dynasty-impact');
    if(di) di.style.display='none';
    return;
  }

  // Compute tilt: dif positive = receiver heavier = right pan drops.
  // Map dif to angle, capped at ±18°. Use a square-root curve so small diffs
  // are visible but huge ones don't over-rotate.
  const cappedAbs=Math.min(50,Math.abs(dif));
  const rawAngle=Math.sign(dif)*Math.sqrt(cappedAbs)*2.6;
  const angle=Math.max(-18,Math.min(18,rawAngle));
  // Negative dif means you give more → left side HEAVIER → drops down → arm rotates
  // counterclockwise from viewer's POV. SVG positive rotate is clockwise.
  // We want: negative dif → arm rotates so left drops (negative angle in SVG terms? No —
  // think of it: arm is horizontal, left tip at x=60. If we rotate by +5deg around
  // pivot at 230, left tip moves UP. To make it drop, rotate by -5deg. So negative dif
  // (you give more, left heavy) → negative SVG rotate.
  // dif<0 → left should drop → SVG rotate negative.
  // Our computed `angle` has the SIGN of dif. So if dif<0, angle<0. Apply directly:
  if(armGroup) armGroup.style.transform=`rotate(${angle}deg)`;

  // Verdict word + color
  let verdictTxt, verdictCol, verdictBg, verdictBorder, glowCol, bgColor, subTxt;
  if(dif>15){
    verdictTxt='Heavily favors you';
    verdictCol='#fff';
    verdictBg='var(--gt)';
    verdictBorder='var(--gt)';
    glowCol='var(--gt)';
    bgColor='radial-gradient(ellipse at 50% 100%, rgba(118,196,144,0.22), transparent 70%)';
    subTxt='Lock it in before they change their mind.';
  } else if(dif>5){
    verdictTxt='Slight edge your way';
    verdictCol='var(--gt)';
    verdictBg='rgba(118,196,144,0.12)';
    verdictBorder='var(--gt)';
    glowCol='var(--gt)';
    bgColor='radial-gradient(ellipse at 50% 100%, rgba(118,196,144,0.14), transparent 70%)';
    subTxt='A fair trade with a little upside.';
  } else if(dif>=-5){
    verdictTxt='Even — fair trade';
    verdictCol='var(--gold)';
    verdictBg='rgba(216,176,108,0.12)';
    verdictBorder='var(--gold)';
    glowCol='var(--gold)';
    bgColor='radial-gradient(ellipse at 50% 100%, rgba(216,176,108,0.14), transparent 70%)';
    subTxt='Balanced. Comes down to roster fit.';
  } else if(dif>=-15){
    verdictTxt='You\'re short — push back';
    verdictCol='var(--rt)';
    verdictBg='rgba(220,136,136,0.12)';
    verdictBorder='var(--rt)';
    glowCol='var(--rt)';
    bgColor='radial-gradient(ellipse at 50% 100%, rgba(220,136,136,0.14), transparent 70%)';
    subTxt='Counter-offer recommended.';
  } else {
    verdictTxt='Bad deal — heavily favors them';
    verdictCol='#fff';
    verdictBg='var(--rt)';
    verdictBorder='var(--rt)';
    glowCol='var(--rt)';
    bgColor='radial-gradient(ellipse at 50% 100%, rgba(220,136,136,0.22), transparent 70%)';
    subTxt='Walk away. This one\'s a fleecing.';
  }

  if(pill){
    pill.textContent=verdictTxt;
    pill.style.background=verdictBg;
    pill.style.color=verdictCol;
    pill.style.borderColor=verdictBorder;
    pill.style.boxShadow=`0 0 14px ${glowCol}40, inset 0 1px 0 rgba(255,255,255,0.1)`;
  }
  if(sub) sub.textContent=subTxt;
  if(bg){
    bg.style.background=bgColor;
    bg.style.opacity='1';
  }

  // Pulse glow on the heavier (dropped) pan
  if(panLeft&&panRight){
    if(dif<-5){
      panLeft.style.filter='url(#panGlowLeft) drop-shadow(0 0 8px var(--rt))';
      panRight.style.filter='none';
    } else if(dif>5){
      panRight.style.filter='url(#panGlowRight) drop-shadow(0 0 8px var(--gt))';
      panLeft.style.filter='none';
    } else {
      panLeft.style.filter='none';
      panRight.style.filter='none';
    }
  }

  // Dynasty impact panel (only renders for full trade page)
  const di=document.getElementById('dynasty-impact');
  if(!di) return;
  const impact=dynastyImpact(GP,RP);
  if(!impact){di.style.display='none';return;}
  const {gAge,rAge,windowMsg,pickMsg,narrative,gPlayers,rPlayers,gPicks,rPicks}=impact;
  const ageFmt=a=>a!==null?a.toFixed(1)+' yrs':'—';
  const posColor={QB:'var(--qb)',WR:'var(--wr)',RB:'var(--rb)',TE:'var(--te)',PICK:'var(--pick)'};
  di.style.display='block';
  di.innerHTML=`
    <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
      <div style="font-family:Oswald,sans-serif;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:var(--text3);margin-bottom:10px;">Dynasty Context</div>
      <div class="impact-grid">
        <div class="impact-box">
          <div class="impact-lbl">You Give</div>
          <div class="impact-row"><span class="impact-key">Avg Age</span><span class="impact-val" style="color:var(--text2);">${ageFmt(gAge)}</span></div>
          <div class="impact-row"><span class="impact-key">Players</span><span class="impact-val" style="color:var(--text2);">${gPlayers.length}</span></div>
          <div class="impact-row"><span class="impact-key">Picks</span><span class="impact-val" style="color:var(--pick);">${gPicks.length}</span></div>
        </div>
        <div class="impact-box">
          <div class="impact-lbl">You Receive</div>
          <div class="impact-row"><span class="impact-key">Avg Age</span><span class="impact-val" style="color:var(--text2);">${ageFmt(rAge)}</span></div>
          <div class="impact-row"><span class="impact-key">Players</span><span class="impact-val" style="color:var(--text2);">${rPlayers.length}</span></div>
          <div class="impact-row"><span class="impact-key">Picks</span><span class="impact-val" style="color:var(--pick);">${rPicks.length}</span></div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;margin-top:8px;">
        <div style="font-size:11px;color:var(--text3);font-family:Oswald,sans-serif;">Age: ${windowMsg}</div>
        <div style="font-size:11px;color:var(--text3);font-family:Oswald,sans-serif;">Picks: ${pickMsg}</div>
      </div>
      <div class="impact-narrative">${narrative}</div>
    </div>`;
}

// ── ROSTER CONSTRUCTION GRADE ────────────────────────────────────────
function rosterGrade(r, leagueAvg){
  const all=r.all; const n=all.length;
  if(!n) return {letter:'F',cls:'grade-F',detail:'No matched players'};

  let score=0; const issues=[];

  // 1. Overall value vs league average (0-30pts)
  const ratio=r.totalScore/(leagueAvg||1);
  score += Math.min(30, Math.round(ratio*20));

  // 2. QB situation (0-20pts)
  const qbs=all.filter(p=>p.pos==='QB').sort((a,b)=>getScore(b)-getScore(a));
  if(getScore(qbs[0])>=60) score+=20;
  else if(getScore(qbs[0])>=35) score+=14;
  else if(getScore(qbs[0])>=15) score+=8;
  else if(qbs.length) score+=3;
  else { score-=5; issues.push('No QB'); }

  // 3. Positional depth
  ['WR','RB','TE'].forEach(pos=>{
    const ps=all.filter(p=>p.pos===pos).sort((a,b)=>getScore(b)-getScore(a));
    if(getScore(ps[0])>=40) score+=5;
    else if(getScore(ps[0])>=20) score+=3;
    if(getScore(ps[1])>=20) score+=2;
  });

  // 4. Age profile of top-8 — dynasty longevity (0-15pts)
  const top8=all.slice(0,8);
  const avgAge=top8.reduce((s,p)=>s+(p.age||25),0)/(top8.length||1);
  if(avgAge<25) score+=15;
  else if(avgAge<27) score+=11;
  else if(avgAge<29) score+=6;
  else if(avgAge<31) score+=2;
  else { score-=3; issues.push('Aging core'); }

  // 5. Depth (top 10 vs top 3 ratio) — avoids one-trick pony (0-15pts)
  const top3val=all.slice(0,3).reduce((s,p)=>s+getScore(p),0);
  const top10val=all.slice(0,10).reduce((s,p)=>s+getScore(p),0);
  const depthRatio=top3val>0?top10val/top3val:1;
  if(depthRatio>=2.0) score+=15;
  else if(depthRatio>=1.6) score+=10;
  else if(depthRatio>=1.3) score+=5;
  else issues.push('Thin depth');

  // Convert score to letter
  const pct=Math.min(100,score);
  let letter,cls;
  if(pct>=80){letter='A';cls='grade-A';}
  else if(pct>=65){letter='B';cls='grade-B';}
  else if(pct>=48){letter='C';cls='grade-C';}
  else if(pct>=32){letter='D';cls='grade-D';}
  else{letter='F';cls='grade-F';}

  const detail=issues.length?issues.join(' · '):`Score: ${pct}/100`;
  return {letter,cls,detail};
}

// ── SCORING SPARKLINE ─────────────────────────────────────────────────
function buildSparkline(weeklyPts){
  if(!weeklyPts||weeklyPts.length<2) return '';
  const max=Math.max(...weeklyPts)||1;
  const min=Math.min(...weeklyPts);
  const range=max-min||1;
  // Color gradient: low = red, high = green
  const bars=weeklyPts.map(pts=>{
    const pct=Math.round(((pts-min)/range)*100);
    const h=Math.max(3,Math.round((pct/100)*28));
    // Color: blend red→amber→green
    const col=pct>65?'var(--gt)':pct>35?'var(--gold)':'var(--rt)';
    return `<div class="spark-bar" style="height:${h}px;background:${col};opacity:0.85;" title="Wk ${weeklyPts.indexOf(pts)+1}: ${pts} pts"></div>`;
  }).join('');
  return `<div class="sparkline-wrap">${bars}</div>`;
}

// ── DYNASTY IMPACT ANALYSIS ───────────────────────────────────────────
function dynastyImpact(give, recv){
  if(!give.length||!recv.length) return null;

  const players=arr=>arr.filter(d=>d.type==='player');
  const picks=arr=>arr.filter(d=>d.type==='pick');

  const gPlayers=players(give), rPlayers=players(recv);
  const gPicks=picks(give),     rPicks=picks(recv);

  // Age analysis (players only)
  const avgAge=arr=>arr.length?arr.reduce((s,p)=>s+(p.age||25),0)/arr.length:null;
  const gAge=avgAge(gPlayers), rAge=avgAge(rPlayers);

  // Value by pos
  const posVal=(arr,pos)=>arr.filter(p=>p.pos===pos).reduce((s,p)=>s+p.score,0);

  // Window shift: are you getting younger or older?
  let windowMsg='';
  if(gAge!==null&&rAge!==null){
    const ageDiff=rAge-gAge;
    if(ageDiff<-2) windowMsg=`−${Math.abs(ageDiff).toFixed(1)} yrs avg age`;
    else if(ageDiff>2) windowMsg=`+${ageDiff.toFixed(1)} yrs avg age`;
    else windowMsg='Age neutral';
  }

  // Pick capital
  const pickMsg=gPicks.length>rPicks.length?`Giving ${gPicks.length-rPicks.length} more pick${gPicks.length-rPicks.length>1?'s':''}`
    :rPicks.length>gPicks.length?`Gaining ${rPicks.length-gPicks.length} pick${rPicks.length-gPicks.length>1?'s':''}`
    :'Picks even';
  

  // Narrative: combine value, age, picks into a read
  const gTotal=give.reduce((s,d)=>s+getScore(d),0);
  const rTotal=recv.reduce((s,d)=>s+getScore(d),0);
  const diff=rTotal-gTotal;
  const isWin=diff>8, isLoss=diff<-8;
  const gettingOlder=gAge!==null&&rAge!==null&&rAge>gAge+1.5;
  const gettingYounger=gAge!==null&&rAge!==null&&rAge<gAge-1.5;
  const gettingPicks=rPicks.length>gPicks.length;
  const losingPicks=gPicks.length>rPicks.length;

  let narrative='';
  if(isWin&&gettingYounger) narrative='Value win and you get younger. Take it.';
  else if(isWin&&gettingOlder) narrative='Value win, but you\'re taking on age. Works if you\'re in a title window.';
  else if(isWin&&gettingPicks) narrative='Value win plus picks. Good return.';
  else if(isWin) narrative='You win the value side. No obvious downside.';
  else if(isLoss&&gettingYounger&&gettingPicks) narrative='Selling value for youth and picks. Standard rebuild move.';
  else if(isLoss&&gettingYounger) narrative='Losing value, gaining age profile. Only makes sense in a full rebuild.';
  else if(isLoss&&gettingPicks) narrative='Value loss for future picks. Risky unless your core is already young.';
  else if(isLoss&&gettingOlder) narrative='Losing value and getting older. Hard to justify.';
  else if(isLoss) narrative='You\'re losing value with no clear upside. Negotiate.';
  else if(gettingYounger) narrative='Even value, better age curve. Quietly good for dynasty.';
  else if(gettingOlder) narrative='Even value, older roster. Mind your window.';
  else narrative='Even trade. Comes down to roster fit.';

  return {gAge,rAge,windowMsg,pickMsg,narrative,gPlayers,rPlayers,gPicks,rPicks};
}

