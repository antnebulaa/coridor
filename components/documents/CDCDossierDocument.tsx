import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

// ─── Data Types ───

export interface CDCDeductionItem {
  description: string;
  repairCostCents: number;
  vetustePct: number;
  tenantShareCents: number;
}

export interface CDCTimelineEvent {
  date: string;
  type: string;
  description: string;
  actorType: string;
}

export interface CDCMessage {
  date: string;
  senderName: string;
  body: string;
}

export interface CDCDossierData {
  // Parties
  tenantName: string;
  tenantAddress: string;
  landlordName: string;
  landlordAddress: string;

  // Bien
  propertyAddress: string;

  // Bail
  leaseSignedDate: string | null;
  moveOutDate: string | null;

  // Dépôt
  depositAmountCents: number;
  totalDeductionsCents: number;
  refundAmountCents: number;
  retainedAmountCents: number;

  // Contestation
  disputeDate: string | null;
  disputeReason: string | null;

  // Deadline & pénalité
  legalDeadline: string | null;
  legalDeadlineMonths: number | null;
  isOverdue: boolean;
  overdueMonths: number;
  penaltyAmountCents: number;
  monthlyRentCents: number | null;

  // Mise en demeure
  formalNoticeSentAt: string | null;
  formalNoticeUrl: string | null;

  // Données détaillées
  deductions: CDCDeductionItem[];
  timeline: CDCTimelineEvent[];
  messages: CDCMessage[];

  // EDL
  entryInspectionDate: string | null;
  exitInspectionDate: string | null;
  entryInspectionPdfUrl: string | null;
  exitInspectionPdfUrl: string | null;
  tenantReserves: string | null;

  // Bail signé
  leasePdfUrl: string | null;

  // Génération
  generatedAt: string;
}

// ─── Helpers ───

const formatCents = (cents: number) => {
  const euros = (cents / 100).toFixed(2);
  return `${euros} €`;
};

// ─── Styles ───

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: 'Helvetica',
    lineHeight: 1.5,
    color: '#1a1a1a',
  },
  // Cover
  coverTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 4,
    color: '#111827',
  },
  coverSubtitle: {
    fontSize: 11,
    textAlign: 'center',
    color: '#6B7280',
    marginBottom: 30,
  },
  coverSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 4,
  },
  coverLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#6B7280',
    textTransform: 'uppercase' as const,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  coverValue: {
    fontSize: 10,
    color: '#111827',
  },
  // Section headers
  sectionHeader: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 10,
    marginTop: 20,
    paddingBottom: 4,
    borderBottomWidth: 2,
    borderBottomColor: '#E5E7EB',
  },
  sectionSubHeader: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
    marginBottom: 6,
    marginTop: 12,
  },
  // Info rows
  infoRow: {
    flexDirection: 'row' as const,
    marginBottom: 3,
  },
  infoLabel: {
    width: 160,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#4B5563',
  },
  infoValue: {
    flex: 1,
    fontSize: 9,
    color: '#111827',
  },
  // Tables
  tableHeader: {
    flexDirection: 'row' as const,
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#D1D5DB',
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: 'row' as const,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableRowAlt: {
    flexDirection: 'row' as const,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableHeaderText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: '#374151',
  },
  tableCell: {
    fontSize: 8,
    color: '#374151',
  },
  // Alert box
  alertBox: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 4,
    padding: 10,
    marginVertical: 8,
  },
  alertBoxRed: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 4,
    padding: 10,
    marginVertical: 8,
  },
  alertTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    marginBottom: 3,
  },
  alertText: {
    fontSize: 8,
    lineHeight: 1.4,
  },
  // Message
  messageBox: {
    backgroundColor: '#F9FAFB',
    borderLeftWidth: 3,
    borderLeftColor: '#D1D5DB',
    padding: 8,
    marginBottom: 6,
  },
  messageSender: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: '#374151',
    marginBottom: 2,
  },
  messageDate: {
    fontSize: 7,
    color: '#9CA3AF',
    marginBottom: 3,
  },
  messageBody: {
    fontSize: 8,
    color: '#4B5563',
    lineHeight: 1.4,
  },
  // Legal
  legalText: {
    fontSize: 7,
    color: '#6B7280',
    fontStyle: 'italic',
    lineHeight: 1.3,
    textAlign: 'justify' as const,
    marginTop: 4,
  },
  // Footer
  footer: {
    position: 'absolute' as const,
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    fontSize: 7,
    color: '#9CA3AF',
  },
  // Lettre de saisine
  letterParagraph: {
    fontSize: 9,
    lineHeight: 1.6,
    textAlign: 'justify' as const,
    marginBottom: 8,
  },
  letterBold: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },
  // Pièces jointes
  pieceRow: {
    flexDirection: 'row' as const,
    marginBottom: 3,
  },
  pieceBullet: {
    width: 20,
    fontSize: 9,
    color: '#374151',
  },
  pieceText: {
    flex: 1,
    fontSize: 9,
    color: '#374151',
  },
  // Separator
  separator: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginVertical: 12,
  },
  summaryBox: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 4,
    padding: 12,
    marginVertical: 10,
  },
  summaryTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: '#1E40AF',
    marginBottom: 6,
  },
  // Two columns
  twoColumns: {
    flexDirection: 'row' as const,
    gap: 16,
  },
  column: {
    flex: 1,
  },
});

// ─── Actor Labels ───

const ACTOR_LABELS: Record<string, string> = {
  system: 'Système',
  landlord: 'Propriétaire',
  tenant: 'Locataire',
  powens: 'Powens',
  cron: 'Système auto',
};

// ─── Document ───

export const CDCDossierDocument: React.FC<{ data: CDCDossierData }> = ({ data }) => (
  <Document>
    {/* ═══ PAGE 1 : Couverture + Résumé ═══ */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.coverTitle}>
        DOSSIER DE SAISINE
      </Text>
      <Text style={styles.coverSubtitle}>
        Commission Départementale de Conciliation
      </Text>
      <Text style={{ fontSize: 9, textAlign: 'center', color: '#6B7280', marginBottom: 24 }}>
        Litige relatif à la restitution du dépôt de garantie
      </Text>

      {/* Résumé du litige */}
      <View style={styles.summaryBox}>
        <Text style={styles.summaryTitle}>Résumé du litige</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Dépôt de garantie :</Text>
          <Text style={styles.infoValue}>{formatCents(data.depositAmountCents)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Retenues proposées :</Text>
          <Text style={styles.infoValue}>{formatCents(data.totalDeductionsCents)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Restitution proposée :</Text>
          <Text style={styles.infoValue}>{formatCents(data.refundAmountCents)}</Text>
        </View>
        {data.disputeDate && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date de contestation :</Text>
            <Text style={styles.infoValue}>{data.disputeDate}</Text>
          </View>
        )}
      </View>

      {/* Parties */}
      <View style={styles.twoColumns}>
        <View style={styles.column}>
          <View style={styles.coverSection}>
            <Text style={styles.coverLabel}>Locataire (demandeur)</Text>
            <Text style={styles.coverValue}>{data.tenantName}</Text>
            <Text style={{ fontSize: 8, color: '#6B7280', marginTop: 2 }}>
              {data.tenantAddress}
            </Text>
          </View>
        </View>
        <View style={styles.column}>
          <View style={styles.coverSection}>
            <Text style={styles.coverLabel}>Propriétaire (défendeur)</Text>
            <Text style={styles.coverValue}>{data.landlordName}</Text>
            <Text style={{ fontSize: 8, color: '#6B7280', marginTop: 2 }}>
              {data.landlordAddress}
            </Text>
          </View>
        </View>
      </View>

      {/* Bien */}
      <View style={styles.coverSection}>
        <Text style={styles.coverLabel}>Bien concerné</Text>
        <Text style={styles.coverValue}>{data.propertyAddress}</Text>
      </View>

      {/* Dates clés */}
      <View style={styles.coverSection}>
        <Text style={styles.coverLabel}>Dates clés</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Bail signé le :</Text>
          <Text style={styles.infoValue}>{data.leaseSignedDate || '—'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>EDL d'entrée :</Text>
          <Text style={styles.infoValue}>{data.entryInspectionDate || '—'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>EDL de sortie :</Text>
          <Text style={styles.infoValue}>{data.exitInspectionDate || '—'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Sortie du logement :</Text>
          <Text style={styles.infoValue}>{data.moveOutDate || '—'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Délai légal :</Text>
          <Text style={styles.infoValue}>
            {data.legalDeadlineMonths ? `${data.legalDeadlineMonths} mois` : '—'}
            {data.legalDeadline ? ` (échéance : ${data.legalDeadline})` : ''}
          </Text>
        </View>
      </View>

      {/* Overdue alert */}
      {data.isOverdue && (
        <View style={styles.alertBoxRed}>
          <Text style={styles.alertTitle}>Délai légal dépassé</Text>
          <Text style={styles.alertText}>
            Le délai de restitution est dépassé de {data.overdueMonths} mois.
            {data.penaltyAmountCents > 0 &&
              ` Pénalité applicable (art. 22 al. 2 loi 89-462) : ${formatCents(data.penaltyAmountCents)}.`}
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text>Dossier CDC — Coridor</Text>
        <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </View>
    </Page>

    {/* ═══ PAGE 2 : Chronologie des faits ═══ */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionHeader}>1. Chronologie des faits</Text>

      {data.timeline.length > 0 ? (
        <>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { width: '18%' }]}>Date</Text>
            <Text style={[styles.tableHeaderText, { width: '18%' }]}>Acteur</Text>
            <Text style={[styles.tableHeaderText, { width: '64%' }]}>Description</Text>
          </View>
          {data.timeline.map((event, i) => (
            <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tableCell, { width: '18%' }]}>{event.date}</Text>
              <Text style={[styles.tableCell, { width: '18%' }]}>
                {ACTOR_LABELS[event.actorType] || event.actorType}
              </Text>
              <Text style={[styles.tableCell, { width: '64%' }]}>{event.description}</Text>
            </View>
          ))}
        </>
      ) : (
        <Text style={styles.tableCell}>Aucun événement enregistré.</Text>
      )}

      {/* Mise en demeure */}
      {data.formalNoticeSentAt && (
        <View style={styles.alertBox}>
          <Text style={styles.alertTitle}>Mise en demeure envoyée</Text>
          <Text style={styles.alertText}>
            Une mise en demeure a été envoyée le {data.formalNoticeSentAt}.
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text>Dossier CDC — Coridor</Text>
        <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </View>
    </Page>

    {/* ═══ PAGE 3 : Détail des retenues ═══ */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionHeader}>2. Détail des retenues proposées</Text>

      {data.deductions.length > 0 ? (
        <>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { width: '35%' }]}>Désignation</Text>
            <Text style={[styles.tableHeaderText, { width: '18%', textAlign: 'right' }]}>Coût réparation</Text>
            <Text style={[styles.tableHeaderText, { width: '15%', textAlign: 'right' }]}>Vétusté</Text>
            <Text style={[styles.tableHeaderText, { width: '18%', textAlign: 'right' }]}>Part locataire</Text>
          </View>
          {data.deductions.map((d, i) => (
            <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tableCell, { width: '35%' }]}>{d.description}</Text>
              <Text style={[styles.tableCell, { width: '18%', textAlign: 'right' }]}>
                {formatCents(d.repairCostCents)}
              </Text>
              <Text style={[styles.tableCell, { width: '15%', textAlign: 'right' }]}>
                {Math.round(d.vetustePct * 100)}%
              </Text>
              <Text style={[styles.tableCell, { width: '18%', textAlign: 'right' }]}>
                {formatCents(d.tenantShareCents)}
              </Text>
            </View>
          ))}
          {/* Total row */}
          <View style={[styles.tableRow, { borderTopWidth: 1, borderTopColor: '#374151' }]}>
            <Text style={[styles.tableHeaderText, { width: '68%' }]}>TOTAL RETENUES</Text>
            <Text style={[styles.tableHeaderText, { width: '18%', textAlign: 'right' }]}>
              {formatCents(data.totalDeductionsCents)}
            </Text>
          </View>
        </>
      ) : (
        <Text style={styles.tableCell}>Aucune retenue détaillée.</Text>
      )}

      {/* Récapitulatif montants */}
      <Text style={styles.sectionSubHeader}>Récapitulatif financier</Text>
      <View style={styles.coverSection}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Dépôt de garantie :</Text>
          <Text style={styles.infoValue}>{formatCents(data.depositAmountCents)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Total retenues :</Text>
          <Text style={styles.infoValue}>- {formatCents(data.totalDeductionsCents)}</Text>
        </View>
        <View style={styles.separator} />
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { fontFamily: 'Helvetica-Bold' }]}>Restitution due :</Text>
          <Text style={[styles.infoValue, { fontFamily: 'Helvetica-Bold' }]}>
            {formatCents(data.refundAmountCents)}
          </Text>
        </View>
        {data.isOverdue && data.penaltyAmountCents > 0 && (
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: '#DC2626' }]}>Pénalité (art. 22 al. 2) :</Text>
            <Text style={[styles.infoValue, { color: '#DC2626', fontFamily: 'Helvetica-Bold' }]}>
              + {formatCents(data.penaltyAmountCents)}
            </Text>
          </View>
        )}
      </View>

      {/* Motif de contestation */}
      <Text style={styles.sectionHeader}>3. Motif de la contestation</Text>
      {data.disputeReason ? (
        <View style={styles.messageBox}>
          <Text style={styles.messageSender}>Position du locataire :</Text>
          <Text style={styles.messageBody}>{data.disputeReason}</Text>
        </View>
      ) : (
        <Text style={styles.tableCell}>Aucun motif détaillé fourni par le locataire.</Text>
      )}

      <View style={styles.footer}>
        <Text>Dossier CDC — Coridor</Text>
        <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </View>
    </Page>

    {/* ═══ PAGE 4 : Historique des échanges ═══ */}
    {data.messages.length > 0 && (
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionHeader}>4. Historique des échanges</Text>
        <Text style={{ fontSize: 8, color: '#6B7280', marginBottom: 10 }}>
          Messages échangés entre les parties via la plateforme Coridor (horodatés).
        </Text>

        {data.messages.map((msg, i) => (
          <View key={i} style={styles.messageBox}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.messageSender}>{msg.senderName}</Text>
              <Text style={styles.messageDate}>{msg.date}</Text>
            </View>
            <Text style={styles.messageBody}>{msg.body}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text>Dossier CDC — Coridor</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    )}

    {/* ═══ PAGE 5 : Cadre juridique ═══ */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionHeader}>
        {data.messages.length > 0 ? '5' : '4'}. Cadre juridique applicable
      </Text>

      <Text style={styles.sectionSubHeader}>Restitution du dépôt de garantie</Text>
      <Text style={styles.legalText}>
        Article 22 de la loi n° 89-462 du 6 juillet 1989 :{'\n\n'}
        « Le dépôt de garantie est restitué dans un délai maximal de un mois à compter de la
        remise en main propre des clés au bailleur ou à son mandataire, lorsque l'état des lieux de
        sortie est conforme à l'état des lieux d'entrée. À défaut de conformité, le délai de
        restitution est de deux mois.{'\n\n'}
        À défaut de restitution dans les délais prévus, le dépôt de garantie restant dû au locataire
        est majoré d'une somme égale à 10% du loyer mensuel en principal, pour chaque période
        mensuelle commencée en retard. »
      </Text>

      <Text style={styles.sectionSubHeader}>Compétence de la CDC</Text>
      <Text style={styles.legalText}>
        Article 20 de la loi n° 89-462 du 6 juillet 1989 :{'\n\n'}
        La Commission Départementale de Conciliation est compétente pour les litiges relatifs
        à la restitution du dépôt de garantie. La saisine est gratuite et la conciliation
        est une étape préalable recommandée avant toute action en justice.
      </Text>

      {data.isOverdue && data.monthlyRentCents && (
        <>
          <Text style={styles.sectionSubHeader}>Calcul de la pénalité applicable</Text>
          <View style={styles.coverSection}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Loyer mensuel :</Text>
              <Text style={styles.infoValue}>{formatCents(data.monthlyRentCents)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Pénalité par mois :</Text>
              <Text style={styles.infoValue}>
                10% × {formatCents(data.monthlyRentCents)} = {formatCents(Math.round(data.monthlyRentCents * 0.1))} / mois
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Mois de retard :</Text>
              <Text style={styles.infoValue}>{data.overdueMonths} mois</Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: '#DC2626', fontFamily: 'Helvetica-Bold' }]}>
                Pénalité totale :
              </Text>
              <Text style={[styles.infoValue, { color: '#DC2626', fontFamily: 'Helvetica-Bold' }]}>
                {formatCents(data.penaltyAmountCents)}
              </Text>
            </View>
          </View>
        </>
      )}

      <View style={styles.footer}>
        <Text>Dossier CDC — Coridor</Text>
        <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </View>
    </Page>

    {/* ═══ PAGE 6 : Lettre de saisine type ═══ */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionHeader}>
        {data.messages.length > 0 ? '6' : '5'}. Lettre de saisine — Commission Départementale de Conciliation
      </Text>

      <Text style={{ fontSize: 8, color: '#6B7280', marginBottom: 12, fontStyle: 'italic' }}>
        Modèle de lettre à adresser à la CDC de votre département. À adapter et compléter.
      </Text>

      {/* Expéditeur */}
      <Text style={styles.letterParagraph}>
        {data.tenantName}{'\n'}
        {data.tenantAddress}
      </Text>

      <Text style={[styles.letterParagraph, { textAlign: 'right' }]}>
        Commission Départementale de Conciliation{'\n'}
        [Préfecture / DDT de votre département]{'\n\n'}
        Le {data.generatedAt}
      </Text>

      <Text style={styles.letterBold}>
        Objet : Saisine de la Commission Départementale de Conciliation — Litige relatif à la
        restitution du dépôt de garantie
      </Text>

      <View style={styles.separator} />

      <Text style={styles.letterParagraph}>
        Madame, Monsieur,
      </Text>

      <Text style={styles.letterParagraph}>
        Je soussigné(e), {data.tenantName}, demeurant au {data.tenantAddress}, ai l'honneur de
        saisir la Commission Départementale de Conciliation d'un litige m'opposant à mon
        ancien bailleur, {data.landlordName}, demeurant au {data.landlordAddress}, concernant
        la restitution du dépôt de garantie du logement situé au {data.propertyAddress}.
      </Text>

      <Text style={styles.letterBold}>Exposé des faits :</Text>
      <Text style={styles.letterParagraph}>
        J'ai occupé le logement susmentionné en vertu d'un bail signé
        le {data.leaseSignedDate || '[date]'}.
        L'état des lieux de sortie a été réalisé le {data.exitInspectionDate || '[date]'}.
        Le dépôt de garantie versé s'élevait à {formatCents(data.depositAmountCents)}.
      </Text>

      <Text style={styles.letterParagraph}>
        Mon bailleur a proposé des retenues d'un montant total de {formatCents(data.totalDeductionsCents)},
        portant la restitution proposée à {formatCents(data.refundAmountCents)}.
        J'ai contesté ces retenues le {data.disputeDate || '[date]'}.
      </Text>

      {data.disputeReason && (
        <Text style={styles.letterParagraph}>
          Motif de ma contestation : {data.disputeReason}
        </Text>
      )}

      {data.isOverdue && (
        <Text style={styles.letterParagraph}>
          De plus, le délai légal de restitution de {data.legalDeadlineMonths || 2} mois prévu à
          l'article 22 de la loi du 6 juillet 1989 est dépassé de {data.overdueMonths} mois.
          Conformément à cette disposition, une majoration de {formatCents(data.penaltyAmountCents)} est
          applicable.
        </Text>
      )}

      {data.formalNoticeSentAt && (
        <Text style={styles.letterParagraph}>
          J'ai adressé une mise en demeure à mon bailleur en date du {data.formalNoticeSentAt},
          restée sans effet à ce jour.
        </Text>
      )}

      <Text style={styles.letterParagraph}>
        En conséquence, je sollicite l'intervention de la Commission Départementale de Conciliation
        afin de parvenir à un accord amiable sur la restitution de mon dépôt de garantie.
      </Text>

      <Text style={styles.letterParagraph}>
        Vous trouverez ci-joint les pièces justificatives suivantes.
      </Text>

      <Text style={styles.letterParagraph}>
        Dans l'attente de votre convocation, je vous prie d'agréer, Madame, Monsieur,
        l'expression de mes salutations distinguées.
      </Text>

      <Text style={[styles.letterParagraph, { marginTop: 24 }]}>
        {data.tenantName}{'\n'}
        Signature :
      </Text>

      <View style={styles.footer}>
        <Text>Dossier CDC — Coridor</Text>
        <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </View>
    </Page>

    {/* ═══ PAGE 7 : Pièces jointes ═══ */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionHeader}>
        {data.messages.length > 0 ? '7' : '6'}. Pièces justificatives
      </Text>

      <Text style={{ fontSize: 8, color: '#6B7280', marginBottom: 12 }}>
        Liste des documents joints au dossier de saisine.
      </Text>

      {[
        { label: 'Copie du bail signé', available: !!data.leasePdfUrl },
        { label: "État des lieux d'entrée", available: !!data.entryInspectionPdfUrl },
        { label: 'État des lieux de sortie', available: !!data.exitInspectionPdfUrl },
        { label: 'Détail des retenues proposées par le propriétaire', available: data.deductions.length > 0 },
        { label: 'Chronologie complète du dépôt de garantie', available: data.timeline.length > 0 },
        { label: 'Historique des échanges entre les parties', available: data.messages.length > 0 },
        { label: 'Mise en demeure', available: !!data.formalNoticeUrl },
        { label: 'Lettre de saisine type', available: true },
      ].map((piece, i) => (
        <View key={i} style={styles.pieceRow}>
          <Text style={styles.pieceBullet}>{piece.available ? '✓' : '○'}</Text>
          <Text style={[styles.pieceText, !piece.available && { color: '#9CA3AF' }]}>
            Pièce {i + 1} : {piece.label}
            {!piece.available && ' (non disponible)'}
          </Text>
        </View>
      ))}

      {data.tenantReserves && (
        <>
          <Text style={styles.sectionSubHeader}>Réserves du locataire (EDL de sortie)</Text>
          <View style={styles.messageBox}>
            <Text style={styles.messageBody}>{data.tenantReserves}</Text>
          </View>
        </>
      )}

      <View style={styles.separator} />

      <Text style={styles.legalText}>
        Ce dossier a été généré automatiquement par la plateforme Coridor le {data.generatedAt}.
        Les informations présentées sont extraites des données enregistrées sur la plateforme
        et sont horodatées. Ce document n'a pas de valeur juridique contraignante mais constitue
        un support factuel pour la procédure de conciliation.
      </Text>

      <View style={styles.footer}>
        <Text>Dossier CDC — Coridor</Text>
        <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </View>
    </Page>
  </Document>
);
