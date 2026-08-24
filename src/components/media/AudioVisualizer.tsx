"use client";

import React, { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  getVisualizerData: () => Uint8Array | null;
  isActive: boolean;
  className?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  getVisualizerData,
  isActive,
  className = ""
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const midY = height / 2;

    // If inactive, draw static baseline and exit immediately (Zero CPU/GPU cost)
    if (!isActive) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      ctx.clearRect(0, 0, width, height);
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.strokeStyle = "rgba(113, 113, 122, 0.4)"; // muted static line
      ctx.lineWidth = 1.5;
      ctx.stroke();
      return;
    }

    // When active: lightweight low-overhead curve render (16 sample bins)
    const pointsCount = 16;
    const sliceWidth = width / (pointsCount - 1);

    const render = () => {
      const freqData = getVisualizerData();
      ctx.clearRect(0, 0, width, height);

      ctx.beginPath();
      ctx.moveTo(0, midY);

      let prevX = 0;
      let prevY = midY;

      for (let i = 0; i < pointsCount; i++) {
        const x = i * sliceWidth;
        let normVal = 0;

        if (freqData && freqData.length > 0) {
          const step = Math.floor(freqData.length / pointsCount) || 1;
          const val = freqData[i * step] || 0;
          normVal = val / 255;
        }

        // Lightweight amplitude calculation
        const offset = (normVal * (height * 0.42)) * (i % 2 === 0 ? 1 : -1);
        const y = Math.max(3, Math.min(height - 3, midY + offset));

        const cpX = (prevX + x) / 2;
        const cpY = (prevY + y) / 2;
        ctx.quadraticCurveTo(prevX, prevY, cpX, cpY);

        prevX = x;
        prevY = y;
      }

      ctx.lineTo(width, midY);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#10b981"; // Emerald clean stroke without heavy blur
      ctx.stroke();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [getVisualizerData, isActive]);

  return (
    <div className={`w-full ${className}`}>
      <canvas
        ref={canvasRef}
        width={240}
        height={32}
        className="w-full h-8 rounded-lg bg-background/50 border border-border/70 block"
      />
    </div>
  );
};

export default AudioVisualizer;
