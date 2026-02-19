'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';

// ── Slide data ───────────────────────────────────────────────

interface SlideData {
    headline: string;
    subtitle: string;
    background: string;
    color: string;
    isCTA?: boolean;
}

const SLIDES: SlideData[] = [
    {
        headline: 'Affichez votre fiabilité\net rassurez les proriétaires',
        subtitle: 'Vos anciennes locations parlent pour vous.',
        background: 'linear-gradient(180deg, #1A1A1A 0%, #2A2520 100%)',
        color: '#E8A838',
    },
    {
        headline: 'Nous vérifions ensemble\nle paiement de vos loyers',
        subtitle: 'Vos données bancaires prouvent que vous payez — automatiquement.',
        background: 'linear-gradient(180deg, #1A1A1A 0%, #1A2540 100%)',
        color: '#4A8FE7',
    },
    {
        headline: 'Identité\nconfirmée',
        subtitle: 'Vérification sécurisée. Les propriétaires savent qui vous êtes.',
        background: 'linear-gradient(180deg, #1A1A1A 0%, #2A1A40 100%)',
        color: '#8B6CC1',
    },
    {
        headline: '3× plus de\nréponses',
        subtitle: 'Les locataires vérifiés sont contactés en priorité par les propriétaires.',
        background: 'linear-gradient(180deg, #1A1A1A 0%, #1A2A20 100%)',
        color: '#3BA55D',
    },
    {
        headline: 'Gratuit.\nPortable.\nÀ vous.',
        subtitle: 'Vos données vous appartiennent. Chiffrées, jamais vendues. Créez votre Passeport en 2 minutes.',
        background: 'linear-gradient(180deg, #1A1A1A 0%, #2A2520 100%)',
        color: '#E8A838',
        isCTA: true,
    },
];

// ── SVG Visuals ──────────────────────────────────────────────

const PassportVisual = ({ color }: { color: string }) => (
    <svg viewBox="0 0 200 200" className="w-full h-full" fill="none">
        <circle cx="100" cy="100" r="95" stroke={color} strokeWidth="0.5" opacity="0.1" />
        <circle cx="100" cy="100" r="75" stroke={color} strokeWidth="0.5" opacity="0.15" />
        <circle cx="100" cy="100" r="55" stroke={color} strokeWidth="0.5" opacity="0.2" />
        <rect x="65" y="55" width="70" height="90" rx="8" stroke={color} strokeWidth="1.5" opacity="0.8" />
        <line x1="80" y1="88" x2="120" y2="88" stroke={color} strokeWidth="1" opacity="0.3" />
        <line x1="80" y1="103" x2="120" y2="103" stroke={color} strokeWidth="1" opacity="0.3" />
        <line x1="80" y1="118" x2="108" y2="118" stroke={color} strokeWidth="1" opacity="0.3" />
        <circle cx="100" cy="72" r="10" fill={color} opacity="0.15" />
        <path d="M94 72 L98 76 L106 68" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const PaymentVisual = ({ color }: { color: string }) => (
    <svg viewBox="0 0 200 200" className="w-full h-full" fill="none">
        <rect x="30" y="125" width="28" height="40" rx="4" fill={color} opacity="0.25" />
        <rect x="68" y="100" width="28" height="65" rx="4" fill={color} opacity="0.4" />
        <rect x="106" y="70" width="28" height="95" rx="4" fill={color} opacity="0.6" />
        <rect x="144" y="40" width="28" height="125" rx="4" fill={color} opacity="0.85" />
        <path d="M44 120 Q85 90 120 65 T158 35" stroke={color} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5" />
        <circle cx="162" cy="32" r="14" fill={color} />
        <path d="M156 32 L160 36 L168 28" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const IdentityVisual = ({ color }: { color: string }) => (
    <svg viewBox="0 0 200 200" className="w-full h-full" fill="none">
        <path d="M100 20 L165 55 V125 Q165 175 100 195 Q35 175 35 125 V55 Z" stroke={color} strokeWidth="1.5" opacity="0.3" />
        <path d="M100 35 L155 65 V130 Q155 170 100 185 Q45 170 45 130 V65 Z" stroke={color} strokeWidth="1" opacity="0.15" />
        <circle cx="100" cy="95" r="22" stroke={color} strokeWidth="1.5" opacity="0.5" />
        <ellipse cx="100" cy="145" rx="28" ry="18" stroke={color} strokeWidth="1.5" opacity="0.4" />
        <circle cx="140" cy="75" r="16" fill={color} />
        <path d="M134 75 L138 79 L146 71" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const ResultVisual = ({ color }: { color: string }) => (
    <svg viewBox="0 0 200 200" className="w-full h-full" fill="none">
        <text x="100" y="140" textAnchor="middle" fontSize="110" fontWeight="bold" fill={color} opacity="0.08" fontFamily="system-ui, sans-serif">3×</text>
        <line x1="55" y1="160" x2="55" y2="65" stroke={color} strokeWidth="1.5" opacity="0.5" />
        <path d="M48 75 L55 60 L62 75" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
        <line x1="100" y1="160" x2="100" y2="45" stroke={color} strokeWidth="1.5" opacity="0.6" />
        <path d="M93 55 L100 40 L107 55" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
        <line x1="145" y1="160" x2="145" y2="75" stroke={color} strokeWidth="1.5" opacity="0.4" />
        <path d="M138 85 L145 70 L152 85" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
        <rect x="120" y="42" width="48" height="24" rx="12" fill={color} opacity="0.15" />
        <rect x="30" y="58" width="42" height="22" rx="11" fill={color} opacity="0.1" />
        <rect x="72" y="30" width="38" height="20" rx="10" fill={color} opacity="0.18" />
    </svg>
);

const PrivacyVisual = ({ color }: { color: string }) => (
    <svg viewBox="0 0 200 200" className="w-full h-full" fill="none">
        <circle cx="100" cy="115" r="90" stroke={color} strokeWidth="0.5" opacity="0.08" />
        <circle cx="100" cy="115" r="70" stroke={color} strokeWidth="0.5" opacity="0.12" />
        <circle cx="100" cy="115" r="50" stroke={color} strokeWidth="0.5" opacity="0.18" />
        <rect x="75" y="105" width="50" height="40" rx="6" stroke={color} strokeWidth="1.5" opacity="0.8" />
        <path d="M85 105 V92 Q85 70 100 70 Q115 70 115 92 V105" stroke={color} strokeWidth="1.5" opacity="0.8" />
        <circle cx="100" cy="122" r="5" fill={color} opacity="0.35" />
        <rect x="97.5" y="125" width="5" height="9" rx="2" fill={color} opacity="0.35" />
    </svg>
);

const VISUALS = [PassportVisual, PaymentVisual, IdentityVisual, ResultVisual, PrivacyVisual];

// ── Main Component ───────────────────────────────────────────

interface PassportExplainerModalProps {
    open: boolean;
    onClose: () => void;
}

const PassportExplainerModal: React.FC<PassportExplainerModalProps> = ({ open, onClose }) => {
    const [mounted, setMounted] = useState(false);
    const [visible, setVisible] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
            setCurrentSlide(0);
            requestAnimationFrame(() => setVisible(true));
        } else {
            setVisible(false);
            const timer = setTimeout(() => {
                document.body.style.overflow = '';
            }, 300);
            return () => clearTimeout(timer);
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [open]);

    const goToSlide = useCallback((index: number) => {
        if (index < 0 || index >= SLIDES.length) return;
        setCurrentSlide(index);
    }, []);

    const next = useCallback(() => goToSlide(currentSlide + 1), [currentSlide, goToSlide]);
    const prev = useCallback(() => goToSlide(currentSlide - 1), [currentSlide, goToSlide]);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        const diffX = e.changedTouches[0].clientX - touchStartX.current;
        const diffY = e.changedTouches[0].clientY - touchStartY.current;
        if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX < 0) next();
            else prev();
        }
    };

    const handleCTA = useCallback(() => {
        onClose();
        router.push('/account/passport');
    }, [onClose, router]);

    if (!mounted || !open) return null;

    const slide = SLIDES[currentSlide];
    const Visual = VISUALS[currentSlide];

    return createPortal(
        <>
            <style>{`
                @keyframes passportCarouselIn {
                    from { opacity: 0; transform: translateY(16px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
            <div
                className={`fixed inset-0 z-9999 overflow-hidden flex flex-col transition-all duration-300 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                    {/* ── Background layers (cross-fade) ── */}
                    {SLIDES.map((s, i) => (
                        <div
                            key={i}
                            className="absolute inset-0 transition-opacity duration-600"
                            style={{ background: s.background, opacity: currentSlide === i ? 1 : 0 }}
                        />
                    ))}

                    {/* ── Content ── */}
                    <div className="relative flex flex-col h-full">
                        {/* Header: Skip + Close */}
                        <div className="flex items-center justify-between px-5 pt-5 pb-2 shrink-0 pt-safe">
                            <button
                                onClick={onClose}
                                className="text-white/35 hover:text-white/70 text-sm font-medium transition-colors duration-200"
                            >
                                Passer
                            </button>
                            <button
                                onClick={onClose}
                                className="w-9 h-9 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors duration-200"
                                style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Visual area */}
                        <div className="flex-1 flex items-center justify-center px-10 min-h-0">
                            <div
                                key={`v-${currentSlide}`}
                                className="w-full max-w-[260px] aspect-square"
                                style={{ animation: 'passportCarouselIn 0.4s ease-out' }}
                            >
                                <Visual color={slide.color} />
                            </div>
                        </div>

                        {/* Bottom section */}
                        <div className="shrink-0 px-6 pb-6 pb-safe">
                            {/* Dots */}
                            <div className="flex items-center justify-center gap-1.5 mb-5">
                                {SLIDES.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => goToSlide(i)}
                                        className="h-[3px] rounded-full transition-all duration-300"
                                        style={{
                                            width: currentSlide === i ? 24 : 12,
                                            backgroundColor: currentSlide === i ? '#FFFFFF' : 'rgba(255,255,255,0.15)',
                                        }}
                                    />
                                ))}
                            </div>

                            {/* Text */}
                            <div
                                key={`t-${currentSlide}`}
                                className="mb-6"
                                style={{ animation: 'passportCarouselIn 0.4s ease-out 0.05s both' }}
                            >
                                <h2 className="text-[28px] font-bold text-white leading-tight whitespace-pre-line mb-2">
                                    {slide.headline}
                                </h2>
                                <p className="text-[15px] text-white/80 leading-relaxed">
                                    {slide.subtitle}
                                </p>
                            </div>

                            {/* Navigation */}
                            {slide.isCTA ? (
                                <div
                                    key="cta"
                                    style={{ animation: 'passportCarouselIn 0.4s ease-out 0.1s both' }}
                                >
                                    <button
                                        onClick={handleCTA}
                                        className="w-full py-4 rounded-full text-[15px] font-semibold transition-opacity duration-200 hover:opacity-90 cursor-pointer"
                                        style={{
                                            backgroundColor: '#E8A838',
                                            color: '#1A1A1A',
                                            boxShadow: '0 0 30px rgba(232,168,56,0.35)',
                                        }}
                                    >
                                        Créer mon Passeport
                                    </button>
                                    <p className="text-xs text-white/35 text-center mt-3">
                                        Gratuit · Sans engagement
                                    </p>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    {currentSlide > 0 ? (
                                        <button
                                            onClick={prev}
                                            className="w-12 h-12 rounded-full flex items-center justify-center text-white transition-colors duration-200 hover:brightness-125 cursor-pointer"
                                            style={{
                                                backgroundColor: 'rgba(255,255,255,0.06)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                            }}
                                        >
                                            <ArrowLeft size={18} />
                                        </button>
                                    ) : (
                                        <div className="w-12" />
                                    )}
                                    <button
                                        onClick={next}
                                        className="flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-medium transition-colors duration-200 hover:brightness-125 cursor-pointer"
                                        style={{
                                            backgroundColor: 'rgba(255,255,255,0.08)',
                                            border: '1px solid rgba(255,255,255,0.12)',
                                        }}
                                    >
                                        Continuer
                                        <ArrowRight size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
            </div>
        </>,
        document.body
    );
};

export default PassportExplainerModal;
