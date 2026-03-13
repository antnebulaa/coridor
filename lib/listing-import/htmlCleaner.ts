import * as cheerio from 'cheerio';

const MAX_HTML_SIZE = 2_000_000; // 2MB — reject absurdly large pages

/**
 * Cleans raw HTML from a listing page and extracts meaningful text content.
 * Reduces ~50k tokens of raw HTML to ~3-5k tokens of useful text.
 */
export function cleanHtml(rawHtml: string): string {
    // Truncate oversized HTML before parsing to prevent DoS
    const html = rawHtml.length > MAX_HTML_SIZE ? rawHtml.slice(0, MAX_HTML_SIZE) : rawHtml;
    const $ = cheerio.load(html);

    // Remove noise elements
    $('script, style, noscript, svg, iframe, link, meta').remove();
    $('nav, footer, header, aside').remove();
    $('[data-ad], [class*="ad-"], [id*="ad-"], [class*="cookie"], [class*="consent"]').remove();
    $('[class*="banner"], [class*="popup"], [class*="modal"], [class*="overlay"]').remove();
    $('[role="navigation"], [role="banner"], [role="complementary"]').remove();

    // Try to find the main content area
    let content = $('main, [role="main"], article, .listing-detail, .ad-detail, .classified-detail').first();

    // Source-specific selectors
    if (!content.length) content = $('[data-qa-id="adview_spotlight_description_container"]').first(); // LeBonCoin
    if (!content.length) content = $('.detail-container, .classified__body').first(); // SeLoger/PAP
    if (!content.length) content = $('body');

    // Extract structured text
    const lines: string[] = [];

    // Get the page title
    const pageTitle = $('title').text().trim();
    if (pageTitle) lines.push(`Titre de la page: ${pageTitle}`);

    // Walk through content and extract text with structure
    content.find('h1, h2, h3, h4, p, li, td, th, span, div, label').each((_, el) => {
        const $el = $(el);
        // Skip if this element has child block elements (avoid duplication)
        if ($el.children('h1, h2, h3, h4, p, div, ul, ol, table').length > 0) return;

        const text = $el.text().replace(/\s+/g, ' ').trim();
        if (text.length > 1 && text.length < 500) {
            lines.push(text);
        }
    });

    // Deduplicate consecutive identical lines
    const deduped = lines.filter((line, i) => i === 0 || line !== lines[i - 1]);

    // Join and truncate to ~6000 words (~8000 tokens)
    let result = deduped.join('\n');
    const words = result.split(/\s+/);
    if (words.length > 6000) {
        result = words.slice(0, 6000).join(' ');
    }

    return result;
}
