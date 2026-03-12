import { useState, useEffect, useRef } from "react";

const fmt = (n) => new Intl.NumberFormat("fr-FR").format(Math.abs(Math.round(n)));

function useCountUp(target, dur = 700) {
  const [v, setV] = useState(0);
  const r = useRef(null);
  useEffect(() => {
    const s = performance.now();
    const step = (now) => { const p = Math.min((now - s) / dur, 1); setV(Math.round((1 - Math.pow(1 - p, 3)) * target)); if (p < 1) r.current = requestAnimationFrame(step); };
    r.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(r.current);
  }, [target, dur]);
  return v;
}

function Reveal({ children, delay = 0 }) {
  const [show, setShow] = useState(false);
  useEffect(() => { setTimeout(() => setShow(true), delay); }, [delay]);
  return <div className={`transition-all duration-500 ease-out ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>{children}</div>;
}

// ─── Bottom Sheet ───
function BottomSheet({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl p-5 pb-8 animate-slideUp" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-neutral-200 rounded-full mx-auto mb-5" />
        {children}
      </div>
    </div>
  );
}

// ─── Status Pill ───
function StatusPill({ status, daysLate }) {
  const config = {
    OVERDUE: { bg: "bg-red-100 text-red-600", label: daysLate ? `${daysLate}j de retard` : "En retard" },
    PARTIAL: { bg: "bg-amber-100 text-amber-600", label: "Partiel" },
    PENDING: { bg: "bg-neutral-100 text-neutral-500", label: "En attente" },
    PAID: { bg: "bg-emerald-50 text-emerald-600", label: "Payé" },
  };
  const c = config[status];
  return (
    <span className={`${c.bg} text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap`}>
      {c.label}
    </span>
  );
}

// ─── Month Navigator ───
function MonthNav({ month, year, onChange }) {
  const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  const isNow = month === 2 && year === 2026;
  return (
    <div className="flex items-center justify-between">
      <button onClick={() => onChange(month === 0 ? 11 : month - 1, month === 0 ? year - 1 : year)}
        className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-neutral-100 transition-colors">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <div className="text-center">
        <p className="text-lg font-bold text-neutral-900">{months[month]} {year}</p>
        {isNow && (
          <span className="flex items-center justify-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-emerald-600 font-medium">Mois en cours</span>
          </span>
        )}
      </div>
      <button onClick={() => onChange(month === 11 ? 0 : month + 1, month === 11 ? year + 1 : year)}
        className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-neutral-100 transition-colors">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
  );
}

// ─── View Toggle ───
function ViewToggle({ view, onChange }) {
  return (
    <div className="bg-neutral-100 rounded-full p-0.5 inline-flex text-xs">
      <button onClick={() => onChange("grouped")}
        className={`px-3.5 py-1.5 rounded-full font-medium transition-all duration-200 ${view === "grouped" ? "bg-white shadow-sm text-neutral-900" : "text-neutral-500"}`}>
        Par bien
      </button>
      <button onClick={() => onChange("list")}
        className={`px-3.5 py-1.5 rounded-full font-medium transition-all duration-200 ${view === "list" ? "bg-white shadow-sm text-neutral-900" : "text-neutral-500"}`}>
        Liste
      </button>
    </div>
  );
}

// ─── Single tenant line (inside a property group) ───
function TenantLine({ tenant, onTap }) {
  return (
    <button onClick={() => onTap(tenant)} className="w-full flex items-center gap-3 py-3 px-1 hover:bg-neutral-50 rounded-xl transition-colors text-left">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-900">{tenant.name}</p>
      </div>
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <div className="text-right">
          {tenant.status === "PAID" ? (
            <p className="text-sm font-semibold text-emerald-600 tabular-nums">{fmt(tenant.received)} €</p>
          ) : tenant.status === "PARTIAL" ? (
            <div>
              <p className="text-sm font-semibold text-amber-600 tabular-nums">Reste {fmt(tenant.expected - tenant.received)} €</p>
              <p className="text-[10px] text-neutral-400 tabular-nums">sur {fmt(tenant.expected)} €</p>
            </div>
          ) : (
            <p className="text-sm font-semibold text-neutral-900 tabular-nums">{fmt(tenant.expected)} €</p>
          )}
        </div>
        <StatusPill status={tenant.status} daysLate={tenant.daysLate} />
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-300"><path d="M9 18l6-6-6-6"/></svg>
      </div>
    </button>
  );
}

// ─── Property Group Card ───
function PropertyGroup({ property, onTenantTap }) {
  const totalExpected = property.tenants.reduce((s, t) => s + t.expected, 0);
  const totalReceived = property.tenants.reduce((s, t) => s + t.received, 0);
  const hasOverdue = property.tenants.some(t => t.status === "OVERDUE");
  const allPaid = property.tenants.every(t => t.status === "PAID");
  const isColoc = property.tenants.length > 1;

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden transition-all">
      {/* Property header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-neutral-900 truncate">{property.name}</p>
              {isColoc && (
                <span className="text-[9px] font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full">Colocation</span>
              )}
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">{property.address}</p>
          </div>
          <div className="text-right flex-shrink-0 ml-3">
            <p className="text-sm font-bold tabular-nums text-neutral-900">
              {fmt(totalReceived)} <span className="text-neutral-400 font-normal">/ {fmt(totalExpected)} €</span>
            </p>
          </div>
        </div>

        {/* Progress bar for colocs */}
        {isColoc && (
          <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden mt-2.5">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out bg-emerald-500"
              style={{ width: `${totalExpected > 0 ? (totalReceived / totalExpected) * 100 : 0}%` }}
            />
          </div>
        )}
      </div>

      {/* Tenant lines */}
      <div className="px-3 pb-2 divide-y divide-neutral-50">
        {property.tenants.map((t, i) => (
          <TenantLine key={i} tenant={{ ...t, propertyName: property.name, propertyAddress: property.address }} onTap={onTenantTap} />
        ))}
      </div>
    </div>
  );
}

// ─── Flat list view (alternative) ───
function FlatListView({ properties, onTenantTap }) {
  const all = properties.flatMap(p => p.tenants.map(t => ({ ...t, propertyName: p.name, propertyAddress: p.address })));
  const sorted = [...all].sort((a, b) => {
    const order = { OVERDUE: 0, PARTIAL: 1, PENDING: 2, PAID: 3 };
    return order[a.status] - order[b.status];
  });

  return (
    <div className="space-y-1.5">
      {sorted.map((t, i) => (
        <button key={i} onClick={() => onTenantTap(t)}
          className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-neutral-200 bg-white transition-all hover:shadow-sm active:scale-[0.99] text-left">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-900">{t.name}</p>
            <p className="text-[10px] text-neutral-400 truncate mt-0.5">{t.propertyName}</p>
          </div>
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="text-right">
              {t.status === "PAID" ? (
                <p className="text-sm font-semibold text-emerald-600 tabular-nums">{fmt(t.received)} €</p>
              ) : t.status === "PARTIAL" ? (
                <div>
                  <p className="text-sm font-semibold text-amber-600 tabular-nums">Reste {fmt(t.expected - t.received)} €</p>
                  <p className="text-[10px] text-neutral-400 tabular-nums">sur {fmt(t.expected)} €</p>
                </div>
              ) : (
                <p className="text-sm font-semibold text-neutral-900 tabular-nums">{fmt(t.expected)} €</p>
              )}
            </div>
            <StatusPill status={t.status} daysLate={t.daysLate} />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-300"><path d="M9 18l6-6-6-6"/></svg>
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── MAIN ───
export default function SuiviLoyersV3() {
  const [month, setMonth] = useState(2);
  const [year, setYear] = useState(2026);
  const [view, setView] = useState("grouped");
  const [sheet, setSheet] = useState(null);

  // Data grouped by property, sorted by due date (5 mars before 10 mars)
  const properties = [
    {
      name: "T4 Rivoli",
      address: "10 Rue de Rivoli, Paris",
      dueDay: 1,
      tenants: [
        { name: "Lucas M.", expected: 450, received: 0, status: "OVERDUE", daysLate: 10, dueDate: "1 mars" },
        { name: "Sarah K.", expected: 450, received: 300, status: "PARTIAL", daysLate: null, dueDate: "1 mars" },
        { name: "Youssef B.", expected: 450, received: 450, status: "PAID", daysLate: null, dueDate: "1 mars", paidDate: "2 mars" },
      ],
    },
    {
      name: "Appartement Lumineux",
      address: "17 Rue Jules Guesde, Levallois",
      dueDay: 5,
      tenants: [
        { name: "Michelle S.", expected: 809, received: 0, status: "OVERDUE", daysLate: 6, dueDate: "5 mars" },
      ],
    },
    {
      name: "Studio Lyon",
      address: "2 Rue Carquillat, Lyon",
      dueDay: 5,
      tenants: [
        { name: "Claire D.", expected: 580, received: 580, status: "PAID", daysLate: null, dueDate: "5 mars", paidDate: "4 mars" },
      ],
    },
    {
      name: "T2 Les Sables",
      address: "133 Rue Simone Veil, Les Sables-d'Olonne",
      dueDay: 1,
      tenants: [
        { name: "Antoine R.", expected: 650, received: 650, status: "PAID", daysLate: null, dueDate: "1 mars", paidDate: "1 mars" },
      ],
    },
  ];

  // Sort by due date
  const sortedProps = [...properties].sort((a, b) => a.dueDay - b.dueDay);

  const allTenants = properties.flatMap(p => p.tenants);
  const totalExpected = allTenants.reduce((s, t) => s + t.expected, 0);
  const totalReceived = allTenants.reduce((s, t) => s + t.received, 0);
  const overdueCount = allTenants.filter(t => t.status === "OVERDUE").length;
  const partialCount = allTenants.filter(t => t.status === "PARTIAL").length;
  const paidCount = allTenants.filter(t => t.status === "PAID").length;
  const animReceived = useCountUp(totalReceived, 800);
  const progress = totalExpected > 0 ? (totalReceived / totalExpected) * 100 : 0;

  const openSheet = (tenant) => setSheet(tenant);

  return (
    <div className="min-h-screen bg-[#FAFAF9]" style={{ fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slideUp { animation: slideUp .3s ease-out forwards; }
      `}</style>

      <div className="max-w-lg mx-auto px-4 pb-28">

        {/* ═══ HEADER ═══ */}
        <Reveal delay={50}>
          <div className="pt-6 pb-4">
            <button className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-600 transition-colors mb-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              Finances
            </button>
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-[22px] font-extrabold text-neutral-900 tracking-tight">Suivi des loyers</h1>
              <ViewToggle view={view} onChange={setView} />
            </div>
            <MonthNav month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />
          </div>
        </Reveal>

        {/* ═══ RÉSUMÉ ═══ */}
        <Reveal delay={100}>
          <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-5 mb-6">
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">Encaissé</p>
                <p className="text-[28px] font-extrabold text-neutral-900 tabular-nums tracking-tight leading-none mt-1">
                  {fmt(animReceived)} €
                </p>
                <p className="text-xs text-neutral-400 mt-1">sur {fmt(totalExpected)} €</p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                {paidCount > 0 && (
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{paidCount} payé{paidCount > 1 ? "s" : ""}</span>
                )}
                {partialCount > 0 && (
                  <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{partialCount} partiel{partialCount > 1 ? "s" : ""}</span>
                )}
                {overdueCount > 0 && (
                  <span className="text-[10px] font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">{overdueCount} retard{overdueCount > 1 ? "s" : ""}</span>
                )}
              </div>
            </div>
            {/* Progress bar: ALWAYS green — encaissement is positive */}
            <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-700 ease-out"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        </Reveal>

        {/* ═══ CONTENU ═══ */}
        <Reveal delay={200}>
          {view === "grouped" ? (
            <div className="space-y-3">
              {sortedProps.map((p, i) => (
                <PropertyGroup key={i} property={p} onTenantTap={openSheet} />
              ))}
            </div>
          ) : (
            <FlatListView properties={properties} onTenantTap={openSheet} />
          )}
        </Reveal>

        {/* ═══ CARD POWENS ═══ */}
        <Reveal delay={300}>
          <div className="mt-8 bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-2xl p-5 text-white">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">Paiement des loyers</p>
                  <span className="text-[9px] font-bold text-amber-400 bg-amber-400/15 px-1.5 py-0.5 rounded-full">Essentiel</span>
                </div>
                <p className="text-sm font-semibold text-white leading-snug">Connectez votre banque pour être alerté automatiquement</p>
                <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">Les paiements seront détectés et rapprochés sans intervention.</p>
              </div>
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0 ml-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              </div>
            </div>
            <button className="mt-4 w-full bg-white text-neutral-900 text-sm font-semibold py-2.5 rounded-xl hover:bg-neutral-100 transition-colors">
              Passer à Essentiel — 7,90 €/mois
            </button>
          </div>
        </Reveal>
      </div>

      {/* ═══ BOTTOM SHEET ═══ */}
      <BottomSheet open={!!sheet} onClose={() => setSheet(null)}>
        {sheet && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-bold text-neutral-900">{sheet.name}</p>
                <p className="text-xs text-neutral-400 mt-0.5">{sheet.propertyName || ""} · {sheet.propertyAddress || ""}</p>
              </div>
              <StatusPill status={sheet.status} daysLate={sheet.daysLate} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-neutral-50 rounded-xl p-3.5">
                <p className="text-[10px] text-neutral-400 uppercase tracking-wider">Attendu</p>
                <p className="text-lg font-bold text-neutral-900 tabular-nums mt-0.5">{fmt(sheet.expected)} €</p>
              </div>
              <div className="bg-neutral-50 rounded-xl p-3.5">
                <p className="text-[10px] text-neutral-400 uppercase tracking-wider">Reçu</p>
                <p className={`text-lg font-bold tabular-nums mt-0.5 ${sheet.received > 0 ? "text-emerald-600" : "text-neutral-300"}`}>
                  {sheet.received > 0 ? `${fmt(sheet.received)} €` : "—"}
                </p>
              </div>
            </div>

            {sheet.status === "PARTIAL" && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-xs text-amber-700 font-medium">Reste dû : {fmt(sheet.expected - sheet.received)} €</p>
              </div>
            )}

            {sheet.status === "OVERDUE" && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                <p className="text-xs text-red-600 font-medium">{sheet.daysLate} jours de retard · échéance le {sheet.dueDate}</p>
              </div>
            )}

            <div className="space-y-2 pt-2">
              {(sheet.status === "OVERDUE" || sheet.status === "PARTIAL") && (
                <>
                  <button className="w-full bg-neutral-900 text-white text-sm font-semibold py-3 rounded-xl hover:bg-neutral-800 transition-colors">Envoyer un rappel</button>
                  <button className="w-full bg-emerald-50 text-emerald-700 text-sm font-semibold py-3 rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-colors">Marquer comme payé</button>
                  <button className="w-full text-neutral-400 text-xs font-medium py-2 hover:text-neutral-600 transition-colors">Voir la conversation</button>
                </>
              )}
              {sheet.status === "PAID" && (
                <>
                  <button className="w-full bg-neutral-900 text-white text-sm font-semibold py-3 rounded-xl hover:bg-neutral-800 transition-colors">Générer la quittance</button>
                  <button className="w-full text-neutral-400 text-xs font-medium py-2 hover:text-neutral-600 transition-colors">Modifier le montant</button>
                </>
              )}
              {sheet.status === "PENDING" && (
                <>
                  <button className="w-full bg-neutral-900 text-white text-sm font-semibold py-3 rounded-xl hover:bg-neutral-800 transition-colors">Marquer comme payé</button>
                  <button className="w-full text-neutral-400 text-xs font-medium py-2 hover:text-neutral-600 transition-colors">Envoyer un avis d'échéance</button>
                </>
              )}
            </div>
          </div>
        )}
      </BottomSheet>

      {/* ─── Bottom nav ─── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-neutral-100 px-2 pb-5 pt-2 z-40">
        <div className="max-w-lg mx-auto flex justify-around">
          {[
            { label: "Agenda", active: false, d: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
            { label: "Annonces", active: false, d: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" },
            { label: "Activités", active: false, d: "M4 6h16M4 10h16M4 14h16M4 18h16" },
            { label: "Messages", active: false, d: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" },
            { label: "Finances", active: true, d: "M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" },
          ].map(item => (
            <button key={item.label} className={`flex flex-col items-center gap-0.5 text-[10px] px-3 py-1 ${item.active ? "text-neutral-900 font-bold" : "text-neutral-400"}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={item.active ? 2.2 : 1.5} strokeLinecap="round" strokeLinejoin="round"><path d={item.d}/></svg>
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
