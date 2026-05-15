function showRoster(idx){
  const r=MODAL_DATA[idx];if(!r)return;
  document.getElementById('modal-team-name').textContent=`${r.owner}'s Roster`;
  const posOrder={QB:0,WR:1,RB:2,TE:3};
  const sorted=[...r.all].sort((a,b)=>(posOrder[a.pos]??9)-(posOrder[b.pos]??9)||getScore(b)-getScore(a));
  let html='';let curPos='';
  sorted.forEach(p=>{
    if(p.pos!==curPos){curPos=p.pos;html+=`<div class="modal-section">${p.pos}</div>`;}
    const pid=p.sleeper_id||SLEEPER_PID[normName(p.name)];
    const pc={QB:'var(--qb)',WR:'var(--wr)',RB:'var(--rb)',TE:'var(--te)'}[p.pos]||'var(--text3)';
    const photo=pid
      ?`<img style="width:36px;height:36px;border-radius:50%;object-fit:cover;object-position:top center;border:1px solid var(--border);" src="https://sleepercdn.com/content/nfl/players/${pid}.jpg" onerror="this.style.display='none'">`
      :`<div style="width:36px;height:36px;border-radius:50%;background:var(--bg3);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-family:Oswald,sans-serif;font-size:10px;color:${pc};">${p.pos}</div>`;
    html+=`<div class="modal-player-row">${photo}<div style="flex:1;"><div class="modal-player-name">${p.name}</div><div class="modal-player-meta">${p.team==='FA'?'Free Agent':p.team}${p.age?' · Age '+p.age:''} · #${p.rank} Overall</div></div><div class="modal-player-score" style="color:${tierColor(tierLetter(getScore(p)))};font-family:'Russo One',sans-serif;">${tierLetter(getScore(p))}</div></div>`;
  });
  if(!sorted.length)html='<div style="padding:24px;text-align:center;color:var(--text3);font-size:13px;">No matched players found.</div>';

  // Draft Capital section — individual picks with original owner labels
  const picks=(r.picks||[]).slice().sort((a,b)=>a.season-b.season||a.round-b.round);
  if(picks.length){
    html+=`<div class="modal-section">Draft Capital</div>`;
    const ridToOwner2={};
    MODAL_DATA.forEach(md=>{ if(md.rid!==undefined){ ridToOwner2[md.rid]=md.owner; ridToOwner2[parseInt(md.rid)]=md.owner; ridToOwner2[String(md.rid)]=md.owner; }});
    picks.forEach(pk=>{
      const slot=pk.slot||'Mid';
      const tier=tierLetter(pk.matchedScore||0);
      const rd=pk.round;
      const yr=pk.season;
      const rdLabel=rd===1?'1st':rd===2?'2nd':rd===3?'3rd':'4th';
      const origRid=pk._orig;
      html+=`<div class="modal-player-row">
        <div style="width:36px;height:36px;border-radius:50%;background:rgba(155,138,191,0.12);border:1px solid ${pickColor(rd)};display:flex;align-items:center;justify-content:center;font-family:Oswald,sans-serif;font-size:9px;font-weight:600;color:${pickColor(rd)};flex-shrink:0;">R${rd}</div>
        <div style="flex:1;"><div class="modal-player-name" style="color:${pickColor(rd)};">${yr} ${rdLabel} · ${slot}</div><div class="modal-player-meta">Dynasty Pick</div></div>
        <div class="modal-player-score" style="color:${tierColor(tier)};font-family:'Russo One',sans-serif;">${tier}</div>
      </div>`;
    });
  }

  document.getElementById('modal-body').innerHTML=html;
  const displayTotal=(r.all.reduce((s,p)=>s+getScore(p),0)+(r.pickVal||0)).toFixed(1);
  document.getElementById('modal-total').textContent=displayTotal;
  document.getElementById('roster-modal').style.display='flex';
}
function selectFromModal(rank){
  // Close the roster modal
  document.getElementById('roster-modal').style.display='none';
  // Select the player and show their card
  selItem(rank);
  // Switch to rankings tab so the card is visible
  const rankTab=document.querySelectorAll('.nt')[0];
  showPg('rankings',rankTab);
}

function selectFromModal(rank){
  // Select the player
  SEL=DATA.find(d=>d.rank===rank);
  if(!SEL) return;
  // Close roster modal
  document.getElementById('roster-modal').style.display='none';
  // Switch to rankings tab and render
  const rankTab=document.querySelector('.nt.active')||document.querySelectorAll('.nt')[0];
  showPg('rankings', document.querySelectorAll('.nt')[0]);
  renderTable();
  renderCard();
  // On mobile pop the player modal
  if(window.innerWidth<=768){
    const modal=document.getElementById('player-modal');
    const body=document.getElementById('player-modal-body');
    const title=document.getElementById('player-modal-title');
    if(modal&&body){
      title.textContent=SEL.name;
      body.innerHTML=document.getElementById('ac').innerHTML;
      modal.style.display='flex';
    }
  } else {
    // On desktop scroll the selected row into view
    setTimeout(()=>{
      const sel=document.querySelector('tbody tr.sel');
      if(sel) sel.scrollIntoView({behavior:'smooth',block:'center'});
    },100);
  }
}

function closeModal(){document.getElementById('roster-modal').style.display='none';}

function renderLeague(league,rosters,lid){
  const leagueAvg = rosters.reduce((s,r)=>s+r.totalScore,0) / (rosters.length||1);

  // ── CHAMPIONSHIP ODDS BAR ──
  const maxOdds=Math.max(...rosters.map(r=>r.champOdds));
  const champColors=['#c07848','#d4985a','#e0aa6a','#8aafe0','#88c4a0','#a898cc','#dc8888','#c8a86c','#7a9aaa','#9a8888','#aab090','#8899a8'];
  const champSorted=[...rosters].sort((a,b)=>b.champOdds-a.champOdds);
  const champBars=champSorted.map((r,i)=>{
    const pct=Math.round((r.champOdds/maxOdds)*100);
    const col=champColors[i%champColors.length];
    const rIdx=rosters.findIndex(x=>x.owner===r.owner);
    return `<div class="champ-row">
      <div class="champ-owner" onclick="showRosterBreakdown(${rIdx})" style="cursor:pointer;text-decoration:underline;text-decoration-color:rgba(176,96,48,0.4);text-underline-offset:3px;" title="Tap to see roster">${r.owner.split(' ')[0]} <span style="font-family:Oswald,sans-serif;font-size:10px;color:var(--accent);opacity:0.7;">→</span></div>
      <div class="champ-bar-outer"><div class="champ-bar-inner" style="width:${pct}%;background:${col};"></div></div>
      <div class="champ-pct">${r.champOdds}%</div>
    </div>`;
  }).join('');

  // ── NET TRADE LEADERBOARD — removed ──

  document.getElementById('lemp').style.display='none';
  document.getElementById('lcon').innerHTML=`
    <div class="lov">
      <div><div class="lname">${league.name||'Your League'}</div><div class="lmeta">${league.season||''} Season · ${rosters.length} Teams · Dynasty</div></div>
      <div class="kpis">
        <div class="kpi"><div class="kpiv">${rosters.length}</div><div class="kpil">Teams</div></div>
        <div class="kpi"><div class="kpiv">${Math.round(leagueAvg)}</div><div class="kpil">Avg Value</div></div>
        <div class="kpi"><div class="kpiv">${rosters[0]?.owner?.split(' ')[0]||'—'}</div><div class="kpil">#1 Roster</div></div>
      </div>
    </div>

    <!-- CHAMPIONSHIP ODDS BAR CHART -->
    <div class="champ-bar-wrap">
      <div class="champ-bar-title">🏆 Championship Odds</div>
      ${champBars}
    </div>

        <div class="tgrid">${rosters.map((r,i)=>{
      const tier = valueTier(r.totalScore, leagueAvg);
      const blurb = buildBlurb(r, leagueAvg);
      const grade = rosterGrade(r, leagueAvg);
      const spark = buildSparkline(r.weeklyPts||[]);
      const sosCls = r.sos>=55?'sos-hard':r.sos<=45?'sos-easy':'sos-avg';
      const sosLbl = r.sos>=55?'Hard SOS':r.sos<=45?'Easy SOS':'Avg SOS';
      const valueBarPct=Math.round((r.totalScore/(leagueAvg*1.5))*100);
      const topPlayers=r.top.slice(0,5).map(p=>{
        const pid=p.sleeper_id||SLEEPER_PID[normName(p.name)];
        const img=pid?`<img src="https://sleepercdn.com/content/nfl/players/${pid}.jpg" style="width:28px;height:28px;border-radius:50%;object-fit:cover;object-position:top center;border:2px solid var(--border);flex-shrink:0;" onerror="this.style.display='none'">`:`<div style="width:28px;height:28px;border-radius:50%;background:var(--bg3);border:2px solid var(--border);display:flex;align-items:center;justify-content:center;font-family:Oswald,sans-serif;font-size:8px;color:var(--text3);flex-shrink:0;">${p.pos}</div>`;
        return `<div style="display:flex;align-items:center;gap:5px;background:var(--panel);border:1px solid var(--border);border-radius:8px;padding:4px 8px 4px 4px;">
          ${img}
          <div>
            <div style="font-family:Oswald,sans-serif;font-size:11px;font-weight:600;color:var(--text);line-height:1.1;">${p.name.split(' ').pop()}</div>
            <div style="font-size:10px;color:${tierColor(tierLetter(getScore(p)))};font-family:'Russo One',sans-serif;">${tierLetter(getScore(p))}</div>
          </div>
        </div>`;
      }).join('');
      return `
      <div class="tc" id="tc${i}">
        <!-- Card header: rank stripe + main info + value -->
        <div style="display:grid;grid-template-columns:52px 1fr auto;align-items:stretch;">
          <!-- Rank -->
          <div style="background:var(--bg3);border-right:1px solid var(--border);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px 8px;border-radius:var(--r12) 0 0 0;">
            <div style="font-family:'Russo One',sans-serif;font-size:11px;color:var(--text3);letter-spacing:0.08em;">#</div>
            <div style="font-family:'Russo One',sans-serif;font-size:22px;color:var(--accent);line-height:1;">${i+1}</div>
          </div>
          <!-- Main info -->
          <div style="padding:14px 16px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;">
              <div class="tco" onclick="showRosterBreakdown(${i})" style="cursor:pointer;text-decoration:underline;text-decoration-color:rgba(176,96,48,0.45);text-underline-offset:3px;" title="Tap to see full roster">${r.owner} <span style="font-family:Oswald,sans-serif;font-size:10px;color:var(--accent);letter-spacing:0.04em;opacity:0.7;">→</span></div>
              <div class="grade-badge ${grade.cls}" title="${grade.detail}" style="font-size:11px;padding:1px 7px;">${grade.letter}</div>
            </div>
            <div style="font-family:Oswald,sans-serif;font-size:10px;color:var(--text3);letter-spacing:0.05em;margin-bottom:6px;">
              ${r.wins}W – ${r.losses}L${r.ties>0?' – '+r.ties+'T':''}
              ${r.actualPPG>0?` &nbsp;·&nbsp; <span style="color:var(--gt);">${r.actualPPG} PPG</span>`:''}
              &nbsp;·&nbsp; Proj ${r.pw}–${r.pl}
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
              <span class="tier-badge ${tier.cls}">${tier.label}</span>
              <span style="font-family:Oswald,sans-serif;font-size:10px;color:var(--accent2);">🏆 ${r.champOdds}%</span>
${r.sos!==undefined?`<span class="sos-badge ${sosCls}">${sosLbl}</span>`:''}
            </div>
          </div>
          <!-- Value -->
          <div style="background:var(--bg2);border-left:1px solid var(--border);min-width:92px;padding:14px 14px;text-align:right;display:flex;flex-direction:column;justify-content:center;border-radius:0 var(--r12) 0 0;">
            <div style="font-family:'Russo One',sans-serif;font-size:22px;color:var(--accent);line-height:1;">${r.totalScore.toFixed(0)}</div>
            <div style="font-family:Oswald,sans-serif;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:var(--text3);margin-top:2px;">Roster Val</div>
            ${r.pf>0?`<div style="font-size:10px;color:var(--text3);font-family:Oswald,sans-serif;margin-top:4px;">${r.pf.toFixed(0)} PF</div>`:''}
          </div>
        </div>
        <!-- Player pills row -->
        <div style="padding:12px 16px;border-top:1px solid var(--border);background:var(--bg3);">
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${topPlayers}
            ${!r.all.length?'<span style="font-size:11px;color:var(--text3);font-style:italic;">No matched players</span>':''}
          </div>
          ${spark?`<div style="margin-top:8px;"><div style="font-family:Oswald,sans-serif;font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:var(--text3);margin-bottom:4px;">Scoring Trend</div>${spark}</div>`:''}
        </div>
        <!-- Blurb -->
        <div class="team-blurb">${blurb}</div>
      </div>`;
    }).join('')}
    </div>`;
}

// ── LOCAL TEAM BLURB GENERATOR (no API needed) ─────────────────────────
function valueTier(score, avg){
  const ratio = score / (avg||1);
  if(ratio >= 1.25) return {cls:'tier-way-above', label:'Way Above Average'};
  if(ratio >= 1.10) return {cls:'tier-above',     label:'Above Average'};
  if(ratio >= 0.90) return {cls:'tier-at',        label:'League Average'};
  if(ratio >= 0.75) return {cls:'tier-below',     label:'Below Average'};
  return               {cls:'tier-way-below',     label:'Way Below Average'};
}

function reRenderLeague(){
  if(!MODAL_DATA||!MODAL_DATA.length) return;
  // Recompute totalScore for each roster using current SCORING mode
  const leagueAvg=MODAL_DATA.reduce((s,r)=>s+(r.all.reduce((ss,p)=>ss+getScore(p),0)+(r.pickVal||0)),0)/MODAL_DATA.length;
  MODAL_DATA.forEach(r=>{
    r.totalScore=Math.round((r.all.reduce((s,p)=>s+getScore(p),0)+(r.pickVal||0))*10)/10;
  });
  MODAL_DATA.sort((a,b)=>b.totalScore-a.totalScore);
  const lcon=document.getElementById('lcon');
  if(lcon&&lcon.innerHTML) renderLeague(window._lastLeague||{name:'Your League'},MODAL_DATA,window._lastLeagueId||'');
}

function buildBlurb(r, leagueAvg){
  const top3 = r.all.slice(0,3);
  const top5 = r.all.slice(0,5);
  const top8 = r.all.slice(0,8);
  const qbs  = r.all.filter(p=>p.pos==='QB').sort((a,b)=>getScore(b)-getScore(a));
  const rbs  = r.all.filter(p=>p.pos==='RB').sort((a,b)=>getScore(b)-getScore(a));
  const wrs  = r.all.filter(p=>p.pos==='WR').sort((a,b)=>getScore(b)-getScore(a));
  const tes  = r.all.filter(p=>p.pos==='TE').sort((a,b)=>getScore(b)-getScore(a));
  const picks= (r.picks||[]).filter(pk=>pk.round===1);
  const avgAge5 = top5.length ? top5.reduce((s,p)=>s+(p.age||25),0)/top5.length : 25;
  const ratio = r.totalScore / (leagueAvg||1);

  // Named assets for specificity
  const star    = top3[0]?.name.split(' ').pop()||'';
  const star2   = top3[1]?.name.split(' ').pop()||'';
  const star3   = top3[2]?.name.split(' ').pop()||'';
  const qb1     = qbs[0]?.name.split(' ').pop()||'';
  const rb1     = rbs[0]?.name.split(' ').pop()||'';
  const wr1     = wrs[0]?.name.split(' ').pop()||'';
  const te1     = tes[0]?.name.split(' ').pop()||'';
  const qbScore = qbs[0] ? tierLetter(getScore(qbs[0])) : '—';
  const rb1Score= rbs[0] ? tierLetter(getScore(rbs[0])) : '—';
  const wr1Score= wrs[0] ? tierLetter(getScore(wrs[0])) : '—';
  const ppg     = r.projPPG||0;
  const apg     = r.actualPPG||0;
  const pickCount= picks.length;
  const earlyPicks=(r.picks||[]).filter(pk=>pk.round===1&&(pk.slot==='Early'||pk.slot==='Early-Mid')).length;
  const noQB    = !qbs.length || getScore(qbs[0])<15;
  const noRB    = !rbs.length || getScore(rbs[0])<15;
  const thinDepth= r.all.length < 8;
  const rbHeavy = rbs.filter(p=>getScore(p)>20).length >= 3;
  const wrHeavy = wrs.filter(p=>getScore(p)>20).length >= 3;
  const eliteTE = tes[0] && getScore(tes[0])>40;
  const eliteQB = qbs[0] && getScore(qbs[0])>60;
  const youngQB = qbs[0] && (qbs[0].age||30)<27 && getScore(qbs[0])>30;

  const winStr  = `${r.pw}–${r.pl}`;
  const wStr    = r.contention;
  const champStr= `${r.champOdds}%`;
  const header  = `${star}${star2?', '+star2:''}${star3?', '+star3:''} · ${winStr} proj · ${champStr} odds · Window: ${wStr}`;

  // Build a unique observation sentence using specific roster facts
  const observations = [];

  // QB situation
  if(eliteQB)       observations.push(`${qb1} (Tier ${qbScore}) is a top-shelf QB asset.`);
  else if(youngQB)  observations.push(`${qb1} is a developing QB worth watching.`);
  else if(noQB)     observations.push(`No reliable QB on roster — a real hole.`);
  else              observations.push(`QB is functional with ${qb1}.`);

  // RB/WR depth
  if(rbHeavy)       observations.push(`Deep at RB with ${rb1} leading the group.`);
  else if(wrHeavy)  observations.push(`WR-heavy construction with ${wr1} at the top.`);
  else if(noRB)     observations.push(`Thin at RB — ${rb1||'no clear starter'} isn't moving the needle.`);
  else              observations.push(`${rb1} and ${wr1} anchor the skill positions.`);

  // TE
  if(eliteTE)       observations.push(`${te1} is a positional advantage at TE.`);

  // PPG
  if(apg>0){
    if(apg>ppg*1.1) observations.push(`Scoring ${apg} PPG — outperforming projections.`);
    else if(apg<ppg*0.88) observations.push(`Only ${apg} PPG actual — underperforming the roster value.`);
  }

  // Age
  if(avgAge5>=29)   observations.push(`Core avg age ${avgAge5.toFixed(1)} — window is closing.`);
  else if(avgAge5<24) observations.push(`Young core (avg ${avgAge5.toFixed(1)}) with room to grow.`);

  // Pick capital
  if(earlyPicks>=2) observations.push(`Holds ${earlyPicks} early 1st-round picks — future upside built in.`);
  else if(pickCount===0) observations.push(`No 1st-round picks on the roster.`);
  else if(pickCount>=3) observations.push(`${pickCount} first-round picks banked.`);

  // Overall situation
  if(ratio>=1.25)    observations.push(`One of the top rosters in the league by value.`);
  else if(ratio<=0.75) observations.push(`Below-average roster value. Needs work.`);
  else if(thinDepth) observations.push(`Starter talent is real but depth is thin.`);

  // Pick 2-3 most interesting observations so no two teams sound alike
  const picked = observations.slice(0, Math.min(3, observations.length));
  return `${header}. ${picked.join(' ')}`;
}

