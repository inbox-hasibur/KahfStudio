"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Play, Square, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function AdminScrapingPage() {
  const [isActive, setIsActive] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-3xl font-bold">Scraping Pipeline & API</h1>
        <p className="text-muted-foreground mt-1">
          Monitor active scrapers, start/stop pipeline, and track API usage.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Pipeline Status
                <span className={`inline-block ml-2 w-3 h-3 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} title={isActive ? 'Active' : 'Inactive'} />
              </CardTitle>
              <CardDescription>Current status of automated cron jobs.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className={`border-green-500/20 hover:bg-green-500/10 ${isActive ? 'text-green-500 bg-green-500/10' : 'text-green-500'}`}
                onClick={() => setIsActive(true)}
              >
                <Play className="w-4 h-4 mr-2" /> Start
              </Button>
              <Button 
                variant="outline" 
                className={`border-red-500/20 hover:bg-red-500/10 ${!isActive ? 'text-red-500 bg-red-500/10' : 'text-red-500'}`}
                onClick={() => setIsActive(false)}
              >
                <Square className="w-4 h-4 mr-2" /> Stop
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
              {isActive ? "Pipeline is running..." : "Pipeline is stopped."}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-primary" />
              API Usage Status
            </CardTitle>
            <CardDescription>Monitor platform-wide API usage limits.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
              API usage charts will be displayed here.
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
