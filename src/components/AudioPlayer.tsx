"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, X, Disc3, Mic2 } from "lucide-react";

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
  const [dynamicPlaylist, setDynamicPlaylist] = useState<any[]>([]);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>("");

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const playlist = dynamicPlaylist.length > 0 ? dynamicPlaylist : (newsItems.length > 0 ? newsItems.map(item => ({
    title: item.title || item.headline,
    text: (item.title || item.headline || "") + ". " + (item.ai_summary || item.summary || ""),
  })) : [
    { title: "Demo Audio 1", text: "Welcome to KahfNews. This is a sample text for speech synthesis." },
    { title: "Demo Audio 2", text: "Here is another sample news article read aloud by your browser." }
  ]);

  const currentTrack = playlist[currentIndex];

  // Initialize Voices
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const loadVoices = () => {
      let availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      if (availableVoices.length > 0 && !selectedVoiceURI) {
        const savedURI = localStorage.getItem("kahf-tts-voice");
        if (savedURI && availableVoices.some(v => v.voiceURI === savedURI)) {
          setSelectedVoiceURI(savedURI);
        } else {
          // Try to find a Bengali voice first, fallback to first
          const bnVoice = availableVoices.find(v => v.lang.includes("bn") || v.lang.includes("bn-BD") || v.lang.includes("bn-IN"));
          setSelectedVoiceURI(bnVoice ? bnVoice.voiceURI : availableVoices[0].voiceURI);
        }
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [selectedVoiceURI]);

  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const uri = e.target.value;
    setSelectedVoiceURI(uri);
    localStorage.setItem("kahf-tts-voice", uri);
  };

  // Handle Playback
  useEffect(() => {
    if (!isOpen || !currentTrack || typeof window === "undefined" || !window.speechSynthesis) return;
    
    window.speechSynthesis.cancel();
    setProgress(0);

    const utterance = new SpeechSynthesisUtterance(currentTrack.text);
    if (selectedVoiceURI) {
      const voice = voices.find(v => v.voiceURI === selectedVoiceURI);
      if (voice) utterance.voice = voice;
    }
    
    utterance.volume = isMuted ? 0 : volume;
    utterance.rate = 1.0;

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => handleNext();
    utterance.onpause = () => setIsPlaying(false);
    utterance.onresume = () => setIsPlaying(true);
    
    // Estimate progress based on boundary
    utterance.onboundary = (event) => {
      if (currentTrack.text.length > 0) {
        setProgress(event.charIndex / currentTrack.text.length);
      }
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [currentIndex, isOpen, dynamicPlaylist, selectedVoiceURI]);

  useEffect(() => {
    const handlePlayAudio = (e: any) => {
      const { title, summary } = e.detail;
      const textToPlay = `${title}. ${summary || ''}`;
      
      setDynamicPlaylist([{
        title: title,
        text: textToPlay
      }]);
      setCurrentIndex(0);
      setIsOpen(true);
    };

    const handleOpenSettings = () => {
      setIsOpen(true);
    };

    window.addEventListener('play-audio', handlePlayAudio);
    window.addEventListener('open-audio-settings', handleOpenSettings);
    return () => {
      window.removeEventListener('play-audio', handlePlayAudio);
      window.removeEventListener('open-audio-settings', handleOpenSettings);
    };
  }, []);

  useEffect(() => {
    if (utteranceRef.current) {
      utteranceRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (isPlaying) {
      window.speechSynthesis.pause();
    } else {
      window.speechSynthesis.resume();
    }
  };

  const handleNext = () => {
    if (typeof window !== "undefined") window.speechSynthesis.cancel();
    setCurrentIndex((prev) => (prev + 1) % playlist.length);
  };
  const handlePrev = () => {
    if (typeof window !== "undefined") window.speechSynthesis.cancel();
    setCurrentIndex((prev) => (prev - 1 + playlist.length) % playlist.length);
  };

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
            className="fixed bottom-24 md:bottom-28 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md bg-card/80 backdrop-blur-xl border border-border p-4 rounded-3xl shadow-2xl flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className={`w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary shrink-0 ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}>
                  <Disc3 className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <p className="text-sm font-bold text-foreground truncate">{currentTrack?.title}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                     Native Text-to-Speech
                  </p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 text-muted-foreground hover:bg-muted rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Voice Selection */}
            <div className="flex items-center gap-2 mt-1">
              <Mic2 className="w-4 h-4 text-muted-foreground shrink-0" />
              <select 
                value={selectedVoiceURI} 
                onChange={handleVoiceChange}
                className="w-full text-xs bg-muted/50 border border-border rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-primary truncate"
              >
                {voices.map(v => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-center gap-4 mt-2">
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
