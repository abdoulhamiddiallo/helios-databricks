import { useEffect, useRef } from "react";
import { useSize } from "@/hooks/use-size";

/**
 * Magnétopause selon le modèle de Shue et al. (1998) :
 * r0 = (10,22 + 1,29 · tanh(0,184 · (Bz + 8,14))) · Pdyn^(-1/6,6)   (rayons terrestres)
 * r(θ) = r0 · (2 / (1 + cos θ))^α,  α = (0,58 − 0,007 · Bz) · (1 + 0,024 · ln Pdyn)
 */
export function shue(bz: number, p: number) {
  const pd = Math.max(p, 0.1);
  const r0 = (10.22 + 1.29 * Math.tanh(0.184 * (bz + 8.14))) * Math.pow(pd, -1 / 6.6);
  const alpha = (0.58 - 0.007 * bz) * (1 + 0.024 * Math.log(pd));
  return { r0, alpha, r: (theta: number) => r0 * Math.pow(2 / (1 + Math.cos(theta)), alpha) };
}

interface Particle { x: number; y: number; vx: number; vy: number; life: number }

/** Scène animée : le vent solaire mesuré frappe la magnétosphère terrestre, à l'échelle du modèle de Shue. */
export function MagnetosphereScene({ speed, bz, pressure, kp, height = 380 }: {
  speed: number; bz: number; pressure: number; kp: number; height?: number;
}) {
  const [box, { width }] = useSize<HTMLDivElement>();
  const canvas = useRef<HTMLCanvasElement>(null);
  const params = useRef({ speed, bz, pressure, kp });
  params.current = { speed, bz, pressure, kp };

  useEffect(() => {
    const c = canvas.current;
    if (!c || width === 0) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = width * dpr;
    c.height = height * dpr;
    const g = c.getContext("2d")!;
    g.scale(dpr, dpr);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const ex = width * 0.66, ey = height * 0.55;
    const k = Math.min(width * 0.0145, height * 0.034); // pixels par rayon terrestre
    const stars = Array.from({ length: 140 }, () => ({ x: Math.random() * width, y: Math.random() * height, a: Math.random() * 0.6 + 0.1, s: Math.random() < 0.1 ? 1.4 : 0.8 }));
    const parts: Particle[] = [];
    const spawn = (x?: number) => ({ x: x ?? -10, y: Math.random() * height, vx: 0, vy: 0, life: 1 });
    for (let i = 0; i < 650; i++) parts.push(spawn(Math.random() * width));
    let raf = 0, t = 0, last = performance.now();

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t += dt;
      const { speed: v, bz: b, pressure: p, kp: kpv } = params.current;
      const m = shue(b, p);
      const south = b < 0;
      const windColor = b <= -10 ? "255,59,59" : south ? "255,138,61" : "45,212,191";

      g.clearRect(0, 0, width, height);
      // fond
      const bg = g.createLinearGradient(0, 0, width, 0);
      bg.addColorStop(0, "#160b05");
      bg.addColorStop(0.35, "#070b16");
      bg.addColorStop(1, "#04060d");
      g.fillStyle = bg;
      g.fillRect(0, 0, width, height);
      for (const s of stars) {
        g.fillStyle = `rgba(255,255,255,${s.a})`;
        g.fillRect(s.x, s.y, s.s, s.s);
      }

      // Soleil, hors cadre à gauche
      const sr = height * 0.9;
      const sun = g.createRadialGradient(-sr * 0.55, ey, sr * 0.2, -sr * 0.55, ey, sr * 1.15);
      sun.addColorStop(0, "rgba(255,231,163,1)");
      sun.addColorStop(0.45, "rgba(255,138,61,0.9)");
      sun.addColorStop(0.62, "rgba(242,96,58,0.35)");
      sun.addColorStop(1, "rgba(242,96,58,0)");
      g.fillStyle = sun;
      g.fillRect(0, 0, width * 0.45, height);

      // vent solaire
      const pxSpeed = 40 + v * 0.22;
      for (const q of parts) {
        q.vx = pxSpeed;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        q.vy *= 0.96;
        const dx = (q.x - ex) / k, dy = (q.y - ey) / k;
        const r = Math.hypot(dx, dy);
        const theta = Math.atan2(Math.abs(dy), -dx);
        const rb = theta < 2.6 ? m.r(theta) * 1.18 : Infinity;
        if (r < rb && dx < 6) {
          const nx = dx / r, ny = dy / r;
          q.x = ex + nx * rb * k;
          q.y = ey + ny * rb * k;
          q.vy += (dy >= 0 ? 1 : -1) * pxSpeed * 0.9;
        }
        if (q.x > width + 10 || q.y < -10 || q.y > height + 10) Object.assign(q, spawn());
        const alpha = Math.min(1, q.x / (width * 0.15));
        g.strokeStyle = `rgba(${windColor},${0.75 * alpha})`;
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(q.x, q.y);
        g.lineTo(q.x - Math.max(6, pxSpeed * 0.05), q.y - q.vy * 0.05);
        g.stroke();
      }

      // onde de choc et magnétopause
      const curve = (scale: number, color: string, w: number, dash: number[]) => {
        g.beginPath();
        for (let th = -2.5; th <= 2.5; th += 0.02) {
          const rr = m.r(Math.abs(th)) * scale;
          const x = ex - Math.cos(th) * rr * k, y = ey + Math.sin(th) * rr * k;
          th === -2.5 ? g.moveTo(x, y) : g.lineTo(x, y);
        }
        g.strokeStyle = color;
        g.lineWidth = w;
        g.setLineDash(dash);
        g.stroke();
        g.setLineDash([]);
      };
      curve(1.3, "rgba(238,243,251,0.25)", 1.5, [4, 6]);
      const glow = 0.55 + 0.25 * Math.sin(t * 2);
      curve(1, `rgba(45,212,191,${glow})`, 2.4, []);

      // lignes de champ fermées et queue magnétique
      g.strokeStyle = "rgba(139,92,246,0.35)";
      g.lineWidth = 1;
      for (const L of [3, 5.5, 8]) {
        const comp = Math.min(L, m.r0 * 0.8) / L;
        g.beginPath();
        for (let lat = -80; lat <= 80; lat += 2) {
          const la = (lat * Math.PI) / 180;
          const rr = L * Math.cos(la) ** 2;
          const x = ex - rr * Math.cos(la) * k * comp, y = ey - rr * Math.sin(la) * k;
          lat === -80 ? g.moveTo(x, y) : g.lineTo(x, y);
        }
        g.stroke();
        g.beginPath();
        g.moveTo(ex, ey - L * k * 0.5);
        g.bezierCurveTo(ex + L * k, ey - L * k * 0.9, ex + L * 3 * k, ey - L * k * 0.5, width + 20, ey - L * k * 0.35);
        g.moveTo(ex, ey + L * k * 0.5);
        g.bezierCurveTo(ex + L * k, ey + L * k * 0.9, ex + L * 3 * k, ey + L * k * 0.5, width + 20, ey + L * k * 0.35);
        g.stroke();
      }

      // orbite géostationnaire (6,6 rayons terrestres)
      const exposed = m.r0 < 6.6;
      g.beginPath();
      g.arc(ex, ey, 6.6 * k, 0, Math.PI * 2);
      g.strokeStyle = exposed ? "rgba(255,59,59,0.9)" : "rgba(250,204,21,0.45)";
      g.setLineDash([2, 5]);
      g.lineWidth = 1.2;
      g.stroke();
      g.setLineDash([]);
      const sa = t * 0.35;
      g.fillStyle = exposed ? "#FF3B3B" : "#FACC15";
      g.fillRect(ex + Math.cos(sa) * 6.6 * k - 2, ey + Math.sin(sa) * 6.6 * k - 2, 4, 4);

      // Terre
      const er = Math.max(k * 1.3, 12);
      const earth = g.createRadialGradient(ex - er * 0.4, ey - er * 0.3, er * 0.1, ex, ey, er);
      earth.addColorStop(0, "#7cc4ff");
      earth.addColorStop(0.6, "#2563eb");
      earth.addColorStop(1, "#0b2a6b");
      g.fillStyle = earth;
      g.beginPath();
      g.arc(ex, ey, er, 0, Math.PI * 2);
      g.fill();
      // aurores aux pôles, intensité selon le Kp
      const aur = Math.min(1, 0.25 + kpv / 9);
      for (const sgn of [-1, 1]) {
        g.beginPath();
        g.ellipse(ex, ey + sgn * er * 0.92, er * 0.55, er * 0.18, 0, 0, Math.PI * 2);
        g.strokeStyle = `rgba(52,211,153,${aur * (0.6 + 0.4 * Math.sin(t * 3 + sgn))})`;
        g.lineWidth = 2.5;
        g.stroke();
      }

      // étiquettes, avec un contour sombre pour rester lisibles au-dessus des particules
      g.font = "600 12px Segoe UI, sans-serif";
      g.lineJoin = "round";
      const label = g.fillText.bind(g);
      g.fillText = ((txt: string, x: number, y: number) => {
        g.save(); g.lineWidth = 4; g.strokeStyle = "rgba(4,6,13,0.9)"; g.strokeText(txt, x, y); g.restore();
        label(txt, x, y);
      }) as typeof g.fillText;
      g.fillStyle = "rgba(45,212,191,0.95)";
      g.fillText(`Magnétopause · ${m.r0.toFixed(1).replace(".", ",")} RT`, ex - m.r0 * k + 12, ey + m.r0 * k * 0.42);
      g.fillStyle = "rgba(238,243,251,0.55)";
      g.fillText("Onde de choc", ex - m.r0 * 1.3 * k + 8, ey + m.r0 * k * 0.75);
      g.fillStyle = exposed ? "#FF6B6B" : "rgba(250,204,21,0.8)";
      g.fillText("Orbite géostationnaire", ex + 6.6 * k * 0.72 + 6, ey + 6.6 * k * 0.72 + 12);
      g.fillStyle = "rgba(238,243,251,0.75)";
      g.fillText("Terre", ex - 14, ey + er + 16);
      g.fillStyle = `rgba(${windColor},0.95)`;
      g.fillText(`Vent solaire · ${Math.round(v)} km/s`, 18, height - 18);

      g.fillText = label;
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [width, height]);

  return (
    <div ref={box} className="relative w-full overflow-hidden rounded-2xl" style={{ height }}>
      <canvas ref={canvas} style={{ width: "100%", height }} aria-label="Simulation de la magnétosphère terrestre" />
    </div>
  );
}
