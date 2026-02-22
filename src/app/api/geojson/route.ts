import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  const geojsonPath = path.join(process.cwd(), "data", "parcels.geojson");
  const data = JSON.parse(readFileSync(geojsonPath, "utf-8"));
  return NextResponse.json(data);
}
