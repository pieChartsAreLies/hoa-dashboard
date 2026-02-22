import { NextResponse } from "next/server";
import { getCommunityStats, getPropertiesByBedrooms } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const stats = getCommunityStats();
  const byBedrooms = getPropertiesByBedrooms();
  return NextResponse.json({ stats, byBedrooms });
}
