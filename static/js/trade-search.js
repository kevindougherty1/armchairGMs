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

    loadStep(4);

    // ─── PICK ALLOCATION ──────────────────────────────────────────────────────
    // Step 1: Seed every team with their own picks for next 3 draft years
    // Each team gets exactly 1 pick per round (1-4) per year (2027-2029) = 12 picks
    const PICK_YEARS=[2027,2028,2029];
    const PICK_ROUNDS=[1,2,3,4];
    const rosterPicksRaw={};
    rosters.forEach(r=>{
      rosterPicksRaw[r.roster_id]=[];
      PICK_YEARS.forEach(yr=>PICK_ROUNDS.forEach(rd=>{
        rosterPicksRaw[r.roster_id].push({season:yr,round:rd});
      }));
    });

    // Step 2: Build user_id → roster_id map + per-season roster_id translation
    const userToRoster={};
    rosters.forEach(r=>{ if(r.owner_id) userToRoster[String(r.owner_id)]=r.roster_id; });
    const seasonRidMap={}; // leagueId → {oldRosterId: currentRosterId}

    // Pre-fetch all historical rosters to build seasonRidMap
    try{
      let scanId=id;
      const seenL=new Set();
      for(let s=0;s<10;s++){
        if(seenL.has(scanId)) break; seenL.add(scanId);
        const [lgRes,histRosters]=await Promise.all([
          fetch(`https://api.sleeper.app/v1/league/${scanId}`).then(r=>r.ok?r.json():null).catch(()=>null),
          fetch(`https://api.sleeper.app/v1/league/${scanId}/rosters`).then(r=>r.ok?r.json():[]).catch(()=>[])
        ]);
        const ridMap={};
        histRosters.forEach(r=>{
          if(!r.owner_id) return;
          if(!userToRoster[String(r.owner_id)]){
            const cur=rosters.find(cr=>cr.owner_id===r.owner_id);
            if(cur) userToRoster[String(r.owner_id)]=cur.roster_id;
          }
          const curRid=userToRoster[String(r.owner_id)];
          if(curRid) ridMap[r.roster_id]=curRid;
        });
        seasonRidMap[scanId]=ridMap;
        if(!lgRes?.previous_league_id) break;
        scanId=lgRes.previous_league_id;
      }
    }catch(e){}

    function toRid(v, lid){
      if(!v&&v!==0) return null;
      const n=parseInt(v);
      if(isNaN(n)||n<=0) return null;
      // Translate historical roster_id → current via season map
      if(lid&&seasonRidMap[lid]&&seasonRidMap[lid][n]!==undefined) return seasonRidMap[lid][n];
      if(rosters.find(r=>r.roster_id===n)) return n;
      return userToRoster[String(v)]||null;
    }

    // Step 3: Fetch ALL transactions across all historical seasons
    // Sort chronologically by status_updated, then transaction_id as tiebreaker
    const allTxns=[];
    try{
      let scanId=id;
      const seenLeagues=new Set();
      for(let s=0;s<10;s++){
        if(seenLeagues.has(scanId)) break;
        seenLeagues.add(scanId);
        const [lgRes,weekTxns]=await Promise.all([
          fetch(`https://api.sleeper.app/v1/league/${scanId}`).then(r=>r.ok?r.json():null).catch(()=>null),
          Promise.all(Array.from({length:24},(_,i)=>
            fetch(`https://api.sleeper.app/v1/league/${scanId}/transactions/${i}`)
              .then(r=>r.json()).catch(()=>[])
          ))
        ]);
        weekTxns.forEach(wk=>{
          if(!Array.isArray(wk)) return;
          wk.forEach(t=>{
            if(t.type==='trade'||t.type==='commissioner'){t._lid=scanId; allTxns.push(t);}
          });
        });
        if(!lgRes?.previous_league_id) break;
        scanId=lgRes.previous_league_id;
      }
    }catch(e){}

    // Deduplicate by transaction_id
    const txnSeen=new Set();
    const dedupedTxns=allTxns.filter(t=>{
      const k=String(t.transaction_id||'_'+Math.random());
      if(txnSeen.has(k)) return false;
      txnSeen.add(k);
      return true;
    });

    // Sort chronologically: oldest first
    // Primary: status_updated timestamp. Secondary: transaction_id (snowflake = monotonic)
    dedupedTxns.sort((a,b)=>{
      const tsDiff=(a.status_updated||a.created||0)-(b.status_updated||b.created||0);
      if(tsDiff!==0) return tsDiff;
      const aId=String(a.transaction_id||'0').padStart(20,'0');
      const bId=String(b.transaction_id||'0').padStart(20,'0');
      return aId<bId?-1:aId>bId?1:0;
    });

    // Step 4: Walk every transaction in chronological order
    // For each draft_pick: subtract 1 pick of (season, round) from prev owner
    //                      add    1 pick of (season, round) to   new  owner
    // YEAR AND ROUND ARE SACRED — never confused, always tracked separately
    dedupedTxns.forEach(txn=>{
      // Dedup within a single transaction (Sleeper sometimes lists same pick twice)
      const seenInTxn=new Set();
      (txn.draft_picks||[]).forEach(pk=>{
        const yr=parseInt(pk.season)||0;
        const rd=parseInt(pk.round)||0;

        // Only process future picks (2027+), skip current/past season picks
        if(yr<2027||!rd||rd<1||rd>4) return;

        const lid=txn._lid;
        const prevRid=toRid(pk.previous_owner_id,lid);
        const nowRid=toRid(pk.owner_id,lid);

        // Must have both sides and they must be different
        if(!prevRid||!nowRid||prevRid===nowRid) return;

        // Dedup: same year+round+prev+now within one transaction = skip duplicate
        const key=`${yr}_${rd}_${prevRid}_${nowRid}`;
        if(seenInTxn.has(key)) return;
        seenInTxn.add(key);

        // Remove one pick of this EXACT year+round from prev owner
        const prevArr=rosterPicksRaw[prevRid];
        if(!prevArr) return;
        const removeIdx=prevArr.findIndex(p=>p.season===yr&&p.round===rd);
        if(removeIdx<0) return;
        prevArr.splice(removeIdx,1);

        // Add one pick of this EXACT year+round to new owner
        if(!rosterPicksRaw[nowRid]) rosterPicksRaw[nowRid]=[];
        rosterPicksRaw[nowRid].push({season:yr,round:rd});
      });
    });

    // Commissioner overrides — inject synthetic transactions BEFORE replay runs
    if(id==='1312091473377792000'){
      const nameToRid={};
      rosters.forEach(r=>{ const u=umap[r.owner_id]; if(u) nameToRid[u.name]=r.roster_id; });
      const ianRid=nameToRid['Steelerr43'];
      const timRid=nameToRid['BigSteppaTim'];
      if(ianRid&&timRid){
        // #47 (Feb 13): Ian's 2027 1st → Tim. Commissioner reverted it back to Ian immediately.
        const idx47=dedupedTxns.findIndex(t=>String(t.transaction_id)==='1339686639961657344');
        const insertAfter=idx47>=0?idx47:dedupedTxns.findIndex(t=>(t.status_updated||0)>=1739476585141);
        dedupedTxns.splice(insertAfter+1,0,{
          transaction_id:'1339686639961657345',
          status_updated:1739476585142,
          _lid:id,
          draft_picks:[{season:'2027',round:1,previous_owner_id:timRid,owner_id:ianRid}]
        });
      }
    }

    // Step 5: Invariant replay — always runs, is the source of truth for pick counts
    // Per-transaction dedup only — same pick listed twice in one transaction = skip second
    const N=rosters.length;
    PICK_YEARS.forEach(yr=>PICK_ROUNDS.forEach(rd=>{
      const correct={};
      rosters.forEach(r=>{ correct[r.roster_id]=1; });
      dedupedTxns.forEach(txn=>{
        const seenInTxn=new Set();
        (txn.draft_picks||[]).forEach(pk=>{
          if(parseInt(pk.season)!==yr||parseInt(pk.round)!==rd) return;
          const lid=txn._lid;
          const prev=toRid(pk.previous_owner_id,lid);
          const now=toRid(pk.owner_id,lid);
          if(!prev||!now||prev===now) return;
          const key=`${prev}_${now}_${rd}`;
          if(seenInTxn.has(key)) return; seenInTxn.add(key);
          if((correct[prev]||0)>0){ correct[prev]--; correct[now]=(correct[now]||0)+1; }
        });
      });

      // Reconcile rosterPicksRaw to match
      if(yr===2027&&rd===2){
        window._replay2027rd2=Object.assign({},correct);
      }
      rosters.forEach(r=>{
        const rid=r.roster_id;
        const have=(rosterPicksRaw[rid]||[]).filter(p=>p.season===yr&&p.round===rd).length;
        const want=correct[rid]||0;
        if(have===want) return;
        if(have>want){
          let remove=have-want;
          rosterPicksRaw[rid]=rosterPicksRaw[rid].filter(p=>{
            if(p.season===yr&&p.round===rd&&remove>0){remove--;return false;}
            return true;
          });
        } else {
          for(let i=0;i<want-have;i++) rosterPicksRaw[rid].push({season:yr,round:rd});
        }
      });
    }));

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

    // Assign draft pick SLOTS based on projected finish order
    // Rule: slot determined solely by original owner's projected record
    // Bottom third = Early, Middle third = Mid, Top third = Late
    // SAME slot for ALL years (2027/2028/2029) — consistent per original owner
    // Rounds 3-4 always Mid regardless
    const draftOrder=[...scored].sort((a,b)=>a.pwr-b.pwr);
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
        const slot='Mid'; // original_roster_id unavailable so always use Mid
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
