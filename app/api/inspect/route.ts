import { NextRequest, NextResponse } from "next/server";
import { inspectEns } from "@/src/ens/inspect";
import { saveResolutionSnapshot } from "@/src/arkiv/history";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name") ?? "";
  const result = await inspectEns(name);
  const historyWrite = await saveResolutionSnapshot(result);

  return NextResponse.json({ ...result, historyWrite }, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
