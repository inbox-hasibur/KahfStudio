"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Bell, Zap, ArrowLeft, Filter, AlertTriangle,
  Info, AlertCircle, Clock, ChevronDown
} from "lucide-react";

const ALL_ALERTS = [
  {
    id: "a1",
    title: "Shahbag Intersection Blocked",
    summary: "Protestors gathered at Shahbag intersection; traffic halted completely. Alternative routes via Elephant Road and Science Lab advised. Expect delays of 30-45 minutes.",
    category: "Traffic",
    severity: "high" as const,
    publishedAt: "10 min ago",
    location: "Shahbag, Dhaka",
  },
  {
    id: "a2",
    title: "Power Outage in Rampura",
    summary: "DPDC maintenance work causing power outage in Rampura, Badda, and Hatirpool areas. Expected restoration by 6:00 PM. Keep devices charged.",
    category: "Utility",
    severity: "medium" as const,
    publishedAt: "25 min ago",
    location: "Rampura, Dhaka",
  },
  {
    id: "a3",
    title: "Metro Rail Service Update",
    summary: "Normal operations resume on the Green Line (Uttara-Motijheel) after brief technical delay. All stations operational. Expected ridership increase during evening commute.",
    category: "Transport",
    severity: "low" as const,
    publishedAt: "35 min ago",
    location: "Metro Rail, Dhaka",
  },
  {
    id: "a4",
    title: "Weather Warning: Thunderstorm Expected",
    summary: "BMD has issued a thunderstorm warning for Dhaka, Gazipur, and Narayanganj districts. Wind speeds may reach 60-80 km/h. Seek shelter and avoid open areas.",
    category: "Weather",
    severity: "high" as const,
    publishedAt: "1 hour ago",
    location: "Greater Dhaka",
  },
  {
    id: "a5",
    title: "Water Supply Disruption in Mirpur",
    summary: "WASA emergency repair work will disrupt water supply in Mirpur Zones 6-10 from 2 PM to 8 PM tomorrow. Store water in advance.",
    category: "Utility",
    severity: "medium" as const,
    publishedAt: "2 hours ago",
    location: "Mirpur, Dhaka",
  },
  {
    id: "a6",
    title: "Road Closure: Hatirpool to Dhanmondi",
    summary: "Road construction on Road 27 (Hatirpool-Dhanmondi link road) requires full closure for 3 days starting Monday. Use Satmasjid Road as alternate route.",
    category: "Traffic",
    severity: "medium" as const,
    publishedAt: "3 hours ago",
    location: "Hatirpool, Dhaka",
  },
  {
    id: "a7",
    title: "Health Advisory: Air Quality Alert",
    summary: "Air quality index in Dhaka has reached 'Unhealthy' levels (AQI 165). Sensitive groups should limit outdoor activity. Wear N95 masks if going outside.",
    category: "Health",
    severity: "high" as const,
    publishedAt: "4 hours ago",
    location: "Dhaka City",
  },
  {
    id: "a8",
    title: "Bus Route Change: Route 8",
    summary: "BRTC Bus Route 8 (Gabtoli-Motijheel) temporarily rerouted via Karwan Bazar due to flyover construction. Additional 15 min travel time expected.",
    category: "Transport",
    severity: "low" as const,
    publishedAt: "5 hours ago",
    location: "Gabtoli-Motijheel",
  },
  {
    id: "a9",
    title: "Gas Supply Maintenance in Uttara",
    summary: "Titas Gas conducting scheduled maintenance in Uttara Sectors 4-7. Gas supply may be intermittent from 10 AM to 4 PM on Wednesday.",
    category: "Utility",
    severity: "low" as const,
    publishedAt: "6 hours ago",
    location: "Uttara, Dhaka",
  },
  {
    id: "a10",
    title: "School Closure: Flood Risk in Old Dhaka",
    summary: "Three schools in Old Dhaka's low-lying areas closed tomorrow due to flood risk from heavy rainfall. Affected: Armanitola Govt. High School, Dhaka Collegiate School, and Kazi Nazrul Islam School.",
    category: "Education",
    severity: "high" as const,
    publishedAt: "7 hours ago",
    location: "Old Dhaka",
  },
];

const severityConfig = {
  high: {
    icon: AlertTriangle,
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    badge: "bg-red-500 text-white",
    label: "Urgent",
  },
  medium: {
    icon: AlertCircle,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    badge: "bg-amber-500 text-white",
    label: "Advisory",
  },
  low: {
    icon: Info,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    badge: "bg-blue-500 text-white",
    label: "Info",
  },
};

const categories = ["All", "Traffic", "Transport", "Utility", "Weather", "Health", "Education"];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

export default function AlertsPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeSeverity, setActiveSeverity] = useState<string | null>(null);

  const filteredAlerts = ALL_ALERTS.filter((alert) => {
    const matchesCategory = activeCategory === "All" || alert.category === activeCategory;
    const matchesSeverity = !activeSeverity || alert.severity === activeSeverity;
    return matchesCategory && matchesSeverity;
  });

  const urgentCount = ALL_ALERTS.filter((a) => a.severity === "high").length;

  return (
    <motion.main
      className="max-w-[1000px] mx-auto px-4 md:px-6 pt-28 md:pt-36 pb-40"
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
      <motion.div variants={itemVariants} className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <motion.div
            className="relative w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20"
            animate={{
              boxShadow: [
                "0 0 0 0 rgba(245, 158, 11, 0.4)",
                "0 0 20px 5px rgba(245, 158, 11, 0.2)",
                "0 0 0 0 rgba(245, 158, 11, 0.4)",
              ],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Bell className="w-6 h-6 text-amber-500" />
          </motion.div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">All Alerts</h1>
            <p className="text-muted-foreground text-[14px]">
              {ALL_ALERTS.length} alerts · {urgentCount} urgent
            </p>
          </div>
        </div>
        <p className="text-muted-foreground max-w-[600px]">
          Real-time alerts and updates from across Bangladesh. Stay informed about traffic, weather, utilities, and more.
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="mb-8 space-y-4">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
          {categories.map((cat) => (
            <motion.button
              key={cat}
              className={`px-4 py-2 rounded-full text-[12px] font-semibold transition-all whitespace-nowrap ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </motion.button>
          ))}
        </div>

        {/* Severity Filters */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mr-2">Severity:</span>
          {(["high", "medium", "low"] as const).map((sev) => {
            const config = severityConfig[sev];
            return (
              <motion.button
                key={sev}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all border ${
                  activeSeverity === sev
                    ? `${config.bg} ${config.border} ${config.color}`
                    : "bg-transparent border-border text-muted-foreground hover:text-foreground"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveSeverity(activeSeverity === sev ? null : sev)}
              >
                <config.icon className="w-3 h-3" />
                {config.label}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Alerts List */}
      <motion.div variants={containerVariants} className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredAlerts.map((alert, index) => {
            const config = severityConfig[alert.severity];
            const SeverityIcon = config.icon;

            return (
              <motion.div
                key={alert.id}
                variants={itemVariants}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group"
              >
                <div className={`p-5 rounded-2xl border bg-card transition-all hover:shadow-lg hover:shadow-primary/5 ${config.border}`}>
                  <div className="flex gap-4">
                    {/* Severity Icon */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center`}>
                      <SeverityIcon className={`w-5 h-5 ${config.color}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Top Row: Category, Severity, Time */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-primary/10 text-[10px] font-bold text-primary uppercase tracking-wider">
                            {alert.category}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${config.badge}`}>
                            {config.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span className="text-[10px] font-medium">{alert.publishedAt}</span>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-[16px] font-semibold text-foreground group-hover:text-primary transition-colors mb-1.5">
                        {alert.title}
                      </h3>

                      {/* Summary */}
                      <p className="text-muted-foreground text-[13px] leading-relaxed line-clamp-2 mb-2">
                        {alert.summary}
                      </p>

                      {/* Location */}
                      <span className="text-[11px] text-muted-foreground font-medium">
                        📍 {alert.location}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredAlerts.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-20 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-foreground font-semibold mb-1">No alerts found</p>
            <p className="text-muted-foreground text-[14px]">
              Try adjusting your filters to see more alerts.
            </p>
          </motion.div>
        )}
      </motion.div>
    </motion.main>
  );
}
