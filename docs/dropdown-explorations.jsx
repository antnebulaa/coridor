import { useState, useEffect, useRef } from "react";

const T = {
  bg: "#f6f4f0", card: "#fff", brd: "#e8e4dc", brdLight: "#f0ede7",
  copper: "#a8825e", copperLight: "#d4c4a8", copperBg: "#f3efe8", copperDark: "#8a6a48",
  ink: "#18160f", ink2: "#3d3a32", ink3: "#6b6660", ink4: "#9e9890",
  green: "#0a7a5a", greenBg: "#edf7f2",
  red: "#c4321a", violet: "#6d28d9", violetBg: "#f3f0ff",
  amber: "#b45309", amberBg: "#fef9ee",
};

const PROPERTIES = [
  { id: "1", name: "Appartement Lumineux", address: "17 Rue Jules Guesde, Levallois", emoji: "🏠", expenses: 2581, count: 38, trend: "+12%" },
  { id: "2", name: "Studio Rivoli", address: "45 Rue de Rivoli, Paris 4ème", emoji: "🏢", expenses: 1840, count: 24, trend: "-3%" },
  { id: "3", name: "T3 Bastille", address: "12 Rue de la Roquette, Paris 11ème", emoji: "🏡", expenses: 3200, count: 42, trend: "+8%" },
  { id: "4", name: "Maison Vincennes", address: "8 Av. du Château, Vincennes", emoji: "🏘️", expenses: 4100, count: 31, trend: "+2%" },
];

const fmt = n => Math.round(n).toLocaleString("fr-FR");

// ═══════════════════════════════════════════
// DESIGN 1 — DARK LUXURY
// Fond sombre, accents cuivre, typographie
// premium, ligne dorée active
// ═══════════════════════════════════════════
function DarkLuxury({ activeId, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const active = PROPERTIES.find(p => p.id === activeId);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", marginBottom: 16 }}>
      {/* Trigger */}
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 12,
        background: T.ink, border: `1px solid ${open ? T.copper : "rgba(255,255,255,0.08)"}`,
        borderRadius: open ? "16px 16px 0 0" : 16, padding: "12px 16px",
        cursor: "pointer", transition: "all 0.25s ease",
        boxShadow: open ? `0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)` : "0 2px 8px rgba(0,0,0,0.1)",
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: `linear-gradient(135deg, ${T.copper} 0%, ${T.copperDark} 100%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, flexShrink: 0,
          boxShadow: "0 2px 8px rgba(168,130,94,0.3)",
        }}>{active?.emoji}</div>
        <div style={{ flex: 1, textAlign: "left" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", lineHeight: 1.2 }}>{active?.name}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{active?.address}</div>
        </div>
        <div style={{ textAlign: "right", marginRight: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.copper, fontVariantNumeric: "tabular-nums" }}>{fmt(active?.expenses)}€</div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{active?.count} dépenses</div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.copper} strokeWidth="2.5" strokeLinecap="round"
          style={{ transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)", transform: open ? "rotate(180deg)" : "rotate(0)", flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0,
          background: T.ink, border: `1px solid ${T.copper}`, borderTop: `1px solid rgba(255,255,255,0.06)`,
          borderRadius: "0 0 16px 16px", overflow: "hidden", zIndex: 100,
          boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
          animation: "dkDrop 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}>
          <style>{`
            @keyframes dkDrop { from { opacity:0; transform: translateY(-4px) scaleY(0.97); } to { opacity:1; transform: translateY(0) scaleY(1); } }
            @keyframes dkItem { from { opacity:0; transform: translateX(-8px); } to { opacity:1; transform: translateX(0); } }
          `}</style>

          {PROPERTIES.map((p, i) => {
            const isActive = p.id === activeId;
            return (
              <button key={p.id} onClick={() => { onChange(p.id); setOpen(false); }} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "12px 16px", border: "none", cursor: "pointer",
                background: isActive ? "rgba(168,130,94,0.1)" : "transparent",
                borderLeft: isActive ? `3px solid ${T.copper}` : "3px solid transparent",
                transition: "all 0.15s ease",
                animation: `dkItem 0.2s ease-out ${i * 0.05}s both`,
              }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isActive ? "rgba(168,130,94,0.1)" : "transparent"; }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: isActive ? T.copper : "rgba(255,255,255,0.06)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: isActive ? 14 : 15, flexShrink: 0,
                  color: isActive ? "#fff" : undefined,
                  transition: "all 0.2s ease",
                  boxShadow: isActive ? "0 2px 8px rgba(168,130,94,0.3)" : "none",
                }}>{isActive ? "✓" : p.emoji}</div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? "#fff" : "rgba(255,255,255,0.7)" }}>{p.name}</div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>{p.address}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? T.copper : "rgba(255,255,255,0.5)", fontVariantNumeric: "tabular-nums" }}>{fmt(p.expenses)}€</div>
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,0.25)" }}>{p.count} dép.</div>
                </div>
              </button>
            );
          })}

          <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
            <button style={{ background: "none", border: "none", fontSize: 11, color: T.copper, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, margin: "0 auto" }}>
              <span style={{ fontSize: 14 }}>+</span> Ajouter un bien
            </button>
          </div>
        </div>
      )}
      {open && <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 99 }} />}
    </div>
  );
}

// ═══════════════════════════════════════════
// DESIGN 2 — GLASS MORPHISM
// Fond flou, bordures lumineuses, reflets
// ═══════════════════════════════════════════
function GlassMorphism({ activeId, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const active = PROPERTIES.find(p => p.id === activeId);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", marginBottom: 16 }}>
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 12,
        background: open ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.6)",
        backdropFilter: "blur(20px) saturate(1.2)",
        WebkitBackdropFilter: "blur(20px) saturate(1.2)",
        border: `1px solid ${open ? "rgba(168,130,94,0.4)" : "rgba(255,255,255,0.5)"}`,
        borderRadius: open ? "16px 16px 0 0" : 16, padding: "12px 16px",
        cursor: "pointer", transition: "all 0.25s ease",
        boxShadow: open ? "0 8px 32px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)" : "0 2px 8px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.6)",
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: `linear-gradient(135deg, ${T.copperBg} 0%, rgba(255,255,255,0.8) 100%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, flexShrink: 0, border: `1px solid ${T.copperLight}`,
        }}>{active?.emoji}</div>
        <div style={{ flex: 1, textAlign: "left" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, lineHeight: 1.2 }}>{active?.name}</div>
          <div style={{ fontSize: 10, color: T.ink3, marginTop: 2 }}>{active?.address}</div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.copper} strokeWidth="2.5" strokeLinecap="round"
          style={{ transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)", transform: open ? "rotate(180deg)" : "rotate(0)", flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0,
          background: "rgba(255,255,255,0.82)", backdropFilter: "blur(24px) saturate(1.3)",
          WebkitBackdropFilter: "blur(24px) saturate(1.3)",
          border: "1px solid rgba(168,130,94,0.3)", borderTop: "1px solid rgba(255,255,255,0.3)",
          borderRadius: "0 0 16px 16px", overflow: "hidden", zIndex: 100,
          boxShadow: "0 16px 48px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5)",
          animation: "glassDrop 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}>
          <style>{`
            @keyframes glassDrop { from { opacity:0; transform: translateY(-4px); } to { opacity:1; transform: translateY(0); } }
            @keyframes glassItem { from { opacity:0; transform: translateY(4px); } to { opacity:1; transform: translateY(0); } }
          `}</style>

          {PROPERTIES.map((p, i) => {
            const isActive = p.id === activeId;
            return (
              <button key={p.id} onClick={() => { onChange(p.id); setOpen(false); }} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "11px 16px", border: "none", cursor: "pointer",
                background: isActive ? `linear-gradient(90deg, rgba(168,130,94,0.12) 0%, transparent 100%)` : "transparent",
                borderBottom: i < PROPERTIES.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none",
                transition: "background 0.15s ease",
                animation: `glassItem 0.2s ease-out ${i * 0.04}s both`,
              }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(168,130,94,0.05)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = isActive ? "linear-gradient(90deg, rgba(168,130,94,0.12) 0%, transparent 100%)" : "transparent"; }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: isActive ? `linear-gradient(135deg, ${T.copper}, ${T.copperDark})` : "rgba(255,255,255,0.6)",
                  border: isActive ? "none" : "1px solid rgba(0,0,0,0.06)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: isActive ? 13 : 15, flexShrink: 0,
                  color: isActive ? "#fff" : undefined,
                  boxShadow: isActive ? "0 2px 8px rgba(168,130,94,0.25)" : "none",
                  transition: "all 0.2s ease",
                }}>{isActive ? "✓" : p.emoji}</div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontSize: 12, fontWeight: isActive ? 600 : 500, color: T.ink }}>{p.name}</div>
                  <div style={{ fontSize: 9, color: T.ink4, marginTop: 1 }}>{p.address}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums",
                    color: isActive ? T.copper : T.ink2,
                    background: isActive ? "none" : undefined,
                  }}>{fmt(p.expenses)}€</div>
                  <div style={{ fontSize: 8, color: T.ink4, marginTop: 1 }}>{p.count} dépenses</div>
                </div>
              </button>
            );
          })}

          <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(0,0,0,0.05)", textAlign: "center" }}>
            <button style={{ background: "none", border: "none", fontSize: 11, color: T.copper, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, margin: "0 auto" }}>
              <span style={{ fontSize: 14 }}>+</span> Ajouter un bien
            </button>
          </div>
        </div>
      )}
      {open && <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 99 }} />}
    </div>
  );
}

// ═══════════════════════════════════════════
// DESIGN 3 — CARD TILES
// Chaque bien est une mini-card avec gradient
// border, format grille, plus visuel
// ═══════════════════════════════════════════
function CardTiles({ activeId, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const active = PROPERTIES.find(p => p.id === activeId);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", marginBottom: 16 }}>
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 12,
        background: T.copperBg, border: `1.5px solid ${open ? T.copper : T.copperLight}`,
        borderRadius: 16, padding: "12px 16px",
        cursor: "pointer", transition: "all 0.2s ease",
        boxShadow: open ? "0 0 0 3px rgba(168,130,94,0.1)" : "none",
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: `linear-gradient(135deg, ${T.copper}20 0%, ${T.copperLight} 100%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, flexShrink: 0,
        }}>{active?.emoji}</div>
        <div style={{ flex: 1, textAlign: "left" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{active?.name}</div>
          <div style={{ fontSize: 10, color: T.ink3, marginTop: 1 }}>{active?.address}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.copper, fontVariantNumeric: "tabular-nums" }}>{fmt(active?.expenses)}€</div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.copper} strokeWidth="2.5" strokeLinecap="round"
            style={{ transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)", transform: open ? "rotate(180deg)" : "rotate(0)" }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 99, background: "rgba(0,0,0,0.15)", backdropFilter: "blur(2px)" }} />
          <div style={{
            position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0,
            background: T.card, border: `1px solid ${T.brd}`,
            borderRadius: 16, overflow: "hidden", zIndex: 100,
            boxShadow: "0 20px 60px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.04)",
            animation: "tileDrop 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          }}>
            <style>{`
              @keyframes tileDrop { from { opacity:0; transform: translateY(-12px) scale(0.98); } to { opacity:1; transform: translateY(0) scale(1); } }
              @keyframes tileItem { from { opacity:0; transform: scale(0.95); } to { opacity:1; transform: scale(1); } }
            `}</style>

            <div style={{ padding: "12px 14px 8px", fontSize: 9, fontWeight: 700, color: T.ink4, textTransform: "uppercase", letterSpacing: 1.2 }}>
              Sélectionner un bien
            </div>

            <div style={{ padding: "0 10px 10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {PROPERTIES.map((p, i) => {
                const isActive = p.id === activeId;
                return (
                  <button key={p.id} onClick={() => { onChange(p.id); setOpen(false); }} style={{
                    padding: "14px 12px", borderRadius: 14, border: "none", cursor: "pointer",
                    background: isActive ? T.ink : "#fff",
                    boxShadow: isActive ? `0 4px 16px rgba(24,22,15,0.2)` : `0 1px 4px rgba(0,0,0,0.04)`,
                    outline: isActive ? "none" : `1px solid ${T.brd}`,
                    transition: "all 0.2s ease",
                    animation: `tileItem 0.25s ease-out ${i * 0.05}s both`,
                    transform: "scale(1)",
                    display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8,
                    textAlign: "left",
                  }}
                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; } }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = isActive ? "0 4px 16px rgba(24,22,15,0.2)" : "0 1px 4px rgba(0,0,0,0.04)"; }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "flex-start" }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: isActive ? "rgba(255,255,255,0.12)" : T.bg,
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                      }}>{p.emoji}</div>
                      {isActive && (
                        <div style={{
                          width: 20, height: 20, borderRadius: "50%",
                          background: T.copper, display: "flex", alignItems: "center", justifyContent: "center",
                          boxShadow: "0 2px 6px rgba(168,130,94,0.3)",
                        }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? "#fff" : T.ink, lineHeight: 1.3 }}>{p.name}</div>
                      <div style={{ fontSize: 9, color: isActive ? "rgba(255,255,255,0.4)" : T.ink4, marginTop: 2 }}>{p.address}</div>
                    </div>
                    <div style={{
                      display: "flex", justifyContent: "space-between", width: "100%", alignItems: "baseline",
                      paddingTop: 6, borderTop: `1px solid ${isActive ? "rgba(255,255,255,0.08)" : T.brdLight}`,
                    }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: isActive ? T.copper : T.ink, fontVariantNumeric: "tabular-nums" }}>{fmt(p.expenses)}€</span>
                      <span style={{ fontSize: 8, color: isActive ? "rgba(255,255,255,0.35)" : T.ink4 }}>{p.count} dép.</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ padding: "8px 14px 12px", textAlign: "center" }}>
              <button style={{ background: "none", border: "none", fontSize: 11, color: T.copper, fontWeight: 500, cursor: "pointer" }}>
                + Ajouter un bien
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// ══ SHOWCASE PAGE ══
// ═══════════════════════════════════════════
export default function DropdownShowcase() {
  const [active1, setActive1] = useState("1");
  const [active2, setActive2] = useState("1");
  const [active3, setActive3] = useState("1");

  return (
    <div style={{ fontFamily: "'DM Sans',system-ui,sans-serif", background: T.bg, minHeight: "100vh", padding: "20px 16px 60px" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap" rel="stylesheet" />

      <div style={{ maxWidth: 420, margin: "0 auto" }}>

        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: T.ink, margin: "0 0 4px" }}>Property Switcher</h1>
          <p style={{ fontSize: 12, color: T.ink3, margin: 0 }}>3 directions design — clique pour tester</p>
        </div>

        {/* Design 1 */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.copper, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>
            01 — Dark Luxury
          </div>
          <div style={{ fontSize: 11, color: T.ink3, marginBottom: 12 }}>
            Fond sombre, accents cuivre, barre active dorée. Premium, élégant, cohérent avec la card KPI sombre.
          </div>
          <DarkLuxury activeId={active1} onChange={setActive1} />
        </div>

        {/* Design 2 */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.copper, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>
            02 — Glass Morphism
          </div>
          <div style={{ fontSize: 11, color: T.ink3, marginBottom: 12 }}>
            Effet verre dépoli, bordures lumineuses, fond flou. Moderne, aérien, Apple-like.
          </div>
          <GlassMorphism activeId={active2} onChange={setActive2} />
        </div>

        {/* Design 3 */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.copper, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>
            03 — Card Tiles
          </div>
          <div style={{ fontSize: 11, color: T.ink3, marginBottom: 12 }}>
            Grille de mini-cards, le bien actif est inversé (fond sombre). Plus visuel, plus spatial.
          </div>
          <CardTiles activeId={active3} onChange={setActive3} />
        </div>

      </div>

      <style>{`
        * { box-sizing: border-box; }
        button { font-family: inherit; }
      `}</style>
    </div>
  );
}
