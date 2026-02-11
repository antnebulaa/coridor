'use client';

import React from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Star, Zap, Heart, Check, Lock } from 'lucide-react';

const subscriptions = [
    {
        id: 'gold',
        name: 'gold',
        icon: Star,
        color: 'text-yellow-600',
        bgGradient: 'bg-gradient-to-tr from-yellow-200 via-yellow-100 to-yellow-50',
        buttonGradient: 'bg-gradient-to-r from-yellow-500 to-yellow-600',
        features: [
            'Voir qui a liké ton profil',
            'Likes illimités',
            '5 Superlikes par semaine',
            'Retours en arrière illimités'
        ],
        price: '14,99€ / mois'
    },
    {
        id: 'plus',
        name: 'plus',
        icon: Heart,
        color: 'text-rose-500',
        bgGradient: 'bg-gradient-to-tr from-violet-300 via-violet-100 to-violet-50',
        buttonGradient: 'bg-gradient-to-r from-violet-500 to-violet-800',
        features: [
            'Likes illimités',
            'Retours en arrière illimités',
            'Masquer les pubs',
            'Passeport Monde'
        ],
        price: '8,99€ / mois'
    },
    {
        id: 'pro',
        name: 'pro',
        icon: Zap,
        color: 'text-neutral-800',
        bgGradient: 'bg-gradient-to-tr from-slate-300 via-slate-100 to-white',
        buttonGradient: 'bg-gradient-to-r from-neutral-500 to-neutral-800',
        features: [
            'Tous les avantages Gold',
            'Priorité des likes',
            'Message avant de matcher',
            'Vues sur les profils envoyés'
        ],
        price: '24,99€ / mois'
    }
];

const SubscriptionCarousel = () => {
    const [emblaRef] = useEmblaCarousel({
        align: 'center', // Center the active slide
        containScroll: false, // Allow full scrolling
        loop: false
    });

    return (
        <div className="w-full mt-8">
            <h2 className="text-xl font-medium mb-2 flex items-center gap-2 px-1">
                <Zap size={20} className="text-yellow-500 fill-yellow-500" />
                Boostez votre recherche
            </h2>

            <div className="overflow-hidden -mx-6 px-2 pb-2" ref={emblaRef}>
                <div className="flex gap-2 touch-pan-y">
                    {subscriptions.map((sub) => (
                        <div
                            key={sub.id}
                            className={`flex-[0_0_90%] sm:flex-[0_0_45%] md:flex-[0_0_40%] min-w-0 relative rounded-[32px] p-4 flex flex-col h-[320px] shadow-sm border-1 border-neutral-200 ${sub.bgGradient}`}
                        >
                            {/* Header: Name Left, Button Right */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <sub.icon size={24} className={`fill-current ${sub.color}`} />
                                    <h3 className={`text-2xl font-semibold tracking-tight ${sub.color}`}>
                                        {sub.name.replace('Coridor ', '')}
                                    </h3>
                                    {sub.id !== 'plus' && (
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border border-current opacity-70 ${sub.color}`}>
                                            {sub.id}
                                        </span>
                                    )}
                                </div>
                                <button className={`px-4 py-2.5 rounded-full text-white text-xs font-semibold shadow-sm transform active:scale-95 transition ${sub.buttonGradient}`}>
                                    Mettre à jour
                                </button>
                            </div>

                            {/* Features Comparison Header */}
                            <div className="grid grid-cols-[1fr_auto_auto] gap-4 mb-2 px-">
                                <span className="text-sm font-bold text-neutral-800">Fonctionnalités incluses</span>
                                <span className="text-xs font-bold text-neutral-500 text-center w-8">Gratuit</span>
                                <span className={`text-xs font-bold text-center w-8 ${sub.color}`}>{sub.name.replace('Coridor ', '')}</span>
                            </div>

                            {/* Features List Comparison */}
                            <div className="flex-1 space-y-1">
                                {sub.features.slice(0, 4).map((feature, idx) => (
                                    <div key={idx} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 py-2 border-b border-black/5 last:border-0">
                                        <span className="text-sm font-medium text-neutral-800/90 leading-tight">{feature}</span>
                                        <div className="w-8 flex justify-center">
                                            <div className="bg-neutral-200/50 p-1 rounded-full">
                                                <Lock size={12} className="text-neutral-400" />
                                            </div>
                                        </div>
                                        <div className="w-8 flex justify-center">
                                            <Check size={18} className={`shrink-0 ${sub.color}`} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Footer: Voir toutes les fonctionnalités */}
                            <div className="mt-auto pt-4 flex justify-center">
                                <button className="text-xs font-bold text-neutral-600 uppercase tracking-wide hover:text-neutral-900 transition">
                                    Voir toutes les fonctionnalités
                                </button>
                            </div>

                            {/* Dots Pagination (Visual only for now since we rely on scroll snap) */}

                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SubscriptionCarousel;
