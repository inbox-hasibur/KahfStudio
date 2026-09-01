"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { WorkerMessageIn, WorkerMessageOut, WorkletMessageIn, WorkletMessageOut } from "@/types/halalSound";

export interface UseHalalMLEngineOptions {
  workletNode: AudioWorkletNode | null;
  enabled?: boolean;
}

export interface UseHalalMLEngineReturn {
  isModelLoading: boolean;
  isModelReady: boolean;
  mlPrimed: boolean;
  modelStatus: string;
  modelError: string | null;
  backend: string;
  modelProgress: number;
  initEngine: () => Promise<void>;
}

export function useHalalMLEngine({
  workletNode,
  enabled = false
}: UseHalalMLEngineOptions): UseHalalMLEngineReturn {
  const [isModelLoading, setIsModelLoading] = useState<boolean>(false);
  const [isModelReady, setIsModelReady] = useState<boolean>(false);
  const [mlPrimed, setMlPrimed] = useState<boolean>(false);
  const [modelStatus, setModelStatus] = useState<string>("Standby");
  const [modelError, setModelError] = useState<string | null>(null);
  const [backend, setBackend] = useState<string>("webgpu / wasm");
  const [modelProgress, setModelProgress] = useState<number>(0);

  const workerRef = useRef<Worker | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(workletNode);
  const watchdogTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear watchdog timer helper
  const resetWatchdogTimer = useCallback(() => {
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
  }, []);

  // Keep workletNodeRef synchronized with current prop to prevent stale closure bugs
  useEffect(() => {
    workletNodeRef.current = workletNode;
  }, [workletNode]);

  // Initialize ONNX Web Worker
  const initEngine = useCallback(async () => {
    if (workerRef.current || typeof window === "undefined") return;

    try {
      setIsModelLoading(true);
      setModelStatus("Spawning ML Neural Worker...");
      setModelError(null);

      // Create Web Worker pointing to public/workers/vocex-ml-worker.js
      const worker = new Worker("/workers/vocex-ml-worker.js", { type: "module" });
      workerRef.current = worker;

      worker.onmessage = (e) => {
        const { type, payload } = e.data;
        const targetWorklet = workletNodeRef.current;

        if (type === "STATUS") {
          setModelStatus(payload);
        } else if (type === "PROGRESS") {
          setModelProgress(payload.percent || 0);
          setModelStatus(`Downloading ${payload.model}... ${payload.percent || 0}%`);
        } else if (type === "MODEL_READY") {
          setIsModelLoading(false);
          setIsModelReady(true);
          setBackend(payload);
          setModelStatus(`Ready (${payload})`);
          console.log("[Halal ML Engine] ONNX Model Ready:", payload);

          // Action 21B: Switch worklet to 'ml' mode on MODEL_READY and align
          if (targetWorklet) {
            targetWorklet.port.postMessage({ type: "UPDATE_SETTINGS", mode: "ml" });
            targetWorklet.port.postMessage({ type: "VIDEO_START_TIME", time: 0 });
            targetWorklet.port.postMessage({ type: "ML_ALIGN_FORWARD" });
          }
        } else if (type === "MODEL_ERROR") {
          setIsModelLoading(false);
          setModelError(payload);
          setModelStatus("Model Init Failed");
          console.error("[Halal ML Engine] Model Error:", payload);
        } else if (type === "INFER_RESULT") {
          // Action 26A: Reset watchdog timer on valid inference result receipt
          resetWatchdogTimer();

          // Send processed clean PCM audio back to AudioWorkletProcessor
          if (targetWorklet) {
            const transferables: Transferable[] = [];
            if (payload.left && payload.left.buffer) transferables.push(payload.left.buffer);
            if (payload.right && payload.right.buffer) transferables.push(payload.right.buffer);

            const msg = {
              type: "ML_RESULT",
              left: payload.left,
              right: payload.right,
              tag: payload.tag,
              gen: payload.gen,
              adv: payload.adv,
              pos: payload.pos,
              abs: payload.abs,
              cg: payload.cg
            };
            if (transferables.length > 0) {
              targetWorklet.port.postMessage(msg, transferables);
            } else {
              targetWorklet.port.postMessage(msg);
            }
          }
        } else if (type === "NATURE_INFER_RESULT") {
          // Action 26A: Reset watchdog timer on valid nature inference result receipt
          resetWatchdogTimer();

          if (targetWorklet) {
            const transferables: Transferable[] = [];
            if (payload && payload.left && payload.left.buffer) transferables.push(payload.left.buffer);
            if (payload && payload.right && payload.right.buffer) transferables.push(payload.right.buffer);
            const msg = { type: "VOCEX_NATURE_RESULT", payload };
            if (transferables.length > 0) {
              targetWorklet.port.postMessage(msg, transferables);
            } else {
              targetWorklet.port.postMessage(msg);
            }
          }
        }
      };

      // Trigger ONNX model download & session initialization in worker
      worker.postMessage({ type: "INIT" });

    } catch (err: any) {
      console.error("[Halal ML Engine] Failed to initialize ML Worker:", err);
      setIsModelLoading(false);
      setModelError(err.message || "Failed to spawn Web Worker");
      setModelStatus("Worker Error");
    }
  }, [workletNode]);

  // Start 30s watchdog timer on inference request
  const startWatchdogTimer = useCallback(() => {
    if (!watchdogTimerRef.current) {
      watchdogTimerRef.current = setTimeout(() => {
        console.warn("[Halal ML Engine] 30s Watchdog Timeout - Web Worker unresponsive, restarting ML pipeline...");
        resetWatchdogTimer();
        if (workerRef.current) {
          workerRef.current.terminate();
          workerRef.current = null;
        }
        setIsModelReady(false);
        setIsModelLoading(true);
        setModelStatus("Restarting Worker (30s Timeout)...");
        initEngine();
      }, 30000);
    }
  }, [initEngine, resetWatchdogTimer]);

  // Hook into AudioWorklet messages to intercept ML_CHUNK requests & handle priming
  useEffect(() => {
    if (!workletNode) return;

    const handleWorkletMessage = (e: MessageEvent) => {
      const data = e.data;
      if (!data) return;

      // Action 16B & 16C: Listen for VOCEX_ML_READY or ML_READY from worklet
      if (data.type === "VOCEX_ML_READY" || data.type === "ML_READY") {
        setMlPrimed(true);
        if (workletNode) {
          workletNode.port.postMessage({ type: "ML_ALIGN_FORWARD" });
        }
      } else if (data.type === "ML_CHUNK") {
        if (workerRef.current && isModelReady) {
          startWatchdogTimer();
          const transferables: Transferable[] = [];
          if (data.left && data.left.buffer) transferables.push(data.left.buffer);
          if (data.right && data.right.buffer) transferables.push(data.right.buffer);

          const msg = {
            type: "INFER",
            payload: {
              left: data.left,
              right: data.right,
              tag: data.tag || 0,
              gen: data.gen,
              adv: data.adv,
              pos: data.pos,
              abs: data.abs,
              cg: data.cg,
              variant: data.variant || "voice"
            }
          };

          if (transferables.length > 0) {
            workerRef.current.postMessage(msg, transferables);
          } else {
            workerRef.current.postMessage(msg);
          }
        }
      } else if (data.type === "VOCEX_NATURE_CHUNK" || data.type === "NATURE_CHUNK") {
        if (workerRef.current && isModelReady) {
          startWatchdogTimer();
          const payload = data.payload || data;
          const transferables: Transferable[] = [];
          if (payload.left && payload.left.buffer) transferables.push(payload.left.buffer);
          if (payload.right && payload.right.buffer) transferables.push(payload.right.buffer);
          const msg = { type: "NATURE_INFER", payload };
          if (transferables.length > 0) {
            workerRef.current.postMessage(msg, transferables);
          } else {
            workerRef.current.postMessage(msg);
          }
        }
      }
    };

    workletNode.port.addEventListener("message", handleWorkletMessage);
    workletNode.port.start();

    // Action 16A: Send initial VIDEO_START_TIME priming message after worklet activation
    workletNode.port.postMessage({ type: "VIDEO_START_TIME", time: 0 });

    // Action 21A: If model is still warming up, set worklet to DSP mode for immediate sound output
    if (!isModelReady) {
      workletNode.port.postMessage({ type: "UPDATE_SETTINGS", mode: "dsp" });
    }

    return () => {
      workletNode.port.removeEventListener("message", handleWorkletMessage);
    };
  }, [workletNode, isModelReady]);

  // Auto-init when enabled
  useEffect(() => {
    if (enabled && !workerRef.current) {
      initEngine();
    }
  }, [enabled, initEngine]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  return {
    isModelLoading,
    isModelReady,
    mlPrimed,
    modelStatus,
    modelError,
    backend,
    modelProgress,
    initEngine
  };
}

export default useHalalMLEngine;
