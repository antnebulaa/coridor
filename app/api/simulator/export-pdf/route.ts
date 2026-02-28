import React from 'react';
import ReactPDF from '@react-pdf/renderer';
import { NextResponse } from 'next/server';
import {
  InvestmentSimulatorService,
  type InvestmentInput,
} from '@/services/InvestmentSimulatorService';
import {
  InvestmentReportDocument,
  type InvestmentReportData,
} from '@/components/documents/InvestmentReportDocument';

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

// ---------------------------------------------------------------------------
// POST — Export simulation as PDF (public, no auth)
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Corps de requête JSON invalide' },
        { status: 400 },
      );
    }

    const { inputs, name } = body as {
      inputs: InvestmentInput;
      name?: string;
    };

    if (!inputs || typeof inputs !== 'object') {
      return NextResponse.json(
        { error: 'inputs requis' },
        { status: 400 },
      );
    }

    // Compute results server-side
    const results = InvestmentSimulatorService.simulate(inputs);

    const reportData: InvestmentReportData = {
      input: inputs,
      result: results,
      generatedAt: new Date().toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      simulationName: name,
    };

    const pdfBuffer = await renderToBuffer(
      React.createElement(InvestmentReportDocument, { data: reportData }),
    );

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition':
          'attachment; filename="rapport-investissement-coridor.pdf"',
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('[Simulator Export PDF] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du PDF' },
      { status: 500 },
    );
  }
}
