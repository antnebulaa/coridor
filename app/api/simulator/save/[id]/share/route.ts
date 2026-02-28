import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";
import { randomBytes } from "crypto";

// ---------------------------------------------------------------------------
// POST — Generate a share link for a simulation
// ---------------------------------------------------------------------------

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const simulation = await prisma.investmentSimulation.findUnique({
      where: { id },
    });

    if (!simulation || simulation.userId !== currentUser.id) {
      return NextResponse.json(
        { error: "Simulation introuvable" },
        { status: 404 },
      );
    }

    // Generate or reuse share token
    const shareToken =
      simulation.shareToken || randomBytes(16).toString("hex");

    const updated = await prisma.investmentSimulation.update({
      where: { id },
      data: {
        isPublic: true,
        shareToken,
      },
    });

    return NextResponse.json({
      shareToken: updated.shareToken,
      shareUrl: `/simulateur/shared/${updated.shareToken}`,
    });
  } catch (error) {
    console.error("[Simulator Share] Error:", error);
    return NextResponse.json(
      { error: "Erreur lors du partage" },
      { status: 500 },
    );
  }
}
