/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { handleReportRequest } from "./server/handler";

// Saat `npm run dev`, jalankan handler Netlify Function yang sama langsung di
// dev server Vite, supaya tidak perlu netlify-cli untuk development lokal.
function localApi(token: string | undefined): Plugin {
  return {
    name: "local-api",
    configureServer(server) {
      server.middlewares.use("/api/report", async (req, res) => {
        const url = new URL(req.originalUrl ?? req.url ?? "/", "http://localhost");
        const response = await handleReportRequest(new Request(url), { token });
        res.statusCode = response.status;
        response.headers.forEach((value, key) => res.setHeader(key, value));
        res.end(await response.text());
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), localApi(env.GITHUB_TOKEN)],
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
    },
  };
});
