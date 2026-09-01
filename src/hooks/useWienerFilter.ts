"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { HalalFilterMode, HalalFilterVariant } from "@/types/halalSound";

export type { HalalFilterMode, HalalFilterVariant };

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
  isContextSuspended: boolean;
  workletNode: AudioWorkletNode | null;
  error: string | null;
  toggleFilter: (enable?: boolean) => Promise<void>;
  setGainDb: (db: number) => void;
  setMode: (m: HalalFilterMode) => void;
  setVariant: (v: HalalFilterVariant) => void;
  getVisualizerData: () => Uint8Array | null;
}

// Global MediaElementSource node cache to eliminate InvalidStateError on stream/channel change
const sourceNodeCache = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();

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
  const [isContextSuspended, setIsContextSuspended] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const lastVideoElRef = useRef<HTMLVideoElement | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const bypassGainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const freqDataRef = useRef<Uint8Array | null>(null);

  // Auto-resume AudioContext on first user gesture (critical for iOS Safari & Android Chrome)
  useEffect(() => {
    const handleUserGesture = async () => {
      if (audioCtxRef.current && (audioCtxRef.current.state as string) === "suspended") {
        try {
          await audioCtxRef.current.resume();
          if ((audioCtxRef.current.state as string) === "running") {
            setIsContextSuspended(false);
          }
        } catch (_) {}
      }
    };

    document.addEventListener("click", handleUserGesture);
    document.addEventListener("touchstart", handleUserGesture);
    return () => {
      document.removeEventListener("click", handleUserGesture);
      document.removeEventListener("touchstart", handleUserGesture);
    };
  }, []);

  // Convert dB to acoustic-calibrated linear gain (DSP uses 0.75 factor for passthrough blend, ML mode uses 1.0 full scale)
  const dbToLinear = useCallback((db: number, targetMode: HalalFilterMode = mode) => {
    const gainFactor = targetMode === "ml" ? 1.0 : 0.75;
    return Math.pow(10, db / 20) * gainFactor;
  }, [mode]);

  // Initialize AudioContext and load vocex-worklet.js
  const initAudioGraph = useCallback(async (videoEl: HTMLVideoElement) => {
    try {
      if (!window.AudioContext) {
        setIsSupported(false);
        throw new Error("Web Audio API is not supported in this browser.");
      }

      // Check if video element changed to safely disconnect previous node reference
      if (sourceNodeRef.current && lastVideoElRef.current !== videoEl) {
        try {
          sourceNodeRef.current.disconnect();
        } catch (_) {}
        sourceNodeRef.current = null;
      }
      lastVideoElRef.current = videoEl;

      let ctx = audioCtxRef.current;
      if (!ctx || ctx.state === "closed") {
        ctx = new (window.AudioContext || (window as any).webkitAudioContext)({
          latencyHint: "interactive"
        });
        audioCtxRef.current = ctx;

        ctx.onstatechange = () => {
          if (audioCtxRef.current) {
            setIsContextSuspended(audioCtxRef.current.state === "suspended");
          }
        };
      }

      if ((ctx.state as string) === "suspended") {
        setIsContextSuspended(true);
        try {
          await ctx.resume();
          if ((ctx.state as string) === "running") {
            setIsContextSuspended(false);
          }
        } catch (_) {}
      } else {
        setIsContextSuspended(false);
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

        // Create or retrieve cached MediaElementSourceNode
        let source = sourceNodeCache.get(videoEl);
        if (!source) {
          try {
            source = ctx.createMediaElementSource(videoEl);
            sourceNodeCache.set(videoEl, source);
          } catch (e: any) {
            console.warn("[useWienerFilter] MediaElementSource creation warning:", e);
          }
        }
        sourceNodeRef.current = source || null;

        const activeSourceNode = sourceNodeRef.current;
        if (!activeSourceNode) throw new Error("Could not create MediaElementSourceNode.");

        // Create Worklet Node
        const workletNode = new AudioWorkletNode(ctx, "vocex-processor", {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [2],
          processorOptions: {
            mode: mode,
            mlVariant: variant,
            gainLinear: dbToLinear(gainDb),
            mlSync: false
          }
        });
        workletNodeRef.current = workletNode;

        // Immediately sync mode & settings with worklet node
        workletNode.port.postMessage({
          type: "UPDATE_SETTINGS",
          mode: mode,
          mlVariant: variant,
          gainLinear: dbToLinear(gainDb)
        });

        // Calibrated Gain Node for Filtered path
        const gainNode = ctx.createGain();
        gainNode.gain.value = dbToLinear(gainDb);
        gainNodeRef.current = gainNode;

        // Bypass Gain Node (for 100% matched native audio when Halal Mode is OFF)
        const bypassGain = ctx.createGain();
        bypassGain.gain.value = 0.0;
        bypassGainRef.current = bypassGain;

        // Routing:
        // Filtered: activeSourceNode -> worklet -> gainNode -> analyser -> destination
        activeSourceNode.connect(workletNode);
        workletNode.connect(gainNode);
        gainNode.connect(analyser);
        analyser.connect(ctx.destination);

        // Bypass: activeSourceNode -> bypassGain -> destination
        activeSourceNode.connect(bypassGain);
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
        type: "UPDATE_SETTINGS",
        gainLinear: linear
      });
    }
  }, [dbToLinear]);

  const setModeCallback = useCallback((m: HalalFilterMode) => {
    const linear = dbToLinear(gainDb, m);
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setValueAtTime(linear, audioCtxRef.current.currentTime);
    }
    if (workletNodeRef.current) {
      workletNodeRef.current.port.postMessage({
        type: "UPDATE_SETTINGS",
        mode: m,
        gainLinear: linear
      });
    }
  }, [dbToLinear, gainDb]);

  const setVariantCallback = useCallback((v: HalalFilterVariant) => {
    if (workletNodeRef.current) {
      workletNodeRef.current.port.postMessage({
        type: "UPDATE_SETTINGS",
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
    isContextSuspended,
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
