"use client";

import React, { useState } from "react";
import { Play, Pause, Music, Video, SkipBack, SkipForward, Rewind, FastForward, Volume2, Settings, Maximize } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const mockVideos = [
  {
    id: "v1",
    title: "স্মার্ট সিটি প্রকল্প: যানজট নিরসনে নতুন উদ্যোগ",
    thumbnail: "https://images.unsplash.com/photo-1590644365607-1c5a519a7a37?q=80&w=2070&auto=format&fit=crop",
    category: "National",
    duration: "04:30",
    description: "রাজধানীর যানজট নিরসনে এবং নাগরিক জীবনযাত্রার মান উন্নয়নে সরকার 'স্মার্ট সিটি' প্রকল্পের নতুন ধাপ উদ্বোধন করেছে। এই প্রকল্পের আওতায় শহরের প্রধান সড়কগুলোতে স্বয়ংক্রিয় ট্রাফিক সিগন্যাল এবং এআই ভিত্তিক মনিটরিং সিস্টেম বসানো হবে। বিস্তারিত জানতে ভিডিওটি সম্পূর্ণ দেখুন।"
  },
  {
    id: "v2",
    title: "প্রযুক্তির বিশ্ব: এআই কীভাবে আমাদের ভবিষ্যৎ বদলাচ্ছে",
    thumbnail: "https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?q=80&w=1974&auto=format&fit=crop",
    category: "প্রযুক্তি ডেস্ক",
    duration: "03:45",
    description: "আর্টিফিশিয়াল ইন্টেলিজেন্স বা কৃত্রিম বুদ্ধিমত্তা আজ শুধুমাত্র কল্পকাহিনীর বিষয় নয়, এটি আমাদের প্রাত্যহিক জীবনের একটি অবিচ্ছেদ্য অংশে পরিণত হয়েছে।"
  },
  {
    id: "v3",
    title: "বিশ্ব অর্থনীতি: মুদ্রাস্ফীতি নিয়ন্ত্রণে নতুন পলিসি",
    thumbnail: "https://images.unsplash.com/photo-1616035252656-78b1ce2f281e?q=80&w=2072&auto=format&fit=crop",
    category: "অর্থনীতি ডেস্ক",
    duration: "05:20",
    description: "বিশ্বব্যাপী ক্রমবর্ধমান মুদ্রাস্ফীতি নিয়ন্ত্রণে কেন্দ্রীয় ব্যাংকগুলো নতুন আর্থিক নীতি গ্রহণ করছে।"
  }
];

export default function MediaPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(30); // Mock progress

  const currentVideo = mockVideos[currentIndex];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % mockVideos.length);
    setIsPlaying(true);
    setProgress(0);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + mockVideos.length) % mockVideos.length);
    setIsPlaying(true);
    setProgress(0);
  };

  const handleDragEnd = (e: any, { offset, velocity }: any) => {
    const swipe = Math.abs(offset.y) * velocity.y;
    if (swipe < -10000) {
      handleNext();
    } else if (swipe > 10000) {
      handlePrev();
    }
  };

  return (
    <main className="max-w-[1200px] mx-auto px-4 pt-28 pb-32">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Video className="w-8 h-8 text-primary" />
          নিউজ <span className="text-primary">মিডিয়া</span>
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          ভিডিও নিউজ দেখুন এবং আমাদের এআই মিউজিক ফিল্টার ব্যবহার করে মিউজিক-মুক্ত (হালাল) খবর শুনুন।
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 overflow-hidden bg-card/50">
          <div className="relative aspect-video bg-black group">
            <img 
              src={currentVideo.thumbnail} 
              alt={currentVideo.title} 
              className={`w-full h-full object-cover transition-opacity ${isPlaying ? 'opacity-50' : 'opacity-80'}`} 
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-16 h-16 rounded-full bg-black/50 border border-white/20 flex items-center justify-center hover:bg-black/80 transition-all"
              >
                {isPlaying ? <Pause className="w-8 h-8 text-white" /> : <Play className="w-8 h-8 text-white ml-1" />}
              </button>
            </div>
            {/* Bottom Controls Bar */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex flex-col gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-full h-1.5 bg-white/30 rounded-full overflow-hidden cursor-pointer">
                <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex items-center justify-between text-white mt-1">
                <div className="flex items-center gap-4">
                  <button className="hover:text-primary transition-colors"><Rewind className="w-4 h-4" /></button>
                  <button onClick={() => setIsPlaying(!isPlaying)} className="hover:text-primary transition-colors">
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button className="hover:text-primary transition-colors"><FastForward className="w-4 h-4" /></button>
                  <span className="text-xs font-medium ml-2">01:12 / {currentVideo.duration}</span>
                </div>
                <div className="flex items-center gap-4">
                  <button className="hover:text-primary transition-colors"><Volume2 className="w-4 h-4" /></button>
                  <button className="hover:text-primary transition-colors"><Settings className="w-4 h-4" /></button>
                  <button className="hover:text-primary transition-colors"><Maximize className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
            <div className="absolute top-4 right-4 bg-red-600 px-2 py-1 rounded text-[10px] font-bold text-white flex items-center gap-1.5 shadow-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
            </div>
          </div>
          <CardHeader>
            <div className="flex justify-between items-start gap-4">
              <div>
                <CardTitle className="text-xl">{currentVideo.title}</CardTitle>
                <CardDescription className="mt-1">{currentVideo.category} • {currentVideo.duration}</CardDescription>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="icon" onClick={handlePrev}><SkipBack className="w-4 h-4" /></Button>
                <Button variant="outline" size="icon" onClick={handleNext}><SkipForward className="w-4 h-4" /></Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{currentVideo.description}</p>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2"><Music className="w-4 h-4 text-primary"/> হালাল মোড</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted border border-border">
                <div className="text-sm font-medium">মিউজিক ছাড়া (এআই)</div>
                <Button variant="outline" size="sm">চালু করুন</Button>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="text-sm font-medium text-primary">অরিজিনাল অডিও</div>
                <Button size="sm">সক্রিয়</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">আরও ভিডিও</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockVideos.map((video, idx) => (
                <div 
                  key={video.id} 
                  className={`flex gap-3 cursor-pointer p-2 rounded-lg transition-colors ${idx === currentIndex ? 'bg-primary/10' : 'hover:bg-muted'}`}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setIsPlaying(true);
                    setProgress(0);
                  }}
                >
                  <div className="w-24 aspect-video rounded overflow-hidden shrink-0 relative">
                    <img src={video.thumbnail} className="w-full h-full object-cover" alt="" />
                    <div className="absolute bottom-1 right-1 bg-black/80 px-1 rounded text-[8px] text-white">{video.duration}</div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium line-clamp-2 leading-tight">{video.title}</h4>
                    <p className="text-[10px] text-muted-foreground mt-1">{video.category}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
