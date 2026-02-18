import prisma from "@/libs/prismadb";
import {
    RentalApplication,
    Listing,
    TenantCandidateScope,
    User,
    TenantProfile,
    CompositionType,
    CoupleLegalStatus,
    TargetLeaseType,
    SpecificLeaseRequest
} from "@prisma/client";
import { LEASE_CLAUSES } from "./LeaseClauses";

// Internal Types
export type LeaseTemplateId =
    | "BAIL_NU_LOI_89"
    | "BAIL_MEUBLE_LOI_89"
    | "BAIL_ETUDIANT"
    | "BAIL_MOBILITE";

export interface LeaseConfig {
    lease_template_id: LeaseTemplateId;
    is_solidarity_clause_active: boolean;

    // Parties
    landlord: {
        name: string;
        address: string;
        email: string;
        phone: string;
        birthDate?: string;
        birthPlace?: string;
        legal_status?: string;  // PERSONNE_PHYSIQUE, SCI, PERSONNE_MORALE
        siren?: string;
        siege?: string;
        nationality?: string;
    };
    tenants: Array<{
        name: string;
        email: string;
        phone: string;
        firstName: string;
        lastName: string;
        birthDate?: string;
        birthPlace?: string;
        nationality?: string;
    }>;

    // Property
    property: {
        address: string;
        city: string;
        surface: number;
        roomCount: number;
        type: string; // Appartement / Maison
        description: string;
        constructionDate?: number; // Build Year
        heatingType?: string;
        waterHeatingType?: string; // Hot water
        legal_regime?: string;  // COPROPRIETE, MONOPROPRIETE

        // NEW FIELDS
        fiber_optics: boolean; // Technologie
        ancillary_premises: string[]; // Cave, Parking
        common_areas: string[]; // Ascenseur, Local vélo
    };

    // Financials
    contract_data: {
        effective_date: string; // YYYY-MM-DD
        duration_months: number;
        security_deposit: number;
        rent_excluding_charges: number;
        charges_amount: number;
        total_rent: number;
        payment_date: number; // Day of month (e.g. 1st or 5th)
        payment_method: string;

        // NEW FIELDS
        previous_rent_amount?: number; // Zone Tendue requirement
        previous_rent_payment_date?: string;
        agency_fees_amount: number; // Honoraires (0 if direct)
        recent_works_amount: number; // Travaux récents
        recent_works_description: string;
        indexation_quarter?: number;  // Trimestre IRL de référence (1-4)
        base_index_value?: number;    // Valeur IRL de base
    };

    // Agency Fees (Section IX)
    agency_fees: {
        is_applicable: boolean;
        legal_text_reference: string;
        inventory_check_type: 'AMICABLE' | 'HUISSIER';
        amounts: {
            tenant_visit_file_drafting: number;
            tenant_inventory_check: number;
            landlord_total: number;
        };
    };

    // Rent Control (Encadrement des loyers)
    rent_control?: {
        is_applicable: boolean;
        reference_rent: number;
        reference_rent_increased: number;
        rent_supplement?: number;
        rent_supplement_justification?: string;
    };

    mobility_reason?: string;

    diagnostics?: {
        dpe?: { date: string; rating: string; expiryDate?: string };
        erp?: { date: string };
        electrical?: { date: string; installYear?: number };
        gas?: { date: string; installYear?: number; hasInstallation: boolean };
        lead?: { date: string; result: string };
        asbestos?: { date: string; result: string };
        noise?: { date: string; result: string };
    };

    dynamic_legal_texts: {
        solidarity_clause: string | null;
        termination_clause: string;
        resolutory_clause: string;
        subletting_clause: string;
        insurance_clause: string;
        preemption_clause: string | null;
    };

    furniture_inventory?: {
        items: Array<{ label: string; present: boolean; }>;
    };
    guarantor_names?: string[];

    // Additional data passed through for PDF
    listing_id: string;
    application_id: string;
    metadata: {
        status: string;
        signedLeaseUrl?: string | null;
    };
}

export class LeaseService {

    /**
     * Index Rent (IRL Revision)
     */
    static async indexRent(
        applicationId: string,
        baseRentCents: number,
        serviceChargesCents: number,
        effectiveDate: Date
    ) {
        // 1. Find active financial record
        const activeFinancial = await prisma.leaseFinancials.findFirst({
            where: {
                rentalApplicationId: applicationId,
                endDate: null
            }
        });

        if (activeFinancial) {
            // Close it the day before effective date
            const endDate = new Date(effectiveDate);
            endDate.setDate(endDate.getDate() - 1);

            await prisma.leaseFinancials.update({
                where: { id: activeFinancial.id },
                data: { endDate: endDate }
            });
        }

        // 2. Create new record
        await prisma.leaseFinancials.create({
            data: {
                rentalApplicationId: applicationId,
                baseRentCents,
                serviceChargesCents,
                startDate: effectiveDate,
                endDate: null
            }
        });
    }

    /**
     * Main entry point to generate the Lease Configuration from an Application ID.
     */
    static async generateLeaseConfig(applicationId: string): Promise<LeaseConfig> {
        // 1. Fetch all necessary data
        const application = await prisma.rentalApplication.findUnique({
            where: { id: applicationId },
            include: {
                listing: {
                    include: {
                        furniture: true,
                        rentalUnit: {
                            include: {
                                property: {
                                    include: {
                                        owner: true // Fetch landlord details
                                    }
                                }
                            }
                        }
                    }
                },
                candidateScope: {
                    include: {
                        creatorUser: {
                            include: { tenantProfile: true }
                        }
                    }
                }
            }
        });

        if (!application) throw new Error("Application not found");
        if (!application.listing || !application.listing.rentalUnit || !application.listing.rentalUnit.property) throw new Error("Listing data incomplete");
        if (!application.candidateScope) throw new Error("Candidate Scope not found");

        const rentalUnit = application.listing.rentalUnit;
        const property = rentalUnit.property as any;
        const landlord = property.owner;
        const scope = application.candidateScope;


        // Fetch full profiles of all members
        let members = await prisma.user.findMany({
            where: { id: { in: scope.membersIds } },
            include: { tenantProfile: { include: { guarantors: true } } }
        });

        // FALLBACK: If members list is empty, use the creator (Solo application case or data migration issue)
        if (members.length === 0 && scope.creatorUser) {
            members = [scope.creatorUser as any];
        }

        // Validate required identity fields (décret 2015-587)
        if (!landlord.birthDate || !landlord.birthPlace) {
            throw new Error("Date et lieu de naissance du bailleur requis pour la génération du bail. Veuillez compléter votre profil.");
        }
        for (const member of members) {
            if (!member.birthDate || !member.birthPlace) {
                throw new Error(`Date et lieu de naissance requis pour ${member.firstName || member.name || 'un locataire'}. Le locataire doit compléter son profil.`);
            }
        }

        // 2. Determine Lease Type (Rule 1)
        const leaseTemplateId = this.determineLeaseTemplate(rentalUnit as any, application, scope, members as any);

        // 3. Determine Solidarity (Rule 2)
        const isSolidarityActive = this.determineSolidarity(scope);

        // 4. Calculate Contract Data (Duration, Deposit)
        const contractData = this.calculateContractData(leaseTemplateId, application.listing, application, scope.targetMoveInDate);

        // 5. Select Legal Texts
        const legalTexts = this.getLegalClauses(leaseTemplateId, isSolidarityActive, scope.compositionType);

        const formatDate = (d: Date | null) => d ? d.toISOString().split('T')[0] : undefined;
        // Helper to format name
        const formatName = (u: any) => {
            if (u.firstName && u.lastName) return `${u.firstName} ${u.lastName}`;
            return u.name || "Nom inconnu";
        };

        // Helper to format address
        const formatAddress = (u: any) => {
            if (u.addressLine1 && u.zipCode && u.city) {
                const extras = [];
                if (u.apartment) extras.push(`Appt ${u.apartment}`);
                if (u.building) extras.push(`Bat ${u.building}`);
                const extraString = extras.length > 0 ? `, ${extras.join(', ')}` : '';
                return `${u.addressLine1}${extraString}, ${u.zipCode} ${u.city}`;
            }
            return u.address || "Adresse non renseignée";
        };

        // 6. Map Details
        const landlordAddress = landlord.address || "Adresse non renseignée";
        const propertyAddress = (property.addressLine1 && property.zipCode && property.city)
            ? formatAddress(property as any)
            : (property.locationValue || (property as any).city || "Adresse du bien non renseignée");

        // Helper to map heating codes
        const mapHeating = (code: string | null) => {
            if (!code) return "Individuel électrique (Par défaut)";
            const map: Record<string, string> = {
                'COL_URB': 'Collectif (Réseau Urbain)',
                'COL_GAZ': 'Collectif (Gaz)',
                'COL_FIO': 'Collectif (Fioul)',
                'IND_ELEC': 'Individuel (Électrique)',
                'IND_GAZ': 'Individuel (Gaz)',
                'IND': 'Individuel',
                'COL': 'Collectif'
            };
            return map[code] || code;
        };

        // Determine if furnished
        const isFurnished = leaseTemplateId !== "BAIL_NU_LOI_89";

        return {
            lease_template_id: leaseTemplateId,
            is_solidarity_clause_active: isSolidarityActive,

            landlord: {
                name: formatName(landlord),
                address: formatAddress(landlord),
                email: landlord.email || "",
                phone: landlord.phoneNumber || "",
                birthDate: formatDate(landlord.birthDate),
                birthPlace: landlord.birthPlace || undefined,
                legal_status: property.ownerLegalStatus || "PERSONNE_PHYSIQUE",
                siren: property.ownerSiren || undefined,
                siege: property.ownerSiege || undefined,
                nationality: landlord.nationality || undefined,
            },
            tenants: members.map(m => ({
                name: formatName(m),
                address: formatAddress(m), // Using Tenant address if available (usually needed for "Domicile" if different, but typically in Lease it's "Domicilié à [Current Address]")
                email: m.email || "",
                phone: (m as any).phoneNumber || "",
                firstName: (m as any).firstName || m.name?.split(' ')[0] || "",
                lastName: (m as any).lastName || m.name?.split(' ').slice(1).join(' ') || "",
                birthDate: formatDate(m.birthDate),
                birthPlace: m.birthPlace || undefined,
                nationality: (m as any).nationality || undefined,
            })),

            property: {
                address: propertyAddress,
                city: property.city || "",
                surface: rentalUnit.surface || 0,
                roomCount: rentalUnit.roomCount || application.listing.roomCount || 0,
                type: property.category,
                description: application.listing.description || '',
                constructionDate: property.buildYear || undefined,
                heatingType: mapHeating(property.heatingSystem),
                waterHeatingType: mapHeating(property.waterHeatingSystem || property.heatingSystem),
                legal_regime: property.legalRegime || undefined,

                // Dynamic fields from property
                fiber_optics: property.hasFiber ?? false,
                ancillary_premises: [
                    ...(property.hasCave ? [`Cave${property.caveReference ? ` (${property.caveReference})` : ''}`] : []),
                    ...(property.hasParking ? [`Parking${property.parkingReference ? ` (${property.parkingReference})` : ''}`] : []),
                    ...(property.hasGarage ? [`Garage${property.garageReference ? ` (${property.garageReference})` : ''}`] : []),
                ],
                common_areas: [
                    ...(property.hasElevator ? ["Ascenseur"] : []),
                    ...(property.hasBikeRoom ? ["Local vélos"] : []),
                    ...(property.hasDigicode ? ["Digicode"] : []),
                    ...(property.hasIntercom ? ["Interphone"] : []),
                    ...(property.hasCaretaker ? ["Gardien / Concierge"] : []),
                    ...(property.hasPool ? ["Piscine"] : []),
                ],
            },

            contract_data: {
                ...contractData,
                // Dynamic fields
                previous_rent_amount: undefined, // To be filled manually or from history logic later
                agency_fees_amount: 0,
                recent_works_amount: (application.listing.recentWorksAmountCents || 0) / 100,
                recent_works_description: application.listing.recentWorksDescription || "Néant",
            },

            agency_fees: {
                is_applicable: false,
                legal_text_reference: "Art. 5 Loi 89-462",
                inventory_check_type: 'AMICABLE', // Default for P2P
                amounts: {
                    tenant_visit_file_drafting: 0.00,
                    tenant_inventory_check: 0.00,
                    landlord_total: 0.00
                }
            },

            // Rent control (encadrement des loyers)
            rent_control: property.isZoneTendue ? {
                is_applicable: true,
                reference_rent: property.referenceRent || 0,
                reference_rent_increased: property.referenceRentIncreased || 0,
                rent_supplement: property.rentSupplement || undefined,
                rent_supplement_justification: property.rentSupplementJustification || undefined,
            } : undefined,

            mobility_reason: (application as any).mobilityReason || undefined,

            diagnostics: {
                dpe: property.dpeDate ? {
                    date: formatDate(property.dpeDate) as string,
                    rating: property.dpe || '',
                    expiryDate: formatDate(property.dpeExpiryDate) || undefined,
                } : undefined,
                erp: property.erpDate ? {
                    date: formatDate(property.erpDate) as string,
                } : undefined,
                electrical: property.electricalDiagnosticDate ? {
                    date: formatDate(property.electricalDiagnosticDate) as string,
                    installYear: property.electricalInstallYear || undefined,
                } : undefined,
                gas: property.gasDiagnosticDate ? {
                    date: formatDate(property.gasDiagnosticDate) as string,
                    installYear: property.gasInstallYear || undefined,
                    hasInstallation: property.hasGasInstallation ?? false,
                } : undefined,
                lead: property.leadDiagnosticDate ? {
                    date: formatDate(property.leadDiagnosticDate) as string,
                    result: property.leadDiagnosticResult || '',
                } : undefined,
                asbestos: property.asbestosDiagnosticDate ? {
                    date: formatDate(property.asbestosDiagnosticDate) as string,
                    result: property.asbestosDiagnosticResult || '',
                } : undefined,
                noise: property.noiseDiagnosticDate ? {
                    date: formatDate(property.noiseDiagnosticDate) as string,
                    result: property.noiseDiagnosticResult || '',
                } : undefined,
            },

            dynamic_legal_texts: legalTexts,

            // Furniture inventory (only for furnished leases)
            furniture_inventory: isFurnished && (application.listing as any).furniture ? (() => {
                const f = (application.listing as any).furniture;
                const FURNITURE_LABELS: Record<string, string> = {
                    bedding: "Literie (couette ou couverture)",
                    curtains: "Dispositif d'occultation des fenêtres (rideaux/volets)",
                    hob: "Plaques de cuisson",
                    oven: "Four ou four à micro-ondes",
                    fridge: "Réfrigérateur",
                    freezer: "Congélateur ou compartiment congélation",
                    dishes: "Vaisselle en nombre suffisant",
                    utensils: "Ustensiles de cuisine",
                    table: "Table",
                    seats: "Sièges (chaises)",
                    shelves: "Étagères de rangement",
                    lights: "Luminaires",
                    vacuum: "Matériel d'entretien ménager",
                };
                return {
                    items: Object.entries(FURNITURE_LABELS).map(([key, label]) => ({
                        label,
                        present: !!f[key],
                    })),
                };
            })() : undefined,

            // Guarantors (for annexe mention)
            guarantor_names: (() => {
                const names: string[] = [];
                for (const m of members) {
                    if ((m as any).tenantProfile?.guarantors) {
                        for (const g of (m as any).tenantProfile.guarantors) {
                            // Use type to build label
                            const typeLabels: Record<string, string> = {
                                FAMILY: 'Garant familial',
                                THIRD_PARTY: 'Garant tiers',
                                VISALE: 'Garantie Visale',
                                LEGAL_ENTITY: 'Personne morale',
                                CAUTIONNER: 'Cautionner',
                            };
                            names.push(typeLabels[g.type] || 'Garant');
                        }
                    }
                }
                return names.length > 0 ? names : undefined;
            })(),

            listing_id: application.listingId,
            application_id: application.id,
            metadata: {
                status: application.leaseStatus,
                signedLeaseUrl: application.signedLeaseUrl
            }
        };
    }

    /**
     * RULE 1: Determine Lease Type
     */
    private static determineLeaseTemplate(
        rentalUnit: any,
        application: RentalApplication,
        scope: TenantCandidateScope,
        members: (User & { tenantProfile: TenantProfile | null })[]
    ): LeaseTemplateId {

        // 1. Unfurnished (Vide) -> Always BAIL_NU_LOI_89
        if (!rentalUnit.isFurnished) {
            return "BAIL_NU_LOI_89";
        }

        // 2. Furnished Logic
        // Check "Specific Request" first if set
        if (application.specificLeaseRequest === "STUDENT") {
            return "BAIL_ETUDIANT";
        }

        if (application.specificLeaseRequest === "MOBILITY") {
            return "BAIL_MOBILITE";
        }

        // Check if explicit student lease requested via Duration or Logic
        const allStudents = members.every(m =>
            m.tenantProfile?.jobType === 'STUDENT'
        );

        if (allStudents && application.specificLeaseRequest === "DEFAULT") {
            return "BAIL_MEUBLE_LOI_89";
        }

        // Default Furnished
        return "BAIL_MEUBLE_LOI_89";
    }

    /**
     * RULE 2: Determine Solidarity
     */
    private static determineSolidarity(scope: TenantCandidateScope): boolean {
        // SOLO -> No
        if (scope.compositionType === "SOLO") return false;

        // COUPLE
        if (scope.compositionType === "COUPLE") {
            if (scope.coupleLegalStatus === "MARRIED" || scope.coupleLegalStatus === "PACS") {
                return true;
            }
            if (scope.coupleLegalStatus === "CONCUBINAGE") {
                return true;
            }
            return true;
        }

        // GROUP (Colocation) -> YES
        if (scope.compositionType === "GROUP") return true;

        return false;
    }

    /**
     * Calculate Duration, Deposit, and Financials
     */
    private static calculateContractData(
        templateId: LeaseTemplateId,
        listing: any,
        application: RentalApplication,
        targetMoveInDate: Date | null
    ) {
        let duration = 12; // months
        let deposit = 0;

        // --- NEW LOGIC START ---
        // Rent Excluding Charges (price is on Listing, not RentalUnit)
        const rentHC = listing.price;

        // Extract Charges (charges is on Listing, not RentalUnit)
        let chargesAmount = 0;
        if (listing.charges) {
            // Check if it's a number directly
            if (typeof listing.charges === 'number') {
                chargesAmount = listing.charges;
            }
            // Check if it looks like a string number
            else if (typeof listing.charges === 'string' && !isNaN(parseFloat(listing.charges))) {
                chargesAmount = parseFloat(listing.charges);
            }
            // If it's an object, we rely on a convention.
            // For now, assume if object it might be { amount: number } or similar,
            // but user said "column charges", implying value.
            // Let's safe cast if we find simple properties or fallback to 0.
            else if (typeof listing.charges === 'object') {
                // @ts-ignore
                if (listing.charges?.amount) chargesAmount = Number(listing.charges.amount);
                // @ts-ignore
                else if (listing.charges?.value) chargesAmount = Number(listing.charges.value);
            }
        }

        const totalRent = rentHC + chargesAmount;
        // --- NEW LOGIC END ---


        switch (templateId) {
            case "BAIL_NU_LOI_89":
                duration = (application as any).leaseDurationMonths || 36; // 3 years standard
                deposit = rentHC * 1; // 1 month HC (of rent without charges)
                break;

            case "BAIL_MEUBLE_LOI_89":
                duration = (application as any).leaseDurationMonths || 12; // 1 year automatic renewal
                deposit = rentHC * 2; // 2 months HC
                break;

            case "BAIL_ETUDIANT":
                duration = (application as any).leaseDurationMonths || 9;
                deposit = rentHC * 2;
                break;

            case "BAIL_MOBILITE":
                duration = (application as any).leaseDurationMonths || 10;
                if (duration < 1 || duration > 10) {
                    throw new Error("La durée du bail mobilité doit être comprise entre 1 et 10 mois");
                }
                deposit = 0; // Forbidden in Bail Mobilité
                break;
        }

        // Adjust deposit if stored in listing explicitly (securityDeposit is on Listing)
        if (listing.securityDeposit !== null && listing.securityDeposit !== undefined) {
            if (templateId === "BAIL_MOBILITE") {
                deposit = 0;
            } else {
                deposit = listing.securityDeposit;
            }
        }

        return {
            effective_date: (targetMoveInDate || new Date()).toISOString().split('T')[0],
            duration_months: duration,
            security_deposit: deposit,
            rent_excluding_charges: rentHC,
            charges_amount: chargesAmount,
            total_rent: totalRent,
            payment_date: listing.paymentDay || 1,
            payment_method: (() => {
                const map: Record<string, string> = {
                    'VIREMENT': 'Virement Bancaire',
                    'CHEQUE': 'Chèque',
                    'PRELEVEMENT': 'Prélèvement Automatique',
                    'ESPECES': 'Espèces (dans la limite légale)',
                    'LIBRE': 'tout moyen à sa convenance',
                };
                return map[listing.paymentMethod] || 'Virement Bancaire';
            })(),
        };
    }

    /**
     * Select Legal Text Blocks
     */
    private static getLegalClauses(
        templateId: LeaseTemplateId,
        isSolidarityActive: boolean,
        compositionType: CompositionType
    ) {
        // Solidarity
        let solidarityText: string | null = null;
        if (isSolidarityActive) {
            if (compositionType === "GROUP") {
                solidarityText = LEASE_CLAUSES.SOLIDARITY.COLOCATION_ALUR;
            } else {
                solidarityText = LEASE_CLAUSES.SOLIDARITY.STANDARD;
            }
        }

        // Termination
        let terminationText = LEASE_CLAUSES.TERMINATION.FURNISHED;
        if (templateId === "BAIL_NU_LOI_89") {
            terminationText = LEASE_CLAUSES.TERMINATION.EMPTY;
        } else if (templateId === "BAIL_MOBILITE") {
            terminationText = LEASE_CLAUSES.TERMINATION.MOBILITY;
        }

        // Resolutory (Standard for all)
        const resolutoryText = LEASE_CLAUSES.RESOLUTORY.STANDARD;

        // Subletting (always applicable)
        const sublettingText = LEASE_CLAUSES.SUBLETTING.STANDARD;

        // Insurance (always applicable)
        const insuranceText = LEASE_CLAUSES.INSURANCE.STANDARD;

        // Preemption (only for vide and meublé, NOT mobilité or étudiant)
        let preemptionText: string | null = null;
        if (templateId === "BAIL_NU_LOI_89") {
            preemptionText = LEASE_CLAUSES.PREEMPTION.EMPTY;
        } else if (templateId === "BAIL_MEUBLE_LOI_89") {
            preemptionText = LEASE_CLAUSES.PREEMPTION.FURNISHED;
        }

        return {
            solidarity_clause: solidarityText,
            termination_clause: terminationText,
            resolutory_clause: resolutoryText,
            subletting_clause: sublettingText,
            insurance_clause: insuranceText,
            preemption_clause: preemptionText,
        };
    }

    /**
     * Initialize LeaseFinancials upon signature
     */
    static async initializeFinancials(applicationId: string) {
        const application = await prisma.rentalApplication.findUnique({
            where: { id: applicationId },
            include: { listing: true, candidateScope: true, financials: true }
        });

        if (!application) throw new Error("Application not found");
        if (application.financials.length > 0) return; // Already initialized

        const listing = application.listing;

        // Extract Charges logic
        let chargesAmount = 0;
        if (listing.charges) {
            const charges: any = listing.charges;
            if (typeof charges === 'number') {
                chargesAmount = charges;
            } else if (typeof charges === 'object') {
                chargesAmount = Number(charges.amount || charges.value || 0);
            }
        }

        // Determine Start Date (Move In Date or Now)
        const startDate = application.candidateScope.targetMoveInDate || new Date();

        await prisma.leaseFinancials.create({
            data: {
                rentalApplicationId: application.id,
                baseRentCents: listing.price * 100,
                serviceChargesCents: Math.round(chargesAmount * 100), // charges * 100
                startDate: startDate
            }
        });
    }
}
