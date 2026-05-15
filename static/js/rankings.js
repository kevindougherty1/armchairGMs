
function setMode(m,btn){MODE=m;document.querySelectorAll('.mb').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderTable();}

function getFilt(){
  const q=document.getElementById('search').value.toLowerCase().trim();
  return DATA.filter(d=>(MODE==='ALL'||d.pos===MODE)&&(!q||d.name.toLowerCase().includes(q)||(d.team&&d.team.toLowerCase().includes(q))));
}
function getTier(sc){
  if(sc>=92)   return {key:'S',label:'S Tier',cls:'tier-S'};
  if(sc>=84)   return {key:'A',label:'A Tier',cls:'tier-A'};
  if(sc>=78)   return {key:'B',label:'B Tier',cls:'tier-B'};
  if(sc>=66)   return {key:'C',label:'C Tier',cls:'tier-C'};
  if(sc>=60)   return {key:'D',label:'D Tier',cls:'tier-D'};
  if(sc>=38)   return {key:'E',label:'E Tier',cls:'tier-E'};
  if(sc>=36)   return {key:'F',label:'F Tier',cls:'tier-F'};
  if(sc>=28)   return {key:'G',label:'G Tier',cls:'tier-G'};
  if(sc>=25)   return {key:'H',label:'H Tier',cls:'tier-H'};
  if(sc>=23)   return {key:'I',label:'I Tier',cls:'tier-I'};
  if(sc>=22)   return {key:'J',label:'J Tier',cls:'tier-J'};
  if(sc>=19)   return {key:'K',label:'K Tier',cls:'tier-K'};
  if(sc>=17)   return {key:'L',label:'L Tier',cls:'tier-L'};
  if(sc>=14)   return {key:'M',label:'M Tier',cls:'tier-M'};
  if(sc>=12)   return {key:'N',label:'N Tier',cls:'tier-N'};
  if(sc>=9.5)  return {key:'O',label:'O Tier',cls:'tier-O'};
  if(sc>=7)    return {key:'P',label:'P Tier',cls:'tier-P'};
  if(sc>=2)    return {key:'Q',label:'Q Tier',cls:'tier-Q'};
  return               {key:'R',label:'R Tier',cls:'tier-R'};
}

function renderTable(){
  const f=getFilt();const tb=document.getElementById('tbody');const nr=document.getElementById('nr');
  document.getElementById('rc').textContent=`${f.length} asset${f.length!==1?'s':''}`;
  if(!f.length){tb.innerHTML='';nr.style.display='block';return;}
  nr.style.display='none';
  const counts={ALL:DATA.length,QB:0,WR:0,RB:0,TE:0,PICK:0};
  DATA.forEach(d=>{if(counts[d.pos]!==undefined)counts[d.pos]++;});
  Object.entries(counts).forEach(([pos,n])=>{const el=document.getElementById('cnt-'+pos);if(el)el.textContent=n;});
  const sorted=[...f].sort((a,b)=>getScore(b)-getScore(a));
  let snap=null;try{snap=JSON.parse(localStorage.getItem(MOVERS_LS)||'null');}catch(e){}

  // Build positional rank maps
  const posRankMap={};
  ['QB','WR','RB','TE'].forEach(pos=>{
    const posPlayers=DATA.filter(p=>p.type==='player'&&p.pos===pos).sort((a,b)=>getScore(b)-getScore(a));
    posPlayers.forEach((p,i)=>{posRankMap[p.rank]=i+1;});
  });

  let lastTierKey='';
  const rows=[];
  sorted.forEach((d,i)=>{
    const sc=getScore(d);
    const tier=getTier(sc);

    // Insert tier separator when tier changes
    if(tier.key!==lastTierKey){
      rows.push(`<tr class="tier-sep"><td colspan="4">
        <div class="tier-label-row">
          <span class="tier-pill ${tier.cls}">${tier.label}</span>
          <div class="tier-line"></div>
        </div>
      </td></tr>`);
      lastTierKey=tier.key;
    }

    const dr=i+1;
    const iS=SEL&&SEL.rank===d.rank;
    const iP=d.type==='pick';
    const bc=BAR_COLORS[d.pos]||'#888';
    const bw=Math.min(100,Math.round(sc));
    const av=avatarHtml(d,28);

    // Delta
    let delta='';
    if(snap&&snap.scores&&snap.scores[d.rank]!==undefined&&d.type==='player'){
      const diff=Math.round((sc-snap.scores[d.rank])*10)/10;
      if(diff>=1.0) delta=`<span style="font-family:Oswald,sans-serif;font-size:9px;color:var(--gt);margin-left:4px;">▲</span>`;
      else if(diff<=-1.0) delta=`<span style="font-family:Oswald,sans-serif;font-size:9px;color:var(--rt);margin-left:4px;">▼</span>`;
    }

    // Positional rank
    const posRank=(!iP&&posRankMap[d.rank])?`<div class="rposrank" style="color:${bc};">${d.pos}${posRankMap[d.rank]}</div>`:'';

    let nh='';
    if(iP){
      nh=`<div style="display:flex;align-items:center;gap:9px;">${av}<div><div class="rname">${d.name}<span class="pb2 pos-PICK">PICK</span></div><div class="rmeta">${d.year} · Rd ${d.round} · ${d.slot}</div></div></div>`;
    } else {
      const dot=d.hardcoded?'<span class="ld"></span>':'';
      nh=`<div style="display:flex;align-items:center;gap:9px;">${av}<div>
        <div class="rname">${d.name}${dot}<span class="pb2 pos-${d.pos}">${d.pos}</span>${delta}</div>
        <div style="display:flex;gap:8px;align-items:center;">
          <div class="rmeta">${d.team==='FA'?'Free Agent':d.team}${d.age?' · Age '+d.age:''}</div>
          ${posRank}
        </div>
      </div></div>`;
    }

    rows.push(`<tr onclick="selItem(${d.rank})" class="${iS?'sel':''} ${iP?'pr':''}">
      <td class="rn">${dr}</td>
      <td style="padding:5px 10px;">${nh}</td>
      <td class="rbc"><div class="rbw"><div class="rb" style="width:${bw}%;background:${bc};"></div></div></td>
    </tr>`);
  });
  tb.innerHTML=rows.join('');
}
function analyzeTradeByKey(key){
  try{
    const t=window._tradeCache&&window._tradeCache[key];
    if(!t){console.warn('Trade not found in cache:',key);return;}
    GP=[];RP=[];

    function matchPick(pickStr){
      if(!pickStr) return null;
      const s=(pickStr+'').toLowerCase();
      const yearMatch=s.match(/20(\d\d)/);
      // Handle both "Rd3" (Sleeper format) and "3rd" (ordinal format)
      const rdMatch=s.match(/rd(\d)/)||s.match(/round\s*(\d)/)||s.match(/(\d)(st|nd|rd|th)/);
      const yr=yearMatch?parseInt('20'+yearMatch[1]):2027;
      const rd=rdMatch?parseInt(rdMatch[1]):1;
      const isEarly=s.includes('early');
      const isLate=s.includes('late');
      const slot=isEarly?'Early':isLate?'Late':'Mid';
      if(yr>=2027){
        return DATA.find(d=>d.type==='pick'&&d.year===yr&&d.round===rd&&d.slot===slot)
            || DATA.find(d=>d.type==='pick'&&d.year===yr&&d.round===rd)
            || DATA.find(d=>d.type==='pick'&&d.year===2027&&d.round===rd&&d.slot==='Mid')
            || null;
      }
      // Past pick (pre-2027) — already drafted. Find a proxy for valuation
      // but keep the ORIGINAL pick string as the display name so user sees "2026 Rd2" not "2027 Mid 2nd"
      const proxy = DATA.find(d=>d.type==='pick'&&d.round===rd&&d.slot==='Mid')
                 || DATA.find(d=>d.type==='pick'&&d.round===rd)
                 || null;
      if(!proxy) return null;
      // Clone the proxy, override name and display fields with original pick string
      return {...proxy, name: pickStr, displayName: pickStr};
    }

    (t.s1.players||[]).forEach(p=>{
      const m=NM_EXACT[p.name.toLowerCase()]||NM_NORM[normName(p.name)];
      if(m&&!GP.find(x=>x.rank===m.rank)) GP.push(m);
    });
    (t.s1.picks||[]).forEach(pk=>{
      const m=matchPick(pk);
      if(m&&!GP.find(x=>x.rank===m.rank)) GP.push(m);
    });
    (t.s2.players||[]).forEach(p=>{
      const m=NM_EXACT[p.name.toLowerCase()]||NM_NORM[normName(p.name)];
      if(m&&!RP.find(x=>x.rank===m.rank)) RP.push(m);
    });
    (t.s2.picks||[]).forEach(pk=>{
      const m=matchPick(pk);
      if(m&&!RP.find(x=>x.rank===m.rank)) RP.push(m);
    });

    const tradeTab=document.querySelectorAll('.nt')[3];
    showPg('trade',tradeTab);
    renderTA();
  }catch(e){console.error('analyzeTradeByKey error',e);}
}

function closePlayerModal(){document.getElementById('player-modal').style.display='none';}

// Show a player's card in the popup modal WITHOUT changing the current page or
// disturbing the rankings table selection. Used when tapping a name from
// elsewhere in the app (My Team, All-Time Lineup, etc.) where the user wants
// to peek at the card and stay where they were.
function showPlayerCardModal(rank){
  const d=DATA.find(x=>x.rank===rank);
  if(!d) return;
  const prevSel=SEL;
  SEL=d;
  // Render into the offscreen #ac panel using the existing renderCard, then
  // copy its HTML into the modal. Restore SEL so the rankings tab isn't
  // affected when the user navigates back.
  renderCard();
  const modal=document.getElementById('player-modal');
  const title=document.getElementById('player-modal-title');
  const body=document.getElementById('player-modal-body');
  if(modal&&body){
    title.textContent=d.name;
    body.innerHTML=document.getElementById('ac').innerHTML;
    modal.style.display='flex';
  }
  // Restore the previous rankings-tab selection so going back to Rankings
  // shows whatever the user had selected before, not this peeked-at player.
  SEL=prevSel;
  if(SEL){try{renderCard();}catch(e){}}
}

function selItem(rank){
  SEL=DATA.find(d=>d.rank===rank);
  renderTable();
  renderCard();
  // On mobile, also pop up a modal so user doesn't have to scroll
  if(window.innerWidth<=768&&SEL){
    const modal=document.getElementById('player-modal');
    const title=document.getElementById('player-modal-title');
    const body=document.getElementById('player-modal-body');
    if(modal&&body){
      title.textContent=SEL.type==='pick'?SEL.name:SEL.name;
      body.innerHTML=document.getElementById('ac').innerHTML;
      modal.style.display='flex';
    }
  }
}
function renderCard(){
  if(!SEL)return;const d=SEL;const el=document.getElementById('ac');
  const av=avatarHtml(d,52);
  const sc=getScore(d);
  if(d.type==='pick'){
    el.innerHTML=`<div class="pc"><div style="display:flex;align-items:center;gap:14px;margin-bottom:12px;">${av}<div><div style="font-family:'Russo One',sans-serif;font-size:18px;color:var(--pick);">${d.year} Round ${d.round}</div><div style="font-family:'Oswald',sans-serif;font-size:11px;color:var(--text3);">${d.slot} Pick</div></div></div><div style="background:var(--bg3);border:1px solid var(--border);padding:8px;margin-bottom:10px;text-align:center;"><div style="font-family:'Russo One',sans-serif;font-size:22px;color:${tierColor(tierLetter(sc))};">${tierLetter(sc)}</div><div style="font-family:'Oswald',sans-serif;font-size:9px;letter-spacing:0.15em;text-transform:uppercase;color:var(--text3);">Pick Tier</div></div><div class="pbr"><button class="pcb" style="background:var(--red);color:#fff;" onclick="addT(${d.rank},'give')">+ Give</button><button class="pcb" style="background:var(--green);color:#fff;" onclick="addT(${d.rank},'recv')">+ Recv</button></div></div>`;
    return;
  }
  const pc=POS_COLORS[d.pos]||'var(--text)';
  const age=d.age||25;

  // ── OWNER LOOKUP ──
  const ownerName=window._playerOwner&&window._playerOwner[normName(d.name)];
  const ownerTag=ownerName
    ?`<div style="font-family:Oswald,sans-serif;font-size:10px;color:var(--accent);margin-top:2px;">🏈 Owned by ${ownerName}</div>`
    :'';

  // ── CHAMPIONSHIP TALLY ──
  // Built by loadHistory: maps normalized player name → list of championship
  // seasons in which they were on the title-winning roster (in this league).
  const titleData=window._playerTitles&&window._playerTitles[normName(d.name)];
  const titleTag=titleData&&titleData.count
    ?`<div style="font-family:Oswald,sans-serif;font-size:10px;color:var(--gold);margin-top:2px;" title="On the championship roster in ${titleData.seasons.join(', ')}">🏆 ${titleData.count}× Champion (${titleData.seasons.sort().join(', ')})</div>`
    :'';

  // ── POSITIONAL RANK ──
  const posPlayers=DATA.filter(p=>p.type==='player'&&p.pos===d.pos).sort((a,b)=>getScore(b)-getScore(a));
  const posRank=posPlayers.findIndex(p=>p.rank===d.rank)+1;
  const posRankStr=d.pos+(posRank>0?posRank:'—');

  // ── AGE CLIFF ──
  const peakAge={QB:30,WR:27,RB:25,TE:28}[d.pos]||27;
  const yearsFromPeak=peakAge-age;
  let cliffLabel,cliffCls,cliffPct;
  if(yearsFromPeak>2){cliffLabel=`${yearsFromPeak.toFixed(1)} yrs to peak`;cliffCls='cliff-green';cliffPct=Math.min(100,Math.round(((peakAge-age)/6)*100));}
  else if(yearsFromPeak>0){cliffLabel='Approaching peak';cliffCls='cliff-amber';cliffPct=65;}
  else if(yearsFromPeak>=-1){cliffLabel='At peak';cliffCls='cliff-amber';cliffPct=50;}
  else if(yearsFromPeak>=-3){cliffLabel=`${Math.abs(yearsFromPeak).toFixed(1)} yrs past peak`;cliffCls='cliff-red';cliffPct=30;}
  else{cliffLabel='Well past peak';cliffCls='cliff-red';cliffPct=10;}

  // ── VALUE TRAJECTORY (sparkline using snapshot) ──
  let trajHtml='';
  try{
    const snap=JSON.parse(localStorage.getItem(MOVERS_LS)||'null');
    if(snap&&snap.scores&&snap.scores[d.rank]!==undefined){
      const prev=snap.scores[d.rank];
      const diff=sc-prev;
      const hrs=Math.round((Date.now()-snap.ts)/(1000*60*60));
      const col=diff>1?'var(--gt)':diff<-1?'var(--rt)':'var(--text3)';
      const arrow=diff>1?'▲':diff<-1?'▼':'→';
      trajHtml=`<div style="font-size:11px;color:${col};font-family:Oswald,sans-serif;">${arrow} Trending ${diff>1?'up':diff<-1?'down':'flat'} since ${hrs}h ago</div>`;
    }
  }catch(e){}

  // ── COMPARABLE PLAYERS ──
  const comps=DATA.filter(p=>
    p.type==='player'&&p.pos===d.pos&&p.rank!==d.rank&&
    Math.abs(getScore(p)-sc)<sc*0.12&&
    Math.abs((p.age||25)-age)<2
  ).slice(0,3);
  const compHtml=comps.length
    ?comps.map(p=>`<span style="font-size:11px;color:var(--text2);font-family:Oswald,sans-serif;">${p.name.split(' ').pop()}</span>`).join('<span style="color:var(--text3);margin:0 4px;">·</span>')
    :'<span style="font-size:11px;color:var(--text3);">No close comps</span>';

  // ── DYNASTY WINDOW ──
  const windowStart=Math.max(2026,Math.round(2026+Math.max(0,peakAge-age-1)));
  const windowEnd=windowStart+Math.max(1,Math.round((34-age)/2));
  const windowStr=windowStart>=windowEnd?String(windowStart):`${windowStart}–${Math.min(2034,windowEnd)}`;

  const lk=d.hardcoded?`<div style="font-family:'Oswald',sans-serif;font-size:9px;letter-spacing:0.1em;color:var(--gold);margin-bottom:7px;display:flex;align-items:center;gap:4px;"><span style="display:inline-block;width:4px;height:4px;border-radius:50%;background:var(--gold);"></span>Top-Ranked Asset</div>`:``; 

  el.innerHTML=`<div class="pc">
    <!-- Header -->
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:10px;">
      ${av}
      <div style="flex:1;">
        <div class="pn">${d.name}</div>
        <div class="pm">${d.team==='FA'?'Free Agent':d.team} · ${d.pos}${d.age?' · Age '+d.age:''}</div>
        ${ownerTag}
        ${titleTag}
        ${trajHtml}
      </div>
      <div style="text-align:right;">
        <div class="psb" style="color:${tierColor(tierLetter(sc))};font-family:'Russo One',sans-serif;">${tierLetter(sc)}</div>
        <div class="psl">${SCORING==='SF'?'SF':'1QB'} Tier</div>
      </div>
    </div>
    ${lk}

    <!-- Core stats grid -->
    <div class="pcs">
      <div class="pstat"><div class="psv">#${d.rank}</div><div class="psl2">Overall</div></div>
      <div class="pstat"><div class="psv" style="color:${pc}">${posRankStr}</div><div class="psl2">Pos Rank</div></div>
      <div class="pstat"><div class="psv">${d.age||'—'}</div><div class="psl2">Age</div></div>
      <div class="pstat"><div class="psv">${windowStr}</div><div class="psl2">Window</div></div>
    </div>

    <!-- Age cliff -->
    <div class="pc-section">
      <div class="pc-section-title">Age Cliff</div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
        <span style="font-size:11px;color:var(--text2);font-family:Oswald,sans-serif;">${cliffLabel}</span>
        <span style="font-size:10px;color:var(--text3);font-family:Oswald,sans-serif;">Peak age: ${peakAge}</span>
      </div>
      <div class="age-cliff-bar"><div class="age-cliff-fill ${cliffCls}" style="width:${cliffPct}%;"></div></div>
    </div>

    <!-- Comparable players -->
    <div class="pc-section">
      <div class="pc-section-title">Similar Players</div>
      <div>${compHtml}</div>
    </div>

    <!-- Action buttons -->
    <div class="pbr" style="padding:10px 14px 12px;">
      <button class="pcb" style="background:var(--red);color:#fff;" onclick="addT(${d.rank},'give')">+ Give</button>
      <button class="pcb" style="background:var(--green);color:#fff;" onclick="addT(${d.rank},'recv')">+ Recv</button>
    </div>
  </div>`;
}

function addT(rank,side){
  const d=DATA.find(x=>x.rank===rank);if(!d)return;
  const actualSide=side==='recv'&&TRADE_TYPE===3?ACTIVE_RECV:side;
  if(actualSide==='give'&&!GP.find(x=>x.rank===rank))GP.push(d);
  else if(actualSide==='recv'&&!RP.find(x=>x.rank===rank))RP.push(d);
  else if(actualSide==='recv2'&&!RP2.find(x=>x.rank===rank))RP2.push(d);
  renderTA();
}
function remT(rank,side){
  if(side==='give')GP=GP.filter(x=>x.rank!==rank);
  else if(side==='recv')RP=RP.filter(x=>x.rank!==rank);
  else if(side==='recv2')RP2=RP2.filter(x=>x.rank!==rank);
  renderTA();
}
