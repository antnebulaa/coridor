import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface RentReceiptData {
    landlordName: string;
    landlordAddress: string;
    tenantName: string;
    propertyAddress: string;
    periodStart: Date;
    periodEnd: Date;
    rentAmount: number;
    chargesAmount: number;
    totalAmount: number;
    isPartialPayment: boolean;
    receiptId: string;
    emissionDate: Date;
}

const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 40,
        fontFamily: 'Helvetica',
        fontSize: 10,
        color: '#333333',
        lineHeight: 1.5
    },
    header: {
        marginBottom: 30,
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
        paddingBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end'
    },
    brand: {
        fontSize: 20,
        fontFamily: 'Helvetica-Bold',
        textTransform: 'uppercase',
        letterSpacing: 2
    },
    date: {
        fontSize: 10,
        color: '#666666'
    },
    title: {
        fontSize: 16,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 6,
        textAlign: 'center',
        textTransform: 'uppercase',
        textDecoration: 'underline'
    },
    subtitle: {
        fontSize: 11,
        color: '#666666',
        textAlign: 'center',
        marginBottom: 24
    },
    warningBanner: {
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
        borderRadius: 4,
        padding: 10,
        marginBottom: 20,
        textAlign: 'center'
    },
    warningText: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        color: '#DC2626'
    },
    infoBlock: {
        marginBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    infoColumn: {
        width: '45%'
    },
    label: {
        fontSize: 9,
        color: '#666666',
        textTransform: 'uppercase',
        marginBottom: 2
    },
    value: {
        fontSize: 11,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 10
    },
    valueNormal: {
        fontSize: 10,
        marginBottom: 10
    },
    sectionTitle: {
        fontSize: 12,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 10,
        marginTop: 10
    },
    propertyBlock: {
        marginBottom: 20,
        padding: 12,
        backgroundColor: '#F9FAFB',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#E5E5E5'
    },
    table: {
        display: 'flex',
        width: 'auto',
        borderStyle: 'solid',
        borderWidth: 1,
        borderRightWidth: 0,
        borderBottomWidth: 0,
        borderColor: '#E5E5E5',
        marginBottom: 24
    },
    tableRow: {
        flexDirection: 'row'
    },
    tableCol: {
        width: '60%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        borderColor: '#E5E5E5'
    },
    tableColAmount: {
        width: '40%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        borderColor: '#E5E5E5',
        textAlign: 'right'
    },
    tableCell: {
        margin: 8,
        fontSize: 10
    },
    tableHeader: {
        backgroundColor: '#F9FAFB'
    },
    tableHeaderCell: {
        margin: 8,
        fontSize: 9,
        fontFamily: 'Helvetica-Bold',
        color: '#666666',
        textTransform: 'uppercase'
    },
    totalRow: {
        backgroundColor: '#F3F4F6'
    },
    totalCell: {
        margin: 8,
        fontSize: 11,
        fontFamily: 'Helvetica-Bold'
    },
    legalText: {
        fontSize: 9,
        fontStyle: 'italic',
        color: '#666666',
        lineHeight: 1.6,
        marginBottom: 20
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        textAlign: 'center',
        color: '#9CA3AF',
        fontSize: 8,
        borderTopWidth: 1,
        borderTopColor: '#EEEEEE',
        paddingTop: 10
    }
});

function formatAmount(amount: number): string {
    return amount.toLocaleString('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

interface RentReceiptDocumentProps {
    data: RentReceiptData;
}

const RentReceiptDocument: React.FC<RentReceiptDocumentProps> = ({ data }) => {
    const {
        landlordName,
        landlordAddress,
        tenantName,
        propertyAddress,
        periodStart,
        periodEnd,
        rentAmount,
        chargesAmount,
        totalAmount,
        isPartialPayment,
        receiptId,
        emissionDate
    } = data;

    const periodLabel = `du ${format(new Date(periodStart), 'd MMMM yyyy', { locale: fr })} au ${format(new Date(periodEnd), 'd MMMM yyyy', { locale: fr })}`;
    const periodSubtitle = format(new Date(periodStart), 'MMMM yyyy', { locale: fr });
    const formattedEmissionDate = format(new Date(emissionDate), 'dd MMMM yyyy', { locale: fr });
    const shortReceiptId = receiptId.length > 8 ? receiptId.substring(0, 8).toUpperCase() : receiptId.toUpperCase();

    const titleText = isPartialPayment ? 'REÇU DE PAIEMENT PARTIEL' : 'QUITTANCE DE LOYER';

    const legalMention = isPartialPayment
        ? `Le bailleur reconnaît avoir reçu du locataire nommé ci-dessus la somme de ${formatAmount(totalAmount)} euros, à titre d'acompte sur le loyer et les charges dus pour la période indiquée ci-dessus. Ce document ne constitue pas une quittance mais un reçu de paiement partiel.`
        : `Le bailleur reconnaît avoir reçu du locataire nommé ci-dessus la somme de ${formatAmount(totalAmount)} euros, au titre du paiement du loyer et des charges pour la période indiquée ci-dessus, et lui en donne quittance, sous réserve de la régularisation annuelle des charges.`;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.brand}>CORIDOR</Text>
                    <Text style={styles.date}>Fait le {formattedEmissionDate}</Text>
                </View>

                {/* Title */}
                <Text style={[styles.title, isPartialPayment ? { color: '#DC2626' } : {}]}>
                    {titleText}
                </Text>
                <Text style={styles.subtitle}>
                    Période : {periodSubtitle}
                </Text>

                {/* Partial payment warning banner */}
                {isPartialPayment && (
                    <View style={styles.warningBanner}>
                        <Text style={styles.warningText}>
                            PAIEMENT PARTIEL — Ce document est un reçu, il ne constitue pas une quittance de loyer.
                        </Text>
                    </View>
                )}

                {/* Info Block: Bailleur | Locataire */}
                <View style={styles.infoBlock}>
                    <View style={styles.infoColumn}>
                        <Text style={styles.label}>Bailleur</Text>
                        <Text style={styles.value}>{landlordName}</Text>
                        <Text style={styles.valueNormal}>{landlordAddress}</Text>
                    </View>
                    <View style={styles.infoColumn}>
                        <Text style={styles.label}>Locataire</Text>
                        <Text style={styles.value}>{tenantName}</Text>
                    </View>
                </View>

                {/* Property address */}
                <View style={styles.propertyBlock}>
                    <Text style={styles.label}>Logement</Text>
                    <Text style={styles.value}>{propertyAddress}</Text>
                    <Text style={styles.label}>Période concernée</Text>
                    <Text style={{ fontSize: 10 }}>{periodLabel}</Text>
                </View>

                {/* Amounts table */}
                <Text style={styles.sectionTitle}>Détail des montants</Text>
                <View style={styles.table}>
                    {/* Header row */}
                    <View style={[styles.tableRow, styles.tableHeader]}>
                        <View style={styles.tableCol}>
                            <Text style={styles.tableHeaderCell}>Désignation</Text>
                        </View>
                        <View style={styles.tableColAmount}>
                            <Text style={styles.tableHeaderCell}>Montant</Text>
                        </View>
                    </View>

                    {/* Rent row */}
                    <View style={styles.tableRow}>
                        <View style={styles.tableCol}>
                            <Text style={styles.tableCell}>Loyer hors charges</Text>
                        </View>
                        <View style={styles.tableColAmount}>
                            <Text style={styles.tableCell}>{formatAmount(rentAmount)} &euro;</Text>
                        </View>
                    </View>

                    {/* Charges row */}
                    <View style={styles.tableRow}>
                        <View style={styles.tableCol}>
                            <Text style={styles.tableCell}>Provision sur charges</Text>
                        </View>
                        <View style={styles.tableColAmount}>
                            <Text style={styles.tableCell}>{formatAmount(chargesAmount)} &euro;</Text>
                        </View>
                    </View>

                    {/* Total row */}
                    <View style={[styles.tableRow, styles.totalRow]}>
                        <View style={styles.tableCol}>
                            <Text style={styles.totalCell}>Total</Text>
                        </View>
                        <View style={styles.tableColAmount}>
                            <Text style={styles.totalCell}>{formatAmount(totalAmount)} &euro;</Text>
                        </View>
                    </View>
                </View>

                {/* Legal mention */}
                <Text style={styles.legalText}>{legalMention}</Text>

                {/* Footer */}
                <Text style={styles.footer}>
                    Document généré automatiquement via Coridor — Réf. {shortReceiptId}
                </Text>
            </Page>
        </Document>
    );
};

export default RentReceiptDocument;
