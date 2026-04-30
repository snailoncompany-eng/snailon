import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export const revalidate = 30;

export async function GET() {
  try {
    const supabase = createServiceClient();
    const { count, error } = await supabase.from("waitlist")
      .select("*", { count: "exact", head: true })
      .eq("founding_store", true);
    if (error) throw error;
    return NextResponse.json({ count: count ?? 0 });
  } catch (err) {
    console.error("Founding count error:", err);
    return NextResponse.json({ count: 0 });
  }
}
