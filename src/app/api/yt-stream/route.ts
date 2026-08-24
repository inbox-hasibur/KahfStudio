import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("v");
  const directUrl = searchParams.get("url");

  // If a direct stream URL (.m3u8 / .mp4) is provided
  if (directUrl) {
    return NextResponse.json({
      success: true,
      streamUrl: directUrl,
      type: directUrl.includes(".m3u8") ? "hls" : "mp4"
    });
  }

  if (!videoId) {
    return NextResponse.json({ 
      error: "Missing 'v' (YouTube Video ID) or 'url' parameter" 
    }, { status: 400 });
  }

  try {
    // 1. Fetch YouTube watch page HTML
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const res = await fetch(watchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });

    if (res.ok) {
      const html = await res.text();

      // Extract hlsManifestUrl if live
      const hlsMatch = html.match(/"hlsManifestUrl"\s*:\s*"([^"]+)"/);
      if (hlsMatch && hlsMatch[1]) {
        const hlsUrl = hlsMatch[1].replace(/\\u0026/g, "&");
        return NextResponse.json({
          success: true,
          isLive: true,
          streamUrl: hlsUrl,
          type: "hls"
        });
      }

      // Check ytInitialPlayerResponse
      const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
      if (playerResponseMatch && playerResponseMatch[1]) {
        try {
          const playerResponse = JSON.parse(playerResponseMatch[1]);
          const streamingData = playerResponse.streamingData;

          if (streamingData?.hlsManifestUrl) {
            return NextResponse.json({
              success: true,
              isLive: true,
              streamUrl: streamingData.hlsManifestUrl,
              type: "hls"
            });
          }

          const formats = streamingData?.formats || [];
          const bestFormat = formats.find((f: any) => f.url && f.mimeType?.includes("video/mp4"));
          if (bestFormat?.url) {
            return NextResponse.json({
              success: true,
              isLive: false,
              streamUrl: bestFormat.url,
              type: "mp4"
            });
          }
        } catch (err) {
          console.warn("[yt-stream] JSON parse warning:", err);
        }
      }
    }

    // Default HLS test stream fallback if live video is restricted by YouTube region/bot block
    return NextResponse.json({
      success: true,
      isLive: true,
      streamUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
      type: "hls",
      note: "Fallback active HLS stream provided for Halal Mode testing"
    });

  } catch (error: any) {
    console.error("[yt-stream] Error:", error);
    return NextResponse.json({
      success: true,
      streamUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
      type: "hls",
      note: "Fallback stream active"
    });
  }
}
