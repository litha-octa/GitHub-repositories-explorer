import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChakraProvider } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { delay, http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import App from "./App";
import { daysAgo, makeMetrics } from "./test/fixtures";
import type { RepoMetrics } from "./lib/types";

const REPORTS: Record<string, RepoMetrics> = {
  "pmndrs/zustand": makeMetrics({ lastCommitAt: daysAgo(3, new Date()) }),
  "reduxjs/redux": makeMetrics({
    fullName: "reduxjs/redux",
    htmlUrl: "https://github.com/reduxjs/redux",
    lastCommitAt: daysAgo(3, new Date()),
  }),
  zustand: makeMetrics({ npmPackage: "zustand", lastCommitAt: daysAgo(3, new Date()) }),
  "old/archived": makeMetrics({ fullName: "old/archived", archived: true }),
};

const server = setupServer(
  http.get("*/api/report", ({ request }) => {
    const q = new URL(request.url).searchParams.get("q") ?? "";
    const report = REPORTS[q];
    if (report) return HttpResponse.json(report);
    return HttpResponse.json(
      { error: { code: "NOT_FOUND", message: `Repo ${q} tidak ditemukan` } },
      { status: 404 },
    );
  }),
);

const originalFetch = globalThis.fetch;

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  // AbortSignal milik jsdom ditolak oleh fetch bawaan Node (undici), jadi buang signal di test.
  const mswFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => mswFetch(input, { ...init, signal: undefined });
});
afterEach(() => server.resetHandlers());
afterAll(() => {
  globalThis.fetch = originalFetch;
  server.close();
});

function renderApp(search = "") {
  window.history.replaceState(null, "", `/${search}`);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ChakraProvider>
      <QueryClientProvider client={client}>
        <App />
      </QueryClientProvider>
    </ChakraProvider>,
  );
}

describe("App", () => {
  it("mencari repo dan menampilkan status, skor, dan alasannya", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.type(screen.getByLabelText("Repo atau package"), "pmndrs/zustand");
    await user.click(screen.getByRole("button", { name: "Cek" }));

    expect(await screen.findByRole("heading", { name: /pmndrs\/zustand/ })).toBeInTheDocument();
    expect(screen.getByText("Aktif")).toBeInTheDocument();
    expect(screen.getByTestId("summary")).toHaveTextContent(/^Skor 100 — Commit terakhir 3 hari lalu ✓/);
    expect(window.location.search).toBe("?repos=pmndrs/zustand");
  });

  it("menampilkan skeleton selama laporan dimuat", async () => {
    server.use(
      http.get("*/api/report", async () => {
        await delay(100);
        return HttpResponse.json(REPORTS["pmndrs/zustand"]);
      }),
    );
    renderApp("?repos=pmndrs/zustand");
    expect(screen.getByLabelText("Memuat laporan")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /pmndrs\/zustand/ })).toBeInTheDocument();
    expect(screen.queryByLabelText("Memuat laporan")).not.toBeInTheDocument();
  });

  it("menampilkan sumber endpoint untuk setiap metrik", async () => {
    renderApp("?repos=pmndrs/zustand");
    await screen.findByRole("heading", { name: /pmndrs\/zustand/ });
    expect(screen.getByText("GET /repos/{owner}/{repo}/community/profile")).toBeInTheDocument();
  });

  it("menampilkan pesan saat repo tidak ditemukan", async () => {
    renderApp("?repos=ghost/nothing");
    expect(await screen.findByText("Repo tidak ditemukan")).toBeInTheDocument();
    expect(screen.getByText("Repo ghost/nothing tidak ditemukan")).toBeInTheDocument();
  });

  it("menampilkan Diarsipkan tanpa skor", async () => {
    renderApp("?repos=old/archived");
    expect(await screen.findByText("Diarsipkan")).toBeInTheDocument();
    expect(screen.queryByText("/ 100")).not.toBeInTheDocument();
  });

  it("menolak input yang tidak valid tanpa memanggil API", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.type(screen.getByLabelText("Repo atau package"), "bukan valid!");
    await user.click(screen.getByRole("button", { name: "Cek" }));
    expect(screen.getByText(/Contoh: pmndrs\/zustand/)).toBeInTheDocument();
    expect(window.location.search).toBe("");
  });

  it("menambah library pembanding dari halaman laporan", async () => {
    const user = userEvent.setup();
    renderApp("?repos=pmndrs/zustand");
    await user.click(await screen.findByRole("button", { name: "Bandingkan" }));
    await user.type(screen.getByLabelText("Library pembanding"), "reduxjs/redux");
    await user.click(screen.getByRole("button", { name: "Tambah" }));

    expect(await screen.findByText("Perbandingan 2 library")).toBeInTheDocument();
    expect(window.location.search).toBe("?repos=pmndrs/zustand,reduxjs/redux");
  });

  it("membuka mode bandingkan langsung dari link yang dibagikan", async () => {
    const user = userEvent.setup();
    renderApp("?repos=pmndrs/zustand,reduxjs/redux,ghost/nothing");
    const table = await screen.findByRole("table");
    expect(await within(table).findByRole("link", { name: "reduxjs/redux" })).toBeInTheDocument();
    expect(await within(table).findByText("Repo ghost/nothing tidak ditemukan")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Hapus ghost/nothing" }));
    expect(window.location.search).toBe("?repos=pmndrs/zustand,reduxjs/redux");
  });

  it("menerima nama package npm", async () => {
    renderApp("?repos=zustand");
    expect(await screen.findByText("npm: zustand")).toBeInTheDocument();
  });
});
