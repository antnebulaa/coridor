import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';
import { LeaseConfig } from '@/services/LeaseService';

// Styles Refined for Density
const styles = StyleSheet.create({
    page: {
        padding: 30, // Less padding to fit more content
        fontFamily: 'Helvetica',
        fontSize: 9, // Slightly smaller base font
        lineHeight: 1.4,
        color: '#222222',
    },
    header: {
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#000000',
        paddingBottom: 8,
        textAlign: 'center',
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 4,
        fontFamily: 'Helvetica-Bold',
    },
    subtitle: {
        fontSize: 9,
        color: '#444444',
        marginBottom: 2,
    },
    section: {
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 0.5,
        borderBottomColor: '#EEEEEE',
    },
    sectionHeader: {
        backgroundColor: '#F3F4F6',
        paddingVertical: 4,
        paddingHorizontal: 6,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        borderLeftWidth: 3,
        borderLeftColor: '#000000',
    },
    sectionNumber: {
        width: 25,
        fontWeight: 'bold',
        fontFamily: 'Helvetica-Bold',
        fontSize: 10,
    },
    sectionTitle: {
        fontWeight: 'bold',
        fontFamily: 'Helvetica-Bold',
        fontSize: 10,
        textTransform: 'uppercase',
    },
    subsectionTitle: {
        fontSize: 9,
        fontWeight: 'bold',
        fontFamily: 'Helvetica-Bold',
        marginBottom: 4,
        marginTop: 6,
        textDecoration: 'underline',
    },
    row: {
        flexDirection: 'row',
        marginBottom: 3,
        flexWrap: 'wrap',
    },
    label: {
        width: 140,
        color: '#555555',
        fontSize: 8,
    },
    value: {
        flex: 1,
        fontFamily: 'Helvetica-Bold',
        fontSize: 9,
    },
    text: {
        marginBottom: 4,
        textAlign: 'justify',
        fontSize: 9,
        color: '#333333',
    },
    warningText: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#B91C1C', // Red-700
        marginBottom: 2,
    },
    legalText: {
        fontSize: 7.5,
        color: '#666666',
        textAlign: 'justify',
        marginTop: 1,
        marginBottom: 3,
        fontStyle: 'italic',
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 1,
    },
    checkbox: {
        width: 8,
        height: 8,
        borderWidth: 1,
        borderColor: '#000',
        marginRight: 6,
    },
    footer: {
        position: 'absolute',
        bottom: 20,
        left: 30,
        right: 30,
        textAlign: 'center',
        color: '#999999',
        fontSize: 7,
        borderTopWidth: 1,
        borderTopColor: '#EEEEEE',
        paddingTop: 8,
    }
});

interface LeaseDocumentProps {
    data: LeaseConfig;
}

const LeaseDocument: React.FC<LeaseDocumentProps> = ({ data }) => {

    // Formatting Helper
    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

    const isMobilite = data.lease_template_id === 'BAIL_MOBILITE';
    const isStudent = data.lease_template_id === 'BAIL_ETUDIANT';
    const isFurnished = data.lease_template_id !== 'BAIL_NU_LOI_89';

    return (
        <Document>
            {/* PAGE 1 */}
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <Text style={styles.title}>CONTRAT DE LOCATION {isFurnished ? 'MEUBLÉE' : 'NUE'}</Text>
                    <Text style={styles.subtitle}>
                        {isMobilite
                            ? "SOUMIS AU TITRE Ier TER DE LA LOI DU 6 JUILLET 1989 (BAIL MOBILITÉ)"
                            : "SOUMIS AU TITRE Ier BIS DE LA LOI DU 6 JUILLET 1989 (RÉSIDENCE PRINCIPALE)"}
                    </Text>
                    <Text style={{ fontSize: 8, marginTop: 2 }}>ID: {data.application_id}</Text>
                </View>

                {/* I. PARTIES */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionNumber}>I.</Text>
                        <Text style={styles.sectionTitle}>A. DÉSIGNATION DES PARTIES</Text>
                    </View>

                    <Text style={styles.subsectionTitle}>LE BAILLEUR (ou son mandataire)</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Nom et Prénom :</Text>
                        <Text style={styles.value}>{data.landlord.name}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Adresse :</Text>
                        <Text style={styles.value}>{data.landlord.address}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Né(e) le :</Text>
                        <Text style={styles.value}>{data.landlord.birthDate || "__________________"} à {data.landlord.birthPlace || "__________________"}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Email / Tél :</Text>
                        <Text style={styles.value}>{data.landlord.email}</Text>
                    </View>

                    <Text style={styles.subsectionTitle}>LE(S) LOCATAIRE(S)</Text>
                    {data.tenants.map((tenant, index) => (
                        <View key={index} style={{ marginBottom: 8 }}>
                            <View style={styles.row}>
                                <Text style={styles.label}>Nom et Prénom :</Text>
                                <Text style={styles.value}>{tenant.name}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Né(e) le :</Text>
                                <Text style={styles.value}>{tenant.birthDate || "__________________"} à {tenant.birthPlace || "__________________"}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Email :</Text>
                                <Text style={styles.value}>{tenant.email}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* II. OBJET */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionNumber}>II.</Text>
                        <Text style={styles.sectionTitle}>B. OBJET DU CONTRAT</Text>
                    </View>

                    <Text style={styles.subsectionTitle}>1. Consistance du logement</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Adresse :</Text>
                        <Text style={styles.value}>{data.property.address} {data.property.city}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Type d'habitat :</Text>
                        <Text style={styles.value}>{data.property.type === 'Maison' ? 'Maison Individuelle' : 'Appartement en Immeuble Collectif'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Période de construction :</Text>
                        <Text style={styles.value}>{data.property.constructionDate || "Inconnue"}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Surface habitable :</Text>
                        <Text style={styles.value}>{data.property.surface} m²</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Nombre de pièces principales :</Text>
                        <Text style={styles.value}>{data.property.roomCount}</Text>
                    </View>

                    <Text style={styles.subsectionTitle}>2. Équipements & Confort</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Chauffage :</Text>
                        <Text style={styles.value}>{data.property.heatingType || 'Individuel'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Eau Chaude :</Text>
                        <Text style={styles.value}>{data.property.waterHeatingType || 'Individuelle'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Internet / Fibre :</Text>
                        <Text style={styles.value}>{data.property.fiber_optics ? 'Oui (Logement raccordable)' : 'Non renseigné'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Locaux Accessoires :</Text>
                        <Text style={styles.value}>{data.property.ancillary_premises && data.property.ancillary_premises.length > 0 ? data.property.ancillary_premises.join(', ') : 'Néant (Pas de cave ni parking mentionnés)'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Parties Communes :</Text>
                        <Text style={styles.value}>{data.property.common_areas && data.property.common_areas.length > 0 ? data.property.common_areas.join(', ') : 'Néant'}</Text>
                    </View>

                    <Text style={styles.subsectionTitle}>3. Destination des lieux</Text>
                    <Text style={styles.text}>
                        Le local est loué à usage exclusif d'habitation principale. {isMobilite ? "(Bail Mobilité - Motif professionnel ou études)" : ""}
                    </Text>
                </View>

                {/* III. DURÉE */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionNumber}>III.</Text>
                        <Text style={styles.sectionTitle}>C. DATE DE PRISE D'EFFET ET DURÉE</Text>
                    </View>

                    <View style={styles.row}>
                        <Text style={styles.label}>1. Prise d'effet :</Text>
                        <Text style={styles.value}>Le {data.contract_data.effective_date}</Text>
                    </View>

                    <View style={styles.row}>
                        <Text style={styles.label}>2. Durée :</Text>
                        <Text style={styles.value}>
                            {data.contract_data.duration_months} mois.
                        </Text>
                    </View>

                    {(!isMobilite && !isStudent) && (
                        <Text style={styles.text}>
                            Le contrat est conclu pour une durée d'un an. A défaut de congé régulier, il se renouvelle par tacite reconduction pour une durée d'un an.
                        </Text>
                    )}
                    {isStudent && (
                        <Text style={styles.text}>
                            Bail étudiant : Durée de 9 mois, non renouvelable tacitement.
                        </Text>
                    )}
                    {isMobilite && (
                        <Text style={styles.text}>
                            Bail mobilité : Durée forfaitaire non renouvelable ni reconductible.
                        </Text>
                    )}
                </View>

                {/* IV. CONDITIONS FINANCIÈRES */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionNumber}>IV.</Text>
                        <Text style={styles.sectionTitle}>D. CONDITIONS FINANCIÈRES</Text>
                    </View>

                    <Text style={styles.subsectionTitle}>1. Loyer et Charges</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Loyer Mensuel Hors Charges :</Text>
                        <Text style={styles.value}>{formatCurrency(data.contract_data.rent_excluding_charges)}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>
                            {data.lease_template_id === 'BAIL_NU_LOI_89' ? 'Provision sur charges (régularisation annuelle) :' : 'Forfait de charges (non régularisable) :'}
                        </Text>
                        <Text style={styles.value}>{formatCurrency(data.contract_data.charges_amount)}</Text>
                    </View>
                    <View style={{ ...styles.row, marginTop: 6, borderTopWidth: 1, borderTopColor: '#000', paddingTop: 4 }}>
                        <Text style={{ ...styles.label, fontWeight: 'bold', color: 'black' }}>TOTAL MENSUEL :</Text>
                        <Text style={{ ...styles.value, fontSize: 11 }}>{formatCurrency(data.contract_data.total_rent)}</Text>
                    </View>

                    <Text style={styles.subsectionTitle}>2. Paiement</Text>
                    <Text style={styles.text}>
                        Le paiement s'effectuera le {data.contract_data.payment_date} de chaque mois par {data.contract_data.payment_method}.
                    </Text>

                    <Text style={styles.subsectionTitle}>3. Révision du Loyer</Text>
                    <Text style={styles.text}>
                        Le montant du loyer sera révisé chaque année à la date anniversaire du contrat, selon la variation de l'Indice de Référence des Loyers (IRL) publié par l'INSEE.
                    </Text>

                    <Text style={styles.subsectionTitle}>4. Information Loyer Précédent (Zone Tendue)</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Dernier loyer appliqué :</Text>
                        <Text style={styles.value}>{data.contract_data.previous_rent_amount ? formatCurrency(data.contract_data.previous_rent_amount) : "__________________ €"}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Date dernier versement :</Text>
                        <Text style={styles.value}>{data.contract_data.previous_rent_payment_date || "__________________"}</Text>
                    </View>

                </View>

                <Text style={styles.footer} render={({ pageNumber, totalPages }) => (
                    `${pageNumber} / ${totalPages}`
                )} fixed />
            </Page>

            {/* PAGE 2 */}
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <Text style={styles.subtitle}>Suite du Contrat - Page 2</Text>
                </View>

                {/* V. TRAVAUX */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionNumber}>V.</Text>
                        <Text style={styles.sectionTitle}>E. TRAVAUX</Text>
                    </View>
                    <Text style={styles.text}>
                        Le Locataire ne pourra transformer les lieux loués et les équipements sans l'accord écrit du Bailleur.
                        Le Bailleur peut exiger la remise en état des lieux au départ du locataire.
                    </Text>

                    <Text style={{ ...styles.subsectionTitle, marginTop: 8 }}>Travaux récents (depuis la fin du dernier contrat)</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Montant des travaux :</Text>
                        <Text style={styles.value}>{data.contract_data.recent_works_amount > 0 ? formatCurrency(data.contract_data.recent_works_amount) : "Néant"}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Nature des travaux :</Text>
                        <Text style={styles.value}>{data.contract_data.recent_works_description || "N/A"}</Text>
                    </View>
                </View>

                {/* VI. GARANTIES */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionNumber}>VI.</Text>
                        <Text style={styles.sectionTitle}>F. GARANTIES</Text>
                    </View>

                    <Text style={styles.subsectionTitle}>Dépôt de garantie</Text>
                    {data.contract_data.security_deposit > 0 ? (
                        <View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Montant :</Text>
                                <Text style={styles.value}>{formatCurrency(data.contract_data.security_deposit)}</Text>
                            </View>
                            <Text style={styles.legalText}>
                                Correspondant à {data.lease_template_id === 'BAIL_NU_LOI_89' ? '1 mois' : '2 mois'} de loyer hors charges maximum.
                                Il sera restitué dans un délai légal maximal de 2 mois (réduit à 1 mois si l'état des lieux de sortie est conforme) à compter de la remise des clés, déduction faite des sommes restant dues.
                            </Text>
                        </View>
                    ) : (
                        <Text style={styles.text}>Aucun dépôt de garantie n'est demandé (Ex: Bail Mobilité).</Text>
                    )}
                </View>

                {/* VII. SOLIDARITE */}
                {data.is_solidarity_clause_active && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionNumber}>VII.</Text>
                            <Text style={styles.sectionTitle}>G. CLAUSE DE SOLIDARITÉ</Text>
                        </View>
                        <Text style={styles.text}>
                            En cas de pluralité de locataires (colocation ou concubinage), ceux-ci sont tenus solidairement et indivisiblement de l'exécution des obligations du présent bail, notamment du paiement du loyer et des charges.
                        </Text>
                        <Text style={styles.legalText}>{data.dynamic_legal_texts.solidarity_clause}</Text>
                    </View>
                )}

                {/* VIII. CLAUSE RESOLUTOIRE */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionNumber}>VIII.</Text>
                        <Text style={styles.sectionTitle}>H. CLAUSE RÉSOLUTOIRE</Text>
                    </View>
                    <Text style={styles.text}>{data.dynamic_legal_texts.resolutory_clause}</Text>
                    <Text style={styles.legalText}>
                        Cette clause permet la résiliation automatique du bail en cas de défaut de paiement, de non-versement du dépôt de garantie ou de défaut d'assurance habitation.
                    </Text>
                </View>

                {/* IX. HONORAIRES DE LOCATION */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionNumber}>IX.</Text>
                        <Text style={styles.sectionTitle}>HONORAIRES DE LOCATION</Text>
                    </View>
                    {!data.agency_fees.is_applicable ? (
                        <>
                            <Text style={styles.subsectionTitle}>IX.1. Dispositions applicables</Text>
                            <Text style={styles.text}>
                                La location étant conclue directement entre le bailleur et le locataire (particuliers), sans le concours d'un mandataire professionnel (agent immobilier ou administrateur de biens) soumis à la loi n° 70-9 du 2 janvier 1970 (Loi Hoguet) :
                            </Text>
                            <Text style={{ ...styles.text, fontWeight: 'bold', textAlign: 'center', marginVertical: 4 }}>
                                AUCUN HONORAIRE DE LOCATION N'EST FACTURÉ AU LOCATAIRE.
                            </Text>
                            <Text style={styles.text}>
                                Il est précisé que les éventuels frais de service de la plateforme de mise en relation ne constituent pas des honoraires de location au sens de l'article 5 de la loi du 6 juillet 1989 (frais de visite, constitution de dossier, rédaction de bail, état des lieux).
                            </Text>

                            <Text style={styles.subsectionTitle}>IX.2. Détail des honoraires</Text>
                            <View style={styles.row}>
                                <Text style={styles.label}>Charge Bailleur :</Text>
                                <Text style={styles.value}>0,00 €</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Charge Locataire :</Text>
                                <Text style={styles.value}>0,00 €</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Frais État des lieux :</Text>
                                <Text style={styles.value}>
                                    0,00 € ({data.agency_fees.inventory_check_type === 'AMICABLE' ? 'réalisé à l\'amiable entre les parties' : 'selon barème légal si Huissier'})
                                </Text>
                            </View>
                        </>
                    ) : (
                        <Text style={styles.text}>Honoraires applicables selon mandat.</Text>
                    )}
                </View>

                {/* X. ANNEXES */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionNumber}>X.</Text>
                        <Text style={styles.sectionTitle}>J. ANNEXES OBLIGATOIRES</Text>
                    </View>
                    <Text style={styles.text}>Sont annexées et jointes au présent contrat les pièces suivantes :</Text>
                    <View style={{ marginLeft: 10, marginTop: 4 }}>
                        <Text style={styles.text}>• L'état des lieux d'entrée établi contradictoirement.</Text>
                        <Text style={styles.text}>• Le dossier de diagnostic technique (DPE, ERP, etc.).</Text>
                        {isFurnished && <Text style={styles.text}>• L'inventaire détaillé et l'état du mobilier.</Text>}
                        <Text style={styles.text}>• La notice d'information relative aux droits et obligations des locataires et bailleurs.</Text>
                        <Text style={styles.text}>• Un extrait du règlement de copropriété (si applicable).</Text>
                    </View>
                </View>

                {/* SIGNATURES */}
                <View style={{ marginTop: 20 }}>
                    <Text style={{ textAlign: 'center', marginBottom: 20, fontSize: 10 }}>
                        Fait à _________________________, le _________________________ en {data.tenants.length + 1} exemplaires originaux.
                    </Text>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                        <View style={{ width: '45%', height: 120, borderWidth: 1, borderColor: '#ccc', padding: 8, backgroundColor: '#FAFAFA' }}>
                            <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 20 }}>LE BAILLEUR</Text>
                            <Text style={{ fontSize: 7, color: '#999', textAlign: 'center' }}>
                                Signature précédée de la mention manuscrite {"\n"} "Lu et approuvé"
                            </Text>
                        </View>
                        <View style={{ width: '45%', height: 120, borderWidth: 1, borderColor: '#ccc', padding: 8, backgroundColor: '#FAFAFA' }}>
                            <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 20 }}>LE(S) LOCATAIRE(S)</Text>
                            <Text style={{ fontSize: 7, color: '#999', textAlign: 'center' }}>
                                Signature précédée de la mention manuscrite {"\n"} "Lu et approuvé"
                            </Text>
                        </View>
                    </View>
                </View>

                <Text style={styles.footer} render={({ pageNumber, totalPages }) => (
                    `${pageNumber} / ${totalPages}`
                )} fixed />
            </Page>
        </Document>
    );
};

export default LeaseDocument;
