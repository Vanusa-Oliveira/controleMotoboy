import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, TrendingUp, DollarSign, Bike, Route as RouteIcon, Settings2, Check, Sparkles, Receipt } from "lucide-react";
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { NovaCorridaModal } from "@/components/NovaCorridaModal";
import { faturamentoPeriodo, getConfig, getFechamento, listFechamentos, saveConfig as saveConfigDb, totaisDoDia } from "@/lib/db";
import { brl, today, fmtDateShort, parseNum, numToInput, weekStart } from "@/lib/format";
import { ManutencaoCard, MetasCard } from "@/components/MetasManutencao";
import { Field, inputCls } from "@/components/Field";

export const Route = createFileRoute("/_authenticated/")({
  component: DashboardPage,
});

type Config = {
  saldo_inicial_caixa: number;
  preco_gasolina: number;
  custo_manutencao_km: number;
  km_l_estimado: number;
  meta_diaria: number;
  meta_semanal: number;
};

function DashboardPage() {
  const [open, setOpen] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [stats, setStats] = useState({ bruto: 0, corridas: 0, km: 0, lucro: 0 });
  const [fechado, setFechado] = useState(false);
  const [configurado, setConfigurado] = useState(true);
  const [configErrors, setConfigErrors] = useState<{ preco?: string; consumo?: string }>({});
  const [chart, setChart] = useState<{ data: string; lucro: number }[]>([]);
  const [config, setConfig] = useState<Config>({
    saldo_inicial_caixa: 0,
    preco_gasolina: 6,
    custo_manutencao_km: 0.15,
    km_l_estimado: 33,
    meta_diaria: 0,
    meta_semanal: 0,
  });
  const [progresso, setProgresso] = useState({ dia: 0, semana: 0 });
  const [savingConfig, setSavingConfig] = useState(false);
  const [reload, setReload] = useState(0);
  const [pendente, setPendente] = useState(0);

  useEffect(() => {
    const t = today();
    const dia = totaisDoDia(t);
    const fech = getFechamento(t);
    const cfg = getConfig(t);
    setPendente(dia.pendente);
    setFechado(!!fech);
    setProgresso({ dia: faturamentoPeriodo(t, t), semana: faturamentoPeriodo(weekStart(), t) });
    setConfigurado(!!cfg);
    setStats({
      bruto: dia.recebido,
      corridas: dia.quantidade,
      km: fech?.km_rodado ?? 0,
      lucro: fech?.lucro_livre ?? 0,
    });
    if (cfg) {
      setConfig({
        saldo_inicial_caixa: cfg.saldo_inicial_caixa,
        preco_gasolina: cfg.preco_gasolina,
        custo_manutencao_km: cfg.custo_manutencao_km,
        km_l_estimado: cfg.km_l_estimado,
        meta_diaria: cfg.meta_diaria ?? 0,
        meta_semanal: cfg.meta_semanal ?? 0,
      });
    }
    setChart(
      listFechamentos({ limit: 7 })
        .reverse()
        .map((r) => ({ data: fmtDateShort(r.data), lucro: r.lucro_livre })),
    );
  }, [reload]);

  const saveConfig = () => {
    const errs: typeof configErrors = {};
    if (config.preco_gasolina <= 0) errs.preco = "Informe o preço do litro da gasolina.";
    if (config.km_l_estimado <= 0) errs.consumo = "Informe quantos km a moto faz por litro.";
    setConfigErrors(errs);
    if (Object.keys(errs).length) return;
    setSavingConfig(true);
    try {
      saveConfigDb({ data: today(), ...config });
    } catch (err: any) {
      setSavingConfig(false);
      return toast.error(err?.message ?? "Erro ao salvar");
    }
    setSavingConfig(false);
    setReload((n) => n + 1);
    toast.success("Configurações salvas");
    setConfigurado(true);
    setShowConfig(false);
  };

  return (
    <AppShell title="Hoje">
      <p className="mb-3 text-sm text-muted-foreground first-letter:uppercase">
        {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
      </p>

      {!configurado && (
        <div className="mb-3 rounded-xl border border-primary/40 bg-primary/10 p-4">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Sparkles className="h-4 w-4 text-primary" /> Bem-vindo! Configure sua moto
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            O app usa estes valores para separar o dinheiro da gasolina e da manutenção. Os que aparecem abaixo são só
            exemplos: ajuste para a sua moto e toque em Salvar.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Lucro livre"
          value={fechado ? brl(stats.lucro) : "—"}
          hint={fechado ? undefined : "Aparece ao fechar o dia"}
          icon={TrendingUp}
          accent="success"
        />
        <StatCard label="Faturamento" value={brl(stats.bruto)} icon={DollarSign} accent="primary" />
        <StatCard label="Corridas" value={String(stats.corridas)} icon={Bike} />
        <StatCard
          label="KM rodado"
          value={fechado ? `${stats.km.toFixed(1)} km` : "—"}
          hint={fechado ? undefined : "Informado ao fechar o dia"}
          icon={RouteIcon}
        />
      </div>

      {!fechado && stats.corridas > 0 && (
        <Link
          to="/fechamento"
          className="mt-3 flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm"
        >
          <Receipt className="h-5 w-5 shrink-0 text-primary" />
          <span className="flex-1">
            <span className="font-bold">Dia ainda não fechado.</span>{" "}
            <span className="text-muted-foreground">Informe km e horas para ver seu lucro.</span>
          </span>
          <span className="text-xs font-semibold text-primary">Fechar →</span>
        </Link>
      )}

      {pendente > 0 && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          A receber (PIX pendente): <span className="font-bold text-warning">{brl(pendente)}</span> — não entra no faturamento até ser pago
        </p>
      )}

      <MetasCard dia={progresso.dia} semana={progresso.semana} metaDia={config.meta_diaria} metaSemana={config.meta_semanal} />
      <ManutencaoCard refresh={reload} />

      <button
        onClick={() => setShowConfig((v) => !v)}
        aria-expanded={showConfig || !configurado}
        className="mt-4 flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-medium hover:border-ring"
      >
        <span className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-primary" />
          Configurações da moto
        </span>
        <span className="text-xs text-muted-foreground">
          Gasolina {brl(config.preco_gasolina)} • {config.km_l_estimado} km/l
        </span>
      </button>

      {(showConfig || !configurado) && (
        <div className="mt-3 space-y-3 rounded-xl border border-border bg-card p-4">
          <NumberField label="Saldo inicial em caixa (R$)" hint="Dinheiro que você já tem em mãos. Entra no saldo do Extrato."
            value={config.saldo_inicial_caixa}
            onChange={(v) => setConfig({ ...config, saldo_inicial_caixa: v })} />
          <NumberField label="Preço da gasolina (R$ por litro)" hint="Preço do litro no posto." error={configErrors.preco}
            value={config.preco_gasolina}
            onChange={(v) => setConfig({ ...config, preco_gasolina: v })} />
          <NumberField label="Reserva de manutenção (R$ por km)" hint="Quanto separar por km rodado para óleo, pneus e peças."
            value={config.custo_manutencao_km}
            onChange={(v) => setConfig({ ...config, custo_manutencao_km: v })} />
          <NumberField label="Consumo da moto (km por litro)" hint="Quantos km sua moto faz com 1 litro." error={configErrors.consumo}
            value={config.km_l_estimado}
            onChange={(v) => setConfig({ ...config, km_l_estimado: v })} />
          <NumberField label="Meta diária de faturamento (R$)" hint="Opcional. Deixe 0 para não usar meta."
            value={config.meta_diaria}
            onChange={(v) => setConfig({ ...config, meta_diaria: v })} />
          <NumberField label="Meta semanal de faturamento (R$)" hint="Opcional. A semana começa na segunda-feira."
            value={config.meta_semanal}
            onChange={(v) => setConfig({ ...config, meta_semanal: v })} />
          <p className="text-xs text-muted-foreground">Vale para hoje e para os próximos dias, até você mudar de novo.</p>
          <button
            onClick={saveConfig}
            disabled={savingConfig}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            <Check className="h-4 w-4" /> Salvar configurações
          </button>
        </div>
      )}

      <div className="mt-5 rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-bold">Lucro dos últimos 7 dias</h3>
        {chart.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Ainda não há dias fechados. Lance suas corridas e feche o dia para acompanhar o lucro aqui.
          </p>
        ) : (
          <div className="h-44">
            <ResponsiveContainer>
              <LineChart data={chart}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="data" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} stroke="var(--border)" />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--popover-foreground)",
                  }}
                  formatter={(v: any) => brl(Number(v))}
                />
                <Line type="monotone" dataKey="lucro" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-30 flex h-16 items-center gap-2 rounded-full bg-primary px-6 text-base font-bold text-primary-foreground shadow-2xl shadow-primary/40 transition active:scale-95"
      >
        <Plus className="h-6 w-6" /> Nova corrida
      </button>

      {open && <NovaCorridaModal onClose={() => setOpen(false)} onSaved={() => setReload((n) => n + 1)} />}
    </AppShell>
  );
}

function StatCard({
  label, value, icon: Icon, accent, hint,
}: { label: string; value: string; icon: any; accent?: "primary" | "success"; hint?: string }) {
  const color = accent === "success" ? "text-success" : accent === "primary" ? "text-primary" : "text-muted-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="text-xl font-black tracking-tight">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function NumberField({
  label, hint, error, value, onChange,
}: { label: string; hint?: string; error?: string; value: number; onChange: (v: number) => void }) {
  // Guarda o texto digitado: apagar o campo ou digitar "6," não pode virar 0 no meio da digitação.
  const [text, setText] = useState(numToInput(value));
  useEffect(() => {
    if ((parseNum(text) ?? 0) !== value) setText(numToInput(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <Field label={label} hint={hint} error={error}>
      {(p) => (
        <input
          {...p}
          inputMode="decimal"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onChange(Math.max(0, parseNum(e.target.value) ?? 0));
          }}
          className={inputCls}
        />
      )}
    </Field>
  );
}
