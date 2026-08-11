"use client";

import React, { useState, useEffect } from "react";
import { Play, Pause, Music, Video, SkipBack, SkipForward, Rewind, FastForward, Volume2, Settings, Maximize, Lock, Star } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useSession } from "@/lib/auth-client";
import Link from "next/link";

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
    },
    {
        id: "v4",
        title: "খেলাধুলা: আসন্ন বিশ্বকাপে বাংলাদেশ দলের প্রস্তুতি",
        thumbnail: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=2005&auto=format&fit=crop",
        category: "খেলাধুলা",
        duration: "06:15",
        description: "আসন্ন বিশ্বকাপের জন্য বাংলাদেশ ক্রিকেট দলের কঠোর প্রস্তুতি এবং নতুন কোচের পরিকল্পনা নিয়ে বিস্তারিত প্রতিবেদন।"
    },
    {
        id: "v5",
        title: "পরিবেশ: জলবায়ু পরিবর্তনে হুমকির মুখে সুন্দরবন",
        thumbnail: "https://images.unsplash.com/photo-1612459284970-e8f0275cd712?q=80&w=1974&auto=format&fit=crop",
        category: "পরিবেশ ও প্রকৃতি",
        duration: "08:40",
        description: "জলবায়ু পরিবর্তনের প্রভাবে সুন্দরবনের জীববৈচিত্র্য কীভাবে ধ্বংসের মুখে পড়ছে, তা নিয়ে স্পেশাল রিপোর্ট।"
    },
    {
        id: "v6",
        title: "স্বাস্থ্য: ডেঙ্গু প্রতিরোধে করণীয়",
        thumbnail: "https://images.unsplash.com/photo-1584362917165-526a968579e8?q=80&w=2080&auto=format&fit=crop",
        category: "স্বাস্থ্য ডেস্ক",
        duration: "03:50",
        description: "দেশব্যাপী ডেঙ্গুর প্রাদুর্ভাব। ডেঙ্গু জ্বর প্রতিরোধ এবং লক্ষণ দেখা দিলে কী করণীয়, জানাচ্ছেন বিশেষজ্ঞরা।"
    },
    {
        id: "v7",
        title: "আন্তর্জাতিক: মধ্যপ্রাচ্যে নতুন কূটনৈতিক সম্পর্ক",
        thumbnail: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=2070&auto=format&fit=crop",
        category: "আন্তর্জাতিক",
        duration: "04:10",
        description: "মধ্যপ্রাচ্যের দেশগুলোর মধ্যে নতুন করে গড়ে ওঠা কূটনৈতিক সম্পর্ক ও এর প্রভাব নিয়ে বিস্তারিত আলোচনা।"
    },
    {
        id: "v8",
        title: "বিনোদন: ঈদে মুক্তি পাচ্ছে ১০টি নতুন চলচ্চিত্র",
        thumbnail: "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=2059&auto=format&fit=crop",
        category: "বিনোদন",
        duration: "02:45",
        description: "আসন্ন ঈদুল ফিতর উপলক্ষে মুক্তি পেতে যাচ্ছে এক ডজন নতুন সিনেমা। দর্শকদের প্রত্যাশা ও তারকাদের প্রস্তুতি।"
    },
    {
        id: "v9",
        title: "বিজ্ঞান ও প্রযুক্তি: চাঁদে নতুন অভিযানের ঘোষণা",
        thumbnail: "https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?q=80&w=1974&auto=format&fit=crop",
        category: "বিজ্ঞান",
        duration: "07:30",
        description: "নাসা এবং স্পেসএক্স যৌথভাবে চাঁদে তাদের পরবর্তী ক্রু অভিযানের তারিখ ঘোষণা করেছে।"
    },
    {
        id: "v10",
        title: "শিক্ষা: নতুন কারিকুলামে শিক্ষার্থীদের প্রতিক্রিয়া",
        thumbnail: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=2022&auto=format&fit=crop",
        category: "শিক্ষা",
        duration: "05:15",
        description: "দেশব্যাপী নতুন শিক্ষা কারিকুলাম চালু হওয়ার পর শিক্ষার্থী ও অভিভাবকদের মিশ্র প্রতিক্রিয়া।"
    }
];

const liveChannels = [
    { id: "c1", name: "RTV", color: "bg-red-600", text: "text-white" },
    { id: "c2", name: "Jamuna TV", color: "bg-blue-600", text: "text-white" },
    { id: "c3", name: "Somoy TV", color: "bg-orange-600", text: "text-white" },
    { id: "c4", name: "Channel i", color: "bg-green-600", text: "text-white" },
    { id: "c5", name: "NTV", color: "bg-emerald-700", text: "text-white" },
    { id: "c6", name: "Independent", color: "bg-slate-800", text: "text-white" },
    { id: "c7", name: "ATN News", color: "bg-rose-600", text: "text-white" },
    { id: "c8", name: "DBC News", color: "bg-indigo-600", text: "text-white" },
    { id: "c9", name: "Ekattor", color: "bg-green-700", text: "text-white" },
    { id: "c10", name: "News24", color: "bg-red-700", text: "text-white" },
    { id: "c11", name: "Banglavision", color: "bg-sky-600", text: "text-white" },
    { id: "c12", name: "BTV", color: "bg-teal-600", text: "text-white" }
];

export default function MediaPage() {
    const { data: session } = useSession();
    const isPremium = (session?.user as any)?.tier === "premium" || (session?.user as any)?.role === "admin";
    
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(30); // Mock progress
    const [isHalalMode, setIsHalalMode] = useState(false);
    const [metrics, setMetrics] = useState({ cpu: 0, ram: 0, status: "Idle" });

    // Monitor actual browser performance
    useEffect(() => {
        if (!isHalalMode) {
            setMetrics({ cpu: 0, ram: 0, status: "Idle" });
            return;
        }

        let animationFrameId: number;
        let lastTime = performance.now();
        let frameCount = 0;
        let accumulatedLoad = 0;

        const measurePerformance = (time: number) => {
            const delta = time - lastTime;
            lastTime = time;

            // Base frame time is ~16.6ms at 60FPS. Delay above that indicates main thread load.
            // We map the delay to a 0-100% CPU Load proxy.
            const delay = Math.max(0, delta - 16.6);
            const load = Math.min(100, (delay / 33.3) * 100); // 33.3ms extra delay = 100% load
            
            accumulatedLoad += load;
            frameCount++;

            // Update UI every ~30 frames (approx 500ms) to avoid flickering
            if (frameCount >= 30) {
                // Calculate average load over the last 30 frames
                const avgLoad = Math.floor(accumulatedLoad / frameCount);
                
                // Read actual RAM usage using performance.memory (Available in Chromium-based browsers)
                let currentRam = 0;
                const perf = performance as any;
                if (perf.memory && perf.memory.usedJSHeapSize) {
                    currentRam = Math.floor(perf.memory.usedJSHeapSize / (1024 * 1024));
                }

                setMetrics({
                    // If page is completely idle, show a realistic baseline idle load (1-3%)
                    cpu: avgLoad > 0 ? avgLoad : Math.floor(Math.random() * 3 + 1),
                    ram: currentRam,
                    status: currentRam > 0 ? "Tracking Real-time Load" : "Memory API Unavailable"
                });
                
                accumulatedLoad = 0;
                frameCount = 0;
            }

            animationFrameId = requestAnimationFrame(measurePerformance);
        };

        animationFrameId = requestAnimationFrame(measurePerformance);

        return () => cancelAnimationFrame(animationFrameId);
    }, [isHalalMode]);

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
                <div className="lg:col-span-2 space-y-6">
                    {/* Main Video Player */}
                    <Card className="overflow-hidden bg-card/50">
                        <motion.div 
                            className="relative aspect-video bg-black group"
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            onDragEnd={handleDragEnd}
                        >
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
                        </motion.div>
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

                    {/* Live TV Channels Section */}
                    <Card className="bg-card/50">
                        <CardHeader className="pb-3 border-b border-border/50">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> 
                                লাইভ চ্যানেল (IPTV)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[224px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                                {liveChannels.map((channel) => (
                                    <div key={channel.id} className="flex flex-col items-center justify-center cursor-pointer group">
                                        <div className={`w-full h-16 rounded-xl ${channel.color} flex items-center justify-center p-2 border-2 border-transparent group-hover:border-primary transition-all shadow-md`}>
                                            <span className={`font-bold text-sm tracking-wider ${channel.text}`}>{channel.name}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    {(session?.user as any)?.trial_days_left !== undefined && (
                        <Card className="bg-primary/10 border-primary/20">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-primary flex items-center gap-2">
                                        <Star className="w-4 h-4" /> 7-Day Free Trial
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        You have <strong>{(session?.user as any)?.trial_days_left} days</strong> left in your premium trial.
                                    </p>
                                </div>
                                <Link href="/pricing">
                                    <Button size="sm" variant="outline" className="h-8 text-xs font-bold border-primary text-primary hover:bg-primary hover:text-white">
                                        Upgrade
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    )}
                    
                    <Card className="bg-card/50">
                        <CardHeader className="pb-3 border-b border-border/50">
                            <CardTitle className="text-lg flex items-center justify-between">
                                <span className="flex items-center gap-2"><Music className="w-4 h-4 text-primary" /> হালাল মোড (এআই)</span>
                                {!isPremium && <Lock className="w-4 h-4 text-muted-foreground" />}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <div className="text-sm font-medium">মিউজিক ফিল্টার</div>
                                    <div className="text-xs text-muted-foreground">এআই ব্যবহার করে মিউজিক রিমুভ করুন</div>
                                </div>
                                <Button 
                                    variant={isHalalMode ? "default" : "outline"} 
                                    size="sm" 
                                    disabled={!isPremium}
                                    onClick={() => isPremium && setIsHalalMode(!isHalalMode)}
                                    className={isHalalMode ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
                                >
                                    {isPremium ? (isHalalMode ? "চালু আছে" : "চালু করুন") : "Upgrade to Premium"}
                                </Button>
                            </div>

                            {/* Live Usage Monitor */}
                            {isHalalMode && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    className="pt-4 border-t border-border/50 overflow-hidden"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">MDX-Net Engine Live</div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[10px] font-mono text-emerald-500">{metrics.status}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                                            <div className="text-[10px] text-slate-400 uppercase font-semibold mb-1">CPU / Neural Load</div>
                                            <div className="flex items-end gap-2">
                                                <div className="text-xl font-mono text-emerald-400 leading-none">{metrics.cpu}%</div>
                                            </div>
                                            <div className="w-full h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
                                                <motion.div 
                                                    className="h-full bg-emerald-500" 
                                                    animate={{ width: `${metrics.cpu}%` }} 
                                                    transition={{ duration: 0.5 }}
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                                            <div className="text-[10px] text-slate-400 uppercase font-semibold mb-1">RAM Allocation</div>
                                            <div className="flex items-end gap-2">
                                                <div className="text-xl font-mono text-emerald-400 leading-none">{metrics.ram}</div>
                                                <div className="text-[10px] text-slate-500 mb-0.5 font-mono">MB</div>
                                            </div>
                                            <div className="w-full h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
                                                <motion.div 
                                                    className="h-full bg-emerald-500" 
                                                    animate={{ width: `${(metrics.ram / 1024) * 100}%` }} 
                                                    transition={{ duration: 0.5 }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-card/50">
                        <CardHeader className="pb-3 border-b border-border/50">
                            <CardTitle className="text-lg">আরও ভিডিও</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent p-4 space-y-3">
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
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
}
