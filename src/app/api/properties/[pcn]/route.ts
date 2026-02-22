import { NextResponse } from "next/server";
import { getPropertyByPcn, getSaleHistory } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ pcn: string }> }
) {
  const { pcn } = await params;
  const property = getPropertyByPcn(pcn);
  if (!property) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const saleHistory = getSaleHistory(pcn);
  return NextResponse.json({ property, saleHistory });
}
