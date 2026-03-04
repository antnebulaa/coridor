import { NextResponse } from "next/server";
import crypto from "crypto";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";
import { supabaseAdmin } from "@/lib/supabaseServer";

const BUCKET_NAME = "conversation-documents";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
    "text/plain",
];

function sanitizeFileName(name: string): string {
    return name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // strip accents
        .replace(/[^a-zA-Z0-9._-]/g, "-") // replace special chars
        .replace(/-+/g, "-") // collapse dashes
        .substring(0, 100); // limit length
}

/**
 * POST /api/conversations/[conversationId]/upload
 * Accepts multipart/form-data with a single file.
 * Uploads to Supabase Storage and returns metadata + signed URL.
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

        if (!supabaseAdmin) {
            return new NextResponse("Storage not configured", { status: 503 });
        }

        const { conversationId } = await params;

        // Verify user is participant
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            select: { users: { select: { id: true } } },
        });

        if (!conversation) {
            return new NextResponse("Conversation not found", { status: 404 });
        }

        const isParticipant = conversation.users.some((u) => u.id === user.id);
        if (!isParticipant) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        // Parse multipart form data
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return new NextResponse("No file provided", { status: 400 });
        }

        // Validate MIME type
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: "Type de fichier non autorisé" },
                { status: 400 }
            );
        }

        // Validate size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: "Fichier trop volumineux (max 50 Mo)" },
                { status: 400 }
            );
        }

        // Generate storage path
        const sanitized = sanitizeFileName(file.name);
        const storagePath = `${conversationId}/${crypto.randomUUID()}-${sanitized}`;

        // Upload to Supabase Storage
        const buffer = Buffer.from(await file.arrayBuffer());
        const { error: uploadError } = await supabaseAdmin.storage
            .from(BUCKET_NAME)
            .upload(storagePath, buffer, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            console.error("[Upload] Supabase Storage error:", uploadError);
            return NextResponse.json(
                { error: "Échec de l'upload" },
                { status: 500 }
            );
        }

        // Generate signed URL (1 hour)
        const { data: signedData, error: signedError } = await supabaseAdmin.storage
            .from(BUCKET_NAME)
            .createSignedUrl(storagePath, 3600);

        if (signedError || !signedData) {
            console.error("[Upload] Signed URL error:", signedError);
            return NextResponse.json(
                { error: "Fichier uploadé mais URL non générée" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            storagePath,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            signedUrl: signedData.signedUrl,
        });
    } catch (error) {
        console.error("[CONVERSATION_UPLOAD]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
