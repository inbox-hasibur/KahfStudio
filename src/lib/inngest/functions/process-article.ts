// @ts-nocheck
import { inngest } from "../client";
import { createBackgroundClient } from "@/utils/supabase/background";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import { generateSeamlessGeminiAudio, uploadAudioToCloudinary } from "@/lib/audio/gemini-tts";
import { extractArticleContent } from "@/lib/scraper/universal-extractor";

export const processArticle = inngest.createFunction(
  { id: "process-article", event: "app/process-article" },
  async ({ event, step }) => {
    const { url, title, sourceId, sourceName, category, country = "BD" } = event.data;
    const supabase = createBackgroundClient();

    // 1. Universal Content Extraction (Mozilla Readability -> JSON-LD -> Jina AI)
    const extractedArticle = await step.run("extract-markdown", async () => {
      try {
        const extracted = await extractArticleContent(url, title);
        return {
          title: extracted.title || title,
          bodyText: extracted.bodyText || title,
          ogImage: extracted.ogImage || null,
          method: extracted.extractionMethod,
        };
      } catch (error: any) {
        console.warn(`Universal extraction failed for ${url}, falling back to title:`, error.message);
        return { title, bodyText: `Title: ${title}\nSource: ${sourceName}\nURL: ${url}`, ogImage: null, method: 'fallback' };
      }
    });

    const cleanedMarkdown = extractedArticle.bodyText;

    // 2. Fetch Global Settings & API keys
    const { globalKeys, autoApprove } = await step.run("fetch-settings", async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value");

      let autoApp = true;
      let keys: string[] = [];

      if (data) {
        const autoSetting = data.find((s) => s.setting_key === "auto_approve_news");
        const keysSetting = data.find((s) => s.setting_key === "global_gemini_api_keys");
        if (autoSetting) autoApp = autoSetting.setting_value === "true";
        if (keysSetting) {
          try { keys = JSON.parse(keysSetting.setting_value); } catch (e) {}
        }
      }
      return { globalKeys: keys, autoApprove: autoApp };
    });

    const activeKeys = (globalKeys && globalKeys.length > 0) ? globalKeys : [process.env.GEMINI_API_KEY!];

    // 3. Single Unified Gemini Processing: Clean + Summary + Importance Score
    const aiResult = await step.run("ai-unified-processing", async () => {
      const prompt = `You are a chief news editor and journalist for a premium multimedia news platform.
Analyze the following article and return a strictly valid JSON object with no markdown fences around JSON (or with standard json codeblocks).

Input Title: ${title}
Source: ${sourceName}
Country: ${country}
Category Hint: ${category || "General"}
Cleaned Article Body:
${cleanedMarkdown.slice(0, 15000)}

Your response MUST follow this exact JSON schema:
{
  "importance_score": <Integer from 1 to 100 representing how critical/breaking/important this news is for a general audience. 85-100: Major national/global breaking news; 65-84: High interest; 45-64: Regular news; 1-44: Minor/Niche>,
  "clean_headline": "<Clean, engaging Bengali headline>",
  "clean_content": "<COMPLETE FULL UNABRIDGED BENGALI ARTICLE BODY in clean markdown. DO NOT SHORTEN OR CONDENSE THE STORY; KEEP ALL NARRATIVE PARAGRAPHS>",
  "ai_summary": "<A SHORT 2-paragraph Bengali summary with 3 key takeaway bullet points at the end>",
  "detected_category": "<One of: Politics, Economy, Technology, Sports, Entertainment, World, Bangladesh, Lifestyle, General>",
  "detected_country": "${country}"
}`;

      let lastError = null;
      const modelsToTry = ["gemini-3.6-flash", "gemini-2.5-flash"];

      for (const modelName of modelsToTry) {
        for (const apiKey of activeKeys) {
          if (!apiKey) continue;
          try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({
              model: modelName,
              generationConfig: { responseMimeType: "application/json" },
            });

            const result = await model.generateContent(prompt);
            const text = result.response.text();
            return JSON.parse(text);
          } catch (err: any) {
            lastError = err;
            console.warn(`Gemini Unified Process API error (${modelName}):`, err.message);
            continue;
          }
        }
      }

      throw new Error(`Gemini Unified Processing failed with all keys: ${lastError?.message}`);
    });

    // 4. Generate Pre-rendered Audio TTS (Gemini Seamless Audio)
    const audioUrl = await step.run("generate-summary-audio", async () => {
      try {
        const textToSpeak = (aiResult.ai_summary || aiResult.clean_headline)
          .replace(/[*_#`[\]()]/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        const wavBuffer = await generateSeamlessGeminiAudio(textToSpeak, "bn", activeKeys);
        const publicId = `news_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const cUrl = await uploadAudioToCloudinary(wavBuffer, publicId);
        return cUrl;
      } catch (err: any) {
        console.warn("Pre-generated audio generation failed, skipping audio for now:", err.message);
        return null;
      }
    });

    // 5. Save to Supabase (news_articles)
    await step.run("save-to-db", async () => {
      const insertPayload: any = {
        headline: aiResult.clean_headline || title,
        raw_content: aiResult.clean_content || cleanedMarkdown,
        ai_summary: aiResult.ai_summary,
        status: autoApprove ? "published" : "draft",
        original_url: url,
        source: sourceName || url,
        category: aiResult.detected_category || category || "General",
        published_at: new Date().toISOString(),
      };

      if (extractedArticle?.ogImage) {
        insertPayload.image_url = extractedArticle.ogImage;
      }

      if (audioUrl) {
        insertPayload.audio_bn_summary = audioUrl;
      }

      // Try inserting with importance_score & country
      try {
        const { error } = await supabase
          .from("news_articles")
          .insert({
            ...insertPayload,
            importance_score: aiResult.importance_score || 50,
            country: aiResult.detected_country || country || "BD",
          });

        if (error) {
          // If columns don't exist yet, insert without them
          console.warn("DB insert with country/importance_score had error, falling back:", error.message);
          const { error: fallbackError } = await supabase
            .from("news_articles")
            .insert(insertPayload);
          if (fallbackError) throw fallbackError;
        }
      } catch (dbErr: any) {
        throw new Error(`Failed to save article to DB: ${dbErr.message}`);
      }
    });

    return {
      status: "success",
      title: aiResult.clean_headline || title,
      importance_score: aiResult.importance_score,
      hasAudio: !!audioUrl,
    };
  }
);
