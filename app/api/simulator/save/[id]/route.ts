import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";
import {
  InvestmentSimulatorService,
  type InvestmentInput,
} from "@/services/InvestmentSimulatorService";

// ---------------------------------------------------------------------------
// GET — Get a saved simulation
// ---------------------------------------------------------------------------

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();

    const simulation = await prisma.investmentSimulation.findUnique({
      where: { id },
    });

    if (!simulation) {
      return NextResponse.json(
        { error: "Simulation introuvable" },
        { status: 404 },
      );
    }

    // Check access: owner or public
    if (
      simulation.userId !== currentUser?.id &&
      !simulation.isPublic
    ) {
      return NextResponse.json(
        { error: "Accès refusé" },
        { status: 403 },
      );
    }

    return NextResponse.json(simulation);
  } catch (error) {
    console.error("[Simulator] GET Error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH — Update a saved simulation
// ---------------------------------------------------------------------------

export async function PATCH(
  request: Request,
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

    const body = await request.json();
    const { name, inputs } = body as {
      name?: string;
      inputs?: InvestmentInput;
    };

    const updateData: any = {};

    if (name !== undefined) {
      updateData.name = name;
    }

    if (inputs) {
      const results = InvestmentSimulatorService.simulate(inputs);
      updateData.inputs = inputs;
      updateData.results = results;
    }

    const updated = await prisma.investmentSimulation.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[Simulator] PATCH Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE — Delete a saved simulation
// ---------------------------------------------------------------------------

export async function DELETE(
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

    await prisma.investmentSimulation.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Simulator] DELETE Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression" },
      { status: 500 },
    );
  }
}
