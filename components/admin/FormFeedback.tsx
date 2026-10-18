"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function FormFeedback({
  children,
  className,
  error = false,
  submission = 0,
}: {
  children: ReactNode;
  className?: string;
  error?: boolean;
  submission?: number | string;
}) {
  const message = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const element = message.current;
      if (!element) return;
      element.focus({ preventScroll: true });
      element.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [submission]);

  return (
    <div
      ref={message}
      tabIndex={-1}
      role={error ? "alert" : "status"}
      className={`scroll-mt-40 focus:outline-none focus:ring-2 focus:ring-primary/40 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
