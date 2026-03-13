import { cleanHtml } from '@/lib/listing-import/htmlCleaner';
import { EXTRACTION_SYSTEM_PROMPT, buildExtractionPrompt } from '@/lib/listing-import/extractionPrompt';
import { ExtractedListingData, mapToCoridorFields, MappedFormValues } from '@/lib/listing-import/fieldMapper';

export type ListingSource = 'LEBONCOIN' | 'SELOGER' | 'PAP' | 'BIENICI' | 'UNKNOWN';

export interface ImportResult {
    success: true;
    source: ListingSource;
    data: Partial<MappedFormValues>;
    importedFields: string[];
    warnings: string[];
}

export interface ImportError {
    success: false;
    error: 'INVALID_URL' | 'FETCH_FAILED' | 'NOT_A_LISTING' | 'EXTRACTION_FAILED';
    message: string;
}

const ALLOWED_DOMAINS = [
    'leboncoin.fr',
    'seloger.com',
    'logic-immo.com',
    'pap.fr',
    'bienici.com',
];

function detectSource(url: string): ListingSource {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('leboncoin')) return 'LEBONCOIN';
    if (hostname.includes('seloger') || hostname.includes('logic-immo')) return 'SELOGER';
    if (hostname.includes('pap.fr')) return 'PAP';
    if (hostname.includes('bienici')) return 'BIENICI';
    return 'UNKNOWN';
}

function isAllowedDomain(url: string): boolean {
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        return ALLOWED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
    } catch {
        return false;
    }
}

/**
 * Fetches a listing page HTML.
 * Uses a mobile user-agent for better static content on SPAs.
 */
async function fetchPage(url: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'fr-FR,fr;q=0.9',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return await response.text();
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Calls GPT-4o Mini to extract structured listing data from cleaned text.
 * Uses the same OPENAI_API_KEY as the Whisper transcription endpoint.
 */
async function extractWithLLM(cleanedText: string, sourceUrl: string): Promise<ExtractedListingData> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not configured');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                max_tokens: 1024,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
                    { role: 'user', content: buildExtractionPrompt(cleanedText, sourceUrl) },
                ],
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error(`[ListingImport] OpenAI error (${res.status}):`, err.substring(0, 500));
            throw new Error(`OpenAI API error: ${res.status}`);
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content || typeof content !== 'string') {
            throw new Error('LLM returned empty content');
        }

        return JSON.parse(content);
    } finally {
        clearTimeout(timeout);
    }
}

export class ListingImportService {
    /**
     * Import listing data from a URL.
     */
    static async importFromUrl(url: string): Promise<ImportResult | ImportError> {
        // 1. Validate URL
        if (!url || !url.startsWith('http')) {
            return { success: false, error: 'INVALID_URL', message: "L'URL doit commencer par http:// ou https://" };
        }

        if (!isAllowedDomain(url)) {
            return { success: false, error: 'INVALID_URL', message: "Seuls LeBonCoin, SeLoger, PAP et Bien'ici sont supportés" };
        }

        const source = detectSource(url);

        // 2. Fetch the page HTML
        let rawHtml: string;
        try {
            rawHtml = await fetchPage(url);
        } catch (err: any) {
            return {
                success: false,
                error: 'FETCH_FAILED',
                message: err?.name === 'AbortError'
                    ? 'Le site met trop de temps à répondre. Essayez de coller le texte directement.'
                    : "Impossible d'accéder à cette page. Essayez de coller le texte directement.",
            };
        }

        // 3. Clean HTML
        const cleanedText = cleanHtml(rawHtml);
        if (cleanedText.length < 50) {
            return {
                success: false,
                error: 'NOT_A_LISTING',
                message: "Le contenu de cette page semble vide. Le site utilise peut-être du rendu dynamique. Essayez de coller le texte de l'annonce.",
            };
        }

        // 4. Extract with LLM
        return ListingImportService.importFromText(cleanedText, url, source);
    }

    /**
     * Import listing data from raw pasted text (fallback).
     */
    static async importFromText(
        text: string,
        sourceUrl: string = 'copier-coller',
        source: ListingSource = 'UNKNOWN'
    ): Promise<ImportResult | ImportError> {
        if (!text || text.trim().length < 20) {
            return { success: false, error: 'NOT_A_LISTING', message: 'Le texte est trop court pour être une annonce.' };
        }

        try {
            const extracted = await extractWithLLM(text, sourceUrl);

            // 5. Map to Coridor fields
            const { values, importedFields } = mapToCoridorFields(extracted);

            // 6. Build warnings
            const warnings: string[] = [];
            if (!extracted.rentAmount) warnings.push('Loyer non trouvé');
            if (!extracted.surface) warnings.push('Surface non trouvée');
            if (!extracted.address?.city) warnings.push('Ville non identifiée');

            return {
                success: true,
                source,
                data: values,
                importedFields: Array.from(importedFields),
                warnings,
            };
        } catch (err: any) {
            console.error('[ListingImportService] LLM extraction error:', err);
            return {
                success: false,
                error: 'EXTRACTION_FAILED',
                message: "L'analyse de l'annonce a échoué. Essayez de coller le texte directement.",
            };
        }
    }
}
