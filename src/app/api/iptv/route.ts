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
  is247Live?: boolean;
}

const CHANNELS: ChannelConfig[] = [
  { id: "c1", name: "Jamuna TV", category: "জাতীয় সংবাদ", channelId: "UCN6sm8iHiPd0cnoUardDAnw", defaultVideoId: "4Wpv0HhFU1M", color: "bg-blue-600", text: "text-white", is247Live: true },
  { id: "c2", name: "Somoy TV", category: "ব্রেকিং নিউজ", channelId: "UCxHoBXkY88Tb8z1Ssj6CWsQ", defaultVideoId: "i8VSQO6TlFc", color: "bg-orange-600", text: "text-white", is247Live: true },
  { id: "c3", name: "Channel 24", category: "সংবাদ ২৪", channelId: "UCHLqIOMPk20w-6cFgkA90jw", defaultVideoId: "LVPgC7LQOw0", color: "bg-emerald-600", text: "text-white", is247Live: true },
  { id: "c4", name: "News24", category: "ব্রেকিং নিউজ", channelId: "UCb2O5Uo4a26CdTE7_2QA-jA", defaultVideoId: "oCslIqfoOZw", color: "bg-red-700", text: "text-white", is247Live: true },
  { id: "c5", name: "Ekattor TV", category: "জাতীয়", channelId: "UCtqvtAVmad5zywaziN6CbfA", defaultVideoId: "9L9ymmaPIS0", color: "bg-green-700", text: "text-white", is247Live: true },
  { id: "c6", name: "Independent TV", category: "বাংলাদেশ", channelId: "UCATUkaOHwO9EP_W87zCiPbA", defaultVideoId: "qREvoxxG6Nc", color: "bg-slate-800", text: "text-white", is247Live: true },
  { id: "c7", name: "RTV News", category: "জাতীয় সংবাদ", channelId: "UCR0hSGudjeZfnGL3uodU9Sw", defaultVideoId: "PtztZQi5hCg", color: "bg-red-600", text: "text-white", is247Live: true },
  { id: "c8", name: "Banglavision", category: "সংবাদ ও খবর", channelId: "UCA4y9g_GRdNrZLH_u5LLSdw", defaultVideoId: "95oEnwrvJRs", color: "bg-sky-600", text: "text-white", is247Live: true },
  { id: "c9", name: "Desh TV", category: "খবর ও রাজনীতি", channelId: "UCmCCTsDl-eCKw91shC7ZmMw", defaultVideoId: "me25ctmn8H8", color: "bg-teal-700", text: "text-white", is247Live: true },
  { id: "c13", name: "DBC News", category: "জাতীয় সংবাদ", channelId: "UCUvXoiDEKI8VZJrr58g4VAw", defaultVideoId: "8Sf9HnkLFsY", color: "bg-purple-700", text: "text-white", is247Live: true },
  { id: "c14", name: "Channel i", category: "সংবাদ ও ফিচার", channelId: "UCsvBbEFpCTH23C4n_I2lx0A", defaultVideoId: "q8_1x51HjG8", color: "bg-emerald-700", text: "text-white", is247Live: false },
  { id: "c10", name: "Al Jazeera English", category: "আন্তর্জাতিক", channelId: "UCfiwzLy-8yKzIbsmZTzxDgw", defaultVideoId: "gCNeDWCI0vo", color: "bg-amber-600", text: "text-white", is247Live: true },
  { id: "c11", name: "DW News", category: "বিশ্ব সংবাদ", channelId: "UCbbS1GE942k3UVqpLklyhIA", defaultVideoId: "LuKwFajn37U", color: "bg-sky-700", text: "text-white", is247Live: true },
  { id: "c12", name: "Sky News", category: "আন্তর্জাতিক", channelId: "UCkFclpi8U9VJjfxLYoms7Aw", defaultVideoId: "YDvsBbKfLPA", color: "bg-rose-700", text: "text-white", is247Live: true }
];

let cache: { timestamp: number; data: any[] } | null = null;
const CACHE_TTL_MS = 3 * 60 * 1000;

async function resolveChannelMedia(ch: ChannelConfig): Promise<{ videoId: string; isLive: boolean }> {
  // 1. For 24/7 Live News Channels, always preserve 24/7 Live Stream!
  if (ch.is247Live) {
    return { videoId: ch.defaultVideoId, isLive: true };
  }

  // 2. For Non-24/7 Channels (like Channel i), dynamically fetch latest uploaded video from YouTube RSS
  try {
    const feed = await parser.parseURL(`https://www.youtube.com/feeds/videos.xml?channel_id=${ch.channelId}`);
    if (feed?.items?.[0]?.id) {
      const latestId = feed.items[0].id.replace("yt:video:", "");
      if (latestId) return { videoId: latestId, isLive: false };
    }
  } catch (e) {}

  // 3. Verified default backup
  return { videoId: ch.defaultVideoId, isLive: false };
}

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ channels: cache.data, cached: true });
  }

  const channelsWithMedia = await Promise.all(
    CHANNELS.map(async (ch) => {
      const { videoId, isLive } = await resolveChannelMedia(ch);
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
