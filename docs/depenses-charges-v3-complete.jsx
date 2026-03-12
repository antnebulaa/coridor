import { useState, useEffect, useRef, useCallback } from "react";

function useCountUp(target, dur = 450) {
  const [v, setV] = useState(0);
  const r = useRef(null);
  useEffect(() => {
    const s = performance.now();
    const tick = (now) => {
      const p = Math.min((now - s) / dur, 1);
      setV(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) r.current = requestAnimationFrame(tick);
    };
    r.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(r.current);
  }, [target, dur]);
  return v;
}

const fmt = n => Math.round(n).toLocaleString("fr-FR");
const fmtD = n => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const T = {
  bg:"#f6f4f0",card:"#fff",brd:"#e8e4dc",brdLight:"#f0ede7",
  copper:"#a8825e",copperLight:"#d4c4a8",copperBg:"#f3efe8",
  ink:"#18160f",ink2:"#3d3a32",ink3:"#6b6660",ink4:"#9e9890",
  green:"#0a7a5a",greenBg:"#edf7f2",red:"#c4321a",redBg:"#fdf0ed",
  violet:"#6d28d9",violetBg:"#f3f0ff",amber:"#b45309",amberBg:"#fef9ee",r:14,
};

const TYPES = [
  {key:"water",icon:"💧",l:"Eau Froide"},{key:"waterh",icon:"♨️",l:"Eau Chaude"},
  {key:"elec",icon:"⚡",l:"Électricité"},{key:"heat",icon:"🔥",l:"Chauffage"},
  {key:"tax",icon:"🏛",l:"Taxe Foncière"},{key:"insur",icon:"🛡",l:"Assurance"},
  {key:"maint",icon:"🔧",l:"Entretien"},{key:"charges",icon:"🏢",l:"Charges copro"},
];
const CATS = {water:{icon:"💧",c:"#0891b2"},waterh:{icon:"♨️",c:"#ea580c"},elec:{icon:"⚡",c:"#ca8a04"},heat:{icon:"🔥",c:"#dc2626"},maint:{icon:"🔧",c:"#d97706"},tax:{icon:"🏛",c:"#7c3aed"},insur:{icon:"🛡",c:"#2563eb"},charges:{icon:"🏢",c:"#4f46e5"}};

const INIT_EXPENSES = [
  {id:1,cat:"water",label:"Eau Froide 12/2025",amt:32.04,date:"2025-12-14",rec:false,ded:false,freq:"Mensuel"},
  {id:2,cat:"elec",label:"Élec. Communs 12/2025",amt:16.93,date:"2025-12-14",rec:false,ded:false,freq:"Mensuel"},
  {id:3,cat:"maint",label:"Ménage Hall 12/2025",amt:30.00,date:"2025-12-14",rec:false,ded:false,freq:"Mensuel"},
  {id:4,cat:"water",label:"Eau Froide 11/2025",amt:31.22,date:"2025-11-14",rec:false,ded:false,freq:"Mensuel"},
  {id:5,cat:"elec",label:"Élec. Communs 11/2025",amt:15.87,date:"2025-11-14",rec:false,ded:false,freq:"Mensuel"},
  {id:6,cat:"maint",label:"Ménage Hall 11/2025",amt:30.00,date:"2025-11-14",rec:false,ded:false,freq:"Mensuel"},
  {id:7,cat:"tax",label:"Taxe Foncière 2025",amt:1400.00,date:"2025-10-15",rec:false,ded:true,freq:"Annuel"},
  {id:8,cat:"insur",label:"Assurance GLI",amt:250.00,date:"2025-10-01",rec:false,ded:true,freq:"Annuel"},
  {id:9,cat:"water",label:"Eau Froide 10/2025",amt:29.88,date:"2025-10-14",rec:false,ded:false,freq:"Mensuel"},
  {id:10,cat:"elec",label:"Élec. Communs 10/2025",amt:18.12,date:"2025-10-14",rec:false,ded:false,freq:"Mensuel"},
  {id:11,cat:"maint",label:"Ménage Hall 10/2025",amt:30.00,date:"2025-10-14",rec:false,ded:false,freq:"Mensuel"},
  {id:12,cat:"water",label:"Eau Froide 09/2025",amt:28.45,date:"2025-09-14",rec:true,ded:false,freq:"Mensuel"},
  {id:13,cat:"maint",label:"Réparation fuite SdB",amt:160.00,date:"2025-09-22",rec:true,ded:false,freq:"Ponctuel"},
  {id:14,cat:"water",label:"Eau Froide 08/2025",amt:33.10,date:"2025-08-14",rec:false,ded:false,freq:"Mensuel"},
  {id:15,cat:"elec",label:"Élec. Communs 08/2025",amt:14.50,date:"2025-08-14",rec:false,ded:false,freq:"Mensuel"},
  {id:16,cat:"insur",label:"Assurance PNO",amt:180.00,date:"2025-01-15",rec:false,ded:true,freq:"Annuel"},
];

const UPCOMING = [
  {icon:"💧",label:"Eau Froide",amount:32,date:"14 jan.",type:"Mensuel"},
  {icon:"⚡",label:"Élec. Communs",amount:17,date:"14 jan.",type:"Mensuel"},
  {icon:"🔧",label:"Ménage Hall",amount:30,date:"14 jan.",type:"Mensuel"},
  {icon:"🛡",label:"Assurance PNO",amount:180,date:"15 jan.",type:"Annuel"},
  {icon:"🏛",label:"Taxe Foncière",amount:1400,date:"Oct. 2026",type:"Annuel"},
];

const BREAKDOWN = [
  {l:"Taxe Foncière",a:1400,p:54,c:"#ef4444"},
  {l:"Entretien",a:360,p:14,c:"#f59e0b"},
  {l:"Eau Froide",a:357,p:14,c:"#0891b2"},
  {l:"Assurance",a:430,p:10,c:"#2563eb"},
  {l:"Électricité",a:215,p:8,c:"#ca8a04"},
];

const MS = ["Tous","Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"];
const FREQS = ["Ponctuel","Mensuel","Trimestriel","Annuel"];

// ── Swipeable expense row ──
function ExpenseRow({ expense, onEdit, onDelete }) {
  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const startX = useRef(0);
  const cat = CATS[expense.cat] || { icon: "📋", c: "#9e9890" };

  const handleTouchStart = (e) => { startX.current = e.touches[0].clientX; setSwiping(true); };
  const handleTouchMove = (e) => {
    if (!swiping) return;
    const dx = e.touches[0].clientX - startX.current;
    setSwipeX(Math.max(Math.min(dx, 0), -80));
  };
  const handleTouchEnd = () => {
    setSwiping(false);
    if (swipeX < -40) setSwipeX(-76); else setSwipeX(0);
  };

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 10, marginBottom: 2 }}>
      {/* Delete zone behind */}
      <div style={{
        position: "absolute", right: 0, top: 0, bottom: 0, width: 76,
        background: T.red, display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: "0 10px 10px 0",
      }}>
        <button onClick={() => onDelete(expense.id)} style={{
          background: "none", border: "none", color: "#fff", fontSize: 10, fontWeight: 600,
          cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          Suppr.
        </button>
      </div>

      {/* Foreground card */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => { if (swipeX === 0) onEdit(expense); else setSwipeX(0); }}
        style={{
          display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
          background: "#fff", cursor: "pointer", transition: swiping ? "none" : "transform 0.2s ease",
          transform: `translateX(${swipeX}px)`, position: "relative", borderRadius: 10,
          border: "1px solid transparent",
        }}
        onMouseEnter={ev => { ev.currentTarget.style.background = T.copperBg; ev.currentTarget.style.borderColor = T.copperLight; setShowMenu(true); }}
        onMouseLeave={ev => { ev.currentTarget.style.background = "#fff"; ev.currentTarget.style.borderColor = "transparent"; setShowMenu(false); }}
      >
        <div style={{ width: 30, height: 30, borderRadius: 8, background: `${cat.c}10`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>{cat.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: T.ink, lineHeight: 1.2 }}>{expense.label}</div>
          <div style={{ display: "flex", gap: 3, marginTop: 2 }}>
            {expense.rec && <span style={{ fontSize: 8, background: T.greenBg, color: T.green, borderRadius: 99, padding: "0px 5px", fontWeight: 600 }}>Récup.</span>}
            {expense.ded && <span style={{ fontSize: 8, background: T.violetBg, color: T.violet, borderRadius: 99, padding: "0px 5px", fontWeight: 600 }}>Déductible</span>}
            {!expense.rec && !expense.ded && <span style={{ fontSize: 8, background: T.bg, color: T.ink4, borderRadius: 99, padding: "0px 5px", fontWeight: 500 }}>Non récup.</span>}
          </div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: T.ink, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{fmtD(expense.amt)}€</div>

        {/* Desktop hover menu */}
        {showMenu && (
          <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 2 }} className="desk-only">
            <button onClick={(e) => { e.stopPropagation(); onEdit(expense); }} style={{
              width: 26, height: 26, borderRadius: "50%", border: `1px solid ${T.brd}`,
              background: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }} title="Modifier">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={T.ink3} strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(expense.id); }} style={{
              width: 26, height: 26, borderRadius: "50%", border: `1px solid ${T.brd}`,
              background: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }} title="Supprimer">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={T.red} strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Bottom Sheet (Add + Edit) ──
function ExpenseSheet({ open, onClose, expense, onSave, onDelete }) {
  const isEdit = !!expense;
  const [step, setStep] = useState(isEdit ? 1 : 0);
  const [selectedType, setSelectedType] = useState(expense?.cat || null);
  const [label, setLabel] = useState(expense?.label || "");
  const [amount, setAmount] = useState(expense ? String(expense.amt) : "");
  const [date, setDate] = useState(expense?.date || new Date().toISOString().slice(0, 10));
  const [freq, setFreq] = useState(expense?.freq || "Ponctuel");
  const [rec, setRec] = useState(expense?.rec || false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (expense) {
      setStep(1); setSelectedType(expense.cat); setLabel(expense.label);
      setAmount(String(expense.amt)); setDate(expense.date); setFreq(expense.freq || "Ponctuel");
      setRec(expense.rec); setConfirmDelete(false);
    } else {
      setStep(0); setSelectedType(null); setLabel(""); setAmount("");
      setDate(new Date().toISOString().slice(0, 10)); setFreq("Ponctuel");
      setRec(false); setConfirmDelete(false);
    }
  }, [expense, open]);

  if (!open) return null;

  const typeInfo = TYPES.find(t => t.key === selectedType);
  const canSave = selectedType && label && amount && parseFloat(amount) > 0;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 100, backdropFilter: "blur(2px)" }} />
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff",
        borderRadius: "16px 16px 0 0", zIndex: 101, maxHeight: "85vh", overflow: "auto",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.12)", animation: "su .2s ease-out",
      }}>
        <style>{`@keyframes su{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 4px" }}>
          <div style={{ width: 28, height: 3, borderRadius: 99, background: T.brd }} />
        </div>

        <div style={{ padding: "4px 18px 28px" }}>
          {/* ── Step 0: Type selection ── */}
          {step === 0 && (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, marginBottom: 2 }}>Nouvelle dépense</div>
              <div style={{ fontSize: 11, color: T.ink3, marginBottom: 14 }}>De quoi s'agit-il ?</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 6 }}>
                {TYPES.map(t => (
                  <button key={t.key} onClick={() => { setSelectedType(t.key); setLabel(t.l); setStep(1); }} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10,
                    border: `1px solid ${T.brd}`, background: "#fff", cursor: "pointer", transition: "all 0.1s", textAlign: "left",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = T.copper; e.currentTarget.style.background = T.copperBg; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = T.brd; e.currentTarget.style.background = "#fff"; }}
                  >
                    <span style={{ fontSize: 16 }}>{t.icon}</span>
                    <span style={{ fontSize: 11, fontWeight: 500, color: T.ink2 }}>{t.l}</span>
                  </button>
                ))}
              </div>
              <button onClick={onClose} style={{ width: "100%", padding: "10px", borderRadius: 10, fontSize: 12, fontWeight: 500, border: `1px solid ${T.brd}`, background: "#fff", color: T.ink3, cursor: "pointer", marginTop: 8 }}>Annuler</button>
            </>
          )}

          {/* ── Step 1: Details ── */}
          {step === 1 && (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, marginBottom: 2 }}>{isEdit ? "Modifier la dépense" : "Détails"}</div>
              <div style={{ fontSize: 11, color: T.ink3, marginBottom: 14 }}>Complétez les informations</div>

              {/* Type badge */}
              {typeInfo && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                  background: T.bg, borderRadius: 8, marginBottom: 12, border: `1px solid ${T.brdLight}`,
                }}>
                  <span style={{ fontSize: 16 }}>{typeInfo.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: T.ink, flex: 1 }}>{typeInfo.l}</span>
                  <button onClick={() => setStep(0)} style={{ fontSize: 11, color: T.copper, background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>Modifier</button>
                </div>
              )}

              {/* Form fields */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Libellé (ex: Facture Suez)" style={{
                  padding: "10px 12px", borderRadius: 8, border: `1px solid ${T.brd}`,
                  fontSize: 13, outline: "none", background: "#fff", color: T.ink, transition: "border 0.15s",
                }}
                  onFocus={e => e.target.style.borderColor = T.copper}
                  onBlur={e => e.target.style.borderColor = T.brd}
                />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Montant (€)" type="number" step="0.01" style={{
                    padding: "10px 12px", borderRadius: 8, border: `1px solid ${T.brd}`,
                    fontSize: 13, outline: "none", background: "#fff", color: T.ink, transition: "border 0.15s",
                  }}
                    onFocus={e => e.target.style.borderColor = T.copper}
                    onBlur={e => e.target.style.borderColor = T.brd}
                  />
                  <input value={date} onChange={e => setDate(e.target.value)} type="date" style={{
                    padding: "10px 12px", borderRadius: 8, border: `1px solid ${T.brd}`,
                    fontSize: 13, outline: "none", background: "#fff", color: T.ink, transition: "border 0.15s",
                  }}
                    onFocus={e => e.target.style.borderColor = T.copper}
                    onBlur={e => e.target.style.borderColor = T.brd}
                  />
                </div>

                {/* Frequency */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: T.ink3, marginBottom: 5, letterSpacing: 0.3 }}>Fréquence</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {FREQS.map(f => (
                      <button key={f} onClick={() => setFreq(f)} style={{
                        padding: "5px 12px", borderRadius: 99, fontSize: 11, fontWeight: 500, cursor: "pointer",
                        border: freq === f ? `1.5px solid ${T.ink}` : `1px solid ${T.brd}`,
                        background: freq === f ? T.ink : "#fff", color: freq === f ? "#fff" : T.ink3, transition: "all 0.12s",
                      }}>{f}</button>
                    ))}
                  </div>
                </div>

                {/* Recoverable toggle */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: T.ink }}>Charge récupérable ?</div>
                    <div style={{ fontSize: 10, color: T.ink4 }}>Facturable au locataire</div>
                  </div>
                  <button onClick={() => setRec(!rec)} style={{
                    width: 42, height: 24, borderRadius: 12, cursor: "pointer", padding: 2, border: "none",
                    background: rec ? T.green : T.brd, transition: "background 0.2s",
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: 10, background: "#fff",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.15)", transition: "transform 0.2s",
                      transform: rec ? "translateX(18px)" : "translateX(0)",
                    }} />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: isEdit ? "1fr" : "1fr 1fr", gap: 6 }}>
                  {!isEdit && (
                    <button onClick={() => setStep(0)} style={{
                      padding: "12px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                      border: `1px solid ${T.brd}`, background: "#fff", color: T.ink3, cursor: "pointer",
                    }}>Retour</button>
                  )}
                  <button onClick={() => { setStep(2); }} style={{
                    padding: "12px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                    border: "none", background: T.ink, color: "#fff", cursor: "pointer",
                    opacity: canSave ? 1 : 0.4, pointerEvents: canSave ? "auto" : "none",
                  }}>Continuer</button>
                </div>

                {isEdit && (
                  <button onClick={() => setStep(0)} style={{
                    padding: "8px", borderRadius: 8, fontSize: 11, fontWeight: 500,
                    border: "none", background: "none", color: T.ink4, cursor: "pointer",
                  }}>Modifier le type</button>
                )}
              </div>
            </>
          )}

          {/* ── Step 2: Receipt + Save ── */}
          {step === 2 && (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, marginBottom: 2 }}>Justificatif</div>
              <div style={{ fontSize: 11, color: T.ink3, marginBottom: 14 }}>Ajoutez une photo si vous le souhaitez.</div>

              <div style={{
                background: T.bg, borderRadius: 8, padding: "8px 12px",
                fontSize: 11, color: T.ink3, lineHeight: 1.5, marginBottom: 12, border: `1px solid ${T.brdLight}`,
              }}>
                Prenez en photo votre facture ou ticket. Utile pour les impôts et la justification des charges.
              </div>

              <div style={{
                border: `2px dashed ${T.brd}`, borderRadius: 12, padding: "30px 16px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer",
                transition: "border-color 0.15s",
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = T.copper}
                onMouseLeave={e => e.currentTarget.style.borderColor = T.brd}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={T.ink4} strokeWidth="1.5" strokeLinecap="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                </svg>
                <span style={{ fontSize: 12, color: T.ink3 }}>Cliquer pour ajouter</span>
              </div>

              {/* Summary of what will be saved */}
              <div style={{
                background: T.bg, borderRadius: 8, padding: "10px 12px", marginTop: 12,
                border: `1px solid ${T.brdLight}`,
              }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: T.ink4, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Récapitulatif</div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: T.ink3 }}>{typeInfo?.icon} {label}</span>
                  <span style={{ fontWeight: 600, color: T.ink }}>{amount ? parseFloat(amount).toLocaleString("fr-FR", { minimumFractionDigits: 2 }) : "0"} €</span>
                </div>
                <div style={{ display: "flex", gap: 8, fontSize: 10, color: T.ink4 }}>
                  <span>{new Date(date).toLocaleDateString("fr-FR")}</span>
                  <span>·</span>
                  <span>{freq}</span>
                  {rec && <><span>·</span><span style={{ color: T.green }}>Récupérable</span></>}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 14 }}>
                <button onClick={() => setStep(1)} style={{
                  padding: "12px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                  border: `1px solid ${T.brd}`, background: "#fff", color: T.ink3, cursor: "pointer",
                }}>Retour</button>
                <button onClick={() => {
                  onSave({
                    id: expense?.id || Date.now(),
                    cat: selectedType, label, amt: parseFloat(amount),
                    date, rec, ded: ["tax", "insur"].includes(selectedType), freq,
                  });
                  onClose();
                }} style={{
                  padding: "12px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                  border: "none", background: T.ink, color: "#fff", cursor: "pointer",
                }}>{isEdit ? "Enregistrer" : "Ajouter"}</button>
              </div>

              {/* Delete button for edit mode */}
              {isEdit && (
                <div style={{ marginTop: 10, textAlign: "center" }}>
                  {!confirmDelete ? (
                    <button onClick={() => setConfirmDelete(true)} style={{
                      background: "none", border: "none", fontSize: 12, color: T.red,
                      cursor: "pointer", fontWeight: 500, padding: "6px 12px",
                    }}>Supprimer cette dépense</button>
                  ) : (
                    <div style={{
                      background: T.redBg, borderRadius: 10, padding: "10px 14px",
                      display: "flex", alignItems: "center", gap: 8, justifyContent: "center",
                    }}>
                      <span style={{ fontSize: 11, color: T.red, fontWeight: 500 }}>Confirmer ?</span>
                      <button onClick={() => { onDelete(expense.id); onClose(); }} style={{
                        padding: "5px 14px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                        border: "none", background: T.red, color: "#fff", cursor: "pointer",
                      }}>Supprimer</button>
                      <button onClick={() => setConfirmDelete(false)} style={{
                        padding: "5px 14px", borderRadius: 8, fontSize: 11, fontWeight: 500,
                        border: `1px solid ${T.brd}`, background: "#fff", color: T.ink3, cursor: "pointer",
                      }}>Annuler</button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Delete confirmation toast ──
function DeleteToast({ show, onUndo }) {
  if (!show) return null;
  return (
    <div style={{
      position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
      background: T.ink, color: "#fff", borderRadius: 10, padding: "10px 16px",
      fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 10,
      boxShadow: "0 4px 16px rgba(0,0,0,0.2)", zIndex: 200, animation: "fadeIn .2s ease",
    }}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
      <span>Dépense supprimée</span>
      <button onClick={onUndo} style={{
        background: "rgba(255,255,255,0.15)", border: "none", color: "#4ade80",
        borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer",
      }}>Annuler</button>
    </div>
  );
}

// ══════════════════════════════════
// ══ MAIN PAGE ══
// ══════════════════════════════════
export default function DepensesV3() {
  const [year, setYear] = useState(2025);
  const [month, setMonth] = useState(0);
  const [typeF, setTypeF] = useState("all");
  const [expenses, setExpenses] = useState(INIT_EXPENSES);
  const [hoverBreak, setHoverBreak] = useState(null);
  const [upcomingExp, setUpcomingExp] = useState(false);

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  // Delete toast
  const [deletedExp, setDeletedExp] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const toastTimer = useRef(null);

  const totalRev = 9455;
  const totalExp = expenses.reduce((s, e) => s + e.amt, 0);
  const cashflow = totalRev - totalExp;
  const cashUp = useCountUp(Math.abs(cashflow), 500);
  const revUp = useCountUp(totalRev, 400);
  const expUp = useCountUp(Math.round(totalExp), 400);

  const filtered = expenses.filter(e => {
    if (month > 0 && new Date(e.date).getMonth() + 1 !== month) return false;
    if (typeF === "rec") return e.rec;
    if (typeF === "nrec") return !e.rec;
    return true;
  });

  const grouped = {};
  filtered.forEach(e => {
    const d = new Date(e.date);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!grouped[k]) grouped[k] = { label: d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }), items: [] };
    grouped[k].items.push(e);
  });
  const groups = Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]));

  const fTotal = filtered.reduce((s, e) => s + e.amt, 0);
  const fRec = filtered.filter(e => e.rec).reduce((s, e) => s + e.amt, 0);
  const fDed = filtered.filter(e => e.ded).reduce((s, e) => s + e.amt, 0);
  const fNRec = fTotal - fRec;

  const handleEdit = (exp) => { setEditingExpense(exp); setSheetOpen(true); };
  const handleAdd = () => { setEditingExpense(null); setSheetOpen(true); };
  const handleSave = (exp) => {
    setExpenses(prev => {
      const exists = prev.find(e => e.id === exp.id);
      if (exists) return prev.map(e => e.id === exp.id ? exp : e);
      return [exp, ...prev];
    });
  };
  const handleDelete = useCallback((id) => {
    const exp = expenses.find(e => e.id === id);
    setDeletedExp(exp);
    setExpenses(prev => prev.filter(e => e.id !== id));
    setShowToast(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => { setShowToast(false); setDeletedExp(null); }, 4000);
  }, [expenses]);
  const handleUndo = () => {
    if (deletedExp) { setExpenses(prev => [...prev, deletedExp].sort((a, b) => b.date.localeCompare(a.date))); }
    setShowToast(false); setDeletedExp(null);
  };

  const upcomingTotal = UPCOMING.reduce((s, e) => s + e.amount, 0);
  const visUp = upcomingExp ? UPCOMING : UPCOMING.slice(0, 3);

  return (
    <div style={{ fontFamily: "'DM Sans',system-ui,sans-serif", background: T.bg, minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap" rel="stylesheet" />

      {/* Top bar */}
      <div style={{ background: "#fff", borderBottom: `1px solid ${T.brd}`, padding: "10px 16px", display: "flex", alignItems: "center", position: "sticky", top: 0, zIndex: 50 }}>
        <button style={{ background: "none", border: "none", cursor: "pointer", color: T.ink3, padding: 0, display: "flex" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: T.ink, letterSpacing: 1.5 }}>CORIDOR</span>
        <span style={{ fontSize: 9, color: T.copper, marginLeft: 3, fontWeight: 600 }}>PRO</span>
        <div style={{ flex: 1 }} />
        <button className="mob-only" style={{ background: "none", border: "none", cursor: "pointer", color: T.ink3, padding: 0, display: "flex" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></svg>
        </button>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "10px 14px 100px" }}>
        {/* Property */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.copperBg, border: `1px solid ${T.copperLight}`, borderRadius: 12, padding: "8px 12px", marginBottom: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: T.copperLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>🏠</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>Appartement Lumineux</div>
            <div style={{ fontSize: 10, color: T.ink3 }}>17 Rue Jules Guesde, Levallois</div>
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.ink4} strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
        </div>

        {/* Title + Year */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: 17, fontWeight: 700, color: T.ink, margin: 0, flex: 1, minWidth: 140 }}>Dépenses & Charges</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <button onClick={() => setYear(y => y - 1)} style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T.ink3 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <span style={{ fontSize: 15, fontWeight: 700, color: T.ink, fontVariantNumeric: "tabular-nums", minWidth: 36, textAlign: "center" }}>{year}</span>
            <button onClick={() => setYear(y => Math.min(y + 1, 2026))} disabled={year >= 2026} style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: year >= 2026 ? T.brd : T.ink3 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>
          <div className="desk-only" style={{ display: "flex", gap: 3 }}>
            {["CSV", "PDF", "Régul."].map(b => (
              <button key={b} style={{ padding: "5px 10px", borderRadius: 7, fontSize: 10, fontWeight: 500, border: `1px solid ${T.brd}`, background: "#fff", color: T.ink3, cursor: "pointer" }}>{b}</button>
            ))}
          </div>
        </div>

        {/* KPI Card */}
        <div style={{ background: T.ink, borderRadius: T.r, marginBottom: 10, overflow: "hidden" }}>
          <div className="kpi-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
            <div style={{ padding: "14px 16px", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Cashflow Net</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: "#4ade80", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>+{fmt(cashUp)}</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>€</span>
              </div>
              <div style={{ fontSize: 9, color: "#4ade80", marginTop: 3, fontWeight: 500, opacity: 0.7 }}>↗ 3.4% vs {year - 1}</div>
            </div>
            <div style={{ padding: "14px 16px", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Revenus</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: "#fff", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{fmt(revUp)}</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>€</span>
              </div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>Loyers + charges</div>
            </div>
            <div style={{ padding: "14px 16px" }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Dépenses</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: "#fbbf24", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{fmt(expUp)}</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>€</span>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 3 }}>
                <span style={{ fontSize: 8, color: "#86efac", fontWeight: 600 }}>Récup. 190€</span>
                <span style={{ fontSize: 8, color: "#c4b5fd", fontWeight: 600 }}>Déd. 1 460€</span>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming */}
        <div style={{ background: "#fff", borderRadius: T.r, border: `1px solid ${T.brd}`, padding: "12px 14px", marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>À venir</span>
              <span style={{ fontSize: 10, background: T.amberBg, color: T.amber, borderRadius: 99, padding: "1px 8px", fontWeight: 600 }}>~{fmt(upcomingTotal)} €</span>
            </div>
            <span style={{ fontSize: 10, color: T.ink4 }}>12 prochains mois</span>
          </div>
          {visUp.map((u, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderTop: i > 0 ? `1px solid ${T.brdLight}` : "none" }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>{u.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: T.ink }}>{u.label}</div>
                <div style={{ fontSize: 9, color: T.ink4 }}>{u.type}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.ink, fontVariantNumeric: "tabular-nums" }}>{fmt(u.amount)} €</div>
                <div style={{ fontSize: 9, color: T.ink4 }}>{u.date}</div>
              </div>
            </div>
          ))}
          {UPCOMING.length > 3 && (
            <button onClick={() => setUpcomingExp(!upcomingExp)} style={{ width: "100%", padding: "6px 0", background: "none", border: "none", fontSize: 11, color: T.copper, fontWeight: 500, cursor: "pointer", marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              {upcomingExp ? "Voir moins" : `Voir tout (${UPCOMING.length})`}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: upcomingExp ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}><path d="M6 9l6 6 6-6" /></svg>
            </button>
          )}
        </div>

        {/* Breakdown */}
        <div style={{ background: "#fff", borderRadius: T.r, border: `1px solid ${T.brd}`, padding: "12px 14px", marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.ink, marginBottom: 8 }}>Répartition {year}</div>
          <div style={{ display: "flex", borderRadius: 4, overflow: "hidden", height: 6, marginBottom: 8 }}>
            {BREAKDOWN.map((c, i) => (
              <div key={i} style={{ width: `${c.p}%`, background: c.c, opacity: hoverBreak === null || hoverBreak === i ? 1 : 0.2, transition: "opacity 0.15s", cursor: "pointer" }}
                onMouseEnter={() => setHoverBreak(i)} onMouseLeave={() => setHoverBreak(null)} />
            ))}
          </div>
          {BREAKDOWN.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, padding: "2px 0", opacity: hoverBreak === null || hoverBreak === i ? 1 : 0.3, transition: "opacity 0.15s", cursor: "default" }}
              onMouseEnter={() => setHoverBreak(i)} onMouseLeave={() => setHoverBreak(null)}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.c, flexShrink: 0 }} />
              <span style={{ color: T.ink2, flex: 1 }}>{c.l}</span>
              <span style={{ color: T.ink4, fontVariantNumeric: "tabular-nums" }}>{c.p}%</span>
              <span style={{ color: T.ink, fontWeight: 600, fontVariantNumeric: "tabular-nums", minWidth: 48, textAlign: "right" }}>{fmt(c.a)}€</span>
            </div>
          ))}
        </div>

        {/* Filters + Summary */}
        <div style={{ background: "#fff", borderRadius: T.r, border: `1px solid ${T.brd}`, padding: "10px 12px", marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 1, overflowX: "auto", paddingBottom: 8, marginBottom: 8, borderBottom: `1px solid ${T.brdLight}` }}>
            {MS.map((m, i) => (
              <button key={m} onClick={() => setMonth(i)} style={{
                padding: "4px 9px", borderRadius: 99, fontSize: 11, fontWeight: month === i ? 600 : 400,
                border: "none", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                background: month === i ? T.ink : "transparent", color: month === i ? "#fff" : T.ink4, transition: "all 0.12s",
              }}>{m}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
            {[{ k: "all", l: "Toutes" }, { k: "rec", l: "Récup." }, { k: "nrec", l: "Non récup." }].map(f => (
              <button key={f.k} onClick={() => setTypeF(f.k)} style={{
                padding: "4px 11px", borderRadius: 99, fontSize: 11, fontWeight: 500, cursor: "pointer", transition: "all 0.12s",
                border: typeF === f.k ? `1.5px solid ${T.ink}` : `1px solid ${T.brd}`,
                background: typeF === f.k ? T.ink : "#fff", color: typeF === f.k ? "#fff" : T.ink3,
              }}>{f.l}</button>
            ))}
            <div style={{ flex: 1 }} />
            <button style={{ padding: "4px 9px", borderRadius: 7, fontSize: 10, fontWeight: 500, border: `1px solid ${T.brd}`, background: "#fff", color: T.ink4, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
              Catégorie
            </button>
          </div>
          {/* Summary line */}
          <div style={{ display: "flex", borderRadius: 10, overflow: "hidden", border: `1px solid ${T.brd}` }}>
            {[
              { l: "Total", v: fTotal, c: T.ink, bg: "#fff" },
              { l: "Récup.", v: fRec, c: T.green, bg: T.greenBg },
              { l: "Non récup.", v: fNRec, c: T.red, bg: T.redBg },
              { l: "Déductible", v: fDed, c: T.violet, bg: T.violetBg },
            ].map((c, i) => (
              <div key={i} style={{ flex: 1, padding: "8px 4px", background: c.bg, textAlign: "center", borderRight: i < 3 ? `1px solid ${T.brd}` : "none" }}>
                <div style={{ fontSize: 8, fontWeight: 700, color: c.c, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2, opacity: 0.65 }}>{c.l}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: c.c, fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}>{fmt(c.v)}€</div>
              </div>
            ))}
          </div>
        </div>

        {/* Expense list */}
        {groups.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: T.r, border: `1px solid ${T.brd}`, padding: "32px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 24, marginBottom: 6, opacity: 0.2 }}>📊</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: T.ink2, marginBottom: 2 }}>Aucune dépense</div>
            <div style={{ fontSize: 10, color: T.ink4, marginBottom: 12 }}>Ajoutez vos premières dépenses.</div>
            <button onClick={handleAdd} style={{ padding: "7px 18px", borderRadius: 99, fontSize: 11, fontWeight: 600, border: "none", background: T.ink, color: "#fff", cursor: "pointer" }}>+ Ajouter</button>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 2px 2px" }}>
              <span style={{ fontSize: 10, color: T.ink4 }}>{filtered.length} dépense{filtered.length > 1 ? "s" : ""}</span>
              <span style={{ fontSize: 9, color: T.ink4 }}>← glisser pour supprimer</span>
            </div>
            {groups.map(([k, g]) => (
              <div key={k}>
                {month === 0 && <div style={{ fontSize: 9, fontWeight: 700, color: T.ink4, textTransform: "uppercase", letterSpacing: 1, padding: "8px 2px 3px" }}>{g.label}</div>}
                {g.items.map(e => (
                  <ExpenseRow key={e.id} expense={e} onEdit={handleEdit} onDelete={handleDelete} />
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Link */}
        <div style={{ padding: "12px 0", textAlign: "center" }}>
          <a href="#" style={{ fontSize: 11, color: T.ink4, textDecoration: "none" }}
            onMouseEnter={e => e.target.style.color = T.copper} onMouseLeave={e => e.target.style.color = T.ink4}>
            Rendement & finances consolidées →
          </a>
        </div>
      </div>

      {/* FAB */}
      <button onClick={handleAdd} style={{
        position: "fixed", bottom: 18, right: 14, width: 52, height: 52, borderRadius: "50%",
        background: T.ink, color: "#fff", border: "none", fontSize: 22, cursor: "pointer",
        boxShadow: `0 4px 16px rgba(0,0,0,0.25), 0 0 0 3px ${T.bg}`,
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40,
        transition: "transform 0.12s", lineHeight: 1,
      }}
        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.06)"}
        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
      >+</button>

      {/* Sheet */}
      <ExpenseSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditingExpense(null); }}
        expense={editingExpense}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      {/* Delete toast */}
      <DeleteToast show={showToast} onUndo={handleUndo} />

      <style>{`
        @media(max-width:600px) { .desk-only{display:none !important;} }
        @media(min-width:601px) { .mob-only{display:none !important;} }
        ::-webkit-scrollbar{width:4px;height:2px}
        ::-webkit-scrollbar-thumb{background:${T.copperLight};border-radius:2px}
        *{box-sizing:border-box} button,input{font-family:inherit}
      `}</style>
    </div>
  );
}
