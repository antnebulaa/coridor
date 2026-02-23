import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Svg, Path } from '@react-pdf/renderer';

// ─── Types ───

interface InspectionPdfPhoto {
  url: string;
  thumbnailUrl?: string;
  type: string;
}

interface InspectionPdfElement {
  name: string;
  category: string;
  nature: string[];
  condition?: string | null;
  isAbsent: boolean;
  observations?: string | null;
  degradationTypes: string[];
  evolution?: string | null;
  photos: InspectionPdfPhoto[];
}

interface InspectionPdfRoom {
  name: string;
  roomType: string;
  observations?: string | null;
  elements: InspectionPdfElement[];
  photos: InspectionPdfPhoto[];
}

interface InspectionPdfMeter {
  type: string;
  meterNumber?: string | null;
  indexValue?: string | null;
  photoUrl?: string | null;
  noGas: boolean;
}

interface InspectionPdfKey {
  type: string;
  quantity: number;
}

interface InspectionPdfDeduction {
  description: string;
  repairCostCents: number;
  vetustePct: number;
  tenantShareCents: number;
}

export interface InspectionPdfData {
  type: 'ENTRY' | 'EXIT';
  date: string;
  address: string;
  landlordName: string;
  tenantName: string;
  tenantPresent: boolean;
  representativeName?: string | null;
  landlordSignatureSvg?: string | null;
  tenantSignatureSvg?: string | null;
  landlordSignedAt?: string | null;
  tenantSignedAt?: string | null;
  tenantReserves?: string | null;
  meters: InspectionPdfMeter[];
  keys: InspectionPdfKey[];
  rooms: InspectionPdfRoom[];
  // EXIT-specific data
  entryRooms?: InspectionPdfRoom[];
  deductions?: InspectionPdfDeduction[];
  depositAmountCents?: number;
  totalDeductionsCents?: number;
  refundAmountCents?: number;
}

// ─── Styles ───

const CONDITION_COLORS: Record<string, string> = {
  NEW: '#34D399',
  GOOD: '#60A5FA',
  NORMAL_WEAR: '#FBBF24',
  DEGRADED: '#FB923C',
  OUT_OF_SERVICE: '#EF4444',
};

const CONDITION_LABELS: Record<string, string> = {
  NEW: 'Neuf',
  GOOD: 'Bon',
  NORMAL_WEAR: 'Usure norm.',
  DEGRADED: 'Dégradé',
  OUT_OF_SERVICE: 'H.S.',
};

const EVOLUTION_LABELS: Record<string, { label: string; color: string }> = {
  UNCHANGED: { label: 'Identique', color: '#34D399' },
  NORMAL_WEAR: { label: 'Usure norm.', color: '#FBBF24' },
  DETERIORATION: { label: 'Dégradation', color: '#EF4444' },
  IMPROVEMENT: { label: 'Amélioré', color: '#60A5FA' },
};

const METER_LABELS: Record<string, { label: string; unit: string }> = {
  ELECTRICITY: { label: 'Électricité', unit: 'kWh' },
  WATER: { label: 'Eau', unit: 'm³' },
  GAS: { label: 'Gaz', unit: 'm³' },
};

const s = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 9,
    lineHeight: 1.4,
    color: '#222',
  },
  header: {
    marginBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingBottom: 10,
    textAlign: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: '#444',
  },
  sectionHeader: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginBottom: 8,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#000',
  },
  sectionTitle: {
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  label: {
    width: 140,
    color: '#555',
    fontSize: 8,
  },
  value: {
    flex: 1,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },
  // Table
  table: {
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
  },
  tableRowAlt: {
    flexDirection: 'row',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
    backgroundColor: '#FAFAFA',
  },
  thText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: '#333',
  },
  tdText: {
    fontSize: 8,
    color: '#444',
  },
  // Room
  roomTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
    marginTop: 10,
  },
  // Photos
  photosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
    marginBottom: 6,
  },
  thumbnail: {
    width: 80,
    height: 60,
    objectFit: 'cover',
    borderRadius: 2,
  },
  // Condition badge
  badge: {
    fontSize: 7,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    color: '#fff',
    fontFamily: 'Helvetica-Bold',
  },
  // Reserves
  reserveBox: {
    borderWidth: 1,
    borderColor: '#FB923C',
    borderRadius: 4,
    padding: 8,
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: '#FFF7ED',
  },
  reserveTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#FB923C',
    marginBottom: 4,
  },
  // Signatures
  signatureBox: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    minHeight: 80,
  },
  signatureLabel: {
    fontSize: 8,
    color: '#666',
    marginBottom: 4,
  },
  signatureDate: {
    fontSize: 7,
    color: '#888',
    marginTop: 4,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 7,
    color: '#999',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 6,
  },
  legalText: {
    fontSize: 7,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 6,
    textAlign: 'justify',
  },
});

// ─── Component ───

interface Props {
  data: InspectionPdfData;
}

const InspectionDocument: React.FC<Props> = ({ data }) => {
  const typeLabel = data.type === 'ENTRY' ? "ÉTAT DES LIEUX D'ENTRÉE" : 'ÉTAT DES LIEUX DE SORTIE';

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Document>
      {/* ─── PAGE 1 : En-tête légal ─── */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.title}>{typeLabel}</Text>
          <Text style={s.subtitle}>
            Établi conformément au décret n°2016-382 du 30 mars 2016
          </Text>
        </View>

        {/* Infos générales */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Informations générales</Text>
        </View>

        <View style={s.row}>
          <Text style={s.label}>Date</Text>
          <Text style={s.value}>{data.date}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.label}>Adresse du logement</Text>
          <Text style={s.value}>{data.address}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.label}>Bailleur</Text>
          <Text style={s.value}>{data.landlordName}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.label}>Locataire</Text>
          <Text style={s.value}>{data.tenantName}</Text>
        </View>
        {!data.tenantPresent && data.representativeName && (
          <View style={s.row}>
            <Text style={s.label}>Mandataire</Text>
            <Text style={s.value}>{data.representativeName}</Text>
          </View>
        )}

        {/* ─── Compteurs ─── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Relevés des compteurs</Text>
        </View>

        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={[s.thText, { width: '25%' }]}>Type</Text>
            <Text style={[s.thText, { width: '25%' }]}>N° compteur</Text>
            <Text style={[s.thText, { width: '25%' }]}>Index</Text>
            <Text style={[s.thText, { width: '25%' }]}>Observation</Text>
          </View>
          {data.meters.map((meter, i) => {
            const info = METER_LABELS[meter.type] || { label: meter.type, unit: '' };
            return (
              <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                <Text style={[s.tdText, { width: '25%' }]}>{info.label}</Text>
                <Text style={[s.tdText, { width: '25%' }]}>{meter.meterNumber || '—'}</Text>
                <Text style={[s.tdText, { width: '25%' }]}>
                  {meter.noGas ? 'Pas de gaz' : meter.indexValue ? `${meter.indexValue} ${info.unit}` : '—'}
                </Text>
                <Text style={[s.tdText, { width: '25%' }]}>
                  {meter.photoUrl ? 'Photo jointe' : '—'}
                </Text>
              </View>
            );
          })}
        </View>

        {/* ─── Clés ─── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Clés et accès</Text>
        </View>

        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={[s.thText, { width: '60%' }]}>Type</Text>
            <Text style={[s.thText, { width: '40%' }]}>Quantité</Text>
          </View>
          {data.keys.map((key, i) => (
            <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <Text style={[s.tdText, { width: '60%' }]}>{key.type}</Text>
              <Text style={[s.tdText, { width: '40%' }]}>{key.quantity}</Text>
            </View>
          ))}
        </View>

        <View style={s.footer}>
          <Text>Document établi via Coridor.fr — Page 1</Text>
        </View>
      </Page>

      {/* ─── PAGES 2+ : Pièces ─── */}
      {data.rooms.map((room, roomIdx) => {
        // For EXIT mode, find matching entry room by index
        const entryRoom = data.type === 'EXIT' && data.entryRooms ? data.entryRooms[roomIdx] : null;
        const isExit = data.type === 'EXIT';

        return (
          <Page key={roomIdx} size="A4" style={s.page}>
            <Text style={s.roomTitle}>
              {room.name}
            </Text>

            {/* Overview photo — EXIT mode shows side-by-side */}
            {isExit && entryRoom ? (
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
                {(() => {
                  const entryOv = entryRoom.photos.find((p) => p.type === 'OVERVIEW');
                  const exitOv = room.photos.find((p) => p.type === 'OVERVIEW');
                  return (
                    <>
                      <View style={{ width: '48%' }}>
                        <Text style={{ fontSize: 7, color: '#888', marginBottom: 2 }}>ENTRÉE</Text>
                        {entryOv?.thumbnailUrl ? (
                          <Image src={entryOv.thumbnailUrl} style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 2 }} />
                        ) : (
                          <View style={{ width: '100%', height: 100, backgroundColor: '#F3F4F6', borderRadius: 2, justifyContent: 'center', alignItems: 'center' }}>
                            <Text style={{ fontSize: 7, color: '#999' }}>Pas de photo</Text>
                          </View>
                        )}
                      </View>
                      <View style={{ width: '48%' }}>
                        <Text style={{ fontSize: 7, color: '#333', marginBottom: 2 }}>SORTIE</Text>
                        {exitOv?.thumbnailUrl ? (
                          <Image src={exitOv.thumbnailUrl} style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 2 }} />
                        ) : (
                          <View style={{ width: '100%', height: 100, backgroundColor: '#F3F4F6', borderRadius: 2, justifyContent: 'center', alignItems: 'center' }}>
                            <Text style={{ fontSize: 7, color: '#999' }}>Pas de photo</Text>
                          </View>
                        )}
                      </View>
                    </>
                  );
                })()}
              </View>
            ) : (
              room.photos.filter((p) => p.type === 'OVERVIEW').map((photo, i) => (
                <View key={i} style={{ marginBottom: 6 }}>
                  {photo.thumbnailUrl && (
                    <Image src={photo.thumbnailUrl} style={{ width: 200, height: 150, objectFit: 'cover', borderRadius: 2 }} />
                  )}
                </View>
              ))
            )}

            {/* Elements table — EXIT mode has comparison columns */}
            <View style={s.table}>
              {isExit && entryRoom ? (
                <>
                  <View style={s.tableHeader}>
                    <Text style={[s.thText, { width: '22%' }]}>Élément</Text>
                    <Text style={[s.thText, { width: '13%' }]}>Entrée</Text>
                    <Text style={[s.thText, { width: '13%' }]}>Sortie</Text>
                    <Text style={[s.thText, { width: '15%' }]}>Évolution</Text>
                    <Text style={[s.thText, { width: '37%' }]}>Observations</Text>
                  </View>
                  {room.elements
                    .filter((el) => !el.isAbsent)
                    .map((el, i) => {
                      const entryEl = entryRoom.elements.find((e) => e.name === el.name && e.category === el.category);
                      const entryCondColor = entryEl?.condition ? CONDITION_COLORS[entryEl.condition] || '#888' : '#888';
                      const entryCondLabel = entryEl?.condition ? CONDITION_LABELS[entryEl.condition] || '—' : '—';
                      const exitCondColor = el.condition ? CONDITION_COLORS[el.condition] || '#888' : '#888';
                      const exitCondLabel = el.condition ? CONDITION_LABELS[el.condition] || '—' : '—';
                      const evoInfo = el.evolution ? EVOLUTION_LABELS[el.evolution] : null;

                      return (
                        <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                          <Text style={[s.tdText, { width: '22%' }]}>{el.name}</Text>
                          <View style={{ width: '13%' }}>
                            <Text style={[s.badge, { backgroundColor: entryCondColor, alignSelf: 'flex-start' }]}>
                              {entryCondLabel}
                            </Text>
                          </View>
                          <View style={{ width: '13%' }}>
                            <Text style={[s.badge, { backgroundColor: exitCondColor, alignSelf: 'flex-start' }]}>
                              {exitCondLabel}
                            </Text>
                          </View>
                          <View style={{ width: '15%' }}>
                            {evoInfo ? (
                              <Text style={[s.badge, { backgroundColor: evoInfo.color, alignSelf: 'flex-start' }]}>
                                {evoInfo.label}
                              </Text>
                            ) : (
                              <Text style={[s.tdText]}>—</Text>
                            )}
                          </View>
                          <Text style={[s.tdText, { width: '37%' }]}>
                            {[
                              el.degradationTypes?.length ? el.degradationTypes.join(', ') : null,
                              el.observations,
                            ]
                              .filter(Boolean)
                              .join(' — ') || '—'}
                          </Text>
                        </View>
                      );
                    })}
                </>
              ) : (
                <>
                  <View style={s.tableHeader}>
                    <Text style={[s.thText, { width: '25%' }]}>Élément</Text>
                    <Text style={[s.thText, { width: '20%' }]}>Nature</Text>
                    <Text style={[s.thText, { width: '15%' }]}>État</Text>
                    <Text style={[s.thText, { width: '40%' }]}>Observations</Text>
                  </View>
                  {room.elements
                    .filter((el) => !el.isAbsent)
                    .map((el, i) => {
                      const condColor = el.condition ? CONDITION_COLORS[el.condition] || '#888' : '#888';
                      const condLabel = el.condition ? CONDITION_LABELS[el.condition] || el.condition : '—';
                      return (
                        <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                          <Text style={[s.tdText, { width: '25%' }]}>{el.name}</Text>
                          <Text style={[s.tdText, { width: '20%' }]}>{el.nature.length ? el.nature.join(', ') : '—'}</Text>
                          <View style={{ width: '15%' }}>
                            <Text style={[s.badge, { backgroundColor: condColor, alignSelf: 'flex-start' }]}>
                              {condLabel}
                            </Text>
                          </View>
                          <Text style={[s.tdText, { width: '40%' }]}>
                            {[
                              el.degradationTypes?.length ? el.degradationTypes.join(', ') : null,
                              el.observations,
                            ]
                              .filter(Boolean)
                              .join(' — ') || '—'}
                          </Text>
                        </View>
                      );
                    })}
                </>
              )}
            </View>

            {/* Detail photos (degradations) */}
            {(() => {
              const detailPhotos = room.elements
                .flatMap((el) => el.photos.filter((p) => p.type === 'DETAIL' || p.type === 'SURFACE'))
                .filter((p) => p.thumbnailUrl);
              if (detailPhotos.length === 0) return null;
              return (
                <View style={s.photosRow}>
                  {detailPhotos.slice(0, 6).map((photo, i) => (
                    <Image key={i} src={photo.thumbnailUrl!} style={s.thumbnail} />
                  ))}
                </View>
              );
            })()}

            {/* Room observations */}
            {room.observations && (
              <View style={{ marginTop: 4 }}>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', marginBottom: 2 }}>
                  Observation générale :
                </Text>
                <Text style={{ fontSize: 8, color: '#444', fontStyle: 'italic' }}>
                  {room.observations}
                </Text>
              </View>
            )}

            <View style={s.footer}>
              <Text>Document établi via Coridor.fr — {room.name}</Text>
            </View>
          </Page>
        );
      })}

      {/* ─── PAGE RETENUES (EXIT only) ─── */}
      {data.type === 'EXIT' && data.deductions && data.deductions.length > 0 && (
        <Page size="A4" style={s.page}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Retenues sur dépôt de garantie</Text>
          </View>

          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.thText, { width: '35%' }]}>Description</Text>
              <Text style={[s.thText, { width: '20%' }]}>Coût réparation</Text>
              <Text style={[s.thText, { width: '15%' }]}>Vétusté</Text>
              <Text style={[s.thText, { width: '30%' }]}>Part locataire</Text>
            </View>
            {data.deductions.map((d, i) => (
              <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                <Text style={[s.tdText, { width: '35%' }]}>{d.description}</Text>
                <Text style={[s.tdText, { width: '20%' }]}>{(d.repairCostCents / 100).toFixed(2)} €</Text>
                <Text style={[s.tdText, { width: '15%' }]}>{Math.round(d.vetustePct * 100)}%</Text>
                <Text style={[s.tdText, { width: '30%', fontFamily: 'Helvetica-Bold' }]}>{(d.tenantShareCents / 100).toFixed(2)} €</Text>
              </View>
            ))}
          </View>

          {/* Summary */}
          <View style={{ marginTop: 12, padding: 8, backgroundColor: '#F3F4F6', borderRadius: 4 }}>
            <View style={[s.row, { marginBottom: 4 }]}>
              <Text style={[s.label, { width: 180 }]}>Dépôt de garantie</Text>
              <Text style={s.value}>{data.depositAmountCents ? (data.depositAmountCents / 100).toFixed(2) + ' €' : '—'}</Text>
            </View>
            <View style={[s.row, { marginBottom: 4 }]}>
              <Text style={[s.label, { width: 180 }]}>Total retenues</Text>
              <Text style={[s.value, { color: '#EF4444' }]}>- {data.totalDeductionsCents ? (data.totalDeductionsCents / 100).toFixed(2) + ' €' : '—'}</Text>
            </View>
            <View style={[s.row, { borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 4 }]}>
              <Text style={[s.label, { width: 180, fontFamily: 'Helvetica-Bold', fontSize: 10 }]}>Montant à restituer</Text>
              <Text style={[s.value, { fontSize: 11, color: '#16a34a' }]}>{data.refundAmountCents != null ? (data.refundAmountCents / 100).toFixed(2) + ' €' : '—'}</Text>
            </View>
          </View>

          <Text style={[s.legalText, { marginTop: 12 }]}>
            Le dépôt de garantie doit être restitué dans un délai d&apos;un mois (sans retenue) ou deux mois (avec retenues) après la remise des clés (art. 22 loi du 6 juillet 1989). La vétusté est appliquée selon la grille en vigueur pour le bien.
          </Text>

          <View style={s.footer}>
            <Text>Document établi via Coridor.fr — Retenues sur dépôt</Text>
          </View>
        </Page>
      )}

      {/* ─── DERNIÈRE PAGE : Signatures ─── */}
      <Page size="A4" style={s.page}>
        {/* Tenant reserves */}
        {data.tenantReserves && (
          <View style={s.reserveBox}>
            <Text style={s.reserveTitle}>Réserves du locataire</Text>
            <Text style={{ fontSize: 8, color: '#333' }}>{data.tenantReserves}</Text>
          </View>
        )}

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Signatures</Text>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
          {/* Landlord signature */}
          <View style={s.signatureBox}>
            <Text style={s.signatureLabel}>Bailleur — {data.landlordName}</Text>
            {data.landlordSignatureSvg ? (
              <Text style={{ fontSize: 8, color: '#333' }}>[Signature numérique]</Text>
            ) : (
              <Text style={{ fontSize: 8, color: '#999' }}>Non signé</Text>
            )}
            <Text style={s.signatureDate}>
              {data.landlordSignedAt ? `Signé le ${formatDate(data.landlordSignedAt)}` : ''}
            </Text>
          </View>

          {/* Tenant signature */}
          <View style={s.signatureBox}>
            <Text style={s.signatureLabel}>Locataire — {data.tenantName}</Text>
            {data.tenantSignatureSvg ? (
              <Text style={{ fontSize: 8, color: '#333' }}>[Signature numérique]</Text>
            ) : (
              <Text style={{ fontSize: 8, color: '#999' }}>Non signé</Text>
            )}
            <Text style={s.signatureDate}>
              {data.tenantSignedAt ? `Signé le ${formatDate(data.tenantSignedAt)}` : ''}
            </Text>
          </View>
        </View>

        {/* Legal mentions */}
        <Text style={[s.legalText, { marginTop: 20 }]}>
          Conformément à l&apos;article 3-2 de la loi du 6 juillet 1989, le locataire peut demander
          la modification de l&apos;état des lieux d&apos;entrée dans un délai de 10 jours à compter
          de sa réalisation. Cette demande doit être adressée au bailleur par lettre recommandée
          avec accusé de réception.
        </Text>

        <Text style={[s.legalText, { marginTop: 4 }]}>
          En cas de chauffage collectif, l&apos;état des lieux peut être complété pendant le premier
          mois de la période de chauffe.
        </Text>

        <View style={s.footer}>
          <Text>Document établi via Coridor.fr — Signatures</Text>
        </View>
      </Page>
    </Document>
  );
};

export default InspectionDocument;
