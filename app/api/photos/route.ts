import { NextRequest, NextResponse } from "next/server";
import { fetchMushroomObservations } from "@/lib/inaturalist";
import { onePerSpecies } from "@/lib/photos";
import { getRegionBounds } from "@/types/filters";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const taxonIds = (searchParams.get("taxonIds") || "")
      .split(",")
      .map(Number)
      .filter(Boolean);

    if (taxonIds.length === 0) {
      return NextResponse.json(
        { error: "taxonIds is required" },
        { status: 400 }
      );
    }

    // One request for every species in the quiz; random order varies photos between quizzes
    const data = await fetchMushroomObservations({
      taxonId: taxonIds.join(","),
      perPage: 200,
      orderBy: "random",
      ...getRegionBounds(searchParams.get("region") || undefined),
    });

    return NextResponse.json({ observations: onePerSpecies(data.results, taxonIds) });
  } catch (error) {
    console.error("Error fetching photos:", error);
    return NextResponse.json(
      { error: "Failed to fetch photos" },
      { status: 500 }
    );
  }
}
