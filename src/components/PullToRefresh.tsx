"use client";

import { useState, useRef, useCallback, ReactNode } from "react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  threshold?: number;
}

export default function PullToRefresh({ onRefresh, children, threshold = 80 }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const el = containerRef.current;
    if (!el || el.scrollTop > 0 || refreshing) return;
    startY.current = e.touches[0].clientY;
    isPulling.current = true;
  }, [refreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current) return;
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) {
      isPulling.current = false;
      setPullDistance(0);
      return;
    }
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      const dampened = Math.min(diff * 0.5, threshold * 1.5);
      setPullDistance(dampened);
    }
  }, [threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullDistance >= threshold) {
      setRefreshing(true);
      setPullDistance(threshold * 0.6);
      try {
        await onRefresh();
      } catch {}
      await new Promise((r) => setTimeout(r, 400));
      setRefreshing(false);
    }
    setPullDistance(0);
  }, [pullDistance, threshold, onRefresh]);

  const spinnerRotation = pullDistance * 3;
  const showIndicator = pullDistance > 10 || refreshing;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="flex-1 overflow-y-auto relative"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <div
        className="flex items-center justify-center overflow-hidden transition-none"
        style={{ height: showIndicator ? pullDistance : 0, opacity: showIndicator ? Math.min(pullDistance / threshold, 1) : 0 }}
      >
        <div
          className="w-7 h-7 border-3 border-orange-400 border-t-transparent rounded-full"
          style={{
            transform: `rotate(${spinnerRotation}deg)`,
            animation: refreshing ? "spin 0.8s linear infinite" : "none",
          }}
        />
      </div>
      <div style={{ transform: `translateY(${showIndicator ? 0 : -pullDistance}px)` }}>
        {children}
      </div>
    </div>
  );
}
