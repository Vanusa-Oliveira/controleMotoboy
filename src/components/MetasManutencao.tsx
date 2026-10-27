import { useEffect, useState } from "react";
import { Target, Wrench, Plus, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { addLembrete, deleteLembrete, statusManutencao } from "@/lib/db";
import { brl, parseNum } from "@/lib/format";
import { inputCls } from "@/components/Field";

function Barra({ pct, cor }: { pct: number; cor: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full transition-all ${cor}`} style={{ width: `${Math.round(pct * 100)}%` }} />
    </div>
  );
}

function LinhaMeta({ label, atual, meta }: { label: string; atual: number; meta: number }) {
  const pct = Math.min(1, atual / meta);
  const falta = Math.max(0, meta - atual);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="font-semibold">{label}</span>
        <span className="text-muted-foreground">
          {brl(atual)} de {brl(meta)}
        </span>
      </div>
      <Barra pct={pct} cor={pct >= 1 ? "bg-success" : "bg-primary"} />
      <p className="mt-1 text-xs text-muted-foreground">
        {falta > 0 ? `Faltam ${brl(falta)}` : "Meta batida! 🎉"}
      </p>
    </div>
  );
}

// Progresso do faturamento recebido (só corridas já pagas) contra as metas configuradas.
export function MetasCard({
  dia, semana, metaDia, metaSemana,
}: { dia: number; semana: number; metaDia: number; metaSemana: number }) {
  if (metaDia <= 0 && metaSemana <= 0) return null;
  return (
    <div className="mt-3 space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-bold">
        <Target className="h-4 w-4 text-primary" /> Metas
      </div>
      {metaDia > 0 && <LinhaMeta label="Hoje" atual={dia} meta={metaDia} />}
      {metaSemana > 0 && <LinhaMeta label="Esta semana" atual={semana} meta={metaSemana} />}
    </div>
  );
}

const SUGESTOES = [
  { nome: "Óleo", km: 3000 },
  { nome: "Corrente", km: 10000 },
  { nome: "Pneu", km: 15000 },
  { nome: "Pastilha", km: 8000 },
];

export function ManutencaoCard({ refresh }: { refresh: number }) {
  const [status, setStatus] = useState<ReturnType<typeof statusManutencao>>([]);
  const [adding, setAdding] = useState(false);
  const [nome, setNome] = useState("");
  const [km, setKm] = useState("");
  const [erro, setErro] = useState<string>();
  const [tick, setTick] = useState(0);

  useEffect(() => setStatus(statusManutencao()), [refresh, tick]);

  const salvar = (n: string, k: number | null) => {
    if (!n.trim()) return setErro("Diga o que acompanhar (ex: óleo).");
    if (k === null || k <= 0) return setErro("Informe de quantos em quantos km (ex: 3000).");
    addLembrete(n.trim(), k);
    setNome("");
    setKm("");
    setErro(undefined);
    setAdding(false);
    setTick((t) => t + 1);
    toast.success("Lembrete criado");
  };

  const remover = (id: string) => {
    deleteLembrete(id);
    setTick((t) => t + 1);
  };

  const vazio = status.length === 0;

  return (
    <div className="mt-3 rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Wrench className="h-4 w-4 text-primary" /> Manutenção
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-primary">
            <Plus className="h-3.5 w-3.5" /> Lembrete
          </button>
        )}
      </div>

      {vazio && !adding && (
        <p className="text-xs text-muted-foreground">
          Crie lembretes para saber quando trocar óleo, pneu e outras peças. O app soma o km dos dias fechados desde o
          último gasto com o mesmo nome (ex: um gasto "Óleo" no Extrato zera o lembrete "Óleo").
        </p>
      )}

      <ul className="space-y-3">
        {status.map(({ lembrete, kmDesde, restante, pct }) => {
          const vencida = restante <= 0;
          const perto = !vencida && pct >= 0.9;
          return (
            <li key={lembrete.id}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1 font-semibold">
                  {(vencida || perto) && <AlertTriangle className={`h-3.5 w-3.5 ${vencida ? "text-destructive" : "text-warning"}`} />}
                  {lembrete.nome}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  {kmDesde.toLocaleString("pt-BR")} / {lembrete.intervalo_km.toLocaleString("pt-BR")} km
                  <button onClick={() => remover(lembrete.id)} aria-label={`Remover lembrete ${lembrete.nome}`}
                    className="grid h-8 w-8 place-items-center rounded-md hover:bg-accent hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
              <Barra pct={pct} cor={vencida ? "bg-destructive" : perto ? "bg-warning" : "bg-primary"} />
              <p className={`mt-1 text-xs ${vencida ? "font-semibold text-destructive" : "text-muted-foreground"}`}>
                {vencida
                  ? `Passou ${Math.abs(restante).toLocaleString("pt-BR")} km do prazo. Hora de fazer!`
                  : `Faltam ${restante.toLocaleString("pt-BR")} km`}
              </p>
            </li>
          );
        })}
      </ul>

      {adding && (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            salvar(nome, parseNum(km));
          }}
          className="mt-3 space-y-2"
        >
          <div className="flex flex-wrap gap-1.5">
            {SUGESTOES.map((s) => (
              <button key={s.nome} type="button"
                onClick={() => { setNome(s.nome); setKm(String(s.km)); setErro(undefined); }}
                className="rounded-full border border-input bg-background px-3 py-1.5 text-xs font-semibold">
                {s.nome} · {s.km.toLocaleString("pt-BR")} km
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input aria-label="O que acompanhar" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Óleo" className={inputCls} />
            <input aria-label="A cada quantos km" inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value)} placeholder="A cada (km)" className={inputCls} />
          </div>
          {erro && <p className="text-xs font-medium text-destructive">{erro}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => { setAdding(false); setErro(undefined); }}
              className="rounded-lg border border-input py-2.5 text-sm font-semibold">Cancelar</button>
            <button className="rounded-lg bg-primary py-2.5 text-sm font-bold text-primary-foreground">Salvar</button>
          </div>
        </form>
      )}
    </div>
  );
}
