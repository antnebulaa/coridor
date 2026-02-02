import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";

export async function GET(request: Request) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = process.env.POWENS_CLIENT_ID;
    const domain = process.env.POWENS_DOMAIN || 'coridor-sandbox.biapi.pro';

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');

    // Construct the redirect URI (must match dashboard)
    // We'll use the origin from the request to support localhost/production
    const origin = request.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000';

    let redirectPath = '/account/tenant-profile';
    if (mode === 'landlord') {
        redirectPath = '/dashboard/finances';
    }

    const redirectUri = `${origin}${redirectPath}`;

    // Construct Webview URL
    // https://webview.powens.com/connect?domain=...&client_id=...&redirect_uri=...&state=...
    const webviewUrl = `https://webview.powens.com/connect?domain=${domain}&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${currentUser.id}`;

    return NextResponse.json({ link: webviewUrl });
}
