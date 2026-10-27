// Com o preset da Vercel, o vite-plugin-pwa grava sw.js e workbox-*.js em dist/,
// fora de .vercel/output/static. Sem esta cópia o service worker não é publicado
// e o app deixa de ser instalável/offline.
import { cpSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dest = ".vercel/output/static";
if (!existsSync(dest)) {
  console.log("[postbuild-vercel] .vercel/output/static não existe; nada a copiar.");
  process.exit(0);
}

const files = existsSync("dist") ? readdirSync("dist").filter((f) => f === "sw.js" || /^workbox-.*\.js$/.test(f)) : [];
if (!files.includes("sw.js")) {
  console.error("[postbuild-vercel] dist/sw.js não encontrado: o service worker não foi gerado.");
  process.exit(1);
}
for (const f of files) cpSync(join("dist", f), join(dest, f));
console.log(`[postbuild-vercel] copiado para ${dest}: ${files.join(", ")}`);
