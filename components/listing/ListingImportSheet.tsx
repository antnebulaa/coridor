'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Drawer } from 'vaul';
import { X, Link2, ClipboardPaste, Loader2, AlertTriangle, ArrowRight } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import axios from 'axios';

export interface ImportedListingResult {
    source: string;
    data: Record<string, any>;
    importedFields: string[];
    warnings: string[];
}

interface ListingImportSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onImported: (result: ImportedListingResult) => void;
}

type SheetState = 'INPUT' | 'TEXT_INPUT' | 'LOADING' | 'ERROR';

const SUPPORTED_SITES = [
    { name: 'LeBonCoin', domain: 'leboncoin.fr' },
    { name: 'SeLoger', domain: 'seloger.com' },
    { name: 'PAP', domain: 'pap.fr' },
    { name: "Bien'ici", domain: 'bienici.com' },
];

const ListingImportSheet: React.FC<ListingImportSheetProps> = ({
    isOpen,
    onClose,
    onImported,
}) => {
    const isDesktop = useMediaQuery('(min-width: 768px)');
    const [state, setState] = useState<SheetState>('INPUT');
    const [url, setUrl] = useState('');
    const [rawText, setRawText] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [detectedSource, setDetectedSource] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const resetState = useCallback(() => {
        setState('INPUT');
        setUrl('');
        setRawText('');
        setErrorMessage('');
        setDetectedSource('');
    }, []);

    // Reset state when sheet opens
    useEffect(() => {
        if (isOpen) resetState();
    }, [isOpen, resetState]);

    const handleClose = useCallback(() => {
        resetState();
        onClose();
    }, [onClose, resetState]);

    const detectSourceFromUrl = (inputUrl: string): string => {
        const lower = inputUrl.toLowerCase();
        if (lower.includes('leboncoin')) return 'LeBonCoin';
        if (lower.includes('seloger') || lower.includes('logic-immo')) return 'SeLoger';
        if (lower.includes('pap.fr')) return 'PAP';
        if (lower.includes('bienici')) return "Bien'ici";
        return '';
    };

    const handleImportUrl = useCallback(async () => {
        if (!url.trim()) return;

        const source = detectSourceFromUrl(url);
        setDetectedSource(source);
        setState('LOADING');

        try {
            const { data } = await axios.post('/api/listings/import', { url: url.trim() }, {
                timeout: 30_000,
            });

            if (data.success) {
                onImported(data);
                handleClose();
            } else {
                setErrorMessage(data.message || "L'import a échoué.");
                setState('ERROR');
            }
        } catch (err: any) {
            const msg = err?.response?.data?.message || "Impossible d'analyser cette annonce. Essayez de coller le texte.";
            setErrorMessage(msg);
            setState('ERROR');
        }
    }, [url, onImported, handleClose]);

    const handleImportText = useCallback(async () => {
        if (!rawText.trim() || rawText.trim().length < 20) return;

        setState('LOADING');
        setDetectedSource('');

        try {
            const { data } = await axios.post('/api/listings/import', { rawText: rawText.trim() }, {
                timeout: 30_000,
            });

            if (data.success) {
                onImported(data);
                handleClose();
            } else {
                setErrorMessage(data.message || "L'import a échoué.");
                setState('ERROR');
            }
        } catch (err: any) {
            const msg = err?.response?.data?.message || "L'analyse du texte a échoué.";
            setErrorMessage(msg);
            setState('ERROR');
        }
    }, [rawText, onImported, handleClose]);

    // Content shared between Drawer (mobile) and modal (desktop)
    const sheetContent = (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <h2 className="text-lg font-semibold text-foreground">
                    Importer une annonce
                </h2>
                <button
                    onClick={handleClose}
                    className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    aria-label="Fermer"
                >
                    <X size={20} className="text-neutral-500" />
                </button>
            </div>

            <div className="px-5 pb-8 flex-1">
                {/* STATE: URL Input */}
                {state === 'INPUT' && (
                    <div className="flex flex-col gap-5">
                        <p className="text-sm text-neutral-500">
                            Collez le lien de votre annonce pour pré-remplir automatiquement le formulaire.
                        </p>

                        {/* URL input */}
                        <div className="flex flex-col gap-2">
                            <div className="relative">
                                <Link2 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                                <input
                                    ref={inputRef}
                                    type="url"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && url.trim()) handleImportUrl(); }}
                                    placeholder="https://www.leboncoin.fr/ad/..."
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-background text-foreground text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 transition-shadow"
                                    autoFocus={isDesktop}
                                />
                            </div>

                            {/* Supported sites */}
                            <div className="flex flex-wrap gap-1.5">
                                {SUPPORTED_SITES.map(site => (
                                    <span
                                        key={site.domain}
                                        className="text-sm text-neutral-400 dark:text-neutral-500"
                                    >
                                        {site.name}{site !== SUPPORTED_SITES[SUPPORTED_SITES.length - 1] ? ' · ' : ''}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Import button */}
                        <button
                            onClick={handleImportUrl}
                            disabled={!url.trim()}
                            className="w-full py-3 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                        >
                            Analyser l'annonce
                            <ArrowRight size={16} />
                        </button>

                        {/* Separator */}
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
                            <span className="text-sm text-neutral-400">ou</span>
                            <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
                        </div>

                        {/* Paste text fallback */}
                        <button
                            onClick={() => setState('TEXT_INPUT')}
                            className="flex items-center justify-center gap-2 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                        >
                            <ClipboardPaste size={16} />
                            Coller le texte de l'annonce
                        </button>
                    </div>
                )}

                {/* STATE: Text Input (fallback) */}
                {state === 'TEXT_INPUT' && (
                    <div className="flex flex-col gap-4">
                        <p className="text-sm text-neutral-500">
                            Copiez le texte de votre annonce depuis le site et collez-le ici.
                        </p>
                        <textarea
                            value={rawText}
                            onChange={(e) => setRawText(e.target.value)}
                            placeholder="Collez ici le texte de votre annonce..."
                            className="w-full h-48 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-background text-foreground text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 resize-none transition-shadow"
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setState('INPUT'); setRawText(''); }}
                                className="flex-1 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                            >
                                Retour
                            </button>
                            <button
                                onClick={handleImportText}
                                disabled={rawText.trim().length < 20}
                                className="flex-1 py-3 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                            >
                                Analyser
                            </button>
                        </div>
                    </div>
                )}

                {/* STATE: Loading */}
                {state === 'LOADING' && (
                    <div className="flex flex-col items-center justify-center py-16 gap-4">
                        <Loader2 size={32} className="text-neutral-400 animate-spin" />
                        <div className="text-center">
                            <p className="text-sm font-medium text-foreground">
                                Analyse de votre annonce en cours...
                            </p>
                            {detectedSource && (
                                <p className="text-sm text-neutral-400 mt-1">
                                    {detectedSource} détecté
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* STATE: Error */}
                {state === 'ERROR' && (
                    <div className="flex flex-col items-center justify-center py-12 gap-5">
                        <AlertTriangle size={32} className="text-amber-500" />
                        <div className="text-center max-w-xs">
                            <p className="text-sm font-medium text-foreground mb-1">
                                Impossible de lire cette annonce
                            </p>
                            <p className="text-sm text-neutral-500">
                                {errorMessage}
                            </p>
                        </div>
                        <div className="flex gap-3 w-full">
                            <button
                                onClick={() => { setState('TEXT_INPUT'); setRawText(''); }}
                                className="flex-1 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
                            >
                                <ClipboardPaste size={16} />
                                Coller le texte
                            </button>
                            <button
                                onClick={() => { setState('INPUT'); setUrl(''); }}
                                className="flex-1 py-3 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-semibold text-sm hover:opacity-90 transition-opacity"
                            >
                                Réessayer
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    // Desktop: centered modal
    if (isDesktop) {
        if (!isOpen) return null;
        return (
            <div className="fixed inset-0 z-60 flex items-center justify-center">
                <div
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    onClick={handleClose}
                />
                <div className="relative w-full max-w-md bg-background rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    {sheetContent}
                </div>
            </div>
        );
    }

    // Mobile: Vaul Drawer
    return (
        <Drawer.Root
            open={isOpen}
            onOpenChange={(open) => { if (!open) handleClose(); }}
            repositionInputs={false}
        >
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 z-60 bg-black/40" />
                <Drawer.Content className="fixed bottom-0 left-0 right-0 z-60 rounded-t-2xl bg-background border-t border-neutral-200 dark:border-neutral-700 max-h-[85dvh]">
                    <div className="mx-auto w-12 h-1.5 shrink-0 rounded-full bg-neutral-300 dark:bg-neutral-600 my-3" />
                    <div className="pb-safe">
                        {sheetContent}
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
};

export default ListingImportSheet;
