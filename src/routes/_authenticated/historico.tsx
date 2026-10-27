import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Trash2, Pencil, Banknote, Smartphone, Check, Clock, AlertCircle, Search, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { NovaCorridaModal } from "@/components/NovaCorridaModal";
import { deleteCorrida, listCorridas, restoreCorrida, updateCorrida, type Corrida } from "@/lib/db";
import { brl, daysAgo, fmtDate, monthStart, today } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/historico")({
  component: HistoricoPage,
});

const PERIODOS = [
  { id: "hoje", label: "Hoje", ini: () => today() },
  { id: "7d", label: "7 dias", ini: () => daysAgo(7) },
  { id: "mes", label: "Este mês", ini: () => monthStart() },
  { id: "30d", label: "30 dias", ini: () => daysAgo(30) },
] as const;

function HistoricoPage() {
  const [items, setItems] = useState<Corrida[]>([]);
  const [dataIni, setDataIni] = useState(daysAgo(7));
  const [dataFim, setDataFim] = useState(today());
  const [metodo, setMetodo] = useState<"Todos" | "Dinheiro" | "PIX" | "Pendentes">("Todos");
  const [busca, setBusca] = useState("");
  const [editing, setEditing] = useState<Corrida | null>(null);
  const [novo, setNovo] = useState(false);

  const load = useCallback(() => {
    setItems(
      listCorridas({
        ini: dataIni,
        fim: dataFim,
        metodo: metodo === "Dinheiro" || metodo === "PIX" ? metodo : undefined,
        pendentes: metodo === "Pendentes",
      }),
    );
  }, [dataIni, dataFim, metodo]);

  useEffect(() => { load(); }, [load]);

  const periodoAtivo = PERIODOS.find((p) => p.ini() === dataIni && dataFim === today())?.id;

  const remove = (c: Corrida) => {
    const removida = deleteCorrida(c.id); // o fechamento do dia é recalculado pelo próprio db
    load();
    if (removida) {
      toast("Corrida excluída", {
        action: { label: "Desfazer", onClick: () => { restoreCorrida(removida); load(); } },
      });
    }
  };

  const togglePago = (c: Corrida) => {
    updateCorrida(c.id, { pago: !c.pago });
    toast.success(!c.pago ? "Marcada como paga" : "Marcada como pendente");
    load();
  };

  const termo = busca.trim().toLowerCase();
  const visiveis = termo
    ? items.filter((c) => `${c.destino ?? ""} ${c.observacoes ?? ""}`.toLowerCase().includes(termo))
    : items;

  const total = visiveis.reduce((a, r) => a + Number(r.valor_total), 0);
  const pendentes = visiveis.filter((c) => !c.pago);
  const totalPendente = pendentes.reduce((a, r) => a + Number(r.valor_total), 0);

  return (
    <AppShell title="Corridas">
      <div className="rounded-xl border border-border bg-card p-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Período">
          {PERIODOS.map((p) => (
            <button key={p.id} aria-pressed={periodoAtivo === p.id}
              onClick={() => { setDataIni(p.ini()); setDataFim(today()); }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                periodoAtivo === p.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="text-xs text-muted-foreground">
            De
            <input type="date" value={dataIni} max={dataFim} onChange={(e) => setDataIni(e.target.value)}
              className="mt-0.5 w-full rounded-lg border border-input bg-background px-2 py-2 text-sm text-foreground" />
          </label>
          <label className="text-xs text-muted-foreground">
            Até
            <input type="date" value={dataFim} min={dataIni} max={today()} onChange={(e) => setDataFim(e.target.value)}
              className="mt-0.5 w-full rounded-lg border border-input bg-background px-2 py-2 text-sm text-foreground" />
          </label>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1.5" role="group" aria-label="Forma de pagamento">
          {(["Todos", "Dinheiro", "PIX", "Pendentes"] as const).map((m) => (
            <button key={m} onClick={() => setMetodo(m)} aria-pressed={metodo === m}
              className={`rounded-lg py-2 text-xs font-semibold ${
                metodo === m
                  ? m === "Pendentes" ? "bg-warning text-warning-foreground" : "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}>
              {m}
            </button>
          ))}
        </div>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por destino ou observação"
            aria-label="Buscar corridas"
            className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm" />
        </div>
      </div>

      {pendentes.length > 0 && metodo !== "Pendentes" && (
        <button
          onClick={() => setMetodo("Pendentes")}
          className="mt-3 flex w-full items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-left"
        >
          <AlertCircle className="h-5 w-5 shrink-0 text-warning" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold">PIX não pagos: {pendentes.length}</div>
            <div className="text-xs text-muted-foreground">Total a receber: {brl(totalPendente)}</div>
          </div>
          <span className="text-xs font-semibold text-warning">Ver →</span>
        </button>
      )}

      <div className="mt-3 rounded-xl bg-primary/10 px-4 py-2.5 text-sm">
        <span className="text-muted-foreground">Total no filtro: </span>
        <span className="font-black text-primary">{brl(total)}</span>
        <span className="ml-2 text-xs text-muted-foreground">({visiveis.length} registros)</span>
      </div>

      <div className="mt-3 space-y-2">
        {visiveis.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <p>Nenhuma corrida encontrada neste período.</p>
            <button onClick={() => setNovo(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
              <Plus className="h-4 w-4" /> Lançar corrida
            </button>
          </div>
        )}
        {visiveis.map((c) => {
          const Icon = c.metodo_pagamento === "Dinheiro" ? Banknote : Smartphone;
          const pendente = !c.pago;
          return (
            <div key={c.id} className={`rounded-xl border bg-card p-3 ${pendente ? "border-warning/50" : "border-border"}`}>
              <div className="flex items-start gap-3">
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                  c.metodo_pagamento === "PIX" ? "bg-chart-3/15 text-chart-3" : "bg-primary/15 text-primary"
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-sm font-semibold">{c.destino || "Corrida"}</span>
                    {pendente && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-warning/20 px-1.5 py-0.5 text-[11px] font-bold text-warning">
                        <Clock className="h-3 w-3" /> Pendente
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {fmtDate(c.data)} • {c.hora.slice(0, 5)} • {c.quantidade}× {brl(c.valor_unitario)}
                  </div>
                  {c.observacoes && <div className="mt-0.5 truncate text-xs text-muted-foreground">{c.observacoes}</div>}
                </div>
                <div className="shrink-0 text-right">
                  <div className="whitespace-nowrap text-base font-black">{brl(c.valor_total)}</div>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-end gap-1 border-t border-border/60 pt-2">
                {c.metodo_pagamento === "PIX" && (
                  <button onClick={() => togglePago(c)}
                    className={`inline-flex min-h-10 items-center gap-1 rounded-lg px-3 text-xs font-semibold ${
                      pendente ? "bg-warning/15 text-warning" : "bg-success/15 text-success"
                    }`}>
                    {pendente ? <><Clock className="h-3.5 w-3.5" /> Marcar pago</> : <><Check className="h-3.5 w-3.5" /> Pago</>}
                  </button>
                )}
                <button onClick={() => setEditing(c)}
                  className="inline-flex min-h-10 items-center gap-1 rounded-lg px-3 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground">
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </button>
                <button onClick={() => remove(c)} aria-label="Excluir corrida"
                  className="grid h-10 w-10 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {editing && <NovaCorridaModal editing={editing} onClose={() => setEditing(null)} onSaved={load} />}
      {novo && <NovaCorridaModal onClose={() => setNovo(false)} onSaved={load} />}
    </AppShell>
  );
}
