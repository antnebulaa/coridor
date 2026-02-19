'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure pdf.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfPagesRendererProps {
    blob: Blob;
}

const PdfPagesRenderer: React.FC<PdfPagesRendererProps> = ({ blob }) => {
    const [numPages, setNumPages] = useState(0);
    const [containerWidth, setContainerWidth] = useState(0);
    const [fileData, setFileData] = useState<{ data: Uint8Array } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Convert blob to Uint8Array (avoids cross-origin blob URL fetch from worker)
    useEffect(() => {
        blob.arrayBuffer().then(buf => {
            setFileData({ data: new Uint8Array(buf) });
        });
    }, [blob]);

    // Track container width with ResizeObserver
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const width = entry.contentRect.width;
                if (width > 0) setContainerWidth(width);
            }
        });

        observer.observe(el);
        setContainerWidth(el.clientWidth);

        return () => observer.disconnect();
    }, []);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    };

    // Calculate page width: on desktop cap for readability; on mobile use full width
    const pageWidth = useMemo(() => {
        if (containerWidth <= 0) return 0;
        const maxWidth = Math.min(containerWidth - 32, 800);
        return containerWidth < 640 ? containerWidth - 16 : maxWidth;
    }, [containerWidth]);

    return (
        <div
            ref={containerRef}
            className="h-full overflow-y-auto overflow-x-hidden bg-neutral-200"
        >
            {containerWidth > 0 && fileData && (
                <Document
                    file={fileData}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={
                        <div className="flex items-center justify-center py-20">
                            <div className="text-center">
                                <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin mx-auto mb-3" />
                                <p className="text-sm text-neutral-500">Chargement du document...</p>
                            </div>
                        </div>
                    }
                    error={
                        <div className="flex items-center justify-center py-20">
                            <p className="text-sm text-red-500">Erreur de chargement du document.</p>
                        </div>
                    }
                >
                    <div className="flex flex-col items-center gap-4 py-4 sm:py-8">
                        {Array.from({ length: numPages }, (_, i) => (
                            <div
                                key={i}
                                className="shadow-lg bg-white"
                                style={{ width: pageWidth }}
                            >
                                <Page
                                    pageNumber={i + 1}
                                    width={pageWidth}
                                    renderTextLayer={true}
                                    renderAnnotationLayer={true}
                                    loading={
                                        <div
                                            className="flex items-center justify-center bg-white"
                                            style={{ width: pageWidth, height: pageWidth * 1.414 }}
                                        >
                                            <div className="w-6 h-6 border-2 border-neutral-200 border-t-neutral-400 rounded-full animate-spin" />
                                        </div>
                                    }
                                />
                            </div>
                        ))}
                    </div>

                    {numPages > 0 && (
                        <div className="sticky bottom-4 flex justify-center pointer-events-none pb-4">
                            <div className="bg-black/70 text-white text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur-sm">
                                {numPages} page{numPages > 1 ? 's' : ''}
                            </div>
                        </div>
                    )}
                </Document>
            )}
        </div>
    );
};

export default PdfPagesRenderer;
