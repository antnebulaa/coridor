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
        birthDate?: string;
        birthPlace?: string;
    };
    tenants: Array<{
        name: string;
        email: string;
        birthDate?: string;
        birthPlace?: string;
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

    dynamic_legal_texts: {
        solidarity_clause: string | null;
        termination_clause: string;
        resolutory_clause: string;
    };
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
     * Main entry point to generate the Lease Configuration from an Application ID.
     */
    static async generateLeaseConfig(applicationId: string): Promise<LeaseConfig> {
        // 1. Fetch all necessary data
        const application = await prisma.rentalApplication.findUnique({
            where: { id: applicationId },
            include: {
                property: {
                    include: {
                        user: true // Fetch landlord details
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
        if (!application.property) throw new Error("Listing not found");
        if (!application.candidateScope) throw new Error("Candidate Scope not found");

        const listing = application.property;
        const scope = application.candidateScope;
        const landlord = listing.user;

        // Fetch full profiles of all members
        let members = await prisma.user.findMany({
            where: { id: { in: scope.membersIds } },
            include: { tenantProfile: true }
        });

        // FALLBACK: If members list is empty, use the creator (Solo application case or data migration issue)
        if (members.length === 0 && scope.creatorUser) {
            members = [scope.creatorUser];
        }

        // 2. Determine Lease Type (Rule 1)
        const leaseTemplateId = this.determineLeaseTemplate(listing, application, scope, members);

        // 3. Determine Solidarity (Rule 2)
        const isSolidarityActive = this.determineSolidarity(scope);

        // 4. Calculate Contract Data (Duration, Deposit)
        const contractData = this.calculateContractData(leaseTemplateId, listing, application);

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
        const propertyAddress = (listing.addressLine1 && listing.zipCode && listing.city)
            ? formatAddress(listing as any)
            : (listing.locationValue || (listing as any).city || "Adresse du bien non renseignée");

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

        return {
            lease_template_id: leaseTemplateId,
            is_solidarity_clause_active: isSolidarityActive,

            landlord: {
                name: formatName(landlord),
                address: formatAddress(landlord),
                email: landlord.email || "",
                birthDate: formatDate(landlord.birthDate),
                birthPlace: landlord.birthPlace || undefined
            },
            tenants: members.map(m => ({
                name: formatName(m),
                address: formatAddress(m), // Using Tenant address if available (usually needed for "Domicile" if different, but typically in Lease it's "Domicilié à [Current Address]")
                email: m.email || "",
                birthDate: formatDate(m.birthDate),
                birthPlace: m.birthPlace || undefined
            })),

            property: {
                address: propertyAddress,
                city: listing.city || "",
                surface: listing.surface || 0,
                roomCount: listing.roomCount,
                type: listing.category,
                description: listing.description,
                constructionDate: listing.buildYear || undefined,
                heatingType: mapHeating(listing.heatingSystem),
                waterHeatingType: mapHeating("IND_ELEC"), // Fallback if not in model, or assume Individual Electric

                // NEW DEFAULTS
                fiber_optics: true, // Assume yes for modern listings or add to schema later
                ancillary_premises: [], // Populate if available
                common_areas: ["Ascenseur (si applicable)"]
            },

            contract_data: {
                ...contractData,
                // NEW DEFAULTS
                previous_rent_amount: undefined, // To be filled manually or from history logic later
                agency_fees_amount: 0,
                recent_works_amount: 0,
                recent_works_description: "Néant"
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

            dynamic_legal_texts: legalTexts,
            listing_id: listing.id,
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
        listing: Listing,
        application: RentalApplication,
        scope: TenantCandidateScope,
        members: (User & { tenantProfile: TenantProfile | null })[]
    ): LeaseTemplateId {

        // 1. Unfurnished (Vide) -> Always BAIL_NU_LOI_89
        if (!listing.isFurnished) {
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
        listing: Listing,
        application: RentalApplication
    ) {
        let duration = 12; // months
        let deposit = 0;

        // --- NEW LOGIC START ---
        // Rent Excluding Charges
        const rentHC = listing.price;

        // Extract Charges
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
                duration = 36; // 3 years standard
                deposit = rentHC * 1; // 1 month HC (of rent without charges)
                break;

            case "BAIL_MEUBLE_LOI_89":
                duration = 12; // 1 year automatic renewal
                deposit = rentHC * 2; // 2 months HC
                break;

            case "BAIL_ETUDIANT":
                duration = 9;
                deposit = rentHC * 2;
                break;

            case "BAIL_MOBILITE":
                duration = 10;
                deposit = 0; // Forbidden in Bail Mobilité
                break;
        }

        // Adjust deposit if stored in listing explicitly
        if (listing.securityDeposit !== null && listing.securityDeposit !== undefined) {
            if (templateId === "BAIL_MOBILITE") {
                deposit = 0;
            } else {
                deposit = listing.securityDeposit;
            }
        }

        return {
            effective_date: new Date().toISOString().split('T')[0],
            duration_months: duration,
            security_deposit: deposit,
            rent_excluding_charges: rentHC,
            charges_amount: chargesAmount,
            total_rent: totalRent,
            payment_date: 1, // 1st of month
            payment_method: "Virement Bancaire"
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

        return {
            solidarity_clause: solidarityText,
            termination_clause: terminationText,
            resolutory_clause: resolutoryText
        };
    }
}
