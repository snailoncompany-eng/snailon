import { NextResponse } from "next/server";
import { listStorePlatforms, listCarrierPlatforms } from "@/lib/integrations/registry";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    stores: listStorePlatforms(),
    carriers: listCarrierPlatforms(),
  });
}
