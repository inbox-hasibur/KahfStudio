"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, X, Disc3 } from "lucide-react";
import { Howl } from "howler";

interface AudioPlayerProps {
  storiesCount?: number;
  newsItems?: any[];
}

export default function AudioPlayer({ newsItems = [] }: AudioPlayerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  const howlRef = useRef<Howl | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  const playlist = newsItems.length > 0 ? newsItems.map(item => ({
    title: item.title || item.headline,
    src: `/api/audio/tts?text=${encodeURIComponent(item.title || "")}`,
  })) : [
    { title: "Demo Audio 1", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
    { title: "Demo Audio 2", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" }
  ];

  const currentTrack = playlist[currentIndex];

  useEffect(() => {
    if (!isOpen || !currentTrack) return;
    
    if (howlRef.current) {
      howlRef.current.unload();
    }

    howlRef.current = new Howl({
      src: [currentTrack.src],
      html5: true,
      volume: isMuted ? 0 : volume,
      onplay: () => {
        setIsPlaying(true);
        progressRef.current = setInterval(() => {
          if (howlRef.current) {
            setProgress(howlRef.current.seek() as number / (howlRef.current.duration() || 1));
          }
        }, 1000);
      },
      onpause: () => setIsPlaying(false),
      onend: () => handleNext(),
      onstop: () => setIsPlaying(false),
    });

    howlRef.current.play();

    return () => {
      if (howlRef.current) howlRef.current.unload();
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [currentIndex, isOpen]);

  useEffect(() => {
    if (howlRef.current) howlRef.current.volume(isMuted ? 0 : volume);
  }, [volume, isMuted]);

  const togglePlay = () => {
    if (!howlRef.current) return;
    isPlaying ? howlRef.current.pause() : howlRef.current.play();
  };

  const handleNext = () => setCurrentIndex((prev) => (prev + 1) % playlist.length);
  const handlePrev = () => setCurrentIndex((prev) => (prev - 1 + playlist.length) % playlist.length);

  return (
    <>
      <button 
        id="global-audio-trigger"
        className="hidden"
        onClick={() => setIsOpen(true)}
      />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md bg-card/80 backdrop-blur-xl border border-border p-4 rounded-3xl shadow-2xl flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className={`w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary shrink-0 ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}>
                  <Disc3 className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <p className="text-sm font-bold text-foreground truncate">{currentTrack?.title}</p>
                  <p className="text-xs text-muted-foreground">KahfNews Auto-TTS</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 text-muted-foreground hover:bg-muted rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-4">
              <button onClick={handlePrev} className="p-2 hover:bg-muted rounded-full"><SkipBack className="w-5 h-5" /></button>
              <button onClick={togglePlay} className="p-3 bg-primary text-primary-foreground rounded-full hover:scale-105 transition-transform">
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
              </button>
              <button onClick={handleNext} className="p-2 hover:bg-muted rounded-full"><SkipForward className="w-5 h-5" /></button>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setIsMuted(!isMuted)} className="text-muted-foreground">
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  if (isMuted) setIsMuted(false);
                }}
                className="w-24 h-1 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full"
              />
              <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden ml-2">
                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
