import { NextResponse } from "next/server";
import { cached } from "@/lib/serverCache";

// Throwaway route for verifying the server cache works on our host
export const dynamic = "force-dynamic";

export async function GET() {
  const cachedAt = await cached(["cache-check"], 300, async () => Date.now());
  return NextResponse.json({ cachedAt, now: Date.now() });
}
