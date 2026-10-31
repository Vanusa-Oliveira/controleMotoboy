<div align="center">

# RotaPro

### Controle financeiro para motoboys

Registro de corridas, fechamento diário e cálculo do lucro livre.
Aplicativo instalável (PWA), com funcionamento offline e dados armazenados no próprio aparelho.

[**Acessar o aplicativo**](https://controle-entregas-motoboy.vercel.app/)

![React](https://img.shields.io/badge/React_19-20232a?style=flat-square&logo=react&logoColor=61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?style=flat-square&logo=typescript&logoColor=white)
![TanStack Start](https://img.shields.io/badge/TanStack_Start-ef4444?style=flat-square)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-0ea5e9?style=flat-square&logo=tailwindcss&logoColor=white)
![Vite](https://img.shields.io/badge/Vite_8-646cff?style=flat-square&logo=vite&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-instalável-5a0fc8?style=flat-square&logo=pwa&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6e9f18?style=flat-square&logo=vitest&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000?style=flat-square&logo=vercel&logoColor=white)

</div>

---

## Sumário

- [Visão geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Cálculo do lucro](#cálculo-do-lucro)
- [Importação a partir do WhatsApp](#importação-a-partir-do-whatsapp)
- [Instalação no celular](#instalação-no-celular)
- [Privacidade e armazenamento de dados](#privacidade-e-armazenamento-de-dados)
- [Tecnologias](#tecnologias)
- [Execução local](#execução-local)
- [Publicação na Vercel](#publicação-na-vercel)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Testes](#testes)
- [Autoria](#autoria)

---

## Visão geral

O RotaPro responde a uma pergunta objetiva de quem trabalha com entregas: depois de descontar a gasolina e a manutenção da moto, qual foi o lucro real do dia?

O usuário registra as corridas ao longo do dia, informa os quilômetros rodados e o horário de trabalho, e o aplicativo calcula o lucro livre, o valor a reservar para combustível e manutenção e o rendimento por hora.

O aplicativo não exige cadastro, não depende de servidor e não tem custo de uso. Todos os dados permanecem no aparelho do usuário.

---

## Funcionalidades

| Módulo | Descrição |
|---|---|
| **Hoje** | Faturamento, número de corridas e lucro livre do dia; metas; lembretes de manutenção; gráfico dos últimos 7 dias. |
| **Fechar o dia** | Informa km e horário de início e término. O recibo do dia é calculado em tempo real: lucro livre, reservas, corridas por hora e valor por hora. |
| **Corridas** | Listagem com filtros por período, forma de pagamento e busca por destino. Permite editar, excluir (com opção de desfazer) e marcar PIX como pago. |
| **Extrato** | Saldos em dinheiro e em banco/PIX, movimentações (cofrinho, despesas pessoais etc.) e gastos da moto, todos editáveis. |
| **Importar** | Converte anotações coladas do WhatsApp em corridas, com revisão antes de salvar. |
| **Relatórios** | Visões diária, mensal e de reservas, por período, com exportação em PDF e Excel (CSV). |
| **Backup** | Exportação e restauração completa dos dados em arquivo JSON. |

### Recursos adicionais

- **PIX pendente:** valores ainda não recebidos ficam separados como "a receber" e só compõem o faturamento após o pagamento.
- **Metas:** metas diária e semanal de faturamento, com indicador de progresso.
- **Lembretes de manutenção:** acompanhamento por quilometragem (óleo, pneu, corrente etc.). O lembrete é reiniciado quando se registra um gasto com o mesmo nome.
- **Configuração inicial guiada:** na primeira utilização, o aplicativo solicita preço do combustível, consumo da moto e custo de manutenção por km.
- **Uso offline:** após o primeiro acesso, o aplicativo funciona sem conexão.
- **Acessibilidade:** campos com rótulo associado, mensagens de erro junto a cada campo, diálogos com gerenciamento de foco e tecla Esc, áreas de toque adequadas ao uso em celular.

---

## Cálculo do lucro

```
Reserva de gasolina   = km rodado ÷ consumo (km/L) × preço do litro
Reserva de manutenção = km rodado × custo de manutenção por km
Lucro livre           = faturamento recebido − reserva de gasolina − reserva de manutenção
```

- O **faturamento** considera apenas corridas já recebidas (dinheiro e PIX pago).
- O fechamento do dia é **recalculado automaticamente** quando uma corrida é paga, editada ou excluída posteriormente.
- As configurações de combustível, consumo e manutenção são válidas para o dia em que foram definidas e **herdadas pelos dias seguintes** até serem alteradas.

---

## Importação a partir do WhatsApp

As corridas podem ser anotadas no WhatsApp segundo o padrão:

```
[quantidade] Estabelecimento [indicador de pagamento]
```

| Anotação | Interpretação |
|---|---|
| `Minas Grill` | 1 corrida, pendente |
| `4 Minas Grill` | 4 corridas, pendentes |
| `Carol Coxinha 💵` | 1 corrida, paga em dinheiro |
| `2 Carol Coxinha 💰` | 2 corridas, pagas por Pix |
| `Paguei 95` | Ignorado (anotação pessoal, não é corrida) |

Os indicadores de pagamento são os emojis de notas de dinheiro (dinheiro) e de saco de dinheiro (Pix). Sem indicador, a corrida é considerada pendente.

**Fluxo de uso:** copiar as mensagens no WhatsApp, colar na aba **Importar** e revisar antes de confirmar.

**Regras da importação:**

- O valor padrão é de R$ 9,00 por corrida, configurável, e pode ser alterado individualmente em cada linha.
- O total de cada linha é `quantidade × valor unitário` e é recalculado a cada edição.
- Nome, quantidade, valor e forma de pagamento são editáveis, e cada linha pode ser desmarcada.
- Registros iguais já lançados no mesmo dia são sinalizados como possível duplicidade.
- Cada anotação gera **um único registro** (por exemplo, 4 × R$ 9,00 = R$ 36,00), sem multiplicação de corridas.
- Corridas pendentes são registradas como PIX a receber.
- Um resumo apresenta o total geral, a quantidade de corridas e os valores por situação de pagamento.

---

## Instalação no celular

O RotaPro é um Progressive Web App (PWA) e não requer loja de aplicativos.

- **Android (Chrome):** abrir o endereço do aplicativo, acessar o menu e selecionar "Adicionar à tela inicial".
- **iPhone (Safari):** abrir o endereço, tocar em "Compartilhar" e selecionar "Adicionar à Tela de Início".

Depois de instalado, o aplicativo abre em tela cheia e funciona sem conexão.

---

## Privacidade e armazenamento de dados

- Nenhum dado é enviado a servidores. As informações ficam no armazenamento local do navegador do aparelho.
- Os dados de um aparelho não são sincronizados com outro. Para migrar, utilize **Relatórios → Baixar backup** e, no novo aparelho, **Restaurar**.
- A limpeza dos dados do navegador ou a desinstalação do aplicativo remove as informações. Recomenda-se realizar backups periódicos.
- Em janelas privadas ou com armazenamento bloqueado, o aplicativo exibe um alerta informando que os dados não estão sendo salvos.

> **Aviso:** o aplicativo pode apresentar erros de cálculo. Confira sempre os valores antes de tomar decisões financeiras.

---

## Tecnologias

- [TanStack Start](https://tanstack.com/start) e TanStack Router (roteamento baseado em arquivos)
- React 19 e TypeScript
- Vite 8 com Nitro para o build
- Tailwind CSS 4, shadcn/ui e Radix UI
- Recharts (gráficos), Sonner (notificações) e lucide-react (ícones)
- vite-plugin-pwa e Workbox (instalação e uso offline)
- Vitest (testes automatizados)

---

## Execução local

**Pré-requisitos:** [Node.js](https://nodejs.org/) 20 ou superior e [Bun](https://bun.sh/) (ou npm).

```bash
# 1. clonar o repositório
git clone https://github.com/Vanusa-Oliveira/controleMotoboy.git
cd controleMotoboy

# 2. instalar as dependências
bun install        # ou: npm install

# 3. iniciar em modo de desenvolvimento (http://localhost:5173)
bun run dev
```

### Scripts disponíveis

| Comando | Descrição |
|---|---|
| `bun run dev` | Servidor de desenvolvimento |
| `bun run build` | Build de produção (configuração padrão) |
| `bun run build:vercel` | Build para a Vercel |
| `bun run test` | Executa os testes automatizados |
| `bun run lint` | Análise estática com ESLint |

---

## Publicação na Vercel

1. Importar o repositório na [Vercel](https://vercel.com/new).
2. Manter as configurações padrão. O arquivo [`vercel.json`](vercel.json) já define o comando de build (`npm run build:vercel`).
3. A cada `git push` na branch `main`, uma nova versão é publicada automaticamente.

O script [`scripts/postbuild-vercel.mjs`](scripts/postbuild-vercel.mjs) copia o service worker para a saída de build da Vercel. Sem essa etapa, o aplicativo não seria instalável nem funcionaria offline. Fora da Vercel, o build segue a configuração padrão do projeto (Cloudflare).

---

## Estrutura do projeto

```
src/
├── components/
│   ├── AppShell.tsx            Cabeçalho, avisos e navegação inferior
│   ├── Welcome.tsx             Tela de boas-vindas
│   ├── NovaCorridaModal.tsx    Criação e edição de corridas
│   ├── MetasManutencao.tsx     Metas e lembretes de manutenção
│   ├── Field.tsx, Modal.tsx    Campos com validação e diálogos acessíveis
│   └── ui/                     Componentes shadcn/ui
├── lib/
│   ├── db.ts                   Armazenamento local, cálculos e backup
│   ├── importar.ts             Interpretador das anotações do WhatsApp
│   ├── format.ts               Formatação de moeda, datas e números
│   └── *.test.ts               Testes automatizados
└── routes/_authenticated/      Telas: Hoje, Fechar, Corridas, Extrato, Importar, Relatórios
scripts/                        Pós-build para a Vercel
```

---

## Testes

```bash
bun run test
```

A suíte cobre as regras de maior impacto financeiro: exclusão do PIX pendente do faturamento, recálculo do fechamento, saldos do Extrato, metas, lembretes de manutenção e o interpretador de anotações (quantidade, indicadores de pagamento e anotações pessoais).

---

## Autoria

Desenvolvido por **Vanusa Oliveira**.
