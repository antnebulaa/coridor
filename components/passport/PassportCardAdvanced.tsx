'use client';

import Link from 'next/link';
import { PassportCompletionData } from '@/lib/passportCompletion';
import ProgressRing from './ProgressRing';
import PassportBadge from './PassportBadge';

interface PassportCardAdvancedProps {
    data: PassportCompletionData;
    onOpenExplainer: () => void;
}

const PassportCardAdvanced: React.FC<PassportCardAdvancedProps> = ({ data, onOpenExplainer }) => {
    const { percent, earnedBadges, remainingSteps } = data;

    return (
        <div
            className="rounded-2xl p-5 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 100%)' }}
        >
            <div className="flex flex-col gap-4">
                {/* Header row */}
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-1.5">
                            <p className="text-xs font-medium text-white/40 uppercase tracking-wider">
                                Passeport Locatif
                            </p>
                            <button
                                onClick={onOpenExplainer}
                                className="w-4 h-4 rounded-full border border-white/25 text-white/35 text-[9px] flex items-center justify-center hover:border-white/60 hover:text-white/80 cursor-pointer transition"
                            >
                                ?
                            </button>
                        </div>
                        <h3 className="text-lg font-bold text-white mt-0.5">
                            Très bon profil
                        </h3>
                    </div>
                    <ProgressRing percent={percent} size={52} stroke={4} />
                </div>

                {/* Earned badges */}
                {earnedBadges.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {earnedBadges.map((badge) => (
                            <PassportBadge key={badge} type={badge} />
                        ))}
                    </div>
                )}

                {/* Social proof */}
                <p className="text-sm font-semibold" style={{ color: '#E8A838' }}>
                    ↑ 3× plus de réponses en moyenne pour les locataires avec un Passeport au-dessus de 70%
                </p>

                {/* Remaining steps */}
                {remainingSteps.length > 0 && (
                    <div className="flex flex-col gap-2">
                        {remainingSteps.map((step) => (
                            <Link
                                key={step.id}
                                href={step.href}
                                className="flex items-center gap-3 p-2.5 rounded-lg transition hover:brightness-110"
                                style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                            >
                                <div
                                    className="w-5 h-5 rounded-full border-2 shrink-0"
                                    style={{ borderColor: 'rgba(255,255,255,0.25)' }}
                                />
                                <div className="flex-1 min-w-0">
                                    <span className="text-sm text-white/80">{step.label}</span>
                                    <span className="text-xs text-white/30 ml-2">· {step.estimatedMinutes} min</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PassportCardAdvanced;
