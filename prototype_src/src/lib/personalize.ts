/**
 * Personalized Summarization — User device এ চলে
 * 
 * Flow:
 * 1. সব raw news server থেকে আসে (JSON)
 * 2. User device এ interest filter করে
 * 3. Gemma (lightest) দিয়ে summarize করে
 * 4. Local এ store করে
 */

export interface UserInterest {
  topics: string[];       // e.g., ["sports", "technology", "economy"]
  categories: string[];   // e.g., ["Sports", "Technology"]
}

export function filterByInterest(
  news: any[],
  interests: UserInterest
): any[] {
  if (!interests.categories.length && !interests.topics.length) {
    return news; // No filter = সব দেখাবে
  }

  return news.filter((item) => {
    const category = item.category?.toLowerCase() || '';
    const title = item.title?.toLowerCase() || '';
    const summary = item.summary?.toLowerCase() || '';

    // Category match
    const categoryMatch = interests.categories.some(
      (c) => category.includes(c.toLowerCase())
    );

    // Topic match (title বা summary এর মধ্যে)
    const topicMatch = interests.topics.some(
      (t) => title.includes(t.toLowerCase()) || summary.includes(t.toLowerCase())
    );

    return categoryMatch || topicMatch;
  });
}

/**
 * Device-side summarizer — LLM না থাকলে fallback
 * Browser এ Gemma বা tiny LLM run করলে এটা use হবে
 * আপাতত simple truncation + key point extraction
 */
export function localSummarize(text: string, maxWords: number = 50): string {
  if (!text || text.length < maxWords) return text;

  // First 2-3 sentences extract করো
  const sentences = text.split(/[।!?]/).filter(s => s.trim().length > 0);
  const summary = sentences.slice(0, 2).join('।') + '।';
  
  if (summary.length > maxWords * 5) {
    return summary.slice(0, maxWords * 5) + '...';
  }
  
  return summary;
}

/**
 * Local storage helper — user preferences save/load
 */
export function saveUserInterests(interests: UserInterest): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('kahf-interests', JSON.stringify(interests));
  }
}

export function loadUserInterests(): UserInterest | null {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('kahf-interests');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
  }
  return null;
}

export const DEFAULT_INTERESTS: UserInterest = {
  topics: [],
  categories: [],
};
