import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Receipt, ListOrdered, Wallet, BarChart3, AlertTriangle, Info, X } from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { onStorageChange, probeStorage, requestPersistence, storageFailing } from "@/lib/db";

const WARN_KEY = "rotapro:calc-warning-dismissed";

const navItems = [
  { to: "/", label: "Hoje", icon: Home },
  { to: "/fechamento", label: "Fechar dia", icon: Receipt },
  { to: "/historico", label: "Corridas", icon: ListOrdered },
  { to: "/extrato", label: "Extrato", icon: Wallet },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
] as const;

export function AppShell({ children, title }: { children: ReactNode; title: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [warnOpen, setWarnOpen] = useState(false);
  const [storageBad, setStorageBad] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setWarnOpen(localStorage.getItem(WARN_KEY) !== "1");
    } catch {
      setWarnOpen(true);
    }
    probeStorage();
    setStorageBad(storageFailing());
    requestPersistence();
    return onStorageChange(() => setStorageBad(storageFailing()));
  }, []);

  const dismissWarn = () => {
    try {
      localStorage.setItem(WARN_KEY, "1");
    } catch {
      /* sem armazenamento: o aviso volta na próxima abertura */
    }
    setWarnOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-2 px-3 sm:px-4">
          <h1 className="truncate text-base font-bold tracking-tight sm:text-lg">{title}</h1>
        </div>
      </header>

      {storageBad && (
        <div role="alert" className="border-b border-destructive/40 bg-destructive/10">
          <div className="mx-auto flex max-w-2xl items-start gap-2 px-3 py-2 sm:px-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="min-w-0 flex-1 text-xs leading-snug text-destructive">
              <span className="font-bold">Seus dados NÃO estão sendo salvos neste aparelho</span> (janela privada ou
              armazenamento bloqueado/cheio). Ao fechar o app, tudo se perde. Saia da janela privada ou libere
              espaço e, enquanto isso, baixe um backup em Relatórios.
            </p>
          </div>
        </div>
      )}

      {warnOpen && (
        <div className="border-b border-primary/20 bg-primary/5">
          <div className="mx-auto flex max-w-2xl items-start gap-2 px-3 py-2 sm:px-4">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="min-w-0 flex-1 text-xs leading-snug text-muted-foreground">
              <span className="font-semibold text-foreground">Como o lucro é calculado:</span> faturamento recebido −
              gasolina (km ÷ km/L × preço) − manutenção (km × custo/km). Os dados ficam só neste aparelho; baixe um
              backup de vez em quando.
            </p>
            <button
              onClick={dismissWarn}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-accent"
              aria-label="Fechar aviso"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-2xl flex-1 px-3 pb-28 pt-3 sm:px-4 sm:pt-4">{children}</main>


      <nav aria-label="Navegação principal" className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card safe-bottom">
        <div className="mx-auto grid max-w-2xl grid-cols-5">
          {navItems.map((it) => {
            const active = it.to === "/" ? pathname === "/" : pathname.startsWith(it.to);
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
                {it.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
