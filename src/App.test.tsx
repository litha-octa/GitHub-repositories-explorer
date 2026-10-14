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
      { error: { code: "NOT_FOUND", message: `Repo ${q} not found` } },
      { status: 404 },
    );
  }),
);

const originalFetch = globalThis.fetch;

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  // Node's built-in fetch (undici) rejects jsdom's AbortSignal, so drop the signal in tests.
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
  it("searches for a repo and shows its status, score, and reasons", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.type(screen.getByLabelText("Repo or package"), "pmndrs/zustand");
    await user.click(screen.getByRole("button", { name: "Check" }));

    expect(await screen.findByRole("heading", { name: /pmndrs\/zustand/ })).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByTestId("summary")).toHaveTextContent(/^Score 100 — Last commit 3 days ago ✓/);
    expect(window.location.search).toBe("?repos=pmndrs/zustand");
  });

  it("shows a skeleton while the report loads", async () => {
    server.use(
      http.get("*/api/report", async () => {
        await delay(100);
        return HttpResponse.json(REPORTS["pmndrs/zustand"]);
      }),
    );
    renderApp("?repos=pmndrs/zustand");
    expect(screen.getByLabelText("Loading report")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /pmndrs\/zustand/ })).toBeInTheDocument();
    expect(screen.queryByLabelText("Loading report")).not.toBeInTheDocument();
  });

  it("shows the source endpoint for every metric", async () => {
    renderApp("?repos=pmndrs/zustand");
    await screen.findByRole("heading", { name: /pmndrs\/zustand/ });
    expect(screen.getByText("GET /repos/{owner}/{repo}/community/profile")).toBeInTheDocument();
  });

  it("shows a message when the repo is not found", async () => {
    renderApp("?repos=ghost/nothing");
    expect(await screen.findByText("Repo not found")).toBeInTheDocument();
    expect(screen.getByText("Repo ghost/nothing not found")).toBeInTheDocument();
  });

  it("shows Archived without a score", async () => {
    renderApp("?repos=old/archived");
    expect(await screen.findByText("Archived")).toBeInTheDocument();
    expect(screen.queryByText("/ 100")).not.toBeInTheDocument();
  });

  it("rejects invalid input without calling the API", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.type(screen.getByLabelText("Repo or package"), "not valid!");
    await user.click(screen.getByRole("button", { name: "Check" }));
    expect(screen.getByText(/Examples: pmndrs\/zustand/)).toBeInTheDocument();
    expect(window.location.search).toBe("");
  });

  it("adds a library to compare from the report page", async () => {
    const user = userEvent.setup();
    renderApp("?repos=pmndrs/zustand");
    await user.click(await screen.findByRole("button", { name: "Compare" }));
    await user.type(screen.getByLabelText("Library to compare"), "reduxjs/redux");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByText("Comparing 2 libraries")).toBeInTheDocument();
    expect(window.location.search).toBe("?repos=pmndrs/zustand,reduxjs/redux");
  });

  it("opens compare mode straight from a shared link", async () => {
    const user = userEvent.setup();
    renderApp("?repos=pmndrs/zustand,reduxjs/redux,ghost/nothing");
    const table = await screen.findByRole("table");
    expect(await within(table).findByRole("link", { name: "reduxjs/redux" })).toBeInTheDocument();
    expect(await within(table).findByText("Repo ghost/nothing not found")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove ghost/nothing" }));
    expect(window.location.search).toBe("?repos=pmndrs/zustand,reduxjs/redux");
  });

  it("accepts an npm package name", async () => {
    renderApp("?repos=zustand");
    expect(await screen.findByText("npm: zustand")).toBeInTheDocument();
  });
});
