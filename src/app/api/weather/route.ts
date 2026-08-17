import { NextRequest, NextResponse } from 'next/server';

const BANGLA_DAYS = [
  'রবিবার', 'সোমবার', 'মঙ্গলবার',
  'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'
];

const BANGLA_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল',
  'মে', 'জুন', 'জুলাই', 'আগস্ট',
  'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

// Try to fetch traffic info from Gemini Search Grounding
async function getTrafficInfo(city = 'ঢাকা'): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return '';

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `তুমি একজন ট্রাফিক রিপোর্টার। ${city} শহরের বর্তমান ট্রাফিক ও রাস্তার অবস্থা সম্পর্কে ১-২ বাক্যে সংক্ষেপে বলো। যেমন: "শাহবাগ ও ফার্মগেটে যানজট আছে, বিকল্প পথ ব্যবহার করুন।" উত্তর শুধু ট্রাফিক তথ্য দাও, কোনো অতিরিক্ত টেক্সট নয়।`
            }]
          }],
          tools: [{ googleSearchRetrieval: {} }]
        })
      }
    );

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ? `ট্রাফিক আপডেট: ${text.trim()}` : '';
  } catch (e) {
    console.error('Traffic fetch failed:', e);
    return '';
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get('city') || 'Dhaka';
  const country = searchParams.get('country') || 'BD';

  const now = new Date();

  // Local time calculation
  const localTime = new Date(
    now.toLocaleString('en-US', { timeZone: country === 'BD' ? 'Asia/Dhaka' : 'UTC' })
  );

  const day = BANGLA_DAYS[localTime.getDay()];
  const date = localTime.getDate();
  const month = BANGLA_MONTHS[localTime.getMonth()];
  const year = localTime.getFullYear();

  // Weather variables
  let weatherText = 'আবহাওয়া তথ্য পাওয়া যায়নি';
  let temp: number | null = null;
  let description: string | null = null;
  let weatherMain = '';
  let needUmbrella = false;
  let umbrellaTip = 'আজকের আবহাওয়া স্বাভাবিক, ছাতার প্রয়োজন নাও হতে পারে।';

  try {
    const weatherRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city},${country}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric&lang=bn`,
      { next: { revalidate: 1800 } } // 30 min cache
    );

    if (weatherRes.ok) {
      const data = await weatherRes.json();
      temp = Math.round(data.main?.temp ?? 0);
      description = data.weather?.[0]?.description ?? '';
      weatherMain = data.weather?.[0]?.main?.toLowerCase() ?? '';
      const weatherId = data.weather?.[0]?.id ?? 800;

      weatherText = `${city}-এ তাপমাত্রা ${temp}°C, ${description}`;

      // Umbrella determination logic:
      // Condition 1: Rain, Thunderstorm, Drizzle (IDs 2xx, 3xx, 5xx)
      if (
        weatherMain.includes('rain') ||
        weatherMain.includes('drizzle') ||
        weatherMain.includes('thunderstorm') ||
        (weatherId >= 200 && weatherId < 600)
      ) {
        needUmbrella = true;
        umbrellaTip = 'আজ বৃষ্টির প্রবল সম্ভাবনা রয়েছে, বাইরে বের হলে অবশ্যই সাথে ছাতা রাখুন!';
      }
      // Condition 2: Scorching heat / extreme sun (temp >= 33°C)
      else if (temp >= 33) {
        needUmbrella = true;
        umbrellaTip = `আজ তাপমাত্রা প্রায় ${temp}°C এবং তীব্র রোদ থাকতে পারে, রোদ থেকে সুরক্ষার জন্য ছাতা সাথে রাখা ভালো।`;
      }
      // Condition 3: Cloudy / Clear normal weather
      else {
        needUmbrella = false;
        umbrellaTip = 'আজকের আবহাওয়া অনুকূল, ছাতা ছাড়া সহজেই চলাফেরা করতে পারবেন।';
      }
    }
  } catch (e) {
    console.error('Weather fetch failed:', e);
  }

  // Traffic update via Gemini
  const trafficText = await getTrafficInfo(city === 'Dhaka' ? 'ঢাকা' : city);

  // Full Podcast Intro Script
  let introText = `আসসালামু আলাইকুম! আজ ${day}, ${date} ${month} ${year}। ${weatherText}। ${umbrellaTip}`;
  if (trafficText) {
    introText += ` ${trafficText}।`;
  }
  introText += ` এখন শুনুন আজকের গুরুত্বপূর্ণ সংবাদ বুলেটিন।`;

  return NextResponse.json({
    success: true,
    data: {
      day,
      date: `${date} ${month} ${year}`,
      city,
      country,
      temp,
      description,
      weatherText,
      needUmbrella,
      umbrellaTip,
      traffic: trafficText,
      introText,
    }
  });
}
