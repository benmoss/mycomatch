import { NextRequest, NextResponse } from "next/server";
import { fetchPool } from "@/lib/pool";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const region = searchParams.get("region") || undefined;
    const taxonId = searchParams.has("taxonId") ? Number(searchParams.get("taxonId")) : undefined;

    const species = await fetchPool(region, taxonId || undefined);

    return NextResponse.json({ species });
  } catch (error) {
    console.error("Error fetching species pool:", error);
    return NextResponse.json(
      { error: "Failed to fetch species pool" },
      { status: 500 }
    );
  }
}
