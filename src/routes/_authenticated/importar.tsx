import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Loader2, Info, Check, AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Field, inputCls } from "@/components/Field";
import { addCorrida, listCorridas } from "@/lib/db";
import { brl, numToInput, parseNum, today } from "@/lib/format";
import { VALOR_PADRAO, lerTexto, totalDe, type LinhaLida, type Pagamento } from "@/lib/importar";

export const Route = createFileRoute("/_authenticated/importar")({
  component: ImportarPage,
});

type Item = {
  id: string;
  nome: string;
  qtd: string;
  valor: string;
  valorEditado: boolean;
  pagamento: Pagamento;
  incluir: boolean;
  duplicada: boolean;
};

const PAGAMENTOS: Pagamento[] = ["Dinheiro", "Pix", "Pendente"];
const VALOR_KEY = "rotapro:valor-padrao";

const valorSalvo = () => {
  try {
    const v = parseNum(localStorage.getItem(VALOR_KEY) ?? "");
    if (v && v > 0) return v;
  } catch {
    /* sem armazenamento: usa o padrão */
  }
  return VALOR_PADRAO;
};

let seq = 0;
const novoId = () => `imp-${Date.now()}-${seq++}`;

function ImportarPage() {
  const [data, setData] = useState(today());
  const [valorPadrao, setValorPadrao] = useState(() => numToInput(valorSalvo()));
  const [itens, setItens] = useState<Item[]>([]);
  const [ignoradas, setIgnoradas] = useState<{ raw: string; motivo: string }[]>([]);
  const [texto, setTexto] = useState("");
  const [leu, setLeu] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvas, setSalvas] = useState<number | null>(null);

  const valorPadraoNum = parseNum(valorPadrao) ?? 0;

  // Marca como "possível duplicada" o que já existe lançado no mesmo dia (mesmo nome, quantidade e valor).
  const jaLancadas = useMemo(() => listCorridas({ data }), [data, salvas]);
  const ehDuplicada = (nome: string, qtd: number, valor: number) =>
    jaLancadas.some(
      (c) => (c.destino ?? "").trim().toLowerCase() === nome.trim().toLowerCase() && c.quantidade === qtd && c.valor_unitario === valor,
    );

  const mudarValorPadrao = (v: string) => {
    setValorPadrao(v);
    const n = parseNum(v);
    if (n && n > 0) {
      try {
        localStorage.setItem(VALOR_KEY, String(n));
      } catch {
        /* ignora */
      }
      // Quem ainda não teve o valor editado à mão acompanha o novo padrão.
      setItens((its) => its.map((it) => (it.valorEditado ? it : { ...it, valor: numToInput(n) })));
    }
  };

  const adicionar = (linhas: LinhaLida[]) => {
    const v = valorPadraoNum > 0 ? valorPadraoNum : VALOR_PADRAO;
    const novos: Item[] = [];
    const fora: { raw: string; motivo: string }[] = [];
    for (const l of linhas) {
      if (!l.ok) {
        if (l.motivo !== "linha vazia") fora.push({ raw: l.raw, motivo: l.motivo });
        continue;
      }
      const dup = ehDuplicada(l.nome, l.qtd, v);
      novos.push({
        id: novoId(), nome: l.nome, qtd: String(l.qtd), valor: numToInput(v), valorEditado: false,
        pagamento: l.pagamento, incluir: !dup, duplicada: dup,
      });
    }
    setItens((its) => [...its, ...novos]);
    setIgnoradas((ig) => [...ig, ...fora]);
    setLeu(true);
    setSalvas(null);
    if (novos.length === 0) toast.error("Não encontrei nenhuma corrida no texto. Confira se copiou as mensagens certas.");
    else toast.success(`${novos.length} ${novos.length === 1 ? "anotação encontrada" : "anotações encontradas"}. Confira antes de importar.`);
  };

  const lerColado = () => {
    adicionar(lerTexto(texto));
    setTexto("");
  };

  const atualizar = (id: string, patch: Partial<Item>) => setItens((its) => its.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const erroDe = (it: Item) => {
    const q = parseInt(it.qtd);
    const v = parseNum(it.valor);
    if (!it.nome.trim()) return "Informe o estabelecimento.";
    if (!q || q < 1 || q > 100) return "Quantidade de 1 a 100.";
    if (v === null || v <= 0) return "Informe o valor da corrida.";
    return null;
  };

  const marcados = itens.filter((it) => it.incluir);
  const comErro = marcados.some((it) => erroDe(it));

  const resumo = useMemo(() => {
    const base = { Dinheiro: { n: 0, v: 0 }, Pix: { n: 0, v: 0 }, Pendente: { n: 0, v: 0 } };
    let n = 0;
    let v = 0;
    for (const it of marcados) {
      const q = parseInt(it.qtd) || 0;
      const t = totalDe(q, parseNum(it.valor) ?? 0);
      base[it.pagamento].n += q;
      base[it.pagamento].v += t;
      n += q;
      v += t;
    }
    return { ...base, n, v };
  }, [marcados]);

  const importar = () => {
    if (!marcados.length || comErro) return;
    setSalvando(true);
    try {
      const hora = new Date().toTimeString().slice(0, 8);
      for (const it of marcados) {
        // Um registro por anotação (quantidade × valor unitário), sem duplicar em várias corridas.
        addCorrida({
          data, hora,
          destino: it.nome.trim(),
          metodo_pagamento: it.pagamento === "Dinheiro" ? "Dinheiro" : "PIX",
          quantidade: parseInt(it.qtd),
          valor_unitario: parseNum(it.valor)!,
          observacoes: "Importado do WhatsApp",
          pago: it.pagamento !== "Pendente",
        });
      }
    } catch (err: any) {
      setSalvando(false);
      return toast.error(err?.message ?? "Não foi possível salvar as corridas.");
    }
    setSalvando(false);
    setSalvas(marcados.length);
    toast.success(`${marcados.length} ${marcados.length === 1 ? "lançamento importado" : "lançamentos importados"}!`);
    setItens([]);
    setIgnoradas([]);
    setLeu(false);
  };

  return (
    <AppShell title="Importar do WhatsApp">
      <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
        <div className="mb-1 flex items-center gap-2 text-sm font-bold text-foreground">
          <Info className="h-4 w-4 text-primary" /> Como anotar
        </div>
        <p>
          Escreva <b className="text-foreground">[quantidade] Estabelecimento [emoji]</b>. Sem número vale 1 corrida.
          💵 = dinheiro · 💰 = Pix · sem emoji = pendente. Ex.: <i>3 Minas Grill 💵</i>. Anotações como "Paguei 95" são
          ignoradas.
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Field label="Data das corridas">
          {(p) => <input {...p} type="date" value={data} max={today()} onChange={(e) => setData(e.target.value)} className={inputCls} />}
        </Field>
        <Field label="Valor padrão (R$)" hint="Por corrida; dá para mudar em cada uma.">
          {(p) => <input {...p} inputMode="decimal" value={valorPadrao} onChange={(e) => mudarValorPadrao(e.target.value)} className={inputCls} />}
        </Field>
      </div>

      <div className="mt-3 space-y-2 rounded-xl border border-border bg-card p-3">
        <label htmlFor="texto-colado" className="text-xs font-medium text-muted-foreground">
          No WhatsApp, selecione e copie as mensagens e cole aqui (uma por linha).
        </label>
        <textarea id="texto-colado" value={texto} onChange={(e) => setTexto(e.target.value)} rows={6}
          placeholder={"Minas Grill\n2 Carol Coxinha 💰\n3 Minas Grill 💵\nPaguei 95"}
          className={`${inputCls} font-mono text-sm`} />
        <button onClick={lerColado} disabled={!texto.trim()}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
          Ler mensagens
        </button>
      </div>

      {salvas !== null && !leu && (
        <div className="mt-3 rounded-xl border border-success/40 bg-success/10 p-3 text-sm">
          <b>{salvas} {salvas === 1 ? "lançamento importado" : "lançamentos importados"}.</b>{" "}
          <Link to="/historico" className="font-semibold text-primary underline">Ver em Corridas</Link>
        </div>
      )}

      {itens.length > 0 && (
        <>
          <p className="mt-4 rounded-lg bg-warning/10 px-3 py-2 text-xs">
            <AlertTriangle className="mr-1 inline h-3.5 w-3.5 text-warning" />
            Confira cada linha antes de importar. "Pendente" entra como PIX a receber.
          </p>

          <div className="mt-3 space-y-2">
            {itens.map((it) => {
              const erro = it.incluir ? erroDe(it) : null;
              const total = totalDe(parseInt(it.qtd) || 0, parseNum(it.valor) ?? 0);
              return (
                <div key={it.id} className={`rounded-xl border bg-card p-3 ${it.incluir ? "border-border" : "border-dashed opacity-60"}`}>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={it.incluir} onChange={(e) => atualizar(it.id, { incluir: e.target.checked })}
                      aria-label={`Importar ${it.nome}`} className="h-5 w-5 shrink-0 accent-[var(--primary)]" />
                    <input aria-label="Estabelecimento" value={it.nome} onChange={(e) => atualizar(it.id, { nome: e.target.value })}
                      className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm font-semibold" />
                    <button onClick={() => setItens((its) => its.filter((x) => x.id !== it.id))} aria-label={`Remover ${it.nome}`}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {it.duplicada && (
                    <p className="mt-1.5 text-xs font-medium text-warning">Já existe uma corrida igual neste dia. Desmarcada para não duplicar.</p>
                  )}

                  <div className="mt-2 grid grid-cols-[4.5rem_1fr_auto] items-end gap-2">
                    <label className="text-xs text-muted-foreground">
                      Qtd.
                      <input inputMode="numeric" value={it.qtd} onChange={(e) => atualizar(it.id, { qtd: e.target.value })}
                        className="mt-0.5 w-full rounded-lg border border-input bg-background px-2 py-2 text-base text-foreground" />
                    </label>
                    <label className="text-xs text-muted-foreground">
                      Valor unitário (R$)
                      <input inputMode="decimal" value={it.valor}
                        onChange={(e) => atualizar(it.id, { valor: e.target.value, valorEditado: true })}
                        className="mt-0.5 w-full rounded-lg border border-input bg-background px-2 py-2 text-base text-foreground" />
                    </label>
                    <div className="pb-2 text-right">
                      <div className="text-xs text-muted-foreground">Total</div>
                      <div className="text-base font-black">{brl(total)}</div>
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-1.5" role="group" aria-label="Forma de pagamento">
                    {PAGAMENTOS.map((p) => (
                      <button key={p} aria-pressed={it.pagamento === p} onClick={() => atualizar(it.id, { pagamento: p })}
                        className={`rounded-lg py-2 text-xs font-semibold ${
                          it.pagamento === p
                            ? p === "Pendente" ? "bg-warning text-warning-foreground" : "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}>
                        {p}
                      </button>
                    ))}
                  </div>
                  {erro && <p className="mt-1.5 text-xs font-medium text-destructive">{erro}</p>}
                </div>
              );
            })}
          </div>

          <div className="mt-3 rounded-xl border-2 border-dashed border-primary/40 bg-card p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-xs uppercase text-muted-foreground">Total geral</span>
              <span className="text-2xl font-black text-primary">{brl(resumo.v)}</span>
            </div>
            <p className="text-xs text-muted-foreground">{resumo.n} {resumo.n === 1 ? "corrida" : "corridas"} em {marcados.length} {marcados.length === 1 ? "registro" : "registros"}</p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
              {PAGAMENTOS.map((p) => (
                <div key={p} className="rounded-lg bg-muted px-2 py-1.5">
                  <div className="text-muted-foreground">{p}</div>
                  <div className="font-bold">{brl(resumo[p].v)}</div>
                  <div className="text-muted-foreground">{resumo[p].n} {resumo[p].n === 1 ? "corrida" : "corridas"}</div>
                </div>
              ))}
            </div>
            <button onClick={importar} disabled={!marcados.length || comErro || salvando}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-base font-bold text-primary-foreground disabled:opacity-50">
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-5 w-5" />}
              Importar {marcados.length} {marcados.length === 1 ? "registro" : "registros"}
            </button>
            {comErro && <p className="mt-1.5 text-center text-xs text-destructive">Corrija as linhas em vermelho para importar.</p>}
          </div>
        </>
      )}

      {leu && ignoradas.length > 0 && (
        <details className="mt-3 rounded-xl border border-border bg-card p-3 text-xs">
          <summary className="cursor-pointer font-semibold">Linhas ignoradas ({ignoradas.length})</summary>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {ignoradas.map((l, i) => (
              <li key={i}>
                <span className="text-foreground">"{l.raw}"</span> — {l.motivo}
              </li>
            ))}
          </ul>
        </details>
      )}

      {leu && itens.length === 0 && (
        <p className="mt-6 text-center text-sm text-muted-foreground">Nada para importar. Cole outras mensagens acima.</p>
      )}
    </AppShell>
  );
}
