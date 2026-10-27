import { useRef, useState, type ReactNode } from "react";
import { Copy, ImageDown, FileSpreadsheet } from "lucide-react";
import { exportPng, exportCsv } from "@/lib/export";
import { cn } from "@/lib/utils";

export function Panel({ title, subtitle, right, children, className, data }: {
  title?: string; subtitle?: string; right?: ReactNode; children: ReactNode; className?: string;
  /** Données du graphique, pour l'export CSV. */
  data?: Record<string, unknown>[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 2200); };
  const png = async (mode: "copy" | "download") => {
    if (!ref.current || !title) return;
    const r = await exportPng(ref.current, title, subtitle ?? "", mode);
    flash(r === "copie" ? "Image copiée" : r === "telechargement" ? "Image téléchargée" : "Rien à exporter");
  };
  const exportable = Boolean(title);
  return (
    <section className={cn("panel rise group/panel @container relative flex min-w-0 flex-col p-5", className)}>
      {(title || right) && (
        <header className="mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0 flex-[1_1_300px]">
            {title && <h3 className="text-[15px] font-semibold text-ink">{title}</h3>}
            {subtitle && <p className="mt-1 text-[12.5px] leading-snug text-muted">{subtitle}</p>}
          </div>
          <div className="ml-auto flex max-w-full flex-wrap items-start justify-end gap-2">
            {right}
            {exportable && (
              <div className="flex gap-1 opacity-0 transition group-hover/panel:opacity-100 focus-within:opacity-100">
                <IconBtn label="Copier l'image" onClick={() => png("copy")}><Copy size={14} /></IconBtn>
                <IconBtn label="Télécharger en PNG" onClick={() => png("download")}><ImageDown size={14} /></IconBtn>
                {data && data.length > 0 && (
                  <IconBtn label="Télécharger les données (CSV)" onClick={() => { exportCsv(data, title!); flash("Données téléchargées"); }}><FileSpreadsheet size={14} /></IconBtn>
                )}
              </div>
            )}
          </div>
        </header>
      )}
      <div ref={ref} className="min-h-0 flex-1">{children}</div>
      {msg && <div className="absolute right-4 top-14 z-30 rounded-lg bg-aurora px-3 py-1.5 text-[12px] font-semibold text-space">{msg}</div>}
    </section>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button title={label} aria-label={label} onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-lg border border-edge text-muted transition hover:border-sun hover:text-sun">
      {children}
    </button>
  );
}

export function Stat({ label, value, unit, hint, color = "#EEF3FB", small, tint }: {
  label: string; value: string; unit?: string; hint?: string; color?: string; small?: boolean;
  /** Colorer aussi la valeur (réservé aux niveaux d'alerte). */
  tint?: boolean;
}) {
  return (
    <div className="panel rise relative overflow-hidden px-5 py-4">
      <div className="absolute inset-y-4 left-0 w-[3px] rounded-r" style={{ background: color }} />
      <div className="min-h-[2.6em] text-[11px] font-medium uppercase leading-[1.3] tracking-[0.08em] text-muted [text-wrap:balance]">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className={cn("num font-semibold", small ? "text-[22px]" : "text-[30px]")} style={{ color: tint ? color : "#F2F5FA" }}>{value}</span>
        {unit && <span className="text-[13px] text-muted">{unit}</span>}
      </div>
      {hint && <div className="mt-1 text-[11.5px] text-dim">{hint}</div>}
    </div>
  );
}

export function Loading({ height = 220 }: { height?: number }) {
  return (
    <div className="flex items-center justify-center" style={{ height }}>
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-edge border-t-steel" />
    </div>
  );
}

export function Failure({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-flare/40 bg-flare/10 p-4 text-[13px] text-ink">
      <div className="font-semibold text-flare">Données indisponibles</div>
      <div className="mt-1 text-muted">{message}</div>
    </div>
  );
}

export function Chip({ active, children, onClick, color }: { active?: boolean; children: ReactNode; onClick?: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-[12px] font-medium transition",
        active ? "border-transparent text-space" : "border-edge text-muted hover:border-dim hover:text-ink",
      )}
      style={active ? { background: color ?? "#FF8A3D" } : undefined}
    >
      {children}
    </button>
  );
}

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-muted">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className="inline-block h-[3px] w-4 rounded" style={{ background: i.dashed ? "transparent" : i.color, borderTop: i.dashed ? `2px dashed ${i.color}` : undefined }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}
