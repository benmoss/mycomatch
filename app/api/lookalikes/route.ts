import { NextRequest, NextResponse } from "next/server";
import { fetchLookalikes } from "@/lib/lookalikes";

export async function GET(request: NextRequest) {
  try {
    const taxonId = Number(request.nextUrl.searchParams.get("taxonId"));

    if (!taxonId) {
      return NextResponse.json(
        { error: "taxonId is required" },
        { status: 400 }
      );
    }

    const lookalikes = await fetchLookalikes(taxonId);

    return NextResponse.json({ lookalikes });
  } catch (error) {
    console.error("Error fetching look-alikes:", error);
    return NextResponse.json(
      { error: "Failed to fetch look-alikes" },
      { status: 500 }
    );
  }
}
