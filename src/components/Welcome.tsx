import { useMemo, useState } from "react";
import { ArrowRight, Bike, ShieldCheck, TrendingUp, WifiOff } from "lucide-react";

// Gera janelas acesas de forma determinística (mesma arte em todas as aberturas).
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

type Predio = { x: number; w: number; h: number; janelas: { x: number; y: number; on: boolean }[] };

function skyline(seed: number, baseY: number, minH: number, maxH: number, withWindows: boolean): Predio[] {
  const r = rng(seed);
  const out: Predio[] = [];
  let x = -20;
  while (x < 820) {
    const w = 50 + r() * 70;
    const h = minH + r() * (maxH - minH);
    const janelas: Predio["janelas"] = [];
    if (withWindows) {
      for (let wy = baseY - h + 14; wy < baseY - 10; wy += 16) {
        for (let wx = x + 8; wx < x + w - 10; wx += 14) janelas.push({ x: wx, y: wy, on: r() > 0.62 });
      }
    }
    out.push({ x, w, h, janelas });
    x += w + 2 + r() * 6;
  }
  return out;
}

// Cena vetorial (nítida em qualquer tela): cidade ao entardecer, avenida e motoboy com baú.
function Cena() {
  const fundo = useMemo(() => skyline(7, 300, 80, 210, false), []);
  const frente = useMemo(() => skyline(21, 340, 100, 270, true), []);

  return (
    <svg viewBox="0 0 800 1200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="ceu" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="340">
          <stop offset="0" stopColor="#0b1d2e" />
          <stop offset="0.5" stopColor="#14402f" />
          <stop offset="0.82" stopColor="#c76a2b" />
          <stop offset="1" stopColor="#f2b05a" />
        </linearGradient>
        <radialGradient id="sol" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffe9a8" stopOpacity="0.95" />
          <stop offset="0.4" stopColor="#ffb457" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ff9a3c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="asfalto" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1f2a33" />
          <stop offset="1" stopColor="#0a1014" />
        </linearGradient>
        <linearGradient id="farol" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff3c4" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff3c4" stopOpacity="0" />
        </linearGradient>
        <filter id="blur"><feGaussianBlur stdDeviation="6" /></filter>
      </defs>

      <rect width="800" height="1200" fill="url(#ceu)" />
      {/* estrelas */}
      {Array.from({ length: 40 }, (_, i) => {
        const r = rng(i * 7919 + 13);
        r();
        r();
        return <circle key={i} cx={r() * 800} cy={r() * 230} r={0.6 + r() * 1.2} fill="#fff" opacity={0.35 + r() * 0.5} />;
      })}
      <circle cx="560" cy="300" r="240" fill="url(#sol)" />
      <circle cx="560" cy="318" r="52" fill="#ffd98a" opacity="0.95" />

      {/* prédios distantes */}
      <g fill="#1b3b3a" opacity="0.85">
        {fundo.map((b, i) => (
          <rect key={i} x={b.x} y={300 - b.h} width={b.w} height={b.h + 60} />
        ))}
      </g>
      {/* prédios da frente com janelas */}
      <g>
        {frente.map((b, i) => (
          <g key={i}>
            <rect x={b.x} y={340 - b.h} width={b.w} height={b.h + 30} fill="#0d1c24" />
            {b.janelas.map((j, k) => (
              <rect key={k} x={j.x} y={j.y} width="7" height="9" rx="1" fill={j.on ? "#ffd27a" : "#16303a"} opacity={j.on ? 0.9 : 0.8} />
            ))}
          </g>
        ))}
      </g>

      {/* avenida */}
      <path d="M0 340 H800 V1200 H0 Z" fill="url(#asfalto)" />
      <path d="M0 340 H800" stroke="#3a4a55" strokeWidth="3" />
      <path d="M400 340 L-100 1200 M400 340 L900 1200" stroke="#2c3a45" strokeWidth="2" opacity="0.7" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const y = 350 + i * i * 22 + i * 14;
        const w = 4 + i * 5;
        return <rect key={i} x={400 - w / 2} y={y} width={w} height={8 + i * 7} rx="2" fill="#f4e3a1" opacity="0.3" />;
      })}

      {/* motoboy */}
      <g transform="translate(210 310)">
        <ellipse cx="170" cy="268" rx="190" ry="16" fill="#000" opacity="0.45" />
        <path d="M250 150 L520 110 L520 80 Z" fill="url(#farol)" opacity="0.55" transform="translate(-60 0)" />
        {/* rodas */}
        <circle cx="40" cy="200" r="52" fill="#0a0f12" stroke="#2f3d46" strokeWidth="9" />
        <circle cx="40" cy="200" r="22" fill="#1d2a31" stroke="#52646f" strokeWidth="3" />
        <circle cx="300" cy="200" r="52" fill="#0a0f12" stroke="#2f3d46" strokeWidth="9" />
        <circle cx="300" cy="200" r="22" fill="#1d2a31" stroke="#52646f" strokeWidth="3" />
        {/* quadro e tanque */}
        <path d="M40 200 L120 130 L210 130 L300 200 L250 200 L190 160 L120 165 L80 200 Z" fill="#17252d" />
        <path d="M100 110 Q150 80 215 108 L225 140 L105 142 Z" fill="#16a34a" />
        <path d="M285 118 L318 96 L330 104 L300 150 Z" fill="#101a20" />
        <rect x="262" y="96" width="46" height="9" rx="4" fill="#101a20" />
        <circle cx="322" cy="122" r="10" fill="#fff3c4" />
        {/* escapamento */}
        <path d="M40 215 L118 215 L130 224 L40 226 Z" fill="#52646f" />
        {/* baú de entregas */}
        <rect x="-30" y="60" width="106" height="78" rx="9" fill="#16a34a" stroke="#0b6b2e" strokeWidth="3" />
        <rect x="-18" y="76" width="82" height="9" rx="3" fill="#0b6b2e" opacity="0.65" />
        <rect x="-8" y="98" width="62" height="26" rx="6" fill="#ffffff" opacity="0.92" />
        <text x="23" y="117" textAnchor="middle" fontSize="16" fontWeight="800" fill="#0b6b2e" fontFamily="system-ui, sans-serif">RP</text>
        {/* piloto */}
        <path d="M105 112 Q120 40 168 38 L205 72 Q196 104 170 112 Z" fill="#0f1b22" />
        <path d="M195 70 L262 96 L258 110 L188 92 Z" fill="#0f1b22" />
        <path d="M120 110 L160 170 L196 168 L170 112 Z" fill="#0b141a" />
        <circle cx="184" cy="22" r="26" fill="#0f1b22" />
        <path d="M168 10 Q190 -6 210 14 L212 28 L170 30 Z" fill="#16a34a" />
        <path d="M188 20 L212 20 L210 34 L192 34 Z" fill="#9fd8e6" opacity="0.85" />
      </g>
    </svg>
  );
}

const DESTAQUES = [
  { icon: TrendingUp, texto: "Lucro livre do dia, sem conta de cabeça" },
  { icon: ShieldCheck, texto: "Seus dados ficam só no seu aparelho" },
  { icon: WifiOff, texto: "Funciona mesmo sem internet" },
];

export function Welcome({ onEnter }: { onEnter: () => void }) {
  const [foto, setFoto] = useState(true);
  return (
    <div className="fixed inset-0 z-[60] overflow-hidden bg-[#0b1d2e] text-white">
      <Cena />
      {/* Para usar uma foto sua: salve como public/welcome-bg.jpg. Se o arquivo não existir, fica a ilustração. */}
      {foto && (
        <img
          src="/welcome-bg.jpg"
          alt=""
          onError={() => setFoto(false)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/30" />

      <div className="relative mx-auto flex h-full max-w-md flex-col justify-between px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary shadow-lg shadow-primary/40">
            <Bike className="h-7 w-7" />
          </div>
          <span className="text-2xl font-black tracking-tight">RotaPro</span>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary-foreground/80">Bem-vindo(a)</p>
          <h1 className="mt-2 text-4xl font-black leading-tight">
            Suas corridas.
            <br />
            Seu lucro.
            <br />
            <span className="text-[#5ee08f]">Sob controle.</span>
          </h1>
          <ul className="mt-6 space-y-2.5">
            {DESTAQUES.map(({ icon: Icon, texto }) => (
              <li key={texto} className="flex items-center gap-3 text-sm text-white/90">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/15 backdrop-blur">
                  <Icon className="h-4 w-4" />
                </span>
                {texto}
              </li>
            ))}
          </ul>
          <button
            onClick={onEnter}
            autoFocus
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-lg font-bold text-primary-foreground shadow-xl shadow-primary/40 transition active:scale-[0.98]"
          >
            Entrar <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
