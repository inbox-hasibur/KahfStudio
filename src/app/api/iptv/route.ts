import { NextResponse } from "next/server";
import Parser from "rss-parser";

export const dynamic = "force-dynamic";
const parser = new Parser();

interface ChannelConfig {
  id: string;
  name: string;
  category: string;
  channelId: string;
  defaultVideoId: string;
  color: string;
  text: string;
}

const CHANNELS: ChannelConfig[] = [
  { id: "c1", name: "Jamuna TV", category: "জাতীয় সংবাদ", channelId: "UCN6sm8iHiPd0cnoUardDAnw", defaultVideoId: "4Wpv0HhFU1M", color: "bg-blue-600", text: "text-white" },
  { id: "c2", name: "Somoy TV", category: "ব্রেকিং নিউজ", channelId: "UCxHoBXkY88Tb8z1Ssj6CWsQ", defaultVideoId: "R7ujSKpZOK0", color: "bg-orange-600", text: "text-white" },
  { id: "c3", name: "Channel 24", category: "সংবাদ ২৪", channelId: "UCHLqIOMPk20w-6cFgkA90jw", defaultVideoId: "hjQluVY6EzQ", color: "bg-emerald-600", text: "text-white" },
  { id: "c4", name: "News24", category: "ব্রেকিং নিউজ", channelId: "UCb2O5Uo4a26CdTE7_2QA-jA", defaultVideoId: "oCslIqfoOZw", color: "bg-red-700", text: "text-white" },
  { id: "c5", name: "Ekattor TV", category: "জাতীয়", channelId: "UCtqvtAVmad5zywaziN6CbfA", defaultVideoId: "9L9ymmaPIS0", color: "bg-green-700", text: "text-white" },
  { id: "c6", name: "Independent TV", category: "বাংলাদেশ", channelId: "UCATUkaOHwO9EP_W87zCiPbA", defaultVideoId: "gzX8jUxxflA", color: "bg-slate-800", text: "text-white" },
  { id: "c7", name: "RTV News", category: "জাতীয় সংবাদ", channelId: "UCR0hSGudjeZfnGL3uodU9Sw", defaultVideoId: "PtztZQi5hCg", color: "bg-red-600", text: "text-white" },
  { id: "c8", name: "Banglavision", category: "সংবাদ ও খবর", channelId: "UCA4y9g_GRdNrZLH_u5LLSdw", defaultVideoId: "95oEnwrvJRs", color: "bg-sky-600", text: "text-white" },
  { id: "c9", name: "Desh TV", category: "খবর ও রাজনীতি", channelId: "UCmCCTsDl-eCKw91shC7ZmMw", defaultVideoId: "1pZ7EGS2bXQ", color: "bg-teal-700", text: "text-white" },
  { id: "c13", name: "DBC News", category: "জাতীয় সংবাদ", channelId: "UCUvXoiDEKI8VZJrr58g4VAw", defaultVideoId: "8Sf9HnkLFsY", color: "bg-purple-700", text: "text-white" },
  { id: "c14", name: "Channel i", category: "সংবাদ ও ফিচার", channelId: "UCsvBbEFpCTH23C4n_I2lx0A", defaultVideoId: "q8_1x51HjG8", color: "bg-emerald-700", text: "text-white" },
  { id: "c10", name: "Al Jazeera English", category: "আন্তর্জাতিক", channelId: "UCfiwzLy-8yKzIbsmZTzxDgw", defaultVideoId: "gCNeDWCI0vo", color: "bg-amber-600", text: "text-white" },
  { id: "c11", name: "DW News", category: "বিশ্ব সংবাদ", channelId: "UCbbS1GE942k3UVqpLklyhIA", defaultVideoId: "LuKwFajn37U", color: "bg-sky-700", text: "text-white" },
  { id: "c12", name: "Sky News", category: "আন্তর্জাতিক", channelId: "UCkFclpi8U9VJjfxLYoms7Aw", defaultVideoId: "YDvsBbKfLPA", color: "bg-rose-700", text: "text-white" }
];

let cache: { timestamp: number; data: any[] } | null = null;
const CACHE_TTL_MS = 3 * 60 * 1000;

async function resolveChannelMedia(channelId: string, defaultId: string): Promise<{ videoId: string; isLive: boolean }> {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9"
  };

  // 1. Check YouTube Live stream endpoint
  try {
    const resLive = await fetch(`https://www.youtube.com/channel/${channelId}/live`, { headers, redirect: "follow", next: { revalidate: 180 } });
    if (resLive.url && resLive.url.includes("watch?v=")) {
      const match = resLive.url.match(/watch\?v=([a-zA-Z0-9_-]{11})/);
      if (match && match[1]) return { videoId: match[1], isLive: true };
    }

    if (resLive.ok) {
      const html = await resLive.text();
      const canonicalMatch = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})">/);
      if (canonicalMatch && canonicalMatch[1]) return { videoId: canonicalMatch[1], isLive: true };
    }
  } catch (e) {}

  // 2. Fallback to 100% Real-time Latest Video via YouTube RSS Feed
  try {
    const feed = await parser.parseURL(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
    if (feed?.items?.[0]?.id) {
      const latestId = feed.items[0].id.replace("yt:video:", "");
      if (latestId) return { videoId: latestId, isLive: false };
    }
  } catch (e) {}

  // 3. Verified default backup
  return { videoId: defaultId, isLive: false };
}

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ channels: cache.data, cached: true });
  }

  const channelsWithMedia = await Promise.all(
    CHANNELS.map(async (ch) => {
      const { videoId, isLive } = await resolveChannelMedia(ch.channelId, ch.defaultVideoId);
      return {
        id: ch.id,
        name: ch.name,
        category: ch.category,
        videoId: videoId,
        isLive: isLive,
        streamUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0&modestbranding=1&enablejsapi=1`,
        color: ch.color,
        text: ch.text,
        source: isLive ? "24/7 লাইভ এইচডি" : "সর্বশেষ সংবাদ ভিডিও"
      };
    })
  );

  cache = { timestamp: now, data: channelsWithMedia };
  return NextResponse.json({ channels: channelsWithMedia, cached: false });
}
