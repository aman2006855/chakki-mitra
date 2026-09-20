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
    if (!el || el.scrollTop > 1 || refreshing) return;
    startY.current = e.touches[0].clientY;
    isPulling.current = true;
  }, [refreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current) return;
    const el = containerRef.current;
    if (!el || el.scrollTop > 1) {
      isPulling.current = false;
      setPullDistance(0);
      return;
    }
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      e.preventDefault();
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
      await new Promise((r) => setTimeout(r, 500));
      setRefreshing(false);
    }
    setPullDistance(0);
  }, [pullDistance, threshold, onRefresh]);

  const showIndicator = pullDistance > 10 || refreshing;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="flex-1 relative"
      style={{ WebkitOverflowScrolling: "touch", overflowY: "auto", overscrollBehaviorY: "contain" }}
    >
      <div
        style={{
          height: showIndicator ? pullDistance : 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: refreshing ? "none" : undefined,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            border: "3px solid #fb923c",
            borderTopColor: "transparent",
            transform: `rotate(${pullDistance * 3}deg)`,
            animation: refreshing ? "spin 0.8s linear infinite" : "none",
          }}
        />
      </div>
      <div>{children}</div>
    </div>
  );
}
