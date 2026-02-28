import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import type {
  InvestmentInput,
  InvestmentResult,
  TaxRegimeComparison,
  YearlyProjection,
} from '@/services/InvestmentSimulatorService';

export interface InvestmentReportData {
  input: InvestmentInput;
  result: InvestmentResult;
  generatedAt: string;
  simulationName?: string;
}

const ACCENT = '#E8A838';

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
  // Header
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
  // Sections
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginTop: 20,
    marginBottom: 8,
    color: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 4,
  },
  sectionTitleSmall: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginTop: 14,
    marginBottom: 6,
    color: '#333',
  },
  // KPI row
  kpiRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  kpiCard: {
    flex: 1,
    padding: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
    marginRight: 6,
    alignItems: 'center',
  },
  kpiCardLast: {
    marginRight: 0,
  },
  kpiLabel: {
    fontSize: 8,
    color: '#666',
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
  },
  // Info box
  infoBox: {
    marginBottom: 12,
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
    width: 180,
    fontSize: 9,
    color: '#666',
  },
  infoValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    flex: 1,
  },
  // Tables
  table: {
    marginVertical: 6,
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
  tableRowHighlight: {
    backgroundColor: '#fef9ee',
  },
  headerText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
  },
  cellSm: {
    width: 50,
    padding: 4,
    fontSize: 8,
  },
  cellMd: {
    width: 80,
    padding: 4,
    fontSize: 8,
  },
  cellLg: {
    flex: 1,
    padding: 4,
    fontSize: 8,
  },
  cellRight: {
    textAlign: 'right',
  },
  // Recommended badge
  badge: {
    fontSize: 7,
    color: ACCENT,
    fontFamily: 'Helvetica-Bold',
  },
  // Footer
  footer: {
    marginTop: 'auto',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    fontSize: 8,
    color: '#999',
    textAlign: 'center',
  },
  footerBrand: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: ACCENT,
  },
  // Note
  note: {
    fontSize: 8,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
});

const fmt = (n: number) =>
  Math.round(n).toLocaleString('fr-FR');
const fmtPct = (n: number) =>
  n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });

export const InvestmentReportDocument: React.FC<{
  data: InvestmentReportData;
}> = ({ data }) => {
  const { input, result } = data;

  return (
    <Document>
      {/* Page 1 — Synthèse + Projet + Financement */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>CORIDOR</Text>
          <Text style={styles.title}>
            Rapport d'investissement locatif
          </Text>
          <Text style={styles.subtitle}>
            {data.simulationName
              ? `${data.simulationName} — Généré le ${data.generatedAt}`
              : `Généré le ${data.generatedAt}`}
          </Text>
        </View>

        {/* 1. SYNTHÈSE */}
        <Text style={styles.sectionTitle}>1. Synthèse</Text>
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Rendement net-net</Text>
            <Text style={styles.kpiValue}>{fmtPct(result.netNetYield)} %</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Cash-flow mensuel</Text>
            <Text style={styles.kpiValue}>
              {result.monthlyCashflow >= 0 ? '+' : ''}
              {fmt(result.monthlyCashflow)} €
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>
              TRI sur {input.projectionYears} ans
            </Text>
            <Text style={styles.kpiValue}>{fmtPct(result.tri)} %</Text>
          </View>
          <View style={[styles.kpiCard, styles.kpiCardLast]}>
            <Text style={styles.kpiLabel}>Régime recommandé</Text>
            <Text style={[styles.kpiValue, { fontSize: 11 }]}>
              {result.recommendedRegime}
            </Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Rendement brut</Text>
            <Text style={styles.infoValue}>{fmtPct(result.grossYield)} %</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Rendement net (avant impôts)</Text>
            <Text style={styles.infoValue}>{fmtPct(result.netYield)} %</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Impôt annuel estimé</Text>
            <Text style={styles.infoValue}>{fmt(result.yearlyTax)} €</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>VAN (taux 3%)</Text>
            <Text style={styles.infoValue}>{fmt(result.van)} €</Text>
          </View>
        </View>

        {/* 2. LE PROJET */}
        <Text style={styles.sectionTitle}>2. Le projet</Text>
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Prix d'achat</Text>
            <Text style={styles.infoValue}>{fmt(input.purchasePrice)} €</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              Frais de notaire ({Math.round(input.notaryFeesRate * 100)} %)
            </Text>
            <Text style={styles.infoValue}>
              {fmt(input.purchasePrice * input.notaryFeesRate)} €
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Travaux</Text>
            <Text style={styles.infoValue}>{fmt(input.renovationCost)} €</Text>
          </View>
          {input.isFurnished && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ameublement</Text>
              <Text style={styles.infoValue}>
                {fmt(input.furnitureCost)} €
              </Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Type de location</Text>
            <Text style={styles.infoValue}>
              {input.isFurnished ? 'Meublé' : 'Nu'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Investissement total</Text>
            <Text style={styles.infoValue}>
              {fmt(result.totalInvestment)} €
            </Text>
          </View>
        </View>

        {/* 3. FINANCEMENT */}
        <Text style={styles.sectionTitle}>3. Financement</Text>
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Apport personnel</Text>
            <Text style={styles.infoValue}>
              {fmt(input.personalContribution)} €
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Montant emprunté</Text>
            <Text style={styles.infoValue}>{fmt(result.loanAmount)} €</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              Durée : {input.loanDurationYears} ans — Taux :{' '}
              {fmtPct(input.loanRate * 100)} %
            </Text>
            <Text style={styles.infoValue}></Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mensualité</Text>
            <Text style={styles.infoValue}>
              {fmt(result.monthlyLoanPayment)} € / mois
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          <Text style={styles.footerBrand}>Coridor</Text> — Simulation
          indicative, ne constitue pas un conseil en investissement.
        </Text>
      </Page>

      {/* Page 2 — Revenus & Charges + Fiscalité */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>CORIDOR</Text>
          <Text style={styles.title}>Revenus, charges et fiscalité</Text>
        </View>

        {/* 4. REVENUS & CHARGES */}
        <Text style={styles.sectionTitle}>4. Revenus & charges (année 1)</Text>
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Loyer mensuel</Text>
            <Text style={styles.infoValue}>{fmt(input.monthlyRent)} €</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              Loyers annuels bruts (12 mois)
            </Text>
            <Text style={styles.infoValue}>
              {fmt(input.monthlyRent * 12)} €
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              Vacance locative (
              {fmtPct(input.vacancyRate * 100)} %)
            </Text>
            <Text style={styles.infoValue}>
              -{fmt(input.monthlyRent * 12 * input.vacancyRate)} €
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Charges non récupérables</Text>
            <Text style={styles.infoValue}>
              {fmt(input.monthlyCharges * 12)} € / an
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Taxe foncière</Text>
            <Text style={styles.infoValue}>
              {fmt(input.propertyTaxYearly)} € / an
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Assurance PNO</Text>
            <Text style={styles.infoValue}>
              {fmt(input.insuranceYearly)} € / an
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Charges copropriété</Text>
            <Text style={styles.infoValue}>
              {fmt(input.coprYearly)} € / an
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Entretien / travaux</Text>
            <Text style={styles.infoValue}>
              {fmt(input.maintenanceYearly)} € / an
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              Gestion ({Math.round(input.managementFeesRate * 100)} %)
            </Text>
            <Text style={styles.infoValue}>
              {fmt(input.monthlyRent * 12 * input.managementFeesRate)} € / an
            </Text>
          </View>
        </View>

        {/* 5. FISCALITÉ — Comparaison régimes */}
        <Text style={styles.sectionTitle}>5. Comparaison régimes fiscaux</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.cellLg, styles.headerText]}>Régime</Text>
            <Text style={[styles.cellMd, styles.headerText, styles.cellRight]}>
              Impôt / an
            </Text>
            <Text style={[styles.cellMd, styles.headerText, styles.cellRight]}>
              Cash-flow / m
            </Text>
            <Text style={[styles.cellSm, styles.headerText]}>

            </Text>
          </View>
          {result.taxRegimeComparison.map(
            (regime: TaxRegimeComparison, i: number) => (
              <View
                key={i}
                style={[
                  styles.tableRow,
                  i % 2 === 1 ? styles.tableRowAlt : {},
                  regime.isRecommended ? styles.tableRowHighlight : {},
                ]}
              >
                <Text style={styles.cellLg}>
                  {regime.label}
                  {!regime.eligible ? ' (non éligible)' : ''}
                </Text>
                <Text style={[styles.cellMd, styles.cellRight]}>
                  {regime.eligible ? `${fmt(regime.yearlyTax)} €` : '—'}
                </Text>
                <Text style={[styles.cellMd, styles.cellRight]}>
                  {regime.eligible
                    ? `${regime.netCashflow >= 0 ? '+' : ''}${fmt(regime.netCashflow)} €`
                    : '—'}
                </Text>
                <Text style={styles.cellSm}>
                  {regime.isRecommended && (
                    <Text style={styles.badge}>Optimal</Text>
                  )}
                </Text>
              </View>
            ),
          )}
        </View>

        {/* Amortization summary */}
        {result.loanAmortization.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              6. Amortissement du crédit (extraits)
            </Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.cellSm, styles.headerText]}>Année</Text>
                <Text
                  style={[styles.cellMd, styles.headerText, styles.cellRight]}
                >
                  Capital
                </Text>
                <Text
                  style={[styles.cellMd, styles.headerText, styles.cellRight]}
                >
                  Intérêts
                </Text>
                <Text
                  style={[styles.cellMd, styles.headerText, styles.cellRight]}
                >
                  Assurance
                </Text>
                <Text
                  style={[styles.cellMd, styles.headerText, styles.cellRight]}
                >
                  Restant dû
                </Text>
              </View>
              {aggregateByYear(result.loanAmortization)
                .filter(
                  (_, i, arr) =>
                    i < 5 || i >= arr.length - 3 || i === Math.floor(arr.length / 2),
                )
                .map((row, i) => (
                  <View
                    key={row.year}
                    style={[
                      styles.tableRow,
                      i % 2 === 1 ? styles.tableRowAlt : {},
                    ]}
                  >
                    <Text style={styles.cellSm}>{row.year}</Text>
                    <Text style={[styles.cellMd, styles.cellRight]}>
                      {fmt(row.principal)} €
                    </Text>
                    <Text style={[styles.cellMd, styles.cellRight]}>
                      {fmt(row.interest)} €
                    </Text>
                    <Text style={[styles.cellMd, styles.cellRight]}>
                      {fmt(row.insurance)} €
                    </Text>
                    <Text style={[styles.cellMd, styles.cellRight]}>
                      {fmt(row.remainingBalance)} €
                    </Text>
                  </View>
                ))}
            </View>
          </>
        )}

        <Text style={styles.footer}>
          <Text style={styles.footerBrand}>Coridor</Text> — Simulation
          indicative.
        </Text>
      </Page>

      {/* Page 3 — Projection + Plus-value + Placements */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>CORIDOR</Text>
          <Text style={styles.title}>
            Projection & plus-value
          </Text>
        </View>

        {/* 7. PROJECTION */}
        <Text style={styles.sectionTitle}>
          7. Projection sur {input.projectionYears} ans
        </Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.cellSm, styles.headerText]}>An.</Text>
            <Text
              style={[styles.cellMd, styles.headerText, styles.cellRight]}
            >
              Loyers
            </Text>
            <Text
              style={[styles.cellMd, styles.headerText, styles.cellRight]}
            >
              Crédit
            </Text>
            <Text style={[styles.cellSm, styles.headerText, styles.cellRight]}>
              Impôt
            </Text>
            <Text
              style={[styles.cellMd, styles.headerText, styles.cellRight]}
            >
              Cash-flow
            </Text>
            <Text
              style={[styles.cellMd, styles.headerText, styles.cellRight]}
            >
              Patrimoine
            </Text>
          </View>
          {result.yearlyProjection.map(
            (yp: YearlyProjection, i: number) => (
              <View
                key={yp.year}
                style={[
                  styles.tableRow,
                  i % 2 === 1 ? styles.tableRowAlt : {},
                ]}
              >
                <Text style={styles.cellSm}>{yp.year}</Text>
                <Text style={[styles.cellMd, styles.cellRight]}>
                  {fmt(yp.netRent)} €
                </Text>
                <Text style={[styles.cellMd, styles.cellRight]}>
                  {fmt(yp.loanPayment)} €
                </Text>
                <Text style={[styles.cellSm, styles.cellRight]}>
                  {fmt(yp.tax)} €
                </Text>
                <Text style={[styles.cellMd, styles.cellRight]}>
                  {fmt(yp.cashflow)} €
                </Text>
                <Text style={[styles.cellMd, styles.cellRight]}>
                  {fmt(yp.netWealth)} €
                </Text>
              </View>
            ),
          )}
        </View>

        {/* 8. PLUS-VALUE */}
        <Text style={styles.sectionTitle}>
          8. Plus-value estimée ({input.projectionYears} ans)
        </Text>
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Prix revente estimé</Text>
            <Text style={styles.infoValue}>
              {fmt(result.estimatedResalePrice)} €
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Plus-value brute</Text>
            <Text style={styles.infoValue}>
              {fmt(result.capitalGain)} €
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Impôt plus-value</Text>
            <Text style={styles.infoValue}>
              {fmt(result.capitalGainTax)} €
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Plus-value nette</Text>
            <Text style={styles.infoValue}>
              {fmt(result.netCapitalGain)} €
            </Text>
          </View>
        </View>

        {/* 9. COMPARAISON PLACEMENTS */}
        <Text style={styles.sectionTitle}>
          9. Comparaison avec placements alternatifs
        </Text>
        <Text style={{ fontSize: 9, color: '#666', marginBottom: 6 }}>
          Apport de {fmt(input.personalContribution)} € placé sur{' '}
          {input.projectionYears} ans
        </Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.cellLg, styles.headerText]}>Placement</Text>
            <Text
              style={[styles.cellMd, styles.headerText, styles.cellRight]}
            >
              Taux annuel
            </Text>
            <Text
              style={[styles.cellMd, styles.headerText, styles.cellRight]}
            >
              Capital final
            </Text>
            <Text
              style={[styles.cellMd, styles.headerText, styles.cellRight]}
            >
              Gain total
            </Text>
          </View>
          {[result.vsLivretA, result.vsAssuranceVie, result.vsBourseSP500].map(
            (p, i) => (
              <View
                key={p.name}
                style={[
                  styles.tableRow,
                  i % 2 === 1 ? styles.tableRowAlt : {},
                ]}
              >
                <Text style={styles.cellLg}>{p.name}</Text>
                <Text style={[styles.cellMd, styles.cellRight]}>
                  {fmtPct(p.annualRate * 100)} %
                </Text>
                <Text style={[styles.cellMd, styles.cellRight]}>
                  {fmt(p.finalValue)} €
                </Text>
                <Text style={[styles.cellMd, styles.cellRight]}>
                  {fmt(p.totalGain)} €
                </Text>
              </View>
            ),
          )}
        </View>

        <Text style={styles.note}>
          L'immobilier bénéficie de l'effet de levier du crédit. Avec{' '}
          {fmt(input.personalContribution)} € d'apport, vous contrôlez un bien
          de {fmt(result.totalInvestment)} €. Les rendements passés ne
          préjugent pas des rendements futurs.
        </Text>

        <Text style={styles.footer}>
          Simulation réalisée sur{' '}
          <Text style={styles.footerBrand}>Coridor.fr</Text>
          {'\n'}La plateforme de gestion locative transparente
        </Text>
      </Page>
    </Document>
  );
};

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function aggregateByYear(
  rows: {
    month: number;
    principal: number;
    interest: number;
    insurance: number;
    remainingBalance: number;
  }[],
) {
  const years: Array<{
    year: number;
    principal: number;
    interest: number;
    insurance: number;
    remainingBalance: number;
  }> = [];

  for (let i = 0; i < rows.length; i += 12) {
    const chunk = rows.slice(i, i + 12);
    years.push({
      year: Math.floor(i / 12) + 1,
      principal: Math.round(chunk.reduce((s, r) => s + r.principal, 0)),
      interest: Math.round(chunk.reduce((s, r) => s + r.interest, 0)),
      insurance: Math.round(chunk.reduce((s, r) => s + r.insurance, 0)),
      remainingBalance: chunk[chunk.length - 1]?.remainingBalance ?? 0,
    });
  }

  return years;
}
