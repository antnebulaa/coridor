import { useState, useEffect, useRef } from "react";

// ─── Hooks ───
function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / duration, 1);
      setValue(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) ref.current = requestAnimationFrame(step);
    };
    ref.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(ref.current);
  }, [target, duration]);
  return value;
}
const fmt = (n) => new Intl.NumberFormat("fr-FR").format(Math.abs(Math.round(n)));

// ─── Reveal ───
function Reveal({ children, delay = 0 }) {
  const [show, setShow] = useState(false);
  useEffect(() => { setTimeout(() => setShow(true), delay); }, [delay]);
  return <div className={`transition-all duration-500 ease-out ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>{children}</div>;
}

// ─── Smart Insight Card with Open Doodles ───
function Insight({ doodle, color, title, description, action, actionLabel }) {
  const colors = {
    red: "bg-red-50 border-red-100",
    amber: "bg-amber-50 border-amber-100",
    emerald: "bg-emerald-50 border-emerald-100",
    blue: "bg-blue-50 border-blue-100",
    purple: "bg-purple-50 border-purple-100",
  };
  const textColors = {
    red: "text-red-600",
    amber: "text-amber-600",
    emerald: "text-emerald-600",
    blue: "text-blue-600",
    purple: "text-purple-600",
  };
  return (
    <div className={`${colors[color]} border rounded-2xl p-4 transition-all hover:shadow-sm overflow-hidden relative`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0 pr-16">
          <p className="text-sm font-semibold text-neutral-900">{title}</p>
          <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{description}</p>
          {actionLabel && (
            <button className={`inline-flex items-center gap-1 text-xs font-semibold ${textColors[color]} mt-2 hover:gap-2 transition-all`}>
              {actionLabel}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
            </button>
          )}
        </div>
        {doodle && (
          <img
            src={doodle}
            alt=""
            className="absolute right-2 bottom-0 w-20 h-20 object-contain opacity-40 pointer-events-none select-none"
            style={{ filter: "grayscale(100%)" }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Metric Row ───
function MetricRow({ label, value, sub, trend, good }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div>
        <p className="text-xs text-neutral-500">{label}</p>
        {sub && <p className="text-[10px] text-neutral-400 mt-0.5">{sub}</p>}
      </div>
      <div className="text-right flex items-center gap-2">
        <span className="text-sm font-semibold text-neutral-900 tabular-nums">{value}</span>
        {trend && (
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${good ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Sparkline ───
function Sparkline({ data, width = 100, height = 36 }) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => { setTimeout(() => setDrawn(true), 400); }, []);
  const values = data.map(d => d.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = 2;
  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (v - min) / range) * (height - pad * 2);
    return `${x},${y}`;
  });
  const zeroY = pad + (1 - (0 - min) / range) * (height - pad * 2);
  // Area fill path
  const areaPath = `M${points[0]} ${points.map(p => `L${p}`).join(" ")} L${pad + ((values.length - 1) / (values.length - 1)) * (width - pad * 2)},${zeroY} L${pad},${zeroY} Z`;

  return (
    <svg width={width} height={height} className={`transition-opacity duration-700 ${drawn ? "opacity-100" : "opacity-0"}`}>
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkFill)" />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="#10b981"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Occupation Timeline ───
function OccupationBar({ months, occupied }) {
  return (
    <div className="flex gap-0.5 h-2 w-full">
      {Array.from({ length: months }, (_, i) => (
        <div
          key={i}
          className={`flex-1 rounded-sm ${i < occupied ? "bg-emerald-400" : "bg-neutral-200"}`}
        />
      ))}
    </div>
  );
}

// ─── MAIN ───
export default function FinancesV4() {
  const [year, setYear] = useState(2025);
  const [showDecl, setShowDecl] = useState(false);
  const [propFilter, setPropFilter] = useState("all");

  const resultatNet = 16079;
  const animNet = useCountUp(resultatNet, 1000);
  const noi = 17580;
  const patrimoine = 485000;
  const rendementNet = 5.8;

  const cashflowData = [
    { m: "J", v: 1555 }, { m: "F", v: 1555 }, { m: "M", v: 1195 },
    { m: "A", v: 1555 }, { m: "M", v: 1555 }, { m: "J", v: 1305 },
    { m: "J", v: 1555 }, { m: "A", v: 1555 }, { m: "S", v: 1555 },
    { m: "O", v: -1400 }, { m: "N", v: 1198 }, { m: "D", v: 1340 },
  ];

  const DECL_2044 = [
    { l: "211", d: "Loyers bruts encaissés", v: 18660, t: "rev" },
    { l: "221", d: "Frais d'administration et gestion", v: 64.44, t: "ch" },
    { l: "222", d: "Autres frais de gestion (forfait)", v: 120, t: "ch" },
    { l: "223", d: "Primes d'assurance", v: 250, t: "ch" },
    { l: "224", d: "Réparation, entretien", v: 360, t: "ch" },
    { l: "227", d: "Taxes foncières", v: 1210, t: "ch" },
    { l: "230", d: "Total des charges", v: 2004.44, t: "tot" },
    { l: "420", d: "Résultat foncier", v: 16655.56, t: "res" },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF9]" style={{ fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap" rel="stylesheet" />
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}.animate-fadeIn{animation:fadeIn .2s ease-out forwards}`}</style>

      <div className="max-w-lg mx-auto px-4 pb-28">

        {/* ═══ HEADER ═══ */}
        <Reveal delay={50}>
          <div className="pt-6 pb-2">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-[22px] font-extrabold text-neutral-900 tracking-tight">Finances</h1>
              <button className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 bg-white border border-neutral-200 hover:border-neutral-300 px-3 py-2 rounded-xl transition-colors shadow-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Exporter
              </button>
            </div>
            <div className="flex gap-2 mb-5">
              {[2023, 2024, 2025].map(y => (
                <button key={y} onClick={() => setYear(y)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${year === y ? "bg-neutral-900 text-white shadow-sm" : "bg-white text-neutral-400 border border-neutral-100 hover:border-neutral-300"}`}
                >{y}</button>
              ))}
            </div>
          </div>
        </Reveal>

        {/* ═══ OUTILS — Accès rapides ═══ */}
        <Reveal delay={100}>
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-4 px-4">
            <button className="flex-shrink-0 flex items-center gap-2 bg-white border border-neutral-100 rounded-xl px-3.5 py-2.5 hover:border-neutral-200 hover:shadow-sm transition-all">
              <div className="w-7 h-7 bg-neutral-900 rounded-lg flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <span className="text-xs font-semibold text-neutral-700">Quittances</span>
            </button>
            <button className="flex-shrink-0 flex items-center gap-2 bg-white border border-neutral-100 rounded-xl px-3.5 py-2.5 hover:border-neutral-200 hover:shadow-sm transition-all">
              <div className="w-7 h-7 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <span className="text-xs font-semibold text-neutral-700">Dépenses & Charges</span>
            </button>
            <button className="flex-shrink-0 flex items-center gap-2 bg-white border border-neutral-100 rounded-xl px-3.5 py-2.5 hover:border-neutral-200 hover:shadow-sm transition-all">
              <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/></svg>
              </div>
              <span className="text-xs font-semibold text-neutral-700">Régularisation charges</span>
            </button>
          </div>
        </Reveal>

        {/* ═══ RÉSULTAT NET + MÉTRIQUES CLÉS ═══ */}
        <Reveal delay={150}>
          <div className="bg-white border border-neutral-100 rounded-2xl shadow-sm mb-4 overflow-hidden">
            {/* Big number */}
            <div className="p-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold mb-1">Résultat net {year}</p>
                  <p className="text-[34px] font-extrabold tabular-nums tracking-tight leading-none text-emerald-600">
                    +{fmt(animNet)}<span className="text-lg ml-0.5">€</span>
                  </p>
                </div>
                <Sparkline data={cashflowData} />
              </div>
            </div>

            {/* Key metrics */}
            <div className="px-5 pb-4 border-t border-neutral-50 pt-3 space-y-0">
              <MetricRow label="Revenus bruts" value={`${fmt(18660)} €`} sub="Loyers + charges encaissés" />
              <MetricRow label="Charges & dépenses" value={`−${fmt(2581)} €`} />
              <div className="h-px bg-neutral-100 !my-1" />
              <MetricRow label="NOI (Résultat net d'exploitation)" value={`${fmt(noi)} €`} trend="+3.2%" good={true} />
              <MetricRow label="Rendement net" value={`${rendementNet}%`} sub="vs Livret A 3% · SCPI 4.5%" trend="+0.4pt" good={true} />
              <MetricRow label="Taux d'occupation" value="92%" sub="11/12 mois occupés" />
              <div className="h-px bg-neutral-100 !my-1" />
              <MetricRow label="Valeur estimée du patrimoine" value={`${fmt(patrimoine)} €`} trend="+2.1%" good={true} />
              <MetricRow label="Capital restant dû" value={`−${fmt(320000)} €`} sub="Crédit Agricole · échéance 2038" />
              <MetricRow label="Equity nette" value={`${fmt(165000)} €`} sub="Patrimoine − dettes" trend="+12%" good={true} />
              <MetricRow label="Plus-value latente" value={`+${fmt(65000)} €`} sub="Acheté 420 000 € · ~48 000 € net après impôts" />
            </div>
          </div>
        </Reveal>

        {/* ═══ INSIGHTS CONTEXTUELS ═══ */}
        <Reveal delay={250}>
          <div className="space-y-2.5 mb-6">
            <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold mb-1 mt-2">Recommandations</p>

            <Insight
              doodle="https://opendoodles.s3-us-west-1.amazonaws.com/sitting.svg"
              color="red"
              title="5 biens sans locataire"
              description="Votre taux d'occupation global est de 8%. Chaque mois de vacance vous coûte environ 1 200 € de manque à gagner."
              actionLabel="Publier une annonce"
            />

            <Insight
              doodle="https://opendoodles.s3-us-west-1.amazonaws.com/reading.svg"
              color="purple"
              title="Déclaration 2025 : micro-foncier ou réel ?"
              description={`Avec ${fmt(18660)} € de revenus fonciers, le régime réel vous ferait économiser environ 840 € d'impôts par rapport au micro-foncier.`}
              actionLabel="Simuler mes impôts"
            />

            <Insight
              doodle="https://opendoodles.s3-us-west-1.amazonaws.com/float.svg"
              color="blue"
              title="Trésorerie prévisionnelle"
              description="Sur les 12 prochains mois, vos dépenses récurrentes estimées s'élèvent à ~3 144 €. Prochaine échéance : taxe foncière en octobre."
              actionLabel="Voir le détail prévisionnel"
            />

            <Insight
              doodle="https://opendoodles.s3-us-west-1.amazonaws.com/plant.svg"
              color="emerald"
              title="Votre prochain achat est-il rentable ?"
              description="Simulez le rendement, le cashflow mensuel et la plus-value à la revente avant d'investir."
              actionLabel="Lancer une simulation"
            />

            <Insight
              doodle="https://opendoodles.s3-us-west-1.amazonaws.com/meditating.svg"
              color="amber"
              title="Plus-value estimée : +65 000 €"
              description="D'après les estimations du marché, votre patrimoine a pris 15% de valeur. Après impôts et prélèvements, votre plus-value nette serait d'environ 48 000 €."
              actionLabel="Détail par bien"
            />
          </div>
        </Reveal>

        {/* ═══ OCCUPATION — Vue consolidée ═══ */}
        <Reveal delay={350}>
          <div className="mb-6">
            <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold mb-3">Occupation {year}</p>
            <div className="bg-white border border-neutral-100 rounded-2xl shadow-sm divide-y divide-neutral-50 overflow-hidden">
              {[
                { name: "Appartement Lumineux", addr: "17 Rue Jules Guesde", tenant: "Michelle S.", occupied: 11, bailEnd: "Déc. 2026", bailMonths: 9, loyer: "729 €", renewal: false },
                { name: "Studio Rivoli", addr: "10 Rue de Rivoli", tenant: null, occupied: 0, bailEnd: null, bailMonths: null, loyer: null, renewal: false },
                { name: "T2 Rivoli", addr: "10 Rue de Rivoli", tenant: null, occupied: 0, bailEnd: null, bailMonths: null, loyer: null, renewal: false },
              ].map((p, i) => (
                <div key={i} className="px-4 py-3.5 flex items-center gap-3 hover:bg-neutral-50/50 transition-colors cursor-pointer">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.occupied > 0 ? "bg-emerald-400" : "bg-neutral-300"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-neutral-900 truncate">{p.name}</p>
                      {p.loyer ? (
                        <span className="text-xs font-semibold text-neutral-600 tabular-nums flex-shrink-0 ml-2">{p.loyer}/mois</span>
                      ) : (
                        <span className="text-[10px] font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full flex-shrink-0 ml-2">Vacant</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] text-neutral-400 truncate">{p.addr}</span>
                      {p.tenant && <span className="text-[10px] text-neutral-400">· {p.tenant}</span>}
                      {p.bailEnd && (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          p.bailMonths <= 3 ? "bg-amber-50 text-amber-600" : "bg-neutral-100 text-neutral-500"
                        }`}>
                          Bail → {p.bailEnd} {p.bailMonths <= 6 ? `(${p.bailMonths} mois)` : ""}
                        </span>
                      )}
                    </div>
                    <div className="mt-2">
                      <OccupationBar months={12} occupied={p.occupied} />
                    </div>
                  </div>
                </div>
              ))}

              {/* Summary */}
              <div className="px-4 py-3 bg-neutral-50/50 flex items-center justify-between">
                <span className="text-xs text-neutral-400">+ 3 autres biens vacants</span>
                <button className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors">Voir tous les biens →</button>
              </div>
            </div>
          </div>
        </Reveal>

        {/* ═══ DÉCLARATION FISCALE ═══ */}
        <Reveal delay={450}>
          <div className="mb-6">
            <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold mb-3">Déclaration fiscale</p>

            <div className="bg-white border border-neutral-100 rounded-2xl shadow-sm overflow-hidden">
              <button onClick={() => setShowDecl(!showDecl)} className="w-full px-4 py-4 flex items-center justify-between text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">Déclaration 2044 — {year}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-neutral-400">Résultat foncier : <span className="font-semibold text-emerald-600">{fmt(16655.56)} €</span></p>
                      <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">Auto Powens</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={e => { e.stopPropagation(); }} className="text-[10px] font-semibold text-white bg-neutral-900 hover:bg-neutral-800 px-2.5 py-1.5 rounded-lg transition-colors">PDF</button>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-neutral-300 transition-transform duration-200 ${showDecl ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6"/></svg>
                </div>
              </button>

              <div className={`overflow-hidden transition-all duration-300 ease-out ${showDecl ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"}`}>
                <div className="border-t border-neutral-50">
                  {/* Dropdown filter instead of pills */}
                  <div className="px-4 pt-3 pb-2">
                    <select
                      value={propFilter}
                      onChange={e => setPropFilter(e.target.value)}
                      className="w-full text-xs font-medium text-neutral-700 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-neutral-200"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
                    >
                      <option value="all">Tous les biens</option>
                      <option value="1">Appartement Lumineux — 17 Rue Jules Guesde</option>
                      <option value="2">Studio Rivoli — 10 Rue de Rivoli</option>
                      <option value="3">T2 Rivoli — 10 Rue de Rivoli</option>
                      <option value="4">T3 Lyon — 2 Rue Carquillat</option>
                      <option value="5">Levallois T2 — 21 Rue Jules Guesde</option>
                      <option value="6">Les Sables — 133 Rue Simone Veil</option>
                    </select>
                  </div>

                  <div className="divide-y divide-neutral-50">
                    {DECL_2044.map((row, i) => (
                      <div key={i} className={`flex items-center px-4 py-3 ${row.t === "res" ? "bg-emerald-50/50" : row.t === "tot" ? "bg-neutral-50/50" : ""}`}>
                        <span className="w-9 text-[10px] font-mono text-neutral-300">{row.l}</span>
                        <span className={`flex-1 text-xs ${row.t === "res" ? "font-bold text-neutral-900" : "text-neutral-600"}`}>{row.d}</span>
                        <span className={`text-xs font-semibold tabular-nums ml-2 ${
                          row.t === "rev" ? "text-emerald-600" : row.t === "res" ? "text-emerald-700" : row.t === "tot" ? "text-neutral-900" : "text-red-500"
                        }`}>{fmt(row.v)} €</span>
                      </div>
                    ))}
                  </div>

                  <div className="px-4 py-3 bg-neutral-50/50 flex items-center justify-between">
                    <span className="text-[10px] text-neutral-400">Dépenses catégorisées automatiquement via Powens</span>
                    <button className="text-[10px] font-semibold text-neutral-500 hover:text-neutral-700 transition-colors">CSV</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

      </div>

      {/* ─── Bottom nav ─── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-neutral-100 px-2 pb-5 pt-2 z-50">
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
