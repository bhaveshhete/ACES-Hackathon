import { NextRequest, NextResponse } from "next/server";
import { HostedHuggingFaceModelAdapter } from "@/lib/model-adapter";
import { ApplicantProfile } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { borrowerId, applicantProfile } = body as {
      borrowerId?: string;
      applicantProfile?: ApplicantProfile;
    };

    if (!borrowerId || typeof borrowerId !== "string") {
      return NextResponse.json(
        { error: "borrowerId string is required in request body" },
        { status: 400 }
      );
    }

    const adapter = new HostedHuggingFaceModelAdapter();
    const result = await adapter.predict(borrowerId, applicantProfile);

    const httpStatus =
      result.status === "model"
        ? 200
        : result.status === "insufficient_input"
        ? 422
        : 503;

    return NextResponse.json(result, { status: httpStatus });
  } catch (err: unknown) {
    const errMsg = (err as Error)?.message || String(err);
    return NextResponse.json(
      {
        error: "Internal server error during prediction processing",
        details: errMsg,
      },
      { status: 500 }
    );
  }
}
