import { NextRequest, NextResponse } from "next/server";
import { fetchMushroomObservations } from "@/lib/inaturalist";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const params: Record<string, number> = {};

    if (searchParams.has("taxonId")) {
      params.taxonId = Number(searchParams.get("taxonId"));
    }
    if (searchParams.has("perPage")) {
      params.perPage = Number(searchParams.get("perPage"));
    }
    if (searchParams.has("page")) {
      params.page = Number(searchParams.get("page"));
    }

    const data = await fetchMushroomObservations(params);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching observations:", error);
    return NextResponse.json(
      { error: "Failed to fetch observations" },
      { status: 500 }
    );
  }
}
