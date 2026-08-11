"use client";

import React, { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import HeadlineCard from "./HeadlineCard";
import { Flame, TrendingUp } from "lucide-react";

interface HeadlineSliderProps {
  headlines: any[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const HeadlineSlider = ({ headlines }: HeadlineSliderProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    let animationFrameId: number;
    let scrollPos = 0;

    const scroll = () => {
      scrollPos += 0.5; // Adjust speed here
      if (scrollPos >= scrollContainer.scrollWidth / 2) {
        scrollPos = 0;
      }
      scrollContainer.scrollLeft = scrollPos;
      animationFrameId = requestAnimationFrame(scroll);
    };

    animationFrameId = requestAnimationFrame(scroll);

    const handleMouseEnter = () => cancelAnimationFrame(animationFrameId);
    const handleMouseLeave = () => {
      animationFrameId = requestAnimationFrame(scroll);
    };

    scrollContainer.addEventListener('mouseenter', handleMouseEnter);
    scrollContainer.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      cancelAnimationFrame(animationFrameId);
      scrollContainer.removeEventListener('mouseenter', handleMouseEnter);
      scrollContainer.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [headlines]);

  // Duplicate headlines for seamless infinite scroll
  const displayHeadlines = [...headlines, ...headlines];

  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Section Header - Enhanced with design theory: hierarchy, emphasis */}
      <motion.div 
        className="flex items-center justify-between mb-8"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3">
          <motion.div 
            className="relative"
            animate={{ 
              boxShadow: [
                "0 0 0 0 rgba(239, 68, 68, 0.4)",
                "0 0 20px 5px rgba(239, 68, 68, 0.2)",
                "0 0 0 0 rgba(239, 68, 68, 0.4)"
              ]
            }
            }
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="w-3 h-3 rounded-full bg-red-500" />
          </motion.div>
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-red-500" />
            <h2 className="text-caption text-foreground font-bold font-serif">
              শীর্ষ খবর
            </h2>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-muted-foreground">
          <TrendingUp className="w-4 h-4" />
          <span className="text-[12px] font-medium font-serif">এখন ট্রেন্ডিং</span>
        </div>
      </motion.div>
      
      {/* Headlines Carousel - Repetition with variation */}
      <motion.div 
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 no-scrollbar snap-x snap-mandatory cursor-grab active:cursor-grabbing w-full"
        variants={containerVariants}
      >
        {displayHeadlines.map((item, index) => (
          <motion.div
            key={`${item.id}-${index}`}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ 
              duration: 0.6, 
              delay: index * 0.15,
              ease: [0.16, 1, 0.3, 1]
            }}
          >
            <HeadlineCard news={item} index={index} />
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
};

export default HeadlineSlider;
