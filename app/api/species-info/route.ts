import { NextRequest, NextResponse } from "next/server";
import { cached } from "@/lib/serverCache";
import { fetchSpeciesSummary } from "@/lib/wikipedia";

const SPECIES_INFO_TTL_SECONDS = 86400;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const scientificName = searchParams.get("name");

    if (!scientificName) {
      return NextResponse.json(
        { error: "Scientific name is required" },
        { status: 400 }
      );
    }

    // Failed lookups throw, so only real answers (including "no page") are cached
    const summary = await cached(["species-info", scientificName], SPECIES_INFO_TTL_SECONDS, () =>
      fetchSpeciesSummary(scientificName)
    );

    if (!summary) {
      return NextResponse.json(
        { error: "Species information not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error fetching species info:", error);
    return NextResponse.json(
      { error: "Failed to fetch species information" },
      { status: 502 }
    );
  }
}
