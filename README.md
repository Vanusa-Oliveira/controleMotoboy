<div align="center">

# 🏍️ RotaPro

### Controle do Motoboy

**Lance suas corridas, feche o dia e descubra seu lucro livre de verdade.**
Um app instalável no celular, que funciona sem internet e guarda tudo no seu aparelho.

[![Abrir o app](https://img.shields.io/badge/🚀_Abrir_o_app-16a34a?style=for-the-badge)](https://controle-entregas-motoboy.vercel.app/)

![React](https://img.shields.io/badge/React_19-20232a?style=flat-square&logo=react&logoColor=61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?style=flat-square&logo=typescript&logoColor=white)
![TanStack](https://img.shields.io/badge/TanStack_Start-ef4444?style=flat-square)
![Tailwind](https://img.shields.io/badge/Tailwind_4-0ea5e9?style=flat-square&logo=tailwindcss&logoColor=white)
![Vite](https://img.shields.io/badge/Vite_8-646cff?style=flat-square&logo=vite&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-instalável-5a0fc8?style=flat-square&logo=pwa&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000?style=flat-square&logo=vercel&logoColor=white)
![Testes](https://img.shields.io/badge/testes-Vitest-6e9f18?style=flat-square&logo=vitest&logoColor=white)

</div>

---

## 📖 Sobre

O **RotaPro** nasceu para resolver uma pergunta simples de quem vive de entrega: *"depois de tirar a gasolina e a manutenção da moto, quanto sobrou de verdade?"*

Você lança as corridas ao longo do dia, informa quantos km rodou e quantas horas trabalhou, e o app calcula o **lucro livre**, quanto separar para a gasolina, quanto guardar para a manutenção e quanto você ganha por hora.

Não tem login, não tem servidor e não tem mensalidade: **os dados ficam no seu próprio aparelho**.

---

## ✨ Funcionalidades

| | Recurso | O que faz |
|---|---|---|
| 🏠 | **Hoje** | Faturamento, corridas e lucro livre do dia, metas, lembretes de manutenção e gráfico dos últimos 7 dias |
| 🧾 | **Fechar o dia** | Informe km e horário de início/fim; veja o recibo do dia ao vivo (lucro livre, reservas, corridas/hora e R$/hora) |
| 🛵 | **Corridas** | Lista com filtros por período, forma de pagamento e busca por destino; editar, excluir com **Desfazer** e marcar PIX como pago |
| 💰 | **Extrato** | Saldo em Dinheiro e Banco/PIX, movimentações (cofrinho, pessoal…) e gastos da moto, tudo editável |
| 📲 | **Importar** | Cole as anotações do WhatsApp e o app converte em corridas (veja abaixo) |
| 📊 | **Relatórios** | Visão diária, mensal e de reservas por período, com exportação em **PDF** e **Excel (CSV)** |
| 💾 | **Backup** | Baixe e restaure todos os seus dados em um arquivo JSON |

### Outros destaques

- 🟢 **PIX pendente** fica separado como *"a receber"* e só entra no faturamento depois de pago.
- 🎯 **Metas** diária e semanal de faturamento, com barra de progresso.
- 🔧 **Lembretes de manutenção** (óleo, pneu, corrente…): o app soma o km rodado e avisa quando está perto da troca. Um gasto com o mesmo nome (ex.: "Óleo") zera o lembrete.
- 👋 **Primeiros passos guiados**: na primeira abertura o app pede o preço da gasolina, o consumo da moto e o custo de manutenção por km.
- 📴 **Funciona offline** depois da primeira visita e pode ser instalado na tela inicial.
- ♿ **Acessível**: campos com rótulo, erros ao lado de cada campo, diálogos com foco e tecla Esc, áreas de toque amplas.

---

## 🧮 Como o lucro é calculado

```
Reserva de gasolina   = km rodado ÷ consumo (km/L) × preço do litro
Reserva de manutenção = km rodado × custo de manutenção por km
Lucro livre           = faturamento recebido − reserva de gasolina − reserva de manutenção
```

- O **faturamento** considera só corridas já recebidas (dinheiro e PIX pago).
- O fechamento é **recalculado automaticamente** se você pagar, editar ou excluir uma corrida depois.
- As configurações (gasolina, consumo, manutenção) valem para o dia e são **herdadas** pelos dias seguintes até você mudar.

---

## 📲 Importar do WhatsApp

Anote as corridas no WhatsApp neste formato:

```
[quantidade] Estabelecimento [emoji]
```

| Você escreve | O app entende |
|---|---|
| `Minas Grill` | 1 corrida, **pendente** |
| `4 Minas Grill` | 4 corridas, pendentes |
| `Carol Coxinha 💵` | 1 corrida paga em **dinheiro** |
| `2 Carol Coxinha 💰` | 2 corridas pagas por **Pix** |
| `Paguei 95` | **ignorado** (anotação pessoal, não é corrida) |

Copie as mensagens, cole na aba **Importar** e revise antes de salvar:

- o **valor padrão** é R$ 9,00 por corrida, mas dá para mudar o padrão e o valor de cada linha;
- o total é sempre `quantidade × valor unitário` e se recalcula ao editar;
- é possível corrigir nome, quantidade, valor e pagamento, e desmarcar o que não quiser importar;
- linhas já lançadas no mesmo dia são sinalizadas como **possível duplicada**;
- cada anotação vira **um único registro** (4 × R$ 9,00 = R$ 36,00), sem multiplicar corridas;
- *pendente* entra como PIX a receber.

---

## 📥 Instalar no celular

O RotaPro é um **PWA**: não precisa de loja de aplicativos.

- **Android (Chrome):** abra o link do app → menu ⋮ → *Adicionar à tela inicial*.
- **iPhone (Safari):** abra o link → botão *Compartilhar* → *Adicionar à Tela de Início*.

Depois de instalado, ele abre em tela cheia e funciona mesmo sem sinal.

---

## 🔒 Privacidade e seus dados

- Nenhum dado é enviado a servidores: tudo fica no **armazenamento local do navegador** do seu aparelho.
- Por isso, os dados de um celular **não aparecem em outro**. Para trocar de aparelho, use **Relatórios → Baixar backup** e depois **Restaurar** no novo.
- Se limpar os dados do navegador ou desinstalar o app, os dados somem. **Faça backup de vez em quando.**
- Em janela privada ou com o armazenamento bloqueado, o app avisa que os dados não estão sendo salvos.

> ⚠️ Este app pode cometer erros nos cálculos. Confira sempre os valores antes de tomar decisões financeiras.

---

## 🛠️ Tecnologias

- **[TanStack Start](https://tanstack.com/start)** + **TanStack Router**: rotas por arquivos
- **React 19** e **TypeScript**
- **Vite 8** com **Nitro** para o build
- **Tailwind CSS 4**, **shadcn/ui** e **Radix UI**
- **Recharts** (gráficos), **Sonner** (avisos), **lucide-react** (ícones)
- **vite-plugin-pwa** / Workbox: instalação e uso offline
- **Vitest**: testes automáticos dos cálculos e do importador

---

## 🚀 Rodando localmente

Pré-requisitos: [Node.js](https://nodejs.org/) 20+ e [Bun](https://bun.sh/) (ou npm).

```bash
# 1. clonar
git clone https://github.com/Vanusa-Oliveira/controleMotoboy.git
cd controleMotoboy

# 2. instalar as dependências
bun install        # ou: npm install

# 3. iniciar em modo desenvolvimento
bun run dev        # abre em http://localhost:5173
```

### Scripts

| Comando | O que faz |
|---|---|
| `bun run dev` | Servidor de desenvolvimento |
| `bun run build` | Build de produção (padrão) |
| `bun run build:vercel` | Build para a Vercel (ver abaixo) |
| `bun run test` | Roda os testes automáticos |
| `bun run lint` | Verifica o código com ESLint |

---

## ☁️ Publicando na Vercel

1. Importe o repositório na [Vercel](https://vercel.com/new).
2. Deixe as configurações padrão: o arquivo [`vercel.json`](vercel.json) já define o comando de build (`npm run build:vercel`).
3. Pronto: cada `git push` na `main` publica uma nova versão.

O script [`scripts/postbuild-vercel.mjs`](scripts/postbuild-vercel.mjs) copia o *service worker* para a saída da Vercel; sem isso o app não seria instalável nem funcionaria offline. Fora da Vercel o build segue o padrão do projeto (Cloudflare).

---

## 🗂️ Estrutura do projeto

```
src/
├── components/
│   ├── AppShell.tsx            # cabeçalho, avisos e navegação inferior
│   ├── Welcome.tsx             # tela de boas-vindas
│   ├── NovaCorridaModal.tsx    # criar e editar corridas
│   ├── MetasManutencao.tsx     # metas e lembretes de manutenção
│   ├── Field.tsx · Modal.tsx   # campos com erro e diálogos acessíveis
│   └── ui/                     # componentes shadcn/ui
├── lib/
│   ├── db.ts                   # armazenamento local, cálculos e backup
│   ├── importar.ts             # interpretador das anotações do WhatsApp
│   ├── format.ts               # moeda, datas e números
│   └── *.test.ts               # testes automáticos
└── routes/_authenticated/      # telas: Hoje, Fechar, Corridas, Extrato, Importar, Relatórios
scripts/                        # pós-build para a Vercel
```

---

## 🧪 Testes

```bash
bun run test
```

Os testes cobrem as regras que mais importam para o dinheiro: PIX pendente fora do faturamento, recálculo do fechamento, saldos do Extrato, metas, lembretes de manutenção e todo o interpretador de anotações (quantidade, emojis e anotações pessoais).

---

## 👩‍💻 Autora

Feito por **Vanusa Oliveira**.

<div align="center">
<sub>RotaPro · feito para quem vive de rota 🏍️</sub>
</div>
