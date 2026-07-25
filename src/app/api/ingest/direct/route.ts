import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";

export async function POST(req: Request) {
  try {
    const { url, category } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    await inngest.send({
      name: "app/process-article",
      data: {
        url,
        title: "Manual Admin Ingestion",
        sourceId: "admin-direct",
        category: category || "General",
      },
    });

    return NextResponse.json({ success: true, message: "Processing started" });
  } catch (error: any) {
    console.error("Direct ingestion error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
