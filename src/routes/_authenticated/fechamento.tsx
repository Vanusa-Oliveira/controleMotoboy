import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Receipt, Loader2, Fuel, Wrench, Banknote, Clock, Route as RouteIcon, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Field, inputCls } from "@/components/Field";
import { getConfig, getFechamento, saveFechamento, totaisDoDia, type Fechamento } from "@/lib/db";
import { brl, horasEntre, numToInput, parseNum, today } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/fechamento")({
  component: FechamentoPage,
});

function FechamentoPage() {
  const [data, setData] = useState(today());
  const [km, setKm] = useState("");
  const [horas, setHoras] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [bruto, setBruto] = useState(0);
  const [qtdCorridas, setQtdCorridas] = useState(0);
  const [pendente, setPendente] = useState(0);
  const [config, setConfig] = useState({ preco_gasolina: 6, custo_manutencao_km: 0.15, km_l_estimado: 33 });
  const [configurado, setConfigurado] = useState(true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<Fechamento | null>(null);
  const [errors, setErrors] = useState<{ km?: string; horas?: string }>({});

  useEffect(() => {
    setResult(null);
    setKm("");
    setHoras("");
    setInicio("");
    setFim("");
    setErrors({});
    const dia = totaisDoDia(data);
    const cfg = getConfig(data);
    const f = getFechamento(data);
    setBruto(dia.recebido);
    setPendente(dia.pendente);
    setQtdCorridas(dia.quantidade);
    setConfigurado(!!cfg);
    if (cfg) {
      setConfig({
        preco_gasolina: cfg.preco_gasolina,
        custo_manutencao_km: cfg.custo_manutencao_km,
        km_l_estimado: cfg.km_l_estimado || 33,
      });
    }
    if (f) {
      setKm(numToInput(f.km_rodado));
      setHoras(numToInput(f.horas_trabalhadas));
      setResult(f);
    }
  }, [data]);

  const onTurno = (ini: string, f: string) => {
    setInicio(ini);
    setFim(f);
    const h = horasEntre(ini, f);
    if (h !== null) {
      setHoras(numToInput(h));
      setErrors((e) => ({ ...e, horas: undefined }));
    }
  };

  const kmN = parseNum(km) ?? 0;
  const horasN = parseNum(horas) ?? 0;
  const valido = kmN > 0 && horasN > 0;

  // Cálculo ao vivo: o resultado aparece enquanto você digita, antes de salvar.
  const calc = valido
    ? (() => {
        const reserva_gasolina = (kmN / (config.km_l_estimado || 33)) * config.preco_gasolina;
        const reserva_manutencao = kmN * config.custo_manutencao_km;
        return {
          reserva_gasolina,
          reserva_manutencao,
          lucro_livre: bruto - reserva_gasolina - reserva_manutencao,
        };
      })()
    : null;

  const salvoIgual = !!result && result.km_rodado === kmN && result.horas_trabalhadas === horasN;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!km.trim()) errs.km = "Informe quantos km você rodou.";
    else if (kmN <= 0) errs.km = "O km precisa ser maior que zero.";
    else if (kmN > 1000) errs.km = "Mais de 1.000 km em um dia? Confira se digitou certo.";
    if (!horas.trim()) errs.horas = "Informe as horas ou o horário de início e fim.";
    else if (horasN <= 0) errs.horas = "As horas precisam ser maiores que zero.";
    else if (horasN > 24) errs.horas = "Um dia tem no máximo 24 horas.";
    setErrors(errs);
    if (Object.keys(errs).length || !calc) return;

    setSaving(true);
    let row: Fechamento;
    try {
      row = saveFechamento({
        data,
        km_rodado: kmN,
        horas_trabalhadas: horasN,
        faturamento_bruto: bruto,
        reserva_gasolina: calc.reserva_gasolina,
        reserva_manutencao: calc.reserva_manutencao,
        lucro_livre: calc.lucro_livre,
      });
    } catch (err: any) {
      setSaving(false);
      return toast.error(err?.message ?? "Não foi possível salvar o fechamento.");
    }
    setSaving(false);
    setResult({ ...row });
    toast.success(result ? "Fechamento atualizado!" : "Dia fechado!");
  };

  const corridasHora = horasN > 0 ? qtdCorridas / horasN : 0;
  const lucroHora = horasN > 0 && calc ? calc.lucro_livre / horasN : 0;

  return (
    <AppShell title="Fechar o dia">
      {!configurado && (
        <Link to="/" className="mb-3 flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <span>
            Você ainda não configurou a sua moto, então o cálculo usa valores de exemplo (gasolina R$ 6,00 e 33 km/L).{" "}
            <span className="font-semibold text-primary">Configurar agora →</span>
          </span>
        </Link>
      )}

      <form onSubmit={submit} noValidate className="space-y-3 rounded-xl border border-border bg-card p-4">
        <Field label="Data do fechamento">
          {(p) => (
            <input {...p} type="date" value={data} max={today()} onChange={(e) => setData(e.target.value)}
              className={`${inputCls} py-3 font-semibold`} />
          )}
        </Field>

        {result && (
          <p className="flex items-center gap-1.5 rounded-lg bg-success/10 px-3 py-2 text-xs text-success">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Este dia já está fechado. Se mudar km ou horas, toque em Atualizar fechamento.
          </p>
        )}

        <Field label="KM rodado" error={errors.km}>
          {(p) => (
            <input {...p} inputMode="decimal" value={km} placeholder="Ex: 120"
              onChange={(e) => { setKm(e.target.value); setErrors((x) => ({ ...x, km: undefined })); }}
              className={`${inputCls} py-3 text-lg font-semibold`} />
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Comecei às">
            {(p) => <input {...p} type="time" value={inicio} onChange={(e) => onTurno(e.target.value, fim)} className={inputCls} />}
          </Field>
          <Field label="Terminei às">
            {(p) => <input {...p} type="time" value={fim} onChange={(e) => onTurno(inicio, e.target.value)} className={inputCls} />}
          </Field>
        </div>

        <Field
          label="Horas trabalhadas"
          hint="Preenchido sozinho pelos horários; ou digite direto (ex: 8,5 = 8h30)."
          error={errors.horas}
        >
          {(p) => (
            <input {...p} inputMode="decimal" value={horas} placeholder="Ex: 8"
              onChange={(e) => { setHoras(e.target.value); setErrors((x) => ({ ...x, horas: undefined })); }}
              className={`${inputCls} py-3 text-lg font-semibold`} />
          )}
        </Field>

        <div className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          Faturamento do dia: <span className="font-bold text-foreground">{brl(bruto)}</span> em {qtdCorridas} {qtdCorridas === 1 ? "corrida" : "corridas"}
          {qtdCorridas === 0 && (
            <div className="mt-1">Nenhuma corrida lançada neste dia. O lucro sairá negativo (só as reservas).</div>
          )}
          {pendente > 0 && (
            <div className="mt-1">
              A receber (PIX pendente): <span className="font-bold text-warning">{brl(pendente)}</span> — fora do faturamento
            </div>
          )}
        </div>
        <button type="submit" disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-base font-bold text-primary-foreground disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-5 w-5" />}
          {result ? "Atualizar fechamento" : "Fechar o dia"}
        </button>
      </form>

      {calc && (
        <div className="mt-5 overflow-hidden rounded-2xl border-2 border-dashed border-primary/40 bg-card">
          <div className="border-b border-border bg-primary/10 px-5 py-3">
            <h3 className="text-center text-sm font-black uppercase tracking-wider text-primary">
              {salvoIgual ? "Recibo do dia" : "Prévia (ainda não salva)"}
            </h3>
          </div>
          <div className="space-y-3 p-5">
            <Row icon={Banknote} label="Faturamento recebido" value={brl(bruto)} />
            <Row icon={Fuel} label="Reserva gasolina" value={`- ${brl(calc.reserva_gasolina)}`} negative />
            <Row icon={Wrench} label="Reserva manutenção" value={`- ${brl(calc.reserva_manutencao)}`} negative />
            <div className="border-t border-dashed border-border pt-3">
              <Row icon={Banknote} label="LUCRO LIVRE" value={brl(calc.lucro_livre)} highlight />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <MiniStat icon={RouteIcon} label="Corridas/hora" value={corridasHora.toFixed(2)} />
              <MiniStat icon={Clock} label="R$/hora" value={brl(lucroHora)} />
            </div>
            <p className="pt-2 text-center text-xs text-muted-foreground">
              Separe {brl(calc.reserva_gasolina)} pra gasolina e {brl(calc.reserva_manutencao)} pro cofrinho de manutenção.
            </p>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Row({ icon: Icon, label, value, negative, highlight }: any) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </span>
      <span className={`font-bold ${highlight ? "text-xl text-success" : negative ? "text-destructive" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: any) {
  return (
    <div className="rounded-lg bg-muted px-3 py-2">
      <div className="mb-0.5 flex items-center gap-1 text-[11px] uppercase text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="text-base font-bold">{value}</div>
    </div>
  );
}
