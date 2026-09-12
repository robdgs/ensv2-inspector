import { NextRequest, NextResponse } from "next/server";
import { inspectEns } from "@/src/ens/inspect";

// Inspection results must always come from the current ENSv2 execution path.
// Do not let Next.js or an intermediary cache an older trace while debugging.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name") ?? "";
  const result = await inspectEns(name);

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
