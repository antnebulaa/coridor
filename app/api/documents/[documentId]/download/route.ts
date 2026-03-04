import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { DocumentService } from "@/services/DocumentService";

/**
 * GET /api/documents/[documentId]/download
 * Returns the file URL (auth: must be a conversation participant)
 */
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ documentId: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { documentId } = await params;

        const document = await DocumentService.getDocumentById(documentId);
        if (!document) {
            return new NextResponse("Not Found", { status: 404 });
        }

        // Check user is participant of the conversation
        const isParticipant = document.conversation.users.some(
            (u) => u.id === user.id
        );
        if (!isParticipant) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const url = await DocumentService.resolveFileUrl(document);
        return NextResponse.json({ url });
    } catch (error) {
        console.error("[DOCUMENT_DOWNLOAD]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
