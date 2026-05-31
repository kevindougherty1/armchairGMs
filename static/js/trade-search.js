function renderTS(){
  const q=document.getElementById('ts').value.toLowerCase().trim();
  const el=document.getElementById('tsr');
  if(!q){el.innerHTML='';return;}
  const res=DATA.filter(d=>d.name.toLowerCase().includes(q)||(d.team&&d.team.toLowerCase().includes(q))||(d.pos&&d.pos.toLowerCase().includes(q))).slice(0,20);
  if(!res.length){el.innerHTML='<div style="font-size:11px;color:var(--text3);font-style:italic;padding:8px;">No results</div>';return;}
  const clear=`document.getElementById('ts').value='';renderTS();`;
  el.innerHTML=res.map(d=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 10px;border-bottom:1px solid var(--border);background:var(--bg3);border-radius:4px;margin-bottom:2px;">
    <div><div style="font-family:'Oswald',sans-serif;font-size:13px;font-weight:600;color:var(--text);">${d.name}<span class="pb2 pos-${d.pos}" style="margin-left:6px;">${d.pos}</span></div>
    <div style="font-size:10px;color:var(--text3);">${d.team==='FA'?'Free Agent':d.team}${d.age?' · Age '+d.age:''} · <span style="color:${tierColor(tierLetter(getScore(d)))};font-family:'Russo One',sans-serif;">${tierLetter(getScore(d))}</span></div></div>
    <div style="display:flex;gap:5px;">
      <button onclick="addT(${d.rank},'give');${clear}" style="background:var(--red);border:none;color:#fff;font-family:'Oswald',sans-serif;font-size:10px;letter-spacing:0.1em;padding:5px 9px;cursor:pointer;border-radius:3px;">+Give</button>
      <button onclick="addT(${d.rank},'recv');${clear}" style="background:var(--green);border:none;color:#fff;font-family:'Oswald',sans-serif;font-size:10px;letter-spacing:0.1em;padding:5px 9px;cursor:pointer;border-radius:3px;">${TRADE_TYPE===3&&ACTIVE_RECV==='recv2'?'+Recv C':'+Recv'}</button>
    </div>
  </div>`).join('');
}

// SLEEPER + AI
async function loadLeague(){
  const id=(document.getElementById('lid').value||'').trim();
  if(!id){document.getElementById('lerr').textContent='Please enter a League ID.';document.getElementById('lerr').style.display='block';return;}
  // Bump the load token. Any in-flight load with an older token will see it's
  // stale and abandon writes, so a fresh paste+sync always wins.
  const myToken=++LOAD_TOKEN;
  const isStale=()=>myToken!==LOAD_TOKEN;
  // Only set the default league ID on the very first sync. After that, switching
  // leagues does NOT change which league auto-loads on startup — the default
  // stays pinned to whatever the user first synced.
  if(CU){
    if(!CU.lid){CU.lid=id;sSess(CU);if(CU.em!=='Guest') saveProfile();}
  }
  const btn=document.getElementById('lbtn');btn.disabled=true;btn.textContent='Loading...';
  document.getElementById('lerr').style.display='none';
  document.getElementById('llod').style.display='block';
  document.getElementById('lcon').innerHTML='';
  document.getElementById('lemp').style.display='none';
  // Reset all steps
  for(let i=0;i<7;i++){const s=document.getElementById('ls'+i);if(s){s.className='load-step';s.querySelector('.step-icon').textContent='◌';}}
  function loadStep(n,done){
    if(n>0){const prev=document.getElementById('ls'+(n-1));if(prev){prev.className='load-step done';prev.querySelector('.step-icon').textContent='✓';}}
    const cur=document.getElementById('ls'+n);if(cur){cur.className='load-step active';cur.querySelector('.step-icon').textContent='→';}
  }
  loadStep(0);
  document.getElementById('lemp').style.display='none';
  try{
    const [lr,ur,rr]=await Promise.all([fetch(`https://api.sleeper.app/v1/league/${id}`),fetch(`https://api.sleeper.app/v1/league/${id}/users`),fetch(`https://api.sleeper.app/v1/league/${id}/rosters`)]);
    if(!lr.ok)throw new Error('League not found. Check your League ID.');
    const [league,users,rosters]=await Promise.all([lr.json(),ur.json(),rr.json()]);
    loadStep(1);
    const umap={};users.forEach(u=>{umap[u.user_id]={name:u.display_name};});

    // Auto-detect league format from roster_positions
    const rp=league.roster_positions||[];
    const detectedFormat=rp.includes('SUPER_FLEX')?'SF':'1QB';
    if(detectedFormat!==SCORING) setScoring(detectedFormat);
    loadStep(2);
    const wf=[];for(let w=1;w<=17;w++)wf.push(fetch(`https://api.sleeper.app/v1/league/${id}/matchups/${w}`).then(r=>r.json()).catch(()=>[]));
    const allM=await Promise.all(wf);
    loadStep(3);
    let sp={};
    try{const pr=await fetch('https://api.sleeper.app/v1/players/nfl');sp=await pr.json();}catch(e){}

    // Fetch 2026 Weeks 1-3 projections from Sleeper for the draft-pick slot
    // calculation, then average each player's PPG across the weeks they
    // appear in. Averaging dampens single-week matchup noise — a stud with
    // a tough Week 1 defense won't get unfairly downgraded.
    // We use this to RANK teams, not for absolute scoring, so a 3-week
    // sample is plenty.
    let projMap={};
    try{
      const recPts=Number(league.scoring_settings?.rec||0);
      const projField=recPts>=0.9?'pts_ppr':recPts>=0.4?'pts_half_ppr':'pts_std';
      const weekResults=await Promise.all([1,2,3].map(w=>
        fetch(`https://api.sleeper.com/projections/nfl/2026/${w}?season_type=regular&position[]=QB&position[]=RB&position[]=WR&position[]=TE`)
          .then(r=>r.ok?r.json():[]).catch(()=>[])
      ));
      const acc={}; // pid -> {sum, count}
      weekResults.forEach(week=>{
        week.forEach(e=>{
          const pid=e.player_id;
          const v=e.stats?.[projField];
          if(!pid||v==null||v==='') return;
          if(!acc[pid]) acc[pid]={sum:0,count:0};
          acc[pid].sum+=Number(v);
          acc[pid].count+=1;
        });
      });
      Object.entries(acc).forEach(([pid,o])=>{ projMap[String(pid)]=o.sum/o.count; });
    }catch(e){}
    window._projMap=projMap; // exposed for trade rec engine in myteam.js

    loadStep(4);

    // ─── PICK ALLOCATION ──────────────────────────────────────────────────────
    // Sleeper exposes the authoritative current state of every traded pick at
    // /v1/league/{id}/traded_picks. Each entry has:
    //   roster_id          = the ORIGINAL owner (whose draft slot it is)
    //   owner_id           = the CURRENT owner
    //   previous_owner_id  = the previous owner
    // Seed each roster with its own picks for the next 3 draft years, then apply
    // the traded-picks delta. This replaces the prior transaction-replay system,
    // which had to translate historical roster IDs and missed commissioner reverts.
    const PICK_YEARS=[2027,2028,2029];
    const PICK_ROUNDS=[1,2,3,4];
    const rosterPicksRaw={};
    rosters.forEach(r=>{
      rosterPicksRaw[r.roster_id]=[];
      PICK_YEARS.forEach(yr=>PICK_ROUNDS.forEach(rd=>{
        rosterPicksRaw[r.roster_id].push({season:yr,round:rd,_orig:r.roster_id});
      }));
    });
    try{
      const tradedPicks=await fetch(`https://api.sleeper.app/v1/league/${id}/traded_picks`).then(r=>r.ok?r.json():[]).catch(()=>[]);
      tradedPicks.forEach(tp=>{
        const yr=parseInt(tp.season)||0;
        const rd=parseInt(tp.round)||0;
        const origRid=parseInt(tp.roster_id)||0;
        const nowRid=parseInt(tp.owner_id)||0;
        if(!PICK_YEARS.includes(yr)||!PICK_ROUNDS.includes(rd)) return;
        if(!origRid||!nowRid||origRid===nowRid) return;
        const origArr=rosterPicksRaw[origRid];
        if(origArr){
          const idx=origArr.findIndex(p=>p.season===yr&&p.round===rd&&p._orig===origRid);
          if(idx>=0) origArr.splice(idx,1);
        }
        if(!rosterPicksRaw[nowRid]) rosterPicksRaw[nowRid]=[];
        rosterPicksRaw[nowRid].push({season:yr,round:rd,_orig:origRid});
      });
    }catch(e){}
    // ─── END PICK ALLOCATION ──────────────────────────────────────────────────

    window._sleeperPlayers=sp;
    Object.entries(sp).forEach(([pid,p])=>{
      const key=normName(`${p.first_name||''} ${p.last_name||''}`);
      if(key) SLEEPER_PID[key]=pid;
    });

    // Name lookup: exact → normalized → last-name-only fallback
    function lookupInDB(sleeperP){
      const fn=(sleeperP.first_name||'').trim();
      const ln=(sleeperP.last_name||'').trim();
      if(!fn&&!ln) return null;
      const full=`${fn} ${ln}`.trim().toLowerCase();
      if(NM_EXACT[full]) return NM_EXACT[full];
      const nk=normName(`${fn} ${ln}`);
      if(NM_NORM[nk]) return NM_NORM[nk];
      // last-name-only for unique last names
      const lnk=normName(ln);
      const hits=DATA.filter(d=>d.type==='player'&&normName(d.name.split(' ').slice(-1)[0])===lnk);
      if(hits.length===1) return hits[0];
      return null;
    }

    const scored=rosters.map(r=>{
      const owner=umap[r.owner_id]||{name:'Unknown'};
      const pids=[...(r.players||[]),...(r.taxi||[])];
      let tot=0;const found=[];const seen=new Set();
      const seenPids=new Set();
      pids.forEach(pid=>{
        const p=sp[pid]; if(!p) return;
        const m=lookupInDB(p);
        if(m&&!seen.has(m.rank)){
          seen.add(m.rank);
          seenPids.add(pid);
          tot+=m.score;
          // Store the actual Sleeper player ID so photos work
          found.push({...m,sleeper_id:pid});
        } else if(!m && !seenPids.has(pid)){
          // Player is rostered but not in the imported rankings (e.g. someone
          // outside the user's Flock list). Surface them anyway with score 0
          // so My Team / trade analyzer show the real roster. Doesn't affect
          // totals or rankings because score is 0.
          const name=`${p.first_name||''} ${p.last_name||''}`.trim();
          if(!name) return;
          const pos=(p.fantasy_positions&&p.fantasy_positions[0])||p.position||'?';
          if(!['QB','RB','WR','TE'].includes(pos)) return;
          seenPids.add(pid);
          found.push({
            name, pos, team:p.team||'FA',
            age:p.age||0, score:0, rank:9999, type:'player',
            hardcoded:false, sleeper_id:pid, unranked:true
          });
        }
      });

      found.sort((a,b)=>b.score-a.score);
      let pf=0,pa=0;
      const weeklyPts=[];
      const rid=r.roster_id;
      allM.forEach(wm=>{
        if(!Array.isArray(wm)) return;
        const my=wm.find(m=>m.roster_id===rid);
        if(!my||!my.points) return;
        const op=wm.find(m=>m.matchup_id===my.matchup_id&&m.roster_id!==rid);
        pf+=my.points; if(op) pa+=op.points;
        weeklyPts.push(Math.round(my.points*10)/10);
      });
      // Note: pickVal computed later after pwr is known (slot-aware scoring)
      return{owner:owner.name,wins:r.settings?.wins||0,losses:r.settings?.losses||0,ties:r.settings?.ties||0,
        totalScore:Math.round(found.reduce((s,p)=>s+p.score,0)*10)/10,pickVal:0,
        top:found.slice(0,6),all:found,weeklyPts,picks:rosterPicksRaw[r.roster_id]||[],
        pf:Math.round(pf*10)/10,pa:Math.round(pa*10)/10,rid};
    });

    // Projected wins: value edge vs league average
    const avg=scored.reduce((s,r)=>s+r.totalScore,0)/scored.length;
    const TW=14;
    scored.forEach(r=>{
      const e=(r.totalScore-avg)/avg;
      const wr=Math.max(0.12,Math.min(0.88,0.5+e*1.3));
      r.pw=Math.round(wr*TW);r.pl=TW-r.pw;r.pwr=Math.round(wr*100);
    });

    // Assign draft pick SLOTS based on each team's REDRAFT/PRODUCTION outlook
    // (not dynasty value). Older productive vets like CMC/Saquon project to
    // score more this season than young dynasty studs like Hampton, so a team
    // built around proven floor will finish higher and produce LATE picks.
    // Algorithm:
    //   1. For each team, optimize a starting lineup from league.roster_positions
    //      (handles FLEX / SUPER_FLEX / etc per the league's actual format)
    //   2. Sum each starter's Week 1 2026 projection
    //   3. Sort teams ascending by that total — weakest projection drafts first
    //   4. Bucket into thirds: bottom = Early, middle = Mid, top = Late
    // Only 2027 picks get the slot label — we can't reasonably project who'll
    // finish where in 2027/2028, so 2028 and 2029 picks display unlabeled and
    // use the Mid valuation for scoring.
    const startSlots=(league.roster_positions||[]).filter(s=>!['BN','TAXI','IR'].includes(s));
    window._startSlots=startSlots; // exposed for trade rec engine in myteam.js
    const FLEX_ELIG={
      FLEX:['RB','WR','TE'],
      SUPER_FLEX:['QB','RB','WR','TE'],
      REC_FLEX:['WR','TE'],
      WRRB_FLEX:['RB','WR'],
      WRRB:['RB','WR']
    };
    function projStarterPPG(team){
      const byPos={QB:[],RB:[],WR:[],TE:[]};
      team.all.forEach(p=>{
        if(byPos[p.pos]) byPos[p.pos].push({p,proj:projMap[String(p.sleeper_id)]||0});
      });
      Object.values(byPos).forEach(arr=>arr.sort((a,b)=>b.proj-a.proj));
      const used=new Set();
      let total=0;
      startSlots.forEach(slot=>{
        if(['QB','RB','WR','TE'].includes(slot)){
          const pick=byPos[slot]?.find(e=>!used.has(e.p));
          if(pick){used.add(pick.p);total+=pick.proj;}
        }
      });
      startSlots.forEach(slot=>{
        const elig=FLEX_ELIG[slot];if(!elig)return;
        let best=null;
        elig.forEach(pos=>{
          const cand=byPos[pos]?.find(e=>!used.has(e.p));
          if(cand&&(!best||cand.proj>best.proj))best=cand;
        });
        if(best){used.add(best.p);total+=best.proj;}
      });
      return total;
    }
    scored.forEach(r=>{ r.projStarterPPG=Math.round(projStarterPPG(r)*10)/10; });
    const draftOrder=[...scored].sort((a,b)=>a.projStarterPPG-b.projStarterPPG);
    const _n=draftOrder.length;
    const rosterSlot={};
    draftOrder.forEach((r,i)=>{
      const pct=i/_n;
      const slot=pct<0.333?'Early':pct<0.667?'Mid':'Late';
      rosterSlot[r.rid]=slot;
      rosterSlot[String(r.rid)]=slot;
    });
    window._rosterSlot=rosterSlot; // expose for pick reconciliation in loadTradeHistory

    scored.forEach(r=>{
      let pickVal=0;
      (r.picks||[]).forEach(pk=>{
        const yr=parseInt(pk.season)||2027;
        const rd=pk.round;
        // 2027 picks get a real slot based on the ORIGINAL owner's projected
        // 2026 finish. 2028/2029 use Mid because projecting that far ahead is
        // speculative; the display layer omits the slot label for those years.
        const slot=yr===2027?(rosterSlot[pk._orig]||'Mid'):'Mid';
        pk.slot=slot;
        let match=DATA.find(d=>d.type==='pick'&&d.year==yr&&d.round==rd&&d.slot===slot);
        if(!match) match=DATA.find(d=>d.type==='pick'&&d.year==yr&&d.round==rd);
        if(match){
          pk.matchedScore=match.score;
          pk.matchedName=match.name;
          pickVal+=match.score;
        } else {
          const yearPenalty=Math.max(0,(parseInt(yr)||2027)-2027)*0.15;
          const base=rd===1?20:rd===2?8:rd===3?4:1;
          const val=base*(1-yearPenalty);
          pk.matchedScore=Math.round(val*10)/10;
          pk.matchedName=`${yr} Round ${rd}`;
          pickVal+=val;
        }
      });
      // Replace pickVal with slot-aware value
      r.pickVal=Math.round(pickVal*10)/10;
      // Recompute totalScore with corrected pickVal
      const playerScore=r.all.reduce((s,p)=>s+getScore(p),0);
      r.totalScore=Math.round((playerScore+pickVal)*10)/10;
    });


    // ── PROJECTED PPG ─────────────────────────────────────────────────
    // Everything in PPG. One number drives contention windows.
    // Core formula: sum starter PPG from trade scores, adjusted for age curves.
    // 1st round picks = 22.5 PPG added to the FOLLOWING season's projection.
    const POS_STARTERS={QB:1,WR:3,RB:2,TE:1};
    const AGE_PEAK={QB:30,WR:27,RB:25,TE:28};
    const AGE_DECAY=0.035; // 3.5% per year past peak

    scored.forEach(r=>{
      // Actual PPG this season from Sleeper matchup data
      const actualPPG = r.weeklyPts.length
        ? r.weeklyPts.reduce((s,p)=>s+p,0)/r.weeklyPts.length : 0;

      // ── CURRENT projected PPG from roster trade scores + age decay ──
      let rosterPPG = 0;
      const byPos={QB:[],WR:[],RB:[],TE:[]};
      r.all.forEach(p=>{ if(byPos[p.pos]) byPos[p.pos].push(p); });
      Object.entries(POS_STARTERS).forEach(([pos,slots])=>{
        const starters=(byPos[pos]||[]).sort((a,b)=>getScore(b)-getScore(a)).slice(0,slots);
        starters.forEach(p=>{
          const peak=AGE_PEAK[pos]||27;
          const age=p.age||peak;
          // Age trajectory: climbing toward peak = small boost, past peak = decay
          const yearsFromPeak=peak-age;
          let ageFactor;
          if(yearsFromPeak>0){
            // Still climbing — modest upward trajectory, max +8%
            ageFactor=1+Math.min(0.08,yearsFromPeak*0.02);
          } else {
            // Past peak — decay per year
            ageFactor=Math.max(0.5,1+(yearsFromPeak*AGE_DECAY));
          }
          // Score → PPG: score 100≈28ppg, 50≈18ppg, 20≈12ppg, 5≈7ppg
          const basePPG=8+Math.sqrt(Math.max(0,getScore(p)))*2.0;
          rosterPPG+=basePPG*ageFactor;
        });
      });

      // Blend actual (if we have it) with roster-based projection
      r.actualPPG = Math.round(actualPPG*10)/10;
      r.projPPG = actualPPG>0
        ? Math.round((actualPPG*0.55 + rosterPPG*0.45)*10)/10
        : Math.round(rosterPPG*10)/10;

      // ── FUTURE PPG: adds 1st round pick contributions by year ──
      // Each 1st round pick = 22.5 PPG contributed the FOLLOWING season.
      // Weight by proximity: 2027 picks are nearly certain; 2029 picks are distant.
      // Multiple picks in the same year stack — a team with 3 firsts in 2027
      // is adding ~67.5 PPG worth of talent for 2028.
      const picks1st = (r.picks||[]).filter(pk=>pk.round===1);
      // Picks only add value as an UPGRADE over the weakest current starter.
      // Find the lowest-scoring starter at each position, then see if the pick beats them.
      // If pick PPG > that starter's PPG, net gain = difference. Otherwise 0.
      const PICK_PPG={1:13,2:7,3:2,4:2};
      let pickPPGByYear={};
      (r.picks||[]).forEach(pk=>{
        const yr=parseInt(pk.season)||2028;
        const pickContrib=PICK_PPG[pk.round]||2;

        // Find the weakest starter slot this pick might upgrade
        // Assume picks go to weakest position need — find lowest starter PPG across all positions
        let weakestStarterPPG=999;
        Object.entries(POS_STARTERS).forEach(([pos,slots])=>{
          const starters=(byPos[pos]||[]).sort((a,b)=>getScore(b)-getScore(a)).slice(0,slots);
          if(starters.length<slots){
            // Empty starter slot — any contribution is pure gain
            weakestStarterPPG=Math.min(weakestStarterPPG,0);
          } else if(starters.length>0){
            const weakest=starters[starters.length-1];
            const peak=AGE_PEAK[pos]||27;
            const age=weakest.age||peak;
            const ageFactor=Math.max(0.5,1+Math.min(0.08,(peak-age)*0.02));
            const weakPPG=(8+Math.sqrt(Math.max(0,getScore(weakest)))*2.0)*ageFactor;
            weakestStarterPPG=Math.min(weakestStarterPPG,weakPPG);
          }
        });

        // Net gain = pick's projected PPG minus what it's replacing
        const netGain=Math.max(0,pickContrib-weakestStarterPPG);
        pickPPGByYear[yr]=(pickPPGByYear[yr]||0)+netGain;
      });

      // futurePPG = projPPG + picks landing next year (weighted by proximity)
      // 2027 picks → full weight, 2028 → 0.8, 2029 → 0.6, beyond → 0.4
      const yearWeights={2027:1.0,2028:0.8,2029:0.6};
      let totalPickPPG=0;
      Object.entries(pickPPGByYear).forEach(([yr,ppg])=>{
        const w=yearWeights[parseInt(yr)]||0.4;
        totalPickPPG+=ppg*w;
      });

      r.pickUpside = Math.round(totalPickPPG*10)/10;
      r.futurePPG  = Math.round((r.projPPG + totalPickPPG)*10)/10;
    });

    // ── CHAMPIONSHIP ODDS ─────────────────────────────────────────────
    const ppgs = scored.map(r=>r.projPPG);
    const ppgMin = Math.min(...ppgs), ppgMax = Math.max(...ppgs);
    const ppgRange = ppgMax - ppgMin || 1;
    scored.forEach(r=>{
      const norm = (r.projPPG - ppgMin) / ppgRange;
      r._champRaw = Math.pow(norm, 2.2) + 0.02;
    });
    const rawSum = scored.reduce((s,r)=>s+r._champRaw,0);
    scored.forEach(r=>{ r.champOdds = Math.max(1, Math.round((r._champRaw/rawSum)*100)); });
    const totalOdds = scored.reduce((s,r)=>s+r.champOdds,0);
    scored[0].champOdds += (100-totalOdds);

    // ── CONTENTION WINDOW ─────────────────────────────────────────────
    // A team is "in contention" for a season if their projected PPG for that season
    // ranks in the top 4 of the league. We project PPG for each year 2026-2031
    // by applying age decay to current roster + pick upgrades landing that year.
    const CONTENTION_YEARS=[2026,2027,2028,2029,2030,2031];
    const TOP_N=Math.min(4,Math.floor(scored.length/3)); // top 4 or top 1/3 for small leagues

    // Build per-year PPG projections for every team
    // Year 2026 = projPPG (current). Each subsequent year applies further age decay
    // and folds in pick upgrades that land in that year.
    const EXTRA_DECAY=0.04; // additional 4% roster PPG loss per year (aging, attrition)

    scored.forEach(r=>{
      r._yearPPG={};
      CONTENTION_YEARS.forEach(yr=>{
        const yearsOut=yr-2026;
        // Base: current rosterPPG decays each year
        let base=r.projPPG*Math.pow(1-EXTRA_DECAY,yearsOut);
        // Add net pick upgrade PPG for picks landing in THIS year
        // (picks land the year they're drafted, contribute from that year onward)
        CONTENTION_YEARS.forEach(pickYr=>{
          if(pickYr<=yr){
            // picks from pickYr have been on roster for (yr-pickYr) seasons
            const pickNet=(r._pickNetByYear||{})[pickYr]||0;
            // picks contribute fully for the year they land, decay after
            const pickAge=yr-pickYr;
            base+=pickNet*Math.pow(1-EXTRA_DECAY,pickAge);
          }
        });
        r._yearPPG[yr]=Math.round(base*10)/10;
      });
    });

    // Store pick net by year on roster object for the loop above
    // (Need to pre-compute before the loop — do it now)
    scored.forEach(r=>{
      r._pickNetByYear={};
      (r.picks||[]).forEach(pk=>{
        const yr=parseInt(pk.season)||2028;
        const pickContrib={1:13,2:7,3:2,4:2}[pk.round]||2;
        // Net upgrade over weakest starter (already computed as totalPickPPG partial)
        // Re-derive: use same weakest-starter logic
        let weakestPPG=999;
        const byPosLocal={QB:[],WR:[],RB:[],TE:[]};
        r.all.forEach(p=>{if(byPosLocal[p.pos])byPosLocal[p.pos].push(p);});
        Object.entries(POS_STARTERS).forEach(([pos,slots])=>{
          const starters=(byPosLocal[pos]||[]).sort((a,b)=>getScore(b)-getScore(a)).slice(0,slots);
          if(starters.length<slots){weakestPPG=Math.min(weakestPPG,0);}
          else if(starters.length>0){
            const w=starters[starters.length-1];
            const peak=AGE_PEAK[pos]||27;
            const ageFactor=Math.max(0.5,1+Math.min(0.08,((peak-(w.age||peak))*0.02)));
            weakestPPG=Math.min(weakestPPG,(8+Math.sqrt(Math.max(0,getScore(w)))*2.0)*ageFactor);
          }
        });
        const net=Math.max(0,pickContrib-(weakestPPG===999?0:weakestPPG));
        r._pickNetByYear[yr]=(r._pickNetByYear[yr]||0)+net;
      });
      // Now recompute _yearPPG with the correct pick data
      CONTENTION_YEARS.forEach(yr=>{
        const yearsOut=yr-2026;
        let base=r.projPPG*Math.pow(1-EXTRA_DECAY,yearsOut);
        CONTENTION_YEARS.forEach(pickYr=>{
          if(pickYr<=yr){
            const pickNet=(r._pickNetByYear[pickYr])||0;
            const pickAge=yr-pickYr;
            base+=pickNet*Math.pow(1-EXTRA_DECAY,pickAge);
          }
        });
        r._yearPPG[yr]=Math.round(base*10)/10;
      });
    });

    // For each year, rank teams by that year's projected PPG
    // Top 4 = in contention for that year
    scored.forEach(r=>{ r._contentionYears=[]; });
    CONTENTION_YEARS.forEach(yr=>{
      const ranked=[...scored].sort((a,b)=>b._yearPPG[yr]-a._yearPPG[yr]);
      ranked.slice(0,TOP_N).forEach(r=>{ r._contentionYears.push(yr); });
    });

    // Convert contention years list to a window string
    scored.forEach(r=>{
      const yrs=r._contentionYears.sort((a,b)=>a-b);
      if(!yrs.length){
        r.contention='—';
        return;
      }
      // Find the first and last contiguous or near-contiguous block
      // Allow 1-year gap (a team might dip out in 2028 but be back in 2029)
      let start=yrs[0], end=yrs[yrs.length-1];
      r.contention=start===end?String(start):`${start}–${end}`;
    });


    scored.sort((a,b)=>b.totalScore-a.totalScore);

    // Strength of Schedule — based on actual matchup schedule from allM
    // SOS = average projected win rate of opponents faced
    // Build schedule: for each team, find their opponents across all regular season weeks
    const ridToScored={};
    scored.forEach(r=>{ ridToScored[r.rid]=r; });
    scored.forEach(r=>{
      let oppWrSum=0, oppCount=0;
      allM.forEach(wm=>{
        if(!Array.isArray(wm)) return;
        const my=wm.find(m=>m.roster_id===r.rid);
        if(!my) return;
        const opp=wm.find(m=>m.matchup_id===my.matchup_id&&m.roster_id!==r.rid);
        if(!opp) return;
        const oppRoster=ridToScored[opp.roster_id];
        if(oppRoster) { oppWrSum+=oppRoster.pwr; oppCount++; }
      });
      r.sos = oppCount ? Math.round(oppWrSum/oppCount) : 50; // avg opponent win%
    });
    // SOS rank: higher sos = harder schedule
    const sosSorted=[...scored].sort((a,b)=>b.sos-a.sos);
    sosSorted.forEach((r,i)=>{ r.sosRank=i+1; });

    loadStep(5);
    await new Promise(r=>setTimeout(r,80));
    loadStep(6);
    await new Promise(r=>setTimeout(r,80));
    // If a newer sync has started, abandon: don't overwrite its results.
    if(isStale()) return;
    MODAL_DATA=[...scored];
    // Build player→owner lookup map for use in rankings and trade analyzer
    window._playerOwner={};
    MODAL_DATA.forEach(r=>{
      r.all.forEach(p=>{
        const key=normName(p.name);
        if(key) window._playerOwner[key]=r.owner;
      });
    });
    window._lastLeague=league;
    window._lastLeagueId=id;

    // Register this league in the user's saved leagues + update dropdown
    try{addOrUpdateLeague(id,league.name||'');}catch(e){}

    renderLeague(league,scored,id);
    renderTargets();
    renderRosterNeedsContext();
    // Kick off history and trades in background
    loadHistory(id, umap, scored, allM);
    loadTradeHistory(id, umap, sp);
  }catch(e){
    if(isStale()) return;
    document.getElementById('lerr').textContent=e.message||'Failed to load. Check your League ID.';
    document.getElementById('lerr').style.display='block';
    document.getElementById('lemp').style.display='block';
  }finally{
    // Only the latest load resets the button UI
    if(!isStale()){btn.disabled=false;btn.textContent='Reload';document.getElementById('llod').style.display='none';}
  }
}

let MODAL_DATA=[];
