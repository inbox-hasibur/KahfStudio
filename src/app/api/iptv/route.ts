import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ChannelConfig {
  id: string;
  name: string;
  category: string;
  handle: string;
  defaultVideoId: string;
  color: string;
  text: string;
  source: string;
}

const CHANNELS: ChannelConfig[] = [
  {
    id: "c1",
    name: "Jamuna TV",
    category: "জাতীয় সংবাদ",
    handle: "@JamunaTVbd",
    defaultVideoId: "4Wpv0HhFU1M",
    color: "bg-blue-600",
    text: "text-white",
    source: "24/7 লাইভ এইচডি"
  },
  {
    id: "c2",
    name: "Somoy TV",
    category: "ব্রেকিং নিউজ",
    handle: "@somoynews360",
    defaultVideoId: "R7ujSKpZOK0",
    color: "bg-orange-600",
    text: "text-white",
    source: "24/7 লাইভ এইচডি"
  },
  {
    id: "c3",
    name: "Channel 24",
    category: "সংবাদ ২৪",
    handle: "@channel24digital",
    defaultVideoId: "hjQluVY6EzQ",
    color: "bg-emerald-600",
    text: "text-white",
    source: "24/7 লাইভ এইচডি"
  },
  {
    id: "c4",
    name: "News24",
    category: "ব্রেকিং নিউজ",
    handle: "@NEWS24BD",
    defaultVideoId: "x_fL0yF1o68",
    color: "bg-red-700",
    text: "text-white",
    source: "24/7 লাইভ"
  },
  {
    id: "c5",
    name: "Ekattor TV",
    category: "জাতীয়",
    handle: "@EkattorTelevision",
    defaultVideoId: "9L9ymmaPIS0",
    color: "bg-green-700",
    text: "text-white",
    source: "24/7 লাইভ এইচডি"
  },
  {
    id: "c6",
    name: "Independent TV",
    category: "বাংলাদেশ",
    handle: "@IndependentTelevision",
    defaultVideoId: "gzX8jUxxflA",
    color: "bg-slate-800",
    text: "text-white",
    source: "24/7 লাইভ"
  },
  {
    id: "c7",
    name: "RTV News",
    category: "জাতীয় সংবাদ",
    handle: "@RtvNews",
    defaultVideoId: "DRKFTmYgPPk",
    color: "bg-red-600",
    text: "text-white",
    source: "24/7 লাইভ"
  },
  {
    id: "c8",
    name: "Banglavision",
    category: "সংবাদ ও খবর",
    handle: "@BanglavisionNews",
    defaultVideoId: "95oEnwrvJRs",
    color: "bg-sky-600",
    text: "text-white",
    source: "24/7 লাইভ"
  },
  {
    id: "c9",
    name: "Desh TV",
    category: "খবর ও রাজনীতি",
    handle: "@DeshTVOfficial",
    defaultVideoId: "8cSFh_-AUxA",
    color: "bg-teal-700",
    text: "text-white",
    source: "24/7 লাইভ"
  },
  {
    id: "c13",
    name: "DBC News",
    category: "জাতীয় সংবাদ",
    handle: "@dbcnewsbd",
    defaultVideoId: "e2eA-y4d22w",
    color: "bg-purple-700",
    text: "text-white",
    source: "24/7 লাইভ"
  },
  {
    id: "c14",
    name: "Channel i",
    category: "সংবাদ ও ফিচার",
    handle: "@ChanneliNews",
    defaultVideoId: "q8_1x51HjG8",
    color: "bg-emerald-700",
    text: "text-white",
    source: "24/7 লাইভ"
  },
  {
    id: "c10",
    name: "Al Jazeera English",
    category: "আন্তর্জাতিক",
    handle: "@aljazeeraenglish",
    defaultVideoId: "gCNeDWCI0vo",
    color: "bg-amber-600",
    text: "text-white",
    source: "Global Live HD"
  },
  {
    id: "c11",
    name: "DW News",
    category: "বিশ্ব সংবাদ",
    handle: "@dwnews",
    defaultVideoId: "LuKwFajn37U",
    color: "bg-sky-700",
    text: "text-white",
    source: "Global Live HD"
  },
  {
    id: "c12",
    name: "Sky News",
    category: "আন্তর্জাতিক",
    handle: "@SkyNews",
    defaultVideoId: "YDvsBbKfLPA",
    color: "bg-rose-700",
    text: "text-white",
    source: "Global Live HD"
  }
];

// In-memory cache for live IDs (3 minute TTL)
let cache: { timestamp: number; data: any[] } | null = null;
const CACHE_TTL_MS = 3 * 60 * 1000;

async function fetchLiveVideoId(handle: string, defaultId: string): Promise<string> {
  try {
    const url = `https://www.youtube.com/${handle}/live`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
      },
      redirect: "follow",
      next: { revalidate: 180 }
    });

    if (res.url && res.url.includes("watch?v=")) {
      const urlMatch = res.url.match(/watch\?v=([a-zA-Z0-9_-]{11})/);
      if (urlMatch && urlMatch[1]) {
        return urlMatch[1];
      }
    }

    if (!res.ok) return defaultId;

    const html = await res.text();
    
    // 1. Check canonical URL first (most accurate YouTube live redirect)
    const canonicalMatch = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})">/);
    if (canonicalMatch && canonicalMatch[1]) {
      return canonicalMatch[1];
    }

    // 2. Check explicitly for videoId paired with isLive / isLiveContent
    const liveMatch = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"(?:[^{}]*?)"isLive":(?:true|1)/);
    if (liveMatch && liveMatch[1]) {
      return liveMatch[1];
    }

    // 3. Fallback to default verified live ID if live detection is ambiguous
    return defaultId;
  } catch {
    return defaultId;
  }
}

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ channels: cache.data, cached: true });
  }

  const channelsWithLive = await Promise.all(
    CHANNELS.map(async (ch) => {
      const videoId = await fetchLiveVideoId(ch.handle, ch.defaultVideoId);
      return {
        id: ch.id,
        name: ch.name,
        category: ch.category,
        videoId: videoId,
        streamUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0&modestbranding=1&enablejsapi=1`,
        color: ch.color,
        text: ch.text,
        source: ch.source
      };
    })
  );

  cache = {
    timestamp: now,
    data: channelsWithLive
  };

  return NextResponse.json({ channels: channelsWithLive, cached: false });
}
