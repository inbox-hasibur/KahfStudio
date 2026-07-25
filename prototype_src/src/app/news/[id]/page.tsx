"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import Link from "next/link";
import { 
  Clock, Globe, ArrowLeft, Play, Share2, Bookmark, 
  ThumbsUp, MessageCircle, ExternalLink, Tag, Volume2
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Mock news data for demo
const MOCK_NEWS_DETAILS: Record<string, any> = {
  "1": {
    id: "1",
    title: "Bangladesh Economy Shows Strong Growth in Q3 2024",
    summary: `Bangladesh's economy demonstrated remarkable resilience in the third quarter of 2024, with GDP growth reaching 7.2%, surpassing earlier projections of 6.8%. The manufacturing sector led the charge with a 12% increase in output, driven primarily by the ready-made garments industry and emerging electronics manufacturing.

The Bangladesh Bank reported that foreign direct investment increased by 15% compared to the same period last year, with significant contributions from the technology and infrastructure sectors. Remittance inflows also remained strong at $2.1 billion for the quarter.

Key economic indicators show promising trends across multiple sectors. The agricultural sector saw a 4.5% growth driven by modern farming techniques and favorable weather conditions. The services sector, particularly financial services and telecommunications, grew by 8.3%.

Infrastructure development projects, including the Padma Bridge rail link and various highway expansion initiatives, have created thousands of jobs and stimulated economic activity in previously underserved regions. The government's Digital Bangladesh initiative continues to attract tech companies, with Dhaka's tech park reporting 95% occupancy.

Economists caution that while the growth trajectory is positive, challenges remain in managing inflation, which stood at 5.8% in September, and addressing income inequality. The upcoming budget is expected to focus on social safety nets and continued infrastructure investment.`,
    category: "Economy",
    source: "Financial Express",
    priority: "high",
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=2070&auto=format&fit=crop",
    originalUrl: "https://example.com/article-1",
    author: "Sarah Karim",
    readTime: "5 min read",
    tags: ["Economy", "GDP", "Growth", "Bangladesh"],
  },
  "2": {
    id: "2",
    title: "New Tech Innovations Transforming Dhaka's Startup Scene",
    summary: `Dhaka's startup ecosystem is experiencing an unprecedented transformation as new technologies and increased funding create a fertile ground for innovation. The city's tech hubs have grown from 3 in 2020 to over 15 dedicated co-working and incubation spaces in 2024.

Artificial intelligence and machine learning startups are leading the charge, with companies like Pathao, Chaldal, and ShopUp expanding their AI capabilities. Local developers are creating solutions tailored to Bangladesh's unique challenges, from flood prediction systems to vernacular language processing tools.

Venture capital investment in Bangladeshi startups reached $250 million in 2024, a 40% increase from the previous year. International investors are taking notice, with major firms from Singapore and Silicon Valley establishing local partnerships.

The government's Startup Bangladesh initiative has provided grants to over 200 startups this year, focusing on agritech, healthtech, and edtech sectors. The program aims to create 10,000 tech jobs by 2025.

Educational institutions are also adapting, with BUET, Dhaka University, and BRAC University launching specialized AI and data science programs. The pipeline of skilled graduates is growing, though industry leaders note that keeping talent in Bangladesh remains a challenge.

5G rollout in major cities is expected to further accelerate innovation, particularly in IoT and real-time data applications. The telecommunications sector has invested heavily in infrastructure, with coverage reaching 85% of urban areas.`,
    category: "Technology",
    source: "Tech Bangladesh",
    priority: "high",
    publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    imageUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=2070&auto=format&fit=crop",
    originalUrl: "https://example.com/article-2",
    author: "Rafiq Ahmed",
    readTime: "6 min read",
    tags: ["Technology", "Startups", "AI", "Dhaka"],
  },
  "3": {
    id: "3",
    title: "National Cricket Team Prepares for International Series",
    summary: `The Bangladesh national cricket team has announced its 15-member squad for the upcoming bilateral series against Sri Lanka, with several notable inclusions and strategic changes. The selection committee has opted for a blend of experience and youth, bringing in three uncapped players.

Head coach Chandika Hathurusingha expressed confidence in the squad's preparation, highlighting the team's intensive training camp in Dhaka. The camp focused on improving batting consistency against spin bowling and strengthening fielding standards.

Key all-rounder Shakib Al Hasan returns to the squad after recovering from a finger injury sustained during the BPL. His experience will be crucial in the middle order and provides additional spin bowling options. Young fast bowler Hasan Mahmud has been rewarded for his consistent domestic performances.

The three-match ODI series begins on November 15 at the Sher-e-Bangla National Stadium, followed by two Test matches in Chattogram and Dhaka. Ticket sales have been robust, with the first ODI already sold out.

Cricket analysts note that Bangladesh's home record has been formidable, with the team winning 70% of their ODIs at home in the last two years. The spin-friendly pitches are expected to favor the hosts' bowling attack.`,
    category: "Sports",
    source: "Sports Daily",
    priority: "medium",
    publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    imageUrl: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?q=80&w=2070&auto=format&fit=crop",
    originalUrl: "https://example.com/article-3",
    author: "Mashrafe Mortaza",
    readTime: "4 min read",
    tags: ["Sports", "Cricket", "Bangladesh"],
  },
  "4": {
    id: "4",
    title: "Government Announces New Infrastructure Projects for 2025",
    summary: `The government has unveiled an ambitious infrastructure development plan for 2025, allocating BDT 45,000 crore for projects spanning transportation, energy, and digital infrastructure. The announcement came during a special cabinet meeting chaired by the Prime Minister.

Major projects include the expansion of the Dhaka Metro Rail network with two new lines connecting Gazipur and Narayanganj, the construction of a deep-sea port at Matarbari, and the modernization of the country's power grid to support renewable energy integration.

The transportation sector receives the largest allocation at BDT 20,000 crore, focusing on reducing Dhaka's notorious traffic congestion. New expressways, flyovers, and bus rapid transit systems are planned for the capital and secondary cities.

Energy projects worth BDT 12,000 crore will expand solar power capacity to 2,000 MW and upgrade the national grid. The government aims to generate 40% of electricity from renewable sources by 2030.

Digital infrastructure investments of BDT 8,000 crore will expand broadband coverage to 90% of the population and establish technology parks in all divisional headquarters. The remaining funds are allocated for water supply and urban development projects.

Economic analysts project that these investments could create over 500,000 direct jobs and contribute 1.5% to GDP growth annually during the construction phase.`,
    category: "National",
    source: "Daily Star",
    priority: "high",
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    imageUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=2070&auto=format&fit=crop",
    originalUrl: "https://example.com/article-4",
    author: "Tahmina Akter",
    readTime: "5 min read",
    tags: ["National", "Infrastructure", "Government", "Development"],
  },
  "5": {
    id: "5",
    title: "AI Revolution: How Local Businesses Are Adapting",
    summary: `Small and medium enterprises across Bangladesh are increasingly adopting artificial intelligence tools to streamline operations and reach new markets. A recent survey by the Bangladesh Chamber of Commerce found that 35% of SMEs have integrated some form of AI technology into their business processes in the past year.

From automated inventory management in retail shops to AI-powered customer service chatbots, the applications are diverse and growing. Garment factories are using computer vision for quality control, reducing defect rates by up to 40%. Agricultural businesses are leveraging satellite imagery and machine learning for crop monitoring and yield prediction.

The adoption hasn't been without challenges. Many business owners cite the lack of technical expertise and high implementation costs as barriers. However, local tech companies are developing affordable, Bangladesh-specific AI solutions that require minimal technical knowledge to deploy.

Government initiatives supporting digital transformation have provided subsidies and training programs for SMEs looking to adopt AI. The "Smart SME" program has already trained over 5,000 business owners in basic AI applications and digital marketing.

Financial institutions are also embracing AI, with several banks deploying AI-driven credit scoring systems that can assess loan applications in minutes rather than days. This is particularly impactful for small businesses that previously struggled to access formal credit.`,
    category: "Technology",
    source: "Business Standard",
    priority: "medium",
    publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    imageUrl: "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=2070&auto=format&fit=crop",
    originalUrl: "https://example.com/article-5",
    author: "Imran Hossain",
    readTime: "5 min read",
    tags: ["Technology", "AI", "Business", "SME"],
  },
  "6": {
    id: "6",
    title: "Weather Alert: Heavy Rain Expected in Coastal Regions",
    summary: `The Bangladesh Meteorological Department has issued a heavy rainfall warning for the southern coastal districts including Cox's Bazar, Chittagong, and Barguna. Rainfall of 150-200mm is expected over the next 48 hours, with the possibility of localized flooding in low-lying areas.

The depression formed in the Bay of Bengal has intensified and is moving northwestward. Maritime ports have been advised to hoist danger signal number 4, and fishing boats have been instructed to remain close to the shore or return to harbor.

District administrations in the affected areas have been put on alert. Emergency shelters have been prepared, and relief supplies including dry food, water purification tablets, and medical kits have been pre-positioned. The Cyclone Preparedness Programme volunteers are on standby.

The Department of Agricultural Extension has advised farmers in coastal areas to harvest mature crops and protect stored grain. Livestock owners have been urged to move animals to higher ground.

Urban areas including parts of Chittagong city may experience waterlogging due to drainage systems being overwhelmed. City corporations have deployed additional pumps and clearing teams to major drainage channels.

The weather is expected to improve by Thursday as the depression weakens over land. However, residual moisture may continue to cause scattered showers through the weekend.`,
    category: "Weather",
    source: "Weather BD",
    priority: "medium",
    publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    imageUrl: "https://images.unsplash.com/photo-1525088553748-01d6e210e00b?q=80&w=2070&auto=format&fit=crop",
    originalUrl: "https://example.com/article-6",
    author: "Dr. Nazrul Islam",
    readTime: "4 min read",
    tags: ["Weather", "Alert", "Coastal", "Rain"],
  },
  "7": {
    id: "7",
    title: "Education Ministry Reforms Curriculum for Digital Age",
    summary: `The Ministry of Education has announced comprehensive curriculum reforms aimed at preparing students for the digital economy. The new framework, set to be implemented from the 2025 academic year, emphasizes coding, digital literacy, critical thinking, and project-based learning.

Starting from Class 6, students will receive mandatory coding education, with Python and Scratch introduced as primary programming languages. By Class 10, students will be expected to build basic applications and understand data analysis concepts. The curriculum also introduces cybersecurity awareness modules.

Critical thinking and problem-solving modules will replace traditional rote-learning approaches in core subjects. Assessment methods will shift from purely exam-based to a combination of projects, presentations, and practical demonstrations, accounting for 40% of final grades.

Teacher training is a major component of the reform, with 50,000 teachers scheduled for retraining in the first phase. The government has partnered with tech companies including Google and Microsoft to provide training resources and certification programs.

Digital infrastructure in schools will be upgraded, with a target of 1 computer per 10 students in secondary schools. The "Digital Classroom" initiative will provide smart boards, high-speed internet, and access to online learning platforms to 5,000 schools in the first year.

The reforms have been broadly welcomed by educators and industry leaders, though some traditionalists have raised concerns about the pace of change and the readiness of rural schools to implement digital curriculum components.`,
    category: "Education",
    source: "Education Today",
    priority: "low",
    publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    imageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=2070&auto=format&fit=crop",
    originalUrl: "https://example.com/article-7",
    author: "Professor Nusrat Jahan",
    readTime: "6 min read",
    tags: ["Education", "Curriculum", "Digital", "Reform"],
  },
};

const RELATED_STORIES = [
  { id: "2", title: "New Tech Innovations Transforming Dhaka's Startup Scene", category: "Technology" },
  { id: "4", title: "Government Announces New Infrastructure Projects for 2025", category: "National" },
  { id: "5", title: "AI Revolution: How Local Businesses Are Adapting", category: "Technology" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export default function NewsDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const newsItem = MOCK_NEWS_DETAILS[id];
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  if (!newsItem) {
    return (
      <main className="max-w-[800px] mx-auto px-4 md:px-6 pt-32 pb-32">
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold text-foreground mb-4">Story Not Found</h1>
          <p className="text-muted-foreground mb-8">The story you're looking for doesn't exist or has been removed.</p>
          <Link href="/">
            <Button className="rounded-full bg-primary text-primary-foreground px-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Feed
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  const formattedDate = new Date(newsItem.publishedAt).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const formattedTime = new Date(newsItem.publishedAt).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const paragraphs = newsItem.summary.split("\n\n").filter(Boolean);

  return (
    <motion.main
      className="max-w-[860px] mx-auto px-4 md:px-6 pt-28 md:pt-36 pb-40"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Back Navigation */}
      <motion.div variants={itemVariants}>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-[13px] font-semibold uppercase tracking-wider">Back to Feed</span>
        </Link>
      </motion.div>

      <article>
        {/* Meta Info */}
        <motion.div variants={itemVariants} className="flex items-center gap-3 mb-6">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
            {newsItem.category}
          </span>
          <span className="text-border">•</span>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium">
              {formattedDate} · {formattedTime}
            </span>
          </div>
          <span className="text-border">•</span>
          <span className="text-[11px] font-medium text-muted-foreground">{newsItem.readTime}</span>
        </motion.div>

        {/* Title */}
        <motion.h1
          variants={itemVariants}
          className="text-[28px] md:text-[40px] lg:text-[48px] font-bold text-foreground leading-[1.1] tracking-tight mb-6"
        >
          {newsItem.title}
        </motion.h1>

        {/* Author & Actions Row */}
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-between mb-8 pb-6 border-b border-border"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
              {newsItem.author?.split(" ").map((n: string) => n[0]).join("") || "K"}
            </div>
            <div>
              <p className="text-[14px] font-semibold text-foreground">{newsItem.author || "KahfNews"}</p>
              <p className="text-[12px] text-muted-foreground">{newsItem.source}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <motion.button
              className={`p-2.5 rounded-full transition-colors ${isLiked ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsLiked(!isLiked)}
              aria-label="Like"
            >
              <ThumbsUp className="w-4 h-4" />
            </motion.button>
            <motion.button
              className={`p-2.5 rounded-full transition-colors ${isBookmarked ? "text-amber-500 bg-amber-500/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsBookmarked(!isBookmarked)}
              aria-label="Bookmark"
            >
              <Bookmark className="w-4 h-4" fill={isBookmarked ? "currentColor" : "none"} />
            </motion.button>
            <motion.button
              className="p-2.5 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Share"
            >
              <Share2 className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>

        {/* Hero Image */}
        <motion.div
          variants={itemVariants}
          className="relative w-full aspect-video rounded-[24px] overflow-hidden mb-10 border border-border"
        >
          <img
            src={newsItem.imageUrl}
            alt={newsItem.title}
            className="object-cover w-full h-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </motion.div>

        {/* Listen Card */}
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-between p-5 bg-primary/5 rounded-2xl border border-primary/10 mb-10"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Volume2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                Listen to this story
              </p>
              <p className="text-foreground font-semibold">AI Voice Briefing</p>
            </div>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button className="bg-primary text-primary-foreground hover:opacity-90 rounded-full font-bold px-6 gap-2">
              <Play className="w-4 h-4 fill-current" />
              Play
            </Button>
          </motion.div>
        </motion.div>

        {/* Article Content */}
        <motion.div variants={itemVariants} className="mb-10">
          {paragraphs.map((paragraph: string, index: number) => (
            <p
              key={index}
              className="text-[17px] md:text-[18px] leading-[1.7] text-foreground/80 font-medium mb-6 last:mb-0"
            >
              {paragraph}
            </p>
          ))}
        </motion.div>

        {/* Tags */}
        <motion.div variants={itemVariants} className="flex flex-wrap gap-2 mb-8">
          {newsItem.tags?.map((tag: string) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Tag className="w-3 h-3" />
              {tag}
            </span>
          ))}
        </motion.div>

        {/* Divider */}
        <div className="h-px bg-border my-8" />

        {/* Source & Original Link */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-12"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Globe className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Source</p>
              <p className="text-foreground font-semibold">{newsItem.source}</p>
            </div>
          </div>

          <a
            href={newsItem.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-card border border-border rounded-full font-semibold text-[13px] text-foreground hover:bg-muted hover:border-primary/20 transition-all active:scale-95"
          >
            <ExternalLink className="w-4 h-4" />
            Read Original Article
          </a>
        </motion.div>

        {/* Related Stories */}
        <motion.div variants={itemVariants}>
          <h3 className="text-lg font-bold text-foreground mb-4">Related Stories</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {RELATED_STORIES.filter((s) => s.id !== id).map((story) => (
              <Link key={story.id} href={`/news/${story.id}`}>
                <motion.div
                  className="p-4 bg-card border border-border rounded-2xl hover:border-primary/20 transition-all group"
                  whileHover={{ y: -2 }}
                >
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                    {story.category}
                  </span>
                  <p className="text-[14px] font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 mt-1.5">
                    {story.title}
                  </p>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>
      </article>
    </motion.main>
  );
}
