'use client';

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from 'next-intl';
import { X, FileText, Image as ImageIcon, File, Download, Search, MessageCircle } from "lucide-react";
import clsx from "clsx";
import useConversationDocuments, { ConversationDocument } from "@/hooks/useConversationDocuments";
import { format, type Locale } from "date-fns";
import { fr, enUS } from "date-fns/locale";

type FilterType = "all" | "pdf" | "images" | "coridor";

interface DocumentsPanelProps {
    conversationId: string;
    onClose: () => void;
    onScrollToMessage?: (messageId: string) => void;
    highlightedDocumentId?: string | null;
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return "";
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function getFileIcon(fileType: string) {
    if (fileType.startsWith("image/")) return ImageIcon;
    if (fileType.includes("pdf")) return FileText;
    return File;
}

function groupByMonth(docs: ConversationDocument[], dateFnsLocale: Locale): Record<string, ConversationDocument[]> {
    const groups: Record<string, ConversationDocument[]> = {};
    for (const doc of docs) {
        const key = format(new Date(doc.createdAt), "MMMM yyyy", { locale: dateFnsLocale });
        if (!groups[key]) groups[key] = [];
        groups[key].push(doc);
    }
    return groups;
}

const FILTER_KEYS: FilterType[] = ["all", "pdf", "images", "coridor"];

const DocumentsPanel: React.FC<DocumentsPanelProps> = ({
    conversationId,
    onClose,
    onScrollToMessage,
    highlightedDocumentId,
}) => {
    const t = useTranslations('inbox');
    const locale = useLocale();
    const dateFnsLocale = locale === 'fr' ? fr : enUS;
    const [filter, setFilter] = useState<FilterType>("all");
    const [search, setSearch] = useState("");

    const { documents, isLoading } = useConversationDocuments(conversationId, {
        filter,
        search: search.trim() || undefined,
    });

    const grouped = groupByMonth(documents, dateFnsLocale);

    const filterLabels: Record<FilterType, string> = {
        all: t('documents.filterAll'),
        pdf: t('documents.filterPdf'),
        images: t('documents.filterImages'),
        coridor: t('documents.filterCoridor'),
    };

    // Auto-scroll to highlighted document
    useEffect(() => {
        if (highlightedDocumentId) {
            setTimeout(() => {
                document.getElementById(`doc-${highlightedDocumentId}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 150);
        }
    }, [highlightedDocumentId]);

    return (
        <div className="flex flex-col h-full bg-white dark:bg-neutral-900">
            {/* Header */}
            <div className="flex items-center justify-between h-[72px] px-6 border-b border-gray-200 dark:border-neutral-800">
                <h2 className="text-2xl font-medium text-neutral-800 dark:text-white">
                    {t('documents.title')}
                </h2>
                <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                >
                    <X size={20} className="text-neutral-500" />
                </button>
            </div>

            {/* Search */}
            <div className="px-4 py-2">
                <div className="relative">
                    <Search
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t('documents.search')}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-neutral-900 dark:text-white placeholder:text-gray-400"
                    />
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 px-4 pb-2">
                {FILTER_KEYS.map((key) => (
                    <button
                        key={key}
                        onClick={() => setFilter(key)}
                        className={clsx(
                            "px-3 py-1 text-xs font-medium rounded-full transition",
                            filter === key
                                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
                        )}
                    >
                        {filterLabels[key]}
                    </button>
                ))}
            </div>

            {/* Document List */}
            <div className="flex-1 overflow-y-auto px-4 py-2">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
                        {t('documents.loading')}
                    </div>
                ) : documents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <FileText size={32} className="mb-2 opacity-40" />
                        <p className="text-sm">{t('documents.empty')}</p>
                    </div>
                ) : (
                    Object.entries(grouped).map(([month, docs]) => (
                        <div key={month} className="mb-4">
                            <h4 className="text-xs font-semibold text-gray-400 dark:text-neutral-500 uppercase tracking-wide mb-2">
                                {month}
                            </h4>
                            <div className="flex flex-col gap-2">
                                {docs.map((doc) => (
                                    <DocumentRow
                                        key={doc.id}
                                        doc={doc}
                                        isHighlighted={highlightedDocumentId === doc.id}
                                        onScrollToMessage={onScrollToMessage}
                                    />
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

interface DocumentRowProps {
    doc: ConversationDocument;
    isHighlighted: boolean;
    onScrollToMessage?: (messageId: string) => void;
}

const DocumentRow: React.FC<DocumentRowProps> = ({
    doc,
    isHighlighted,
    onScrollToMessage,
}) => {
    const t = useTranslations('inbox');
    const locale = useLocale();
    const dateFnsLocale = locale === 'fr' ? fr : enUS;
    const Icon = getFileIcon(doc.fileType);
    const sizeStr = formatFileSize(doc.fileSize);
    const ext = doc.fileType.split("/").pop()?.toUpperCase() || "";
    const dateStr = format(new Date(doc.createdAt), "d MMM", { locale: dateFnsLocale });

    return (
        <div
            id={`doc-${doc.id}`}
            className={clsx(
                "flex items-center gap-3 p-2.5 rounded-lg border transition-all",
                isHighlighted
                    ? "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700 ring-1 ring-amber-300 dark:ring-amber-600"
                    : "bg-white border-gray-100 dark:bg-neutral-800/50 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800"
            )}
        >
            <div className="p-2 bg-gray-100 dark:bg-neutral-700 rounded-lg shrink-0 text-gray-500 dark:text-neutral-400">
                <Icon size={18} />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                    {doc.label || doc.fileName}
                </span>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-neutral-500">
                    <span>{ext}</span>
                    {sizeStr && (
                        <>
                            <span>·</span>
                            <span>{sizeStr}</span>
                        </>
                    )}
                    <span>·</span>
                    <span>{dateStr}</span>
                    {doc.uploadedBy?.name && (
                        <>
                            <span>·</span>
                            <span className="truncate">{doc.uploadedBy.name}</span>
                        </>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
                {doc.messageId && onScrollToMessage && (
                    <button
                        onClick={() => onScrollToMessage(doc.messageId!)}
                        className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-700 transition text-gray-400 hover:text-gray-600 dark:hover:text-neutral-300"
                        title={t('documents.viewInConversation')}
                    >
                        <MessageCircle size={14} />
                    </button>
                )}
                <button
                    onClick={async () => {
                        try {
                            const res = await fetch(`/api/documents/${doc.id}/download`);
                            const { url } = await res.json();
                            window.open(url, "_blank");
                        } catch {
                            window.open(doc.fileUrl, "_blank");
                        }
                    }}
                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-700 transition text-gray-400 hover:text-gray-600 dark:hover:text-neutral-300 cursor-pointer"
                    title={t('documents.download')}
                >
                    <Download size={14} />
                </button>
            </div>
        </div>
    );
};

export default DocumentsPanel;
