// ── LEAGUE HISTORY & TRADES ───────────────────────────────────────────
// Called automatically when league loads; also called when user navigates to History/Trades tab
let HIST_DATA=null, TRADES_DATA=null;

async function loadHistory(leagueId, userMap, scored, currentAllM){
  // Fetch all historical seasons via linked league chain
  try{
    let allSeasons=[];
    let lid=leagueId;
    // Walk previous_league_id chain up to 8 seasons
    for(let s=0;s<8;s++){
      const lr=await fetch(`https://api.sleeper.app/v1/league/${lid}`).then(r=>r.json()).catch(()=>null);
      if(!lr) break;
      allSeasons.push({lid,season:lr.season,name:lr.name,prevId:lr.previous_league_id});
      if(!lr.previous_league_id) break;
      lid=lr.previous_league_id;
    }
    allSeasons.sort((a,b)=>Number(a.season)-Number(b.season));

    // For each season fetch winners bracket and rosters
    const seasonData=[];
    for(const s of allSeasons){
      const [wb,rosters,users]=await Promise.all([
        fetch(`https://api.sleeper.app/v1/league/${s.lid}/winners_bracket`).then(r=>r.json()).catch(()=>[]),
        fetch(`https://api.sleeper.app/v1/league/${s.lid}/rosters`).then(r=>r.json()).catch(()=>[]),
        fetch(`https://api.sleeper.app/v1/league/${s.lid}/users`).then(r=>r.json()).catch(()=>[])
      ]);
      const um={};users.forEach(u=>{um[u.user_id]=u.display_name;});
      const rm={};rosters.forEach(r=>{rm[r.roster_id]=um[r.owner_id]||'Unknown';});

      // Fetch all matchup weeks for this season (reg season + playoffs)
      const weekMatches=await Promise.all(
        Array.from({length:17},(_,i)=>fetch(`https://api.sleeper.app/v1/league/${s.lid}/matchups/${i+1}`).then(r=>r.json()).catch(()=>[]))
      );

      // Build per-team stats from matchups
      const teamStats={};
      rosters.forEach(r=>{
        const name=rm[r.roster_id]||'Unknown';
        teamStats[name]={
          wins:r.settings?.wins||0,
          losses:r.settings?.losses||0,
          ties:r.settings?.ties||0,
          pf:Math.round(((r.settings?.fpts||0)+(r.settings?.fpts_decimal||0)/100)*10)/10,
          weeklyPts:[]
        };
      });
      weekMatches.forEach(wm=>{
        if(!Array.isArray(wm)) return;
        wm.forEach(m=>{
          const name=rm[m.roster_id];
          if(name&&m.points>0&&teamStats[name]) teamStats[name].weeklyPts.push(m.points);
        });
      });

      // Highest single-week scorer
      let highWeekOwner='', highWeekPts=0;
      Object.entries(teamStats).forEach(([name,ts])=>{
        const wMax=ts.weeklyPts.length?Math.max(...ts.weeklyPts):0;
        if(wMax>highWeekPts){highWeekPts=wMax;highWeekOwner=name;}
      });

      let champ=null,runnerUp=null,champRosterId=null;
      if(Array.isArray(wb)&&wb.length){
        const maxRound=Math.max(...wb.map(m=>m.r||0));
        const champMatch=wb.filter(m=>m.r===maxRound)[0];
        if(champMatch){
          champ=rm[champMatch.w]||null;
          runnerUp=rm[champMatch.l]||null;
          champRosterId=champMatch.w;
        }
      }
      // Pull the championship roster's player IDs (Sleeper returns the
      // end-of-season roster for historical leagues — exactly what we want).
      let champPids=[];
      if(champRosterId!=null){
        const cr=rosters.find(r=>r.roster_id===champRosterId);
        if(cr){
          champPids=[...(cr.players||[]),...(cr.taxi||[])];
        }
      }
      const [lb]=await Promise.all([
        fetch(`https://api.sleeper.app/v1/league/${s.lid}/losers_bracket`).then(r=>r.json()).catch(()=>[])
      ]);
      let whizzer=null;
      if(Array.isArray(lb)&&lb.length){
        const maxLR=Math.max(...lb.map(m=>m.r||0));
        const loserFinals=lb.filter(m=>m.r===maxLR);
        if(loserFinals[0]) whizzer=rm[loserFinals[0].l]||null;
      }
      const recs={};
      rosters.forEach(r=>{
        const name=rm[r.roster_id]||'Unknown';
        recs[name]={wins:r.settings?.wins||0,losses:r.settings?.losses||0,ties:r.settings?.ties||0,
          pf:Math.round(((r.settings?.fpts||0)+(r.settings?.fpts_decimal||0)/100)*10)/10};
      });

      // League avg PPG this season
      const allPts=Object.values(teamStats).flatMap(ts=>ts.weeklyPts);
      const avgPPG=allPts.length?Math.round((allPts.reduce((a,b)=>a+b,0)/allPts.length)*10)/10:0;
      const highScorer=Object.entries(recs).sort((a,b)=>b[1].pf-a[1].pf)[0]?.[0]||'';

      // Standings sorted by wins desc, then pf
      const standings=Object.entries(recs).sort((a,b)=>b[1].wins-a[1].wins||(b[1].pf-a[1].pf)).map(([name,r])=>({name,...r}));

      seasonData.push({season:s.season,lid:s.lid,leagueName:s.name,champ,runnerUp,whizzer,recs,
        standings,avgPPG,highScorer,highWeekOwner,highWeekPts:Math.round(highWeekPts*10)/10,
        teamStats,champPids});
    }

    // H2H: collect regular-season matchup results across all seasons
    // h2h[nameA][nameB] = {w, l} from nameA's perspective
    const h2h={};
    const ensureH2H=(a,b)=>{
      if(!h2h[a]) h2h[a]={};
      if(!h2h[a][b]) h2h[a][b]={w:0,l:0,t:0};
    };
    for(const s of allSeasons){
      // Fetch rosters + users for this season's name mapping
      const [seasonRosters,seasonUsers]=await Promise.all([
        fetch(`https://api.sleeper.app/v1/league/${s.lid}/rosters`).then(r=>r.json()).catch(()=>[]),
        fetch(`https://api.sleeper.app/v1/league/${s.lid}/users`).then(r=>r.json()).catch(()=>[])
      ]);
      const sum={};seasonUsers.forEach(u=>{sum[u.user_id]=u.display_name;});
      const srm={};seasonRosters.forEach(r=>{srm[r.roster_id]=sum[r.owner_id]||'Unknown';});

      // Fetch regular season weeks (1-14 typical)
      const weekMatches=await Promise.all(
        Array.from({length:14},(_,i)=>fetch(`https://api.sleeper.app/v1/league/${s.lid}/matchups/${i+1}`).then(r=>r.json()).catch(()=>[]))
      );
      weekMatches.forEach(wm=>{
        if(!Array.isArray(wm)||!wm.length) return;
        // Group by matchup_id
        const byMatch={};
        wm.forEach(m=>{
          if(!m.matchup_id) return;
          if(!byMatch[m.matchup_id]) byMatch[m.matchup_id]=[];
          byMatch[m.matchup_id].push(m);
        });
        Object.values(byMatch).forEach(pair=>{
          if(pair.length!==2) return;
          const [a,b]=pair;
          const nameA=srm[a.roster_id],nameB=srm[b.roster_id];
          if(!nameA||!nameB||nameA===nameB) return;
          const ptsA=a.points||0,ptsB=b.points||0;
          ensureH2H(nameA,nameB); ensureH2H(nameB,nameA);
          if(ptsA>ptsB){h2h[nameA][nameB].w++;h2h[nameB][nameA].l++;}
          else if(ptsB>ptsA){h2h[nameB][nameA].w++;h2h[nameA][nameB].l++;}
          else{h2h[nameA][nameB].t++;h2h[nameB][nameA].t++;}
        });
      });
    }

    // Build a normalized-name → list of championship seasons map. Used by
    // the player card to show a 🏆 N× champion tally when a champion roster
    // contained that player at the end of that season.
    const playerTitles={};
    const sp=window._sleeperPlayers||{};
    seasonData.forEach(sd=>{
      if(!sd.champ||!Array.isArray(sd.champPids)) return;
      sd.champPids.forEach(pid=>{
        const p=sp[pid]; if(!p) return;
        const nm=`${p.first_name||''} ${p.last_name||''}`.trim();
        if(!nm) return;
        const key=normName(nm);
        if(!playerTitles[key]) playerTitles[key]={count:0,seasons:[],owner:sd.champ};
        playerTitles[key].count++;
        playerTitles[key].seasons.push(sd.season);
      });
    });

    HIST_DATA={seasons:seasonData,userMap,scored,h2h,playerTitles};
    // Expose for renderCard
    window._playerTitles=playerTitles;
    renderHistory();
  }catch(e){console.error('History load error:',e);}
}

async function loadTradeHistory(leagueId, userMap, sleeperPlayers){
  try{
    // Collect all transaction IDs across all weeks for current + previous seasons
    let lid=leagueId;
    let allTrades=[];
    for(let s=0;s<6;s++){
      const lr=await fetch(`https://api.sleeper.app/v1/league/${lid}`).then(r=>r.json()).catch(()=>null);
      if(!lr) break;
      const [rosters,users]=await Promise.all([
        fetch(`https://api.sleeper.app/v1/league/${lid}/rosters`).then(r=>r.json()).catch(()=>[]),
        fetch(`https://api.sleeper.app/v1/league/${lid}/users`).then(r=>r.json()).catch(()=>[])
      ]);
      const um={};users.forEach(u=>{um[u.user_id]=u.display_name;});
      const rm={};rosters.forEach(r=>{rm[r.roster_id]=um[r.owner_id]||'Unknown';});
      // Fetch transactions for all 18 weeks
      const weekTxns=await Promise.all(
        Array.from({length:18},(_,i)=>fetch(`https://api.sleeper.app/v1/league/${lid}/transactions/${i+1}`).then(r=>r.json()).catch(()=>[]))
      );
      weekTxns.forEach(txns=>{
        if(!Array.isArray(txns)) return;
        txns.forEach(t=>{
          if(t.type!=='trade') return;
          const rosterIds=t.roster_ids||[];
          const adds=t.adds||{};
          const drops=t.drops||{};
          const picks=t.draft_picks||[];
          // Map players to roster sides
          const sides={};
          rosterIds.forEach(rid=>sides[rid]={players:[],picks:[],name:rm[rid]||'Unknown'});
          Object.entries(adds).forEach(([pid,rid])=>{
            if(sides[rid]){
              const p=sleeperPlayers[pid];
              const name=p?`${p.first_name} ${p.last_name}`.trim():pid;
              sides[rid].players.push({pid,name});
            }
          });
          picks.forEach(pk=>{
            const toRid=pk.owner_id;
            if(sides[toRid]) sides[toRid].picks.push(`${pk.season} Rd${pk.round}`);
            // Store raw pick transaction for ownership reconciliation
            const yr=parseInt(pk.season)||0;
            const rd=parseInt(pk.round)||0;
            const origRid=parseInt(pk.original_roster_id)||0;
            let newOwner=parseInt(pk.owner_id)||0;
            if(!newOwner){
              const prevOwner=parseInt(pk.previous_owner_id)||parseInt(pk.roster_id)||0;
              const rids=(t.roster_ids||[]).map(v=>parseInt(v));
              newOwner=rids.find(rid=>rid!==prevOwner)||0;
            }
            if(yr>=2027&&rd&&origRid&&newOwner){
              window._rawPickTxns=window._rawPickTxns||[];
              window._rawPickTxns.push({yr,rd,origRid,newOwner,ts:t.status_updated||t.created||0});
            }
          });
          const sideArr=Object.values(sides).filter(s=>s.name);
          if(sideArr.length>=2){
            sideArr.forEach(side=>{
              // Current value (today's scores)
              side.value=side.players.reduce((sum,p)=>{
                const m=NM_EXACT[p.name.toLowerCase()]||NM_NORM[normName(p.name)];
                return sum+(m?getScore(m):0);
              },0);
              side.value+=side.picks.length*18;
              // "Then" value — approximate using rank-based decay from when they were traded
              // We don't have historical scores, so use current as baseline
              // but mark players who have dramatically changed (age decay approximation)
              side.thenValue=side.players.reduce((sum,p)=>{
                const m=NM_EXACT[p.name.toLowerCase()]||NM_NORM[normName(p.name)];
                if(!m) return sum;
                const yearsAgo=(Date.now()-(t.status_updated||t.created||0))/(1000*60*60*24*365);
                // Approximate historical value: reverse age decay
                const peak={QB:30,WR:27,RB:25,TE:28}[m.pos]||27;
                const currentAge=m.age||peak;
                const pastAge=currentAge-yearsAgo;
                const ageFactor=pastAge<peak?1.0:Math.min(1.3,1+(peak-pastAge)*-0.04);
                return sum+Math.max(0,getScore(m)*ageFactor);
              },0);
              side.thenValue+=side.picks.length*18;
            });
            allTrades.push({
              season:lr.season,
              ts:t.status_updated||t.created||0,
              sides:sideArr,
              id:t.transaction_id
            });
          }
        });
      });
      if(!lr.previous_league_id) break;
      lid=lr.previous_league_id;
    }
    // Sort by date descending
    allTrades.sort((a,b)=>b.ts-a.ts);

    // Most traded players: count appearances across all trades
    const playerCounts={};
    // Trades per team + waivers per team (collected across all seasons)
    const teamTrades={};  // name -> trade count
    const teamWaivers={}; // name -> waiver count

    allTrades.forEach(t=>{
      t.sides.forEach(side=>{
        teamTrades[side.name]=(teamTrades[side.name]||0)+1;
        side.players.forEach(p=>{
          playerCounts[p.name]=(playerCounts[p.name]||0)+1;
        });
      });
    });

    // Also scan for waivers/free-agent pickups across all historical seasons
    let lidW=leagueId;
    for(let s=0;s<6;s++){
      const lrW=await fetch(`https://api.sleeper.app/v1/league/${lidW}`).then(r=>r.json()).catch(()=>null);
      if(!lrW) break;
      const [rostersW,usersW]=await Promise.all([
        fetch(`https://api.sleeper.app/v1/league/${lidW}/rosters`).then(r=>r.json()).catch(()=>[]),
        fetch(`https://api.sleeper.app/v1/league/${lidW}/users`).then(r=>r.json()).catch(()=>[])
      ]);
      const umW={};usersW.forEach(u=>{umW[u.user_id]=u.display_name;});
      const rmW={};rostersW.forEach(r=>{rmW[r.roster_id]=umW[r.owner_id]||'Unknown';});
      const wkW=await Promise.all(
        Array.from({length:18},(_,i)=>fetch(`https://api.sleeper.app/v1/league/${lidW}/transactions/${i+1}`).then(r=>r.json()).catch(()=>[]))
      );
      wkW.forEach(txns=>{
        if(!Array.isArray(txns)) return;
        txns.forEach(t=>{
          if(t.type!=='waiver'&&t.type!=='free_agent') return;
          // Waiver: adds tells us who gained what — roster_id is the claimer
          const adds=t.adds||{};
          const claimers=new Set(Object.values(adds));
          claimers.forEach(rid=>{
            const name=rmW[rid];
            if(name) teamWaivers[name]=(teamWaivers[name]||0)+1;
          });
        });
      });
      if(!lrW.previous_league_id) break;
      lidW=lrW.previous_league_id;
    }

    const topTraded=Object.entries(playerCounts).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([name,count])=>({name,count}));

    TRADES_DATA={trades:allTrades,topTraded,teamTrades,teamWaivers};
    window._tradesData=TRADES_DATA;

    // ── JERRY JONES MOVE OF THE YEAR ──────────────────────────────────────
    // Per season, find the most lopsided 2-team trade where BOTH sides gave
    // value ≥ 20 (current scores). Filters out throwaway trades that are
    // proportionally lopsided but quantitatively meaningless.
    const JERRY_MIN_VALUE=20;
    const jerryBySeason={};
    allTrades.forEach(t=>{
      if(!t.sides||t.sides.length!==2) return; // 2-team only — multi-team gets complex
      const [s1,s2]=t.sides;
      if((s1.value||0)<JERRY_MIN_VALUE||(s2.value||0)<JERRY_MIN_VALUE) return;
      const margin=Math.abs((s1.value||0)-(s2.value||0));
      if(margin<5) return; // need at least a meaningful gap to be "lopsided"
      const winner=s1.value<s2.value?s1:s2; // gave less, got more
      const loser =s1.value<s2.value?s2:s1;
      // Track per season
      const yr=t.season||'';
      if(!jerryBySeason[yr]||margin>jerryBySeason[yr].margin){
        jerryBySeason[yr]={
          trade:t,
          margin,
          winner:winner.name,
          loser:loser.name,
          winnerGave:winner.value,    // value of assets winner shipped out
          winnerRecv:loser.value,     // value of assets winner received
          loserGave:loser.value,
          loserRecv:winner.value
        };
      }
    });
    TRADES_DATA.jerryBySeason=jerryBySeason;

    // Net trade value per manager (today's value of what they received minus what they gave)
    const netTradeValue={};
    allTrades.forEach(t=>{
      if(t.sides.length<2) return;
      // For each side, net = what you received - what you gave
      // In a 2-team trade: side[0] received side[1]'s assets and vice versa
      const [s1,s2]=t.sides;
      const s1received=s2.value, s1gave=s1.value;
      const s2received=s1.value, s2gave=s2.value;
      netTradeValue[s1.name]=(netTradeValue[s1.name]||0)+(s1received-s1gave);
      netTradeValue[s2.name]=(netTradeValue[s2.name]||0)+(s2received-s2gave);
    });
    TRADES_DATA.netTradeValue=netTradeValue;
    renderTrades();
    // If history page has already rendered (it loads in parallel), refresh it so
    // the Jerry Jones cards now show up under each season.
    try{
      const hc=document.getElementById('hist-content');
      if(HIST_DATA&&HIST_DATA.seasons?.length&&hc&&hc.innerHTML) renderHistory();
    }catch(e){}
  }catch(e){console.error('Trade history error:',e);}
}

function renderHistory(){
  const el=document.getElementById('hist-content');
  const emp=document.getElementById('hist-empty');
  if(!HIST_DATA||!HIST_DATA.seasons.length){emp.style.display='block';el.style.display='none';return;}
  emp.style.display='none';el.style.display='block';
  const {seasons,scored,h2h}=HIST_DATA;

  // Championship section
  const champRows=seasons.filter(s=>s.champ).reverse().map(s=>`
    <div class="champ-row">
      <div class="champ-year">${s.season}</div>
      <div class="champ-trophy">🏆</div>
      <div><div class="champ-name">${s.champ}</div><div class="champ-sub">${s.runnerUp?'Runner-up: '+s.runnerUp:''}</div></div>
    </div>`).join('');

  // Whizzer's Court Bowl
  const whizzRows=seasons.filter(s=>s.whizzer).reverse().map(s=>`
    <div class="whizz-row">
      <div class="whizz-year">${s.season}</div>
      <div style="font-size:18px;">🚽</div>
      <div><div class="champ-name" style="color:var(--rt);">${s.whizzer}</div><div class="champ-sub">Whizzer's Court Bowl</div></div>
    </div>`).join('');

  // Jerry Jones Move of the Year roll. Only show entries for COMPLETED
  // seasons (champ exists) that have a Jerry pick from loadTradeHistory.
  const jerryBy=window._tradesData?.jerryBySeason||{};
  const jerryRows=seasons.filter(s=>s.champ&&jerryBy[s.season]).reverse().map(s=>{
    const j=jerryBy[s.season];
    const marginRound=Math.round(j.margin);
    return `<div class="whizz-row">
      <div class="whizz-year">${s.season}</div>
      <div style="font-size:18px;">🤠</div>
      <div style="flex:1;min-width:0;"><div class="champ-name">${j.loser}</div><div class="champ-sub">Fleeced by ${j.winner} · ${marginRound}-pt swing</div></div>
    </div>`;
  }).join('');

  // All-time records
  const atRecs={};
  seasons.forEach(s=>{Object.entries(s.recs).forEach(([name,rec])=>{
    if(!atRecs[name]) atRecs[name]={w:0,l:0,t:0,titles:0,whizzers:0};
    atRecs[name].w+=rec.wins; atRecs[name].l+=rec.losses; atRecs[name].t+=rec.ties;
    if(s.champ===name) atRecs[name].titles++;
    if(s.whizzer===name) atRecs[name].whizzers++;
  });});
  const recCards=Object.entries(atRecs).sort((a,b)=>{
    const wpA=a[1].w/(a[1].w+a[1].l+a[1].t||1);
    const wpB=b[1].w/(b[1].w+b[1].l+b[1].t||1);
    return wpB-wpA;
  }).map(([name,r])=>{
    const gp=r.w+r.l+r.t;
    const wlGames=r.w+r.l;
    const wp=wlGames?Math.round((r.w/wlGames)*100):0;
    const titles=r.titles?`🏆 ${r.titles}×`:'';
    const whiz=r.whizzers?` 🚽 ${r.whizzers}×`:'';
    return `<div class="record-card">
      <div class="record-owner">${name}${titles?(' '+titles):''}${whiz}</div>
      <div class="record-stat">${r.w}–${r.l}${r.t>0?' ('+r.t+'T)':''}</div>
      <div class="record-sub">${wp}% win rate · ${gp} games played</div>
    </div>`;
  }).join('');

  // H2H: clickable manager cards
  let h2hHtml='<div class="no-data">No head-to-head data available</div>';
  if(h2h&&Object.keys(h2h).length){
    const names=Object.keys(h2h).sort();
    const managerCards=names.map(name=>{
      const opponents=h2h[name]||{};
      const totalW=Object.values(opponents).reduce((s,r)=>s+r.w,0);
      const totalL=Object.values(opponents).reduce((s,r)=>s+r.l,0);
      const totalT=Object.values(opponents).reduce((s,r)=>s+r.t,0);
      const gp=totalW+totalL+totalT;
      const wlGames=totalW+totalL; // ties don't count for win%
      const wp=wlGames?Math.round((totalW/wlGames)*100):0;
      const titles=(atRecs[name]?.titles||0);
      return `<div class="h2h-card" onclick="toggleH2H('h2h_${name.replace(/\s+/g,'_')}',this)">
        <div class="h2h-card-header">
          <div>
            <div class="h2h-card-name">${name}${titles?' 🏆'.repeat(Math.min(titles,3)):''}</div>
            <div class="h2h-card-rec">${totalW}–${totalL}${totalT>0?' ('+totalT+'T)':''} &nbsp;·&nbsp; ${wp}% &nbsp;·&nbsp; ${gp} games</div>
          </div>
          <div class="h2h-card-chevron">▾</div>
        </div>
        <div class="h2h-detail" id="h2h_${name.replace(/\s+/g,'_')}" style="display:none;">
          ${Object.entries(opponents).sort((a,b)=>{
            const rA=a[1],rB=b[1];
            return (rB.w-rB.l)-(rA.w-rA.l);
          }).map(([opp,rec])=>{
            if(!rec.w&&!rec.l&&!rec.t) return '';
            const cls=rec.w>rec.l?'h2h-win':rec.l>rec.w?'h2h-lose':'h2h-even';
            const wlTotal=rec.w+rec.l;
            const bar=wlTotal>0?Math.round((rec.w/wlTotal)*100):50;
            const recStr=rec.w+'–'+rec.l+(rec.t>0?' ('+rec.t+'T)':'');
            return `<div class="h2h-row">
              <div class="h2h-opp">${opp}</div>
              <div class="h2h-bar-wrap">
                <div class="h2h-bar-inner" style="width:${bar}%;background:${cls==='h2h-win'?'var(--gt)':cls==='h2h-lose'?'var(--rt)':'var(--gold)'};"></div>
              </div>
              <div class="h2h-rec ${cls}">${recStr}</div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    });
    h2hHtml=`<div class="h2h-cards">${managerCards.join('')}</div>
    <div style="margin-top:10px;font-size:11px;color:var(--text3);">Click any manager to expand their all-time record against each opponent.</div>`;
  }

  el.innerHTML=`
    <div class="hist-section"><div class="hist-section-title">📅 Season-by-Season Recap</div>${seasonRecap(seasons)}</div>
    <div class="hist-section"><div class="hist-section-title">🏆 Championship Roll</div>${champRows||'<div class="no-data">No championship data found</div>'}</div>
    <div class="hist-section"><div class="hist-section-title">🚽 Whizzer's Court Bowl</div>${whizzRows||'<div class="no-data">No loser bracket data found</div>'}</div>
    <div class="hist-section"><div class="hist-section-title">🤠 Jerry Jones Move of the Year</div>${jerryRows||'<div class="no-data">No qualifying lopsided trades yet — needs both sides ≥20 pts of value and a completed season.</div>'}</div>
    <div class="hist-section"><div class="hist-section-title">All-Time Records</div><div class="record-grid">${recCards||'<div class="no-data">No records found</div>'}</div></div>
    <div class="hist-section"><div class="hist-section-title">Head-to-Head Records</div>${h2hHtml}</div>`;
}

function seasonRecap(seasons){
  if(!seasons||!seasons.length) return '<div class="no-data">No season data</div>';
  return [...seasons].reverse().map(s=>{
    const hasData=s.standings&&s.standings.length;
    const champLine=s.champ?`🏆 ${s.champ}`:'Champion unknown';
    const whizLine=s.whizzer?`🚽 ${s.whizzer}`:'';
    // Jerry Jones only renders for COMPLETED seasons — gate on champ existing,
    // which is set only after the championship match is played. In-progress
    // seasons are excluded so trades from the live season don't surface here
    // until the year wraps.
    const seasonComplete=!!s.champ;
    const jerry=seasonComplete?(window._tradesData?.jerryBySeason?.[s.season]):null;
    const jerryLine=jerry?`🤠 ${jerry.loser}`:'';
    const jerryHtml=seasonComplete?buildJerryJonesCard(s):'';
    return `<div class="season-card">
      <div class="season-card-header" onclick="toggleSeason('sc_${s.season}',this)">
        <div>
          <div class="season-year">${s.season}</div>
          <div class="season-league-name">${s.leagueName||''}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-family:Oswald,sans-serif;font-size:12px;color:var(--text);">${champLine}</div>
          ${whizLine?`<div style="font-family:Oswald,sans-serif;font-size:11px;color:var(--rt);">${whizLine}</div>`:''}
          ${jerryLine?`<div style="font-family:Oswald,sans-serif;font-size:11px;color:var(--accent);">${jerryLine}</div>`:''}
        </div>
        <div style="font-size:14px;color:var(--text3);margin-left:12px;">▾</div>
      </div>
      <div class="season-body" id="sc_${s.season}">
        <div class="season-stat-row">
          ${s.avgPPG?`<div class="season-stat"><div class="season-stat-val">${s.avgPPG}</div><div class="season-stat-lbl">Avg PPG</div></div>`:''}
          ${s.highWeekPts?`<div class="season-stat"><div class="season-stat-val">${s.highWeekPts}</div><div class="season-stat-lbl">High Week</div></div>`:''}
          ${s.highWeekOwner?`<div class="season-stat"><div class="season-stat-val" style="font-size:12px;">${s.highWeekOwner.split(' ')[0]}</div><div class="season-stat-lbl">High Scorer</div></div>`:''}
          ${s.standings?`<div class="season-stat"><div class="season-stat-val">${s.standings.length}</div><div class="season-stat-lbl">Teams</div></div>`:''}
        </div>
        ${jerryHtml}
        ${hasData?`<div style="font-family:Oswald,sans-serif;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:var(--text3);margin-bottom:8px;">Final Standings</div>
        <div class="season-standings">
          ${s.standings.slice(0,12).map((t,i)=>`<div class="season-standing-row">
            <div class="season-standing-rank">${i===0?'🏆':i+1}</div>
            <div class="season-standing-name" title="${t.name}">${t.name}</div>
            <div class="season-standing-rec">${t.wins}–${t.losses}</div>
          </div>`).join('')}
        </div>`:'<div class="no-data">No standings data</div>'}
        ${s.teamStats?buildSeasonSparklines(s.teamStats):''}
      </div>
    </div>`;
  }).join('');
}

// ── JERRY JONES MOVE OF THE YEAR ──────────────────────────────────────────
// Renders the per-season "most lopsided trade" card. Pulls from TRADES_DATA
// which loads in parallel with HIST_DATA; if trades aren't ready yet, returns
// empty and the card appears on the next render (we re-render history when
// trade data finishes loading).
function buildJerryJonesCard(season){
  const j=window._tradesData?.jerryBySeason?.[season.season];
  if(!j) return '';
  const t=j.trade;
  const [s1,s2]=t.sides;
  const winnerSide=s1.name===j.winner?s1:s2;
  const loserSide =s1.name===j.winner?s2:s1;
  // Format the actual assets exchanged
  function assetsHtml(side){
    const players=side.players.map(p=>{
      const m=NM_EXACT[p.name.toLowerCase()]||NM_NORM[normName(p.name)];
      const tier=m?tierLetter(getScore(m)):'?';
      const tc=m?tierColor(tier):'var(--text3)';
      return `<div style="font-size:11px;color:var(--text2);line-height:1.5;">${p.name} <span style="color:${tc};font-family:'Russo One',sans-serif;font-size:10px;">${tier}</span></div>`;
    }).join('');
    const picks=side.picks.map(pk=>`<div style="font-size:11px;color:var(--pick);line-height:1.5;">${pk}</div>`).join('');
    return players+picks||'<div style="font-size:11px;color:var(--text3);font-style:italic;">—</div>';
  }
  // Compute the "consequence" — how much of winner's CURRENT roster value
  // is still tied to assets received in this trade.
  let stillRosteredVal=0, stillRosteredNames=[];
  try{
    const winnerRoster=(window.MODAL_DATA||[]).find(r=>r.owner===j.winner);
    if(winnerRoster){
      loserSide.players.forEach(p=>{
        const onRoster=winnerRoster.all.find(rp=>normName(rp.name)===normName(p.name));
        if(onRoster){
          stillRosteredVal+=getScore(onRoster);
          stillRosteredNames.push(onRoster.name);
        }
      });
    }
  }catch(e){}
  // Margin tier for flair copy. Margin numbers are part of the storytelling
  // (this is a "heist of the year" recap), so we keep them as round integers.
  const marginRound=Math.round(j.margin);
  let tier, tagline;
  if(j.margin>=60){
    tier='⚠️ Franchise-Altering Heist';
    tagline=`${j.winner} robbed ${j.loser} in broad daylight. This trade alone could swing a championship window.`;
  } else if(j.margin>=40){
    tier='🚨 Roster-Tilting Swindle';
    tagline=`${j.winner} walked away with the haul of the year. Roster construction was permanently rearranged.`;
  } else if(j.margin>=25){
    tier='💼 Lopsided Steal';
    tagline=`${j.winner} took ${j.loser} to the cleaners. A clear win that reshaped both rosters.`;
  } else {
    tier='🔪 Sharp Move';
    tagline=`${j.winner} got the better end against ${j.loser}. Not a blowout, but a clear win on the wire.`;
  }
  // If any of the acquired assets are STILL on the winner's current roster, add a punch line
  let consequence='';
  if(stillRosteredVal>=15){
    const top=stillRosteredNames.slice(0,3).join(', ');
    consequence=`<div style="margin-top:10px;padding:8px 12px;background:rgba(192,122,74,0.08);border-left:3px solid var(--accent);font-size:11px;color:var(--text2);line-height:1.55;">
      <span style="font-family:Oswald,sans-serif;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:var(--accent);">Real Consequence</span><br>
      ${top} ${stillRosteredNames.length>1?'are':'is'} still on ${j.winner.split(' ')[0]}'s roster today. This trade is the foundation that's still paying dividends.
    </div>`;
  } else if(stillRosteredNames.length){
    consequence=`<div style="margin-top:10px;font-size:11px;color:var(--text3);font-style:italic;">Acquired pieces still on roster: ${stillRosteredNames.join(', ')}.</div>`;
  }

  return `<div style="margin:14px 0 18px;padding:14px 16px;background:linear-gradient(135deg,rgba(192,122,74,0.10),rgba(155,138,191,0.06));border:1px solid var(--accent);border-radius:10px;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
      <span style="font-size:18px;">🤠</span>
      <span style="font-family:'Russo One',sans-serif;font-size:13px;color:var(--accent);letter-spacing:0.04em;">JERRY JONES MOVE OF THE YEAR</span>
      <span style="font-family:Oswald,sans-serif;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;background:var(--accent);color:var(--bg2);padding:2px 8px;border-radius:3px;">${tier.replace(/^[^\s]+\s/,'')}</span>
    </div>
    <div style="font-size:12px;color:var(--text2);line-height:1.6;margin-bottom:10px;">${tagline}</div>
    <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:start;background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;">
      <div>
        <div style="font-family:Oswald,sans-serif;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--gt);margin-bottom:4px;">🏆 ${j.winner} gave up</div>
        ${assetsHtml(winnerSide)}
      </div>
      <div style="font-family:'Russo One',sans-serif;font-size:20px;color:var(--text3);padding-top:14px;">↔</div>
      <div>
        <div style="font-family:Oswald,sans-serif;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--rt);margin-bottom:4px;">📉 ${j.loser} gave up</div>
        ${assetsHtml(loserSide)}
      </div>
    </div>
    ${consequence}
  </div>`;
}

function buildSeasonSparklines(teamStats){
  const entries=Object.entries(teamStats).filter(([,ts])=>ts.weeklyPts.length>2);
  if(!entries.length) return '';
  entries.sort((a,b)=>b[1].pf-a[1].pf);
  const allPts=entries.flatMap(([,ts])=>ts.weeklyPts);
  const globalMax=Math.max(...allPts)||1;
  const rows=entries.slice(0,8).map(([name,ts])=>{
    const bars=ts.weeklyPts.map(pts=>{
      const pct=Math.round((pts/globalMax)*100);
      const h=Math.max(2,Math.round((pct/100)*20));
      const col=pct>70?'var(--gt)':pct>40?'var(--gold)':'var(--rt)';
      return `<div style="height:${h}px;flex:1;min-width:3px;background:${col};border-radius:1px;opacity:0.85;"></div>`;
    }).join('');
    return `<div style="display:grid;grid-template-columns:90px 1fr 50px;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid rgba(46,51,72,0.3);">
      <div style="font-family:Oswald,sans-serif;font-size:11px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${name}</div>
      <div style="display:flex;align-items:flex-end;gap:2px;height:22px;">${bars}</div>
      <div style="font-family:'Russo One',sans-serif;font-size:11px;color:var(--text3);text-align:right;">${ts.pf} PF</div>
    </div>`;
  }).join('');
  return `<div style="margin-top:14px;">
    <div style="font-family:Oswald,sans-serif;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:var(--text3);margin-bottom:8px;">Weekly Scoring Trends</div>
    ${rows}
  </div>`;
}

function toggleSeason(id, header){
  const el=document.getElementById(id);
  if(!el) return;
  const open=el.style.display==='none'||el.style.display==='';
  el.style.display=open?'block':'none';
  const chev=header.querySelector('div:last-child');
  if(chev) chev.textContent=open?'▴':'▾';
}

function toggleH2H(id, card){
  const el=document.getElementById(id);
  if(!el) return;
  const open=el.style.display==='none';
  el.style.display=open?'block':'none';
  const chev=card.querySelector('.h2h-card-chevron');
  if(chev) chev.textContent=open?'▴':'▾';
}

async function rerunPickAllocation(){
  const btn=document.querySelector('#pick-tally-panel button');
  if(btn){btn.textContent='Running...';btn.disabled=true;}

  const id=window._lastLeagueId;
  if(!id||!window.MODAL_DATA) return;

  // Build userToRoster from current MODAL_DATA
  const ridToOwner={};
  MODAL_DATA.forEach(r=>{ ridToOwner[r.rid]=r.owner; });
  function tr(v){
    if(!v&&v!==0) return null;
    const n=parseInt(v);
    if(isNaN(n)||n<=0) return null;
    if(MODAL_DATA.find(r=>r.rid===n)) return n;
    return null;
  }

  // Fetch all transactions
  const allTxns=[];
  try{
    let scanId=id;
    const seen=new Set();
    for(let s=0;s<8;s++){
      if(seen.has(scanId)) break; seen.add(scanId);
      const [lgRes,weekTxns]=await Promise.all([
        fetch(`https://api.sleeper.app/v1/league/${scanId}`).then(r=>r.ok?r.json():null).catch(()=>null),
        Promise.all(Array.from({length:24},(_,i)=>fetch(`https://api.sleeper.app/v1/league/${scanId}/transactions/${i}`).then(r=>r.json()).catch(()=>[])))
      ]);
      weekTxns.forEach(wk=>{ if(Array.isArray(wk)) wk.forEach(t=>{ if(t.type==='trade'||t.type==='commissioner') allTxns.push(t); }); });
      if(!lgRes?.previous_league_id) break;
      scanId=lgRes.previous_league_id;
    }
  }catch(e){}

  const txnSeen=new Set();
  const deduped=allTxns.filter(t=>{ const k=String(t.transaction_id||Math.random()); if(txnSeen.has(k)) return false; txnSeen.add(k); return true; });
  deduped.sort((a,b)=>{ const d=(a.status_updated||a.created||0)-(b.status_updated||b.created||0); if(d) return d; return String(a.transaction_id||'0').padStart(20,'0')<String(b.transaction_id||'0').padStart(20,'0')?-1:1; });

  // For each yr+rd, simulate pick ownership using net flow — run TWICE
  const pickCounts={}; // rid → total picks
  MODAL_DATA.forEach(r=>{ pickCounts[r.rid]=0; });

  [2027,2028,2029].forEach(yr=>[1,2,3,4].forEach(rd=>{
    const owner={};
    MODAL_DATA.forEach(r=>{ owner[r.rid]=1; }); // start: everyone has 1

    // Pass 1
    const runPass=()=>{
      const seenInTxn=new Set();
      deduped.forEach(txn=>{
        const seenPk=new Set();
        (txn.draft_picks||[]).forEach(pk=>{
          if(parseInt(pk.season)!==yr||parseInt(pk.round)!==rd) return;
          const prev=tr(pk.previous_owner_id);
          const now=tr(pk.owner_id);
          if(!prev||!now||prev===now) return;
          const key=`${prev}_${now}_${rd}`;
          if(seenPk.has(key)) return; seenPk.add(key);
          if((owner[prev]||0)>0){ owner[prev]--; owner[now]=(owner[now]||0)+1; }
        });
      });
    };

    runPass(); // pass 1
    runPass(); // pass 2 catches anything missed

    // Enforce total = 12
    const total=Object.values(owner).reduce((s,n)=>s+n,0);
    if(total!==MODAL_DATA.length){
      // redistribute: reset and recount
      MODAL_DATA.forEach(r=>{ if(!owner[r.rid]) owner[r.rid]=0; });
    }
    Object.entries(owner).forEach(([rid,cnt])=>{ pickCounts[parseInt(rid)]=(pickCounts[parseInt(rid)]||0)+cnt; });
  }));

  // Update MODAL_DATA pick counts and re-render tally
  const total=Object.values(pickCounts).reduce((s,n)=>s+n,0);
  const byTeam=MODAL_DATA.map(r=>`<span style="color:var(--text2);">${r.owner.split(' ')[0]}:<b style="color:${pickCounts[r.rid]===(r.picks||[]).length?'#6db882':'#c97b7b'}">${pickCounts[r.rid]||0}(was:${(r.picks||[]).length})</b></span>`).join(' · ');

  const panel=document.getElementById('pick-tally-panel');
  if(panel) panel.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
    <span style="color:${total===144?'#6db882':'#c97b7b'};font-size:13px;font-weight:600;">RECHECKED: ${total}/144</span>
    <button onclick="rerunPickAllocation()" style="font-family:Oswald,sans-serif;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;padding:5px 12px;border:none;background:var(--accent);color:var(--bg2);cursor:pointer;">Check Again</button>
  </div>
  <div style="color:var(--text3);line-height:1.8;">${byTeam}</div>`;
}

async function showRawPickTxns(){
  const el=document.getElementById('raw-pick-txns');
  el.style.display='block';
  el.innerHTML='<div style="color:var(--text3);">Loading all transactions...</div>';
  const lid=document.getElementById('lid')?.value?.trim()||document.getElementById('nav-lid')?.value?.trim();
  if(!lid){el.innerHTML='<div style="color:#f88;">Load a league first.</div>';return;}

  // Build roster ID → username map
  const ridToName={};
  (MODAL_DATA||[]).forEach(r=>{ ridToName[r.rid]=r.owner; });

  // Fetch all transactions across all historical seasons
  const allTxns=[];
  try{
    let scanId=lid;
    const seen=new Set();
    for(let s=0;s<8;s++){
      if(seen.has(scanId)) break;
      seen.add(scanId);
      const [lgRes,weekTxns]=await Promise.all([
        fetch(`https://api.sleeper.app/v1/league/${scanId}`).then(r=>r.ok?r.json():null).catch(()=>null),
        Promise.all(Array.from({length:24},(_,i)=>
          fetch(`https://api.sleeper.app/v1/league/${scanId}/transactions/${i}`)
            .then(r=>r.json()).catch(()=>[])
        ))
      ]);
      weekTxns.forEach(wk=>{ if(Array.isArray(wk)) wk.forEach(t=>{
        if((t.type==='trade'||t.type==='commissioner')&&(t.draft_picks||[]).length>0){
          t._lid=scanId; allTxns.push(t);
        }
      }); });
      if(!lgRes?.previous_league_id) break;
      scanId=lgRes.previous_league_id;
    }
  }catch(e){}

  // Dedupe and sort oldest first
  const seen2=new Set();
  const deduped=allTxns.filter(t=>{ const k=String(t.transaction_id||Math.random()); if(seen2.has(k)) return false; seen2.add(k); return true; });
  deduped.sort((a,b)=>{
    const d=(a.status_updated||a.created||0)-(b.status_updated||b.created||0);
    if(d!==0) return d;
    return String(a.transaction_id||'0').padStart(20,'0')<String(b.transaction_id||'0').padStart(20,'0')?-1:1;
  });

  // Render
  const rows=deduped.map((t,i)=>{
    const date=new Date((t.status_updated||t.created||0)).toLocaleDateString();
    const picks=(t.draft_picks||[]).map(pk=>{
      const yr=pk.season,rd=pk.round;
      const orig=pk.original_roster_id,prev=pk.previous_owner_id,cur=pk.owner_id;
      const origName=ridToName[orig]||`rid:${orig}`;
      const prevName=ridToName[prev]||`rid:${prev}`;
      const curName=ridToName[cur]||`rid:${cur}`;
      return `<div style="margin-left:16px;color:${cur?'#6db882':'#c97b7b'};">
        📦 ${yr} Rd${rd} (orig:${origName}) prev:${prevName} → now:${curName}
      </div>`;
    }).join('');
    const rids=(t.roster_ids||[]).map(r=>ridToName[r]||`rid:${r}`).join(' ↔ ');
    return `<div style="border-bottom:1px solid var(--border);padding:8px 0;color:var(--text2);">
      <div><span style="color:var(--accent);">#${i+1}</span> <span style="color:var(--text3);">${date}</span> <span style="color:var(--text);">${t.type}</span> [${rids}] <span style="color:var(--text3);font-size:10px;">id:${t.transaction_id} lid:${t._lid}</span></div>
      ${picks}
    </div>`;
  }).join('');

  el.innerHTML=`<div style="color:var(--accent);margin-bottom:12px;font-size:12px;">${deduped.length} transactions with picks found</div>${rows||'<div style="color:var(--text3);">No pick transactions found.</div>'}`;
}

