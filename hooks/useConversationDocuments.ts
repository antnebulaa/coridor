import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export interface ConversationDocument {
    id: string;
    conversationId: string;
    messageId: string | null;
    uploadedById: string | null;
    source: "user" | "coridor";
    fileName: string;
    fileType: string;
    fileSize: number;
    fileUrl: string;
    storagePath: string | null;
    label: string | null;
    category: string | null;
    coridorType: string | null;
    coridorRef: string | null;
    createdAt: string;
    updatedAt: string;
    uploadedBy: {
        id: string;
        name: string | null;
        image: string | null;
    } | null;
    message: {
        id: string;
    } | null;
}

export default function useConversationDocuments(
    conversationId: string | null,
    options?: {
        filter?: "all" | "pdf" | "images" | "coridor";
        search?: string;
    }
) {
    const params = new URLSearchParams();
    if (options?.filter && options.filter !== "all") {
        params.set("filter", options.filter);
    }
    if (options?.search) {
        params.set("search", options.search);
    }
    const qs = params.toString();

    const url = conversationId
        ? `/api/conversations/${conversationId}/documents${qs ? `?${qs}` : ""}`
        : null;

    const { data, error, isLoading, mutate } = useSWR<ConversationDocument[]>(
        url,
        fetcher,
        { dedupingInterval: 5000 }
    );

    return {
        documents: data || [],
        isLoading,
        isError: !!error,
        mutate,
    };
}
