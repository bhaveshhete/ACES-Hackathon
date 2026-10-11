import { NextResponse } from "next/server";
import { HostedHuggingFaceModelAdapter } from "@/lib/model-adapter";

export const dynamic = "force-dynamic";

export async function GET() {
  const adapter = new HostedHuggingFaceModelAdapter();
  const status = await adapter.checkStatus();

  return NextResponse.json(status, {
    status:
      status.status === "available"
        ? 200
        : status.status === "invalid_response"
        ? 502
        : 503,
  });
}
