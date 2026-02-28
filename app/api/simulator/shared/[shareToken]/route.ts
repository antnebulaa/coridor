import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";

// ---------------------------------------------------------------------------
// GET — Get a shared simulation (public, no auth)
// ---------------------------------------------------------------------------

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shareToken: string }> },
) {
  try {
    const { shareToken } = await params;

    const simulation = await prisma.investmentSimulation.findUnique({
      where: { shareToken },
    });

    if (!simulation || !simulation.isPublic) {
      return NextResponse.json(
        { error: "Simulation introuvable ou non partagée" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      name: simulation.name,
      inputs: simulation.inputs,
      results: simulation.results,
      createdAt: simulation.createdAt,
    });
  } catch (error) {
    console.error("[Simulator Shared] GET Error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement" },
      { status: 500 },
    );
  }
}
