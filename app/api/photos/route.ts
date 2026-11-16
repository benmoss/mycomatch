import { NextRequest, NextResponse } from "next/server";
import { fetchMushroomObservations } from "@/lib/inaturalist";
import { collectPhotos } from "@/lib/photos";
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

    // One request covers most species; random order varies photos between quizzes
    const bounds = getRegionBounds(searchParams.get("region") || undefined);
    const observations = await collectPhotos(taxonIds, async (ids) => {
      const data = await fetchMushroomObservations({
        taxonId: ids.join(","),
        perPage: 200,
        orderBy: "random",
        ...bounds,
      });
      return data.results;
    });

    return NextResponse.json({ observations });
  } catch (error) {
    console.error("Error fetching photos:", error);
    return NextResponse.json(
      { error: "Failed to fetch photos" },
      { status: 500 }
    );
  }
}
