import { NextResponse } from 'next/server';
import getCurrentUser from '@/app/actions/getCurrentUser';
import { ListingImportService } from '@/services/ListingImportService';

/**
 * Simple in-memory rate limiter.
 * Tracks imports per user with a sliding window.
 * Resets every hour. Max 10 imports/hour/user.
 */
const MAX_URL_LENGTH = 2048;
const MAX_TEXT_LENGTH = 50_000;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
    const now = Date.now();

    // Clean expired entries to prevent memory leak
    if (rateLimitMap.size > 1000) {
        for (const [key, entry] of rateLimitMap) {
            if (now > entry.resetAt) rateLimitMap.delete(key);
        }
    }

    const entry = rateLimitMap.get(userId);

    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(userId, { count: 1, resetAt: now + 3600_000 });
        return true;
    }

    if (entry.count >= 10) {
        return false;
    }

    entry.count++;
    return true;
}

/**
 * POST /api/listings/import
 *
 * Body: { url?: string, rawText?: string }
 *
 * - url: URL of an external listing to fetch and analyze
 * - rawText: Fallback — raw text pasted by the user
 *
 * Returns extracted listing data mapped to Coridor form fields.
 */
export async function POST(request: Request) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ success: false, error: 'UNAUTHORIZED', message: 'Non autorisé' }, { status: 401 });
        }

        // Rate limit
        if (!checkRateLimit(currentUser.id)) {
            return NextResponse.json(
                { success: false, error: 'RATE_LIMITED', message: 'Trop d\'imports. Réessayez dans une heure.' },
                { status: 429 }
            );
        }

        const body = await request.json();
        const { url, rawText } = body;

        if (!url && !rawText) {
            return NextResponse.json(
                { success: false, error: 'INVALID_URL', message: "Veuillez fournir une URL ou du texte." },
                { status: 400 }
            );
        }

        // Input size validation
        if (url && url.length > MAX_URL_LENGTH) {
            return NextResponse.json(
                { success: false, error: 'INVALID_URL', message: "L'URL est trop longue." },
                { status: 400 }
            );
        }
        if (rawText && rawText.length > MAX_TEXT_LENGTH) {
            return NextResponse.json(
                { success: false, error: 'NOT_A_LISTING', message: "Le texte est trop long (50 000 caractères max)." },
                { status: 400 }
            );
        }

        let result;

        if (rawText) {
            // Fallback: raw text pasted by the user
            result = await ListingImportService.importFromText(rawText);
        } else {
            // Primary: fetch and analyze URL
            result = await ListingImportService.importFromUrl(url);
        }

        console.log(`[Listing Import] userId=${currentUser.id} source=${result.success ? (result as any).source : 'N/A'} success=${result.success}`);

        if (!result.success) {
            return NextResponse.json(result, { status: 422 });
        }

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[POST /api/listings/import] Error:', error);
        return NextResponse.json(
            { success: false, error: 'EXTRACTION_FAILED', message: 'Erreur inattendue lors de l\'import.' },
            { status: 500 }
        );
    }
}
