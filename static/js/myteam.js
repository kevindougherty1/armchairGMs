// ===== MY TEAM PAGE =====
let MY_TEAM_RID=localStorage.getItem('myteam_rid')?parseInt(localStorage.getItem('myteam_rid')):null;

function initMyTeam(){
  if(!MODAL_DATA||!MODAL_DATA.length){
    document.getElementById('myteam-no-league').style.display='block';
    document.getElementById('myteam-selector').style.display='none';
    document.getElementById('myteam-content').style.display='none';
    return;
  }
  document.getElementById('myteam-no-league').style.display='none';
  document.getElementById('myteam-selector').style.display='block';

  // Build team selector buttons
  const btns=document.getElementById('myteam-team-btns');
  btns.innerHTML=MODAL_DATA.map(r=>`
    <button onclick="selectMyTeam(${r.rid})" style="font-family:'Oswald',sans-serif;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;padding:6px 14px;border:1px solid ${MY_TEAM_RID===r.rid?'var(--accent)':'var(--border2)'};background:${MY_TEAM_RID===r.rid?'var(--accent)':'transparent'};color:${MY_TEAM_RID===r.rid?'var(--bg2)':'var(--text3)'};cursor:pointer;transition:all 0.15s;">${r.owner}</button>
  `).join('');

  if(MY_TEAM_RID) renderMyTeam(MY_TEAM_RID);
}

function selectMyTeam(rid){
  MY_TEAM_RID=rid;
  localStorage.setItem('myteam_rid',rid);
  initMyTeam();
  // Reset to the default sub-tab on team switch so user lands on Current Roster
  const defaultBtn=document.querySelector('.mt-subtab[data-sub="current"]');
  if(defaultBtn) showMtSub('current', defaultBtn);
}

// Switch between the three My Team sub-views (Current / All-Time / Recs).
// Default on team load is 'current'.
function showMtSub(sub, btnEl){
  document.querySelectorAll('.mt-sub-view').forEach(el=>{el.style.display='none';});
  const target=document.getElementById('mt-sub-'+sub);
  if(target) target.style.display='block';
  document.querySelectorAll('.mt-subtab').forEach(b=>{
    b.style.color='var(--text3)';
    b.style.fontWeight='400';
    b.style.borderBottom='3px solid transparent';
  });
  if(btnEl){
    btnEl.style.color='var(--text)';
    btnEl.style.fontWeight='600';
    btnEl.style.borderBottom='3px solid var(--accent)';
  }
}

async function renderMyTeam(rid){
  const roster=MODAL_DATA.find(r=>r.rid===rid);
  if(!roster) return;
  document.getElementById('myteam-content').style.display='block';

  // Header — use totalScore (scoring-mode-aware, recomputed by reRenderLeague)
  const leagueRank=(MODAL_DATA.slice().sort((a,b)=>b.totalScore-a.totalScore).findIndex(r=>r.rid===rid))+1;
  document.getElementById('mt-owner-name').textContent=roster.owner;
  document.getElementById('mt-record').textContent=`${roster.wins||0}W – ${roster.losses||0}L`;
  document.getElementById('mt-roster-val').textContent=(roster.totalScore||0).toFixed(1);
  document.getElementById('mt-rank').textContent=`#${leagueRank}`;

  // Current roster — sort by live (scoring-mode aware) score, names link to rankings card
  const posOrder=['QB','WR','RB','TE','PICK'];
  const PC={'QB':'var(--qb)','WR':'var(--wr)','RB':'var(--rb)','TE':'var(--te)','PICK':'var(--pick)'};
  const allPlayers=[...(roster.all||[])].sort((a,b)=>getScore(b)-getScore(a));
  document.getElementById('mt-current-roster').innerHTML=allPlayers.length
    ?allPlayers.map(p=>{
      const liveScore=getScore(p);
      // Match against the rankings DB so we can jump to that player's card on tap.
      // selItem() is the canonical "select a player on rankings" function.
      const dbPlayer=!p.unranked?DATA.find(d=>d.type==='player'&&normName(d.name)===normName(p.name)):null;
      const nameHtml=dbPlayer
        ?`<span onclick="showPlayerCardModal(${dbPlayer.rank})" style="font-family:'Oswald',sans-serif;font-size:13px;font-weight:600;color:var(--text);flex:1;cursor:pointer;text-decoration:underline;text-decoration-color:var(--border2);text-underline-offset:2px;">${p.name}</span>`
        :`<span style="font-family:'Oswald',sans-serif;font-size:13px;font-weight:600;color:var(--text);flex:1;">${p.name}${p.unranked?' <span style="font-family:Oswald,sans-serif;font-size:9px;letter-spacing:0.08em;color:var(--text3);font-weight:400;">· UNRANKED</span>':''}</span>`;
      const scoreDisplay=p.unranked?'<span style="font-family:Oswald,sans-serif;font-size:11px;color:var(--text3);">—</span>':`<span style="font-family:'Russo One',sans-serif;font-size:13px;color:${tierColor(tierLetter(liveScore))};">${tierLetter(liveScore)}</span>`;
      return `<div style="display:flex;align-items:center;gap:12px;padding:7px 14px;background:var(--panel);border:1px solid var(--border);">
        <span style="font-family:'Oswald',sans-serif;font-size:9px;letter-spacing:0.08em;border:1px solid ${PC[p.pos]||'var(--text3)'};color:${PC[p.pos]||'var(--text3)'};padding:1px 5px;flex-shrink:0;">${p.pos}</span>
        ${nameHtml}
        ${scoreDisplay}
      </div>`;}).join('')
    :'<div style="font-size:12px;color:var(--text3);padding:12px;">No players found.</div>';

  // Draft picks
  const picks=(roster.picks||[]).slice().sort((a,b)=>a.season-b.season||a.round-b.round);
  function pickColor(rd){return rd===1?'#9b8abf':rd===2?'#7b9ec9':rd===3?'#c9a84c':'#c97b7b';}
  // Build roster_id → owner name lookup so we can label picks that originally
  // belonged to another team (e.g. a 2028 2nd acquired from ThatgamblerX).
  const ridToOwner={};
  (MODAL_DATA||[]).forEach(md=>{ if(md.rid!==undefined){ ridToOwner[md.rid]=md.owner; ridToOwner[parseInt(md.rid)]=md.owner; }});
  document.getElementById('mt-picks').innerHTML=picks.length
    ?picks.map(pk=>{
      const rd=pk.round;const yr=pk.season;
      const rdLabel=rd===1?'1st':rd===2?'2nd':rd===3?'3rd':'4th';
      const pc=pickColor(rd);
      const matched=DATA.find(d=>d.type==='pick'&&d.year==yr&&d.round==rd);
      const tier=matched?tierLetter(matched.score):'—';
      const tierC=matched?tierColor(tier):'var(--text3)';
      const origRid=pk._orig;
      const origOwner=(origRid!==undefined&&origRid!==roster.rid)?ridToOwner[origRid]:null;
      const origTag=origOwner?` <span style="font-family:'Oswald',sans-serif;font-size:10px;color:var(--text3);font-weight:400;">via ${origOwner.split(' ')[0]}</span>`:'';
      // Only 2027 picks have a meaningful slot projection — see trade-search.js
      const slotTag=yr==2027?` · ${pk.slot||'Mid'}`:'';
      return `<div style="display:flex;align-items:center;gap:12px;padding:7px 14px;background:var(--panel);border:1px solid var(--border);">
        <span style="font-family:'Oswald',sans-serif;font-size:9px;letter-spacing:0.08em;border:1px solid ${pc};color:${pc};padding:1px 5px;flex-shrink:0;">PICK</span>
        <span style="font-family:'Oswald',sans-serif;font-size:13px;font-weight:600;color:var(--text);flex:1;">${yr} ${rdLabel}${slotTag}${origTag}</span>
        <span style="font-family:'Russo One',sans-serif;font-size:13px;color:${tierC};">${tier}</span>
      </div>`;}).join('')
    :'<div style="font-size:12px;color:var(--text3);padding:12px;">No draft picks.</div>';

  // All-time starting lineup — fetch matchup history
  await buildAllTimeLineup(rid);

  // Trade recommendations — engine has three modes; user toggles in the UI
  renderTradeRecs(roster);
}

// ── TRADE RECOMMENDATIONS (3-mode engine) ────────────────────────────────
// Three optimization modes, same underlying data:
//   • Contender — same/±1 tier, fair value, max production gain (current PPG)
//   • Win Now   — uptier target, bleed up to 25% dynasty value, max production
//   • Rebuild   — fair value, max longevity (younger / picks for older studs)
// Value parity uses getScore() (dynasty). Production uses Sleeper's 3-week
// 2026 projection average, exposed by trade-search.js as window._projMap.
let _recsMode='contender';
let _lastRosterForRecs=null;

function setRecsMode(mode,btn){
  _recsMode=mode;
  document.querySelectorAll('.recs-mode-btn').forEach(b=>{
    const active=b.dataset.mode===mode;
    b.classList.toggle('active',active);
    b.style.background=active?'var(--accent)':'transparent';
    b.style.color=active?'var(--bg2)':'var(--text3)';
  });
  if(_lastRosterForRecs) renderTradeRecs(_lastRosterForRecs);
}

function renderTradeRecs(roster){
  _lastRosterForRecs=roster;
  const mode=_recsMode;
  const el=document.getElementById('mt-trade-recs');
  if(!el) return;
  if(!MODAL_DATA||!MODAL_DATA.length){
    el.innerHTML='<div style="font-size:12px;color:var(--text3);padding:12px;">Load league first.</div>';
    return;
  }

  const projMap=window._projMap||{};
  // Dynasty value: getScore for players, matchedScore for picks
  const dynVal=a=>a.type==='pick'?(a.matchedScore||0):getScore(a);
  // Production value: Sleeper's averaged projection. Falls back to a fraction
  // of dynasty score when projection is missing (rookies, depth players).
  // Picks produce nothing this season, so 0.
  const prodVal=a=>{
    if(a.type==='pick') return 0;
    const proj=projMap[String(a.sleeper_id)];
    return proj!=null?proj:Math.max(0,getScore(a)*0.4);
  };
  // Longevity proxy: years until age 32 for players, 6 yrs of future value
  // for picks (drafted into year N, productive through N+5).
  const longevity=a=>{
    if(a.type==='pick') return 6;
    const age=a.age||27;
    return Math.max(0,32-age);
  };
  const TIER_ORDER={S:5,A:4,B:3,C:2,D:1,F:0};
  const tierDelta=(give,get)=>(TIER_ORDER[tierLetter(dynVal(get))]||0)-(TIER_ORDER[tierLetter(dynVal(give))]||0);

  // POSITIONAL FIT — never recommend acquiring a player at a position
  // where you can't realistically fit them into your starting lineup.
  // Max startable at a position = (required slots at that pos) + (flex
  // slots in the league that can hold that pos). If your current depth at
  // that position already equals the max, you've got bye-week insurance —
  // any more is just clogged bench space.
  const _flexElig={FLEX:['RB','WR','TE'],SUPER_FLEX:['QB','RB','WR','TE'],REC_FLEX:['WR','TE'],WRRB_FLEX:['RB','WR'],WRRB:['RB','WR']};
  const startSlots=window._startSlots||['QB','RB','RB','WR','WR','WR','TE','FLEX'];
  const maxStartable={QB:0,RB:0,WR:0,TE:0};
  startSlots.forEach(s=>{
    if(maxStartable[s]!==undefined) maxStartable[s]++;
    const elig=_flexElig[s]; if(elig) elig.forEach(p=>{maxStartable[p]++;});
  });
  const currentDepth=(r,pos)=>(r.all||[]).filter(p=>p.pos===pos&&dynVal(p)>=10).length;

  // Tier-based fairness. With the 10-tier system (S–I), tier difference is
  // the right signal: same tier = peers, ±1 tier = close pivot, ±2+ = real
  // value gap. No raw-score blending needed — broader tier buckets already
  // group realistic trade targets together.

  // Untouchable core: top 1 player at each position is off-limits.
  function coreFor(r){
    const set=new Set();
    ['QB','RB','WR','TE'].forEach(pos=>{
      const best=(r.all||[]).filter(p=>p.pos===pos).sort((a,b)=>dynVal(b)-dynVal(a))[0];
      if(best) set.add(best.name);
    });
    return set;
  }
  // Player-for-player only. Picks excluded — see commit notes.
  const tradeable=r=>{
    const core=coreFor(r);
    return (r.all||[]).filter(p=>!core.has(p.name)&&!p.unranked&&dynVal(p)>=5);
  };
  const myAssets=tradeable(roster);

  // Score every (mine ↔ theirs) 1-for-1 swap by the active mode
  const candidates=[];
  MODAL_DATA.forEach(other=>{
    if(other.rid===roster.rid) return;
    const theirAssets=tradeable(other);
    myAssets.forEach(give=>{
      theirAssets.forEach(get=>{
        const gv=dynVal(give), tv=dynVal(get);
        if(gv<5||tv<5) return;
        // POSITIONAL FIT: if my depth at the target's position already maxes
        // out the league's startable slots for that position, skip — there's
        // nowhere for this player to fit on game day.
        if(currentDepth(roster,get.pos)>=(maxStartable[get.pos]||99)) return;
        const dVal=tv-gv;                          // + = I gain dynasty value
        const dProd=prodVal(get)-prodVal(give);    // + = I gain weekly PPG
        const dLong=longevity(get)-longevity(give);// + = I extend my window
        const td=tierDelta(give,get);
        let objective=null, verdict='';
        if(mode==='contender'){
          // Same tier or ±1 tier = fair value swap. Production must improve.
          // Cap PPG gain so we don't surface absurd within-tier heists
          // (e.g. trading a depth piece for an in-tier producer at +15 PPG).
          if(Math.abs(td)>1) return;
          if(dProd<=0||dProd>10) return;
          objective=dProd;
          verdict=`+${dProd.toFixed(1)} PPG · fair value`;
        } else if(mode==='winnow'){
          // Aggressive: down 1–2 tiers in dynasty value to chase production.
          // The other team comes out ahead in long-term value, you come out
          // ahead in this-year PPG. Must beat what Contender would find.
          if(td>=0) return;            // must downtier in dynasty
          if(td<-2) return;            // 3+ tiers down = too lopsided
          if(dProd<=5) return;         // gain must clearly exceed Contender's
          objective=dProd;
          verdict=`+${dProd.toFixed(1)} PPG · ${dVal.toFixed(0)} dyn value`;
        } else if(mode==='rebuild'){
          // Same or ±1 tier swap with meaningful career runway gained.
          if(Math.abs(td)>1) return;
          if(dLong<=2) return;
          objective=dLong;
          verdict=`+${dLong.toFixed(0)} yrs window · fair value`;
        }
        if(objective===null) return;
        candidates.push({give,get,dVal,dProd,dLong,verdict,objective,other});
      });
    });
  });

  // Sort by mode-specific objective and take the top 5 unique-target recs
  candidates.sort((a,b)=>b.objective-a.objective);
  const seenTargets=new Set();
  const top=[];
  for(const c of candidates){
    const key=c.get.name+'_'+c.other.rid;
    if(seenTargets.has(key)) continue;
    seenTargets.add(key);
    top.push(c);
    if(top.length>=5) break;
  }

  if(!top.length){
    const hints={
      contender:'No fair-value production upgrades found. Try Win Now for aggressive moves or Rebuild for longevity plays.',
      winnow:'No uptier targets within budget. Your roster may already be top tier — try Contender for marginal upgrades.',
      rebuild:'No fair-value longevity plays. Your roster may already be young — try Contender for production upgrades.'
    };
    el.innerHTML=`<div style="font-size:12px;color:var(--text3);padding:12px;line-height:1.5;">${hints[mode]}</div>`;
    return;
  }

  function labelAsset(a){
    if(a.type==='pick'){
      const rdL={1:'1st',2:'2nd',3:'3rd',4:'4th'}[a.round]||(a.round+'th');
      return `${a.season} ${rdL}`;
    }
    const tier=tierLetter(getScore(a));
    return `${a.name} <span style="color:${tierColor(tier)};font-family:'Russo One',sans-serif;font-size:10px;margin-left:3px;">${tier}</span>`;
  }
  el.innerHTML=top.map(rec=>{
    const otherName=(rec.other.owner||'').split(' ')[0];
    return `<div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r6);padding:10px 12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-family:Oswald,sans-serif;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--accent);">${otherName}</span>
        <span style="font-family:Oswald,sans-serif;font-size:10px;color:var(--text3);">${rec.verdict}</span>
      </div>
      <div style="display:flex;gap:10px;align-items:center;">
        <div style="flex:1;font-size:12px;color:var(--text2);"><span style="color:var(--rt);font-family:Oswald,sans-serif;font-size:9px;letter-spacing:0.1em;text-transform:uppercase;">Give</span><br>${labelAsset(rec.give)}</div>
        <div style="font-size:14px;color:var(--text3);flex-shrink:0;">↔</div>
        <div style="flex:1;font-size:12px;color:var(--text2);text-align:right;"><span style="color:var(--gt);font-family:Oswald,sans-serif;font-size:9px;letter-spacing:0.1em;text-transform:uppercase;">Get</span><br>${labelAsset(rec.get)}</div>
      </div>
    </div>`;
  }).join('');
}

async function buildAllTimeLineup(rid){
  const el=document.getElementById('mt-alltime-lineup');
  el.innerHTML='<div style="font-size:12px;color:var(--text3);padding:12px;">Loading matchup history...</div>';

  const id=window._lastLeagueId;
  if(!id){el.innerHTML='<div style="font-size:12px;color:var(--text3);padding:12px;">Load a league first.</div>';return;}

  try{
    const startCounts={};

    // Fetch all historical league IDs first
    const leagueChain=[];
    let scanId=id;
    const seenL=new Set();
    for(let s=0;s<8;s++){
      if(seenL.has(scanId)) break;
      seenL.add(scanId);
      const lgRes=await fetch(`https://api.sleeper.app/v1/league/${scanId}`).then(r=>r.ok?r.json():null).catch(()=>null);
      if(!lgRes) break;
      // Only count past seasons — skip current season (status !== 'complete')
      if(lgRes.status==='complete'||lgRes.season!==String(new Date().getFullYear())){
        leagueChain.push({scanId,status:lgRes.status});
      }
      if(!lgRes.previous_league_id) break;
      scanId=lgRes.previous_league_id;
    }

    // For each historical league, scan matchups week by week
    for(const {scanId:lid} of leagueChain){
      const weekData=await Promise.all(Array.from({length:18},(_,i)=>
        fetch(`https://api.sleeper.app/v1/league/${lid}/matchups/${i+1}`)
          .then(r=>r.ok?r.json():[]).catch(()=>[])
      ));
      weekData.forEach(week=>{
        if(!Array.isArray(week)||!week.length) return;
        const myEntry=week.find(m=>m.roster_id===rid);
        if(!myEntry) return;
        const starters=myEntry.starters||[];
        // Only count this week if there are actual starters with real scores
        const points=myEntry.players_points||{};
        const hasRealScores=starters.some(pid=>pid&&pid!=='0'&&(points[pid]||0)>0);
        if(!hasRealScores) return;
        starters.forEach(pid=>{
          if(!pid||pid==='0') return;
          if(!startCounts[pid]) startCounts[pid]={pid,starts:0,totalPts:0};
          startCounts[pid].starts++;
          startCounts[pid].totalPts+=(points[pid]||0);
        });
      });
    }

    // Map pids to player names/positions via cached sp
    const sp=window._sleeperPlayers||{};
    const withInfo=Object.values(startCounts).map(({pid,starts,totalPts})=>{
      const p=sp[pid];
      if(!p) return null;
      const name=`${p.first_name||''} ${p.last_name||''}`.trim();
      const pos=p.fantasy_positions?.[0]||p.position||'?';
      return {pid,name,pos,starts,totalPts:totalPts||0};
    }).filter(Boolean);

    if(!withInfo.length){
      el.innerHTML='<div style="font-size:12px;color:var(--text3);padding:12px;">No completed season history found yet.</div>';
      return;
    }

    // Determine lineup slots based on scoring mode
    const isSF=document.querySelector('.scoring-btn.active')?.dataset?.s==='SF';
    const slots=isSF
      ?['QB','RB','RB','WR','WR','WR','TE','FLEX','SFLEX']
      :['QB','RB','RB','WR','WR','WR','TE','FLEX'];

    const used=new Set();
    function bestFor(positions){
      return withInfo
        .filter(p=>positions.includes(p.pos)&&!used.has(p.pid))
        .sort((a,b)=>b.starts-a.starts)[0]||null;
    }

    const lineup=slots.map(slot=>{
      let positions;
      if(slot==='FLEX') positions=['WR','RB','TE'];
      else if(slot==='SFLEX') positions=['QB','WR','RB','TE'];
      else positions=[slot];
      const best=bestFor(positions);
      if(best) used.add(best.pid);
      return {slot,player:best};
    });

    const PC={'QB':'var(--qb)','WR':'var(--wr)','RB':'var(--rb)','TE':'var(--te)'};
    el.innerHTML=lineup.map(({slot,player})=>{
      const pc=PC[player?.pos]||'var(--text3)';
      const dbPlayer=player?DATA.find(d=>d.type==='player'&&d.name===player.name):null;
      const score=dbPlayer?.score;
      const pts=player?.totalPts;
      const nameEl=dbPlayer
        ?`<span onclick="showPlayerCardModal(${dbPlayer.rank})" style="font-family:'Oswald',sans-serif;font-size:13px;font-weight:600;color:var(--text);cursor:pointer;text-decoration:underline;text-decoration-color:var(--border2);">${player.name}</span>`
        :`<span style="font-family:'Oswald',sans-serif;font-size:13px;font-weight:600;color:var(--text);">${player?.name||'—'}</span>`;
      return `<div style="display:grid;grid-template-columns:70px 1fr auto auto auto;gap:10px;align-items:center;padding:7px 14px;background:var(--panel);border:1px solid var(--border);">
        <span style="font-family:'Oswald',sans-serif;font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:var(--text3);">${slot}</span>
        ${player?`
          <span>${nameEl} <span style="font-size:9px;border:1px solid ${pc};color:${pc};padding:1px 4px;margin-left:3px;">${player.pos}</span></span>
          <span style="font-size:11px;color:var(--text3);font-family:'Oswald',sans-serif;">${player.starts} start${player.starts!==1?'s':''}</span>
          <span style="font-size:11px;color:var(--gold);font-family:'Oswald',sans-serif;">${pts?pts.toFixed(1)+' pts':''}</span>
          <span style="font-family:'Russo One',sans-serif;font-size:13px;color:${score?tierColor(tierLetter(score)):'var(--text3)'};">${score?tierLetter(score):'—'}</span>
        `:`
          <span style="font-size:12px;color:var(--text3);font-style:italic;">No starter data</span>
          <span></span><span></span><span></span>
        `}
      </div>`;
    }).join('');

  }catch(e){
    el.innerHTML=`<div style="font-size:12px;color:var(--text3);padding:12px;">Failed to load matchup history.</div>`;
  }
}
// ===== END MY TEAM PAGE =====
