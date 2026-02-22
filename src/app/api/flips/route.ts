import { NextResponse } from "next/server";
import { getFlips } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const flips = getFlips();
  return NextResponse.json(flips);
}
