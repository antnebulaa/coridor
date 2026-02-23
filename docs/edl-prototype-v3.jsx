import { useState, useRef, useEffect } from "react";

// ─── TOKENS ───
const C = {
  bg: "#0A0A0A", card: "#141414", card2: "#1C1C1C", border: "#2A2A2A",
  text: "#F5F5F5", text2: "#9CA3AF", text3: "#6B7280",
  accent: "#FFFFFF",
  green: "#34D399", blue: "#60A5FA", yellow: "#FBBF24", orange: "#FB923C", red: "#EF4444",
};

const CONDS = [
  { key: "NEW", label: "Neuf", color: C.green },
  { key: "GOOD", label: "Bon", color: C.blue },
  { key: "WEAR", label: "Usure norm.", color: C.yellow },
  { key: "BAD", label: "Dégradé", color: C.orange },
  { key: "DEAD", label: "H.S.", color: C.red },
];
const condOf = (k) => CONDS.find(c => c.key === k);

const DEGTYPES = ["Tache","Rayure","Trou","Fissure","Moisissure","Écaillé","Cassé","Jauni","Décollé","Manquant"];

const ROOMS = [
  { id:"r1", name:"Entrée", type:"ENTRY", icon:"🚪" },
  { id:"r2", name:"Séjour", type:"LIVING", icon:"🛋️" },
  { id:"r3", name:"Cuisine", type:"KITCHEN", icon:"🍳" },
  { id:"r4", name:"Chambre", type:"BEDROOM", icon:"🛏️" },
  { id:"r5", name:"Salle de bain", type:"BATH", icon:"🚿" },
  { id:"r6", name:"WC", type:"WC", icon:"🚽" },
];

const SURFS = ["Sols","Murs","Plafond"];

const EQUIPS = {
  ENTRY:["Porte d'entrée","Interphone","Prises","Interrupteurs"],
  LIVING:["Fenêtre(s)","Volets","Radiateur","Prises","Interrupteurs"],
  KITCHEN:["Évier","Robinet","Plaques","Hotte","Placards","VMC"],
  BEDROOM:["Fenêtre(s)","Volets","Radiateur","Placard","Prises"],
  BATH:["Douche/Baignoire","Lavabo","Robinet","VMC","Joints","Miroir"],
  WC:["Cuvette","Chasse d'eau","Lave-mains"],
};

// ─── PHONE ───
function Phone({ children }) {
  return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"center", minHeight:"100vh", background:"#000", fontFamily:"'DM Sans',system-ui,sans-serif" }}>
      <div style={{ width:375, height:812, background:C.bg, borderRadius:44, overflow:"hidden", position:"relative", boxShadow:"0 0 0 1px rgba(255,255,255,0.04),0 30px 80px rgba(0,0,0,0.6)" }}>
        <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:126, height:32, background:"#000", borderRadius:"0 0 18px 18px", zIndex:200 }} />
        <div style={{ height:"100%", display:"flex", flexDirection:"column", overflow:"hidden" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── SHARED ───
function TopBar({ title, sub, onBack, right }) {
  return (
    <div style={{ padding:"48px 20px 12px", background:C.bg, borderBottom:`1px solid ${C.border}`, flexShrink:0, zIndex:50 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        {onBack && <button onClick={onBack} style={{ background:"none", border:"none", color:C.text, fontSize:22, cursor:"pointer", padding:0, lineHeight:1 }}>‹</button>}
        <div style={{ flex:1 }}>
          <div style={{ color:C.text, fontSize:21, fontWeight:700, letterSpacing:-0.4 }}>{title}</div>
          {sub && <div style={{ color:C.text2, fontSize:12, marginTop:2 }}>{sub}</div>}
        </div>
        {right}
      </div>
    </div>
  );
}

function Btn({ children, onClick, disabled, color=C.accent, textColor="#fff" }) {
  return (
    <div style={{ padding:"12px 20px 36px", borderTop:`1px solid ${C.border}`, flexShrink:0, background:C.bg }}>
      <button onClick={disabled?undefined:onClick} style={{
        width:"100%", padding:16, borderRadius:14, fontFamily:"inherit", letterSpacing:-0.2,
        background:disabled?C.card2:color, color:disabled?C.text3:textColor,
        fontSize:16, fontWeight:700, border:disabled?`1px solid ${C.border}`:"none",
        cursor:disabled?"default":"pointer", opacity:disabled?0.6:1, transition:"all 0.15s",
      }}>{children}</button>
    </div>
  );
}

function AIBubble({ children }) {
  return (
    <div style={{ display:"flex", gap:10, padding:14, background:`${C.accent}0C`, border:`1px solid ${C.accent}22`, borderRadius:14, marginBottom:16 }}>
      <div style={{ width:28, height:28, borderRadius:10, background:`${C.accent}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>💡</div>
      <div style={{ fontSize:13, color:C.text2, lineHeight:1.55 }}>{children}</div>
    </div>
  );
}

// Camera-style screen (reusable)
function CameraScreen({ label, instruction, onShoot, accentColor=C.accent }) {
  return (
    <div style={{ flex:1, background:"linear-gradient(180deg,#1a1a2e,#0d1b2a)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", position:"relative" }}>
      <div style={{ position:"absolute", top:0,left:0,right:0,bottom:0, opacity:0.04, pointerEvents:"none", background:"repeating-linear-gradient(0deg,transparent,transparent 50px,rgba(255,255,255,0.05) 50px,rgba(255,255,255,0.05) 51px)" }} />
      <div style={{ padding:"0 30px", textAlign:"center", marginBottom:32, pointerEvents:"none" }}>
        <div style={{ fontSize:17, fontWeight:700, color:C.text, marginBottom:6 }}>{label}</div>
        <div style={{ fontSize:13, color:C.text2, lineHeight:1.5 }}>{instruction}</div>
      </div>
      <div style={{ width:200, height:150, border:`2px solid ${accentColor}35`, borderRadius:16, pointerEvents:"none", position:"relative" }}>
        {[["top:-8px;left:-8px","Top","Left"],["top:-8px;right:-8px","Top","Right"],["bottom:-8px;left:-8px","Bottom","Left"],["bottom:-8px;right:-8px","Bottom","Right"]].map(([_,v,h],i) => (
          <div key={i} style={{ position:"absolute", [v.toLowerCase()]:-8, [h.toLowerCase()]:-8, width:20, height:20, [`border${v}`]:`2px solid ${accentColor}`, [`border${h}`]:`2px solid ${accentColor}`, borderRadius: i===0?"4px 0 0 0":i===1?"0 4px 0 0":i===2?"0 0 0 4px":"0 0 4px 0" }} />
        ))}
      </div>
      <button onClick={onShoot} style={{
        marginTop:40, width:72, height:72, borderRadius:"50%", background:"white",
        border:`4px solid ${accentColor}`, cursor:"pointer", boxShadow:`0 0 40px ${accentColor}25`,
        position:"relative", zIndex:10,
      }} />
    </div>
  );
}

// ─── SCREEN: HOME ───
function Home({ go }) {
  return (
    <>
      <TopBar title="État des lieux" sub="12 rue des Lilas, 75011 Paris" />
      <div style={{ flex:1, overflow:"auto", padding:20 }}>
        <div style={{ background:`linear-gradient(145deg,${C.accent}14,${C.accent}06)`, border:`1px solid ${C.accent}28`, borderRadius:20, padding:24, marginBottom:20, position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute",top:-20,right:-20,width:100,height:100,borderRadius:"50%",background:`${C.accent}08` }} />
          <div style={{ fontSize:11,color:C.accent,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,marginBottom:10 }}>Nouvel état des lieux</div>
          <div style={{ fontSize:26,fontWeight:800,color:C.text,lineHeight:1.2,marginBottom:6,letterSpacing:-0.5 }}>EDL d'entrée</div>
          <div style={{ fontSize:14,color:C.text2,lineHeight:1.5 }}>Bail COR-2026-0847<br/>Locataire : <span style={{color:C.text}}>Marie Dupont</span></div>
        </div>
        <div style={{ background:C.card,borderRadius:14,overflow:"hidden",marginBottom:16 }}>
          {[["Date","20 février 2026"],["Bailleur","Adrien L."],["Type","Non meublé"],["Pièces","6 pièces (T3)"]].map(([k,v],i,a)=>(
            <div key={k} style={{ padding:"13px 16px",borderBottom:i<a.length-1?`1px solid ${C.border}`:"none",display:"flex",justifyContent:"space-between" }}>
              <span style={{color:C.text3,fontSize:13}}>{k}</span>
              <span style={{color:C.text,fontSize:13,fontWeight:600}}>{v}</span>
            </div>
          ))}
        </div>
        <AIBubble>Assurez-vous que <span style={{color:C.accent}}>l'électricité fonctionne</span> et que le logement est <span style={{color:C.accent}}>vide de meubles personnels</span>. Prévoyez 15-20 min.</AIBubble>
      </div>
      <Btn onClick={()=>go("mElecNum")}>Commencer l'inspection →</Btn>
    </>
  );
}

// ─── WIZARD INPUT (full-page single field) ───
function WizInput({ title, icon, label, hint, type="text", onNext, onBack, step, total }) {
  const [v,setV]=useState("");
  const ref=useRef(null);
  useEffect(()=>{setTimeout(()=>ref.current?.focus(),300)},[]);
  return (
    <>
      <TopBar title={title} onBack={onBack} right={<span style={{color:C.text3,fontSize:12}}>{step}/{total}</span>} />
      <div style={{ flex:1,display:"flex",flexDirection:"column",padding:20 }}>
        <div style={{ flex:1,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center" }}>
          <div style={{fontSize:48,marginBottom:16}}>{icon}</div>
          <div style={{fontSize:20,fontWeight:700,color:C.text,textAlign:"center",marginBottom:8,letterSpacing:-0.3}}>{label}</div>
          <div style={{fontSize:13,color:C.text3,marginBottom:28}}>{hint}</div>
          <input ref={ref} inputMode={type==="number"?"numeric":"text"} value={v} onChange={e=>setV(e.target.value)}
            style={{ width:"100%",maxWidth:280,padding:"16px 20px",borderRadius:14,background:C.card,
              border:`2px solid ${v?C.accent:C.border}`,color:C.text,fontSize:24,fontWeight:700,
              textAlign:"center",fontFamily:"'DM Sans',monospace",outline:"none",letterSpacing:2,transition:"border 0.2s" }}
            placeholder="—" />
        </div>
      </div>
      <Btn onClick={()=>onNext(v)} disabled={!v.trim()}>Suivant →</Btn>
    </>
  );
}

// ─── WIZARD PHOTO (full-page camera) ───
function WizPhoto({ title, label, instruction, onNext, onBack, step, total }) {
  const [taken,setTaken]=useState(false);
  return (
    <>
      <TopBar title={title} onBack={onBack} right={<span style={{color:C.text3,fontSize:12}}>{step}/{total}</span>} />
      {!taken
        ? <CameraScreen label={`📸 ${label}`} instruction={instruction} onShoot={()=>setTaken(true)} />
        : <div style={{ flex:1,background:C.card,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20 }}>
            <div style={{width:100,height:100,borderRadius:20,background:`${C.green}12`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:16}}><span style={{fontSize:44}}>✅</span></div>
            <div style={{fontSize:18,fontWeight:700,color:C.text,marginBottom:4}}>Photo enregistrée</div>
            <div style={{fontSize:13,color:C.text2,marginBottom:20}}>{label}</div>
            <button onClick={()=>setTaken(false)} style={{padding:"8px 20px",borderRadius:10,background:C.card2,border:`1px solid ${C.border}`,color:C.text2,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>↺ Reprendre</button>
          </div>
      }
      {taken && <Btn onClick={onNext}>Suivant →</Btn>}
    </>
  );
}

// ─── METER SUMMARY ───
function MeterSum({ onNext, onBack }) {
  return (
    <>
      <TopBar title="Compteurs" sub="Résumé" onBack={onBack} />
      <div style={{ flex:1,overflow:"auto",padding:20 }}>
        {[{icon:"⚡",label:"Électricité",num:"PDL-4928103",idx:"12 456 kWh"},{icon:"💧",label:"Eau",num:"CF-991847",idx:"847 m³"}].map((m,i)=>(
          <div key={i} style={{background:C.card,borderRadius:14,padding:16,marginBottom:12,borderLeft:`3px solid ${C.accent}`}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <span style={{fontSize:22}}>{m.icon}</span>
              <span style={{fontSize:16,fontWeight:700,color:C.text}}>{m.label}</span>
              <span style={{marginLeft:"auto",fontSize:12,color:C.green,fontWeight:600}}>✓ Complet</span>
            </div>
            <div style={{display:"flex",gap:16,fontSize:13}}>
              <div><span style={{color:C.text3}}>N° </span><span style={{color:C.text}}>{m.num}</span></div>
              <div><span style={{color:C.text3}}>Index </span><span style={{color:C.accent,fontWeight:700}}>{m.idx}</span></div>
            </div>
          </div>
        ))}
        <div style={{background:C.card,borderRadius:14,padding:16,display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:22}}>🔥</span><span style={{fontSize:14,color:C.text}}>Gaz</span>
          <span style={{marginLeft:"auto",fontSize:12,color:C.text3,background:C.card2,padding:"4px 10px",borderRadius:8}}>Pas de compteur</span>
        </div>
      </div>
      <Btn onClick={onNext}>Passer aux clés →</Btn>
    </>
  );
}

// ─── KEYS ───
function Keys({ onNext, onBack }) {
  const [ks,setKs]=useState([{l:"Porte d'entrée",q:2},{l:"Boîte aux lettres",q:1},{l:"Cave",q:1},{l:"Badge/Vigik",q:1},{l:"Télécommande",q:0}]);
  const [photo,setPhoto]=useState(false);
  const upd=(i,d)=>setKs(k=>k.map((x,j)=>j===i?{...x,q:Math.max(0,x.q+d)}:x));
  return (
    <>
      <TopBar title="Clés & accès" sub="Posez-les sur une table" onBack={onBack} />
      <div style={{ flex:1,overflow:"auto",padding:20 }}>
        {!photo?(
          <button onClick={()=>setPhoto(true)} style={{width:"100%",height:130,borderRadius:16,border:`2px dashed ${C.accent}40`,background:`linear-gradient(180deg,${C.accent}08,transparent)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,cursor:"pointer",marginBottom:20,fontFamily:"inherit"}}>
            <span style={{fontSize:36}}>🔑📸</span>
            <span style={{color:C.accent,fontSize:14,fontWeight:600}}>Photographier toutes les clés</span>
          </button>
        ):(
          <div style={{background:`${C.green}0C`,border:`1px solid ${C.green}25`,borderRadius:16,padding:16,marginBottom:20,display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:28}}>✅</span>
            <div><div style={{color:C.green,fontSize:14,fontWeight:700}}>Photo enregistrée</div>
            <button onClick={()=>setPhoto(false)} style={{color:C.text3,background:"none",border:"none",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Reprendre</button></div>
          </div>
        )}
        {ks.map((k,i)=>(
          <div key={i} style={{background:C.card,borderRadius:12,padding:"12px 16px",marginBottom:6,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{color:k.q>0?C.text:C.text3,fontSize:14}}>{k.l}</span>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <button onClick={()=>upd(i,-1)} style={{width:36,height:36,borderRadius:10,background:C.card2,border:`1px solid ${C.border}`,color:C.text,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
              <span style={{color:k.q>0?C.accent:C.text3,fontSize:20,fontWeight:800,width:24,textAlign:"center"}}>{k.q}</span>
              <button onClick={()=>upd(i,1)} style={{width:36,height:36,borderRadius:10,background:C.card2,border:`1px solid ${C.border}`,color:C.text,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
            </div>
          </div>
        ))}
      </div>
      <Btn onClick={onNext} disabled={!photo}>Passer aux pièces →</Btn>
    </>
  );
}

// ─── ROOM HUB ───
function Hub({ rooms, done, onSelect, onBack, onFinish }) {
  const ct=Object.keys(done).filter(k=>done[k]).length;
  return (
    <>
      <TopBar title="Pièces" sub={`${ct}/${rooms.length} inspectées`} onBack={onBack}
        right={<div style={{padding:"4px 10px",borderRadius:20,background:C.card2,border:`1px solid ${C.border}`}}><span style={{color:C.accent,fontSize:12,fontWeight:700}}>{ct}</span><span style={{color:C.text3,fontSize:12}}>/{rooms.length}</span></div>} />
      <div style={{ flex:1,overflow:"auto",padding:20 }}>
        <AIBubble>Commencez par la pièce où vous êtes. Pas besoin de suivre l'ordre !</AIBubble>
        {rooms.map(r=>{
          const d=done[r.id];
          return (
            <button key={r.id} onClick={()=>onSelect(r)} style={{width:"100%",padding:"16px 18px",borderRadius:14,display:"flex",alignItems:"center",gap:14,marginBottom:8,background:d?`${C.green}08`:C.card,border:`1px solid ${d?`${C.green}25`:C.border}`,cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
              <div style={{width:44,height:44,borderRadius:12,background:d?`${C.green}15`:C.card2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{d?"✓":r.icon}</div>
              <div style={{flex:1}}>
                <div style={{color:C.text,fontSize:15,fontWeight:600}}>{r.name}</div>
                <div style={{color:d?C.green:C.text3,fontSize:12,marginTop:2}}>{d?"Complète":"Non inspectée"}</div>
              </div>
              <span style={{color:d?C.green:C.text3,fontSize:18}}>›</span>
            </button>
          );
        })}
        <button style={{width:"100%",padding:16,borderRadius:14,border:`1.5px dashed ${C.border}`,background:"transparent",color:C.accent,fontSize:14,fontWeight:600,cursor:"pointer",marginTop:4,fontFamily:"inherit"}}>+ Ajouter une pièce</button>
      </div>
      {ct>0 && <Btn onClick={onFinish} disabled={ct<rooms.length}>{ct===rooms.length?"Récapitulatif →":`Récapitulatif (${rooms.length-ct} restantes)`}</Btn>}
    </>
  );
}

// ─── ROOM NAV PILLS (persistent mini-nav) ───
function RoomPills({ rooms, current, done, onSwitch }) {
  const ref=useRef(null);
  useEffect(()=>{
    const el=ref.current?.querySelector(`[data-id="${current.id}"]`);
    if(el) el.scrollIntoView({behavior:"smooth",inline:"center",block:"nearest"});
  },[current.id]);
  return (
    <div ref={ref} style={{ display:"flex", gap:6, padding:"8px 20px", overflow:"auto", flexShrink:0, background:C.bg, borderBottom:`0px solid ${C.border}` }}>
      {rooms.map(r=>{
        const active=r.id===current.id;
        const d=done[r.id];
        return (
          <button key={r.id} data-id={r.id} onClick={()=>onSwitch(r)} style={{
            padding:"6px 14px", borderRadius:20, flexShrink:0, whiteSpace:"nowrap",
            background:active?C.accent:d?`${C.green}15`:C.card2,
            color:active?"#fff":d?C.green:C.text3,
            border:`1px solid ${active?C.accent:d?`${C.green}30`:C.border}`,
            fontSize:12, fontWeight:active?700:500, cursor:"pointer", fontFamily:"inherit",
            transition:"all 0.15s",
          }}>
            {d && !active?"✓ ":""}{r.name}
          </button>
        );
      })}
    </div>
  );
}

// ─── ROOM INSPECTION (the big one) ───
function RoomInspect({ room, rooms, done, onSwitch, onDone, onBackToHub }) {
  // phases: overview → surface-photo → surface-qualify → (degrad sub-flow) → equip → obs
  const [phase,setPhase]=useState("overview");
  const [surfIdx,setSurfIdx]=useState(0);
  const [surfStates,setSurfStates]=useState({}); // { "Sols": { photo:true, cond:"GOOD" }, ... }
  const [equipStates,setEquipStates]=useState({});

  // Degradation sub-flow state
  const [degTarget,setDegTarget]=useState(null);
  const [degChips,setDegChips]=useState([]);
  const [degStep,setDegStep]=useState(null); // type | closeup | audio
  const [audioText,setAudioText]=useState("");
  const [recording,setRecording]=useState(false);

  const equips=EQUIPS[room.type]||EQUIPS.LIVING;
  const surf=SURFS[surfIdx];

  // Reset when switching rooms via pills
  useEffect(()=>{
    setPhase("overview"); setSurfIdx(0); setSurfStates({}); setEquipStates({});
    setDegTarget(null); setDegChips([]); setDegStep(null); setAudioText("");
  },[room.id]);

  // ─── DEGRADATION SUB-FLOW ───
  if(degStep==="type") {
    return (
      <>
        <TopBar title="Dégradation" sub={`${room.name} — ${degTarget}`} onBack={()=>{setDegStep(null);setDegTarget(null);}} />
        <div style={{flex:1,overflow:"auto",padding:20}}>
          <div style={{fontSize:20,fontWeight:700,color:C.text,marginBottom:6}}>Quel type ?</div>
          <div style={{fontSize:13,color:C.text2,marginBottom:20}}>Sélectionnez un ou plusieurs</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
            {DEGTYPES.map(t=>{
              const a=degChips.includes(t);
              return <button key={t} onClick={()=>setDegChips(c=>a?c.filter(x=>x!==t):[...c,t])} style={{padding:"10px 18px",borderRadius:24,border:`1.5px solid ${a?C.orange:C.border}`,background:a?`${C.orange}18`:C.card,color:a?C.orange:C.text2,fontSize:14,fontWeight:a?600:400,cursor:"pointer",fontFamily:"inherit"}}>{t}</button>;
            })}
          </div>
        </div>
        <Btn onClick={()=>setDegStep("closeup")} disabled={degChips.length===0}>Photo plan serré →</Btn>
      </>
    );
  }

  if(degStep==="closeup") {
    return (
      <>
        <TopBar title="Plan serré" sub={`Zoomez sur le défaut`} onBack={()=>setDegStep("type")} />
        <CameraScreen label="🔍 Plan serré" instruction={<>Zoomez sur <span style={{color:C.red}}>la dégradation</span> pour montrer le détail</>} onShoot={()=>setDegStep("audio")} accentColor={C.red} />
      </>
    );
  }

  if(degStep==="audio") {
    return (
      <>
        <TopBar title="Observation" sub={`${room.name} — ${degTarget}`} onBack={()=>setDegStep("closeup")} />
        <div style={{flex:1,display:"flex",flexDirection:"column",padding:20}}>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
            {degChips.map(t=><span key={t} style={{padding:"5px 12px",borderRadius:16,background:`${C.orange}18`,border:`1px solid ${C.orange}30`,color:C.orange,fontSize:12,fontWeight:600}}>{t}</span>)}
          </div>
          <div style={{display:"flex",gap:6,marginBottom:16}}>
            <div style={{width:56,height:56,borderRadius:10,background:`${C.blue}12`,border:`1px solid ${C.blue}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:C.blue}}>Plan<br/>moyen ✓</div>
            <div style={{width:56,height:56,borderRadius:10,background:`${C.red}12`,border:`1px solid ${C.red}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:C.red}}>Plan<br/>serré ✓</div>
          </div>
          <div style={{fontSize:18,fontWeight:700,color:C.text,marginBottom:6}}>Décrivez la dégradation</div>
          <div style={{fontSize:13,color:C.text2,marginBottom:20}}>Maintenez le micro ou tapez au clavier</div>
          <button
            onMouseDown={()=>setRecording(true)} onMouseUp={()=>{setRecording(false);setAudioText("Tache d'humidité d'environ 30cm sous la fenêtre côté rue, traces de moisissure naissante.");}}
            onTouchStart={()=>setRecording(true)} onTouchEnd={()=>{setRecording(false);setAudioText("Tache d'humidité d'environ 30cm sous la fenêtre côté rue, traces de moisissure naissante.");}}
            style={{width:"100%",padding:20,borderRadius:16,marginBottom:16,background:recording?`${C.red}12`:C.card,border:`2px solid ${recording?C.red:C.border}`,display:"flex",flexDirection:"column",alignItems:"center",gap:10,cursor:"pointer",fontFamily:"inherit"}}>
            <div style={{width:56,height:56,borderRadius:"50%",background:recording?`${C.red}20`:`${C.accent}12`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,boxShadow:recording?`0 0 30px ${C.red}25`:"none"}}>🎤</div>
            <span style={{fontSize:14,color:recording?C.red:C.accent,fontWeight:600}}>{recording?"Parlez...":"Maintenez pour dicter"}</span>
            {recording && <div style={{display:"flex",gap:3,height:16}}>{[...Array(12)].map((_,i)=><div key={i} style={{width:3,borderRadius:2,background:C.red,height:Math.random()*14+4,animation:`pulse 0.5s ${i*0.04}s infinite alternate`}} />)}</div>}
          </button>
          {audioText && (
            <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.green}25`,padding:14}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                <span style={{color:C.green,fontSize:12,fontWeight:600}}>✓ Transcription</span>
                <button style={{color:C.text3,background:"none",border:"none",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Modifier ✏️</button>
              </div>
              <div style={{fontSize:14,color:C.text,lineHeight:1.6}}>{audioText}</div>
            </div>
          )}
          <div style={{flex:1}} />
          <button style={{color:C.text3,background:"none",border:"none",fontSize:13,cursor:"pointer",fontFamily:"inherit",textAlign:"center",padding:"8px 0"}}>ou saisir au clavier ✏️</button>
        </div>
        <Btn onClick={()=>{
          // Save and go back to surfaces
          setDegStep(null); setDegTarget(null); setDegChips([]); setAudioText("");
          // Auto-advance to next surface or equip
          if(surfIdx<SURFS.length-1){setSurfIdx(i=>i+1);setPhase("surface-photo");}
          else setPhase("equip");
        }} disabled={!audioText}>Enregistrer ✓</Btn>
        <style>{`@keyframes pulse{from{transform:scaleY(1)}to{transform:scaleY(1.8)}}`}</style>
      </>
    );
  }

  // ─── OVERVIEW: plan large ───
  if(phase==="overview") {
    return (
      <>
        <TopBar title={room.name} sub="Veuillez cadrez la pièce en entier" onBack={onBackToHub} />
        <RoomPills rooms={rooms} current={room} done={done} onSwitch={onSwitch} />
        <CameraScreen label="📸 Plan large" instruction={<>Cadrez la pièce en entier<br/><span style={{color:C.accent}}>Mode paysage recommandé</span></>} onShoot={()=>setPhase("surface-photo")} />
      </>
    );
  }

  // ─── SURFACE PHOTO: shoot first, qualify after ───
  if(phase==="surface-photo") {
    return (
      <>
        <TopBar title={room.name} sub={`${surf} — Prenez la photo`} onBack={()=>{
          if(surfIdx>0){setSurfIdx(i=>i-1);setPhase("surface-qualify");}
          else setPhase("overview");
        }} />
        <RoomPills rooms={rooms} current={room} done={done} onSwitch={onSwitch} />
        {/* Surface tabs */}
        <div style={{display:"flex",gap:6,padding:"8px 20px",background:C.bg}}>
          {SURFS.map((s,i)=>{
            const st=surfStates[s];
            const active=i===surfIdx;
            return <button key={s} onClick={()=>{setSurfIdx(i);setPhase(st?.cond?"surface-qualify":"surface-photo");}} style={{
              flex:1,padding:"8px 0",borderRadius:12,textAlign:"center",
              background:active?`${C.accent}15`:st?.cond?`${condOf(st.cond).color}10`:C.card2,
              border:`1.5px solid ${active?C.accent:st?.cond?`${condOf(st.cond).color}25`:C.border}`,
              color:active?C.accent:st?.cond?condOf(st.cond).color:C.text3,
              fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
            }}>{st?.cond?"✓ ":""}{s}</button>;
          })}
        </div>
        <CameraScreen label={`📸 ${surf}`} instruction={`Photographiez les ${surf.toLowerCase()} de la pièce`} onShoot={()=>{
          setSurfStates(s=>({...s,[surf]:{...s[surf],photo:true}}));
          setPhase("surface-qualify");
        }} />
      </>
    );
  }

  // ─── SURFACE QUALIFY: photo taken, now rate ───
  if(phase==="surface-qualify") {
    const st=surfStates[surf];
    const cond=st?.cond;
    return (
      <>
        <TopBar title={room.name} sub={`${surf} — Qualifiez l'état`} onBack={()=>setPhase("surface-photo")} />
        <RoomPills rooms={rooms} current={room} done={done} onSwitch={onSwitch} />
        <div style={{display:"flex",gap:6,padding:"8px 20px",background:C.bg}}>
          {SURFS.map((s,i)=>{
            const sst=surfStates[s];
            const active=i===surfIdx;
            return <button key={s} onClick={()=>{setSurfIdx(i);setPhase(sst?.photo?"surface-qualify":"surface-photo");}} style={{
              flex:1,padding:"8px 0",borderRadius:12,textAlign:"center",
              background:active?`${C.accent}15`:sst?.cond?`${condOf(sst.cond).color}10`:C.card2,
              border:`1.5px solid ${active?C.accent:sst?.cond?`${condOf(sst.cond).color}25`:C.border}`,
              color:active?C.accent:sst?.cond?condOf(sst.cond).color:C.text3,
              fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
            }}>{sst?.cond?"✓ ":""}{s}</button>;
          })}
        </div>
        <div style={{flex:1,overflow:"auto",padding:20}}>
          {/* Photo preview */}
          <div style={{width:"100%",height:180,borderRadius:14,background:`linear-gradient(135deg,${C.card},${C.card2})`,marginBottom:16,display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${C.green}30`,position:"relative"}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:28,marginBottom:4}}>📸</div>
              <div style={{color:C.green,fontSize:13,fontWeight:600}}>Photo {surf.toLowerCase()} ✓</div>
            </div>
            <button onClick={()=>{setSurfStates(s=>({...s,[surf]:{...s[surf],photo:false,cond:null}}));setPhase("surface-photo");}}
              style={{position:"absolute",top:10,right:10,padding:"5px 10px",borderRadius:8,background:C.card2,border:`1px solid ${C.border}`,color:C.text3,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Reprendre</button>
          </div>

          <div style={{fontSize:16,fontWeight:700,color:C.text,marginBottom:12}}>Quel état pour les {surf.toLowerCase()} ?</div>

          <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
            {CONDS.map(c=>{
              const active=cond===c.key;
              return (
                <button key={c.key} onClick={()=>{
                  setSurfStates(s=>({...s,[surf]:{...s[surf],cond:c.key}}));
                  if(c.key==="BAD"||c.key==="DEAD"){
                    setDegTarget(surf); setDegStep("type"); setDegChips([]);
                  }
                }} style={{
                  padding:"12px 20px",borderRadius:28,
                  border:`2px solid ${active?c.color:`${c.color}35`}`,
                  background:active?`${c.color}20`:`${c.color}08`,
                  color:c.color,fontSize:15,fontWeight:active?700:500,
                  cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s",
                  boxShadow:active?`0 0 20px ${c.color}15`:"none",
                }}>
                  {active?"✓ ":""}{c.label}
                </button>
              );
            })}
          </div>

          {cond && cond!=="BAD" && cond!=="DEAD" && (
            <div style={{marginTop:20,display:"flex",gap:8}}>
              <button style={{flex:1,padding:12,borderRadius:12,background:C.card,border:`1px solid ${C.border}`,color:C.text2,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>🎤 Ajouter une observation</button>
            </div>
          )}
        </div>

        {cond && cond!=="BAD" && cond!=="DEAD" && (
          <Btn onClick={()=>{
            if(surfIdx<SURFS.length-1){setSurfIdx(i=>i+1);setPhase("surface-photo");}
            else setPhase("equip");
          }}>
            {surfIdx<SURFS.length-1?`Suivant : ${SURFS[surfIdx+1]} →`:"Passer aux équipements →"}
          </Btn>
        )}
      </>
    );
  }

  // ─── EQUIPMENTS ───
  if(phase==="equip") {
    const allDone=equips.every(e=>equipStates[e]);
    return (
      <>
        <TopBar title={room.name} sub="Équipements" onBack={()=>{setSurfIdx(SURFS.length-1);setPhase("surface-qualify");}} />
        <RoomPills rooms={rooms} current={room} done={done} onSwitch={onSwitch} />
        <div style={{flex:1,overflow:"auto",padding:20}}>
          <AIBubble>Testez chaque équipement : ouvrez les fenêtres, actionnez les volets, essayez les robinets, les prises...</AIBubble>
          {equips.map(name=>{
            const st=equipStates[name];
            const col=st?condOf(st)?.color:null;
            return (
              <div key={name} style={{background:st?`${col}08`:C.card,borderRadius:12,padding:"14px 16px",marginBottom:8,border:`1px solid ${st?`${col}20`:C.border}`}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:st?0:10}}>
                  <span style={{color:C.text,fontSize:14,fontWeight:600}}>{name}</span>
                  {st && <button onClick={()=>setEquipStates(s=>({...s,[name]:null}))} style={{color:C.text3,background:"none",border:"none",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>modifier</button>}
                </div>
                {!st?(
                  <div style={{display:"flex",gap:6}}>
                    {CONDS.map(c=>(
                      <button key={c.key} onClick={()=>{
                        setEquipStates(s=>({...s,[name]:c.key}));
                        if(c.key==="BAD"||c.key==="DEAD"){setDegTarget(name);setDegStep("type");setDegChips([]);}
                      }} style={{
                        flex:1,padding:"9px 4px",borderRadius:10,
                        border:`1px solid ${c.color}35`,background:`${c.color}08`,
                        color:c.color,fontSize:11,fontWeight:600,
                        cursor:"pointer",fontFamily:"inherit",textAlign:"center",
                      }}>{c.label}</button>
                    ))}
                  </div>
                ):(
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{color:col,fontSize:12,fontWeight:600}}>✓ {condOf(st).label}</span>
                  </div>
                )}
              </div>
            );
          })}
          <button style={{color:C.accent,background:"none",border:"none",fontSize:14,fontWeight:600,cursor:"pointer",padding:"10px 0",fontFamily:"inherit"}}>+ Ajouter un équipement</button>
        </div>
        <Btn onClick={()=>setPhase("obs")} disabled={!allDone}>{allDone?"Observations →":"Qualifiez tous les équipements"}</Btn>
      </>
    );
  }

  // ─── OBSERVATIONS ───
  if(phase==="obs") {
    return (
      <>
        <TopBar title={room.name} sub="Observations" onBack={()=>setPhase("equip")} />
        <RoomPills rooms={rooms} current={room} done={done} onSwitch={onSwitch} />
        <div style={{flex:1,display:"flex",flexDirection:"column",padding:20}}>
          <div style={{fontSize:18,fontWeight:700,color:C.text,marginBottom:6}}>Observation générale ?</div>
          <div style={{fontSize:13,color:C.text2,marginBottom:24,lineHeight:1.5}}>Odeur, bruit, remarque qui ne rentre pas dans les catégories...</div>
          <button
            onMouseDown={()=>setRecording(true)} onMouseUp={()=>{setRecording(false);setAudioText("RAS, pièce en bon état général.");}}
            onTouchStart={()=>setRecording(true)} onTouchEnd={()=>{setRecording(false);setAudioText("RAS, pièce en bon état général.");}}
            style={{width:"100%",padding:20,borderRadius:16,marginBottom:16,background:recording?`${C.red}12`:C.card,border:`2px solid ${recording?C.red:C.border}`,display:"flex",flexDirection:"column",alignItems:"center",gap:10,cursor:"pointer",fontFamily:"inherit"}}>
            <div style={{width:56,height:56,borderRadius:"50%",background:recording?`${C.red}20`:`${C.accent}12`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,boxShadow:recording?`0 0 30px ${C.red}25`:"none"}}>🎤</div>
            <span style={{fontSize:14,color:recording?C.red:C.accent,fontWeight:600}}>{recording?"Parlez...":"Maintenez pour dicter"}</span>
          </button>
          {audioText&&(
            <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.green}25`,padding:14}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                <span style={{color:C.green,fontSize:12,fontWeight:600}}>✓ Transcription</span>
                <button style={{color:C.text3,background:"none",border:"none",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Modifier ✏️</button>
              </div>
              <div style={{fontSize:14,color:C.text,lineHeight:1.6}}>{audioText}</div>
            </div>
          )}
          <div style={{flex:1}} />
          <button style={{color:C.text3,background:"none",border:"none",fontSize:13,cursor:"pointer",fontFamily:"inherit",textAlign:"center",padding:"8px 0"}}>ou saisir au clavier ✏️</button>
        </div>
        <Btn onClick={onDone} color={C.green}>Valider {room.name} ✓</Btn>
      </>
    );
  }

  return null;
}

// ─── RECAP ───
function Recap({ rooms, onBack, onSign }) {
  return (
    <>
      <TopBar title="Récapitulatif" sub="Vérifiez avant signature" onBack={onBack} />
      <div style={{flex:1,overflow:"auto",padding:20}}>
        <div style={{background:`${C.green}0A`,border:`1px solid ${C.green}20`,borderRadius:16,padding:18,marginBottom:16,display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:48,height:48,borderRadius:14,background:`${C.green}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>✓</div>
          <div>
            <div style={{color:C.green,fontSize:16,fontWeight:700}}>{rooms.length} pièces inspectées</div>
            <div style={{color:C.text2,fontSize:12,marginTop:2}}>Compteurs · Clés · Surfaces · Équipements</div>
          </div>
        </div>
        {rooms.map(r=>(
          <div key={r.id} style={{background:C.card,borderRadius:14,padding:14,marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
              <span style={{fontSize:20}}>{r.icon}</span>
              <span style={{color:C.text,fontSize:15,fontWeight:600}}>{r.name}</span>
              <span style={{marginLeft:"auto",color:C.green,fontSize:12,fontWeight:600}}>✓</span>
            </div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {["Sols: Bon","Murs: Bon","Plafond: Bon"].map(s=><span key={s} style={{padding:"3px 8px",borderRadius:8,background:`${C.blue}10`,color:C.blue,fontSize:11}}>{s}</span>)}
              <span style={{padding:"3px 8px",borderRadius:8,background:`${C.green}10`,color:C.green,fontSize:11}}>📸 5</span>
            </div>
          </div>
        ))}
        <AIBubble>
          <span style={{color:C.accent,fontWeight:600}}>Points souvent oubliés :</span> Détecteur fumée · VMC · Joints SdB · Volets · Sonnette
        </AIBubble>
        <div style={{background:C.card,borderRadius:14,padding:14,fontSize:12,color:C.text3,lineHeight:1.6}}>
          Tendez le téléphone au locataire pour la <strong style={{color:C.text}}>revue contradictoire</strong>. Seules les anomalies seront mises en avant.
        </div>
      </div>
      <Btn onClick={onSign}>Passer à la signature →</Btn>
    </>
  );
}

// ─── SIGNATURE ───
function Sign({ onBack, onDone }) {
  const ref=useRef(null);
  const [dr,setDr]=useState(false);
  const [signed,setSigned]=useState(false);
  const [sent,setSent]=useState(false);
  useEffect(()=>{const c=ref.current;if(!c)return;const x=c.getContext("2d");c.width=335;c.height=150;x.fillStyle=C.card2;x.fillRect(0,0,335,150);x.strokeStyle=C.text;x.lineWidth=2.5;x.lineCap="round";},[]);
  const p=(e)=>{const r=ref.current.getBoundingClientRect();const t=e.touches?e.touches[0]:e;return[t.clientX-r.left,t.clientY-r.top];};
  const s=(e)=>{const x=ref.current.getContext("2d");x.beginPath();x.moveTo(...p(e));setDr(true);};
  const m=(e)=>{if(!dr)return;const x=ref.current.getContext("2d");x.lineTo(...p(e));x.stroke();setSigned(true);};
  const u=()=>setDr(false);
  const cl=()=>{const c=ref.current;const x=c.getContext("2d");x.fillStyle=C.card2;x.fillRect(0,0,335,150);setSigned(false);};
  return (
    <>
      <TopBar title="Signature" sub="Étape finale" onBack={onBack} />
      <div style={{flex:1,overflow:"auto",padding:20}}>
        <div style={{background:C.card,borderRadius:16,padding:16,marginBottom:14}}>
          <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:4}}>Votre signature (bailleur)</div>
          <div style={{fontSize:12,color:C.text3,marginBottom:12}}>Signez avec votre doigt</div>
          <canvas ref={ref} onMouseDown={s} onMouseMove={m} onMouseUp={u} onTouchStart={s} onTouchMove={m} onTouchEnd={u}
            style={{borderRadius:12,border:`2px solid ${signed?C.green:C.accent}40`,width:"100%",height:150,touchAction:"none",cursor:"crosshair"}} />
          {signed&&<button onClick={cl} style={{color:C.text3,background:"none",border:"none",fontSize:12,cursor:"pointer",marginTop:6,fontFamily:"inherit"}}>↺ Recommencer</button>}
        </div>
        <div style={{background:C.card,borderRadius:16,padding:16,marginBottom:14}}>
          <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:4}}>Signature locataire</div>
          <div style={{fontSize:12,color:C.text3,marginBottom:12,lineHeight:1.5}}>Marie recevra un lien pour relire, ajouter ses réserves, et signer.</div>
          {!sent?(
            <button onClick={()=>setSent(true)} style={{width:"100%",padding:14,borderRadius:12,background:C.card2,border:`1px solid ${C.border}`,color:C.accent,fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Envoyer le lien 📱</button>
          ):(
            <div style={{display:"flex",alignItems:"center",gap:10,padding:14,borderRadius:12,background:`${C.accent}0C`,border:`1px solid ${C.accent}22`}}>
              <div style={{width:18,height:18,borderRadius:"50%",border:`2.5px solid ${C.accent}`,borderTopColor:"transparent",animation:"spin 0.8s linear infinite"}} />
              <span style={{color:C.accent,fontSize:14,fontWeight:600}}>En attente de signature...</span>
            </div>
          )}
        </div>
        <div style={{background:C.card,borderRadius:14,padding:14,fontSize:12,color:C.text3,lineHeight:1.6}}>
          <strong style={{color:C.text}}>Mentions légales</strong><br/>Le locataire dispose de 10 jours pour demander des modifications (art. 3-2, loi du 6 juillet 1989).
        </div>
      </div>
      <Btn onClick={signed&&sent?onDone:undefined} disabled={!signed||!sent} color={C.green}>✓ Finaliser l'état des lieux</Btn>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}

// ─── DONE ───
function Done({ onDiff }) {
  return (
    <>
      <TopBar title="Terminé" />
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:30}}>
        <div style={{width:90,height:90,borderRadius:"50%",background:`${C.green}12`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:20,boxShadow:`0 0 60px ${C.green}15`}}><span style={{fontSize:44}}>✓</span></div>
        <div style={{fontSize:24,fontWeight:800,color:C.text,marginBottom:8,letterSpacing:-0.5}}>EDL signé !</div>
        <div style={{fontSize:14,color:C.text2,textAlign:"center",lineHeight:1.6,maxWidth:260,marginBottom:32}}>PDF envoyé aux deux parties. Marie a 10 jours pour rectifier.</div>
        <button style={{width:"100%",padding:14,borderRadius:12,background:C.card,border:`1px solid ${C.border}`,color:C.green,fontSize:14,fontWeight:500,cursor:"pointer",marginBottom:8,fontFamily:"inherit"}}>📄 Voir le PDF</button>
        <button onClick={onDiff} style={{width:"100%",padding:16,borderRadius:14,background:`${C.accent}12`,border:`1px solid ${C.accent}28`,color:C.accent,fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginTop:8}}>👁️ Démo : Comparaison sortie</button>
      </div>
    </>
  );
}

// ─── DIFF ───
function DiffScreen({ onBack }) {
  const items=[
    {room:"Cuisine",el:"Sols",from:"GOOD",to:"BAD",tag:"Rayure",note:"Rayure profonde de 15cm devant l'évier"},
    {room:"Chambre",el:"Murs",from:"GOOD",to:"BAD",tag:"Trou",note:"3 trous de cheville non rebouchés, mur côté fenêtre"},
  ];
  return (
    <>
      <TopBar title="Diff entrée ↔ sortie" sub="2 écarts détectés" onBack={onBack} />
      <div style={{flex:1,overflow:"auto",padding:20}}>
        <div style={{display:"flex",gap:8,marginBottom:18}}>
          {[[23,"Inchangés",C.green],[4,"Usure",C.yellow],[2,"Détériorés",C.red]].map(([n,l,c])=>(
            <div key={l} style={{flex:1,padding:12,borderRadius:12,background:`${c}0A`,border:`1px solid ${c}20`,textAlign:"center"}}>
              <div style={{fontSize:22,fontWeight:800,color:c}}>{n}</div>
              <div style={{fontSize:11,color:C.text3,marginTop:2}}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:1,color:C.red,fontWeight:700,marginBottom:10}}>🔴 Détériorations</div>
        {items.map((d,i)=>(
          <div key={i} style={{background:C.card,borderRadius:16,padding:16,marginBottom:12,borderLeft:`3px solid ${C.red}`}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <span style={{color:C.text,fontSize:15,fontWeight:700}}>{d.room} — {d.el}</span>
              <span style={{padding:"3px 10px",borderRadius:10,background:`${C.red}12`,color:C.red,fontSize:12,fontWeight:700}}>{d.tag}</span>
            </div>
            <div style={{display:"flex",gap:10,marginBottom:12}}>
              {[["Entrée",d.from,C.blue],["Sortie",d.to,C.red]].map(([label,k,color])=>(
                <div key={label} style={{flex:1}}>
                  <div style={{fontSize:10,color:C.text3,textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>{label}</div>
                  <div style={{height:72,borderRadius:10,background:`${color}0A`,border:`1px solid ${color}18`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4}}>
                    <span style={{fontSize:18}}>📸</span>
                    <span style={{fontSize:10,color}}>Photo {label.toLowerCase()}</span>
                  </div>
                  <div style={{marginTop:4}}><span style={{padding:"2px 8px",borderRadius:8,background:`${condOf(k).color}12`,color:condOf(k).color,fontSize:11,fontWeight:600}}>{condOf(k).label}</span></div>
                </div>
              ))}
            </div>
            <div style={{padding:10,borderRadius:10,background:C.card2,fontSize:13,color:C.text2,lineHeight:1.5}}>
              <span style={{color:C.text,fontWeight:600}}>📝 </span>{d.note}
            </div>
          </div>
        ))}
        <AIBubble><span style={{color:C.accent,fontWeight:600}}>Vétusté :</span> Les trous de cheville après 3 ans = entretien locatif (charge locataire). La rayure du parquet, si le parquet a 8 ans avec 10% d'abattement/an → 40% à charge du locataire.</AIBubble>
      </div>
      <Btn onClick={()=>{}}>Proposer des retenues sur le dépôt →</Btn>
    </>
  );
}

// ─── MAIN APP ───
export default function App() {
  const [scr,setScr]=useState("home");
  const [done,setDone]=useState({});
  const [curRoom,setCurRoom]=useState(null);

  const go=(s)=>setScr(s);

  // Room switching (from pills or hub)
  const switchRoom=(r)=>{
    setCurRoom(r);
    setScr("room");
  };

  const doneRoom=()=>{
    setDone(d=>({...d,[curRoom.id]:true}));
    // Auto-advance to next undone room or hub
    const nextUndone=ROOMS.find(r=>!done[r.id]&&r.id!==curRoom.id);
    if(nextUndone){
      setCurRoom(nextUndone);
      // Stay on "room" screen, the room component will reset via useEffect
    } else {
      setScr("hub");
    }
  };

  const screens={
    home: <Home go={go} />,
    mElecNum: <WizInput title="Électricité" icon="⚡" label="N° du compteur" hint="Ex: PDL-4928103" onNext={()=>go("mElecIdx")} onBack={()=>go("home")} step="1" total="7" />,
    mElecIdx: <WizInput title="Électricité" icon="⚡" label="Index (kWh)" hint="Relevez les chiffres" type="number" onNext={()=>go("mElecPh")} onBack={()=>go("mElecNum")} step="2" total="7" />,
    mElecPh: <WizPhoto title="Électricité" label="Photo compteur" instruction="Cadrez les chiffres" onNext={()=>go("mEauNum")} onBack={()=>go("mElecIdx")} step="3" total="7" />,
    mEauNum: <WizInput title="Eau" icon="💧" label="N° du compteur" hint="Ex: CF-991847" onNext={()=>go("mEauIdx")} onBack={()=>go("mElecPh")} step="4" total="7" />,
    mEauIdx: <WizInput title="Eau" icon="💧" label="Index (m³)" hint="Relevez les chiffres" type="number" onNext={()=>go("mEauPh")} onBack={()=>go("mEauNum")} step="5" total="7" />,
    mEauPh: <WizPhoto title="Eau" label="Photo compteur" instruction="Cadrez les chiffres" onNext={()=>go("mSum")} onBack={()=>go("mEauIdx")} step="6" total="7" />,
    mSum: <MeterSum onNext={()=>go("keys")} onBack={()=>go("mEauPh")} />,
    keys: <Keys onNext={()=>go("hub")} onBack={()=>go("mSum")} />,
    hub: <Hub rooms={ROOMS} done={done} onSelect={switchRoom} onBack={()=>go("keys")} onFinish={()=>go("recap")} />,
    room: curRoom && <RoomInspect room={curRoom} rooms={ROOMS} done={done} onSwitch={switchRoom} onDone={doneRoom} onBackToHub={()=>go("hub")} />,
    recap: <Recap rooms={ROOMS} onBack={()=>go("hub")} onSign={()=>go("sign")} />,
    sign: <Sign onBack={()=>go("recap")} onDone={()=>go("done")} />,
    done: <Done onDiff={()=>go("diff")} />,
    diff: <DiffScreen onBack={()=>go("done")} />,
  };

  return <Phone>{screens[scr]}</Phone>;
}
