"use client";

import { useEffect, useState, useMemo, useCallback } from "react";

const WaveformVisualizer = () => {
  const [bars, setBars] = useState<number[]>([]);

  const barCount = useMemo(() => 50, []);

  const updateBars = useCallback(() => {
    setBars((prev) => {
      if (prev.length === 0) {
        return Array.from({ length: barCount }, () => Math.random() * 100);
      }
      return prev.map((prevHeight) => {
        const change = (Math.random() - 0.5) * 30;
        const newHeight = Math.max(10, Math.min(100, prevHeight + change));
        return newHeight;
      });
    });
  }, [barCount]);

  useEffect(() => {
    updateBars();

    const interval = setInterval(updateBars, 150);

    return () => clearInterval(interval);
  }, [updateBars]);

  return (
    <div className="flex items-center justify-center gap-1 h-32 px-4" role="img" aria-label="Animated waveform visualization">
      {bars.map((height, i) => (
        <div
          key={i}
          className="w-1 bg-primary rounded-full transition-all duration-150 ease-out"
          style={{
            height: `${height}%`,
            opacity: 0.4 + (height / 100) * 0.6,
          }}
        />
      ))}
    </div>
  );
};

export default WaveformVisualizer;
