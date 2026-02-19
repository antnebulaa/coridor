'use client';

import Link from 'next/link';

const BENEFITS = [
    'Réponses plus rapides',
    'Confiance vérifiée',
    'Candidatures prioritaires',
];

interface PassportCardDiscoveryProps {
    onOpenExplainer: () => void;
}

const PassportCardDiscovery: React.FC<PassportCardDiscoveryProps> = ({ onOpenExplainer }) => {
    return (
        <div
            className="rounded-2xl p-5 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 100%)' }}
        >
            {/* Subtle glow */}
            <div
                className="absolute -top-16 -right-16 w-40 h-40 rounded-full opacity-10 pointer-events-none"
                style={{ background: 'radial-gradient(circle, #E8A838 0%, transparent 70%)' }}
            />

            <div className="relative flex flex-col gap-4">
                {/* Icon + Title */}
                <div className="flex items-start gap-3">
                    <span className="text-3xl">🛂</span>
                    <div>
                        <h3 className="text-base font-bold text-white">
                            Votre Passeport Locatif
                        </h3>
                        <p className="text-sm text-white/60 mt-1 leading-relaxed">
                            Prouvez votre fiabilité aux propriétaires — sans CV, sans discrimination. Vos données parlent pour vous.
                        </p>
                    </div>
                </div>

                {/* Benefit chips */}
                <div className="flex flex-wrap gap-2">
                    {BENEFITS.map((b) => (
                        <span
                            key={b}
                            className="px-3 py-1.5 rounded-full text-xs font-medium text-white/80"
                            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                        >
                            {b}
                        </span>
                    ))}
                </div>

                {/* CTA */}
                <Link
                    href="/account/passport"
                    className="w-full py-3 rounded-xl text-sm font-semibold text-center transition hover:opacity-90"
                    style={{ backgroundColor: '#E8A838', color: '#1A1A1A' }}
                >
                    Découvrir mon Passeport →
                </Link>

                {/* Explainer link */}
                <button
                    onClick={onOpenExplainer}
                    className="text-xs text-white/45 underline underline-offset-4 hover:text-white/80 transition text-center mt-0"
                >
                    C&apos;est quoi le Passeport Locatif ?
                </button>
            </div>
        </div>
    );
};

export default PassportCardDiscovery;
