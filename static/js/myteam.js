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
  document.getElementById('mt-picks').innerHTML=picks.length
    ?picks.map(pk=>{
      const rd=pk.round;const yr=pk.season;
      const rdLabel=rd===1?'1st':rd===2?'2nd':rd===3?'3rd':'4th';
      const pc=pickColor(rd);
      const matched=DATA.find(d=>d.type==='pick'&&d.year==yr&&d.round==rd);
      const tier=matched?tierLetter(matched.score):'—';
      const tierC=matched?tierColor(tier):'var(--text3)';
      return `<div style="display:flex;align-items:center;gap:12px;padding:7px 14px;background:var(--panel);border:1px solid var(--border);">
        <span style="font-family:'Oswald',sans-serif;font-size:9px;letter-spacing:0.08em;border:1px solid ${pc};color:${pc};padding:1px 5px;flex-shrink:0;">PICK</span>
        <span style="font-family:'Oswald',sans-serif;font-size:13px;font-weight:600;color:var(--text);flex:1;">${yr} ${rdLabel} · Mid</span>
        <span style="font-family:'Russo One',sans-serif;font-size:13px;color:${tierC};">${tier}</span>
      </div>`;}).join('')
    :'<div style="font-size:12px;color:var(--text3);padding:12px;">No draft picks.</div>';

  // All-time starting lineup — fetch matchup history
  await buildAllTimeLineup(rid);

  // Trade recommendations — engine based on the user's hole/surplus/window profile
  renderTradeRecs(roster);
}

// ── TRADE RECOMMENDATIONS ────────────────────────────────────────────────
// Builds a personalized trade rec list for the user's chosen team based on:
//   1. Positional holes (worst-deficit positions vs league avg)
//   2. Surplus assets (extra players above league at a position + spare picks)
//   3. Contention window (avg age of top-9 starters → win-now vs build)
//   4. Liquid value (target must be within reach via surplus assets)
//   5. Mutual fit (target's owner has a hole in one of OUR surplus positions)
function renderTradeRecs(roster){
  const el=document.getElementById('mt-trade-recs');
  if(!el) return;
  if(!MODAL_DATA||!MODAL_DATA.length){
    el.innerHTML='<div style="font-size:12px;color:var(--text3);padding:12px;">Load league first.</div>';
    return;
  }
  const POSITIONS=['QB','RB','WR','TE'];
  // League-average BEST player at each position (used by other code as the
  // hole threshold). Re-compute here for the rec engine.
  const posAvgTop={};      // avg of each team's BEST player at pos
  const posAvgDepth={};    // avg of each team's #2 player at pos (depth signal)
  POSITIONS.forEach(pos=>{
    const tops=[],seconds=[];
    MODAL_DATA.forEach(r=>{
      const pp=r.all.filter(p=>p.pos===pos).sort((a,b)=>getScore(b)-getScore(a));
      tops.push(pp[0]?getScore(pp[0]):0);
      seconds.push(pp[1]?getScore(pp[1]):0);
    });
    posAvgTop[pos]=tops.reduce((s,v)=>s+v,0)/tops.length;
    posAvgDepth[pos]=seconds.reduce((s,v)=>s+v,0)/seconds.length;
  });

  // ── HOLES: combined need-score per position ─────────────────────────
  // We rank each position by a NEED SCORE that combines (a) how far below
  // league avg this team is at that position, and (b) where this team
  // ranks among rivals at that position. This produces a team-specific
  // priority order — even two teams with similar absolute holes will
  // have different relative weaknesses, so their rec lists won't converge.
  const numTeams=MODAL_DATA.length||12;
  const posMeta=POSITIONS.map(pos=>{
    const pp=roster.all.filter(p=>p.pos===pos).sort((a,b)=>getScore(b)-getScore(a));
    const best=pp[0]?getScore(pp[0]):0;
    const deficit=posAvgTop[pos]-best;
    // League rank at this position (1 = best in league)
    const allBests=MODAL_DATA.map(r=>{
      const x=r.all.filter(p=>p.pos===pos).sort((a,b)=>getScore(b)-getScore(a))[0];
      return {rid:r.rid, best:x?getScore(x):0};
    }).sort((a,b)=>b.best-a.best);
    const myLeagueRank=allBests.findIndex(x=>x.rid===roster.rid)+1;
    // Need score: weighted blend of deficit-vs-avg and league rank percentile.
    // Both normalized to [0,1] roughly; higher = bigger need.
    const deficitScore=Math.max(0, deficit/(posAvgTop[pos]||1));
    const rankScore=(myLeagueRank-1)/Math.max(1,numTeams-1);
    const needScore=deficitScore*0.55+rankScore*0.45;
    return {pos, best, deficit, bestPlayer:pp[0]?.name||'None', leagueRank:myLeagueRank, needScore};
  });

  const myHoles=[];
  // Absolute holes (genuinely weak — best is <85% of league avg)
  posMeta.forEach(m=>{
    const isAbsHole=m.best===0||m.best<posAvgTop[m.pos]*0.85;
    if(isAbsHole) myHoles.push({...m, kind:'absolute'});
  });
  // Always include the top-2 by need score so we have at least two distinct
  // priority positions to recommend against. Even a strong team has a
  // weakest area and a second-weakest area — those become rec targets.
  const sortedByNeed=[...posMeta].sort((a,b)=>b.needScore-a.needScore);
  for(const m of sortedByNeed){
    if(myHoles.length>=2) break;
    if(myHoles.find(h=>h.pos===m.pos)) continue;
    myHoles.push({...m, kind:myHoles.length?'relative':(m.best<posAvgTop[m.pos]*0.85?'absolute':'relative')});
  }
  myHoles.sort((a,b)=>b.needScore-a.needScore);

  // ── SURPLUS: positions where this team has REAL depth advantage ────
  // Surplus requires both depth (3+ above-average players) AND a strong
  // league rank (top-half at that position). A team with 3 mediocre RBs
  // isn't really a "surplus seller" — they're hoarding D-tier depth.
  const mySurplusPos=[];
  POSITIONS.forEach(pos=>{
    const above=roster.all.filter(p=>p.pos===pos&&getScore(p)>=posAvgTop[pos]*0.8);
    const meta=posMeta.find(m=>m.pos===pos);
    const topHalfAtPos=meta&&meta.leagueRank<=Math.ceil(numTeams/2);
    if(above.length>=3&&topHalfAtPos){
      // Surplus score: depth bonus + league rank inverse. Higher = more
      // available to trade away.
      const surplusScore=above.length*1.0+(numTeams-meta.leagueRank)*0.3;
      mySurplusPos.push({pos, count:above.length, players:above, leagueRank:meta.leagueRank, surplusScore});
    }
  });
  mySurplusPos.sort((a,b)=>b.surplusScore-a.surplusScore);
  // Pick surplus: any pick beyond the first in a given year is "movable",
  // and 2nd-round+ picks are also generally movable.
  const myPicks=(roster.picks||[]).slice().sort((a,b)=>a.season-b.season||a.round-b.round);
  const surplusPicks=[];
  const firstByYear={};
  myPicks.forEach(pk=>{
    const yr=pk.season;
    if(!firstByYear[yr]){firstByYear[yr]=pk;return;}
    surplusPicks.push(pk); // additional picks in the same year
  });
  // Also flag deep picks (3rd+ rounds) as available for sweetener
  myPicks.forEach(pk=>{if(pk.round>=3&&!surplusPicks.includes(pk)) surplusPicks.push(pk);});

  // ── CONTENTION WINDOW: weighted age of top-9 AND projected strength ──
  // A young team isn't a "contender" if their projected production is in the
  // league's bottom half — age alone is misleading. Combine both signals:
  // age tells us the timeline, projected roster value tells us if they
  // actually have enough firepower to contend right now.
  const topNine=roster.all.slice().sort((a,b)=>getScore(b)-getScore(a)).slice(0,9);
  const weighted=topNine.reduce((acc,p)=>{
    const pk={QB:30,WR:27,RB:25,TE:28}[p.pos]||27;
    const age=p.age||pk;
    const w=getScore(p);
    return {sum:acc.sum+age*w,w:acc.w+w};
  },{sum:0,w:0});
  const coreAge=weighted.w>0?weighted.sum/weighted.w:26;

  // Projected strength: where this team's totalScore ranks among the league.
  // Bottom half (rank > halfway) can't be a contender no matter their age.
  const valueRanked=MODAL_DATA.slice().sort((a,b)=>b.totalScore-a.totalScore);
  const myValueRank=valueRanked.findIndex(r=>r.rid===roster.rid)+1;
  const inBottomHalf=myValueRank>Math.floor(MODAL_DATA.length/2);
  const inTopThird=myValueRank<=Math.ceil(MODAL_DATA.length/3);

  let windowLabel, windowMode;
  if(coreAge<=25.0){
    windowLabel='Rebuilding'; windowMode='build';
  } else if(coreAge<=26.5){
    // Ascending normally, but if firepower is bottom-half they're still
    // really rebuilding regardless of age. Young AND weak = rebuild.
    if(inBottomHalf){windowLabel='Rebuilding'; windowMode='build';}
    else {windowLabel='Ascending'; windowMode='ascend';}
  } else if(coreAge<=28.0){
    // Prime age. Only a contender if firepower confirms it.
    if(inBottomHalf){windowLabel='Stuck in the Middle'; windowMode='ascend';}
    else if(inTopThird){windowLabel='Contention'; windowMode='contend';}
    else {windowLabel='Ascending'; windowMode='ascend';}
  } else {
    // Old AND bottom-half = needs reset, not "closing"
    if(inBottomHalf){windowLabel='Needs Reset'; windowMode='build';}
    else {windowLabel='Closing Window'; windowMode='closing';}
  }

  // ── BUILD per-team profiles for matchmaking ───────────────────────────
  // For each rival, identify their holes (what they need) and surplus
  // (what they have to give). We're looking for mutual fit.
  const rivals=MODAL_DATA.filter(r=>r.rid!==roster.rid).map(r=>{
    // Compute each rival's per-position need score (same formula as mine).
    // Their "holes" = top-2 highest need positions. This gives us much
    // better mutual-fit matching because we know what each rival ACTUALLY
    // wants, not just where they have an absolute deficiency.
    const rPosMeta=POSITIONS.map(pos=>{
      const pp=r.all.filter(p=>p.pos===pos).sort((a,b)=>getScore(b)-getScore(a));
      const best=pp[0]?getScore(pp[0]):0;
      const deficit=posAvgTop[pos]-best;
      // Their rank at this position
      const allBests=MODAL_DATA.map(rr=>{
        const x=rr.all.filter(p=>p.pos===pos).sort((a,b)=>getScore(b)-getScore(a))[0];
        return {rid:rr.rid, best:x?getScore(x):0};
      }).sort((a,b)=>b.best-a.best);
      const rRank=allBests.findIndex(x=>x.rid===r.rid)+1;
      const deficitScore=Math.max(0, deficit/(posAvgTop[pos]||1));
      const rankScore=(rRank-1)/Math.max(1,numTeams-1);
      const needScore=deficitScore*0.55+rankScore*0.45;
      return {pos, best, deficit, leagueRank:rRank, needScore, isAbs:best===0||best<posAvgTop[pos]*0.85};
    });
    // Their priority needs: top-2 by need score. Absolute holes always included.
    const rPriorityHoles=[];
    rPosMeta.forEach(m=>{if(m.isAbs) rPriorityHoles.push(m.pos);});
    [...rPosMeta].sort((a,b)=>b.needScore-a.needScore).forEach(m=>{
      if(rPriorityHoles.length>=2) return;
      if(!rPriorityHoles.includes(m.pos)) rPriorityHoles.push(m.pos);
    });
    // Their surplus: depth + top-half league rank at the position
    const rSurplusPos=[];
    POSITIONS.forEach(pos=>{
      const above=r.all.filter(p=>p.pos===pos&&getScore(p)>=posAvgTop[pos]*0.8);
      const meta=rPosMeta.find(m=>m.pos===pos);
      const topHalf=meta&&meta.leagueRank<=Math.ceil(numTeams/2);
      if(above.length>=3&&topHalf) rSurplusPos.push({pos, players:above});
    });
    return {roster:r, holes:rPriorityHoles, surplusPos:rSurplusPos, posMeta:rPosMeta};
  });

  // ── For each of MY holes, find candidate targets ──────────────────────
  // A candidate is a player at the hole position, owned by a rival who has
  // surplus there AND has a hole at one of MY surplus positions (mutual fit).
  // If no mutual-fit owner exists, fall back to any rival with surplus there.
  const PEAK={QB:30,WR:27,RB:25,TE:28};
  const mySurplusPositions=new Set(mySurplusPos.map(s=>s.pos));
  function ageFitMultiplier(age, pos){
    // Lower = better target for the window. We want targets whose age sweet
    // spot aligns with where the team is going.
    const pk=PEAK[pos]||27;
    if(windowMode==='build'){
      if(age<=pk-1) return 1.15;          // young upside is gold
      if(age<=pk+1) return 0.85;
      return 0.5;                         // 30+ player on a rebuild is bad
    }
    if(windowMode==='contend'){
      if(age<=pk-3) return 0.75;          // too young to help now
      if(age<=pk+2) return 1.15;          // prime
      return 0.85;
    }
    if(windowMode==='closing'){
      if(age<=pk-2) return 0.6;           // unhelpful for a closing window
      return 1.1;
    }
    return 1.0; // ascend mode is neutral
  }

  function pickValue(pk){
    return pk.matchedScore||0;
  }

  // Build a candidate list per hole position
  const recs=[];
  for(const hole of myHoles){
    const pos=hole.pos;
    // All rivals who have surplus at this position
    const rivalsWithSurplus=rivals.filter(rv=>rv.surplusPos.some(s=>s.pos===pos));
    if(!rivalsWithSurplus.length) continue;

    // For each such rival, propose a target player from their surplus
    for(const rv of rivalsWithSurplus){
      const theirPool=rv.roster.all.filter(p=>p.pos===pos).sort((a,b)=>getScore(b)-getScore(a));
      // Don't target their #1 starter at the position — they won't trade it.
      // Pick from their 2nd or 3rd best at that position.
      const candidates=theirPool.slice(1,3);

      // Mutual fit bonus if this rival has a hole at one of my surplus pos
      const mutual=rv.holes.some(h=>mySurplusPositions.has(h));
      const mutualPos=rv.holes.find(h=>mySurplusPositions.has(h));

      // For acquisition recs, the target must be an UPGRADE over what we
      // currently have at that position. Otherwise we'd recommend trading
      // away assets for someone worse than our existing starter.
      const myBestAtPos=roster.all.filter(p=>p.pos===pos)
        .sort((a,b)=>getScore(b)-getScore(a))[0];
      const myBestVal=myBestAtPos?getScore(myBestAtPos):0;

      for(const target of candidates){
        const targetVal=getScore(target);
        if(targetVal<8) continue; // not worth chasing waiver-level depth
        if(targetVal<=myBestVal) continue; // must be an upgrade
        const fitMult=ageFitMultiplier(target.age||PEAK[pos], pos);
        // Effective desirability — multiple factors so different teams
        // surface different recs:
        //   * raw target value
        //   * age fit for my window
        //   * mutual fit bonus (BIG — drives league-wide differentiation)
        //   * my hole priority (top hole > second hole)
        //   * hole need score (severe holes get bigger boosts)
        const mutualBoost=mutual?1.55:0.85; // mutual fit nearly doubles, non-mutual gets penalty
        const holePriority=hole===myHoles[0]?1.15:1.0;
        const needBoost=1.0+hole.needScore*0.5;
        const desirability=targetVal*fitMult*mutualBoost*holePriority*needBoost;

        // ── Build the package from my surplus ──────────────────────────
        // Prefer the most common dynasty trade shapes, in this order:
        //   (a) Single surplus player whose value alone hits the target band
        //   (b) One surplus player + one pick (the classic dynasty trade)
        //   (c) Two surplus players (no pick needed)
        //   (d) Two surplus players + one pick (only if nothing simpler works)
        // Avoids stacking multiple picks on top of multiple players for a
        // single target — that pattern doesn't match how real trades happen.
        const targetMin=targetVal-3;
        const targetMax=targetVal+8;

        // Pool of usable surplus players (excludes core top-2 at each pos)
        const myCoreNames=new Set();
        POSITIONS.forEach(p=>{
          roster.all.filter(x=>x.pos===p).sort((a,b)=>getScore(b)-getScore(a))
            .slice(0,2).forEach(x=>myCoreNames.add(x.name));
        });
        const surplusPlayersOrdered=[];
        if(mutualPos){
          const fromMutual=roster.all.filter(p=>p.pos===mutualPos)
            .sort((a,b)=>getScore(b)-getScore(a)).slice(1);
          surplusPlayersOrdered.push(...fromMutual);
        }
        mySurplusPos.forEach(s=>{
          if(s.pos===mutualPos) return;
          const fromPos=roster.all.filter(p=>p.pos===s.pos)
            .sort((a,b)=>getScore(b)-getScore(a)).slice(2);
          surplusPlayersOrdered.push(...fromPos);
        });
        const seen=new Set();
        const usable=surplusPlayersOrdered.filter(p=>{
          if(myCoreNames.has(p.name)) return false;
          if(seen.has(p.name)) return false;
          seen.add(p.name);
          return getScore(p)>=3;
        });
        usable.sort((a,b)=>getScore(b)-getScore(a));
        const sortedPicks=[...surplusPicks].sort((a,b)=>pickValue(b)-pickValue(a));

        let pkg=[]; let pkgVal=0;
        const inRange=(v)=>v>=targetMin&&v<=targetMax+5;

        // (a) Try single player
        const solo=usable.find(p=>inRange(getScore(p)));
        if(solo){
          pkg=[{type:'player',item:solo,val:getScore(solo)}];
          pkgVal=getScore(solo);
        }

        // (b) Try player + pick (the classic dynasty trade shape)
        if(!pkg.length){
          for(const p of usable){
            const pv=getScore(p);
            if(pv>=targetMax) continue; // alone would overpay
            for(const pk of sortedPicks){
              const total=pv+pickValue(pk);
              if(inRange(total)){
                pkg=[{type:'player',item:p,val:pv},{type:'pick',item:pk,val:pickValue(pk)}];
                pkgVal=total;
                break;
              }
            }
            if(pkg.length) break;
          }
        }

        // (c) Try two players (no pick)
        if(!pkg.length){
          for(let i=0;i<usable.length;i++){
            for(let j=i+1;j<usable.length;j++){
              const total=getScore(usable[i])+getScore(usable[j]);
              if(inRange(total)){
                pkg=[
                  {type:'player',item:usable[i],val:getScore(usable[i])},
                  {type:'player',item:usable[j],val:getScore(usable[j])}
                ];
                pkgVal=total;
                break;
              }
            }
            if(pkg.length) break;
          }
        }

        // (d) Last resort: two players + one pick
        if(!pkg.length){
          for(let i=0;i<usable.length;i++){
            for(let j=i+1;j<usable.length;j++){
              const pSum=getScore(usable[i])+getScore(usable[j]);
              if(pSum>=targetMax) continue;
              for(const pk of sortedPicks){
                const total=pSum+pickValue(pk);
                if(inRange(total)){
                  pkg=[
                    {type:'player',item:usable[i],val:getScore(usable[i])},
                    {type:'player',item:usable[j],val:getScore(usable[j])},
                    {type:'pick',item:pk,val:pickValue(pk)}
                  ];
                  pkgVal=total;
                  break;
                }
              }
              if(pkg.length) break;
            }
            if(pkg.length) break;
          }
        }

        // If we still can't reach the target value, skip — not attainable
        if(!pkg.length) continue;
        if(pkgVal>targetVal*1.4) continue;

        recs.push({
          target, targetVal,
          fromOwner:rv.roster.owner,
          mutualPos,
          pkg, pkgVal,
          desirability,
          hole:pos,
          windowMode, coreAge
        });
      }
    }
  }

  // Rank recs by desirability with DIVERSITY: cap at 2 per hole position
  // so the rec list doesn't end up "Get a WR, get a WR, get a WR, get a WR."
  // Each team gets at most 2 picks per hole, ensuring spread across needs.
  recs.sort((a,b)=>b.desirability-a.desirability);
  const seenTargets=new Set();
  const recsPerHole={};
  const topRecs=[];
  for(const r of recs){
    const key=r.target.name;
    if(seenTargets.has(key)) continue;
    recsPerHole[r.hole]=recsPerHole[r.hole]||0;
    if(recsPerHole[r.hole]>=2) continue;
    seenTargets.add(key);
    recsPerHole[r.hole]++;
    topRecs.push(r);
    if(topRecs.length>=6) break;
  }

  // ── DOWNTIER RECS ──────────────────────────────────────────────────────
  // When this team has no ABSOLUTE holes (all positions top-tier), surface
  // consolidation-in-reverse plays: trade a high-end starter at a strength
  // position for a lesser but still solid player at the same position, PLUS
  // a 1st or 2nd round pick as a sweetener. Net effect: take a small
  // production hit at your best position to accumulate future capital.
  const downtierRecs=[];
  const hasAbsoluteHole=myHoles.some(h=>h.kind==='absolute');
  if(!hasAbsoluteHole){
    // Identify strength positions: this team ranks top-2 in the league AND
    // has at least 2 quality starters there
    const strengths=posMeta.filter(m=>{
      const pp=roster.all.filter(p=>p.pos===m.pos&&getScore(p)>=posAvgTop[m.pos]*0.9);
      return m.leagueRank<=2 && pp.length>=2;
    });
    for(const strength of strengths){
      const pos=strength.pos;
      const myAtPos=roster.all.filter(p=>p.pos===pos).sort((a,b)=>getScore(b)-getScore(a));
      // The player we're moving = our #2 at the position (keep #1, the elite)
      const movePlayer=myAtPos[1];
      if(!movePlayer) continue;
      const moveVal=getScore(movePlayer);
      if(moveVal<15) continue; // not worth a downtier deal

      // Find rivals who need help at this position
      const needyRivals=rivals.filter(rv=>{
        const theirBest=rv.roster.all.filter(p=>p.pos===pos).sort((a,b)=>getScore(b)-getScore(a))[0];
        const theirVal=theirBest?getScore(theirBest):0;
        // They have a real positional weakness AND have at least one quality
        // pick to send back
        const hasQualityPick=(rv.roster.picks||[]).some(pk=>(pk.matchedScore||0)>=15);
        return theirVal<moveVal*0.85 && hasQualityPick;
      });

      for(const rv of needyRivals){
        // What they send back: a clear tier-down player at the same position
        // PLUS a 1st-round pick. The pick is the actual value bridge — the
        // return player should be noticeably lesser, not nearly equal.
        const theirPlayers=rv.roster.all.filter(p=>p.pos===pos)
          .sort((a,b)=>getScore(b)-getScore(a));
        const returnPlayer=theirPlayers.find(p=>{
          const v=getScore(p);
          return v>=moveVal*0.40 && v<=moveVal*0.70;
        });
        if(!returnPlayer) continue;

        // Their best 1st-round pick (not 2nd — uptier/downtier deals are
        // most commonly built around a 1st as the bridge)
        const theirPicks=(rv.roster.picks||[]).slice()
          .filter(pk=>pk.round===1)
          .sort((a,b)=>(b.matchedScore||0)-(a.matchedScore||0));
        const sweetener=theirPicks[0];
        if(!sweetener) continue;

        const returnVal=getScore(returnPlayer)+(sweetener.matchedScore||0);
        // Deal needs to be roughly fair — within ±15% of what we send
        if(returnVal<moveVal*0.85||returnVal>moveVal*1.20) continue;

        downtierRecs.push({
          movePlayer, moveVal,
          returnPlayer, sweetener,
          returnVal,
          toOwner:rv.roster.owner,
          pos,
          strengthRank:strength.leagueRank
        });
      }
    }
    // De-dupe by (movePlayer, returnPlayer) and rank by smallest value gap (most fair)
    downtierRecs.sort((a,b)=>Math.abs(b.returnVal-b.moveVal)-Math.abs(a.returnVal-a.moveVal));
    // Actually we want the FAIREST deals first (smallest absolute gap)
    downtierRecs.sort((a,b)=>Math.abs(a.returnVal-a.moveVal)-Math.abs(b.returnVal-b.moveVal));
    const seenMove=new Set();
    const filtered=[];
    for(const r of downtierRecs){
      const key=r.movePlayer.name+'→'+r.returnPlayer.name;
      if(seenMove.has(key)) continue;
      seenMove.add(key);
      filtered.push(r);
      if(filtered.length>=3) break;
    }
    downtierRecs.length=0;
    downtierRecs.push(...filtered);
  }

  // ── UPTIER RECS ────────────────────────────────────────────────────────
  // For contending teams that have depth but no league-elite asset at a
  // position. The dynasty-standard uptier shape: send ONE quality starter +
  // ONE 1st-round pick to acquire ONE league-elite player at that same
  // position. Quantity converts to quality with a 1st as the bridge.
  const uptierRecs=[];
  const isWinningNow=windowMode==='contend'||windowMode==='closing';
  if(isWinningNow&&mySurplusPos.length){
    // Best 1st-round pick we have to send as the bridge piece
    const my1sts=(roster.picks||[]).filter(pk=>pk.round===1)
      .slice().sort((a,b)=>(b.matchedScore||0)-(a.matchedScore||0));
    if(!my1sts.length){
      // No 1st to use as bridge — uptier isn't really viable.
    }

    for(const surplus of mySurplusPos){
      const pos=surplus.pos;
      const myAtPos=roster.all.filter(p=>p.pos===pos).sort((a,b)=>getScore(b)-getScore(a));
      // League-wide elite tier (top-3 at this position)
      const allAtPos=MODAL_DATA.flatMap(r=>r.all.filter(p=>p.pos===pos)
        .map(p=>({player:p, owner:r.owner, rid:r.rid, val:getScore(p)})));
      allAtPos.sort((a,b)=>b.val-a.val);
      const eliteTier=allAtPos.slice(0,3);
      // If we already own an elite at this position, no uptier needed
      if(eliteTier.find(e=>e.rid===roster.rid)) continue;

      for(const elite of eliteTier){
        if(elite.rid===roster.rid) continue;
        const target=elite.player;
        const targetVal=elite.val;

        // Receptive seller check
        const targetRoster=MODAL_DATA.find(r=>r.rid===elite.rid);
        if(!targetRoster) continue;
        const targetTopNine=targetRoster.all.slice().sort((a,b)=>getScore(b)-getScore(a)).slice(0,9);
        const targetWeighted=targetTopNine.reduce((acc,p)=>{
          const pk=PEAK[p.pos]||27;
          const age=p.age||pk;
          const w=getScore(p);
          return {sum:acc.sum+age*w,w:acc.w+w};
        },{sum:0,w:0});
        const targetAge=targetWeighted.w>0?targetWeighted.sum/targetWeighted.w:26;
        const targetHoleCount=POSITIONS.filter(p=>{
          const tp=targetRoster.all.filter(x=>x.pos===p).sort((a,b)=>getScore(b)-getScore(a))[0];
          return !tp||getScore(tp)<posAvgTop[p]*0.85;
        }).length;
        const receptive=targetAge<=26.0||targetHoleCount>=2;
        if(!receptive) continue;

        // Bridge piece: our #2 at the surplus position (depth piece we won't
        // miss as much, but still has real trade value). Don't touch #1.
        const bridgePlayer=myAtPos[1];
        if(!bridgePlayer) continue;
        const bridgeVal=getScore(bridgePlayer);
        if(bridgeVal<10) continue; // need a real piece, not a flier

        // Find a 1st-round pick that, combined with the bridge player, lands
        // in the fair-value band for the target. Prefer the smallest pick
        // that still gets us there — don't overpay with our best 1st when a
        // later one suffices.
        const targetMin=targetVal-4;
        const targetMax=targetVal+8;
        const picksAsc=my1sts.slice().sort((a,b)=>(a.matchedScore||0)-(b.matchedScore||0));
        let chosenPick=null;
        for(const pk of picksAsc){
          const total=bridgeVal+(pk.matchedScore||0);
          if(total>=targetMin&&total<=targetMax){
            chosenPick=pk;
            break;
          }
        }
        // If no 1st works alone, allow a 2nd as fallback bridge (smaller deals)
        if(!chosenPick){
          const my2nds=(roster.picks||[]).filter(pk=>pk.round===2)
            .sort((a,b)=>(b.matchedScore||0)-(a.matchedScore||0));
          for(const pk of my2nds){
            const total=bridgeVal+(pk.matchedScore||0);
            if(total>=targetMin&&total<=targetMax){
              chosenPick=pk;
              break;
            }
          }
        }
        if(!chosenPick) continue;

        const pkgVal=bridgeVal+(chosenPick.matchedScore||0);
        uptierRecs.push({
          target, targetVal,
          pkg:[
            {type:'player',item:bridgePlayer,val:bridgeVal},
            {type:'pick',item:chosenPick,val:chosenPick.matchedScore||0}
          ],
          pkgVal,
          fromOwner:elite.owner,
          pos,
          targetAge,
          targetHoleCount,
          eliteRank:allAtPos.findIndex(e=>e.player.name===target.name)+1
        });
      }
    }
    // De-dupe by target & rank by best (target value × age fit), tightest fair-value first
    uptierRecs.sort((a,b)=>{
      const aFit=ageFitMultiplier(a.target.age||PEAK[a.pos], a.pos);
      const bFit=ageFitMultiplier(b.target.age||PEAK[b.pos], b.pos);
      return b.targetVal*bFit-a.targetVal*aFit;
    });
    const seenT=new Set();
    const filtered=[];
    for(const r of uptierRecs){
      if(seenT.has(r.target.name)) continue;
      seenT.add(r.target.name);
      filtered.push(r);
      if(filtered.length>=3) break;
    }
    uptierRecs.length=0;
    uptierRecs.push(...filtered);
  }

  // ── FALLBACK RECS: guarantee at least 3 actionable moves per roster ──
  // If the strict logic above produced fewer than 3 recs across all three
  // categories, generate window-appropriate fallback moves. These relax the
  // hole/surplus/mutual-fit constraints so we always have at least three
  // ideas to surface — but they still respect the team's window so we
  // never recommend "win-now vets" to a rebuilder, etc.
  const totalRecsCount=()=>topRecs.length+downtierRecs.length+uptierRecs.length;
  if(totalRecsCount()<3){
    // Universe of usable surplus pieces for offer-building (same logic as
    // earlier — exclude core top-2 at each position from being traded away).
    const coreNames=new Set();
    POSITIONS.forEach(p=>{
      roster.all.filter(x=>x.pos===p).sort((a,b)=>getScore(b)-getScore(a))
        .slice(0,2).forEach(x=>coreNames.add(x.name));
    });
    const myUsable=roster.all.filter(p=>!coreNames.has(p.name)&&getScore(p)>=3)
      .sort((a,b)=>getScore(b)-getScore(a));
    const myAllPicks=(roster.picks||[]).slice().sort((a,b)=>(b.matchedScore||0)-(a.matchedScore||0));

    // Helper to assemble a 1-player + 1-pick package targeting `targetVal`
    function makePkg(targetVal){
      const tMin=targetVal-4, tMax=targetVal+10;
      // Try single player
      for(const p of myUsable){
        const v=getScore(p);
        if(v>=tMin&&v<=tMax) return {pkg:[{type:'player',item:p,val:v}], val:v};
      }
      // Try player + pick (preferred shape)
      for(const p of myUsable){
        const v=getScore(p);
        if(v>=tMax) continue;
        for(const pk of myAllPicks){
          const pv=pk.matchedScore||0;
          const total=v+pv;
          if(total>=tMin&&total<=tMax){
            return {pkg:[{type:'player',item:p,val:v},{type:'pick',item:pk,val:pv}], val:total};
          }
        }
      }
      // Try picks alone (rebuilders may want to combine picks)
      for(let i=0;i<myAllPicks.length;i++){
        const pv=myAllPicks[i].matchedScore||0;
        if(pv>=tMin&&pv<=tMax) return {pkg:[{type:'pick',item:myAllPicks[i],val:pv}], val:pv};
        for(let j=i+1;j<myAllPicks.length;j++){
          const total=pv+(myAllPicks[j].matchedScore||0);
          if(total>=tMin&&total<=tMax){
            return {pkg:[{type:'pick',item:myAllPicks[i],val:pv},{type:'pick',item:myAllPicks[j],val:myAllPicks[j].matchedScore||0}], val:total};
          }
        }
      }
      return null;
    }

    // Window-tailored fallback target search.
    // Critical: the previous fallback scanned ALL rival players, which made
    // recs converge across teams (everyone got the same league-best targets).
    // The new fallback only targets MY actual hole positions, weighted by
    // rivals who have actual mutual-trade-fit with my surplus.
    const fallbackTargets=[];
    const myHolePositions=new Set(myHoles.map(h=>h.pos));

    function isWindowFit(p){
      const age=p.age||PEAK[p.pos]||27;
      const pk=PEAK[p.pos]||27;
      if(windowMode==='build'){return age<=pk;}     // young or peak only
      if(windowMode==='contend'){return age>=pk-3&&age<=pk+2;}
      if(windowMode==='closing'){return age>=pk-2;}
      return true; // ascend = neutral
    }

    // Build pool of candidate targets: ONLY players at one of my hole
    // positions, owned by rivals (skip rival's #1 at that pos — won't trade).
    const rankedTargets=[];
    for(const rv of rivals){
      for(const pos of myHolePositions){
        const theirAtPos=rv.roster.all.filter(p=>p.pos===pos)
          .sort((a,b)=>getScore(b)-getScore(a));
        // Skip rival's #1 (they won't part with their best at that pos).
        // Look at #2, #3.
        for(const player of theirAtPos.slice(1,3)){
          const v=getScore(player);
          if(v<10) continue;
          if(!isWindowFit(player)) continue;
          // Must be an upgrade over my current best at the pos
          const myAtPos=roster.all.filter(p=>p.pos===pos)
            .sort((a,b)=>getScore(b)-getScore(a));
          const myBestAtPos=myAtPos[0]?getScore(myAtPos[0]):0;
          if(v<=myBestAtPos) continue;
          // Skip if already in topRecs/uptier
          const alreadyIn=topRecs.some(r=>r.target.name===player.name)
            ||uptierRecs.some(r=>r.target.name===player.name);
          if(alreadyIn) continue;
          // Mutual fit: rival has a hole at one of MY surplus positions
          const mutual=rv.holes.some(h=>mySurplusPositions.has(h));
          const fit=ageFitMultiplier(player.age||PEAK[pos], pos);
          // My need at this hole (severe holes weighted higher)
          const myHole=myHoles.find(h=>h.pos===pos);
          const needBoost=myHole?1.0+myHole.needScore*0.4:1.0;
          const mutualBoost=mutual?1.4:1.0;
          rankedTargets.push({
            player, owner:rv.roster.owner, rid:rv.roster.rid,
            val:v, riv:rv, pos, fit, mutual,
            score:v*fit*mutualBoost*needBoost
          });
        }
      }
    }
    rankedTargets.sort((a,b)=>b.score-a.score);

    // Pull from rankedTargets until we have ≥3 total recs across all types.
    // Diversity: max 1 fallback per hole position so recs spread across needs.
    const fallbacksPerHole={};
    for(const c of rankedTargets){
      if(totalRecsCount()>=3) break;
      // Count how many topRecs already cover this hole
      const existingAtHole=topRecs.filter(r=>r.hole===c.pos).length
        +(fallbacksPerHole[c.pos]||0);
      if(existingAtHole>=2) continue;
      const pkg=makePkg(c.val);
      if(!pkg) continue;
      if(pkg.val>c.val*1.4) continue;
      const seen=topRecs.some(r=>r.target.name===c.player.name)
        ||uptierRecs.some(r=>r.target.name===c.player.name)
        ||fallbackTargets.some(r=>r.target.name===c.player.name);
      if(seen) continue;

      fallbacksPerHole[c.pos]=(fallbacksPerHole[c.pos]||0)+1;
      fallbackTargets.push({
        target:c.player,
        targetVal:c.val,
        fromOwner:c.owner,
        mutualPos:c.mutual?c.riv.holes.find(h=>mySurplusPositions.has(h)):null,
        pkg:pkg.pkg,
        pkgVal:pkg.val,
        desirability:c.score,
        hole:c.pos,
        kind:'fallback',
        windowMode, coreAge
      });
    }

    // Append fallbacks to topRecs so they render alongside the strict recs
    topRecs.push(...fallbackTargets);
  }

  // ── HARD CAP: 4 RECS TOTAL across all kinds ────────────────────────
  // Across standard upgrade recs + uptier + downtier, surface only the 4
  // best moves. Prefer diversity: try to include at least one of each kind
  // if available, then fill with the highest-desirability remaining.
  const MAX_RECS=4;
  const allRecs=[];
  // Tag each rec with its kind so we can interleave
  topRecs.forEach(r=>allRecs.push({...r, _kind:'standard', _desir:r.desirability||0}));
  uptierRecs.forEach(r=>allRecs.push({...r, _kind:'uptier', _desir:(r.targetVal||0)*1.3}));
  downtierRecs.forEach(r=>allRecs.push({...r, _kind:'downtier', _desir:(r.moveVal||0)*1.1}));

  // Sort all by desirability
  allRecs.sort((a,b)=>b._desir-a._desir);

  // First pass: take top-ranked rec from each kind if available
  const final=[];
  const kindsUsed=new Set();
  for(const r of allRecs){
    if(final.length>=MAX_RECS) break;
    if(kindsUsed.has(r._kind)) continue;
    kindsUsed.add(r._kind);
    final.push(r);
  }
  // Second pass: fill remaining slots with the highest-desirability picks not yet used,
  // respecting per-hole diversity for standard recs (max 2 per hole).
  const usedIds=new Set(final.map(r=>r._kind+':'+(r.target?.name||r.movePlayer?.name||'')));
  const stdHoleCount={};
  final.forEach(r=>{
    if(r._kind==='standard'&&r.hole) stdHoleCount[r.hole]=(stdHoleCount[r.hole]||0)+1;
  });
  for(const r of allRecs){
    if(final.length>=MAX_RECS) break;
    const id=r._kind+':'+(r.target?.name||r.movePlayer?.name||'');
    if(usedIds.has(id)) continue;
    if(r._kind==='standard'&&r.hole&&(stdHoleCount[r.hole]||0)>=2) continue;
    usedIds.add(id);
    if(r._kind==='standard'&&r.hole) stdHoleCount[r.hole]=(stdHoleCount[r.hole]||0)+1;
    final.push(r);
  }

  // Re-split into the three buckets for rendering. The render section below
  // expects topRecs/uptierRecs/downtierRecs as separate arrays.
  topRecs.length=0;
  uptierRecs.length=0;
  downtierRecs.length=0;
  for(const r of final){
    // Strip the temp tagging fields before pushing back
    const clean={...r}; delete clean._kind; delete clean._desir;
    if(r._kind==='standard') topRecs.push(clean);
    else if(r._kind==='uptier') uptierRecs.push(clean);
    else if(r._kind==='downtier') downtierRecs.push(clean);
  }

  // ── RENDER ─────────────────────────────────────────────────────────────
  const PC={QB:'var(--qb)',WR:'var(--wr)',RB:'var(--rb)',TE:'var(--te)',PICK:'var(--pick)'};
  const windowColor=windowMode==='build'?'var(--qb)':windowMode==='contend'?'var(--accent)':windowMode==='closing'?'var(--rt)':'var(--gold)';

  const profileHtml=`<div style="background:var(--bg2);border:1px solid var(--border);padding:10px 14px;margin-bottom:10px;">
    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;">
      <div><div style="font-family:Oswald,sans-serif;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:var(--text3);">Window</div>
        <div style="font-family:'Russo One',sans-serif;font-size:14px;color:${windowColor};">${windowLabel}</div></div>
      <div><div style="font-family:Oswald,sans-serif;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:var(--text3);">Core Age</div>
        <div style="font-family:'Russo One',sans-serif;font-size:14px;color:var(--text);">${coreAge.toFixed(1)}</div></div>
      <div style="flex:1;min-width:160px;">
        <div style="font-family:Oswald,sans-serif;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:var(--text3);">${myHoles.some(h=>h.kind==='absolute')?'Holes':'Weakest Area'}</div>
        <div>${myHoles.map(h=>`<span style="font-family:Oswald,sans-serif;font-size:11px;color:${PC[h.pos]};margin-right:8px;">${h.pos} <span style="color:var(--text3);font-size:10px;">${h.kind==='absolute'?'(−'+h.deficit.toFixed(1)+')':'(#'+h.leagueRank+' in lg)'}</span></span>`).join('')}</div>
      </div>
      <div style="flex:1;min-width:160px;">
        <div style="font-family:Oswald,sans-serif;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:var(--text3);">Surplus</div>
        <div>${mySurplusPos.map(s=>`<span style="font-family:Oswald,sans-serif;font-size:11px;color:${PC[s.pos]};margin-right:8px;">${s.pos} <span style="color:var(--text3);font-size:10px;">(${s.count})</span></span>`).join('')}${surplusPicks.length?`<span style="font-family:Oswald,sans-serif;font-size:11px;color:${PC.PICK};margin-right:8px;">${surplusPicks.length} picks</span>`:''}${!mySurplusPos.length&&!surplusPicks.length?'<span style="color:var(--text3);font-size:11px;">Thin</span>':''}</div>
      </div>
    </div>
  </div>`;

  if(!topRecs.length&&!downtierRecs.length&&!uptierRecs.length){
    el.innerHTML=profileHtml+`<div style="background:var(--panel);border:1px solid var(--border);padding:14px 16px;color:var(--text3);font-size:12px;line-height:1.5;">
      Couldn't find a clean trade match. ${!mySurplusPos.length&&!surplusPicks.length?'Your roster is too thin to make competitive offers — focus on waiver pickups or wait for value to develop.':'Your league rivals don\'t currently have surplus matching your holes, or values don\'t line up. Try checking back after a few weeks of NFL games.'}
    </div>`;
    return;
  }

  const recCardsHtml=topRecs.map(r=>{
    const ageStr=r.target.age?`Age ${r.target.age}`:'';
    const fitTag=r.mutualPos
      ? `<span style="font-family:Oswald,sans-serif;font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:var(--gt);background:rgba(118,196,144,0.1);padding:2px 7px;border-radius:3px;">Mutual fit · they need ${r.mutualPos}</span>`
      : `<span style="font-family:Oswald,sans-serif;font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:var(--text3);background:var(--bg2);padding:2px 7px;border-radius:3px;">Targeted ask</span>`;
    const dbPlayer=DATA.find(d=>d.type==='player'&&normName(d.name)===normName(r.target.name));
    const targetNameHtml=dbPlayer
      ?`<span onclick="showPlayerCardModal(${dbPlayer.rank})" style="cursor:pointer;text-decoration:underline;text-decoration-color:var(--border2);text-underline-offset:2px;">${r.target.name}</span>`
      :r.target.name;
    const pkgRows=r.pkg.map(item=>{
      if(item.type==='player'){
        const dbP=DATA.find(d=>d.type==='player'&&normName(d.name)===normName(item.item.name));
        const nm=dbP
          ?`<span onclick="showPlayerCardModal(${dbP.rank})" style="cursor:pointer;text-decoration:underline;text-decoration-color:var(--border2);">${item.item.name}</span>`
          :item.item.name;
        return `<div style="display:flex;align-items:center;font-size:11px;padding:3px 0;">
          <span style="font-family:Oswald,sans-serif;font-size:9px;color:${PC[item.item.pos]};margin-right:6px;">${item.item.pos}</span>${nm}
        </div>`;
      }
      // pick
      const pk=item.item;
      const rdLabel=pk.round===1?'1st':pk.round===2?'2nd':pk.round===3?'3rd':'4th';
      return `<div style="display:flex;align-items:center;font-size:11px;padding:3px 0;">
        <span style="font-family:Oswald,sans-serif;font-size:9px;color:${PC.PICK};margin-right:6px;">PICK</span>${pk.season} ${rdLabel}
      </div>`;
    }).join('');

    // Fairness indicator — no numbers, just a word. Same thresholds as before
    // but expressed as labels so the user reads intent, not points.
    const diff=r.pkgVal-r.targetVal;
    let fairnessTxt, fairnessCol;
    if(diff>r.targetVal*0.10){fairnessTxt='Slight overpay'; fairnessCol='var(--rt)';}
    else if(diff<-r.targetVal*0.05){fairnessTxt='Discount play'; fairnessCol='var(--gt)';}
    else {fairnessTxt='Fair offer'; fairnessCol='var(--gold)';}

    // Rationale line — explain why this fits
    const holeMeta=myHoles.find(h=>h.pos===r.hole);
    const isRelative=holeMeta?.kind==='relative';
    const isFallback=r.kind==='fallback';
    let rationale;
    if(isFallback){
      // Fallback recs aren't filling a hole — they're window-fit upgrades
      // anywhere on the roster. Frame as "fits your window".
      if(r.windowMode==='build') rationale=`Adds young ${r.target.pos} talent that fits your rebuild timeline.`;
      else if(r.windowMode==='contend') rationale=`Prime-age ${r.target.pos} you can plug in immediately while your window is open.`;
      else if(r.windowMode==='closing') rationale=`Win-now ${r.target.pos} for a closing window — production over potential.`;
      else rationale=`Solid ${r.target.pos} upgrade — fits where your roster is heading.`;
    } else {
      rationale=isRelative
        ? `Upgrades your weakest area — ${r.hole} is your roster's relative soft spot.`
        : `Fills your ${r.hole} hole.`;
    }
    if(r.mutualPos) rationale+=` ${r.fromOwner} needs ${r.mutualPos}, where you're deep — likely receptive.`;
    if(r.windowMode==='build'&&(r.target.age||99)<=PEAK[r.target.pos]&&!isFallback) rationale+=` Young enough to mature with your core.`;
    if(r.windowMode==='contend'&&(r.target.age||99)>=PEAK[r.target.pos]-2&&(r.target.age||99)<=PEAK[r.target.pos]+1&&!isFallback) rationale+=` Prime-age — moves the needle this year.`;

    return `<div style="background:var(--panel);border:1px solid var(--border);padding:12px 14px;">
      <div style="display:flex;align-items:start;gap:10px;margin-bottom:8px;flex-wrap:wrap;">
        <div style="flex:1;min-width:180px;">
          <div style="font-family:'Russo One',sans-serif;font-size:15px;color:var(--text);">Target: ${targetNameHtml}</div>
          <div style="font-family:Oswald,sans-serif;font-size:10px;color:var(--text3);margin-top:2px;">
            <span style="color:${PC[r.target.pos]};">${r.target.pos}</span>
            ${ageStr?'· '+ageStr:''}
            · Owned by ${r.fromOwner}
          </div>
        </div>
        ${fitTag}
      </div>
      <div style="font-size:11px;color:var(--text2);line-height:1.5;margin-bottom:8px;">${rationale}</div>
      <div style="background:var(--bg2);border:1px solid var(--border);padding:8px 10px;">
        <div style="display:flex;justify-content:space-between;align-items:center;font-family:Oswald,sans-serif;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:var(--text3);margin-bottom:4px;">
          <span>Your offer</span>
          <span style="color:${fairnessCol};">${fairnessTxt}</span>
        </div>
        ${pkgRows}
      </div>
    </div>`;
  }).join('');

  // ── DOWNTIER REC RENDERING ────────────────────────────────────────────
  // Only renders when no absolute holes exist. Shows "consolidation in
  // reverse" plays — small production hit for picks.
  const downtierHtml=downtierRecs.length
    ?`<div style="margin-top:14px;">
        <div style="font-family:Oswald,sans-serif;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:var(--text3);margin-bottom:8px;">Downtier Plays · Trade Strength for Picks</div>
        ${downtierRecs.map(d=>{
          const moveDb=DATA.find(p=>p.type==='player'&&normName(p.name)===normName(d.movePlayer.name));
          const recvDb=DATA.find(p=>p.type==='player'&&normName(p.name)===normName(d.returnPlayer.name));
          const moveNm=moveDb
            ?`<span onclick="showPlayerCardModal(${moveDb.rank})" style="cursor:pointer;text-decoration:underline;text-decoration-color:var(--border2);text-underline-offset:2px;">${d.movePlayer.name}</span>`
            :d.movePlayer.name;
          const recvNm=recvDb
            ?`<span onclick="showPlayerCardModal(${recvDb.rank})" style="cursor:pointer;text-decoration:underline;text-decoration-color:var(--border2);">${d.returnPlayer.name}</span>`
            :d.returnPlayer.name;
          const rdLabel=d.sweetener.round===1?'1st':d.sweetener.round===2?'2nd':d.sweetener.round===3?'3rd':'4th';
          const diff=d.returnVal-d.moveVal;
          // Net effect as word, no numbers
          let netTxt, netCol;
          if(diff>=2){netTxt='Net gain'; netCol='var(--gt)';}
          else if(diff>=-5){netTxt='Fair swap'; netCol='var(--gold)';}
          else {netTxt='Small downgrade for picks'; netCol='var(--gold)';}
          return `<div style="background:var(--panel);border:1px solid var(--border);padding:12px 14px;margin-bottom:8px;">
            <div style="display:flex;align-items:start;gap:10px;margin-bottom:6px;flex-wrap:wrap;">
              <div style="flex:1;min-width:180px;">
                <div style="font-family:'Russo One',sans-serif;font-size:14px;color:var(--text);">Consolidation Play · ${d.pos}</div>
                <div style="font-family:Oswald,sans-serif;font-size:10px;color:var(--text3);margin-top:2px;">Trading with ${d.toOwner}</div>
              </div>
              <span style="font-family:Oswald,sans-serif;font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:var(--pick);background:rgba(155,138,191,0.12);padding:2px 7px;border-radius:3px;">Stockpile picks</span>
            </div>
            <div style="font-size:11px;color:var(--text2);line-height:1.5;margin-bottom:8px;">You're #${d.strengthRank} at ${d.pos} in the league. Send your #2 there to a team that needs depth, take their starter back + their best ${rdLabel}-round pick to fuel future moves.</div>
            <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center;">
              <div style="background:var(--bg2);border:1px solid var(--border);padding:8px 10px;">
                <div style="font-family:Oswald,sans-serif;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:var(--rt);margin-bottom:4px;">You send</div>
                <div style="display:flex;align-items:center;font-size:11px;padding:2px 0;">
                  <span style="font-family:Oswald,sans-serif;font-size:9px;color:${PC[d.pos]};margin-right:6px;">${d.pos}</span>${moveNm}
                </div>
              </div>
              <div style="font-family:'Russo One',sans-serif;font-size:18px;color:var(--text3);">↔</div>
              <div style="background:var(--bg2);border:1px solid var(--border);padding:8px 10px;">
                <div style="font-family:Oswald,sans-serif;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:var(--gt);margin-bottom:4px;">You receive</div>
                <div style="display:flex;align-items:center;font-size:11px;padding:2px 0;">
                  <span style="font-family:Oswald,sans-serif;font-size:9px;color:${PC[d.pos]};margin-right:6px;">${d.pos}</span>${recvNm}
                </div>
                <div style="display:flex;align-items:center;font-size:11px;padding:2px 0;">
                  <span style="font-family:Oswald,sans-serif;font-size:9px;color:${PC.PICK};margin-right:6px;">PICK</span>${d.sweetener.season} ${rdLabel}
                </div>
              </div>
            </div>
            <div style="text-align:right;font-family:Oswald,sans-serif;font-size:10px;color:${netCol};margin-top:6px;letter-spacing:0.08em;">${netTxt}</div>
          </div>`;
        }).join('')}
      </div>`
    :'';

  // ── UPTIER REC RENDERING ──────────────────────────────────────────────
  // For contenders with depth but no star power: package multiple solid
  // players to acquire ONE league-elite player at the same position.
  const uptierHtml=uptierRecs.length
    ?`<div style="margin-top:14px;">
        <div style="font-family:Oswald,sans-serif;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:var(--text3);margin-bottom:8px;">Uptier Plays · Consolidate Depth into a Star</div>
        ${uptierRecs.map(u=>{
          const targetDb=DATA.find(p=>p.type==='player'&&normName(p.name)===normName(u.target.name));
          const targetNm=targetDb
            ?`<span onclick="showPlayerCardModal(${targetDb.rank})" style="cursor:pointer;text-decoration:underline;text-decoration-color:var(--border2);text-underline-offset:2px;">${u.target.name}</span>`
            :u.target.name;
          const ageStr=u.target.age?`Age ${u.target.age}`:'';
          const eliteRankStr=u.eliteRank===1?`Top ${u.pos} in league`:`Top-${u.eliteRank} ${u.pos} in league`;
          const pkgRows=u.pkg.map(item=>{
            if(item.type==='player'){
              const dbP=DATA.find(d=>d.type==='player'&&normName(d.name)===normName(item.item.name));
              const nm=dbP
                ?`<span onclick="showPlayerCardModal(${dbP.rank})" style="cursor:pointer;text-decoration:underline;text-decoration-color:var(--border2);">${item.item.name}</span>`
                :item.item.name;
              return `<div style="display:flex;align-items:center;font-size:11px;padding:3px 0;">
                <span style="font-family:Oswald,sans-serif;font-size:9px;color:${PC[item.item.pos]};margin-right:6px;">${item.item.pos}</span>${nm}
              </div>`;
            }
            const pk=item.item;
            const rdL=pk.round===1?'1st':pk.round===2?'2nd':pk.round===3?'3rd':'4th';
            return `<div style="display:flex;align-items:center;font-size:11px;padding:3px 0;">
              <span style="font-family:Oswald,sans-serif;font-size:9px;color:${PC.PICK};margin-right:6px;">PICK</span>${pk.season} ${rdL}
            </div>`;
          }).join('');
          // Fairness as a word
          const diff=u.pkgVal-u.targetVal;
          let fairnessTxt, fairnessCol;
          if(diff>u.targetVal*0.10){fairnessTxt='Slight overpay'; fairnessCol='var(--rt)';}
          else if(diff<-u.targetVal*0.05){fairnessTxt='Discount play'; fairnessCol='var(--gt)';}
          else {fairnessTxt='Fair offer'; fairnessCol='var(--gold)';}
          // Rationale — why this fit makes sense
          let why=`You have multiple solid ${u.pos}s but no league-elite asset. Convert a depth piece + a 1st into a true difference-maker.`;
          if(u.targetAge<=26.0) why+=` ${u.fromOwner}'s core is young — they'd value quantity to build around.`;
          else if(u.targetHoleCount>=2) why+=` ${u.fromOwner} has multiple positional holes — they need bodies more than stars.`;
          return `<div style="background:var(--panel);border:1px solid var(--border);padding:12px 14px;margin-bottom:8px;">
            <div style="display:flex;align-items:start;gap:10px;margin-bottom:6px;flex-wrap:wrap;">
              <div style="flex:1;min-width:180px;">
                <div style="font-family:'Russo One',sans-serif;font-size:15px;color:var(--text);">Target: ${targetNm}</div>
                <div style="font-family:Oswald,sans-serif;font-size:10px;color:var(--text3);margin-top:2px;">
                  <span style="color:${PC[u.pos]};">${u.pos}</span>
                  ${ageStr?'· '+ageStr:''}
                  · Owned by ${u.fromOwner}
                </div>
              </div>
              <span style="font-family:Oswald,sans-serif;font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent);background:rgba(192,122,74,0.12);padding:2px 7px;border-radius:3px;">${eliteRankStr}</span>
            </div>
            <div style="font-size:11px;color:var(--text2);line-height:1.5;margin-bottom:8px;">${why}</div>
            <div style="background:var(--bg2);border:1px solid var(--border);padding:8px 10px;">
              <div style="display:flex;justify-content:space-between;align-items:center;font-family:Oswald,sans-serif;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:var(--text3);margin-bottom:4px;">
                <span>Your offer (${u.pkg.length} pieces)</span>
                <span style="color:${fairnessCol};">${fairnessTxt}</span>
              </div>
              ${pkgRows}
            </div>
          </div>`;
        }).join('')}
      </div>`
    :'';

  el.innerHTML=profileHtml+recCardsHtml+uptierHtml+downtierHtml;
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
