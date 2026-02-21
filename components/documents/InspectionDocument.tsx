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
      {data.rooms.map((room, roomIdx) => (
        <Page key={roomIdx} size="A4" style={s.page}>
          <Text style={s.roomTitle}>
            {room.name}
          </Text>

          {/* Overview photo */}
          {room.photos.filter((p) => p.type === 'OVERVIEW').map((photo, i) => (
            <View key={i} style={{ marginBottom: 6 }}>
              {photo.thumbnailUrl && (
                <Image src={photo.thumbnailUrl} style={{ width: 200, height: 150, objectFit: 'cover', borderRadius: 2 }} />
              )}
            </View>
          ))}

          {/* Elements table */}
          <View style={s.table}>
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
      ))}

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
