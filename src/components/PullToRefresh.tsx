"use client";

import { useState, useRef, useCallback, ReactNode } from "react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  threshold?: number;
}

export default function PullToRefresh({ onRefresh, children, threshold = 64 }: PullToRefreshProps) {
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
      const dampened = Math.min(diff * 0.45, threshold * 1.8);
      setPullDistance(dampened);
    }
  }, [threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullDistance >= threshold) {
      setRefreshing(true);
      setPullDistance(0);
      try {
        await onRefresh();
      } catch {}
      await new Promise((r) => setTimeout(r, 600));
      setRefreshing(false);
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, threshold, onRefresh]);

  const showPill = pullDistance > 10 || refreshing;
  const progress = refreshing ? 1 : Math.min(pullDistance / threshold, 1);
  const rotation = pullDistance * 2.5;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="flex-1 relative"
      style={{ WebkitOverflowScrolling: "touch", overflowY: "auto", overscrollBehaviorY: "contain" }}
    >
      {/* Floating Pill Indicator */}
      {showPill && (
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 20,
            display: "flex",
            justifyContent: "center",
            paddingTop: 10,
            paddingBottom: 10,
            pointerEvents: "none",
            animation: "pill-enter 0.2s ease-out",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "white",
              boxShadow: "0 2px 12px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: refreshing ? "none" : "transform 0.15s ease-out",
              transform: refreshing ? undefined : `scale(${0.5 + progress * 0.5})`,
            }}
          >
            {refreshing ? (
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  border: "2.5px solid #fb923c",
                  borderTopColor: "transparent",
                  animation: "spin 0.7s linear infinite",
                }}
              />
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ea580c"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  transition: "transform 0.15s ease-out",
                  transform: `rotate(${rotation}deg)`,
                  opacity: 0.4 + progress * 0.6,
                }}
              >
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
            )}
          </div>
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}
