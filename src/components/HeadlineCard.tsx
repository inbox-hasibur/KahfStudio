"use client";

import React from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Play, ExternalLink, Headphones, ChevronRight } from "lucide-react";
import Link from "next/link";

interface HeadlineCardProps {
  news: {
    title: string;
    category: string;
    imageUrl: string;
    source: string;
  };
  index?: number;
}

  return (
    <Link href={`/news/${news.id}`}>
      <motion.div 
        className="relative min-w-[300px] md:min-w-[400px] w-full p-4 rounded-[16px] overflow-hidden group cursor-pointer snap-center card-hover bg-background border border-border flex items-center gap-4 hover:border-primary/50 transition-all duration-300"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        whileHover={{ y: -2, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)" }}
      >
        {/* Index Badge */}
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
          {String(index + 1).padStart(2, '0')}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
              {news.category}
            </span>
            <span className="text-border">•</span>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
              {news.source}
            </span>
          </div>

          <h2 className="text-[14px] md:text-[15px] font-bold text-foreground leading-snug tracking-tight group-hover:text-primary transition-colors truncate">
            {news.title}
          </h2>
        </div>

        {/* Action Icon */}
        <div className="shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground text-muted-foreground transition-colors">
          <ChevronRight className="w-4 h-4" />
        </div>
      </motion.div>
    </Link>
  );
};

export default HeadlineCard;
