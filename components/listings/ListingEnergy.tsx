'use client';

import { useMemo } from "react";

import {
    HelpCircle,
    Zap,
    Flame,
    Building2,
    Factory,
    Fan,
    Trees,
    Snowflake,
    Thermometer,
    Layers
} from "lucide-react";

import { SafeListing } from "@/types";
import { getMonthlyEnergyEstimate } from "@/app/libs/energy";

interface ListingEnergyProps {
    dpe?: string | null;
    ges?: string | null;
    heatingSystem?: string | null;
    glazingType?: string | null;
    listing?: SafeListing;
}

const ListingEnergy: React.FC<ListingEnergyProps> = ({ dpe, ges, heatingSystem, glazingType, listing }) => {
    if (!dpe && !ges) return null;

    const grades = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const cleanDpe = dpe?.trim().toUpperCase();
    const cleanGes = ges?.trim().toUpperCase();

    const monthlyEstimate = useMemo(() => {
        if (!listing) {
            console.log('ListingEnergy: No listing provided');
            return null;
        }
        console.log('ListingEnergy: listing data', {
            surface: listing.surface,
            dpe: listing.dpe,
            heatingSystem: listing.heatingSystem,
            min: listing.energy_cost_min,
            max: listing.energy_cost_max
        });

        const estimate = getMonthlyEnergyEstimate(listing);
        console.log('ListingEnergy: Calculated estimate', estimate);
        return estimate;
    }, [listing]);

    const getDpeColor = (grade: string) => {
        switch (grade) {
            case 'A': return '#30953a';
            case 'B': return '#50a747';
            case 'C': return '#c8df46';
            case 'D': return '#f3e51f';
            case 'E': return '#f0b41c';
            case 'F': return '#eb8234';
            case 'G': return '#d7231e';
            default: return '#e5e5e5';
        }
    };

    const getGesColor = (grade: string) => {
        switch (grade) {
            case 'A': return '#f6f3fc';
            case 'B': return '#e2d5f6';
            case 'C': return '#cfbbf0';
            case 'D': return '#bba0ea';
            case 'E': return '#a785e3';
            case 'F': return '#9167dd';
            case 'G': return '#7844d4';
            default: return '#e5e5e5';
        }
    };

    const getTextColor = (grade: string, type: 'dpe' | 'ges') => {
        if (type === 'ges' && ['F', 'G'].includes(grade)) return 'white';
        if (type === 'dpe' && ['A', 'B', 'G'].includes(grade)) return 'white';
        return 'black';
    }

    const heatingInfo = useMemo(() => {
        switch (heatingSystem) {
            case 'IND_ELEC': return { label: 'Individuel Électrique', icon: Zap };
            case 'IND_GAS': return { label: 'Individuel Gaz', icon: Flame };
            case 'COL_GAS': return { label: 'Collectif Gaz (Inclus dans les charges)', icon: Building2 };
            case 'COL_URB': return { label: 'Collectif Urbain (Inclus dans les charges)', icon: Factory };
            case 'PAC': return { label: 'Pompe à Chaleur', icon: Fan };
            case 'WOOD': return { label: 'Bois / Granulés', icon: Trees };
            case 'REV_AC': return { label: 'Clim. Réversible', icon: Snowflake };
            default: return null;
        }
    }, [heatingSystem]);

    const glazingInfo = useMemo(() => {
        switch (glazingType) {
            case 'SINGLE': return { label: 'Simple vitrage', icon: Layers };
            case 'DOUBLE': return { label: 'Double vitrage', icon: Layers };
            case 'TRIPLE': return { label: 'Triple vitrage', icon: Layers };
            default: return null;
        }
    }, [glazingType]);

    return (
        <div className="flex flex-col gap-6">
            {(heatingInfo || glazingInfo) && (
                <div className="flex flex-col gap-4">
                    <div className="text-xl font-semibold flex items-center gap-2">
                        <Thermometer size={24} />
                        Chauffage & Isolation
                    </div>
                    <div className="flex flex-wrap gap-4">
                        {heatingInfo && (
                            <div className="flex items-center gap-3 text-neutral-600 bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                                <heatingInfo.icon size={20} className="text-neutral-900" />
                                <span className="font-medium text-neutral-900">{heatingInfo.label}</span>
                            </div>
                        )}
                        {glazingInfo && (
                            <div className="flex items-center gap-3 text-neutral-600 bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                                <glazingInfo.icon size={20} className="text-neutral-900" />
                                <span className="font-medium text-neutral-900">{glazingInfo.label}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Energy Estimate Section */}
            {monthlyEstimate && (
                <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-semibold">
                            <Zap size={20} className="text-yellow-500 fill-yellow-500" />
                            <span>~{monthlyEstimate.amount} € / mois</span>
                        </div>
                        <div className={`
                            text-xs font-bold px-2 py-1 rounded
                            ${monthlyEstimate.source === 'REAL_DPE' ? 'bg-green-100 text-green-700' : 'bg-neutral-200 text-neutral-600'}
                        `}>
                            {monthlyEstimate.source === 'REAL_DPE' ? 'Estimation DPE' : 'Estimation App'}
                        </div>
                    </div>

                    <div className="text-sm text-neutral-500">
                        {monthlyEstimate.source === 'REAL_DPE' ? (
                            <span>
                                Montant théorique estimé entre {listing!.energy_cost_min}€ et {listing!.energy_cost_max}€/an selon le diagnostic fourni.
                            </span>
                        ) : (
                            <span>
                                Calcul théorique basé sur la surface ({listing?.surface}m²) et le classement énergétique ({cleanDpe}).
                            </span>
                        )}
                    </div>

                    <div className="text-[10px] text-neutral-400 mt-1">
                        Estimation des coûts annuels d'énergie du logement pour un usage standard (chauffage, eau chaude, éclairage, auxiliaires). Les prix de l'énergie peuvent varier.
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-8">
                {/* DPE Section */}
                {dpe && (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 text-neutral-500 font-normal">
                            <span>Classe énergie</span>
                            <HelpCircle size={16} className="text-neutral-400" />
                        </div>
                        <div className="flex flex-row items-end gap-1 h-12">
                            {grades.map((grade) => {
                                const isActive = cleanDpe === grade;
                                const color = getDpeColor(grade);
                                const textColor = getTextColor(grade, 'dpe');
                                return (
                                    <div
                                        key={`dpe-${grade}`}
                                        style={{ backgroundColor: color, color: isActive ? textColor : 'black' }}
                                        className={`
                                            flex items-center justify-center font-bold text-sm
                                            ${isActive ? 'w-8 h-12 z-10 rounded-sm' : 'w-8 h-8 opacity-50'}
                                            transition-all duration-200
                                        `}
                                    >
                                        {grade}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* GES Section */}
                {ges && (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 text-neutral-500 font-normal">
                            <span>GES</span>
                            <HelpCircle size={16} className="text-neutral-400" />
                        </div>
                        <div className="flex flex-row items-end gap-1 h-12">
                            {grades.map((grade) => {
                                const isActive = cleanGes === grade;
                                const color = getGesColor(grade);
                                const isDark = ['E', 'F', 'G'].includes(grade);
                                return (
                                    <div
                                        key={`ges-${grade}`}
                                        style={{ backgroundColor: color }}
                                        className={`
                                            flex items-center justify-center font-bold text-sm
                                            ${isActive ? 'w-8 h-12 z-10 rounded-sm' : 'w-8 h-8 opacity-50'}
                                            ${isActive && isDark ? 'text-white' : 'text-neutral-900'}
                                            transition-all duration-200
                                        `}
                                    >
                                        {grade}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ListingEnergy;
