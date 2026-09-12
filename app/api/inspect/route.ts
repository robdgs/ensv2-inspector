import { NextRequest, NextResponse } from "next/server";
import { inspectEns } from "@/src/ens/inspect";

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name") ?? "";
  const result = await inspectEns(name);
  return NextResponse.json(result);
}
