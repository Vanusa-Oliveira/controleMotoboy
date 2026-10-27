import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Plus, ArrowDown, ArrowUp, Wrench, Loader2, PiggyBank, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Field, inputCls } from "@/components/Field";
import { Modal } from "@/components/Modal";
import {
  addGasto, addTransacao, deleteGasto, deleteTransacao, getSaldos, listGastos, listTransacoes,
  restoreGasto, restoreTransacao, updateGasto, updateTransacao,
  type Gasto, type Transacao,
} from "@/lib/db";
import { brl, today, fmtDate, parseNum, numToInput } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/extrato")({
  component: ExtratoPage,
});

type Item =
  | { kind: "trans"; id: string; data: string; label: string; valor: number; tipo: "Entrada" | "Saida"; meta: string; row: Transacao }
  | { kind: "gasto"; id: string; data: string; label: string; valor: number; tipo: "Entrada" | "Saida"; meta: string; row: Gasto };

type ModalState = null | { kind: "trans"; row?: Transacao } | { kind: "gasto"; row?: Gasto };

const CATEGORIAS = ["Cofrinho", "Manutenção", "Combustível", "Pessoal", "Outros"] as const;
const CONTAS = ["Dinheiro", "Banco/PIX"] as const;

function ExtratoPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [saldos, setSaldos] = useState({ dinheiro: 0, banco: 0, inicial: 0 });
  const [modal, setModal] = useState<ModalState>(null);

  const load = useCallback(() => {
    const trans = listTransacoes(500).map((r): Item => ({
      kind: "trans", id: r.id, data: r.data,
      label: `${r.categoria}${r.observacoes ? ` — ${r.observacoes}` : ""}`,
      valor: r.valor, tipo: r.tipo, meta: r.conta_origem, row: r,
    }));
    const gastos = listGastos(500).map((r): Item => ({
      kind: "gasto", id: r.id, data: r.data,
      label: `🔧 ${r.servico_peca}`, valor: r.valor, tipo: "Saida",
      meta: [r.conta_origem ?? "Dinheiro", r.km_no_momento ? `${r.km_no_momento} km` : null].filter(Boolean).join(" • "),
      row: r,
    }));
    setItems([...trans, ...gastos].sort((a, b) => b.data.localeCompare(a.data)));
    setSaldos(getSaldos());
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = (it: Item) => {
    if (it.kind === "trans") {
      const row = deleteTransacao(it.id);
      load();
      if (row) toast("Lançamento excluído", { action: { label: "Desfazer", onClick: () => { restoreTransacao(row); load(); } } });
    } else {
      const row = deleteGasto(it.id);
      load();
      if (row) toast("Gasto excluído", { action: { label: "Desfazer", onClick: () => { restoreGasto(row); load(); } } });
    }
  };

  return (
    <AppShell title="Extrato & Finanças">
      <div className="grid grid-cols-2 gap-3">
        <SaldoCard label="Dinheiro" value={saldos.dinheiro} />
        <SaldoCard label="Banco / PIX" value={saldos.banco} />
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        Saldo = {saldos.inicial > 0 ? `saldo inicial (${brl(saldos.inicial)}) + ` : ""}movimentações − gastos da moto.
        As corridas não entram aqui; registre o que você guardar ou retirar.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={() => setModal({ kind: "trans" })}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-3 text-sm font-bold text-primary-foreground">
          <PiggyBank className="h-4 w-4" /> Movimentação
        </button>
        <button onClick={() => setModal({ kind: "gasto" })}
          className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-3 text-sm font-bold">
          <Wrench className="h-4 w-4" /> Gasto da moto
        </button>
      </div>

      <h3 className="mb-2 mt-5 text-xs font-bold uppercase text-muted-foreground">Lançamentos</h3>
      <div className="space-y-2">
        {items.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Nenhum lançamento ainda. Use os botões acima para guardar dinheiro no cofrinho ou registrar um gasto da moto.
          </p>
        )}
        {items.map((it) => (
          <div key={`${it.kind}-${it.id}`} className="flex items-center gap-1 rounded-xl border border-border bg-card pr-1">
            <button
              onClick={() => setModal(it.kind === "trans" ? { kind: "trans", row: it.row } : { kind: "gasto", row: it.row })}
              aria-label={`Editar ${it.label}`}
              className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left"
            >
              <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                it.tipo === "Entrada" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
              }`}>
                {it.tipo === "Entrada" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{it.label}</div>
                <div className="truncate text-xs text-muted-foreground">{fmtDate(it.data)} • {it.meta}</div>
              </div>
              <div className={`shrink-0 whitespace-nowrap font-bold ${it.tipo === "Entrada" ? "text-success" : "text-destructive"}`}>
                {it.tipo === "Entrada" ? "+" : "-"}{brl(it.valor)}
              </div>
              <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            </button>
            <button onClick={() => remove(it)} aria-label={`Excluir ${it.label}`}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {modal?.kind === "trans" && <TransModal row={modal.row} onClose={() => setModal(null)} onSaved={load} />}
      {modal?.kind === "gasto" && <GastoModal row={modal.row} onClose={() => setModal(null)} onSaved={load} />}
    </AppShell>
  );
}

function SaldoCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[11px] uppercase text-muted-foreground">{label}</div>
      <div className={`mt-1 text-xl font-black ${value < 0 ? "text-destructive" : "text-success"}`}>{brl(value)}</div>
    </div>
  );
}

function validarValor(raw: string) {
  const v = parseNum(raw);
  if (v === null) return { error: "Informe o valor." };
  if (v <= 0) return { error: "O valor precisa ser maior que zero." };
  return { v };
}

function TransModal({ row, onClose, onSaved }: { row?: Transacao; onClose: () => void; onSaved: () => void }) {
  const [tipo, setTipo] = useState<"Entrada" | "Saida">(row?.tipo ?? "Saida");
  const [valor, setValor] = useState(row ? numToInput(row.valor) : "");
  const [categoria, setCategoria] = useState<Transacao["categoria"]>(row?.categoria ?? "Cofrinho");
  const [conta, setConta] = useState<Transacao["conta_origem"]>(row?.conta_origem ?? "Dinheiro");
  const [data, setData] = useState(row?.data ?? today());
  const [obs, setObs] = useState(row?.observacoes ?? "");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ valor?: string }>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = validarValor(valor);
    if (r.error) return setErrors({ valor: r.error });
    setErrors({});
    setSaving(true);
    const dados = { data: data || today(), tipo, valor: r.v!, categoria, conta_origem: conta, observacoes: obs.trim() || null };
    try {
      if (row) updateTransacao(row.id, dados);
      else addTransacao(dados);
    } catch (err: any) {
      setSaving(false);
      return toast.error(err?.message ?? "Não foi possível salvar.");
    }
    setSaving(false);
    toast.success(row ? "Lançamento atualizado" : "Salvo!");
    onSaved(); onClose();
  };

  return (
    <Modal title={row ? "Editar movimentação" : "Nova movimentação"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Tipo">
          {(["Entrada", "Saida"] as const).map((t) => (
            <button key={t} type="button" aria-pressed={tipo === t} onClick={() => setTipo(t)}
              className={`rounded-lg py-2.5 text-sm font-semibold ${
                tipo === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>{t === "Saida" ? "Saída" : "Entrada"}</button>
          ))}
        </div>
        <Field label="Valor (R$)" error={errors.valor}>
          {(p) => (
            <input {...p} inputMode="decimal" autoFocus value={valor} onChange={(e) => setValor(e.target.value)}
              placeholder="0,00" className={`${inputCls} text-lg font-semibold`} />
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoria">
            {(p) => (
              <select {...p} value={categoria} onChange={(e) => setCategoria(e.target.value as Transacao["categoria"])} className={inputCls}>
                {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
              </select>
            )}
          </Field>
          <Field label="Conta">
            {(p) => (
              <select {...p} value={conta} onChange={(e) => setConta(e.target.value as Transacao["conta_origem"])} className={inputCls}>
                {CONTAS.map((c) => <option key={c}>{c}</option>)}
              </select>
            )}
          </Field>
        </div>
        <Field label="Data">
          {(p) => <input {...p} type="date" value={data} max={today()} onChange={(e) => setData(e.target.value)} className={inputCls} />}
        </Field>
        <Field label="Observação (opcional)">
          {(p) => <input {...p} value={obs} onChange={(e) => setObs(e.target.value)} className={inputCls} />}
        </Field>
        <button disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Salvar
        </button>
      </form>
    </Modal>
  );
}

function GastoModal({ row, onClose, onSaved }: { row?: Gasto; onClose: () => void; onSaved: () => void }) {
  const [servico, setServico] = useState(row?.servico_peca ?? "");
  const [valor, setValor] = useState(row ? numToInput(row.valor) : "");
  const [km, setKm] = useState(row?.km_no_momento != null ? numToInput(row.km_no_momento) : "");
  const [conta, setConta] = useState<NonNullable<Gasto["conta_origem"]>>(row?.conta_origem ?? "Dinheiro");
  const [data, setData] = useState(row?.data ?? today());
  const [obs, setObs] = useState(row?.observacoes ?? "");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ servico?: string; valor?: string; km?: string }>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!servico.trim()) errs.servico = "Diga o serviço ou a peça (ex: óleo).";
    const r = validarValor(valor);
    if (r.error) errs.valor = r.error;
    const kmN = km.trim() ? parseNum(km) : null;
    if (km.trim() && (kmN === null || kmN < 0)) errs.km = "KM inválido.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    const dados = {
      data: data || today(), servico_peca: servico.trim(), valor: r.v!, km_no_momento: kmN,
      conta_origem: conta, observacoes: obs.trim() || null,
    };
    try {
      if (row) updateGasto(row.id, dados);
      else addGasto(dados);
    } catch (err: any) {
      setSaving(false);
      return toast.error(err?.message ?? "Não foi possível salvar.");
    }
    setSaving(false);
    toast.success(row ? "Gasto atualizado" : "Gasto registrado");
    onSaved(); onClose();
  };

  return (
    <Modal title={row ? "Editar gasto da moto" : "Gasto da moto"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <Field label="Serviço ou peça" error={errors.servico}>
          {(p) => <input {...p} value={servico} onChange={(e) => setServico(e.target.value)} placeholder="Ex: óleo" autoFocus className={inputCls} />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor (R$)" error={errors.valor}>
            {(p) => <input {...p} inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" className={`${inputCls} text-lg font-semibold`} />}
          </Field>
          <Field label="KM no momento (opcional)" error={errors.km}>
            {(p) => <input {...p} inputMode="decimal" value={km} onChange={(e) => setKm(e.target.value)} className={inputCls} />}
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Pago com">
            {(p) => (
              <select {...p} value={conta} onChange={(e) => setConta(e.target.value as typeof conta)} className={inputCls}>
                {CONTAS.map((c) => <option key={c}>{c}</option>)}
              </select>
            )}
          </Field>
          <Field label="Data">
            {(p) => <input {...p} type="date" value={data} max={today()} onChange={(e) => setData(e.target.value)} className={inputCls} />}
          </Field>
        </div>
        <Field label="Observação (opcional)">
          {(p) => <input {...p} value={obs} onChange={(e) => setObs(e.target.value)} className={inputCls} />}
        </Field>
        <button disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />} {row ? "Salvar alterações" : "Registrar gasto"}
        </button>
      </form>
    </Modal>
  );
}
