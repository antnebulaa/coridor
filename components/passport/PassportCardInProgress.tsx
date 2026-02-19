'use client';

import Link from 'next/link';
import { PassportCompletionData } from '@/lib/passportCompletion';
import ProgressRing from './ProgressRing';
import { ChevronRight } from 'lucide-react';

interface PassportCardInProgressProps {
    data: PassportCompletionData;
    onOpenExplainer: () => void;
}

const PassportCardInProgress: React.FC<PassportCardInProgressProps> = ({ data, onOpenExplainer }) => {
    const { percent, nextStep } = data;

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
                            <p className="text-xs font-medium text-white/70 uppercase tracking-wider">
                                Passeport Locatif
                            </p>
                            <button
                                onClick={onOpenExplainer}
                                className="w-4 h-4 rounded-full border border-white/25 text-white/35 text-[9px] flex items-center justify-center hover:border-white/60 hover:text-white/80 cursor-pointer transition"
                            >
                                ?
                            </button>
                        </div>
                        <h3 className="text-3xl font-medium text-white mt-0.5">
                            Bon début !
                        </h3>
                    </div>
                    <ProgressRing percent={percent} size={52} stroke={6} />
                </div>

                {/* Next step */}
                {nextStep && (
                    <Link
                        href={nextStep.href}
                        className="flex items-center justify-between p-3.5 rounded-xl transition hover:brightness-110"
                        style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                    >
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-1">
                                Prochaine étape
                            </p>
                            <p className="text-base font-medium text-white">
                                {nextStep.label}
                            </p>
                            <p className="text-xs text-white/70 mt-0.5">
                                {nextStep.description} · {nextStep.estimatedMinutes} min
                            </p>
                        </div>
                        <ChevronRight size={18} className="text-[#E8A838] shrink-0 ml-2" />
                    </Link>
                )}

                {/* Privacy note */}
                <p className="text-xs text-white/60 text-center">
                    🔒 Vos données restent privées et chiffrées
                </p>
            </div>
        </div>
    );
};

export default PassportCardInProgress;
