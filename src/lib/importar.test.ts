import { describe, expect, it } from "vitest";
import { lerLinha, lerTexto, totalDe } from "./importar";

const ok = (raw: string) => {
  const r = lerLinha(raw);
  if (!r.ok) throw new Error(`esperava corrida em "${raw}", veio: ${r.motivo}`);
  return r;
};

describe("quantidade", () => {
  it("sem número = 1 corrida", () => {
    expect(ok("Minas Grill")).toMatchObject({ nome: "Minas Grill", qtd: 1 });
  });
  it("número antes do nome = quantidade", () => {
    expect(ok("2 Minas Grill")).toMatchObject({ nome: "Minas Grill", qtd: 2 });
    expect(ok("4 Minas Grill")).toMatchObject({ nome: "Minas Grill", qtd: 4 });
    expect(ok("3 Carol Coxinha")).toMatchObject({ nome: "Carol Coxinha", qtd: 3 });
  });
  it("aceita 2x e 2 x", () => {
    expect(ok("2x Minas Grill")).toMatchObject({ qtd: 2, nome: "Minas Grill" });
    expect(ok("3 × Carol Coxinha")).toMatchObject({ qtd: 3, nome: "Carol Coxinha" });
  });
  it("número grande demais não vira quantidade", () => {
    expect(lerLinha("95 Minas Grill").ok).toBe(false);
  });
});

describe("pagamento pelos emojis", () => {
  it("notas = dinheiro", () => {
    expect(ok("4 Minas Grill 💵")).toMatchObject({ qtd: 4, pagamento: "Dinheiro" });
  });
  it("saco de dinheiro = Pix", () => {
    expect(ok("3 Carol Coxinha 💰")).toMatchObject({ qtd: 3, pagamento: "Pix" });
  });
  it("sem emoji = pendente", () => {
    expect(ok("2 Minas Grill")).toMatchObject({ pagamento: "Pendente" });
  });
  it("emoji com variation selector e sem espaço", () => {
    expect(ok("Carol Coxinha💵️")).toMatchObject({ nome: "Carol Coxinha", pagamento: "Dinheiro" });
  });
  it("dica da imagem só vale sem emoji no texto", () => {
    const r = lerLinha("Minas Grill", "Pix");
    expect(r).toMatchObject({ ok: true, pagamento: "Pix" });
    expect(lerLinha("Minas Grill 💵", "Pix")).toMatchObject({ pagamento: "Dinheiro" });
  });
});

describe("anotações pessoais não são corridas", () => {
  it("Paguei 95 é ignorado", () => {
    const r = lerLinha("Paguei 95");
    expect(r).toMatchObject({ ok: false, motivo: "anotação pessoal" });
  });
  it("outras anotações e valores soltos", () => {
    expect(lerLinha("Deixei 50 com o cliente").ok).toBe(false);
    expect(lerLinha("95").ok).toBe(false);
    expect(lerLinha("R$ 95,00").ok).toBe(false);
    expect(lerLinha("Total 120").ok).toBe(false);
  });
  it("frases longas da conversa são ignoradas", () => {
    expect(lerLinha("pode vir buscar o pedido aqui agora por favor").ok).toBe(false);
  });
});

describe("texto de prints e exportações", () => {
  it("remove horário e ticks no fim", () => {
    expect(ok("Minas Grill 💵 10:15")).toMatchObject({ nome: "Minas Grill", pagamento: "Dinheiro", qtd: 1 });
    expect(ok("2 Carol Coxinha ✓✓ 21.40")).toMatchObject({ nome: "Carol Coxinha", qtd: 2 });
  });
  it("ignora cabeçalhos e datas", () => {
    expect(lerLinha("Hoje").ok).toBe(false);
    expect(lerLinha("26/10/2026").ok).toBe(false);
    expect(lerLinha("segunda-feira").ok).toBe(false);
  });
  it("exportação do WhatsApp com data, remetente e emoji", () => {
    expect(ok("[26/10/2026 10:15] Vanusa: 3 Minas Grill 💵")).toMatchObject({ nome: "Minas Grill", qtd: 3, pagamento: "Dinheiro" });
    expect(ok("26/10/2026 10:15 - Vanusa: Carol Coxinha 💰")).toMatchObject({ nome: "Carol Coxinha", pagamento: "Pix" });
  });
  it("lerTexto lê várias linhas e separa o que ignorou", () => {
    const r = lerTexto("Minas Grill\n2 Carol Coxinha 💰\n\nPaguei 95\n3 Minas Grill 💵");
    expect(r.filter((l) => l.ok)).toHaveLength(3);
    expect(r.filter((l) => !l.ok)).toHaveLength(1);
  });
});

describe("total", () => {
  it("quantidade × valor unitário", () => {
    expect(totalDe(1, 9)).toBe(9);
    expect(totalDe(2, 9)).toBe(18);
    expect(totalDe(4, 9)).toBe(36);
    expect(totalDe(3, 9)).toBe(27);
  });
  it("recalcula ao mudar o valor unitário", () => {
    expect(totalDe(4, 8)).toBe(32);
    expect(totalDe(3, 8.5)).toBe(25.5);
  });
});
