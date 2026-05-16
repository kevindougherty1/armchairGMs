// Expand mini data to full format
const PC={QB:'var(--qb)',WR:'var(--wr)',RB:'var(--rb)',TE:'var(--te)',PICK:'var(--pick)'};
function pickColor(rd){return rd===1?'#9b8abf':rd===2?'#7b9ec9':rd===3?'#c9a84c':'#c97b7b';}
const BC={QB:'#8aafe0',WR:'#7ec898',RB:'#e09090',TE:'#c8a870',PICK:'#b0a0d8'};
const POS_COLORS=PC;
const BAR_COLORS=BC;
const DATA=RAW.map(d=>({rank:d.r,name:d.n,pos:d.p,team:d.t,age:d.a,score:d.s,hardcoded:d.h,type:d.T,year:d.y,round:d.ro,slot:d.sl}));

// Name lookup maps
let CU=null;

// ── SUPABASE AUTH ─────────────────────────────────────────────────────────
const SB_URL='https://gmxxwhghtngjmdcqkvov.supabase.co';
const SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdteHh3aGdodG5qZ21kY3Frdm92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4Njk2NzQsImV4cCI6MjA5NDQ0NTY3NH0.K6RmSIcWZkgccwuRAKbaCGrbFpHxmiv1g7JLH47Ur0I';

async function sbFetch(path, opts={}){
  const res=await fetch(`${SB_URL}${path}`,{
    ...opts,
    headers:{'Content-Type':'application/json','apikey':SB_KEY,'Authorization':`Bearer ${SB_KEY}`,...(opts.headers||{})}
  });
  let data={};
  try{data=await res.json();}catch(e){}
  return{ok:res.ok,status:res.status,data};
}

async function sbSignup(email,password){
  return sbFetch('/auth/v1/signup',{method:'POST',body:JSON.stringify({email,password})});
}
async function sbSignin(email,password){
  return sbFetch('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});
}
async function sbSignout(token){
  return sbFetch('/auth/v1/logout',{method:'POST',headers:{'Authorization':`Bearer ${token}`}});
}
async function sbGetProfile(token){
  return sbFetch('/rest/v1/profiles?select=*',{headers:{'Authorization':`Bearer ${token}`,'Prefer':'return=representation'}});
}
async function sbUpsertProfile(token,uid,data){
  return sbFetch('/rest/v1/profiles',{
    method:'POST',
    headers:{'Authorization':`Bearer ${token}`,'Prefer':'resolution=merge-duplicates,return=representation'},
    body:JSON.stringify({id:uid,...data})
  });
}

// Session persistence
function sSess(u){try{localStorage.setItem('agm_s',JSON.stringify(u))}catch(e){}}
function lSess(){try{return JSON.parse(localStorage.getItem('agm_s')||'null')}catch(e){return null}}
function clSess(){try{localStorage.removeItem('agm_s')}catch(e){}}

function swAuth(m,btn){
  document.querySelectorAll('.a-tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('lf').style.display=m==='login'?'block':'none';
  document.getElementById('sf').style.display=m==='signup'?'block':'none';
  document.getElementById('a-err').style.display='none';
  document.getElementById('a-ok').style.display='none';
  const hed=document.getElementById('a-hed-txt');
  const sub=document.getElementById('a-sub-txt');
  if(m==='login'){hed.textContent='Welcome Back';sub.textContent='Sign in to sync your league from any device';}
  else{hed.textContent='Create Account';sub.textContent='Your league syncs across all your devices';}
}
function aerr(msg){const e=document.getElementById('a-err');e.textContent=msg;e.style.display='block';document.getElementById('a-ok').style.display='none';}
function aok(msg){const e=document.getElementById('a-ok');e.textContent=msg;e.style.display='block';document.getElementById('a-err').style.display='none';}
function setAuthLoading(loading){
  ['login-btn','signup-btn'].forEach(id=>{const b=document.getElementById(id);if(b){b.disabled=loading;b.style.opacity=loading?'0.6':'1';}});
}

async function doSignup(){
  const em=document.getElementById('se').value.trim();
  const pw=document.getElementById('sp').value;
  const lid=document.getElementById('sl').value.trim();
  if(!em||!pw) return aerr('Email and password are required.');
  if(!em.includes('@')) return aerr('Enter a valid email address.');
  if(pw.length<6) return aerr('Password must be at least 6 characters.');
  setAuthLoading(true);
  try{
    const r=await sbSignup(em,pw);
    if(!r.ok){
      const msg=r.data?.msg||r.data?.message||r.data?.error_description||'Signup failed.';
      return aerr(msg.includes('already registered')?'An account with that email already exists. Sign in instead.':msg);
    }
    // Supabase returns session on signup
    const token=r.data?.access_token;
    const uid=r.data?.user?.id||r.data?.id;
    if(token&&uid){
      await sbUpsertProfile(token,uid,{email:em,league_id:lid,scoring:SCORING||'SF'});
      const u={em,lid,token,uid};
      sSess(u);
      aok('Account created! Welcome to Armchair GMs.');
      setTimeout(()=>launch(u),600);
    } else {
      // Email confirmation required
      aok('Check your email to confirm your account, then sign in.');
    }
  }catch(e){aerr('Network error. Check your connection.');}
  finally{setAuthLoading(false);}
}

async function doLogin(){
  const em=document.getElementById('le').value.trim();
  const pw=document.getElementById('lp').value;
  if(!em||!pw) return aerr('Enter your email and password.');
  setAuthLoading(true);
  try{
    const r=await sbSignin(em,pw);
    if(!r.ok){
      const msg=r.data?.error_description||r.data?.msg||r.data?.message||'Login failed.';
      return aerr(msg.includes('Invalid')||msg.includes('invalid')?'Incorrect email or password.':msg);
    }
    const token=r.data?.access_token;
    const uid=r.data?.user?.id;
    // Load profile to get saved league_id
    let lid='';
    try{
      const pr=await sbGetProfile(token);
      if(pr.ok&&pr.data?.length) lid=pr.data[0].league_id||'';
    }catch(e){}
    const u={em,lid,token,uid};
    sSess(u);
    launch(u);
  }catch(e){aerr('Network error. Check your connection.');}
  finally{setAuthLoading(false);}
}

function doGuest(){launch({em:'Guest',lid:''});}

async function doForgotPassword(){
  const em=document.getElementById('le').value.trim();
  if(!em) return aerr('Enter your email address first.');
  setAuthLoading(true);
  try{
    const r=await sbFetch('/auth/v1/recover',{method:'POST',body:JSON.stringify({email:em})});
    aok('If that email has an account, a reset link is on its way. Check your inbox.');
  }catch(e){aerr('Network error. Check your connection.');}
  finally{setAuthLoading(false);}
}

async function doLogout(){
  const s=lSess();
  if(s?.token){try{await sbSignout(s.token);}catch(e){}}
  clSess();CU=null;
  document.getElementById('app').style.display='none';
  document.getElementById('landing').style.display='grid';
}

// Save profile back to Supabase when league ID changes
async function saveProfile(){
  if(!CU?.token||!CU?.uid) return;
  const lid=CU.lid||document.getElementById('lid')?.value?.trim()||'';
  try{await sbUpsertProfile(CU.token,CU.uid,{email:CU.em,league_id:lid,scoring:SCORING||'SF'});}catch(e){}
  sSess(CU);
}

function launch(u){
  CU=u;
  initTheme();
  document.getElementById('landing').style.display='none';
  document.getElementById('app').style.display='block';
  document.getElementById('nu').textContent=u.em;
  try{renderTable();}catch(e){console.error('renderTable error:',e);}
  try{renderTA();}catch(e){console.error('renderTA error:',e);}
  // Auto-select the #1 ranked player on load
  try{const top=DATA.find(d=>d.rank===1);if(top){SEL=top;renderCard();}}catch(e){}
  // Auto-save a daily snapshot if none exists or last one is >23hrs old
  try{
    const existing=JSON.parse(localStorage.getItem(MOVERS_LS)||'null');
    const age=existing?Date.now()-existing.ts:Infinity;
    if(age>23*60*60*1000) saveMoversSnapshot();
  }catch(e){}
  // Initialize multi-league state from local storage, then merge from remote.
  loadLeaguesLocal();
  renderLeagueDropdown();
  loadLeaguesRemote().then(()=>{renderLeagueDropdown();
    // Decide which league to auto-load: explicit session lid > stored default > first saved
    const auto=(u.lid&&u.lid.trim())||DEFAULT_LID||LEAGUES[0]?.id||'';
    if(auto){
      document.getElementById('lid').value=auto;
      showPg('rankings',document.querySelectorAll('.nt')[0]);
      loadLeague();
    }
  });
}
window.addEventListener('DOMContentLoaded',()=>{
  const params=new URLSearchParams(window.location.hash.slice(1));
  if(params.get('type')==='recovery'){
    const token=params.get('access_token');
    if(token){
      window.__resetToken=token;
      const o=document.getElementById('reset-overlay');
      o.style.display='grid';
      o.style.setProperty('display','grid');
      return;
    }
  }
  const s=lSess();if(s)launch(s);
});

async function doResetPassword(){
  const pw=document.getElementById('reset-pw').value;
  const pw2=document.getElementById('reset-pw2').value;
  const rerr=(msg)=>{const e=document.getElementById('reset-err');e.textContent=msg;e.style.display='block';document.getElementById('reset-ok').style.display='none';};
  const rok=(msg)=>{const e=document.getElementById('reset-ok');e.textContent=msg;e.style.display='block';document.getElementById('reset-err').style.display='none';};
  if(!pw) return rerr('Enter a new password.');
  if(pw.length<6) return rerr('Password must be at least 6 characters.');
  if(pw!==pw2) return rerr('Passwords do not match.');
  const token=window.__resetToken;
  if(!token) return rerr('Invalid reset link. Please request a new one.');
  const btn=document.getElementById('reset-btn');
  btn.disabled=true;btn.style.opacity='0.6';
  try{
    const r=await sbFetch('/auth/v1/user',{method:'PUT',headers:{'Authorization':`Bearer ${token}`},body:JSON.stringify({password:pw})});
    if(r.ok){
      rok('Password updated! Redirecting to sign in...');
      setTimeout(()=>{
        document.getElementById('reset-overlay').style.display='none';
        document.getElementById('landing').style.display='grid';
        history.replaceState(null,'',window.location.pathname);
      },1500);
    }else{
      rerr(r.data?.message||'Failed to update password. Try requesting a new link.');
    }
  }catch(e){rerr('Network error. Check your connection.');}
  finally{btn.disabled=false;btn.style.opacity='1';}
}

