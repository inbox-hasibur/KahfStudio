// @ts-nocheck
import { inngest } from "../client";
import { createBackgroundClient } from "@/utils/supabase/background";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";

export const processArticle = inngest.createFunction(
  { id: "process-article", event: "app/process-article" },
  async ({ event, step }) => {
    const { url, title, sourceId, sourceName, category } = event.data;
    const supabase = createBackgroundClient();

    // 1. Layer 2: Deep Extraction via Jina AI
    const markdown = await step.run("extract-markdown", async () => {
      try {
        const response = await axios.get(`https://r.jina.ai/${url}`);
        return response.data;
      } catch (error) {
        throw new Error(`Failed to extract markdown from ${url}`);
      }
    });

    if (!markdown) {
      return { status: "failed", reason: "No markdown extracted" };
    }

    // 2. Fetch System Prompts from DB
    const { evaluatorPrompt, synthesizerPrompt, autoApprove, globalKeys } = await step.run("fetch-prompts", async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value");
      
      let ePrompt = "Respond exactly with 'YES' if the article contains a valid news story, otherwise 'NO'. Do not include any other text.";
      let sPrompt = "খবরটির একটি চমৎকার, আকর্ষণীয় এবং তথ্যবহুল সারসংক্ষেপ লিখুন বাংলায় (১-২ প্যারাগ্রাফের মধ্যে)। শিরোনাম এবং মূল বিষয়টি সুন্দরভাবে ফুটিয়ে তুলুন।";
      let autoApp = true; // By default auto-approve is on
      let keys: string[] = [];
      
      if (data) {
        const eSetting = data.find(s => s.setting_key === "evaluator_prompt");
        const sSetting = data.find(s => s.setting_key === "synthesizer_prompt");
        const autoSetting = data.find(s => s.setting_key === "auto_approve_news");
        const keysSetting = data.find(s => s.setting_key === "global_gemini_api_keys");
        
        if (eSetting) ePrompt = eSetting.setting_value;
        if (sSetting) sPrompt = sSetting.setting_value;
        if (autoSetting) autoApp = autoSetting.setting_value === "true";
        if (keysSetting) {
          try { keys = JSON.parse(keysSetting.setting_value); } catch(e) {}
        }
      }
      return { evaluatorPrompt: ePrompt, synthesizerPrompt: sPrompt, autoApprove: autoApp, globalKeys: keys };
    });

    // 3. Layer 2.5: AI Evaluator
    const isGood = await step.run("evaluate-article", async () => {
      const keys = (globalKeys && globalKeys.length > 0) ? globalKeys : [process.env.GEMINI_API_KEY!];
      let lastError = null;

      for (const apiKey of keys) {
        try {
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
          const prompt = `${evaluatorPrompt}\n\nArticle Markdown:\n${markdown}`;
          
          const result = await model.generateContent(prompt);
          const responseText = result.response.text().trim().toUpperCase();
          return responseText.includes("YES");
        } catch (error: any) {
          lastError = error;
          console.warn("Gemini Evaluator API Error with a key:", error.message);
          // If it's a rate limit (429) or other error, continue to the next key
          continue; 
        }
      }
      throw new Error(`AI Evaluator failed with all available API keys. Last error: ${lastError?.message}`);
    });

    if (!isGood) {
      return { status: "dropped", reason: "AI Evaluator rejected the article." };
    }

    // 4. Layer 3: AI Synthesis
    const synthesizedContent = await step.run("synthesize-content", async () => {
      const keys = (globalKeys && globalKeys.length > 0) ? globalKeys : [process.env.GEMINI_API_KEY!];
      let lastError = null;

      for (const apiKey of keys) {
        try {
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
          const prompt = `${synthesizerPrompt}\n\nTitle: ${title}\nCategory: ${category}\n\nArticle Content:\n${markdown}`;
          
          const result = await model.generateContent(prompt);
          return result.response.text();
        } catch (error: any) {
          lastError = error;
          console.warn("Gemini Synthesizer API Error with a key:", error.message);
          continue;
        }
      }
      throw new Error(`AI Synthesizer failed with all available API keys. Last error: ${lastError?.message}`);
    });

    // 5. Save to Supabase (news_articles)
    await step.run("save-to-db", async () => {
      const { error } = await supabase
        .from("news_articles")
        .insert({
          headline: title,
          raw_content: markdown,
          ai_summary: synthesizedContent,
          status: autoApprove ? "published" : "draft", // Depends on auto_approve_news setting
          original_url: url,
          source: sourceName || url, 
          published_at: new Date().toISOString()
        });
      
      if (error) {
        throw new Error(`Failed to save to DB: ${error.message}`);
      }
    });

    return { status: "success", title };
  }
);
