import { NextRequest, NextResponse } from "next/server";
import { getResolutionHistory } from "@/src/arkiv/history";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name") ?? "";
  if (!name.trim()) {
    return NextResponse.json({ history: [] });
  }

  try {
    const history = await getResolutionHistory(name);
    return NextResponse.json(
      { history },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        history: [],
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
