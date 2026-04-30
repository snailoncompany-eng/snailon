import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export const revalidate = 60;

export async function GET() {
  try {
    const supabase = createServiceClient();
    const { count, error } = await supabase.from("waitlist").select("*", { count: "exact", head: true });
    if (error) throw error;
    return NextResponse.json({ count: count ?? 0 });
  } catch (err) {
    console.error("Count error:", err);
    return NextResponse.json({ count: 0 });
  }
}
