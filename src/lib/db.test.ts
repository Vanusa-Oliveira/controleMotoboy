import { beforeEach, describe, expect, it, vi } from "vitest";

// localStorage mínimo para rodar o db fora do navegador.
const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
});

import {
  addCorrida, addGasto, addLembrete, addTransacao, deleteCorrida, faturamentoPeriodo, getConfig, getFechamento,
  getSaldos, restoreCorrida, saveConfig, saveFechamento, statusManutencao, totaisDoDia, updateCorrida, listCorridas,
} from "./db";
import { horasEntre, numToInput, parseNum, escapeHtml } from "./format";

const corrida = (over: Partial<Parameters<typeof addCorrida>[0]> = {}) =>
  addCorrida({
    data: "2026-10-26", hora: "10:00:00", destino: null, metodo_pagamento: "Dinheiro",
    quantidade: 1, valor_unitario: 10, observacoes: null, pago: true, ...over,
  });

const fechar = (data: string, km = 100) =>
  saveFechamento({
    data, km_rodado: km, horas_trabalhadas: 8, faturamento_bruto: 0,
    reserva_gasolina: 10, reserva_manutencao: 5, lucro_livre: -15,
  });

beforeEach(() => store.clear());

describe("faturamento do dia", () => {
  it("PIX pendente fica em 'a receber' e não entra no faturamento", () => {
    corrida({ valor_unitario: 10 });
    corrida({ metodo_pagamento: "PIX", pago: false, valor_unitario: 20 });
    expect(totaisDoDia("2026-10-26")).toEqual({ recebido: 10, pendente: 20, quantidade: 2 });
  });

  it("multiplica quantidade por valor unitário", () => {
    corrida({ quantidade: 3, valor_unitario: 7.5 });
    expect(totaisDoDia("2026-10-26").recebido).toBe(22.5);
  });

  it("marcar o PIX como pago passa o valor para o faturamento", () => {
    const c = corrida({ metodo_pagamento: "PIX", pago: false, valor_unitario: 20 });
    updateCorrida(c.id, { pago: true });
    expect(totaisDoDia("2026-10-26")).toMatchObject({ recebido: 20, pendente: 0 });
  });

  it("corrida em dinheiro sempre conta como paga", () => {
    const c = corrida({ metodo_pagamento: "PIX", pago: false });
    updateCorrida(c.id, { metodo_pagamento: "Dinheiro" });
    expect(listCorridas()[0].pago).toBe(true);
  });
});

describe("fechamento é recalculado", () => {
  it("ao pagar, editar e excluir corridas", () => {
    const a = corrida({ valor_unitario: 10 });
    const b = corrida({ metodo_pagamento: "PIX", pago: false, valor_unitario: 20 });
    fechar("2026-10-26");

    updateCorrida(b.id, { pago: true });
    expect(getFechamento("2026-10-26")).toMatchObject({ faturamento_bruto: 30, lucro_livre: 15 });

    updateCorrida(a.id, { quantidade: 2 });
    expect(getFechamento("2026-10-26")?.faturamento_bruto).toBe(40);

    deleteCorrida(a.id);
    expect(getFechamento("2026-10-26")?.faturamento_bruto).toBe(20);
  });

  it("trocar a data da corrida recalcula os dois dias", () => {
    const c = corrida({ data: "2026-10-25", valor_unitario: 10 });
    fechar("2026-10-25");
    fechar("2026-10-26");
    updateCorrida(c.id, { data: "2026-10-26" });
    expect(getFechamento("2026-10-25")?.faturamento_bruto).toBe(0);
    expect(getFechamento("2026-10-26")?.faturamento_bruto).toBe(10);
  });

  it("desfazer a exclusão devolve a corrida e o faturamento", () => {
    const c = corrida({ valor_unitario: 10 });
    fechar("2026-10-26");
    const removida = deleteCorrida(c.id)!;
    expect(getFechamento("2026-10-26")?.faturamento_bruto).toBe(0);
    restoreCorrida(removida);
    expect(getFechamento("2026-10-26")?.faturamento_bruto).toBe(10);
  });
});

describe("configuração herdada", () => {
  it("usa a mais recente anterior ou igual ao dia", () => {
    const base = { saldo_inicial_caixa: 0, custo_manutencao_km: 0.15, km_l_estimado: 30 };
    saveConfig({ ...base, data: "2026-10-01", preco_gasolina: 5 });
    saveConfig({ ...base, data: "2026-10-20", preco_gasolina: 6 });
    expect(getConfig("2026-09-30")).toBeNull();
    expect(getConfig("2026-10-10")?.preco_gasolina).toBe(5);
    expect(getConfig("2026-10-26")?.preco_gasolina).toBe(6);
  });
});

describe("saldos do extrato", () => {
  it("soma saldo inicial, corridas recebidas e movimentações, e desconta gastos", () => {
    saveConfig({ data: "2026-10-01", saldo_inicial_caixa: 100, preco_gasolina: 6, custo_manutencao_km: 0.1, km_l_estimado: 30 });
    corrida({ valor_unitario: 50 }); // dinheiro
    corrida({ metodo_pagamento: "PIX", pago: true, valor_unitario: 40 }); // banco
    corrida({ metodo_pagamento: "PIX", pago: false, valor_unitario: 999 }); // pendente: ignora
    addTransacao({ data: "2026-10-26", tipo: "Saida", valor: 30, categoria: "Cofrinho", conta_origem: "Dinheiro", observacoes: null });
    addTransacao({ data: "2026-10-26", tipo: "Entrada", valor: 5, categoria: "Outros", conta_origem: "Banco/PIX", observacoes: null });
    addGasto({ data: "2026-10-26", servico_peca: "Óleo", valor: 20, km_no_momento: null, observacoes: null });
    addGasto({ data: "2026-10-26", servico_peca: "Pneu", valor: 15, km_no_momento: null, observacoes: null, conta_origem: "Banco/PIX" });
    expect(getSaldos()).toMatchObject({ dinheiro: 100 + 50 - 30 - 20, banco: 40 + 5 - 15, inicial: 100 });
  });

  it("considera todos os lançamentos, não só os 100 mais recentes", () => {
    for (let i = 0; i < 150; i++) {
      addTransacao({ data: "2026-10-26", tipo: "Entrada", valor: 1, categoria: "Outros", conta_origem: "Dinheiro", observacoes: null });
    }
    expect(getSaldos().dinheiro).toBe(150);
  });
});

describe("metas e manutenção", () => {
  it("faturamento por período conta só corridas pagas", () => {
    corrida({ data: "2026-10-24", valor_unitario: 10 });
    corrida({ data: "2026-10-26", valor_unitario: 20 });
    corrida({ data: "2026-10-26", metodo_pagamento: "PIX", pago: false, valor_unitario: 99 });
    expect(faturamentoPeriodo("2026-10-26", "2026-10-26")).toBe(20);
    expect(faturamentoPeriodo("2026-10-20", "2026-10-26")).toBe(30);
  });

  it("km do lembrete zera depois de um gasto com o mesmo nome", () => {
    addLembrete("óleo", 3000);
    fechar("2026-10-20", 1000);
    fechar("2026-10-22", 500);
    expect(statusManutencao()[0]).toMatchObject({ kmDesde: 1500, restante: 1500 });

    addGasto({ data: "2026-10-22", servico_peca: "Troca de Oleo", valor: 40, km_no_momento: null, observacoes: null });
    fechar("2026-10-25", 700);
    expect(statusManutencao()[0]).toMatchObject({ kmDesde: 700, restante: 2300, ultimo: "2026-10-22" });
  });

  it("restante fica negativo quando passa do prazo", () => {
    addLembrete("pneu", 1000);
    fechar("2026-10-20", 1200);
    expect(statusManutencao()[0].restante).toBe(-200);
  });
});

describe("formatação", () => {
  it("horasEntre vira a meia-noite", () => {
    expect(horasEntre("08:00", "16:30")).toBe(8.5);
    expect(horasEntre("22:00", "06:30")).toBe(8.5);
    expect(horasEntre("", "06:30")).toBeNull();
  });
  it("parseNum aceita vírgula e rejeita lixo", () => {
    expect(parseNum("12,5")).toBe(12.5);
    expect(parseNum(" ")).toBeNull();
    expect(parseNum("abc")).toBeNull();
    expect(numToInput(8.5)).toBe("8,5");
  });
  it("escapeHtml neutraliza tags", () => {
    expect(escapeHtml('<img src=x onerror="a()">')).toBe("&lt;img src=x onerror=&quot;a()&quot;&gt;");
  });
});
