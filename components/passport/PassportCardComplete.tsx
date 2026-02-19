'use client';

import Link from 'next/link';
import { PassportCompletionData } from '@/lib/passportCompletion';
import PassportBadge from './PassportBadge';

interface PassportCardCompleteProps {
    data: PassportCompletionData;
    onOpenExplainer: () => void;
}

const PassportCardComplete: React.FC<PassportCardCompleteProps> = ({ data, onOpenExplainer }) => {
    const { earnedBadges, overallScore, percentileRank } = data;

    return (
        <Link
            href="/account/passport"
            className="block rounded-2xl p-5 relative overflow-hidden transition hover:brightness-105"
            style={{ background: 'linear-gradient(135deg, #1A1A1A 0%, #2A2520 50%, #2D2D2D 100%)' }}
        >
            {/* Golden glow effect */}
            <div
                className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-[0.08] pointer-events-none"
                style={{ background: 'radial-gradient(circle, #E8A838 0%, transparent 70%)' }}
            />

            <div className="relative flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#E8A838' }}>
                                Passeport Locatif
                            </p>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onOpenExplainer();
                                }}
                                className="w-4 h-4 rounded-full border border-white/25 text-white/35 text-[9px] flex items-center justify-center hover:border-white/60 hover:text-white/80 cursor-pointer transition"
                            >
                                ?
                            </button>
                        </div>
                        {/* Score */}
                        {overallScore !== null && (
                            <div className="flex items-baseline gap-1 mt-1">
                                <span className="text-3xl font-bold text-white">
                                    {Math.round(overallScore)}
                                </span>
                                <span className="text-lg text-white/40 font-medium">/100</span>
                            </div>
                        )}
                    </div>

                    {/* Passport icon with golden glow */}
                    <div
                        className="w-14 h-14 rounded-full flex items-center justify-center"
                        style={{
                            background: 'linear-gradient(135deg, #E8A838 0%, #D4941F 100%)',
                            boxShadow: '0 0 20px rgba(232,168,56,0.3)',
                        }}
                    >
                        <span className="text-2xl">🛂</span>
                    </div>
                </div>

                {/* Badges */}
                {earnedBadges.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {earnedBadges.map((badge) => (
                            <PassportBadge key={badge} type={badge} />
                        ))}
                    </div>
                )}

                {/* Confidence indicator */}
                <div
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                    style={{ backgroundColor: 'rgba(59,165,93,0.1)' }}
                >
                    <span>⭐</span>
                    <span className="text-white/80 font-medium">
                        Profil de confiance
                        {percentileRank !== null && ` · Top ${percentileRank}% des locataires`}
                    </span>
                </div>
            </div>
        </Link>
    );
};

export default PassportCardComplete;
