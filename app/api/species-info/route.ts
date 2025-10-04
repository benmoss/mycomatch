import { NextRequest, NextResponse } from "next/server";

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

    // Fetch from Wikipedia API
    const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(scientificName)}`;
    const response = await fetch(wikiUrl);

    if (!response.ok) {
      return NextResponse.json(
        { error: "Species information not found" },
        { status: 404 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      title: data.title,
      extract: data.extract,
      thumbnail: data.thumbnail?.source,
      url: data.content_urls?.desktop?.page,
    });
  } catch (error) {
    console.error("Error fetching species info:", error);
    return NextResponse.json(
      { error: "Failed to fetch species information" },
      { status: 500 }
    );
  }
}
