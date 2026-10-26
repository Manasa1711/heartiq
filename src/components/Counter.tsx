import { useEffect, useRef, useState } from "react";

export const Counter = ({ to, duration = 1600, suffix = "" }: { to: number; duration?: number; suffix?: string }) => {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0;
    let started = false;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !started) {
        started = true;
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          setN(Math.floor(to * (1 - Math.pow(1 - p, 3))));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      }
    }, { threshold: 0.4 });
    if (ref.current) obs.observe(ref.current);
    return () => { obs.disconnect(); cancelAnimationFrame(raf); };
  }, [to, duration]);
  return <span ref={ref} className="font-mono">{n.toLocaleString()}{suffix}</span>;
};
