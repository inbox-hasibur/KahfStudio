"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  LayoutGrid, ArrowLeft, ArrowRight, Newspaper
} from "lucide-react";

const CATEGORIES = [
  {
    name: "National",
    description: "Government, policy & national affairs",
    icon: "🏛️",
    count: 156,
    color: "from-blue-500/20 to-blue-600/5",
    borderColor: "border-blue-500/20 hover:border-blue-500/40",
    accentColor: "bg-blue-500",
  },
  {
    name: "Technology",
    description: "AI, startups & digital innovation",
    icon: "💻",
    count: 124,
    color: "from-purple-500/20 to-purple-600/5",
    borderColor: "border-purple-500/20 hover:border-purple-500/40",
    accentColor: "bg-purple-500",
  },
  {
    name: "Sports",
    description: "Cricket, football & athletics",
    icon: "🏏",
    count: 98,
    color: "from-emerald-500/20 to-emerald-600/5",
    borderColor: "border-emerald-500/20 hover:border-emerald-500/40",
    accentColor: "bg-emerald-500",
  },
  {
    name: "Economy",
    description: "Markets, GDP & business",
    icon: "📈",
    count: 87,
    color: "from-amber-500/20 to-amber-600/5",
    borderColor: "border-amber-500/20 hover:border-amber-500/40",
    accentColor: "bg-amber-500",
  },
  {
    name: "Weather",
    description: "Forecasts, alerts & climate",
    icon: "🌧️",
    count: 45,
    color: "from-cyan-500/20 to-cyan-600/5",
    borderColor: "border-cyan-500/20 hover:border-cyan-500/40",
    accentColor: "bg-cyan-500",
  },
  {
    name: "Education",
    description: "Schools, universities & reform",
    icon: "🎓",
    count: 63,
    color: "from-rose-500/20 to-rose-600/5",
    borderColor: "border-rose-500/20 hover:border-rose-500/40",
    accentColor: "bg-rose-500",
  },
  {
    name: "Health",
    description: "Medical, wellness & public health",
    icon: "🏥",
    count: 38,
    color: "from-red-500/20 to-red-600/5",
    borderColor: "border-red-500/20 hover:border-red-500/40",
    accentColor: "bg-red-500",
  },
  {
    name: "Entertainment",
    description: "Film, music & culture",
    icon: "🎬",
    count: 52,
    color: "from-pink-500/20 to-pink-600/5",
    borderColor: "border-pink-500/20 hover:border-pink-500/40",
    accentColor: "bg-pink-500",
  },
  {
    name: "International",
    description: "World news & global affairs",
    icon: "🌍",
    count: 71,
    color: "from-indigo-500/20 to-indigo-600/5",
    borderColor: "border-indigo-500/20 hover:border-indigo-500/40",
    accentColor: "bg-indigo-500",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export default function CategoriesPage() {
  const totalStories = CATEGORIES.reduce((sum, cat) => sum + cat.count, 0);

  return (
    <motion.main
      className="max-w-[1200px] mx-auto px-4 md:px-6 pt-28 md:pt-36 pb-40"
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

      {/* Header */}
      <motion.div variants={itemVariants} className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <LayoutGrid className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Categories</h1>
            <p className="text-muted-foreground text-[14px]">
              {CATEGORIES.length} categories · {totalStories} total stories
            </p>
          </div>
        </div>
        <p className="text-muted-foreground max-w-[600px]">
          Browse news by topic. From national alerts to sports highlights, find exactly what you're looking for.
        </p>
      </motion.div>

      {/* Categories Grid */}
      <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CATEGORIES.map((cat) => (
          <motion.div
            key={cat.name}
            variants={itemVariants}
            whileHover={{ y: -4 }}
            className="group"
          >
            <div className={`p-6 rounded-2xl border bg-card transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-primary/5 ${cat.borderColor}`}>
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-2xl`}>
                  {cat.icon}
                </div>
                <div className={`w-8 h-8 rounded-full bg-muted flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity`}>
                  <ArrowRight className="w-4 h-4 text-foreground" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">{cat.name}</h3>
              <p className="text-[13px] text-muted-foreground mb-4">{cat.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Newspaper className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[12px] font-semibold text-muted-foreground">{cat.count} stories</span>
                </div>
                <div className={`w-2 h-2 rounded-full ${cat.accentColor} opacity-60 group-hover:opacity-100 transition-opacity`} />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.main>
  );
}
