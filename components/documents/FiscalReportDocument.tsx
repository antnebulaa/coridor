import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

export interface FiscalReportData {
  year: number;
  propertyTitle?: string;
  grossRevenueCents: number;
  totalDeductibleCents: number;
  managementFeesCents: number;
  netTaxableIncomeCents: number;
  byCategory: {
    category: string;
    label: string;
    totalCents: number;
  }[];
  declaration2044: {
    line: string;
    description: string;
    amountCents: number;
  }[];
  expenses: {
    date: string;
    category: string;
    label: string;
    amountTotalCents: number;
    amountDeductibleCents: number;
    isRecoverable: boolean;
  }[];
  generatedAt: string;
}

const ACCENT = '#7C3AED'; // Purple to match FiscalClient

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
    borderBottomColor: ACCENT,
    paddingBottom: 10,
  },
  brand: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginTop: 4,
    color: '#333',
  },
  subtitle: {
    fontSize: 9,
    color: '#666',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
    marginTop: 16,
    color: '#1a1a1a',
  },
  // Summary cards
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  summaryLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
  },
  // Table
  table: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    paddingBottom: 6,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f5f5f5',
  },
  tableRowHighlight: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: ACCENT,
    marginTop: 4,
    backgroundColor: '#f5f3ff',
  },
  cellLine: {
    width: 40,
    fontSize: 9,
    color: '#666',
    fontFamily: 'Courier',
  },
  cellDesc: {
    flex: 1,
    fontSize: 9,
  },
  cellAmount: {
    width: 80,
    textAlign: 'right',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  // Expense table
  cellDate: {
    width: 70,
    fontSize: 8,
  },
  cellCategory: {
    width: 120,
    fontSize: 8,
  },
  cellExpAmount: {
    width: 70,
    textAlign: 'right',
    fontSize: 8,
  },
  cellTag: {
    width: 60,
    textAlign: 'center',
    fontSize: 7,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#999',
    borderTopWidth: 0.5,
    borderTopColor: '#e5e5e5',
    paddingTop: 8,
  },
  disclaimer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  disclaimerText: {
    fontSize: 8,
    color: '#92400E',
    lineHeight: 1.4,
  },
});

const fmt = (cents: number): string =>
  (cents / 100).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' €';

export const FiscalReportDocument: React.FC<{ data: FiscalReportData }> = ({
  data,
}) => (
  <Document>
    {/* Page 1: Summary + Declaration 2044 */}
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.brand}>CORIDOR</Text>
        <Text style={styles.title}>
          Récapitulatif fiscal {data.year}
          {data.propertyTitle ? ` — ${data.propertyTitle}` : ' — Tous les biens'}
        </Text>
        <Text style={styles.subtitle}>
          Généré le {data.generatedAt} • Document indicatif
        </Text>
      </View>

      {/* Summary */}
      <Text style={styles.sectionTitle}>Synthèse</Text>
      <View style={styles.summaryRow}>
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
          ]}
        >
          <Text style={[styles.summaryLabel, { color: '#15803D' }]}>
            Revenus bruts
          </Text>
          <Text style={[styles.summaryValue, { color: '#166534' }]}>
            {fmt(data.grossRevenueCents)}
          </Text>
        </View>
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
          ]}
        >
          <Text style={[styles.summaryLabel, { color: '#DC2626' }]}>
            Charges déductibles
          </Text>
          <Text style={[styles.summaryValue, { color: '#991B1B' }]}>
            {fmt(data.totalDeductibleCents)}
          </Text>
        </View>
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' },
          ]}
        >
          <Text style={[styles.summaryLabel, { color: '#7C3AED' }]}>
            Revenu net imposable
          </Text>
          <Text style={[styles.summaryValue, { color: '#5B21B6' }]}>
            {fmt(data.netTaxableIncomeCents)}
          </Text>
        </View>
      </View>

      {/* Category Breakdown */}
      {data.byCategory.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Détail par catégorie</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.cellDesc, { fontFamily: 'Helvetica-Bold', fontSize: 8, color: '#666' }]}>
                Catégorie
              </Text>
              <Text style={[styles.cellAmount, { fontFamily: 'Helvetica-Bold', fontSize: 8, color: '#666' }]}>
                Montant
              </Text>
            </View>
            {data.byCategory.map((cat, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.cellDesc}>{cat.label}</Text>
                <Text style={styles.cellAmount}>{fmt(cat.totalCents)}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Declaration 2044 */}
      <Text style={styles.sectionTitle}>Déclaration 2044</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.cellLine, { fontFamily: 'Helvetica-Bold', fontSize: 8, color: '#666' }]}>
            Ligne
          </Text>
          <Text style={[styles.cellDesc, { fontFamily: 'Helvetica-Bold', fontSize: 8, color: '#666' }]}>
            Description
          </Text>
          <Text style={[styles.cellAmount, { fontFamily: 'Helvetica-Bold', fontSize: 8, color: '#666' }]}>
            Montant
          </Text>
        </View>
        {data.declaration2044.map((row, i) => (
          <View
            key={i}
            style={row.line === '420' ? styles.tableRowHighlight : styles.tableRow}
          >
            <Text style={[styles.cellLine, row.line === '420' ? { fontFamily: 'Helvetica-Bold' as const } : {}]}>
              {row.line}
            </Text>
            <Text style={[styles.cellDesc, row.line === '420' ? { fontFamily: 'Helvetica-Bold' as const } : {}]}>
              {row.description}
            </Text>
            <Text
              style={[
                styles.cellAmount,
                { color: row.line === '211' ? '#15803D' : row.line === '420' ? '#5B21B6' : '#DC2626' },
              ]}
            >
              {fmt(row.amountCents)}
            </Text>
          </View>
        ))}
      </View>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          Ce document est fourni à titre indicatif. Coridor n&apos;est pas un cabinet comptable.
          Consultez votre conseiller fiscal pour votre déclaration de revenus.
        </Text>
      </View>

      <Text style={styles.footer}>
        Coridor — Récapitulatif fiscal indicatif • {data.year}
      </Text>
    </Page>

    {/* Page 2: Expense detail (if expenses exist) */}
    {data.expenses.length > 0 && (
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>CORIDOR</Text>
          <Text style={styles.title}>
            Détail des dépenses {data.year}
          </Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.cellDate, { fontFamily: 'Helvetica-Bold', color: '#666' }]}>
              Date
            </Text>
            <Text style={[styles.cellCategory, { fontFamily: 'Helvetica-Bold', color: '#666' }]}>
              Catégorie
            </Text>
            <Text style={[styles.cellExpAmount, { fontFamily: 'Helvetica-Bold', color: '#666' }]}>
              Total
            </Text>
            <Text style={[styles.cellExpAmount, { fontFamily: 'Helvetica-Bold', color: '#666' }]}>
              Déductible
            </Text>
            <Text style={[styles.cellTag, { fontFamily: 'Helvetica-Bold', color: '#666' }]}>
              Récup.
            </Text>
          </View>
          {data.expenses.map((exp, i) => (
            <View key={i} style={[styles.tableRow, i % 2 === 0 ? { backgroundColor: '#FAFAFA' } : {}]}>
              <Text style={styles.cellDate}>{exp.date}</Text>
              <Text style={styles.cellCategory}>{exp.label}</Text>
              <Text style={styles.cellExpAmount}>{fmt(exp.amountTotalCents)}</Text>
              <Text style={styles.cellExpAmount}>{fmt(exp.amountDeductibleCents)}</Text>
              <Text style={styles.cellTag}>{exp.isRecoverable ? 'Oui' : 'Non'}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          Coridor — Détail des dépenses • {data.year}
        </Text>
      </Page>
    )}
  </Document>
);
