import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

export interface FormalNoticeData {
  // Tenant (sender)
  tenantName: string;
  tenantAddress: string;

  // Landlord (recipient)
  landlordName: string;
  landlordAddress: string;

  // Property
  propertyAddress: string;

  // Lease
  leaseSignedDate: string;
  moveInDate: string;
  moveOutDate: string;

  // Deposit
  depositAmountCents: number;
  retainedAmountCents: number;
  refundAmountCents: number;

  // Deadline
  legalDeadline: string;
  legalDeadlineMonths: number;
  daysOverdue: number;

  // Penalty
  monthlyRentCents: number;
  overdueMonths: number;
  penaltyAmountCents: number;

  // Date
  noticeDate: string;
}

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 50,
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: '#1a1a1a',
    lineHeight: 1.6,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 11,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
  },
  parties: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    gap: 20,
  },
  partyBox: {
    flex: 1,
  },
  partyLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#999',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  partyName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  partyAddress: {
    fontSize: 10,
    color: '#444',
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    marginBottom: 8,
  },
  bold: {
    fontFamily: 'Helvetica-Bold',
  },
  article: {
    fontSize: 10,
    color: '#555',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  table: {
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tableRowHeader: {
    backgroundColor: '#f5f5f5',
  },
  tableCell: {
    flex: 1,
    padding: 6,
    fontSize: 10,
  },
  tableCellRight: {
    flex: 1,
    padding: 6,
    fontSize: 10,
    textAlign: 'right',
  },
  deadline: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fff8f0',
    borderWidth: 1,
    borderColor: '#f97316',
    borderRadius: 4,
  },
  deadlineText: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#c2410c',
  },
  footer: {
    marginTop: 40,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  signature: {
    marginTop: 30,
  },
  signatureLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 4,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    width: 200,
    marginTop: 40,
  },
  disclaimer: {
    marginTop: 20,
    fontSize: 8,
    color: '#999',
    textAlign: 'center',
  },
});

const formatCents = (cents: number) => (cents / 100).toFixed(2);

export const FormalNoticeDocument: React.FC<{ data: FormalNoticeData }> = ({ data }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Title */}
      <View style={styles.header}>
        <Text style={styles.title}>MISE EN DEMEURE</Text>
        <Text style={styles.subtitle}>Lettre recommandée avec accusé de réception</Text>
      </View>

      {/* Parties */}
      <View style={styles.parties}>
        <View style={styles.partyBox}>
          <Text style={styles.partyLabel}>Expéditeur (Locataire)</Text>
          <Text style={styles.partyName}>{data.tenantName}</Text>
          <Text style={styles.partyAddress}>{data.tenantAddress}</Text>
        </View>
        <View style={styles.partyBox}>
          <Text style={styles.partyLabel}>Destinataire (Bailleur)</Text>
          <Text style={styles.partyName}>{data.landlordName}</Text>
          <Text style={styles.partyAddress}>{data.landlordAddress}</Text>
        </View>
      </View>

      {/* Date and Object */}
      <Text style={styles.paragraph}>
        Fait à ________, le {data.noticeDate}
      </Text>

      <Text style={[styles.sectionTitle, { marginTop: 8 }]}>
        Objet : Mise en demeure de restituer le dépôt de garantie
      </Text>

      {/* Facts */}
      <Text style={styles.sectionTitle}>Rappel des faits</Text>
      <Text style={styles.paragraph}>
        Par contrat de bail signé le {data.leaseSignedDate}, vous m&apos;avez donné en location le logement situé au {data.propertyAddress}.
      </Text>
      <Text style={styles.paragraph}>
        À la signature du bail, j&apos;ai versé un dépôt de garantie d&apos;un montant de {formatCents(data.depositAmountCents)}€.
      </Text>
      <Text style={styles.paragraph}>
        L&apos;état des lieux de sortie a été réalisé le {data.moveOutDate}. Les clés ont été remises à cette date.
      </Text>

      {/* Legal basis */}
      <Text style={styles.sectionTitle}>Fondement juridique</Text>
      <Text style={styles.article}>
        Article 22 de la loi n°89-462 du 6 juillet 1989 : « Le dépôt de garantie est restitué dans un délai maximal de {data.legalDeadlineMonths === 1 ? 'un mois' : 'deux mois'} à compter de la remise en main propre des clés au bailleur [...]. À défaut de restitution dans les délais prévus, le dépôt de garantie restant dû au locataire est majoré d&apos;une somme égale à 10% du loyer mensuel en principal, pour chaque période mensuelle commencée en retard. »
      </Text>

      {/* Amounts */}
      <Text style={styles.sectionTitle}>Décompte</Text>
      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableRowHeader]}>
          <Text style={[styles.tableCell, { fontFamily: 'Helvetica-Bold' }]}>Poste</Text>
          <Text style={[styles.tableCellRight, { fontFamily: 'Helvetica-Bold' }]}>Montant</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>Dépôt de garantie versé</Text>
          <Text style={styles.tableCellRight}>{formatCents(data.depositAmountCents)}€</Text>
        </View>
        {data.retainedAmountCents > 0 && (
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Retenues</Text>
            <Text style={styles.tableCellRight}>-{formatCents(data.retainedAmountCents)}€</Text>
          </View>
        )}
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { fontFamily: 'Helvetica-Bold' }]}>Somme à restituer</Text>
          <Text style={[styles.tableCellRight, { fontFamily: 'Helvetica-Bold' }]}>{formatCents(data.refundAmountCents)}€</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { color: '#c2410c' }]}>
            Pénalité de retard ({data.overdueMonths} mois × 10% × {formatCents(data.monthlyRentCents)}€)
          </Text>
          <Text style={[styles.tableCellRight, { fontFamily: 'Helvetica-Bold', color: '#c2410c' }]}>
            +{formatCents(data.penaltyAmountCents)}€
          </Text>
        </View>
        <View style={[styles.tableRow, { backgroundColor: '#f5f5f5', borderBottomWidth: 0 }]}>
          <Text style={[styles.tableCell, { fontFamily: 'Helvetica-Bold', fontSize: 12 }]}>Total dû</Text>
          <Text style={[styles.tableCellRight, { fontFamily: 'Helvetica-Bold', fontSize: 12 }]}>
            {formatCents(data.refundAmountCents + data.penaltyAmountCents)}€
          </Text>
        </View>
      </View>

      {/* Demand */}
      <View style={styles.deadline}>
        <Text style={styles.deadlineText}>
          Par la présente, je vous mets en demeure de me restituer la somme de {formatCents(data.refundAmountCents + data.penaltyAmountCents)}€ dans un délai de 8 jours à compter de la réception de ce courrier.
        </Text>
      </View>

      <Text style={[styles.paragraph, { marginTop: 12 }]}>
        À défaut de règlement dans ce délai, je me réserve le droit de saisir la Commission Départementale de Conciliation (CDC) puis, le cas échéant, le Tribunal judiciaire compétent, afin d&apos;obtenir la restitution de mon dépôt de garantie majoré des pénalités légales.
      </Text>

      {/* Signature */}
      <View style={styles.signature}>
        <Text style={styles.signatureLabel}>Signature du locataire</Text>
        <View style={styles.signatureLine} />
      </View>

      {/* Disclaimer */}
      <Text style={styles.disclaimer}>
        Document généré par Coridor — plateforme de gestion locative. Ce document est un modèle et ne constitue pas un conseil juridique.
      </Text>
    </Page>
  </Document>
);
