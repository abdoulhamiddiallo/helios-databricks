import { useEffect, useState } from "react";
import { getFabricClient } from "@/lib/fabric-client";
import { QUERIES, type QueryName } from "@/queries";

/** Une ligne de résultat, avec des clés nettoyées : "Calendrier[Annee]" devient "Annee", "[kp]" devient "kp". */
export type Row = Record<string, unknown>;

export const CONNECTION = "helios";

function cleanKey(name: string): string {
  const m = name.match(/\[([^\]]+)\]$/);
  return m ? m[1] : name;
}

interface RawTable {
  columns: { name: string }[];
  rows: unknown[][];
}

function toRows(table: RawTable): Row[] {
  const keys = table.columns.map((c) => cleanKey(c.name));
  return table.rows.map((r) => {
    const o: Row = {};
    keys.forEach((k, i) => (o[k] = r[i]));
    return o;
  });
}

type Loader = (name: QueryName | string, dax?: string) => Promise<Row[]>;

let demoLoader: Loader | undefined;
/** Branche une source de données de démonstration (aperçu local uniquement). */
export function setDemoLoader(loader: Loader) {
  demoLoader = loader;
}

async function runQuery(name: QueryName | string, dax?: string): Promise<Row[]> {
  if (demoLoader) return demoLoader(name, dax);
  const result = await getFabricClient().semanticModel(CONNECTION).query(dax ?? QUERIES[name as QueryName]);
  if (result.status !== "success") {
    throw new Error(result.error?.message ?? "Requête impossible");
  }
  const anyResult = result as unknown as { table?: RawTable; tables?: RawTable[] };
  const table = anyResult.table ?? anyResult.tables?.[0];
  return table ? toRows(table) : [];
}

export interface DaxState {
  rows: Row[];
  loading: boolean;
  error?: string;
}

const memo = new Map<QueryName, Promise<Row[]>>();

/** Exécute une requête DAX du modèle HELIOS (résultat partagé entre les écrans). */
export function useDax(name: QueryName, reloadKey = 0): DaxState {
  const [state, setState] = useState<DaxState>({ rows: [], loading: true });
  useEffect(() => {
    let alive = true;
    if (reloadKey > 0) memo.delete(name);
    let p = memo.get(name);
    if (!p) {
      p = runQuery(name);
      memo.set(name, p);
      p.catch(() => memo.delete(name));
    }
    setState((s) => ({ ...s, loading: true, error: undefined }));
    p.then(
      (rows) => alive && setState({ rows, loading: false }),
      (e: unknown) => alive && setState({ rows: [], loading: false, error: e instanceof Error ? e.message : String(e) }),
    );
    return () => {
      alive = false;
    };
  }, [name, reloadKey]);
  return state;
}

const rawMemo = new Map<string, Promise<Row[]>>();

/** Exécute une requête DAX construite à la volée (par exemple autour d'une date choisie). */
export function useDaxQuery(key: string | null, dax: string | null): DaxState {
  const [state, setState] = useState<DaxState>({ rows: [], loading: Boolean(key) });
  useEffect(() => {
    if (!key || !dax) { setState({ rows: [], loading: false }); return; }
    let alive = true;
    let p = rawMemo.get(key);
    if (!p) {
      p = runQuery(key, dax);
      rawMemo.set(key, p);
      p.catch(() => rawMemo.delete(key));
    }
    setState({ rows: [], loading: true });
    p.then(
      (rows) => alive && setState({ rows, loading: false }),
      (e: unknown) => alive && setState({ rows: [], loading: false, error: e instanceof Error ? e.message : String(e) }),
    );
    return () => { alive = false; };
  }, [key, dax]);
  return state;
}

// ---------- conversions ----------
export const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

export const date = (v: unknown): Date | null => {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  const s = String(v);
  // les dates du modèle sont en temps universel, sans fuseau
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : s + "Z");
  return Number.isNaN(d.getTime()) ? null : d;
};

const fr = "fr-FR";
export const fmt = {
  int: (n: number | null) => (n === null ? "–" : Math.round(n).toLocaleString(fr)),
  dec: (n: number | null, d = 1) =>
    n === null ? "–" : n.toLocaleString(fr, { minimumFractionDigits: d, maximumFractionDigits: d }),
  /** Kp en notation officielle : 8,67 → « 9- », 8,33 → « 8+ », 9 → « 9 ». */
  kp: (n: number | null) => {
    if (n === null) return "–";
    const w = Math.round(n), f = n - w;
    return f > 0.1 ? `${w}+` : f < -0.1 ? `${w}-` : String(w);
  },
  signed: (n: number | null, d = 1) =>
    n === null ? "–" : (n > 0 ? "+" : "") + n.toLocaleString(fr, { minimumFractionDigits: d, maximumFractionDigits: d }),
  dayLong: (d: Date | null) =>
    d ? d.toLocaleDateString(fr, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "–",
  dayShort: (d: Date | null) =>
    d ? d.toLocaleDateString(fr, { day: "numeric", month: "short", timeZone: "UTC" }) : "–",
  dateTime: (d: Date | null) =>
    d
      ? d.toLocaleDateString(fr, { day: "numeric", month: "short", timeZone: "UTC" }) +
        " · " +
        d.toLocaleTimeString(fr, { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) +
        " UTC"
      : "–",
  hour: (d: Date | null) =>
    d ? d.toLocaleTimeString(fr, { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) : "–",
};
