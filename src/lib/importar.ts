// Interpretação das anotações de corridas do WhatsApp:
//   [quantidade] Estabelecimento [emoji de pagamento]
//   "Minas Grill"       → 1 corrida pendente
//   "4 Minas Grill"     → 4 corridas pendentes
//   "2 Carol Coxinha 💰" → 2 corridas pagas por Pix
//   "3 Minas Grill 💵"   → 3 corridas pagas em dinheiro
// Anotações pessoais (ex.: "Paguei 95") nunca viram corrida.

export type Pagamento = "Dinheiro" | "Pix" | "Pendente";

export const VALOR_PADRAO = 9;

export type LinhaLida =
  | { ok: true; raw: string; nome: string; qtd: number; pagamento: Pagamento }
  | { ok: false; raw: string; motivo: string };

// Notas de dinheiro = dinheiro vivo; saco de dinheiro = Pix.
const EMOJI_DINHEIRO = /[\u{1F4B5}\u{1F4B4}\u{1F4B6}\u{1F4B7}]/u;
const EMOJI_PIX = /[\u{1F4B0}\u{1F911}]/u;
const RESTOS_VISUAIS = /[\p{Extended_Pictographic}️‍✓✔☑]+/gu;

const ANOTACAO_PESSOAL =
  /\b(paguei|pagou|paga|pago|deixei|deixou|recebi|receber|devo|deve|troco|falta|faltou|sobrou|saldo|total|gasolina|abasteci|lembrar|lembrete|pagar)\b/i;

const TEXTO_DE_INTERFACE =
  /^(hoje|ontem|amanh[ãa]|online|digitando|mensagem|digite uma mensagem|visto por [úu]ltimo|segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado|domingo)([-\s].*)?$/i;

const MAX_QTD = 30; // acima disso o número provavelmente é um valor em reais, não uma quantidade
const MAX_PALAVRAS = 6;

export function pagamentoDoTexto(texto: string): Pagamento | null {
  if (EMOJI_DINHEIRO.test(texto)) return "Dinheiro";
  if (EMOJI_PIX.test(texto)) return "Pix";
  return null;
}

// "dica" = forma de pagamento detectada por outro meio (cor do emoji na imagem).
export function lerLinha(raw: string, dica?: Pagamento | null): LinhaLida {
  let s = raw.replace(/‎|‏/g, "").trim();

  // Exportação do WhatsApp: "[26/10/2026 10:15] Fulana: texto" ou "26/10/2026 10:15 - Fulana: texto".
  const prefixo = /^\[?\d{1,2}\/\d{1,2}\/\d{2,4}[,\s]+\d{1,2}:\d{2}(?::\d{2})?\]?\s*[-–]?\s*/;
  if (prefixo.test(s)) s = s.replace(prefixo, "").replace(/^[^:]{1,40}:\s*/, "");

  const pagamento = pagamentoDoTexto(s) ?? dica ?? "Pendente";
  s = s
    .replace(RESTOS_VISUAIS, " ")
    .replace(/\s*\b\d{1,2}[:.]\d{2}\b\s*$/, "") // horário da mensagem no fim
    .replace(/\s+/g, " ")
    .trim();

  if (!s) return { ok: false, raw, motivo: "linha vazia" };
  if (/^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/.test(s)) return { ok: false, raw, motivo: "data" };
  if (TEXTO_DE_INTERFACE.test(s)) return { ok: false, raw, motivo: "texto da conversa" };
  if (ANOTACAO_PESSOAL.test(s)) return { ok: false, raw, motivo: "anotação pessoal" };

  const m = s.match(/^(?:(\d{1,3})\s*[x×]?\s+)?(.+)$/u);
  if (!m) return { ok: false, raw, motivo: "formato não reconhecido" };
  const [, num, resto] = m;
  const nome = resto.replace(/^[\s\-–:.,;]+|[\s\-–:.,;]+$/g, "");

  if (!/\p{L}{2,}/u.test(nome)) return { ok: false, raw, motivo: "sem nome de estabelecimento" };
  if (nome.split(" ").length > MAX_PALAVRAS) return { ok: false, raw, motivo: "texto longo demais" };

  let qtd = 1;
  if (num !== undefined) {
    qtd = parseInt(num, 10);
    if (qtd < 1 || qtd > MAX_QTD) return { ok: false, raw, motivo: "número parece um valor, não uma quantidade" };
  }
  return { ok: true, raw, nome, qtd, pagamento };
}

export function lerTexto(texto: string): LinhaLida[] {
  return texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => lerLinha(l));
}

export const totalDe = (qtd: number, valorUnitario: number) => Math.round(qtd * valorUnitario * 100) / 100;
