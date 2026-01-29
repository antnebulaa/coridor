'use server';

import prisma from "@/libs/prismadb";

interface CalculateRevisionResult {
    success: boolean;
    data?: {
        baseIndex: { value: number; quarter: string };
        newIndex: { value: number; quarter: string };
        maxRent: number;
        formula: string;
    };
    error?: string;
}

export async function calculateRevision(
    currentRent: number,
    leaseStartDate: Date,
    effectiveDate: Date | string
): Promise<CalculateRevisionResult> {
    try {
        const effectDateObj = new Date(effectiveDate);
        if (isNaN(effectDateObj.getTime())) {
            return { success: false, error: "Date d'effet invalide." };
        }

        // 1. Determine Reference Quarter (Quarter of Lease Start)
        const startMonth = leaseStartDate.getMonth(); // 0-11
        const leaseQuarter = Math.floor(startMonth / 3) + 1; // 1-4

        // Target Year for Index is usually Year - 1 relative to Effective Year
        // e.g. Revision 2026 uses Index 2025.
        // We look for the index of the relevant quarter in (EffectiveYear - 1).
        const effectiveYear = effectDateObj.getFullYear();
        const targetIndexYear = effectiveYear - 1;

        // Find the Target Index (Year - 1)
        const latestIndex = await prisma.rentIndex.findUnique({
            where: {
                year_quarter: {
                    year: targetIndexYear,
                    quarter: leaseQuarter
                }
            }
        });

        if (!latestIndex) {
            return { success: false, error: `Index de référence pour T${leaseQuarter} ${targetIndexYear} introuvable (Données manquantes).` };
        }

        // Find the Previous Index (Year - 2)
        const previousIndex = await prisma.rentIndex.findUnique({
            where: {
                year_quarter: {
                    year: targetIndexYear - 1,
                    quarter: leaseQuarter
                }
            }
        });

        if (!previousIndex) {
            return { success: false, error: `Index précédent (T${leaseQuarter} ${targetIndexYear - 1}) introuvable.` };
        }

        // 2. Calculate Max Rent
        // Formula: CurrentRent * (NewIndex / OldIndex)
        // Round to 2 decimals
        const ratio = latestIndex.value / previousIndex.value;
        const newRent = Math.round(currentRent * ratio * 100) / 100;

        return {
            success: true,
            data: {
                baseIndex: {
                    value: previousIndex.value,
                    quarter: `T${previousIndex.quarter} ${previousIndex.year}`
                },
                newIndex: {
                    value: latestIndex.value,
                    quarter: `T${latestIndex.quarter} ${latestIndex.year}`
                },
                maxRent: newRent,
                formula: `${currentRent} € x (${latestIndex.value} / ${previousIndex.value})`
            }
        };

    } catch (error) {
        console.error("Error calculating revision:", error);
        return { success: false, error: "Erreur lors du calcul de la révision." };
    }
}
