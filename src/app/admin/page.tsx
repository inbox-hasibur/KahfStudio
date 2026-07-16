"use client";

import React from "react";
import { motion } from "framer-motion";

export default function AdminDashboard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex-1 flex flex-col items-center justify-center min-h-[60vh]"
    >
      <h1 className="text-4xl font-bold mb-4">Admin Dashboard</h1>
      <p className="text-muted-foreground">
        The full admin panel and layout will be implemented in Module 3.
      </p>
    </motion.div>
  );
}
