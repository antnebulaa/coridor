import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";
import {
  InvestmentSimulatorService,
  type InvestmentInput,
} from "@/services/InvestmentSimulatorService";

// ---------------------------------------------------------------------------
// POST — Save a simulation (auth required)
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();

    const { name, inputs } = body as {
      name?: string;
      inputs: InvestmentInput;
    };

    if (!inputs || typeof inputs !== "object") {
      return NextResponse.json(
        { error: "inputs requis" },
        { status: 400 },
      );
    }

    // Recalculate results server-side
    const results = InvestmentSimulatorService.simulate(inputs);

    const simulation = await prisma.investmentSimulation.create({
      data: {
        userId: currentUser.id,
        name: name || "Ma simulation",
        inputs: inputs as any,
        results: results as any,
      },
    });

    return NextResponse.json({ id: simulation.id });
  } catch (error) {
    console.error("[Simulator Save] POST Error:", error);
    const message = error instanceof Error ? error.message : "Erreur lors de la sauvegarde";
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// GET — List saved simulations (auth required)
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const simulations = await prisma.investmentSimulation.findMany({
      where: { userId: currentUser.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        inputs: true,
        results: true,
        createdAt: true,
        updatedAt: true,
        isPublic: true,
        shareToken: true,
      },
    });

    const withKPIs = simulations.map((sim) => {
      const results = sim.results as any;
      const { results: _results, ...rest } = sim;

      return {
        ...rest,
        kpis: results
          ? {
              grossYield: results.grossYield,
              netNetYield: results.netNetYield,
              monthlyCashflow: results.monthlyCashflow,
              tri: results.tri,
            }
          : null,
      };
    });

    return NextResponse.json(withKPIs);
  } catch (error) {
    console.error("[Simulator Save] GET Error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement" },
      { status: 500 },
    );
  }
}
