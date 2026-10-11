import { NextResponse } from "next/server";
import { BORROWER_OPPORTUNITIES } from "@/lib/data";

/**
 * GET /api/opportunities
 *
 * Returns sanitized synthetic borrower opportunity listings.
 * Phase 3 endpoint supporting end-to-end integration and external consumers.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");
    const minBudgetStr = searchParams.get("minBudget");

    let items = [...BORROWER_OPPORTUNITIES];

    if (statusFilter) {
      items = items.filter((opp) => opp.fundingStatus === statusFilter);
    }

    if (minBudgetStr) {
      const minBudget = parseFloat(minBudgetStr);
      if (Number.isFinite(minBudget)) {
        items = items.filter((opp) => minBudget >= opp.minTicket);
      }
    }

    return NextResponse.json({
      success: true,
      count: items.length,
      total: BORROWER_OPPORTUNITIES.length,
      opportunities: items,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
