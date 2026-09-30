const cfg = window.NPL_CONFIG || {};
const sbReady = cfg.SUPABASE_URL && !cfg.SUPABASE_URL.includes("YOUR_") &&
               cfg.SUPABASE_PUBLISHABLE_KEY && !cfg.SUPABASE_PUBLISHABLE_KEY.includes("YOUR_");
const supabase = sbReady ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY) : null;

const $ = id => document.getElementById(id);
const toast = msg => { $("toast").textContent = msg; $("toast").style.display="block"; setTimeout(()=> $("toast").style.display="none",2500); };
let currentUser = null;
let realtimeChannel = null;

function setAuthMsg(m){ $("authMsg").textContent=m; }
function setCreateMsg(m){ $("createMsg").textContent=m; }

async function boot(){
  if(!supabase){
    setAuthMsg("Demo mode: add Supabase URL + publishable key in public/config.js.");
    $("home").classList.add("hidden"); $("auth").classList.remove("hidden"); return;
  }
  const {data:{session}} = await supabase.auth.getSession();
  await onSession(session);
  supabase.auth.onAuthStateChange(async (_event, session)=> await onSession(session));
}

async function onSession(session){
  currentUser = session?.user || null;
  $("userLine").textContent = currentUser ? (currentUser.email || currentUser.phone || "Signed in") : "Not signed in";
  if(currentUser){
    $("auth").classList.add("hidden"); $("home").classList.remove("hidden");
    await loadProfile(); await loadTournaments(); subscribeRealtime();
  }else{
    $("auth").classList.remove("hidden"); $("home").classList.add("hidden");
  }
}

$("loginBtn").onclick = async()=>{
  if(!supabase) return setAuthMsg("Add Supabase config first.");
  const {error}=await supabase.auth.signInWithPassword({email:$("email").value,password:$("password").value});
  setAuthMsg(error ? error.message : "Logged in.");
};
$("signupBtn").onclick = async()=>{
  if(!supabase) return setAuthMsg("Add Supabase config first.");
  const {error}=await supabase.auth.signUp({email:$("email").value,password:$("password").value});
  setAuthMsg(error ? error.message : "Account created. Check email if confirmation is enabled.");
};
$("googleBtn").onclick = async()=>{
  if(!supabase) return setAuthMsg("Add Supabase config first.");
  const {error}=await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo:location.origin+location.pathname}});
  if(error) setAuthMsg(error.message);
};
$("otpBtn").onclick = async()=>{
  if(!supabase) return setAuthMsg("Add Supabase config first.");
  const phone=$("phone").value.trim();
  const {error}=await supabase.auth.signInWithOtp({phone});
  setAuthMsg(error ? error.message : "OTP sent. Complete the OTP flow in your configured provider.");
};

async function loadProfile(){
  const {data,error}=await supabase.from("profiles").select("points_balance").eq("id",currentUser.id).maybeSingle();
  if(!error) $("points").textContent = data?.points_balance ?? 0;
}

async function loadTournaments(){
  const {data,error}=await supabase.from("tournaments").select("*").eq("status","open").order("starts_at",{ascending:true}).limit(30);
  if(error){ toast(error.message); return; }
  $("tournaments").innerHTML = (data||[]).map(t=>`
    <article class="tour">
      <h3>${escapeHtml(t.name)}</h3>
      <span class="tag">${escapeHtml(t.mode)}</span>
      <span class="tag">${t.entry_points} pts</span>
      <div class="muted">${t.current_slots}/${t.max_slots} slots</div>
      <button class="join" onclick="joinTournament('${t.id}')">JOIN</button>
    </article>`).join("") || '<div class="muted">No open tournaments yet.</div>';
}
window.joinTournament = async(id)=>{
  if(!supabase || !currentUser) return;
  const {data,error}=await supabase.rpc("join_tournament",{p_tournament_id:id});
  if(error){ toast(error.message); return; }
  toast(data?.message || "Joined!");
  await loadProfile(); await loadTournaments();
};

$("createBtn").onclick = async()=>{
  if(!supabase || !currentUser) return;
  const payload={
    name:$("tName").value.trim(),
    mode:$("tMode").value,
    entry_points:Number($("tEntry").value||0),
    prize_points:Number($("tPrize").value||0),
    max_slots:Number($("tSlots").value||2),
    status:"open"
  };
  if(!payload.name || payload.max_slots<2) return setCreateMsg("Enter a name and at least 2 slots.");
  const {error}=await supabase.from("tournaments").insert({owner_id:currentUser.id,...payload});
  setCreateMsg(error ? error.message : "Tournament created.");
  if(!error){ $("tName").value=""; $("tEntry").value=""; $("tPrize").value=""; $("tSlots").value=""; await loadTournaments(); }
};

function subscribeRealtime(){
  if(realtimeChannel) supabase.removeChannel(realtimeChannel);
  realtimeChannel=supabase.channel("npl-live")
    .on("postgres_changes",{event:"*",schema:"public",table:"tournaments"},()=>loadTournaments())
    .on("postgres_changes",{event:"*",schema:"public",table:"profiles",filter:`id=eq.${currentUser.id}`},()=>loadProfile())
    .subscribe();
}
$("refreshBtn").onclick=async()=>{await loadTournaments();await loadProfile();toast("Updated");};

$("chatSend").onclick=sendChat;
$("chatInput").addEventListener("keydown",e=>{if(e.key==="Enter")sendChat()});
async function sendChat(){
  const q=$("chatInput").value.trim(); if(!q) return;
  addBubble(q,true); $("chatInput").value="";
  if(!supabase) return addBubble("Supabase connect करो, फिर AI Assistant backend से reply देगा.",false);
  const {data,error}=await supabase.functions.invoke("ai-chat",{body:{message:q}});
  addBubble(error ? error.message : (data?.reply || "No response"),false);
}
function addBubble(text,me){const d=document.createElement("div");d.className="bubble"+(me?" me":"");d.textContent=text;$("chat").appendChild(d);$("chat").scrollTop=$("chat").scrollHeight}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]))}

$("settingsBtn").onclick=()=>toast("Settings module is ready for the next phase.");
$("buyPointsBtn").onclick=()=>toast("Payment adapter will be connected only after official provider verification.");
$("tournamentsNav").onclick=()=>window.scrollTo({top:0,behavior:"smooth"});
$("walletNav").onclick=()=>toast("Wallet: points ledger is backend-controlled.");
$("profileNav").onclick=()=>toast("Profile: Auth is connected.");

boot();
