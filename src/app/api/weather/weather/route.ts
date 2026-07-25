import { NextResponse } from 'next/server';

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
async function getTrafficInfo(): Promise<string> {
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
              text: `তুমি একজন বাংলাদেশী ট্রাফিক রিপোর্টার। ঢাকা শহরের বর্তমান ট্রাফিক অবস্থা সম্পর্কে ১-২ বাক্যে সংক্ষেপে বলো। উদাহরণ: "শাহবাগে যানজট আছে, বিকল্প পথ ব্যবহার করুন।" উত্তর শুধু ট্রাফিক তথ্য দাও, কোনো অতিরিক্ত টেক্সট নয়।`
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

export async function GET() {
  const now = new Date();

  // Dhaka time বানাও
  const dhakaTime = new Date(
    now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })
  );

  const day = BANGLA_DAYS[dhakaTime.getDay()];
  const date = dhakaTime.getDate();
  const month = BANGLA_MONTHS[dhakaTime.getMonth()];
  const year = dhakaTime.getFullYear();

  // Weather নাও
  let weatherText = 'আবহাওয়া তথ্য পাওয়া যায়নি';
  let temp = null;
  let description = null;

  try {
    const weatherRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=Dhaka,BD&appid=${process.env.OPENWEATHER_API_KEY}&units=metric&lang=bn`,
      { next: { revalidate: 3600 } } // 1 ঘন্টা cache
    );

    if (weatherRes.ok) {
      const data = await weatherRes.json();
      temp = Math.round(data.main.temp);
      description = data.weather[0].description;
      weatherText = `ঢাকায় তাপমাত্রা ${temp}°C, ${description}`;
    }
  } catch (e) {
    console.error('Weather fetch failed:', e);
  }

  // Traffic info নাও (Gemini Search Grounding দিয়ে - Free)
  const trafficText = await getTrafficInfo();

  // Podcast intro বানাও — এখন traffic সহ
  let introText = `আসসালামু আলাইকুম! আজ ${day}, ${date} ${month} ${year}। ${weatherText}।`;
  if (trafficText) {
    introText += ` ${trafficText}।`;
  }
  introText += ` এখন শুনুন আজকের গুরুত্বপূর্ণ সংবাদ।`;

  return NextResponse.json({
    success: true,
    data: {
      day,
      date: `${date} ${month} ${year}`,
      temp,
      description,
      weatherText,
      traffic: trafficText,
      introText  // ← TTS এ সরাসরি এটা use করবো
    }
  });
}
