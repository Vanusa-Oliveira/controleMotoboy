import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Config própria dos testes: não carrega os plugins do TanStack/Lovable, que só servem ao app.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
