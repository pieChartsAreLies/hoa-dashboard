import { NextResponse } from "next/server";
import { getAllProperties } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const properties = getAllProperties();
  return NextResponse.json(properties);
}
