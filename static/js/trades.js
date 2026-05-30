function renderTrades(){
  const el=document.getElementById('trades-content');
  const emp=document.getElementById('trades-empty');
  if(!TRADES_DATA){emp.style.display='block';el.style.display='none';return;}
  emp.style.display='none';el.style.display='block';
  const {trades,topTraded,teamTrades,teamWaivers,netTradeValue}=TRADES_DATA;

  // ── MANAGER ARCHETYPES ────────────────────────────────────────────
  function buildArchetype(name){
    const myTrades=trades.filter(t=>t.sides.some(s=>s.name===name));
    const tradeCount=myTrades.length;
    const waiverCount=teamWaivers[name]||0;
    // Players they acquired
    const acquired=[];
    myTrades.forEach(t=>{
      t.sides.forEach(s=>{
        if(s.name!==name) s.players.forEach(p=>{
          const m=NM_EXACT[p.name.toLowerCase()]||NM_NORM[normName(p.name)];
          if(m) acquired.push(m);
        });
      });
    });
    // Players they gave away
    const given=[];
    myTrades.forEach(t=>{
      t.sides.forEach(s=>{
        if(s.name===name) s.players.forEach(p=>{
          const m=NM_EXACT[p.name.toLowerCase()]||NM_NORM[normName(p.name)];
          if(m) given.push(m);
        });
      });
    });
    const avgAcqAge=acquired.length?acquired.reduce((s,p)=>s+(p.age||25),0)/acquired.length:25;
    const avgGiveAge=given.length?given.reduce((s,p)=>s+(p.age||25),0)/given.length:25;
    const picksTaken=myTrades.reduce((s,t)=>{const side=t.sides.find(s=>s.name!==name);return s+(side?.picks?.length||0);},0);
    const picksGiven=myTrades.reduce((s,t)=>{const side=t.sides.find(s=>s.name===name);return s+(side?.picks?.length||0);},0);
    const qbsAcq=acquired.filter(p=>p.pos==='QB').length;
    const rbsAcq=acquired.filter(p=>p.pos==='RB').length;
    const wrsAcq=acquired.filter(p=>p.pos==='WR').length;
    const net=netTradeValue?.[name]||0;

    // Determine archetype
    let archetype,archetypeCls,desc;
    const tradeFreq=tradeCount/(HIST_DATA?.seasons?.length||1);
    const likesVets=avgAcqAge>28;
    const likesYouth=avgAcqAge<25;
    const hoardsPicks=picksTaken>picksGiven+3;
    const sellsPicks=picksGiven>picksTaken+3;
    const qbHeavy=qbsAcq>wrsAcq&&qbsAcq>rbsAcq;
    const rbHeavy=rbsAcq>wrsAcq+2;
    const lowActivity=tradeCount<3&&waiverCount<5;

    if(lowActivity){
      archetype='The Set & Forget';archetypeCls='arch-balanced';
      desc='Rarely trades, barely touches waivers. Either very confident in their roster or not paying attention.';
    } else if(hoardsPicks&&likesYouth){
      archetype='The Rebuilder';archetypeCls='arch-dynasty';
      desc='Accumulates draft capital and targets young players. Playing the long game.';
    } else if(likesVets&&sellsPicks){
      archetype='Win Now';archetypeCls='arch-win';
      desc='Trades picks for proven veterans. Championship window is open — or closing.';
    } else if(likesYouth&&!hoardsPicks){
      archetype='Youth Movement';archetypeCls='arch-youth';
      desc='Consistently acquires young talent. Willing to sacrifice short-term for long-term upside.';
    } else if(hoardsPicks){
      archetype='Draft Capital Hoarder';archetypeCls='arch-hoarder';
      desc='Collects picks aggressively. Believes future draft capital beats current roster value.';
    } else if(tradeFreq>4){
      archetype='The Flipper';archetypeCls='arch-flipper';
      desc='Always active on the trade market. Makes more moves than anyone in the league.';
    } else if(qbHeavy){
      archetype='QB Obsessed';archetypeCls='arch-vet';
      desc='Prioritizes QB talent in trades. Understands the SF premium — or overvalues it.';
    } else if(rbHeavy){
      archetype='RB Factory';archetypeCls='arch-youth';
      desc='Builds through running backs. Either loves RBs or got burned at the position once.';
    } else {
      archetype='Balanced Builder';archetypeCls='arch-balanced';
      desc='No clear obsession — acquires across positions with some picks mixed in.';
    }

    const netCol=net>=0?'var(--gt)':'var(--rt)';
    const netSign=net>=0?'+':'';
    return `<div class="archetype-card">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:8px;">
        <div>
          <div style="font-family:Oswald,sans-serif;font-size:14px;font-weight:600;color:var(--text);">${name}</div>
          <span class="archetype-badge ${archetypeCls}">${archetype}</span>
        </div>
        <div style="text-align:right;">
          <div style="font-family:'Russo One',sans-serif;font-size:16px;color:${netCol};">${netSign}${Math.round(net)}</div>
          <div style="font-family:Oswald,sans-serif;font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:var(--text3);">Net Trade Val</div>
        </div>
      </div>
      <div style="font-size:12px;color:var(--text2);line-height:1.6;margin:6px 0 8px;">${desc}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <div class="archetype-stat"><div class="archetype-stat-v">${tradeCount}</div><div class="archetype-stat-l">Trades</div></div>
        <div class="archetype-stat"><div class="archetype-stat-v">${waiverCount}</div><div class="archetype-stat-l">Waivers</div></div>
        <div class="archetype-stat"><div class="archetype-stat-v">${avgAcqAge.toFixed(1)}</div><div class="archetype-stat-l">Avg Age Acq</div></div>
        <div class="archetype-stat"><div class="archetype-stat-v">${picksTaken}</div><div class="archetype-stat-l">Picks Taken</div></div>
        <div class="archetype-stat"><div class="archetype-stat-v">${picksGiven}</div><div class="archetype-stat-l">Picks Given</div></div>
      </div>
    </div>`;
  }

  // Get all unique manager names from trade history
  const managers=new Set();
  trades.forEach(t=>t.sides.forEach(s=>{if(s.name)managers.add(s.name);}));
  const archetypeHtml=[...managers].sort().map(buildArchetype).join('');

  // ── BEST / WORST TRADES ───────────────────────────────────────────
  // Grade each trade: winner is who got more today's value
  function gradeTrade(t){
    if(t.sides.length<2) return null;
    const [s1,s2]=t.sides;
    const diff=s1.value-s2.value; // s1 gave s1.value, received s2.value
    // From s1's perspective: received s2.value, gave s1.value
    // Net for s1 = s2.value - s1.value
    const s1net=s2.value-s1.value;
    const s2net=s1.value-s2.value;
    return {s1net,s2net,totalValue:s1.value+s2.value};
  }

  const gradedTrades=trades.map(t=>{
    const g=gradeTrade(t);if(!g) return null;
    const [s1,s2]=t.sides;
    const winner=g.s1net>0?s1:s2;
    const loser=g.s1net>0?s2:s1;
    const margin=Math.abs(g.s1net);
    // Grade: S = 30+ pts difference, A = 15+, B = 5+, C = 2+, D = -5, F = -15+
    let grade,gradeCls;
    if(margin>30){grade='Steal';gradeCls='grade-steal';}
    else if(margin>15){grade='Win';gradeCls='grade-win';}
    else if(margin>5){grade='Fair';gradeCls='grade-fair';}
    else if(margin>2){grade='Fair';gradeCls='grade-fair';}
    else{grade='Even';gradeCls='grade-fair';}
    return{...t,winner:winner.name,loser:loser.name,margin,grade,gradeCls,s1net:g.s1net};
  }).filter(Boolean);

  // Sort by margin descending for best steals
  const biggestSteals=gradedTrades.filter(t=>t.margin>5).sort((a,b)=>b.margin-a.margin).slice(0,8);
  // Sort by margin ascending for most lopsided (losers)
  const worstDeals=gradedTrades.filter(t=>t.margin>5).sort((a,b)=>b.margin-a.margin).slice(-6).reverse();

  function tradeGradeCard(t){
    const [s1,s2]=t.sides;
    const ds=t.ts?new Date(t.ts).toLocaleDateString('en-US',{month:'short',year:'numeric'}):'';
    const s1col=t.s1net>0?'var(--gt)':'var(--rt)';
    const s2col=t.s1net<0?'var(--gt)':'var(--rt)';
    const sideHtml=(side,net)=>{
      const col=net>0?'var(--gt)':'var(--rt)';
      // Word verdict for this side's net — keep the directional signal,
      // hide the raw point total.
      let netWord;
      const aNet=Math.abs(net);
      if(aNet<5) netWord='Even';
      else if(net>0) netWord=aNet>20?'Won big':'Won';
      else netWord=aNet>20?'Lost big':'Lost';
      const players=side.players.slice(0,3).map(p=>{
        const m=NM_EXACT[p.name.toLowerCase()]||NM_NORM[normName(p.name)];
        const tier=m?tierLetter(getScore(m)):'?';
        const tc=m?tierColor(tier):'var(--text3)';
        return `<div style="font-size:11px;color:var(--text2);">${p.name} <span style="color:${tc};font-family:'Russo One',sans-serif;font-size:10px;">${tier}</span></div>`;
      }).join('');
      const picks=side.picks.slice(0,2).map(pk=>`<div style="font-size:11px;color:var(--pick);">${pk}</div>`).join('');
      return `<div style="flex:1;min-width:120px;">
        <div style="font-family:Oswald,sans-serif;font-size:11px;font-weight:600;color:var(--text);margin-bottom:4px;">${side.name} <span style="color:${col};font-size:10px;">${netWord}</span></div>
        ${players}${picks}
      </div>`;
    };
    return `<div class="trade-grade-row">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
        <div style="font-family:Oswald,sans-serif;font-size:11px;color:var(--text3);">${t.season||''} ${ds?'· '+ds:''}</div>
        <span class="trade-grade-badge ${t.gradeCls}">${t.winner} won by ${t.margin.toFixed(0)} pts</span>
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        ${sideHtml(s1,t.s1net)}
        <div style="font-family:'Russo One',sans-serif;font-size:16px;color:var(--text3);padding-top:12px;">↔</div>
        ${sideHtml(s2,-t.s1net)}
      </div>
    </div>`;
  }

  // Bar charts
  function barChart(obj,color){
    const entries=Object.entries(obj).sort((a,b)=>b[1]-a[1]);
    if(!entries.length) return '<div class="no-data">No data</div>';
    const max=entries[0][1]||1;
    return `<div class="bar-chart">${entries.map(([name,val])=>`
      <div class="bar-row">
        <div class="bar-label" title="${name}">${name.split(' ')[0]}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.round((val/max)*100)}%;background:${color};"></div></div>
        <div class="bar-val">${val}</div>
      </div>`).join('')}</div>`;
  }

  // Build trade lookup by player name for dropdown
  const tradesByPlayer={};
  trades.forEach(t=>{
    t.sides.forEach(s=>{
      s.players.forEach(p=>{
        if(!tradesByPlayer[p.name]) tradesByPlayer[p.name]=[];
        tradesByPlayer[p.name].push(t);
      });
    });
  });

  const topHtml=topTraded.map((p,i)=>{
    // Sort trades chronologically
    const ptrades=(tradesByPlayer[p.name]||[]).sort((a,b)=>(a.ts||0)-(b.ts||0));

    const timelineRows=ptrades.map((t,ti)=>{
      const[s1,s2]=t.sides;if(!s1||!s2)return'';
      // Sleeper's `adds` maps player → the team that RECEIVED them,
      // so side.players = what that team received.
      // If the player is in s1's list, s1 received them (s2 sent them).
      const playerInS1=s1.players.some(pl=>pl.name===p.name);
      const sender  = playerInS1 ? s2 : s1;
      const receiver= playerInS1 ? s1 : s2;
      const ds=t.ts?new Date(t.ts).toLocaleDateString('en-US',{month:'short',year:'numeric'}):'';
      return '<div style="display:grid;grid-template-columns:1fr 48px 1fr;align-items:center;gap:6px;padding:8px 12px;'+(ti>0?'border-top:1px solid var(--border);':'')+'background:'+(ti%2===0?'var(--bg3)':'var(--panel)')+';">'
        // SENDER left
        +'<div style="text-align:right;">'
        +'<div style="font-family:Oswald,sans-serif;font-size:12px;font-weight:600;color:var(--rt);">'+sender.name.split(' ')[0]+'</div>'
        +'</div>'
        // CENTER arrow + date
        +'<div style="text-align:center;">'
        +'<div style="font-size:18px;color:var(--accent);line-height:1;">→</div>'
        +'<div style="font-family:Oswald,sans-serif;font-size:9px;color:var(--text3);letter-spacing:0.06em;">'+ds+'</div>'
        +'</div>'
        // RECEIVER right
        +'<div style="text-align:left;">'
        +'<div style="font-family:Oswald,sans-serif;font-size:12px;font-weight:600;color:var(--gt);">'+receiver.name.split(' ')[0]+'</div>'
        +'</div>'
        +'</div>';
    }).join('');

    return '<div class="traded-player-row" style="flex-direction:column;align-items:stretch;">'
      // Header row - always visible
      +'<div style="display:flex;align-items:center;justify-content:space-between;width:100%;cursor:pointer;padding:2px 0;" onclick="var d=this.nextElementSibling;var a=this.querySelector(\'.tdarr\');if(d.style.display===\'none\'){d.style.display=\'block\';a.textContent=\'▲\';}else{d.style.display=\'none\';a.textContent=\'▼\';}">'
      +'<div style="display:flex;align-items:center;gap:12px;">'
      +'<div class="traded-count">#'+(i+1)+'</div>'
      +'<div><div style="font-family:Oswald,sans-serif;font-size:13px;font-weight:600;color:var(--text);">'+p.name+'</div>'
      +'<div style="font-family:Oswald,sans-serif;font-size:10px;color:var(--text3);">'+p.count+' trade'+(p.count!==1?'s':'')+'</div></div>'
      +'</div>'
      +'<div style="display:flex;align-items:center;gap:8px;">'
      +'<div style="font-family:\'Russo One\',sans-serif;font-size:14px;color:var(--accent);">'+p.count+'×</div>'
      +'<div class="tdarr" style="font-family:Oswald,sans-serif;font-size:11px;color:var(--accent);">▼</div>'
      +'</div>'
      +'</div>'
      // Dropdown
      +'<div style="display:none;margin-top:6px;border-radius:var(--r8);overflow:hidden;border:1px solid var(--border);">'
      +'<div style="display:grid;grid-template-columns:1fr 48px 1fr;padding:5px 12px;background:var(--bg2);border-bottom:1px solid var(--border);">'
      +'<div style="text-align:right;font-family:Oswald,sans-serif;font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:var(--text3);">Sender</div>'
      +'<div></div>'
      +'<div style="text-align:left;font-family:Oswald,sans-serif;font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:var(--text3);">Receiver</div>'
      +'</div>'
      +(timelineRows||'<div style="padding:8px 12px;font-size:11px;color:var(--text3);">No trade details found</div>')
      +'</div>'
      +'</div>';
  }).join('');

  window._tradeCache={};
  const tradeHtml=trades.slice(0,40).map((t,ti)=>{
    const[s1,s2]=t.sides;if(!s1||!s2)return'';
    window._tradeCache['tc'+ti]={s1:{name:s1.name,players:[...s1.players],picks:[...s1.picks]},s2:{name:s2.name,players:[...s2.players],picks:[...s2.picks]}};
    const sideHtml=(side)=>{
      const items=[...side.players.map(p=>{const m=NM_EXACT[p.name.toLowerCase()]||NM_NORM[normName(p.name)];const pos=m&&m.pos?m.pos:'WR';return '<div class="trade-item"><span class="pb2 pos-'+pos+'">'+pos+'</span>'+p.name+'</div>';}),
        ...side.picks.map(pk=>'<div class="trade-item"><span class="pb2 pos-PICK">PICK</span>'+pk+'</div>')].join('');
      return '<div class="trade-side-box"><div class="trade-side-lbl">'+side.name+'</div>'+(items||'<div style="font-size:11px;color:var(--text3);">No assets</div>')+'</div>';
    };
    const ds=t.ts?new Date(t.ts).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'';
    return '<div class="trade-card">'
      +'<div class="trade-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;">'
      +'<div><div style="font-family:Oswald,sans-serif;font-size:12px;font-weight:600;color:var(--text);">'+s1.name+' ↔ '+s2.name+'</div>'
      +'<div class="trade-date">'+(t.season||'')+(ds?' · '+ds:'')+'</div></div>'
      +'<button onclick="analyzeTradeByKey(&quot;tc'+ti+'&quot;)" style="font-family:Oswald,sans-serif;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;padding:5px 12px;background:var(--accent);color:var(--bg2);border:none;border-radius:var(--r6);cursor:pointer;white-space:nowrap;flex-shrink:0;">Analyze →</button>'
      +'</div>'
      +'<div class="trade-sides-row">'+sideHtml(s1)+'<div class="trade-vs">↔</div>'+sideHtml(s2)+'</div>'
      +'</div>';
  }).join('');

  el.innerHTML=`
    <!-- ACTIVITY CHARTS -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px;">
      <div class="hist-section" style="margin-bottom:0;"><div class="hist-section-title">🔄 Trades Per Team</div>${barChart(teamTrades||{},'var(--accent)')}</div>
      <div class="hist-section" style="margin-bottom:0;"><div class="hist-section-title">📋 Waivers Per Team</div>${barChart(teamWaivers||{},'var(--qb)')}</div>
    </div>

    <!-- MOST TRADED -->
    <div class="hist-section"><div class="hist-section-title">Most Traded Players</div>${topHtml||'<div class="no-data">No data</div>'}</div>

    <!-- FULL LOG -->
    <div class="hist-section"><div class="hist-section-title">Trade Log (${trades.length} total)</div>${tradeHtml||'<div class="no-data">No trades found</div>'}</div>`;
}

const NM_EXACT={},NM_NORM={};
DATA.forEach(d=>{
  if(d.type!=='player') return;
  NM_EXACT[d.name.toLowerCase()]=d;
  NM_NORM[normName(d.name)]=d;
});

// ── PREFETCH SLEEPER PLAYER IDs on startup ────────────────────────────────
// Fetches the Sleeper NFL players list in the background so avatar photos
// are ready immediately when the rankings table renders, without waiting
// for a full league load.
(async function prefetchSleeperPIDs(){
  // Only fetch if SLEEPER_PID is still empty (not already populated by league load)
  if(Object.keys(SLEEPER_PID).length>0) return;
  try{
    const res=await fetch('https://api.sleeper.app/v1/players/nfl');
    if(!res.ok) return;
    const players=await res.json();
    Object.entries(players).forEach(([pid,p])=>{
      if(!p.first_name&&!p.last_name) return;
      const key=normName(`${p.first_name||''} ${p.last_name||''}`);
      if(key) SLEEPER_PID[key]=pid;
    });
    // Re-render the table so images populate now that IDs are loaded
    renderTable();
  }catch(e){}
})();
