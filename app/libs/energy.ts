
export const ENERGY_PRICES_2025 = {
    elec: 0.25, // € par kWh
    gas: 0.11,   // € par kWh
    default: 0.20 // Mixte ou inconnu
};

export const DPE_CONSUMPTION: Record<string, number> = {
    'A': 50,  // kWh/m²/an
    'B': 90,
    'C': 150,
    'D': 210,
    'E': 290,
    'F': 380,
    'G': 450
};

export interface EnergyEstimate {
    amount: number;
    source: 'REAL_DPE' | 'ALGO_ESTIMATE';
}

/**
 * Calculates the estimated monthly energy cost for a listing.
 * 
 * Logic:
 * 1. If real DPE costs are provided (min/max), use the average.
 * 2. If not, estimate based on DPE label (consumption) * surface * energy price (heating type).
 *    Correction: DPE is in PRIMARY energy. We must convert to FINAL energy for billing.
 *    - Elec: / 2.3
 *    - Gas/Wood: / 1
 *    - Default: / 1.6
 */
export function getMonthlyEnergyEstimate(listing: any): EnergyEstimate | null {
    if (!listing) return null;

    // CAS 1 : Données réelles (Priorité absolue)
    if (
        typeof listing.energy_cost_min === 'number' &&
        typeof listing.energy_cost_max === 'number' &&
        listing.energy_cost_max > 0
    ) {
        const avgAnnual = (listing.energy_cost_min + listing.energy_cost_max) / 2;
        return {
            amount: Math.round(avgAnnual / 12),
            source: 'REAL_DPE'
        };
    }

    // CAS 2 : Calcul algorithmique (Fallback)
    if (listing.dpe && listing.surface) {
        const label = listing.dpe.toUpperCase().trim();
        const consumption = DPE_CONSUMPTION[label];

        if (!consumption) return null;

        let priceKwh = ENERGY_PRICES_2025.default;
        let conversionFactor = 1.6; // Default conversion factor (prudential mix)

        // Check heating system if available
        if (listing.heatingSystem) {
            const heating = listing.heatingSystem.toUpperCase();
            if (heating.includes('ELEC') || heating.includes('REV_AC') || heating.includes('PAC')) {
                priceKwh = ENERGY_PRICES_2025.elec;
                conversionFactor = 2.3;
            } else if (heating.includes('GAS') || heating.includes('GAZ') || heating.includes('WOOD') || heating.includes('BOIS')) {
                priceKwh = ENERGY_PRICES_2025.gas;
                conversionFactor = 1;
            }
        }

        // Convert Primary Energy (DPE) to Final Energy (Factured)
        const finalConsumption = consumption / conversionFactor;

        const estimatedAnnual = listing.surface * finalConsumption * priceKwh;

        return {
            amount: Math.round(estimatedAnnual / 12),
            source: 'ALGO_ESTIMATE'
        };
    }

    return null;
}
