import React from 'react';
import ReactPDF from '@react-pdf/renderer';
import { NextResponse } from 'next/server';
import getCurrentUser from '@/app/actions/getCurrentUser';
import prisma from '@/libs/prismadb';
import { FiscalService } from '@/services/FiscalService';
import {
  FiscalReportDocument,
  type FiscalReportData,
} from '@/components/documents/FiscalReportDocument';

// Category labels for CSV/PDF
const CATEGORY_LABELS: Record<string, string> = {
  COLD_WATER: 'Eau Froide',
  HOT_WATER: 'Eau Chaude',
  ELECTRICITY_COMMON: 'Électricité (Commun)',
  ELECTRICITY_PRIVATE: 'Électricité (Privé)',
  HEATING_COLLECTIVE: 'Chauffage Collectif',
  TAX_PROPERTY: 'Taxe Foncière',
  METERS: 'Compteurs',
  GENERAL_CHARGES: 'Charges communes générales',
  BUILDING_CHARGES: 'Charges bâtiment',
  ELEVATOR: 'Ascenseur',
  PARKING: 'Parking',
  INSURANCE: 'Assurance PNO',
  INSURANCE_GLI: 'Assurance GLI',
  MAINTENANCE: 'Entretien / Ménage',
  CARETAKER: 'Gardien',
  OTHER: 'Autre',
};

const renderToBuffer = async (
  element: React.ReactElement,
): Promise<Buffer> => {
  const stream = await ReactPDF.renderToStream(element as any);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

// Escape CSV field (handle commas, quotes, newlines)
const csvEscape = (val: string): string => {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
};

const fmtEuro = (cents: number): string =>
  (cents / 100).toFixed(2).replace('.', ',');

// ---------------------------------------------------------------------------
// GET /api/accounting/export?format=pdf|csv&year=2025&propertyId=xxx
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'csv';
  const yearParam = searchParams.get('year');
  const propertyId = searchParams.get('propertyId');

  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear() - 1;

  if (isNaN(year) || year < 2000 || year > new Date().getFullYear()) {
    return NextResponse.json({ error: 'Année invalide' }, { status: 400 });
  }

  if (!['pdf', 'csv'].includes(format)) {
    return NextResponse.json(
      { error: 'Format invalide. Utilisez "pdf" ou "csv".' },
      { status: 400 },
    );
  }

  try {
    // Verify property ownership if propertyId is specified
    if (propertyId) {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
      });
      if (!property || property.ownerId !== currentUser.id) {
        return NextResponse.json(
          { error: 'Bien non trouvé ou accès refusé' },
          { status: 403 },
        );
      }
    }

    // Fetch fiscal summary
    let fiscalData;
    let propertyTitle: string | undefined;

    if (propertyId) {
      fiscalData = await FiscalService.generateFiscalSummary(propertyId, year);
      const prop = await prisma.property.findUnique({
        where: { id: propertyId },
        select: { addressLine1: true, city: true },
      });
      propertyTitle = prop
        ? [prop.addressLine1, prop.city].filter(Boolean).join(', ')
        : undefined;
    } else {
      const allData = await FiscalService.generateAllPropertiesSummary(
        currentUser.id,
        year,
      );
      // Merge into a single summary shape
      fiscalData = {
        grossIncomeCents: allData.totalGrossIncomeCents,
        totalDeductibleCents: allData.totalDeductibleCents,
        managementFeesCents: allData.properties.reduce(
          (sum: number, p: any) => sum + (p.managementFeesCents || 0),
          0,
        ),
        netIncomeCents: allData.totalNetIncomeCents,
        categories: {} as Record<string, { label: string; amount: number }>,
        lines: {} as Record<string, { label: string; amount: number }>,
      };
      // Aggregate categories and lines
      for (const prop of allData.properties) {
        for (const [key, cat] of Object.entries(
          prop.categories as Record<string, { label: string; amount: number }>,
        )) {
          if (!fiscalData.categories[key]) {
            fiscalData.categories[key] = { label: cat.label, amount: 0 };
          }
          fiscalData.categories[key].amount += cat.amount;
        }
        for (const [line, lineData] of Object.entries(
          prop.lines as Record<string, { label: string; amount: number }>,
        )) {
          if (!fiscalData.lines[line]) {
            fiscalData.lines[line] = { label: lineData.label, amount: 0 };
          }
          fiscalData.lines[line].amount += lineData.amount;
        }
      }
    }

    // Fetch raw expenses for the year
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);

    const whereClause: any = {
      dateOccurred: { gte: startOfYear, lte: endOfYear },
    };

    if (propertyId) {
      whereClause.propertyId = propertyId;
    } else {
      // All properties owned by user
      const userProperties = await prisma.property.findMany({
        where: { ownerId: currentUser.id },
        select: { id: true },
      });
      whereClause.propertyId = { in: userProperties.map((p) => p.id) };
    }

    const expenses = await prisma.expense.findMany({
      where: whereClause,
      orderBy: { dateOccurred: 'asc' },
      include: {
        property: {
          select: { addressLine1: true, city: true },
        },
      },
    });

    // Map categories/lines to arrays
    const byCategory = Object.entries(
      fiscalData.categories as Record<string, { label: string; amount: number }>,
    )
      .filter(([, v]) => v.amount > 0)
      .map(([category, v]) => ({
        category,
        label: v.label,
        totalCents: v.amount,
      }));

    const declaration2044 = Object.entries(
      fiscalData.lines as Record<string, { label: string; amount: number }>,
    )
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([line, v]) => ({
        line,
        description: v.label,
        amountCents: v.amount,
      }));

    const expenseRows = expenses.map((exp) => ({
      date: exp.dateOccurred.toLocaleDateString('fr-FR'),
      category: exp.category,
      label: CATEGORY_LABELS[exp.category] || exp.category,
      amountTotalCents: exp.amountTotalCents,
      amountDeductibleCents:
        exp.amountDeductibleCents ??
        FiscalService.calculateDeductible(exp) ??
        0,
      isRecoverable: exp.isRecoverable,
      property: exp.property
        ? [exp.property.addressLine1, exp.property.city].filter(Boolean).join(', ')
        : '',
    }));

    // -------------------------------------------------------------------------
    // CSV FORMAT
    // -------------------------------------------------------------------------
    if (format === 'csv') {
      const lines: string[] = [];

      // BOM for Excel compatibility
      const BOM = '\uFEFF';

      // Section 1: Summary
      lines.push('=== RÉCAPITULATIF FISCAL ' + year + ' ===');
      lines.push('');
      lines.push(
        csvEscape('Revenus fonciers bruts') +
          ';' +
          fmtEuro(fiscalData.grossIncomeCents),
      );
      lines.push(
        csvEscape('Total charges déductibles') +
          ';' +
          fmtEuro(fiscalData.totalDeductibleCents),
      );
      lines.push(
        csvEscape('Frais de gestion (forfait)') +
          ';' +
          fmtEuro(fiscalData.managementFeesCents),
      );
      lines.push(
        csvEscape('Revenu foncier net imposable') +
          ';' +
          fmtEuro(fiscalData.netIncomeCents),
      );
      lines.push('');

      // Section 2: Declaration 2044
      lines.push('=== DÉCLARATION 2044 ===');
      lines.push('Ligne;Description;Montant (€)');
      for (const row of declaration2044) {
        lines.push(
          `${csvEscape(row.line)};${csvEscape(row.description)};${fmtEuro(row.amountCents)}`,
        );
      }
      lines.push('');

      // Section 3: Expenses detail
      lines.push('=== DÉTAIL DES DÉPENSES ===');
      lines.push(
        'Date;Catégorie;Montant total (€);Montant déductible (€);Récupérable;Bien',
      );
      for (const exp of expenseRows) {
        lines.push(
          [
            csvEscape(exp.date),
            csvEscape(exp.label),
            fmtEuro(exp.amountTotalCents),
            fmtEuro(exp.amountDeductibleCents),
            exp.isRecoverable ? 'Oui' : 'Non',
            csvEscape(exp.property),
          ].join(';'),
        );
      }

      const csv = BOM + lines.join('\n');

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="comptabilite-coridor-${year}.csv"`,
        },
      });
    }

    // -------------------------------------------------------------------------
    // PDF FORMAT
    // -------------------------------------------------------------------------
    const reportData: FiscalReportData = {
      year,
      propertyTitle,
      grossRevenueCents: fiscalData.grossIncomeCents,
      totalDeductibleCents: fiscalData.totalDeductibleCents,
      managementFeesCents: fiscalData.managementFeesCents,
      netTaxableIncomeCents: fiscalData.netIncomeCents,
      byCategory,
      declaration2044,
      expenses: expenseRows,
      generatedAt: new Date().toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    };

    const pdfBuffer = await renderToBuffer(
      React.createElement(FiscalReportDocument, { data: reportData }),
    );

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="recap-fiscal-coridor-${year}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('[Accounting Export] Error:', error);
    return NextResponse.json(
      { error: "Erreur lors de l'export" },
      { status: 500 },
    );
  }
}
