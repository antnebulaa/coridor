import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

export interface DepositTimelineData {
  // Parties
  landlordName: string;
  tenantName: string;
  propertyAddress: string;

  // Deposit
  depositAmountCents: number;
  status: string;

  // Penalty
  isOverdue: boolean;
  overdueMonths: number;
  penaltyAmountCents: number;
  legalDeadline: string | null;

  // Events
  events: {
    date: string;
    type: string;
    description: string;
    actorType: string;
  }[];

  // Generated
  generatedAt: string;
}

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a1a',
    lineHeight: 1.5,
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#E8A838',
    paddingBottom: 10,
  },
  brand: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginTop: 4,
    color: '#333',
  },
  date: {
    fontSize: 9,
    color: '#666',
    marginTop: 2,
  },
  infoBox: {
    marginBottom: 16,
    padding: 10,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  infoLabel: {
    width: 120,
    fontSize: 9,
    color: '#666',
  },
  infoValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginTop: 16,
    marginBottom: 8,
  },
  table: {
    marginVertical: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderBottomWidth: 0,
  },
  tableRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ddd',
    borderTopWidth: 0,
  },
  tableRowAlt: {
    backgroundColor: '#fafafa',
  },
  colDate: {
    width: 80,
    padding: 5,
    fontSize: 9,
  },
  colEvent: {
    flex: 1,
    padding: 5,
    fontSize: 9,
  },
  colActor: {
    width: 70,
    padding: 5,
    fontSize: 9,
  },
  colDescription: {
    flex: 2,
    padding: 5,
    fontSize: 9,
  },
  headerText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },
  penaltyBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 4,
  },
  penaltyText: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#991b1b',
  },
  penaltyDetail: {
    fontSize: 9,
    color: '#dc2626',
    marginTop: 3,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    fontSize: 8,
    color: '#999',
    textAlign: 'center',
  },
});

const formatCents = (cents: number) => (cents / 100).toFixed(2);

const ACTOR_LABELS: Record<string, string> = {
  system: 'Système',
  landlord: 'Bailleur',
  tenant: 'Locataire',
  powens: 'Banque',
  cron: 'Automatique',
};

export const DepositTimelineDocument: React.FC<{ data: DepositTimelineData }> = ({ data }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.brand}>CORIDOR</Text>
        <Text style={styles.title}>Chronologie du dépôt de garantie</Text>
        <Text style={styles.date}>Généré le {data.generatedAt}</Text>
      </View>

      {/* Info */}
      <View style={styles.infoBox}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Bailleur</Text>
          <Text style={styles.infoValue}>{data.landlordName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Locataire</Text>
          <Text style={styles.infoValue}>{data.tenantName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Bien</Text>
          <Text style={styles.infoValue}>{data.propertyAddress}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Montant du dépôt</Text>
          <Text style={styles.infoValue}>{formatCents(data.depositAmountCents)}€</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Statut</Text>
          <Text style={styles.infoValue}>{data.status}</Text>
        </View>
        {data.legalDeadline && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Échéance légale</Text>
            <Text style={styles.infoValue}>{data.legalDeadline}</Text>
          </View>
        )}
      </View>

      {/* Timeline table */}
      <Text style={styles.sectionTitle}>Événements ({data.events.length})</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.colDate, styles.headerText]}>Date</Text>
          <Text style={[styles.colActor, styles.headerText]}>Acteur</Text>
          <Text style={[styles.colDescription, styles.headerText]}>Détails</Text>
        </View>
        {data.events.map((event, i) => (
          <View
            key={i}
            style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
          >
            <Text style={styles.colDate}>{event.date}</Text>
            <Text style={styles.colActor}>
              {ACTOR_LABELS[event.actorType] || event.actorType}
            </Text>
            <Text style={styles.colDescription}>{event.description}</Text>
          </View>
        ))}
      </View>

      {/* Penalty section */}
      {data.isOverdue && (
        <View style={styles.penaltyBox}>
          <Text style={styles.penaltyText}>
            Pénalité de retard : {formatCents(data.penaltyAmountCents)}€
          </Text>
          <Text style={styles.penaltyDetail}>
            {data.overdueMonths} mois de retard × 10% du loyer mensuel (art. 22 al. 2 loi 89-462)
          </Text>
        </View>
      )}

      {/* Footer */}
      <Text style={styles.footer}>
        Document généré par Coridor — plateforme de gestion locative
      </Text>
    </Page>
  </Document>
);
