import { useEffect, useState, type ComponentType } from "react";
import { Activity, Wind, Orbit, History, Sun, RefreshCw, BookOpen, Play, Square } from "lucide-react";
import { Wordmark } from "@/components/Logo";
import { useDax, num, date, fmt } from "@/lib/helios-data";
import { stormLevel, COLORS } from "@/lib/space";
import { cn } from "@/lib/utils";
import Maintenant from "@/pages/Maintenant";
import VentSolaire from "@/pages/VentSolaire";
import SoleilTerre from "@/pages/SoleilTerre";
import Siecle from "@/pages/Siecle";
import CycleSolaire from "@/pages/CycleSolaire";
import NoteEdition from "@/pages/NoteEdition";

interface View {
  id: string;
  label: string;
  title: string;
  lead: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  Page: ComponentType<{ reload: number }>;
}

const VIEWS: View[] = [
  { id: "maintenant", label: "Maintenant", icon: Activity, Page: Maintenant,
    title: "La météo de l'espace, maintenant",
    lead: "L'état du bouclier magnétique de la Terre et du vent solaire qui le frappe, d'après les dernières mesures." },
  { id: "vent", label: "Vent solaire", icon: Wind, Page: VentSolaire,
    title: "Le vent solaire en direct",
    lead: "Un flot de particules quitte le Soleil à 400 km/s en moyenne. Trois sondes le mesurent avant qu'il n'atteigne la Terre." },
  { id: "soleil-terre", label: "Du Soleil à la Terre", icon: Orbit, Page: SoleilTerre,
    title: "Du Soleil à la Terre",
    lead: "Chaque éjection de masse coronale reliée par la NASA à la tempête qu'elle a déclenchée : son départ, sa vitesse, son voyage." },
  { id: "siecle", label: "Un siècle de tempêtes", icon: History, Page: Siecle,
    title: "Un siècle de tempêtes géomagnétiques",
    lead: "Le Kp de chaque journée depuis 1932, classé selon l'échelle NOAA de G1 (mineure) à G5 (extrême)." },
  { id: "cycle", label: "Le cycle solaire", icon: Sun, Page: CycleSolaire,
    title: "Le cycle solaire",
    lead: "Plus de 275 ans de taches solaires, dix cycles comparés et les éruptions observées depuis 2010." },
  { id: "note", label: "Note d'édition", icon: BookOpen, Page: NoteEdition,
    title: "Note d'édition",
    lead: "La chaîne de données, la méthode de calcul, le glossaire et les sources de l'observatoire." },
];

function readHash(): string {
  const h = window.location.hash.replace("#", "");
  return VIEWS.some((v) => v.id === h) ? h : "maintenant";
}

export default function App() {
  const [active, setActive] = useState(readHash);
  const [reload, setReload] = useState(0);
  const now = useDax("maintenant", reload);
  const r = now.rows[0] ?? {};
  const kp = num(r.kp);
  const level = stormLevel(kp);
  const view = VIEWS.find((v) => v.id === active) ?? VIEWS[0];

  useEffect(() => {
    const on = () => setActive(readHash());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const [presenting, setPresenting] = useState(false);
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  // mode présentation : chaque écran 18 secondes, en boucle
  useEffect(() => {
    if (!presenting) return;
    const tour = VIEWS.filter((v) => v.id !== "note").map((v) => v.id);
    const id = setInterval(() => {
      setActive((cur) => {
        const next = tour[(tour.indexOf(cur) + 1) % tour.length];
        window.location.hash = next;
        document.getElementById("contenu")?.scrollTo({ top: 0 });
        return next;
      });
    }, 18000);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPresenting(false);
    window.addEventListener("keydown", onKey);
    return () => { clearInterval(id); window.removeEventListener("keydown", onKey); };
  }, [presenting]);
  const togglePresent = () => {
    const on = !presenting;
    setPresenting(on);
    try {
      if (on) document.documentElement.requestFullscreen?.();
      else if (document.fullscreenElement) document.exitFullscreen?.();
    } catch { /* plein écran refusé dans le cadre : la rotation fonctionne quand même */ }
  };
  // raccourcis clavier : 1 à 6 pour changer d'écran, P pour présenter
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.ctrlKey || e.metaKey || e.altKey) return;
      const i = Number(e.key) - 1;
      if (i >= 0 && i < VIEWS.length) { window.location.hash = VIEWS[i].id; setActive(VIEWS[i].id); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const go = (id: string) => {
    window.location.hash = id;
    setActive(id);
    document.getElementById("contenu")?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="starfield flex h-full bg-space text-ink">
      <aside className="hidden w-[256px] shrink-0 flex-col border-r border-edge bg-[#050912cc] px-4 py-5 backdrop-blur md:flex">
        <Wordmark />
        <nav className="mt-8 grid gap-1">
          {VIEWS.map((v) => {
            const on = v.id === active;
            return (
              <button key={v.id} onClick={() => go(v.id)} style={v.id === "note" ? { marginTop: 14 } : undefined}
                className={cn("group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] transition",
                  on ? "bg-panel-2 text-ink shadow-[inset_3px_0_0_#FF8A3D]" : "text-muted hover:bg-panel hover:text-ink")}>
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg border transition",
                  on ? "border-sun/40 bg-sun/10 text-sun" : "border-edge text-dim group-hover:text-muted")}>
                  <v.icon size={16} />
                </span>
                <span className="flex-1 whitespace-nowrap">{v.label}</span>
                <span className="font-mono text-[10px] text-dim opacity-0 transition group-hover:opacity-100">{VIEWS.indexOf(v) + 1}</span>
              </button>
            );
          })}
        </nav>
        <div className="mt-auto grid gap-3">
          <div className="rounded-2xl border border-edge p-3">
            <div className="flex items-center gap-2 text-[12px] text-muted">
              <span className="live-dot relative inline-block h-2 w-2 rounded-full" style={{ color: level.color, background: level.color }} />
              Magnétosphère
            </div>
            <div className="mt-1 text-[15px] font-semibold" style={{ color: level.color }}>{level.label}</div>
            <div className="num text-[12px] text-dim">Kp {fmt.kp(kp)} · {fmt.dateTime(date(r.kpTranche))}</div>
          </div>
          <div className="text-[10.5px] leading-relaxed text-dim">
            Données NOAA SWPC, NASA CCMC DONKI, GFZ Potsdam (CC BY 4.0) et SILSO, intégrées chaque jour dans un lakehouse Azure Databricks.
          </div>
        </div>
      </aside>

      <main id="contenu" className="min-w-0 flex-1 overflow-y-auto">
        <header className="sticky top-0 z-20 border-b border-edge bg-[#04060dd9] px-6 py-4 backdrop-blur md:px-8">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0 flex-1">
              <div className="eyebrow">HÉLIOS · {view.label}</div>
              <h1 className="mt-1 text-[clamp(20px,2vw,28px)] font-semibold leading-tight tracking-[-0.01em] text-ink">{view.title}</h1>
              <p className="mt-1 max-w-[75ch] text-[13.5px] leading-snug text-muted">{view.lead}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
            <div className="hidden items-center gap-3 rounded-xl border border-edge h-[42px] px-3 lg:flex" title="Horloge en temps universel et heure de la dernière mesure du vent solaire">
              <span className="live-dot relative inline-block h-2 w-2 shrink-0 rounded-full" style={{ color: COLORS.calm, background: COLORS.calm }} />
              <div className="leading-tight">
                <div className="num font-mono text-[14px] text-ink">{clock.toLocaleTimeString("fr-FR", { timeZone: "UTC" })} <span className="text-[10.5px] tracking-[0.14em] text-dim">UTC</span></div>
                <div className="text-[11px] text-muted">{date(r.heure) ? `mesures du ${fmt.dateTime(date(r.heure))}` : "en attente des mesures"}</div>
              </div>
            </div>
            <button onClick={togglePresent} title={presenting ? "Arrêter la présentation (Échap)" : "Présenter : un écran toutes les 18 secondes"}
              aria-label={presenting ? "Arrêter la présentation" : "Présenter"} className={cn("flex h-[42px] shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-[12.5px] transition",
                presenting ? "border-sun bg-sun/15 text-sun" : "border-edge text-muted hover:border-dim hover:text-ink")}>
              {presenting ? <Square size={13} /> : <Play size={13} />} <span className="hidden 2xl:inline">{presenting ? "Arrêter" : "Présenter"}</span>
            </button>
            <button onClick={() => setReload((x) => x + 1)} title="Actualiser les données"
              aria-label="Actualiser les données" className="flex h-[42px] shrink-0 items-center gap-2 rounded-xl border border-edge px-3 py-2 text-[12.5px] text-muted transition hover:border-dim hover:text-ink">
              <RefreshCw size={14} className={now.loading ? "animate-spin" : ""} /> <span className="hidden 2xl:inline">Actualiser</span>
            </button>
            </div>
          </div>
          <nav className="mt-3 flex gap-1 overflow-x-auto md:hidden">
            {VIEWS.map((v) => (
              <button key={v.id} onClick={() => go(v.id)} className={cn("whitespace-nowrap rounded-full px-3 py-1 text-[12.5px]", v.id === active ? "bg-sun text-space" : "text-muted")}>{v.label}</button>
            ))}
          </nav>
        </header>
        {presenting && <div key={active} className="h-[2px] origin-left bg-sun" style={{ animation: "present 18s linear forwards" }} />}
        <div className="grid-bg @container px-6 py-6 md:px-8">
          <view.Page key={view.id} reload={reload} />
        </div>
      </main>
    </div>
  );
}
