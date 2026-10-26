import { useEffect, useRef } from "react";

export const NeuralLoader = ({ size = 240 }: { size?: number }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr; canvas.height = size * dpr;
    canvas.style.width = size + "px"; canvas.style.height = size + "px";
    ctx.scale(dpr, dpr);

    const nodes = Array.from({ length: 18 }, () => ({
      x: Math.random() * size, y: Math.random() * size,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
    }));
    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, size, size);
      // edges
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d = Math.hypot(dx, dy);
          if (d < 90) {
            ctx.strokeStyle = `rgba(0,229,204,${0.35 - d / 260})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke();
          }
        }
      }
      // nodes
      for (const n of nodes) {
        ctx.fillStyle = "#ff2d55";
        ctx.shadowBlur = 12; ctx.shadowColor = "#ff2d55";
        ctx.beginPath(); ctx.arc(n.x, n.y, 2.6, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > size) n.vx *= -1;
        if (n.y < 0 || n.y > size) n.vy *= -1;
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [size]);
  return <canvas ref={ref} className="rounded-full" />;
};
