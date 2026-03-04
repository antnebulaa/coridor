import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";
import { DocumentService } from "@/services/DocumentService";

/**
 * GET /api/conversations/[conversationId]/documents
 * List documents for a conversation (with optional filter & search)
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ conversationId: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { conversationId } = await params;

        // Check user is participant
        const conversation = await prisma.conversation.findFirst({
            where: {
                id: conversationId,
                users: { some: { id: user.id } },
            },
        });

        if (!conversation) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const filter = searchParams.get("filter") as "all" | "pdf" | "images" | "coridor" | null;
        const search = searchParams.get("search") || undefined;

        const documents = await DocumentService.listDocuments(conversationId, {
            filter: filter || "all",
            search,
        });

        // Resolve signed URLs for documents stored in Supabase
        const resolvedDocuments = await Promise.all(
            documents.map(async (doc) => ({
                ...doc,
                fileUrl: await DocumentService.resolveFileUrl(doc),
            }))
        );

        return NextResponse.json(resolvedDocuments);
    } catch (error) {
        console.error("[DOCUMENTS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

/**
 * POST /api/conversations/[conversationId]/documents
 * Manually index a user document (for edge cases)
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ conversationId: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { conversationId } = await params;

        // Check user is participant
        const conversation = await prisma.conversation.findFirst({
            where: {
                id: conversationId,
                users: { some: { id: user.id } },
            },
        });

        if (!conversation) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const body = await request.json();
        const { messageId, fileName, fileType, fileSize, fileUrl, label } = body;

        if (!fileName || !fileType || !fileUrl) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

        const document = await DocumentService.createUserDocument({
            conversationId,
            messageId,
            uploadedById: user.id,
            fileName,
            fileType,
            fileSize: fileSize || 0,
            fileUrl,
            label,
        });

        return NextResponse.json(document);
    } catch (error) {
        console.error("[DOCUMENTS_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
