import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, FileSpreadsheet, Fuel, Wrench, PiggyBank, Upload, DatabaseBackup } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { exportBackup, importBackup, listCorridas, listFechamentos } from "@/lib/db";
import { brl, daysAgo, fmtDate, monthStart, today } from "@/lib/format";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PERIODOS = [
  { id: "mes", label: "Este mês", since: () => monthStart() },
  { id: "30d", label: "30 dias", since: () => daysAgo(30) },
  { id: "90d", label: "90 dias", since: () => daysAgo(90) },
  { id: "ano", label: "12 meses", since: () => daysAgo(365) },
  { id: "tudo", label: "Tudo", since: () => undefined },
] as const;
type PeriodoId = (typeof PERIODOS)[number]["id"];

export const Route = createFileRoute("/_authenticated/relatorios")({
  component: RelatoriosPage,
});

type Linha = {
  data: string;
  faturamento_bruto: number;
  km_rodado: number;
  horas_trabalhadas: number;
  reserva_gasolina: number;
  reserva_manutencao: number;
  lucro_livre: number;
  corridas: number;
};

function RelatoriosPage() {
  const [diario, setDiario] = useState<Linha[]>([]);
  const [tab, setTab] = useState<"diario" | "mensal" | "reservas">("diario");
  const [periodo, setPeriodo] = useState<PeriodoId>("30d");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const periodoInfo = PERIODOS.find((x) => x.id === periodo)!;

  const load = () => {
    const since = periodoInfo.since();
    const countByDay = new Map<string, number>();
    listCorridas({ ini: since }).forEach((r) => {
      countByDay.set(r.data, (countByDay.get(r.data) ?? 0) + r.quantidade);
    });
    setDiario(listFechamentos({ since }).map((r) => ({ ...r, corridas: countByDay.get(r.data) ?? 0 })));
  };

  useEffect(load, [periodo]);

  const downloadBackup = () => {
    const blob = new Blob([exportBackup()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rotapro-backup-${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const restoreBackup = async (file: File) => {
    try {
      const texto = await file.text();
      JSON.parse(texto); // valida antes de mexer nos dados atuais
      downloadBackup(); // guarda uma cópia dos dados de agora, caso o arquivo seja o errado
      importBackup(texto);
      load();
      toast.success("Backup restaurado. Uma cópia dos dados anteriores foi baixada.");
    } catch (err: any) {
      toast.error(err?.message ?? "Não foi possível ler o arquivo de backup.");
    }
  };

  const mensal = (() => {
    const map = new Map<string, Linha>();
    diario.forEach((d) => {
      const key = d.data.slice(0, 7);
      const cur = map.get(key) ?? { data: key, faturamento_bruto: 0, km_rodado: 0, horas_trabalhadas: 0, reserva_gasolina: 0, reserva_manutencao: 0, lucro_livre: 0, corridas: 0 };
      cur.faturamento_bruto += d.faturamento_bruto;
      cur.km_rodado += d.km_rodado;
      cur.horas_trabalhadas += d.horas_trabalhadas;
      cur.reserva_gasolina += d.reserva_gasolina;
      cur.reserva_manutencao += d.reserva_manutencao;
      cur.lucro_livre += d.lucro_livre;
      cur.corridas += d.corridas;
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.data.localeCompare(a.data));
  })();

  const rows = tab === "mensal" ? mensal : diario;

  const exportCSV = () => {
    const header = ["Período", "Faturamento bruto", "KM rodado", "Horas", "Reserva gasolina", "Reserva manutenção", "Lucro livre", "Corridas"];
    const lines = [header.join(";")];
    rows.forEach((r) => {
      lines.push([
        tab === "diario" ? fmtDate(r.data) : r.data,
        r.faturamento_bruto.toFixed(2).replace(".", ","),
        r.km_rodado.toFixed(1).replace(".", ","),
        r.horas_trabalhadas.toFixed(1).replace(".", ","),
        r.reserva_gasolina.toFixed(2).replace(".", ","),
        r.reserva_manutencao.toFixed(2).replace(".", ","),
        r.lucro_livre.toFixed(2).replace(".", ","),
        r.corridas,
      ].join(";"));
    });
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-${tab}-${today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const title = `Relatório ${tab === "diario" ? "Diário" : "Mensal"}`;
    const totalLucro = rows.reduce((a, r) => a + r.lucro_livre, 0);
    const totalBruto = rows.reduce((a, r) => a + r.faturamento_bruto, 0);
    const totalCorridas = rows.reduce((a, r) => a + r.corridas, 0);
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
      <style>
        *{box-sizing:border-box;font-family:-apple-system,Segoe UI,Roboto,sans-serif}
        body{margin:24px;color:#111}
        h1{margin:0 0 4px;font-size:22px}
        .sub{color:#666;font-size:12px;margin-bottom:16px}
        .totals{display:flex;gap:12px;margin-bottom:16px}
        .t{flex:1;border:1px solid #ddd;border-radius:8px;padding:10px}
        .t b{display:block;font-size:18px;color:#0a8f4e}
        .t span{font-size:11px;color:#666;text-transform:uppercase}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
        th{background:#f4f4f4}
        td.r{text-align:right}
        @media print{button{display:none}}
        button{margin-bottom:16px;padding:8px 16px;background:#0a8f4e;color:#fff;border:0;border-radius:6px;cursor:pointer}
      </style></head><body>
      <button onclick="window.print()">Imprimir / Salvar PDF</button>
      <h1>${title}</h1>
      <div class="sub">Gerado em ${new Date().toLocaleString("pt-BR")}</div>
      <div class="totals">
        <div class="t"><span>Lucro total</span><b>${brl(totalLucro)}</b></div>
        <div class="t"><span>Faturamento</span><b>${brl(totalBruto)}</b></div>
        <div class="t"><span>Corridas</span><b>${totalCorridas}</b></div>
      </div>
      <table><thead><tr>
        <th>Período</th><th class="r">Bruto</th><th class="r">KM</th><th class="r">Horas</th>
        <th class="r">Gasolina</th><th class="r">Manutenção</th><th class="r">Lucro</th><th class="r">Corridas</th>
      </tr></thead><tbody>
      ${rows.map((r) => `<tr>
        <td>${tab === "diario" ? fmtDate(r.data) : r.data}</td>
        <td class="r">${brl(r.faturamento_bruto)}</td>
        <td class="r">${r.km_rodado.toFixed(1)}</td>
        <td class="r">${r.horas_trabalhadas.toFixed(1)}</td>
        <td class="r">${brl(r.reserva_gasolina)}</td>
        <td class="r">${brl(r.reserva_manutencao)}</td>
        <td class="r">${brl(r.lucro_livre)}</td>
        <td class="r">${r.corridas}</td>
      </tr>`).join("")}
      </tbody></table>
      </body></html>`);
    w.document.close();
  };

  const totGas = mensal.reduce((a, r) => a + r.reserva_gasolina, 0);
  const totMan = mensal.reduce((a, r) => a + r.reserva_manutencao, 0);
  const totKm = mensal.reduce((a, r) => a + r.km_rodado, 0);
  const totLucro = mensal.reduce((a, r) => a + r.lucro_livre, 0);

  return (
    <AppShell title="Relatórios">
      <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Período do relatório">
        {PERIODOS.map((x) => (
          <button key={x.id} aria-pressed={periodo === x.id} onClick={() => setPeriodo(x.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              periodo === x.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
            {x.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
        {(["diario", "mensal", "reservas"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg py-2 text-xs font-semibold ${
              tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}>
            {t === "diario" ? "Diário" : t === "mensal" ? "Mensal" : "Reservas"}
          </button>
        ))}
      </div>

      {tab !== "reservas" && (
        <div className="mt-3 flex gap-2">
          <button onClick={exportPDF} disabled={rows.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-card py-2.5 text-xs font-semibold disabled:opacity-50">
            <Download className="h-3.5 w-3.5" /> Exportar PDF
          </button>
          <button onClick={exportCSV} disabled={rows.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-card py-2.5 text-xs font-semibold disabled:opacity-50">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Exportar Excel
          </button>
        </div>
      )}

      {tab === "reservas" ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-card p-5">
            <div className="mb-3 text-center">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Total a separar ({periodoInfo.label.toLowerCase()})</p>
              <p className="mt-1 text-3xl font-black text-primary">{brl(totGas + totMan)}</p>
              <p className="text-xs text-muted-foreground">{totKm.toFixed(0)} km rodados</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <ReservaCard icon={Fuel} label="Gasolina" value={totGas} color="text-amber-600" />
              <ReservaCard icon={Wrench} label="Manutenção" value={totMan} color="text-blue-600" />
            </div>
            <div className="mt-3 flex items-center justify-between rounded-lg bg-success/10 px-3 py-2">
              <span className="flex items-center gap-2 text-xs font-semibold text-success"><PiggyBank className="h-4 w-4" /> Lucro livre acumulado</span>
              <span className="font-black text-success">{brl(totLucro)}</span>
            </div>
          </div>

          <p className="px-1 text-xs text-muted-foreground">Por dia fechado:</p>
          {mensal.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Sem fechamentos ainda.</p>
          )}
          {diario.map((r) => (
            <div key={r.data} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5">
              <span className="text-sm font-semibold">{fmtDate(r.data)}</span>
              <div className="flex gap-3 text-xs">
                <span className="text-amber-600">⛽ {brl(r.reserva_gasolina)}</span>
                <span className="text-blue-600">🔧 {brl(r.reserva_manutencao)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {rows.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">Sem dias fechados neste período. Feche um dia na aba "Fechar dia" para ele aparecer aqui.</p>
          )}
          {rows.map((r) => {
            const corridasHora = r.horas_trabalhadas > 0 ? r.corridas / r.horas_trabalhadas : 0;
            const lucroHora = r.horas_trabalhadas > 0 ? r.lucro_livre / r.horas_trabalhadas : 0;
            return (
              <div key={r.data} className="rounded-xl border border-border bg-card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-bold">{tab === "diario" ? fmtDate(r.data) : r.data}</span>
                  <span className="text-base font-black text-success">{brl(r.lucro_livre)}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <Cell label="Bruto" value={brl(r.faturamento_bruto)} />
                  <Cell label="KM" value={`${r.km_rodado.toFixed(1)}`} />
                  <Cell label="Gasolina" value={brl(r.reserva_gasolina)} />
                  <Cell label="Manutenção" value={brl(r.reserva_manutencao)} />
                  <Cell label="Corridas/h" value={corridasHora.toFixed(2)} />
                  <Cell label="R$/h" value={brl(lucroHora)} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 rounded-xl border border-border bg-card p-4">
        <div className="mb-1 flex items-center gap-2 text-sm font-bold">
          <DatabaseBackup className="h-4 w-4 text-primary" /> Backup dos dados
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Os dados ficam só neste aparelho. Baixe um backup de vez em quando para não perder nada.
        </p>
        <div className="flex gap-2">
          <button onClick={downloadBackup}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-background py-2.5 text-xs font-semibold">
            <Download className="h-3.5 w-3.5" /> Baixar backup
          </button>
          <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-background py-2.5 text-xs font-semibold">
            <Upload className="h-3.5 w-3.5" /> Restaurar
            <input type="file" accept="application/json,.json" className="hidden"
              onChange={(e) => { setArquivo(e.target.files?.[0] ?? null); e.target.value = ""; }} />
          </label>
        </div>
      </div>

      <AlertDialog open={!!arquivo} onOpenChange={(o) => !o && setArquivo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar backup?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso substitui TODOS os dados deste aparelho pelos do arquivo{arquivo ? ` "${arquivo.name}"` : ""}. Antes,
              o app baixa uma cópia dos dados atuais para você não perder nada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (arquivo) restoreBackup(arquivo); setArquivo(null); }}>
              Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function ReservaCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className={`text-xl font-black ${color}`}>{brl(value)}</div>
    </div>
  );
}


function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
