"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

type SmoothSummaryStackProps = {
  summary: ReactNode;
  below: ReactNode;
};

/**
 * When the summary block above changes height, the content below (charts, etc.) would
 * jump instantly. We measure the top block with ResizeObserver and apply a short FLIP
 * transform so vertical movement eases in.
 */
export function SmoothSummaryStack({
  summary,
  below,
}: SmoothSummaryStackProps) {
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevTopHeight = useRef<number | null>(null);

  useLayoutEffect(() => {
    const top = topRef.current;
    const bottom = bottomRef.current;
    if (!top || !bottom) {
      return;
    }

    const runFlip = () => {
      const newH = top.getBoundingClientRect().height;
      const oldH = prevTopHeight.current;
      prevTopHeight.current = newH;

      if (oldH === null) {
        return;
      }

      const delta = newH - oldH;
      if (Math.abs(delta) < 1) {
        return;
      }

      bottom.style.transition = "none";
      bottom.style.transform = `translateY(${-delta}px)`;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          bottom.style.transition =
            "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)";
          bottom.style.transform = "translateY(0)";
        });
      });
    };

    const ro = new ResizeObserver(() => {
      runFlip();
    });
    ro.observe(top);
    runFlip();

    return () => {
      ro.disconnect();
      bottom.style.transition = "";
      bottom.style.transform = "";
      prevTopHeight.current = null;
    };
  }, []);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div ref={topRef} className="min-h-0 shrink-0">
        {summary}
      </div>
      <div
        ref={bottomRef}
        className="flex min-w-0 flex-col gap-4 will-change-transform"
      >
        {below}
      </div>
    </div>
  );
}
