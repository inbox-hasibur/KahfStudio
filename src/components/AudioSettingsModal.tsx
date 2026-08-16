"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Sliders, Volume2, Cpu, Mic, Check, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface TTSSettings {
  model: string;
  voiceGender: "male" | "female";
  voiceStyle: string;
  speed: number;
  languagePreference: "auto" | "bn" | "en";
}

const DEFAULT_SETTINGS: TTSSettings = {
  model: "gemini-3.1-flash-tts",
  voiceGender: "female",
  voiceStyle: "radio-host",
  speed: 1.0,
  languagePreference: "auto",
};

export default function AudioSettingsModal({ isOpen, onClose }: AudioSettingsModalProps) {
  const [settings, setSettings] = useState<TTSSettings>(DEFAULT_SETTINGS);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("kahf-tts-settings");
    if (saved) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      } catch (e) {
        console.error("Failed to parse TTS settings", e);
      }
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem("kahf-tts-settings", JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent("audio-settings-changed", { detail: settings }));
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  const models = [
    {
      id: "gemini-3.1-flash-tts",
      name: "Gemini 3.1 Flash TTS Preview",
      tag: "Recommended / Default",
      desc: "Ultra-natural expressive voice narration with minimal latency.",
      badge: "Gemini AI",
    },
    {
      id: "gemini-3.5-live-translate",
      name: "Gemini 3.5 Live Translate Preview",
      tag: "Multilingual",
      desc: "Instant cross-language live voice synthesis (70+ languages).",
      badge: "New",
    },
    {
      id: "cloudinary-cdn",
      name: "Cloudinary CDN Stream",
      tag: "Instant Cache",
      desc: "Pre-rendered audio files delivered via worldwide CDN.",
      badge: "Fastest",
    },
    {
      id: "browser-native",
      name: "Device WebSpeech TTS",
      tag: "Offline",
      desc: "Built-in browser synthesis engine as a fast fallback.",
      badge: "Native",
    },
  ];

  const voices = [
    { id: "radio-host", name: "রেডিও উপস্থাপক (Radio Host)", gender: "male", desc: "Energy & Broadcast clarity" },
    { id: "news-anchor", name: "সংবাদ উপস্থাপিকা (News Anchor)", gender: "female", desc: "Warm, professional, soothing" },
    { id: "studio-deep", name: "ডিপ ভয়েস (Studio Deep)", gender: "male", desc: "Deep authoritative documentary tone" },
    { id: "expressive", name: "এক্সপ্রেসিভ (Expressive AI)", gender: "female", desc: "Adaptive natural conversational tone" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-card border border-border rounded-3xl p-6 shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col text-foreground"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    AI Voice & TTS Settings
                  </h3>
                  <p className="text-xs text-muted-foreground">Customize speech synthesis model & narration voice</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto py-4 space-y-6 flex-1 pr-1 custom-scrollbar">
              {/* 1. TTS Model Selection */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-primary" />
                  Gemini TTS Engine Model
                </label>
                <div className="space-y-2.5">
                  {models.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => setSettings({ ...settings, model: m.id })}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between ${
                        settings.model === m.id
                          ? "bg-primary/10 border-primary shadow-lg shadow-primary/10"
                          : "bg-muted/50 border-border hover:border-primary/30 hover:bg-muted"
                      }`}
                    >
                      <div className="space-y-1 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-foreground">{m.name}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              settings.model === m.id
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground border border-border"
                            }`}
                          >
                            {m.badge}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{m.desc}</p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                          settings.model === m.id ? "border-primary bg-primary text-primary-foreground" : "border-border"
                        }`}
                      >
                        {settings.model === m.id && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Voice Character */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <Mic className="w-3.5 h-3.5 text-primary" />
                  Voice Persona & Accent
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {voices.map((v) => (
                    <div
                      key={v.id}
                      onClick={() => setSettings({ ...settings, voiceStyle: v.id, voiceGender: v.gender as any })}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        settings.voiceStyle === v.id
                          ? "bg-primary/10 border-primary"
                          : "bg-muted/50 border-border hover:border-primary/30 hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-foreground">{v.name}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{v.gender}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{v.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Language Behavior */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-primary" />
                  Audio Language Sync
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "auto", label: "Auto (Site Sync)", desc: "Match current website language (BN/EN)" },
                    { id: "bn", label: "বাংলা (BN Only)", desc: "Always play Bengali audio" },
                    { id: "en", label: "English (EN Only)", desc: "Always play English audio" },
                  ].map((lang) => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => setSettings({ ...settings, languagePreference: lang.id as any })}
                      className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        settings.languagePreference === lang.id
                          ? "bg-primary/15 border-primary text-foreground"
                          : "bg-muted/50 border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                      }`}
                    >
                      <span className="text-xs font-bold">{lang.label}</span>
                      <span className="text-[10px] text-muted-foreground mt-1">{lang.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Speed */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Volume2 className="w-3.5 h-3.5 text-primary" />
                    Playback Speed
                  </label>
                  <span className="text-xs font-mono font-bold text-primary">{settings.speed}x</span>
                </div>
                <div className="flex items-center gap-2">
                  {[0.75, 1.0, 1.25, 1.5, 1.75].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => setSettings({ ...settings, speed: spd })}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        settings.speed === spd
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-muted/80"
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-border/80 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-muted-foreground">Settings auto-apply to all players</span>
              <Button
                onClick={handleSave}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 rounded-xl cursor-pointer"
              >
                {savedSuccess ? "Saved ✓" : "Apply Settings"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
