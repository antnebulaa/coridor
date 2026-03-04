import prisma from "@/libs/prismadb";

export interface CreateUserDocumentInput {
    conversationId: string;
    messageId: string;
    uploadedById: string;
    fileName: string;
    fileType: string; // MIME type
    fileSize: number;
    fileUrl: string;
    label?: string;
}

export interface CreateCoridorDocumentInput {
    conversationId: string;
    messageId?: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    fileUrl: string;
    coridorType: string; // "quittance" | "bail" | "edl" | "mise_en_demeure" | "inventaire"
    coridorRef?: string;
    label?: string;
}

export class DocumentService {
    /**
     * Index a user-uploaded file as a ConversationDocument
     */
    static async createUserDocument(input: CreateUserDocumentInput) {
        return prisma.conversationDocument.create({
            data: {
                conversationId: input.conversationId,
                messageId: input.messageId,
                uploadedById: input.uploadedById,
                source: "user",
                fileName: input.fileName,
                fileType: input.fileType,
                fileSize: input.fileSize,
                fileUrl: input.fileUrl,
                label: input.label || null,
            },
        });
    }

    /**
     * Index a Coridor-generated document (quittance, bail, EDL, etc.)
     * For future use — not wired yet.
     */
    static async createCoridorDocument(input: CreateCoridorDocumentInput) {
        return prisma.conversationDocument.create({
            data: {
                conversationId: input.conversationId,
                messageId: input.messageId || null,
                source: "coridor",
                fileName: input.fileName,
                fileType: input.fileType,
                fileSize: input.fileSize,
                fileUrl: input.fileUrl,
                coridorType: input.coridorType,
                coridorRef: input.coridorRef || null,
                label: input.label || null,
            },
        });
    }

    /**
     * List all documents for a conversation, newest first.
     * Optionally filter by category or search by fileName/label.
     */
    static async listDocuments(
        conversationId: string,
        options?: {
            filter?: "all" | "pdf" | "images" | "coridor";
            search?: string;
        }
    ) {
        const where: any = { conversationId };

        if (options?.filter && options.filter !== "all") {
            if (options.filter === "pdf") {
                where.fileType = { contains: "pdf" };
            } else if (options.filter === "images") {
                where.fileType = { startsWith: "image/" };
            } else if (options.filter === "coridor") {
                where.source = "coridor";
            }
        }

        if (options?.search) {
            where.OR = [
                { fileName: { contains: options.search, mode: "insensitive" } },
                { label: { contains: options.search, mode: "insensitive" } },
            ];
        }

        return prisma.conversationDocument.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: {
                uploadedBy: {
                    select: { id: true, name: true, image: true },
                },
                message: {
                    select: { id: true },
                },
            },
        });
    }

    /**
     * Get a single document by ID (for download auth check)
     */
    static async getDocumentById(documentId: string) {
        return prisma.conversationDocument.findUnique({
            where: { id: documentId },
            include: {
                conversation: {
                    include: {
                        users: { select: { id: true } },
                    },
                },
            },
        });
    }

    /**
     * Count documents for a conversation (for badge counter)
     */
    static async countDocuments(conversationId: string) {
        return prisma.conversationDocument.count({
            where: { conversationId },
        });
    }
}
