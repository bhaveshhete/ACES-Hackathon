import { NextRequest, NextResponse } from "next/server";
import { HostedHuggingFaceModelAdapter } from "@/lib/model-adapter";
import { ApplicantProfile } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = body?.items as Array<{
      borrowerId: string;
      applicantProfile?: ApplicantProfile;
    }>;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "items array is required in request body" },
        { status: 400 }
      );
    }

    // Limit batch size to protect against abuse
    if (items.length > 25) {
      return NextResponse.json(
        { error: "Batch size cannot exceed 25 items" },
        { status: 400 }
      );
    }

    const adapter = new HostedHuggingFaceModelAdapter();
    const results = await adapter.predictBatch(
      items.map((i) => ({ borrowerId: i.borrowerId, profile: i.applicantProfile }))
    );

    return NextResponse.json({
      results,
      count: results.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errMsg = (err as Error)?.message || String(err);
    return NextResponse.json(
      {
        error: "Internal server error during batch prediction processing",
        details: errMsg,
      },
      { status: 500 }
    );
  }
}
