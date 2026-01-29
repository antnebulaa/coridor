import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Register fonts if needed (using Helvetica by default which is safe)
// Font.register({ family: 'Roboto', src: 'https://fonts.gstatic.com/s/roboto/v15/d-6IYplOFocCacKzxwXSOFtXRa8TVwTICgirnJhmVJw.woff2' });

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
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 2
    },
    date: {
        fontSize: 10,
        color: '#666666'
    },
    section: {
        margin: 10,
        padding: 10,
        flexGrow: 1
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        textTransform: 'uppercase',
        textDecoration: 'underline'
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
        fontWeight: 'bold',
        marginBottom: 10
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
        margin: 'auto',
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
        margin: 5,
        fontSize: 10
    },
    tableHeader: {
        backgroundColor: '#F9FAFB',
        fontWeight: 'bold'
    },
    totalRow: {
        backgroundColor: '#F3F4F6',
        fontWeight: 'bold'
    },
    balanceBlock: {
        marginTop: 20,
        padding: 15,
        backgroundColor: '#F9FAFB',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#E5E5E5'
    },
    balanceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5
    },
    balanceTotal: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#D1D5DB',
        flexDirection: 'row',
        justifyContent: 'space-between',
        fontWeight: 'bold',
        fontSize: 12
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

interface RegularizationDocumentProps {
    data: any; // Using any for simplicity with the passed previewData
    tenantName?: string;
    unitName?: string;
    propertyAddress?: string;
}

const RegularizationDocument: React.FC<RegularizationDocumentProps> = ({
    data,
    tenantName = "Locataire",
    unitName = "Logement",
    propertyAddress = "Adresse non renseignée"
}) => {
    const totalProvisions = (data?.totalProvisionsReceivedCents || 0) / 100;
    const totalExpenses = (data?.totalRecoverableExpensesCents || 0) / 100;
    const balance = (data?.balanceCents || 0) / 100;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.brand}>CORIDOR</Text>
                    <Text style={styles.date}>Fait le {format(new Date(), 'dd MMMM yyyy', { locale: fr })}</Text>
                </View>

                <Text style={styles.title}>DÉCOMPTE DE CHARGES - ANNÉE {data?.year}</Text>

                {/* Info Block */}
                <View style={styles.infoBlock}>
                    <View style={styles.infoColumn}>
                        <Text style={styles.label}>Logement concerné</Text>
                        <Text style={styles.value}>{unitName}</Text>
                        <Text style={styles.value}>{propertyAddress}</Text>
                    </View>
                    <View style={styles.infoColumn}>
                        <Text style={styles.label}>Locataire</Text>
                        <Text style={styles.value}>{tenantName}</Text>
                        <Text style={styles.label}>Période</Text>
                        <Text style={styles.value}>
                            Du 01/01/{data?.year} au 31/12/{data?.year}
                        </Text>
                    </View>
                </View>

                {/* Summary Table */}
                <View style={styles.balanceBlock}>
                    <View style={styles.balanceRow}>
                        <Text>Total des charges récupérables (réel)</Text>
                        <Text>{totalExpenses.toFixed(2)} €</Text>
                    </View>
                    <View style={styles.balanceRow}>
                        <Text>Total des provisions perçues</Text>
                        <Text>- {totalProvisions.toFixed(2)} €</Text>
                    </View>
                    <View style={styles.balanceTotal}>
                        <Text>SOLDE DE RÉGULARISATION</Text>
                        <Text style={{ color: balance > 0 ? '#DC2626' : '#059669' }}>
                            {balance > 0
                                ? `Reste à payer : ${balance.toFixed(2)} €`
                                : `En faveur du locataire : ${Math.abs(balance).toFixed(2)} €`
                            }
                        </Text>
                    </View>
                </View>

                {/* Detailed Expenses Table */}
                <Text style={{ marginTop: 30, marginBottom: 10, fontSize: 12, fontWeight: 'bold' }}>Détail des dépenses</Text>

                <View style={styles.table}>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                        <View style={styles.tableCol}>
                            <Text style={styles.tableCell}>Libellé / Catégorie</Text>
                        </View>
                        <View style={styles.tableColAmount}>
                            <Text style={styles.tableCell}>Montant Récupérable</Text>
                        </View>
                    </View>

                    {data?.expenses?.map((expense: any, index: number) => (
                        <View style={styles.tableRow} key={index}>
                            <View style={styles.tableCol}>
                                <Text style={styles.tableCell}>
                                    {format(new Date(expense.dateOccurred), 'dd/MM/yyyy')} - {expense.label}
                                </Text>
                            </View>
                            <View style={styles.tableColAmount}>
                                <Text style={styles.tableCell}>
                                    {((expense.amountRecoverableCents || 0) / 100).toFixed(2)} €
                                </Text>
                            </View>
                        </View>
                    ))}

                    {(!data?.expenses || data.expenses.length === 0) && (
                        <View style={styles.tableRow}>
                            <View style={{ ...styles.tableCol, width: '100%' }}>
                                <Text style={{ ...styles.tableCell, textAlign: 'center', color: '#999' }}>Aucune dépense enregistrée</Text>
                            </View>
                        </View>
                    )}
                </View>

                <Text style={{ fontSize: 9, color: '#666', marginTop: 10 }}>
                    * Ce document vaut justificatif de régularisation de charges locatives conformément à la législation en vigueur.
                    Le solde doit être réglé ou remboursé dans un délai d'un mois.
                </Text>

                <Text style={styles.footer}>
                    Document généré automatiquement via Coridor le {format(new Date(), 'dd/MM/yyyy HH:mm')}
                </Text>
            </Page>
        </Document>
    );
};

export default RegularizationDocument;
