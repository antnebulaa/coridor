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
    const locale = searchParams.get('locale') || 'fr'; // Default to fr if missing

    // Dynamic Redirect URI based on Host Header (supports localhost & IP)
    const host = request.headers.get('host');
    const protocol = host?.includes('localhost') ? 'http' : 'http'; // Default to http for local/IP dev

    // FORCE usage of Host header to match user's browser/whitelist
    // ignoring NEXTAUTH_URL which might be set to localhost
    const origin = `${protocol}://${host}`;

    // 1. Destination Path (where we want the user to end up)
    let returnPath = `/${locale}/account/tenant-profile`;
    if (mode === 'landlord') {
        returnPath = `/${locale}/dashboard/finances`;
    }

    // 2. Fixed Redirect URI (The Bouncer)
    // This must match exactly what is in Powens Console
    // We still use dynamic origin for localhost/IP support, but the PATH is fixed.
    const redirectPath = '/api/powens/callback';
    const redirectUri = `${origin}${redirectPath}`;

    // 3. State Construction
    // JSON encode the state to pass data through
    const stateData = {
        userId: currentUser.id,
        path: returnPath
    };
    const state = encodeURIComponent(JSON.stringify(stateData));

    console.log("---------------------------------------------------");
    console.log("POWENS INIT: Redirect URI (Fixed):", redirectUri);
    console.log("POWENS INIT: Return Path (Dynamic):", returnPath);
    console.log("---------------------------------------------------");

    // Construct Webview URL
    const webviewUrl = `https://webview.powens.com/connect?domain=${domain}&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

    return NextResponse.json({ link: webviewUrl });
}
