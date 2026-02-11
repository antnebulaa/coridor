import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // 1. Handle Errors
    if (error) {
        console.error("Powens Callback Error:", error);
        return NextResponse.redirect(new URL('/?error=powens_auth_failed', request.url));
    }

    if (!state) {
        console.error("Powens Callback Missing State");
        return NextResponse.redirect(new URL('/?error=missing_state', request.url));
    }

    // 2. Decode State to get Destination
    // State format: "userId|returnPath" or JSON
    let returnPath = '/account/tenant-profile'; // Safe default
    try {
        // We'll use a simple pipe delimiter for robustness: userId|base64(path)
        // Or just JSON if it's url-safe. Let's try JSON first, if it fails, fallback.
        // Actually, let's keep it simple: "userId_SEPARATOR_base64Path"

        // Let's decode what we sent in init/route.ts
        const decodedState = JSON.parse(decodeURIComponent(state));
        if (decodedState.path) {
            returnPath = decodedState.path;
        }
    } catch (e) {
        console.error("Failed to parse state:", state, e);
        // Fallback: If it's just a userId (legacy), go to default
    }

    // 3. Construct Final URL
    // Append code so the client can trigger the analysis
    const finalUrl = new URL(returnPath, request.url);
    if (code) {
        finalUrl.searchParams.set('code', code);
    }

    // Preserve other params if needed? usually no.

    return NextResponse.redirect(finalUrl);
}
