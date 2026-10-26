import { useEffect, useRef } from "react";

interface Props {
  height?: number;
  color?: string;
  speed?: number;
  glow?: boolean;
  className?: string;
}

/**
 * Animated ECG line on canvas. Continuously scrolls left.
 * Beats are realistic P-Q-R-S-T waveforms with neon coral glow.
 */
export const EcgCanvas = ({ height = 220, color = "#ff2d55", speed = 1.4, glow = true, className }: Props) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let offset = 0;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const w = canvas.parentElement?.clientWidth ?? window.innerWidth;
      canvas.width = w * dpr;
      canvas.height = height * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = height + "px";
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    // Single-beat shape over a 200px window
    const beat = (x: number) => {
      const t = ((x % 200) + 200) % 200;
      // baseline
      let y = 0;
      // P wave (bump)
      if (t > 20 && t < 40) y -= Math.sin(((t - 20) / 20) * Math.PI) * 10;
      // Q dip
      if (t >= 60 && t < 70) y += (t - 60) * 1.4;
      // R spike
      if (t >= 70 && t < 80) y -= (t - 70) * 9;
      // S dip
      if (t >= 80 && t < 92) y += (92 - t) * -3 + 40;
      // T wave
      if (t > 110 && t < 150) y -= Math.sin(((t - 110) / 40) * Math.PI) * 16;
      return y;
    };

    const draw = () => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      // baseline grid (very subtle)
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      for (let gx = 0; gx < w; gx += 40) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
      }
      for (let gy = 0; gy < h; gy += 40) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
      }

      const midY = h / 2;
      ctx.beginPath();
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = color;
      if (glow) {
        ctx.shadowBlur = 22;
        ctx.shadowColor = color;
      }
      for (let x = 0; x <= w; x += 1) {
        const y = midY + beat(x + offset);
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      offset += speed;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [color, height, speed, glow]);

  return <canvas ref={ref} className={className} />;
};
