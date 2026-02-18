import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: 'Helvetica',
        fontSize: 9,
        lineHeight: 1.5,
        color: '#222222',
    },
    header: {
        marginBottom: 20,
        borderBottomWidth: 2,
        borderBottomColor: '#000000',
        paddingBottom: 10,
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
    },
    section: {
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        fontFamily: 'Helvetica-Bold',
        marginBottom: 8,
        backgroundColor: '#F3F4F6',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#000000',
    },
    tableHeader: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#000000',
        paddingBottom: 4,
        marginBottom: 4,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 3,
        borderBottomWidth: 0.5,
        borderBottomColor: '#EEEEEE',
    },
    colItem: { width: '45%', fontSize: 9 },
    colPresent: { width: '15%', fontSize: 9, textAlign: 'center' },
    colQty: { width: '15%', fontSize: 9, textAlign: 'center' },
    colState: { width: '25%', fontSize: 9, textAlign: 'center' },
    headerText: {
        fontSize: 8,
        fontFamily: 'Helvetica-Bold',
        textTransform: 'uppercase',
        color: '#555555',
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        fontSize: 8,
        color: '#666666',
        textAlign: 'center',
        borderTopWidth: 1,
        borderTopColor: '#EEEEEE',
        paddingTop: 8,
    },
    signatureSection: {
        marginTop: 30,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    signatureBox: {
        width: '45%',
        height: 80,
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 8,
        backgroundColor: '#FAFAFA',
    },
    signatureLabel: {
        fontSize: 8,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    signatureHint: {
        fontSize: 7,
        color: '#999',
        textAlign: 'center',
    },
});

interface FurnitureItem {
    label: string;
    present: boolean;
}

interface FurnitureInventoryProps {
    items: FurnitureItem[];
    propertyAddress: string;
    date: string;
    landlordName: string;
    tenantNames: string[];
}

const FurnitureInventoryDocument: React.FC<FurnitureInventoryProps> = ({
    items,
    propertyAddress,
    date,
    landlordName,
    tenantNames,
}) => {
    // Split items into mandatory (first 13) and optional (rest handled outside)
    const mandatoryItems = items.slice(0, 13);
    const optionalItems = items.slice(13);

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <Text style={styles.title}>INVENTAIRE ET ÉTAT DU MOBILIER</Text>
                    <Text style={styles.subtitle}>Annexe au contrat de location meublée — Décret n° 2015-981 du 31 juillet 2015</Text>
                </View>

                <View style={styles.section}>
                    <Text style={{ fontSize: 9, marginBottom: 4 }}>Adresse du logement : {propertyAddress}</Text>
                    <Text style={{ fontSize: 9, marginBottom: 4 }}>Date de l&apos;inventaire : {date}</Text>
                    <Text style={{ fontSize: 9, marginBottom: 4 }}>Bailleur : {landlordName}</Text>
                    <Text style={{ fontSize: 9, marginBottom: 10 }}>Locataire(s) : {tenantNames.join(', ')}</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Éléments obligatoires (décret n° 2015-981)</Text>

                    <View style={styles.tableHeader}>
                        <Text style={{ ...styles.headerText, ...styles.colItem }}>Élément</Text>
                        <Text style={{ ...styles.headerText, ...styles.colPresent }}>Présent</Text>
                        <Text style={{ ...styles.headerText, ...styles.colQty }}>Quantité</Text>
                        <Text style={{ ...styles.headerText, ...styles.colState }}>État</Text>
                    </View>

                    {mandatoryItems.map((item, idx) => (
                        <View key={idx} style={styles.tableRow}>
                            <Text style={styles.colItem}>{item.label}</Text>
                            <Text style={styles.colPresent}>{item.present ? '✓' : '✗'}</Text>
                            <Text style={styles.colQty}>{item.present ? '1' : '—'}</Text>
                            <Text style={styles.colState}>{item.present ? 'Bon état' : '—'}</Text>
                        </View>
                    ))}
                </View>

                {optionalItems.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Éléments supplémentaires</Text>

                        <View style={styles.tableHeader}>
                            <Text style={{ ...styles.headerText, ...styles.colItem }}>Élément</Text>
                            <Text style={{ ...styles.headerText, ...styles.colPresent }}>Présent</Text>
                            <Text style={{ ...styles.headerText, ...styles.colQty }}>Quantité</Text>
                            <Text style={{ ...styles.headerText, ...styles.colState }}>État</Text>
                        </View>

                        {optionalItems.map((item, idx) => (
                            <View key={idx} style={styles.tableRow}>
                                <Text style={styles.colItem}>{item.label}</Text>
                                <Text style={styles.colPresent}>{item.present ? '✓' : '✗'}</Text>
                                <Text style={styles.colQty}>{item.present ? '1' : '—'}</Text>
                                <Text style={styles.colState}>{item.present ? 'Bon état' : '—'}</Text>
                            </View>
                        ))}
                    </View>
                )}

                <View style={styles.signatureSection}>
                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureLabel}>LE BAILLEUR</Text>
                        <Text style={styles.signatureHint}>Signature précédée de{"\n"}&quot;Lu et approuvé&quot;</Text>
                    </View>
                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureLabel}>LE(S) LOCATAIRE(S)</Text>
                        <Text style={styles.signatureHint}>Signature précédée de{"\n"}&quot;Lu et approuvé&quot;</Text>
                    </View>
                </View>

                <Text style={styles.footer}>
                    Inventaire établi conformément au décret n° 2015-981 du 31 juillet 2015 — Article 25-5 de la loi n° 89-462 du 6 juillet 1989
                </Text>
            </Page>
        </Document>
    );
};

export default FurnitureInventoryDocument;
