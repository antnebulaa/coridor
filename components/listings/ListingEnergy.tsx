'use client';

import { HelpCircle } from "lucide-react";

interface ListingEnergyProps {
    dpe?: string | null;
    ges?: string | null;
}

const ListingEnergy: React.FC<ListingEnergyProps> = ({ dpe, ges }) => {
    if (!dpe && !ges) return null;

    const grades = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const cleanDpe = dpe?.trim().toUpperCase();
    const cleanGes = ges?.trim().toUpperCase();

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

    // Helper to determine text color for contrast
    const getTextColor = (grade: string, type: 'dpe' | 'ges') => {
        if (type === 'ges' && ['F', 'G'].includes(grade)) return 'white';
        if (type === 'dpe' && ['A', 'B', 'G'].includes(grade)) return 'white';
        return 'black';
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row gap-8 md:gap-16">
                {/* DPE Section */}
                {dpe && (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 text-neutral-500 font-light">
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
                                            ${isActive ? 'w-10 h-12 shadow-md z-10 scale-110 rounded-sm' : 'w-8 h-8 opacity-50'}
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
                        <div className="flex items-center gap-2 text-neutral-500 font-light">
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
                                            ${isActive ? 'w-10 h-12 shadow-md z-10 scale-110 rounded-sm' : 'w-8 h-8 opacity-50'}
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
