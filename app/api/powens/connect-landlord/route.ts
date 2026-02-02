import { NextResponse } from "next/server";
import { getPowensToken } from "@/app/lib/powens";
import prisma from "@/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";

export async function POST(request: Request) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { code, connectionId } = body;

    if (!code) {
        return NextResponse.json({ error: "Missing code" }, { status: 400 });
    }

    try {
        const origin = request.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const redirectUri = `${origin}/dashboard/finances`;

        // 1. Exchange code for token
        const tokenData = await getPowensToken(code, redirectUri);

        if (!tokenData.access_token) {
            throw new Error("No access token received");
        }

        // 2. Persist Connection
        // If connectionId is provided (from widget), we can verify it.
        // But for now, just store the token.

        // Check if connection already exists for this user?
        // We'll create a new one or update active one?
        // For MVP: Upsert based on Connection ID from token? 
        // Powens token response might give `connection_id` or `user_id` scope.
        // Actually, tokenData usually contains `connection_id` if flow was for specific connection?
        // Let's assume one main connection for now or just create new.

        const connection = await prisma.bankConnection.create({
            data: {
                userId: currentUser.id,
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token,
                tokenExpiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
                connectionId: connectionId ? String(connectionId) : null
            }
        });

        return NextResponse.json(connection);

    } catch (error: any) {
        console.error("Powens Connect Error:", error);
        return NextResponse.json({ error: "Connection failed" }, { status: 500 });
    }
}
