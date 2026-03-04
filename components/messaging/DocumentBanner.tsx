'use client';

import { FileText, Image as ImageIcon, File, Download, ArrowRight } from "lucide-react";
import clsx from "clsx";

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

    return (
        <div className="flex flex-col gap-1.5 max-w-xs">
            <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={clsx(
                    "flex items-center gap-3 p-3 rounded-lg border transition hover:bg-black/5",
                    isOwn
                        ? "bg-white/10 border-white/20 text-white"
                        : "bg-white border-gray-200 text-gray-900"
                )}
            >
                <div
                    className={clsx(
                        "p-2 rounded-lg shrink-0",
                        isOwn
                            ? "bg-white/10 text-white/80"
                            : "bg-gray-100 text-gray-500"
                    )}
                >
                    <Icon size={20} />
                </div>
                <div className="flex flex-col overflow-hidden flex-1 min-w-0">
                    <span className="text-sm font-medium truncate">
                        {label || fileName}
                    </span>
                    <span className="text-xs opacity-70">
                        {ext}
                        {sizeStr && ` · ${sizeStr}`}
                    </span>
                </div>
                <Download
                    size={16}
                    className={clsx(
                        "shrink-0 opacity-50",
                        isOwn ? "text-white" : "text-gray-400"
                    )}
                />
            </a>

            {onViewInPanel && (
                <button
                    onClick={() => onViewInPanel(documentId)}
                    className={clsx(
                        "text-xs flex items-center gap-1 transition",
                        isOwn
                            ? "text-white/60 hover:text-white/90"
                            : "text-gray-400 hover:text-gray-600"
                    )}
                >
                    Voir dans Documents
                    <ArrowRight size={12} />
                </button>
            )}
        </div>
    );
};

export default DocumentBanner;
