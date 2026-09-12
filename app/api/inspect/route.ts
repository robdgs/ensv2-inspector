import { NextRequest, NextResponse } from "next/server";
import { inspectEns } from "@/src/ens/inspect";
import { saveResolutionSnapshot } from "@/src/arkiv/history";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name") ?? "";

  if (!name.trim()) {
    return NextResponse.json(
      { error: "Missing ENS name" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    // ENSv2 remains the source of truth.
    const result = await inspectEns(name);

    // Arkiv is best-effort. It must never make the inspection endpoint fail.
    let historyWrite: {
      saved: boolean;
      key?: string;
      reason?: string;
    } = {
      saved: false,
      reason: "Arkiv snapshot not attempted",
    };

    try {
      historyWrite = await saveResolutionSnapshot(result);
    } catch (error) {
      console.error("[Arkiv] history write failed", error);
      historyWrite = {
        saved: false,
        reason: error instanceof Error ? error.message : String(error),
      };
    }

    return NextResponse.json(
      { ...result, historyWrite },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  } catch (error) {
    console.error("[ENS Inspector] inspection failed", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
