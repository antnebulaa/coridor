import React from 'react';
import { NextResponse } from 'next/server';
import prisma from '@/libs/prismadb';
import getCurrentUser from '@/app/actions/getCurrentUser';
import ReactPDF from '@react-pdf/renderer';
import InvoicePdfDocument from '@/components/documents/InvoicePdfDocument';
import type { InvoicePdfData } from '@/components/documents/InvoicePdfDocument';

type Params = { params: Promise<{ invoiceId: string }> };

const renderToBuffer = async (element: React.ReactElement): Promise<Buffer> => {
  const stream = await ReactPDF.renderToStream(element as any);
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', (err) => reject(err));
  });
};

// GET /api/invoices/[invoiceId]/generate-pdf — Return existing PDF URL
export async function GET(request: Request, props: Params) {
  try {
    const { invoiceId } = await props.params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { userId: true, pdfUrl: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const isOwner = invoice.userId === currentUser.id;
    const isAdmin = (currentUser as any).role === 'ADMIN';
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!invoice.pdfUrl) {
      return NextResponse.json({ error: 'PDF not yet generated' }, { status: 404 });
    }

    return NextResponse.json({ pdfUrl: invoice.pdfUrl });
  } catch (error: unknown) {
    console.error('[Invoice PDF GET] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/invoices/[invoiceId]/generate-pdf — Generate PDF, upload to Cloudinary, store URL
export async function POST(request: Request, props: Params) {
  try {
    const { invoiceId } = await props.params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        user: {
          select: { name: true, email: true, firstName: true },
        },
        subscription: {
          select: { plan: true, endDate: true, giftReason: true },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const isOwner = invoice.userId === currentUser.id;
    const isAdmin = (currentUser as any).role === 'ADMIN';
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // If PDF already exists, return it directly
    if (invoice.pdfUrl) {
      return NextResponse.json({ pdfUrl: invoice.pdfUrl });
    }

    // Build invoice number: INV-{year}-{last 4 chars of ID}
    const invoiceYear = new Date(invoice.invoiceDate).getFullYear();
    const idSuffix = invoice.id.slice(-4).toUpperCase();
    const invoiceNumber = `INV-${invoiceYear}-${idSuffix}`;

    // Build customer name
    const user = invoice.user as any;
    const customerName = [user.firstName, user.name].filter(Boolean).join(' ')
      || user.name
      || user.email
      || 'Client';

    // Determine plan name
    const planName = invoice.subscription?.plan
      ? `Coridor ${invoice.subscription.plan}`
      : (invoice.description?.match(/(?:FREE|PLUS|PRO|Essentiel|Essential)/i)?.[0] || 'Coridor');

    // Build PDF data
    const pdfData: InvoicePdfData = {
      invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      customerName,
      customerEmail: user.email || '',
      planName,
      periodStart: invoice.invoiceDate,
      periodEnd: invoice.subscription?.endDate ?? null,
      amountCents: invoice.amountCents,
      isGift: invoice.amountCents === 0,
      giftReason: invoice.subscription?.giftReason ?? undefined,
    };

    // Render PDF
    const pdfBuffer = await renderToBuffer(
      React.createElement(InvoicePdfDocument, { data: pdfData })
    );

    // Upload to Cloudinary
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const formData = new FormData();
    formData.append(
      'file',
      new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' }),
      `invoice-${invoiceId}.pdf`
    );
    formData.append('upload_preset', 'airbnb-clone');
    formData.append('resource_type', 'auto');
    formData.append('folder', 'coridor-invoices');

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      { method: 'POST', body: formData }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      console.error('[Invoice PDF Upload] Cloudinary error:', err);
      return NextResponse.json({ error: 'Failed to upload PDF' }, { status: 500 });
    }

    const uploadData = await uploadRes.json();
    if (!uploadData.secure_url) {
      console.error('[Invoice PDF Upload] No secure_url in response:', uploadData);
      return NextResponse.json({ error: 'Upload succeeded but no URL returned' }, { status: 500 });
    }
    const pdfUrl = uploadData.secure_url;

    // Store PDF URL on the invoice
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { pdfUrl },
    });

    return NextResponse.json({ pdfUrl });
  } catch (error: unknown) {
    console.error('[Invoice PDF POST] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
