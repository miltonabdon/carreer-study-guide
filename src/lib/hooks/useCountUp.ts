"use client";

import { useState, useEffect } from "react";

export function useCountUp(target: number, duration = 650) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (target === 0) {
      setCount(0);
      return;
    }
    const steps = 25;
    const step = Math.max(1, Math.floor(target / steps));
    const interval = duration / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, interval);
    return () => clearInterval(timer);
  }, [target, duration]);

  return count;
}
