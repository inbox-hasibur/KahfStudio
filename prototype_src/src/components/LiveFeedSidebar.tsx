"use client";

import React from "react";
import { motion } from "framer-motion";
import { Zap, Bell, ChevronRight } from "lucide-react";
import Link from "next/link";

interface LiveUpdate {
  id: string;
  title: string;
  summary: string;
  category: string;
  publishedAt: string;
}

interface LiveFeedSidebarProps {
  updates: LiveUpdate[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

const LiveFeedSidebar = ({ updates }: LiveFeedSidebarProps) => {
  return (
    <aside className="lg:col-span-4 flex flex-col gap-8">


      <motion.div 
        className="sticky top-24 glass rounded-[32px] p-6 md:p-8 shadow-sm border border-border"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Header - Enhanced with animation and better hierarchy */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <motion.div 
              className="relative w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20"
              animate={{ 
                boxShadow: [
                  "0 0 0 0 var(--glow-primary)",
                  "0 0 20px 5px var(--glow-secondary)",
                  "0 0 0 0 var(--glow-primary)"
                ]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Zap className="w-5 h-5 text-primary fill-primary" />
            </motion.div>
            <div>
              <h2 className="text-caption text-foreground font-bold font-serif">লাইভ আপডেট</h2>
              <p className="text-[10px] text-muted-foreground">রিয়েল-টাইম খবর</p>
            </div>
          </div>
          <motion.div 
            className="w-2 h-2 rounded-full bg-primary"
            animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>

        {/* Updates List - Staggered animation */}
        <motion.div 
          className="space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {updates.map((update, index) => (
            <motion.div 
              key={update.id} 
              className="group cursor-pointer relative"
              variants={itemVariants}
              whileHover={{ x: 4 }}
              transition={{ duration: 0.2 }}
            >
              {/* Timeline connector */}
              {index < updates.length - 1 && (
                <div className="absolute left-[11px] top-8 bottom-[-24px] w-[2px] bg-gradient-to-b from-border to-transparent" />
              )}
              
              <div className="flex gap-4">
                {/* Timeline dot */}
                <div className="relative flex-shrink-0">
                  <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  {/* Category & Time */}
                  <div className="flex justify-between items-center mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-primary/10 text-[10px] font-bold text-primary tracking-wider">
                      {update.category}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                      {update.publishedAt}
                    </span>
                  </div>
                  
                  {/* Title */}
                  <h4 className="text-[15px] font-semibold text-foreground group-hover:text-primary transition-colors leading-snug mb-1.5 font-serif">
                    {update.title}
                  </h4>
                  
                  {/* Summary */}
                  <p className="text-muted-foreground text-[13px] leading-relaxed line-clamp-2">
                    {update.summary}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
        
        {/* View All Button - Enhanced with hover effect */}
        <Link href="/alerts" className="block">
          <motion.div 
            className="w-full mt-8 py-4 bg-white hover:bg-zinc-100 rounded-2xl text-caption text-zinc-900 transition-all border border-border group flex items-center justify-center gap-2 font-serif font-bold shadow-sm"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Bell className="w-4 h-4" />
            সব এলার্ট দেখুন
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </motion.div>
        </Link>
      </motion.div>
    </aside>
  );
};

export default LiveFeedSidebar;
