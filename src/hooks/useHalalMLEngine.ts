"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface UseHalalMLEngineOptions {
  workletNode: AudioWorkletNode | null;
  enabled?: boolean;
}

export interface UseHalalMLEngineReturn {
  isModelLoading: boolean;
  isModelReady: boolean;
  modelStatus: string;
  modelError: string | null;
  backend: string;
  initEngine: () => Promise<void>;
}

export function useHalalMLEngine({
  workletNode,
  enabled = false
}: UseHalalMLEngineOptions): UseHalalMLEngineReturn {
  const [isModelLoading, setIsModelLoading] = useState<boolean>(false);
  const [isModelReady, setIsModelReady] = useState<boolean>(false);
  const [modelStatus, setModelStatus] = useState<string>("Standby");
  const [modelError, setModelError] = useState<string | null>(null);
  const [backend, setBackend] = useState<string>("webgpu / wasm");

  const workerRef = useRef<Worker | null>(null);

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

        if (type === "STATUS") {
          setModelStatus(payload);
        } else if (type === "MODEL_READY") {
          setIsModelLoading(false);
          setIsModelReady(true);
          setBackend(payload);
          setModelStatus(`Ready (${payload})`);
          console.log("[Halal ML Engine] ONNX Model Ready:", payload);
        } else if (type === "MODEL_ERROR") {
          setIsModelLoading(false);
          setModelError(payload);
          setModelStatus("Model Init Failed");
          console.error("[Halal ML Engine] Model Error:", payload);
        } else if (type === "INFER_RESULT") {
          // Send processed clean PCM audio back to AudioWorkletProcessor
          if (workletNode) {
            workletNode.port.postMessage({
              type: "ML_RESULT",
              left: payload.left,
              right: payload.right,
              tag: payload.tag
            });
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

  // Hook into AudioWorklet messages to intercept ML_CHUNK requests
  useEffect(() => {
    if (!workletNode) return;

    const handleWorkletMessage = (e: MessageEvent) => {
      const data = e.data;
      if (!data) return;

      // AudioWorklet asks for ML chunk inference
      if (data.type === "ML_CHUNK") {
        if (workerRef.current && isModelReady) {
          workerRef.current.postMessage({
            type: "INFER",
            payload: {
              left: data.left,
              right: data.right,
              tag: data.tag || 0
            }
          });
        }
      }
    };

    workletNode.port.addEventListener("message", handleWorkletMessage);
    workletNode.port.start();

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
    modelStatus,
    modelError,
    backend,
    initEngine
  };
}

export default useHalalMLEngine;
