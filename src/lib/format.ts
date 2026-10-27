export const brl = (n: number | string | null | undefined) => {
  const v = typeof n === "string" ? parseFloat(n) : (n ?? 0);
  return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

// Data local (YYYY-MM-DD), não UTC: à noite no Brasil o UTC já é o dia seguinte.
const isoLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const today = () => isoLocal(new Date());

export const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoLocal(d);
};

export const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export const fmtDateShort = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};

// Aceita "12,5" e "12.5"; devolve null se estiver vazio ou inválido.
export const parseNum = (s: string) => {
  const t = s.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

// "8,5" a partir de 8.5 — para exibir em campos de texto.
export const numToInput = (n: number) => String(n).replace(".", ",");

// Horas decimais entre dois horários "HH:MM"; vira a meia-noite se o fim for menor que o início.
export const horasEntre = (ini: string, fim: string) => {
  if (!ini || !fim) return null;
  const [h1, m1] = ini.split(":").map(Number);
  const [h2, m2] = fim.split(":").map(Number);
  let min = h2 * 60 + m2 - (h1 * 60 + m1);
  if (min <= 0) min += 24 * 60;
  return Math.round((min / 60) * 100) / 100;
};

export const monthStart = () => {
  const d = new Date();
  return isoLocal(new Date(d.getFullYear(), d.getMonth(), 1));
};
