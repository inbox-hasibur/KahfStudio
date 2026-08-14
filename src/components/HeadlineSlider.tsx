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
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;

    let isDown = false;
    let startX: number;
    let scrollLeft: number;

    const interval = setInterval(() => {
      if (isDown) return; // Don't auto-slide if user is dragging
      const maxScrollLeft = slider.scrollWidth - slider.clientWidth;
      if (slider.scrollLeft >= maxScrollLeft - 10) {
        slider.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        slider.scrollBy({ left: slider.clientWidth > 480 ? 480 + 24 : 340 + 24, behavior: 'smooth' }); // card width + gap
      }
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Section Header - Harmonious scale */}
      <motion.div 
        className="flex items-center justify-between mb-4 sm:mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-2 sm:gap-2.5">
          <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          <h2 className="text-sm sm:text-base md:text-xl font-serif font-bold text-foreground tracking-tight">শীর্ষ খবর</h2>
        </div>
      </motion.div>
      
      {/* Headlines Carousel - Repetition with variation */}
      <motion.div 
        ref={sliderRef}
        className="flex gap-4 sm:gap-6 overflow-x-auto pb-2 sm:pb-3 no-scrollbar snap-x snap-mandatory cursor-grab active:cursor-grabbing"
        variants={containerVariants}
      >
        {headlines.map((item, index) => (
          <motion.div
            key={item.id}
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
