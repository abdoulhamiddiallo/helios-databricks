// Exporter un graphique : image PNG (copiée ou téléchargée) et données CSV.

const BG = "#0a1120";

function svgToCanvas(svg: SVGSVGElement, title: string, subtitle: string, scale = 2): Promise<HTMLCanvasElement> {
  const w = svg.width.baseVal.value || svg.getBoundingClientRect().width;
  const h = svg.height.baseVal.value || svg.getBoundingClientRect().height;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(w));
  clone.setAttribute("height", String(h));
  clone.querySelectorAll("text").forEach((t) => {
    t.setAttribute("font-family", "Segoe UI, Arial, sans-serif");
  });
  const data = new XMLSerializer().serializeToString(clone);
  const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(data);
  const head = 70, foot = 30, pad = 24;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = (w + pad * 2) * scale;
      c.height = (h + head + foot) * scale;
      const g = c.getContext("2d")!;
      g.scale(scale, scale);
      g.fillStyle = BG;
      g.fillRect(0, 0, w + pad * 2, h + head + foot);
      g.fillStyle = "#FF8A3D";
      g.font = "600 11px Segoe UI, Arial";
      g.fillText("HÉLIOS · OBSERVATOIRE DE LA MÉTÉO SPATIALE", pad, 22);
      g.fillStyle = "#EEF3FB";
      g.font = "600 17px Segoe UI, Arial";
      g.fillText(title, pad, 44);
      g.fillStyle = "#8FA0C0";
      g.font = "12px Segoe UI, Arial";
      g.fillText(subtitle.length > 140 ? subtitle.slice(0, 137) + "…" : subtitle, pad, 62);
      g.drawImage(img, pad, head, w, h);
      g.fillStyle = "#5B6B8A";
      g.font = "11px Segoe UI, Arial";
      g.fillText("Sources : NOAA SWPC, NASA CCMC DONKI, GFZ Potsdam, SILSO", pad, head + h + 20);
      resolve(c);
    };
    img.onerror = reject;
    img.src = url;
  });
}

function slug(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/** Copie le graphique dans le presse-papiers ; si le navigateur refuse, le télécharge. Renvoie le mode utilisé. */
export async function exportPng(root: HTMLElement, title: string, subtitle: string, mode: "copy" | "download"): Promise<"copie" | "telechargement" | "aucun"> {
  const svgs = Array.from(root.querySelectorAll("svg")).filter((s) => s.getBoundingClientRect().width > 120) as SVGSVGElement[];
  if (!svgs.length) return "aucun";
  const svg = svgs.reduce((a, b) => (a.getBoundingClientRect().height * a.getBoundingClientRect().width >= b.getBoundingClientRect().height * b.getBoundingClientRect().width ? a : b));
  const canvas = await svgToCanvas(svg, title, subtitle);
  const blob: Blob = await new Promise((r) => canvas.toBlob((b) => r(b!), "image/png"));
  if (mode === "copy" && navigator.clipboard && "ClipboardItem" in window) {
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      return "copie";
    } catch {
      /* repli sur le téléchargement */
    }
  }
  download(blob, `helios-${slug(title)}.png`);
  return "telechargement";
}

export function exportCsv(rows: Record<string, unknown>[], title: string) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : typeof v === "number" ? String(v).replace(".", ",") : String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = "﻿" + [keys.join(";"), ...rows.map((r) => keys.map((k) => esc(r[k])).join(";"))].join("\r\n");
  download(new Blob([csv], { type: "text/csv;charset=utf-8" }), `helios-${slug(title)}.csv`);
}
