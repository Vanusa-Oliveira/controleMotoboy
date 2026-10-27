import { useMemo, useState } from "react";
import { Loader2, Banknote, Smartphone, Check, Clock, History } from "lucide-react";
import { toast } from "sonner";
import { addCorrida, recentesCorridas, updateCorrida, type Corrida } from "@/lib/db";
import { today, brl, parseNum, numToInput } from "@/lib/format";
import { Field, inputCls } from "@/components/Field";
import { Modal } from "@/components/Modal";

type Metodo = "Dinheiro" | "PIX";

export function NovaCorridaModal({
  onClose,
  onSaved,
  editing,
}: {
  onClose: () => void;
  onSaved: () => void;
  editing?: Corrida;
}) {
  const recentes = useMemo(() => (editing ? [] : recentesCorridas(4)), [editing]);
  const destinos = useMemo(
    () => Array.from(new Set(recentesCorridas(30).map((r) => r.destino).filter(Boolean) as string[])).slice(0, 8),
    [],
  );

  const [data, setData] = useState(editing?.data ?? today());
  const [destino, setDestino] = useState(editing?.destino ?? "");
  const [metodo, setMetodo] = useState<Metodo>(editing?.metodo_pagamento ?? recentes[0]?.metodo_pagamento ?? "PIX");
  const [quantidade, setQuantidade] = useState(String(editing?.quantidade ?? 1));
  const [valor, setValor] = useState(editing ? numToInput(editing.valor_unitario) : "");
  const [obs, setObs] = useState(editing?.observacoes ?? "");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ valor?: string; quantidade?: string; data?: string }>({});

  const valorNum = parseNum(valor) ?? 0;
  const qtdNum = parseInt(quantidade) || 0;
  const total = valorNum * qtdNum;

  const preencher = (r: (typeof recentes)[number]) => {
    setDestino(r.destino ?? "");
    setMetodo(r.metodo_pagamento);
    setQuantidade(String(r.quantidade));
    setValor(numToInput(r.valor_unitario));
    setErrors({});
  };

  const save = (pago: boolean) => {
    const e: typeof errors = {};
    const v = parseNum(valor);
    const q = parseInt(quantidade);
    if (v === null) e.valor = "Informe o valor da corrida.";
    else if (v <= 0) e.valor = "O valor precisa ser maior que zero.";
    else if (v > 2000) e.valor = "Valor muito alto para uma corrida. Confira se digitou certo.";
    if (!q || q < 1) e.quantidade = "Use pelo menos 1.";
    else if (q > 100) e.quantidade = "Quantidade muito alta. Confira se digitou certo.";
    if (!data) e.data = "Escolha a data.";
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      if (editing) {
        updateCorrida(editing.id, {
          data,
          destino: destino.trim() || null,
          metodo_pagamento: metodo,
          quantidade: q,
          valor_unitario: v!,
          observacoes: obs.trim() || null,
          pago,
        });
      } else {
        addCorrida({
          data,
          hora: new Date().toTimeString().slice(0, 8),
          destino: destino.trim() || null,
          metodo_pagamento: metodo,
          quantidade: q,
          valor_unitario: v!,
          observacoes: obs.trim() || null,
          pago,
        });
      }
    } catch (err: any) {
      setSaving(false);
      return toast.error(err?.message ?? "Não foi possível salvar a corrida.");
    }
    setSaving(false);
    toast.success(editing ? "Corrida atualizada" : pago ? "Corrida registrada!" : "Registrada como pendente");
    onSaved();
    onClose();
  };

  return (
    <Modal title={editing ? "Editar corrida" : "Nova corrida"} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(true);
        }}
        className="space-y-3"
        noValidate
      >
        {recentes.length > 0 && (
          <div>
            <div className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <History className="h-3.5 w-3.5" /> Repetir uma anterior
            </div>
            <div className="flex flex-wrap gap-1.5">
              {recentes.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => preencher(r)}
                  className="rounded-full border border-input bg-background px-3 py-1.5 text-xs font-semibold hover:border-ring"
                >
                  {r.quantidade > 1 ? `${r.quantidade}× ` : ""}
                  {brl(r.valor_unitario)} · {r.metodo_pagamento}
                  {r.destino ? ` · ${r.destino}` : ""}
                </button>
              ))}
            </div>
          </div>
        )}

        <Field label="Valor por entrega (R$)" error={errors.valor}>
          {(p) => (
            <input
              {...p}
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
              autoFocus
              className={`${inputCls} text-lg font-semibold`}
            />
          )}
        </Field>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Pagamento</span>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Forma de pagamento">
            {(["Dinheiro", "PIX"] as const).map((m) => {
              const active = metodo === m;
              const Icon = m === "Dinheiro" ? Banknote : Smartphone;
              return (
                <button
                  key={m}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setMetodo(m)}
                  className={`flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-semibold transition ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background text-foreground hover:border-ring"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {m}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Quantidade"
            hint="Entregas feitas pelo mesmo valor"
            error={errors.quantidade}
          >
            {(p) => (
              <input
                {...p}
                type="number"
                min={1}
                inputMode="numeric"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                className={inputCls}
              />
            )}
          </Field>
          <Field label="Data" error={errors.data}>
            {(p) => (
              <input
                {...p}
                type="date"
                value={data}
                max={today()}
                onChange={(e) => setData(e.target.value)}
                className={inputCls}
              />
            )}
          </Field>
        </div>

        <Field label="Destino (opcional)">
          {(p) => (
            <>
              <input
                {...p}
                list="destinos-recentes"
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                placeholder="Ex: Centro, Bairro tal..."
                className={inputCls}
              />
              <datalist id="destinos-recentes">
                {destinos.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </>
          )}
        </Field>

        <Field label="Observações (opcional)">
          {(p) => <input {...p} value={obs} onChange={(e) => setObs(e.target.value)} className={inputCls} />}
        </Field>

        {total > 0 && (
          <p className="rounded-lg bg-muted px-3 py-2 text-center text-sm">
            Total da corrida: <span className="font-black">{brl(total)}</span>
          </p>
        )}

        {metodo === "PIX" ? (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => save(false)}
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-warning/50 bg-warning/10 py-3.5 text-sm font-bold hover:bg-warning/20 disabled:opacity-60"
            >
              <Clock className="h-4 w-4" /> PIX pendente
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} PIX já pago
            </button>
          </div>
        ) : (
          <button
            type="submit"
            disabled={saving}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-base font-bold text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editing ? "Salvar alterações" : "Salvar corrida"}
          </button>
        )}
      </form>
    </Modal>
  );
}
