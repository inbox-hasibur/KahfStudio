import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function summarizeNews(title: string, content: string) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY not found, skipping summarization.");
      return content.slice(0, 150) + "...";
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    const prompt = `
      You are an expert news editor for "KahfNews". 
      Summarize the following news article into a concise, engaging, and conversational summary in Bangla.
      The summary should be suitable for an audio briefing and should be between 60-90 words.
      
      Title: ${title}
      Content: ${content}
      
      Summary (in Bangla):
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Error summarizing with Gemini:", error);
    return content.slice(0, 150) + "...";
  }
}

export async function summarizeWithGemini(
  articles: any[],
  introText: string = ''
) {
  try {
    if (!process.env.GEMINI_API_KEY || articles.length === 0) {
      console.warn("GEMINI_API_KEY not found or no articles, returning fallback.");
      return articles.map(a => ({
        ...a,
        summary: a.summary?.slice(0, 150) + "..." || "সংক্ষিপ্ত বিবরণ পাওয়া যায়নি।",
      }));
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    // Articles গুলো text এ convert করো
    const articlesText = articles
      .map((a, i) => `[${i + 1}] শিরোনাম: ${a.title}\nবিষয়বস্তু: ${a.summary}`)
      .join('\n\n');

    const prompt = `
তুমি একজন বাংলাদেশী রেডিও সংবাদ উপস্থাপক।

নিচের সংবাদগুলো পড়ে একটি প্রাকৃতিক, সাবলীল বাংলা পডকাস্ট স্ক্রিপ্ট তৈরি করো।

শুরুতে এই ভূমিকা ব্যবহার করো:
"${introText || 'আসসালামু আলাইকুম! আজকের গুরুত্বপূর্ণ সংবাদগুলো শুনুন।'}"

তারপর প্রতিটি সংবাদ সংক্ষেপ করো। প্রতিটির মাঝে বলো "এবার পরবর্তী সংবাদ।"
শেষে বলো "আজকের সংবাদ এখানেই শেষ। ধন্যবাদ KahfNews শোনার জন্য।"

সংবাদসমূহ:
${articlesText}

গুরুত্বপূর্ণ নিয়ম:
- সহজ বাংলায় লেখো যা সবাই বুঝতে পারে
- প্রতিটি সংবাদ ৩-৪ বাক্যে শেষ করো
- কোনো markdown বা asterisk (*) ব্যবহার করো না
- শুধু বলার উপযোগী টেক্সট দাও
`;

    const result = await model.generateContent(prompt);
    const script = result.response.text().trim();

    // Full script টা প্রথম item এ attach করো, বাকিগুলো আলাদা summary হিসেবে
    return articles.map((article, index) => ({
      title: article.title,
      summary: index === 0 ? script : article.summary,
      source: article.source || 'KahfNews',
      category: article.category || 'general',
      priority: index === 0 ? 'high' : 'medium',
      audioUrl: null,
      originalUrl: article.originalUrl || '#',
      publishedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    }));
  } catch (error) {
    console.error("Error generating podcast script with Gemini:", error);
    return articles.map(a => ({
      ...a,
      summary: a.summary?.slice(0, 150) + "..." || "সংক্ষিপ্ত বিবরণ পাওয়া যায়নি।",
    }));
  }
}

export async function classifyNews(title: string, summary: string) {
  try {
    if (!process.env.GEMINI_API_KEY) return "medium";

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    const prompt = `
      Classify the following news item into one of these priorities: "high", "medium", or "low".
      High priority is for urgent utility news (traffic, protests, strikes, emergency alerts).
      Medium priority is for important daily news (national, economy, politics).
      Low priority is for general interest (sports, entertainment, weather).
      
      Title: ${title}
      Summary: ${summary}
      
      Priority (high/medium/low):
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const priority = response.text().trim().toLowerCase();
    
    if (["high", "medium", "low"].includes(priority)) {
      return priority as "high" | "medium" | "low";
    }
    return "medium";
  } catch (error) {
    console.error("Error classifying with Gemini:", error);
    return "medium";
  }
}
