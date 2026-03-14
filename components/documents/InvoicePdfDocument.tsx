import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface InvoicePdfData {
    invoiceNumber: string;
    invoiceDate: Date;
    customerName: string;
    customerEmail: string;
    planName: string;
    periodStart: Date;
    periodEnd: Date | null;
    amountCents: number;
    isGift: boolean;
    giftReason?: string;
}

const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 40,
        fontFamily: 'Helvetica',
        fontSize: 10,
        color: '#1A1A1A',
        lineHeight: 1.5
    },
    header: {
        marginBottom: 30,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
        paddingBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end'
    },
    brand: {
        fontSize: 20,
        fontFamily: 'Helvetica-Bold',
        textTransform: 'uppercase',
        letterSpacing: 2,
        color: '#1A1A1A'
    },
    headerRight: {
        alignItems: 'flex-end'
    },
    invoiceNumber: {
        fontSize: 11,
        fontFamily: 'Helvetica-Bold',
        color: '#1A1A1A',
        marginBottom: 2
    },
    invoiceDate: {
        fontSize: 10,
        color: '#666666'
    },
    title: {
        fontSize: 16,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 24,
        textAlign: 'center',
        textTransform: 'uppercase'
    },
    billingBlock: {
        marginBottom: 24,
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    billingColumn: {
        width: '45%'
    },
    label: {
        fontSize: 9,
        color: '#666666',
        textTransform: 'uppercase',
        marginBottom: 4
    },
    billingName: {
        fontSize: 11,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 2
    },
    billingDetail: {
        fontSize: 10,
        color: '#333333',
        marginBottom: 1
    },
    giftBanner: {
        backgroundColor: '#F0FDF4',
        borderWidth: 1,
        borderColor: '#BBF7D0',
        borderRadius: 4,
        padding: 10,
        marginBottom: 20,
        textAlign: 'center'
    },
    giftText: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        color: '#16A34A'
    },
    giftReason: {
        fontSize: 9,
        color: '#16A34A',
        marginTop: 2
    },
    table: {
        display: 'flex',
        width: 'auto',
        borderStyle: 'solid',
        borderWidth: 1,
        borderRightWidth: 0,
        borderBottomWidth: 0,
        borderColor: '#E5E5E5',
        marginBottom: 20
    },
    tableRow: {
        flexDirection: 'row'
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
    tableCell: {
        margin: 8,
        fontSize: 10
    },
    colDescription: {
        width: '45%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        borderColor: '#E5E5E5'
    },
    colQuantity: {
        width: '15%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        borderColor: '#E5E5E5',
        textAlign: 'center'
    },
    colUnitPrice: {
        width: '20%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        borderColor: '#E5E5E5',
        textAlign: 'right'
    },
    colTotal: {
        width: '20%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        borderColor: '#E5E5E5',
        textAlign: 'right'
    },
    totalsBlock: {
        alignItems: 'flex-end',
        marginBottom: 30
    },
    totalsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 4,
        width: 220
    },
    totalsLabel: {
        fontSize: 10,
        color: '#666666',
        width: 120
    },
    totalsValue: {
        fontSize: 10,
        textAlign: 'right',
        width: 100
    },
    totalsTtcRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        width: 220,
        borderTopWidth: 1,
        borderTopColor: '#1A1A1A',
        paddingTop: 6,
        marginTop: 4
    },
    totalsTtcLabel: {
        fontSize: 11,
        fontFamily: 'Helvetica-Bold',
        color: '#1A1A1A',
        width: 120
    },
    totalsTtcValue: {
        fontSize: 11,
        fontFamily: 'Helvetica-Bold',
        textAlign: 'right',
        color: '#1A1A1A',
        width: 100
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
    },
    footerLine: {
        marginBottom: 2
    }
});

function formatAmount(cents: number): string {
    if (!Number.isFinite(cents)) return '0,00';
    const euros = cents / 100;
    return euros.toLocaleString('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

interface InvoicePdfDocumentProps {
    data: InvoicePdfData;
}

const InvoicePdfDocument: React.FC<InvoicePdfDocumentProps> = ({ data }) => {
    const {
        invoiceNumber,
        invoiceDate,
        customerName,
        customerEmail,
        planName,
        periodStart,
        periodEnd,
        amountCents,
        isGift,
        giftReason
    } = data;

    const formattedDate = format(new Date(invoiceDate), 'dd MMMM yyyy', { locale: fr });
    const formattedPeriodStart = format(new Date(periodStart), 'dd MMMM yyyy', { locale: fr });
    const formattedPeriodEnd = periodEnd
        ? format(new Date(periodEnd), 'dd MMMM yyyy', { locale: fr })
        : null;

    const periodLabel = formattedPeriodEnd
        ? `du ${formattedPeriodStart} au ${formattedPeriodEnd}`
        : `à partir du ${formattedPeriodStart}`;

    const description = `Abonnement Coridor ${planName} — ${periodLabel}`;

    const amountHtCents = isGift ? 0 : Math.round(amountCents / 1.2);
    const tvaCents = isGift ? 0 : amountCents - amountHtCents;
    const totalTtcCents = isGift ? 0 : amountCents;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.brand}>CORIDOR</Text>
                    <View style={styles.headerRight}>
                        <Text style={styles.invoiceNumber}>{invoiceNumber}</Text>
                        <Text style={styles.invoiceDate}>{formattedDate}</Text>
                    </View>
                </View>

                {/* Title */}
                <Text style={styles.title}>Facture</Text>

                {/* Gift banner */}
                {isGift && (
                    <View style={styles.giftBanner}>
                        <Text style={styles.giftText}>Abonnement offert</Text>
                        {giftReason && (
                            <Text style={styles.giftReason}>{giftReason}</Text>
                        )}
                    </View>
                )}

                {/* Billing info */}
                <View style={styles.billingBlock}>
                    <View style={styles.billingColumn}>
                        <Text style={styles.label}>Émetteur</Text>
                        <Text style={styles.billingName}>Coridor SAS</Text>
                        <Text style={styles.billingDetail}>123 Avenue de la République</Text>
                        <Text style={styles.billingDetail}>75011 Paris, France</Text>
                        <Text style={styles.billingDetail}>SIRET : 000 000 000 00000</Text>
                        <Text style={styles.billingDetail}>TVA : FR00 000000000</Text>
                    </View>
                    <View style={styles.billingColumn}>
                        <Text style={styles.label}>Client</Text>
                        <Text style={styles.billingName}>{customerName}</Text>
                        <Text style={styles.billingDetail}>{customerEmail}</Text>
                    </View>
                </View>

                {/* Invoice details table */}
                <View style={styles.table}>
                    {/* Header row */}
                    <View style={[styles.tableRow, styles.tableHeader]}>
                        <View style={styles.colDescription}>
                            <Text style={styles.tableHeaderCell}>Description</Text>
                        </View>
                        <View style={styles.colQuantity}>
                            <Text style={styles.tableHeaderCell}>Qté</Text>
                        </View>
                        <View style={styles.colUnitPrice}>
                            <Text style={styles.tableHeaderCell}>Prix unitaire HT</Text>
                        </View>
                        <View style={styles.colTotal}>
                            <Text style={styles.tableHeaderCell}>Total HT</Text>
                        </View>
                    </View>

                    {/* Line item */}
                    <View style={styles.tableRow}>
                        <View style={styles.colDescription}>
                            <Text style={styles.tableCell}>{description}</Text>
                        </View>
                        <View style={styles.colQuantity}>
                            <Text style={styles.tableCell}>1</Text>
                        </View>
                        <View style={styles.colUnitPrice}>
                            <Text style={styles.tableCell}>
                                {isGift ? 'Offert' : `${formatAmount(amountHtCents)} \u20AC`}
                            </Text>
                        </View>
                        <View style={styles.colTotal}>
                            <Text style={styles.tableCell}>
                                {isGift ? 'Offert' : `${formatAmount(amountHtCents)} \u20AC`}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Totals */}
                <View style={styles.totalsBlock}>
                    {isGift ? (
                        <View style={styles.totalsTtcRow}>
                            <Text style={styles.totalsTtcLabel}>Total</Text>
                            <Text style={styles.totalsTtcValue}>Offert</Text>
                        </View>
                    ) : (
                        <>
                            <View style={styles.totalsRow}>
                                <Text style={styles.totalsLabel}>Sous-total HT</Text>
                                <Text style={styles.totalsValue}>{formatAmount(amountHtCents)} &euro;</Text>
                            </View>
                            <View style={styles.totalsRow}>
                                <Text style={styles.totalsLabel}>TVA (20 %)</Text>
                                <Text style={styles.totalsValue}>{formatAmount(tvaCents)} &euro;</Text>
                            </View>
                            <View style={styles.totalsTtcRow}>
                                <Text style={styles.totalsTtcLabel}>Total TTC</Text>
                                <Text style={styles.totalsTtcValue}>{formatAmount(totalTtcCents)} &euro;</Text>
                            </View>
                        </>
                    )}
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerLine}>
                        Facture générée automatiquement par Coridor
                    </Text>
                    <Text style={styles.footerLine}>
                        Coridor SAS — Capital social : 1 000 &euro; — RCS Paris 000 000 000
                    </Text>
                    <Text style={styles.footerLine}>
                        Réf. {invoiceNumber}
                    </Text>
                </View>
            </Page>
        </Document>
    );
};

export default InvoicePdfDocument;
