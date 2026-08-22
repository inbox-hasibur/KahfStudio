import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ChannelConfig {
  id: string;
  name: string;
  category: string;
  videoId: string;
  color: string;
  text: string;
  source: string;
  isLive: boolean;
}

const CHANNELS: ChannelConfig[] = [
  { id: "c1", name: "Jamuna TV", category: "জাতীয় সংবাদ", videoId: "4Wpv0HhFU1M", color: "bg-blue-600", text: "text-white", source: "24/7 লাইভ এইচডি", isLive: true },
  { id: "c2", name: "Somoy TV", category: "ব্রেকিং নিউজ", videoId: "R7ujSKpZOK0", color: "bg-orange-600", text: "text-white", source: "24/7 লাইভ এইচডি", isLive: true },
  { id: "c3", name: "Channel 24", category: "সংবাদ ২৪", videoId: "hjQluVY6EzQ", color: "bg-emerald-600", text: "text-white", source: "24/7 লাইভ এইচডি", isLive: true },
  { id: "c4", name: "News24", category: "ব্রেকিং নিউজ", videoId: "oCslIqfoOZw", color: "bg-red-700", text: "text-white", source: "24/7 লাইভ এইচডি", isLive: true },
  { id: "c5", name: "Ekattor TV", category: "জাতীয়", videoId: "9L9ymmaPIS0", color: "bg-green-700", text: "text-white", source: "24/7 লাইভ এইচডি", isLive: true },
  { id: "c6", name: "Independent TV", category: "বাংলাদেশ", videoId: "gzX8jUxxflA", color: "bg-slate-800", text: "text-white", source: "24/7 লাইভ", isLive: true },
  { id: "c7", name: "RTV News", category: "জাতীয় সংবাদ", videoId: "PtztZQi5hCg", color: "bg-red-600", text: "text-white", source: "24/7 লাইভ", isLive: true },
  { id: "c8", name: "Banglavision", category: "সংবাদ ও খবর", videoId: "95oEnwrvJRs", color: "bg-sky-600", text: "text-white", source: "24/7 লাইভ", isLive: true },
  { id: "c9", name: "Desh TV", category: "খবর ও রাজনীতি", videoId: "1pZ7EGS2bXQ", color: "bg-teal-700", text: "text-white", source: "24/7 লাইভ", isLive: true },
  { id: "c13", name: "DBC News", category: "জাতীয় সংবাদ", videoId: "8Sf9HnkLFsY", color: "bg-purple-700", text: "text-white", source: "24/7 লাইভ", isLive: true },
  { id: "c14", name: "Channel i", category: "সংবাদ ও ফিচার", videoId: "q8_1x51HjG8", color: "bg-emerald-700", text: "text-white", source: "24/7 লাইভ", isLive: true },
  { id: "c10", name: "Al Jazeera English", category: "আন্তর্জাতিক", videoId: "gCNeDWCI0vo", color: "bg-amber-600", text: "text-white", source: "Global Live HD", isLive: true },
  { id: "c11", name: "DW News", category: "বিশ্ব সংবাদ", videoId: "LuKwFajn37U", color: "bg-sky-700", text: "text-white", source: "Global Live HD", isLive: true },
  { id: "c12", name: "Sky News", category: "আন্তর্জাতিক", videoId: "YDvsBbKfLPA", color: "bg-rose-700", text: "text-white", source: "Global Live HD", isLive: true }
];

export async function GET() {
  const channelsWithMedia = CHANNELS.map((ch) => ({
    ...ch,
    streamUrl: `https://www.youtube.com/embed/${ch.videoId}?autoplay=1&playsinline=1&rel=0&modestbranding=1&enablejsapi=1`
  }));

  return NextResponse.json({ channels: channelsWithMedia, cached: true });
}
