import { NextResponse } from 'next/server';
import {
  RentEstimatorService,
  type RentEstimateParams,
} from '@/services/RentEstimatorService';

export async function POST(request: Request) {
  try {
    const body: RentEstimateParams = await request.json();

    if (!body.surface || body.surface <= 0) {
      return NextResponse.json(
        { error: 'Surface is required and must be positive', available: false },
        { status: 400 }
      );
    }
    if (!body.communeCode && !body.zipCode) {
      return NextResponse.json(
        { error: 'communeCode or zipCode is required', available: false },
        { status: 400 }
      );
    }

    const result = await RentEstimatorService.estimate(body);

    if (!result) {
      return NextResponse.json({
        available: false,
        message: 'Pas de données de marché disponibles pour cette commune.',
      });
    }

    return NextResponse.json({ ...result, available: true });
  } catch (error: any) {
    console.error('[RentEstimate] Error:', error?.message || error, error?.stack);
    return NextResponse.json(
      { error: 'Erreur interne', available: false },
      { status: 500 }
    );
  }
}
