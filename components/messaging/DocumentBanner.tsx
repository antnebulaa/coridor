'use client';

import { FileText, Image as ImageIcon, File, Download, ArrowRight } from "lucide-react";

interface DocumentBannerProps {
    fileName: string;
    fileType: string;
    fileSize: number;
    fileUrl: string;
    label?: string | null;
    documentId: string;
    isOwn: boolean;
    onViewInPanel?: (documentId: string) => void;
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

const DocumentBanner: React.FC<DocumentBannerProps> = ({
    fileName,
    fileType,
    fileSize,
    fileUrl,
    label,
    documentId,
    isOwn,
    onViewInPanel,
}) => {
    const Icon = getFileIcon(fileType);
    const sizeStr = formatFileSize(fileSize);
    const ext = fileType.split("/").pop()?.toUpperCase() || "";

    const handleDownload = async () => {
        try {
            const res = await fetch(`/api/documents/${documentId}/download`);
            const { url } = await res.json();
            window.open(url, "_blank");
        } catch {
            window.open(fileUrl, "_blank");
        }
    };

    return (
        <div className="flex flex-col gap-1.5 w-full">
            <div className="flex items-center w-full gap-3 p-3 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
                {/* Icon */}
                <div className="p-2.5 rounded-lg shrink-0 bg-gray-100 dark:bg-neutral-700 text-gray-500 dark:text-neutral-400">
                    <Icon size={20} />
                </div>

                {/* Label + type */}
                <div className="flex flex-col overflow-hidden flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {label || fileName}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-neutral-500">
                        {ext}
                        {sizeStr && ` · ${sizeStr}`}
                    </span>
                </div>

                {/* Download button */}
                <button
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-700 transition shrink-0 cursor-pointer"
                >
                    <Download size={14} />
                    Télécharger
                </button>
            </div>

            {onViewInPanel && (
                <button
                    onClick={() => onViewInPanel(documentId)}
                    className="text-xs flex items-center gap-1 text-gray-400 hover:text-gray-600 dark:text-neutral-500 dark:hover:text-neutral-300 transition"
                >
                    Voir dans Documents
                    <ArrowRight size={12} />
                </button>
            )}
        </div>
    );
};

export default DocumentBanner;
