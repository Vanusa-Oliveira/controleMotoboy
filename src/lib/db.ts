// Armazenamento local (localStorage). Substitui o antigo backend Supabase:
// todos os dados ficam neste aparelho, sem login e sem servidor.

export type Metodo = "Dinheiro" | "PIX";

export type Corrida = {
  id: string;
  data: string;
  hora: string;
  destino: string | null;
  metodo_pagamento: Metodo;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  observacoes: string | null;
  pago: boolean;
};

export type Fechamento = {
  id: string;
  data: string;
  km_rodado: number;
  horas_trabalhadas: number;
  faturamento_bruto: number;
  reserva_gasolina: number;
  reserva_manutencao: number;
  lucro_livre: number;
};

export type Config = {
  data: string;
  saldo_inicial_caixa: number;
  preco_gasolina: number;
  custo_manutencao_km: number;
  km_l_estimado: number;
  // Metas de faturamento recebido (0 ou ausente = sem meta).
  meta_diaria?: number;
  meta_semanal?: number;
};

export type Lembrete = {
  id: string;
  nome: string;
  intervalo_km: number;
};

export type Transacao = {
  id: string;
  data: string;
  tipo: "Entrada" | "Saida";
  valor: number;
  categoria: "Cofrinho" | "Manutenção" | "Combustível" | "Pessoal" | "Outros";
  conta_origem: "Dinheiro" | "Banco/PIX";
  observacoes: string | null;
};

export type Gasto = {
  id: string;
  data: string;
  servico_peca: string;
  valor: number;
  km_no_momento: number | null;
  observacoes: string | null;
  // Conta de onde o dinheiro saiu; sem valor = Dinheiro (registros antigos).
  conta_origem?: "Dinheiro" | "Banco/PIX";
};

type Store = {
  corridas: Corrida[];
  fechamentos: Fechamento[];
  configs: Config[];
  transacoes: Transacao[];
  gastos: Gasto[];
  lembretes: Lembrete[];
};

const KEY = "rotapro:data:v1";

const empty = (): Store => ({ corridas: [], fechamentos: [], configs: [], transacoes: [], gastos: [], lembretes: [] });

// Se o localStorage estiver bloqueado (ex.: modo privado), os dados ficam só em memória.
let memory: Store | null = null;

function read(): Store {
  if (memory) return memory;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...empty(), ...JSON.parse(raw) };
  } catch {
    /* ignora e começa vazio */
  }
  return empty();
}

const STORAGE_EVENT = "rotapro:storage";

function notifyStorage() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(STORAGE_EVENT));
}

function write(s: Store) {
  const wasFailing = memory !== null;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    memory = null;
  } catch {
    memory = s;
  }
  if (wasFailing !== (memory !== null)) notifyStorage();
}

// true quando os dados NÃO estão sendo gravados no aparelho (modo privado, armazenamento cheio...).
export function storageFailing() {
  return memory !== null;
}

export function onStorageChange(fn: () => void) {
  window.addEventListener(STORAGE_EVENT, fn);
  return () => window.removeEventListener(STORAGE_EVENT, fn);
}

// Testa se o navegador aceita gravar; chamado ao abrir o app.
export function probeStorage() {
  try {
    localStorage.setItem("rotapro:probe", "1");
    localStorage.removeItem("rotapro:probe");
  } catch {
    if (!memory) memory = read();
    notifyStorage();
  }
}

// Pede ao navegador para não apagar os dados do app quando faltar espaço.
export async function requestPersistence() {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch {
    /* ignora */
  }
  return false;
}

function mutate<T>(fn: (s: Store) => T): T {
  const s = read();
  const out = fn(s);
  write(s);
  return out;
}

const uid = () => crypto.randomUUID();
const round2 = (n: number) => Math.round(n * 100) / 100;

// Faturamento só conta corridas já recebidas; PIX pendente fica separado em "a receber".
function totais(corridas: Corrida[], data: string) {
  let recebido = 0, pendente = 0, quantidade = 0;
  for (const c of corridas) {
    if (c.data !== data) continue;
    quantidade += c.quantidade;
    if (c.pago) recebido += c.valor_total;
    else pendente += c.valor_total;
  }
  return { recebido: round2(recebido), pendente: round2(pendente), quantidade };
}

export function totaisDoDia(data: string) {
  return totais(read().corridas, data);
}

// Mantém o fechamento do dia (se existir) coerente com as corridas atuais.
function recalcFechamento(s: Store, data: string) {
  const f = s.fechamentos.find((r) => r.data === data);
  if (!f) return;
  f.faturamento_bruto = totais(s.corridas, data).recebido;
  f.lucro_livre = round2(f.faturamento_bruto - f.reserva_gasolina - f.reserva_manutencao);
}

// ---------- corridas ----------
export function listCorridas(f: { data?: string; ini?: string; fim?: string; metodo?: Metodo; pendentes?: boolean } = {}) {
  return read()
    .corridas.filter(
      (c) =>
        (!f.data || c.data === f.data) &&
        (!f.ini || c.data >= f.ini) &&
        (!f.fim || c.data <= f.fim) &&
        (!f.metodo || c.metodo_pagamento === f.metodo) &&
        (!f.pendentes || !c.pago),
    )
    .sort((a, b) => b.data.localeCompare(a.data) || b.hora.localeCompare(a.hora));
}

export function addCorrida(c: Omit<Corrida, "id" | "valor_total">) {
  return mutate((s) => {
    const row: Corrida = { ...c, id: uid(), valor_total: round2(c.quantidade * c.valor_unitario) };
    s.corridas.push(row);
    recalcFechamento(s, row.data);
    return row;
  });
}

export type CorridaPatch = Partial<
  Pick<Corrida, "valor_unitario" | "pago" | "quantidade" | "data" | "destino" | "metodo_pagamento" | "observacoes">
>;

export function updateCorrida(id: string, patch: CorridaPatch) {
  mutate((s) => {
    const c = s.corridas.find((r) => r.id === id);
    if (!c) return;
    const dataAntiga = c.data;
    Object.assign(c, patch);
    if (c.metodo_pagamento === "Dinheiro") c.pago = true;
    c.valor_total = round2(c.quantidade * c.valor_unitario);
    recalcFechamento(s, c.data);
    if (dataAntiga !== c.data) recalcFechamento(s, dataAntiga);
  });
}

// Devolve a corrida removida para permitir "Desfazer".
export function deleteCorrida(id: string) {
  return mutate((s) => {
    const c = s.corridas.find((r) => r.id === id);
    s.corridas = s.corridas.filter((r) => r.id !== id);
    if (c) recalcFechamento(s, c.data);
    return c ?? null;
  });
}

export function restoreCorrida(c: Corrida) {
  mutate((s) => {
    if (s.corridas.some((r) => r.id === c.id)) return;
    s.corridas.push(c);
    recalcFechamento(s, c.data);
  });
}

// Últimas combinações distintas (destino + pagamento + valor + quantidade) para lançar de novo com um toque.
export function recentesCorridas(limit = 4) {
  const vistos = new Set<string>();
  const out: Pick<Corrida, "destino" | "metodo_pagamento" | "valor_unitario" | "quantidade">[] = [];
  const todas = read().corridas.slice().sort((a, b) => b.data.localeCompare(a.data) || b.hora.localeCompare(a.hora));
  for (const c of todas) {
    const k = `${c.destino ?? ""}|${c.metodo_pagamento}|${c.valor_unitario}|${c.quantidade}`;
    if (vistos.has(k)) continue;
    vistos.add(k);
    out.push({
      destino: c.destino,
      metodo_pagamento: c.metodo_pagamento,
      valor_unitario: c.valor_unitario,
      quantidade: c.quantidade,
    });
    if (out.length >= limit) break;
  }
  return out;
}

// ---------- fechamento diário ----------
export function getFechamento(data: string) {
  return read().fechamentos.find((f) => f.data === data) ?? null;
}

export function listFechamentos(f: { since?: string; limit?: number } = {}) {
  const rows = read()
    .fechamentos.filter((r) => !f.since || r.data >= f.since)
    .sort((a, b) => b.data.localeCompare(a.data));
  return f.limit ? rows.slice(0, f.limit) : rows;
}

export function saveFechamento(row: Omit<Fechamento, "id">) {
  return mutate((s) => {
    const cur = s.fechamentos.find((f) => f.data === row.data);
    if (cur) {
      Object.assign(cur, row);
      return cur;
    }
    const novo: Fechamento = { ...row, id: uid() };
    s.fechamentos.push(novo);
    return novo;
  });
}

export function updateFechamento(id: string, patch: Partial<Fechamento>) {
  mutate((s) => {
    const f = s.fechamentos.find((r) => r.id === id);
    if (f) Object.assign(f, patch);
  });
}

// ---------- configurações do dia ----------
// Usa a configuração do dia; se não houver, herda a mais recente anterior a ele.
export function getConfig(data: string) {
  const anteriores = read()
    .configs.filter((c) => c.data <= data)
    .sort((a, b) => b.data.localeCompare(a.data));
  return anteriores[0] ?? null;
}

export function saveConfig(cfg: Config) {
  mutate((s) => {
    const cur = s.configs.find((c) => c.data === cfg.data);
    if (cur) Object.assign(cur, cfg);
    else s.configs.push(cfg);
  });
}

// ---------- extrato ----------
export function listTransacoes(limit = 100) {
  return read()
    .transacoes.slice()
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, limit);
}

export function addTransacao(t: Omit<Transacao, "id">) {
  mutate((s) => {
    s.transacoes.push({ ...t, id: uid() });
  });
}

export function updateTransacao(id: string, patch: Partial<Omit<Transacao, "id">>) {
  mutate((s) => {
    const t = s.transacoes.find((r) => r.id === id);
    if (t) Object.assign(t, patch);
  });
}

export function deleteTransacao(id: string) {
  return mutate((s) => {
    const t = s.transacoes.find((r) => r.id === id);
    s.transacoes = s.transacoes.filter((r) => r.id !== id);
    return t ?? null;
  });
}

export function restoreTransacao(t: Transacao) {
  mutate((s) => {
    if (!s.transacoes.some((r) => r.id === t.id)) s.transacoes.push(t);
  });
}

export function listGastos(limit = 100) {
  return read()
    .gastos.slice()
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, limit);
}

export function addGasto(g: Omit<Gasto, "id">) {
  mutate((s) => {
    s.gastos.push({ ...g, id: uid() });
  });
}

export function updateGasto(id: string, patch: Partial<Omit<Gasto, "id">>) {
  mutate((s) => {
    const g = s.gastos.find((r) => r.id === id);
    if (g) Object.assign(g, patch);
  });
}

export function deleteGasto(id: string) {
  return mutate((s) => {
    const g = s.gastos.find((r) => r.id === id);
    s.gastos = s.gastos.filter((r) => r.id !== id);
    return g ?? null;
  });
}

export function restoreGasto(g: Gasto) {
  mutate((s) => {
    if (!s.gastos.some((r) => r.id === g.id)) s.gastos.push(g);
  });
}

// Saldo de cada conta com TODOS os lançamentos (não só os exibidos na lista):
// saldo inicial em caixa (da configuração mais antiga) + corridas já recebidas
// (dinheiro → Dinheiro, PIX pago → Banco/PIX) + movimentações − gastos da moto.
export function getSaldos() {
  const s = read();
  const inicial = s.configs.slice().sort((a, b) => a.data.localeCompare(b.data))[0]?.saldo_inicial_caixa ?? 0;
  let dinheiro = inicial;
  let banco = 0;
  for (const c of s.corridas) {
    if (!c.pago) continue;
    if (c.metodo_pagamento === "Dinheiro") dinheiro += c.valor_total;
    else banco += c.valor_total;
  }
  for (const t of s.transacoes) {
    const v = t.tipo === "Entrada" ? t.valor : -t.valor;
    if (t.conta_origem === "Dinheiro") dinheiro += v;
    else banco += v;
  }
  for (const g of s.gastos) {
    if (g.conta_origem === "Banco/PIX") banco -= g.valor;
    else dinheiro -= g.valor;
  }
  return { dinheiro: round2(dinheiro), banco: round2(banco), inicial };
}

// ---------- metas ----------
// Faturamento recebido (corridas pagas) entre duas datas, inclusive.
export function faturamentoPeriodo(ini: string, fim: string) {
  let total = 0;
  for (const c of read().corridas) {
    if (c.pago && c.data >= ini && c.data <= fim) total += c.valor_total;
  }
  return round2(total);
}

// ---------- lembretes de manutenção ----------
export function listLembretes() {
  return read().lembretes.slice().sort((a, b) => a.nome.localeCompare(b.nome));
}

export function addLembrete(nome: string, intervalo_km: number) {
  mutate((s) => {
    s.lembretes.push({ id: uid(), nome, intervalo_km });
  });
}

export function deleteLembrete(id: string) {
  mutate((s) => {
    s.lembretes = s.lembretes.filter((l) => l.id !== id);
  });
}

const semAcento = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Km rodado desde o último gasto cujo nome contém o do lembrete (ex.: "óleo").
// Sem nenhum gasto correspondente, conta todo o km já fechado.
export function statusManutencao() {
  const s = read();
  return s.lembretes
    .map((l) => {
      const chave = semAcento(l.nome);
      const ultimo = s.gastos
        .filter((g) => semAcento(g.servico_peca).includes(chave))
        .sort((a, b) => b.data.localeCompare(a.data))[0];
      const kmDesde = s.fechamentos
        .filter((f) => !ultimo || f.data > ultimo.data)
        .reduce((a, f) => a + f.km_rodado, 0);
      const restante = l.intervalo_km - kmDesde;
      return {
        lembrete: l,
        ultimo: ultimo?.data ?? null,
        kmDesde: Math.round(kmDesde),
        restante: Math.round(restante),
        pct: l.intervalo_km > 0 ? Math.min(1, kmDesde / l.intervalo_km) : 0,
      };
    })
    .sort((a, b) => b.pct - a.pct);
}

// ---------- backup ----------
export function exportBackup(): string {
  return JSON.stringify({ app: "rotapro", version: 1, exportedAt: new Date().toISOString(), data: read() }, null, 2);
}

export function importBackup(json: string) {
  const parsed = JSON.parse(json);
  const d = parsed?.app === "rotapro" ? parsed.data : null;
  if (!d || typeof d !== "object") throw new Error("Arquivo de backup inválido");
  const next = empty();
  for (const k of Object.keys(next) as (keyof Store)[]) {
    if (Array.isArray(d[k])) (next[k] as unknown[]) = d[k];
  }
  write(next);
}
