"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type HalalFilterMode = "dsp" | "ml";
export type HalalFilterVariant = "voice" | "nature" | "instrumental";

export interface UseWienerFilterOptions {
  videoElement: HTMLVideoElement | null;
  enabled?: boolean;
  mode?: HalalFilterMode;
  variant?: HalalFilterVariant;
  gainDb?: number; // dB boost, default 0dB
}

export interface UseWienerFilterReturn {
  isSupported: boolean;
  isActive: boolean;
  isWorkletLoaded: boolean;
  workletNode: AudioWorkletNode | null;
  error: string | null;
  toggleFilter: (enable?: boolean) => Promise<void>;
  setGainDb: (db: number) => void;
  setMode: (m: HalalFilterMode) => void;
  setVariant: (v: HalalFilterVariant) => void;
  getVisualizerData: () => Uint8Array | null;
}

export function useWienerFilter({
  videoElement,
  enabled = false,
  mode = "dsp",
  variant = "voice",
  gainDb = 0
}: UseWienerFilterOptions): UseWienerFilterReturn {
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isWorkletLoaded, setIsWorkletLoaded] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const bypassGainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const freqDataRef = useRef<Uint8Array | null>(null);

  // Convert dB to acoustic-calibrated linear gain (0.75 factor ensures 1:1 loudness with original bypass)
  const dbToLinear = useCallback((db: number) => {
    return Math.pow(10, db / 20) * 0.75;
  }, []);

  // Initialize AudioContext and load vocex-worklet.js
  const initAudioGraph = useCallback(async (videoEl: HTMLVideoElement) => {
    try {
      if (!window.AudioContext) {
        setIsSupported(false);
        throw new Error("Web Audio API is not supported in this browser.");
      }

      let ctx = audioCtxRef.current;
      if (!ctx || ctx.state === "closed") {
        ctx = new (window.AudioContext || (window as any).webkitAudioContext)({
          latencyHint: "interactive"
        });
        audioCtxRef.current = ctx;
      }

      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      // Load vocex-worklet.js
      if (!workletNodeRef.current) {
        await ctx.audioWorklet.addModule("/worklets/vocex-worklet.js");
        setIsWorkletLoaded(true);

        // Low-latency spectrum analyzer
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 32;
        analyser.smoothingTimeConstant = 0.6;
        analyserRef.current = analyser;
        freqDataRef.current = new Uint8Array(analyser.frequencyBinCount);

        // Create MediaElementSourceNode
        if (!sourceNodeRef.current) {
          try {
            sourceNodeRef.current = ctx.createMediaElementSource(videoEl);
          } catch (e: any) {
            console.warn("[useWienerFilter] MediaElementSource already attached:", e);
          }
        }

        const source = sourceNodeRef.current;
        if (!source) throw new Error("Could not create MediaElementSourceNode.");

        // Create Worklet Node
        const workletNode = new AudioWorkletNode(ctx, "vocex-processor", {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [2],
          processorOptions: {
            mode: mode,
            mlVariant: variant,
            gainLinear: dbToLinear(gainDb)
          }
        });
        workletNodeRef.current = workletNode;

        // Calibrated Gain Node for Filtered path
        const gainNode = ctx.createGain();
        gainNode.gain.value = dbToLinear(gainDb);
        gainNodeRef.current = gainNode;

        // Bypass Gain Node (for 100% matched native audio when Halal Mode is OFF)
        const bypassGain = ctx.createGain();
        bypassGain.gain.value = 0.0;
        bypassGainRef.current = bypassGain;

        // Routing:
        // Filtered: source -> worklet -> gainNode -> analyser -> destination
        source.connect(workletNode);
        workletNode.connect(gainNode);
        gainNode.connect(analyser);
        analyser.connect(ctx.destination);

        // Bypass: source -> bypassGain -> destination
        source.connect(bypassGain);
        bypassGain.connect(ctx.destination);
      }

      return true;
    } catch (err: any) {
      console.error("[useWienerFilter] Error initializing audio graph:", err);
      setError(err.message || "Failed to initialize DSP AudioWorklet");
      return false;
    }
  }, [mode, variant, gainDb, dbToLinear]);

  // Activate / Deactivate filtering with seamless equal-power gain transition
  const setFilterState = useCallback(async (active: boolean) => {
    if (!videoElement) return;

    if (active) {
      const ready = await initAudioGraph(videoElement);
      if (ready && gainNodeRef.current && bypassGainRef.current && audioCtxRef.current) {
        if (audioCtxRef.current.state === "suspended") {
          await audioCtxRef.current.resume();
        }
        const now = audioCtxRef.current.currentTime;
        gainNodeRef.current.gain.setValueAtTime(dbToLinear(gainDb), now);
        bypassGainRef.current.gain.setValueAtTime(0.0, now);
        setIsActive(true);
      }
    } else {
      if (gainNodeRef.current && bypassGainRef.current && audioCtxRef.current) {
        const now = audioCtxRef.current.currentTime;
        gainNodeRef.current.gain.setValueAtTime(0.0, now);
        bypassGainRef.current.gain.setValueAtTime(1.0, now);
        setIsActive(false);
      }
    }
  }, [videoElement, initAudioGraph, dbToLinear, gainDb]);

  useEffect(() => {
    if (videoElement && enabled) {
      setFilterState(true);
    } else {
      setFilterState(false);
    }
  }, [enabled, videoElement, setFilterState]);

  // Update gain smoothly
  const setGainDbCallback = useCallback((db: number) => {
    const linear = dbToLinear(db);
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setValueAtTime(linear, audioCtxRef.current.currentTime);
    }
    if (workletNodeRef.current) {
      workletNodeRef.current.port.postMessage({
        type: "SET_GAIN",
        gainLinear: linear
      });
    }
  }, [dbToLinear]);

  const setModeCallback = useCallback((m: HalalFilterMode) => {
    if (workletNodeRef.current) {
      workletNodeRef.current.port.postMessage({
        type: "SET_MODE",
        mode: m
      });
    }
  }, []);

  const setVariantCallback = useCallback((v: HalalFilterVariant) => {
    if (workletNodeRef.current) {
      workletNodeRef.current.port.postMessage({
        type: "SET_VARIANT",
        mlVariant: v
      });
    }
  }, []);

  const getVisualizerData = useCallback((): Uint8Array | null => {
    if (analyserRef.current && freqDataRef.current && isActive) {
      analyserRef.current.getByteFrequencyData(freqDataRef.current as any);
      return freqDataRef.current;
    }
    return null;
  }, [isActive]);

  const toggleFilter = useCallback(async (forcedEnable?: boolean) => {
    const next = forcedEnable !== undefined ? forcedEnable : !isActive;
    await setFilterState(next);
  }, [isActive, setFilterState]);

  useEffect(() => {
    return () => {
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  return {
    isSupported,
    isActive,
    isWorkletLoaded,
    workletNode: workletNodeRef.current,
    error,
    toggleFilter,
    setGainDb: setGainDbCallback,
    setMode: setModeCallback,
    setVariant: setVariantCallback,
    getVisualizerData
  };
}

export default useWienerFilter;
