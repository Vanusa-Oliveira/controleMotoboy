// Leitura de prints do WhatsApp no próprio aparelho (nada da imagem é enviado para servidor).
// O OCR (Tesseract) lê o texto; como ele não reconhece emojis, a forma de pagamento é
// deduzida pela COR do emoji que aparece depois do nome: verde = notas (dinheiro),
// amarelo/marrom = saco de dinheiro (Pix), nada colorido = pendente.
import type { Pagamento } from "./importar";

export type LinhaOcr = { texto: string; dica: Pagamento | null };

type Progresso = (fracao: number, etapa: string) => void;

type Palavra = { text: string; confidence?: number; bbox: { x0: number; y0: number; x1: number; y1: number } };

const ehHorarioOuNumeroColado = (t: string) => /^\d{1,2}[:.]\d{2}$/.test(t) || /^\d{3,4}$/.test(t);
// Sobra do fim da linha: horário, símbolos soltos ou 1–3 letras de baixa confiança (emoji mal lido).
const ehSobra = (p: Palavra) =>
  ehHorarioOuNumeroColado(p.text) || !/[\p{L}\d]/u.test(p.text) || (p.text.length <= 3 && (p.confidence ?? 100) < 80 && !/^\d+$/.test(p.text));

async function carregar(file: File) {
  const bmp = await createImageBitmap(file);
  // Prints de celular costumam ser grandes; nos pequenos, ampliar ajuda o OCR.
  const escala = bmp.width < 1200 ? Math.min(2, 1400 / bmp.width) : bmp.width > 2000 ? 2000 / bmp.width : 1;
  const w = Math.round(bmp.width * escala);
  const h = Math.round(bmp.height * escala);
  const original = document.createElement("canvas");
  original.width = w;
  original.height = h;
  const ctx = original.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  return { original, ctx, w, h };
}

// Tons de cinza com alto contraste, invertido se o print for escuro (texto escuro em fundo claro lê melhor).
function prepararParaOcr(original: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  const { width: w, height: h } = original;
  const src = ctx.getImageData(0, 0, w, h);
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const octx = out.getContext("2d")!;
  const dst = octx.createImageData(w, h);
  let soma = 0;
  const n = w * h;
  for (let i = 0; i < src.data.length; i += 4) {
    soma += 0.299 * src.data[i] + 0.587 * src.data[i + 1] + 0.114 * src.data[i + 2];
  }
  const inverter = soma / n < 110;
  for (let i = 0; i < src.data.length; i += 4) {
    let g = 0.299 * src.data[i] + 0.587 * src.data[i + 1] + 0.114 * src.data[i + 2];
    if (inverter) g = 255 - g;
    // Contraste forte: o texto vira quase preto e balões/fundo ficam claros. Sem isso o OCR
    // não separa o texto dos balões coloridos.
    g = Math.max(0, Math.min(255, (g - 128) * 2 + 128));
    dst.data[i] = dst.data[i + 1] = dst.data[i + 2] = g;
    dst.data[i + 3] = 255;
  }
  octx.putImageData(dst, 0, 0);
  return out;
}

function matiz(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}

// Olha o trecho depois do nome e decide qual emoji de pagamento há ali (ou nenhum).
export function detectarEmoji(img: ImageData, x0: number, y0: number, x1: number, y1: number): Pagamento | null {
  const X0 = Math.max(0, Math.floor(x0));
  const Y0 = Math.max(0, Math.floor(y0));
  const X1 = Math.min(img.width, Math.ceil(x1));
  const Y1 = Math.min(img.height, Math.ceil(y1));
  if (X1 - X0 < 6 || Y1 - Y0 < 6) return null;

  const d = img.data;
  const idx = (x: number, y: number) => (y * img.width + x) * 4;

  // Fundo = cor mais frequente do trecho (o balão da mensagem).
  const baldes = new Map<number, number>();
  for (let y = Y0; y < Y1; y++) {
    for (let x = X0; x < X1; x++) {
      const i = idx(x, y);
      const k = ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4);
      baldes.set(k, (baldes.get(k) ?? 0) + 1);
    }
  }
  let kBg = 0;
  let melhor = -1;
  for (const [k, c] of baldes) if (c > melhor) [kBg, melhor] = [k, c];
  const bgR = ((kBg >> 8) & 15) * 16 + 8;
  const bgG = ((kBg >> 4) & 15) * 16 + 8;
  const bgB = (kBg & 15) * 16 + 8;

  let verde = 0;
  let amarelo = 0;
  for (let y = Y0; y < Y1; y++) {
    for (let x = X0; x < X1; x++) {
      const i = idx(x, y);
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const dist = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
      const sat = Math.max(r, g, b) - Math.min(r, g, b);
      if (dist < 90 || sat < 60) continue; // fundo, texto ou cinza
      const h = matiz(r, g, b);
      // Saco de dinheiro: tons de ouro/marrom/laranja (até ~57°). Notas: do amarelo-esverdeado ao verde.
      if (h >= 15 && h < 58) amarelo++;
      else if (h >= 58 && h <= 150) verde++; // acima disso é o verde-azulado do balão/texto suavizado
    }
  }
  // Um emoji tem centenas de pixels coloridos; contorno suavizado de letras tem poucos.
  const minimo = Math.max(12, 0.08 * (Y1 - Y0) * (Y1 - Y0));
  if (verde + amarelo < minimo) return null;
  return amarelo > verde ? "Pix" : "Dinheiro";
}

export async function lerImagem(file: File, onProgress?: Progresso): Promise<LinhaOcr[]> {
  onProgress?.(0.02, "Preparando a imagem");
  const { original, ctx, w, h } = await carregar(file);
  const paraOcr = prepararParaOcr(original, ctx);
  const cores = ctx.getImageData(0, 0, w, h);

  const mod: any = await import("tesseract.js");
  const createWorker = mod.createWorker ?? mod.default?.createWorker;
  const worker = await createWorker("por", 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") onProgress?.(0.3 + m.progress * 0.7, "Lendo o texto");
      else if (m.status.includes("loading") || m.status.includes("initializ")) onProgress?.(0.05 + m.progress * 0.25, "Baixando o leitor de texto (só na 1ª vez)");
    },
  });

  try {
    const { data } = await worker.recognize(paraOcr, {}, { blocks: true });
    const linhas: LinhaOcr[] = [];
    for (const bloco of data.blocks ?? []) {
      for (const par of bloco.paragraphs ?? []) {
        for (const linha of par.lines ?? []) {
          const palavras: Palavra[] = linha.words ?? [];
          const alt = linha.bbox.y1 - linha.bbox.y0;

          // O emoji vira "lixo" no OCR (ex.: "EB", "&") e o horário às vezes perde os dois pontos ("1013").
          // Tira essas sobras do fim da linha antes de interpretar o texto.
          const uteis = [...palavras];
          while (uteis.length > 1 && ehSobra(uteis[uteis.length - 1])) uteis.pop();
          const texto = (uteis.length ? uteis.map((p) => p.text).join(" ") : (linha.text ?? "")).trim();
          if (!texto) continue;

          // Só o emoji tem cor forte (texto, balão e horário são cinza/uniformes): olha a linha inteira,
          // da esquerda até o horário da mensagem (ou um pouco além do fim da linha).
          const horario = palavras.find((p) => p.bbox.x0 > linha.bbox.x0 + alt && ehHorarioOuNumeroColado(p.text));
          const direita = Math.min(horario ? horario.bbox.x0 : Infinity, linha.bbox.x1 + alt * 3);
          const dica = detectarEmoji(cores, linha.bbox.x0, linha.bbox.y0 - alt * 0.2, direita, linha.bbox.y1 + alt * 0.2);
          linhas.push({ texto, dica });
        }
      }
    }
    onProgress?.(1, "Pronto");
    return linhas;
  } finally {
    await worker.terminate();
  }
}
