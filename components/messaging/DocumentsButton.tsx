'use client';

import { FileText } from "lucide-react";
import useConversationDocuments from "@/hooks/useConversationDocuments";

interface DocumentsButtonProps {
    conversationId: string;
    onToggleDocuments: () => void;
}

const DocumentsButton: React.FC<DocumentsButtonProps> = ({
    conversationId,
    onToggleDocuments,
}) => {
    const { documents } = useConversationDocuments(conversationId);
    const count = documents.length;

    if (count === 0) return null;

    return (
        <button
            onClick={onToggleDocuments}
            className="
                flex items-center gap-1.5
                py-1.5 px-3
                bg-neutral-100 dark:bg-neutral-800
                hover:bg-neutral-200 dark:hover:bg-neutral-700
                rounded-full
                cursor-pointer
                transition
                text-xs font-semibold text-neutral-900 dark:text-neutral-100
            "
        >
            <FileText size={14} />
            <span className="hidden sm:inline">Documents</span>
            <span className="ml-0.5 px-1.5 py-0.5 bg-white dark:bg-neutral-700 rounded-full text-[10px] text-gray-500 dark:text-neutral-300 shadow-sm border border-gray-100 dark:border-neutral-600">
                {count}
            </span>
        </button>
    );
};

export default DocumentsButton;
