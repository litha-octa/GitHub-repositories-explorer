import { useCallback, useEffect, useState } from "react";

export const MAX_REPOS = 4;

function readRepos(): string[] {
  const value = new URLSearchParams(window.location.search).get("repos") ?? "";
  return dedupe(value.split(",")).slice(0, MAX_REPOS);
}

function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  return items
    .map((item) => item.trim())
    .filter((item) => {
      const key = item.toLowerCase();
      if (!item || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** `?repos=pmndrs/zustand,reduxjs/redux` — "/" dan "@" dibiarkan apa adanya supaya link mudah dibaca. */
function toSearch(repos: string[]): string {
  if (repos.length === 0) return "";
  const encoded = repos.map((r) =>
    encodeURIComponent(r).replace(/%2F/gi, "/").replace(/%40/g, "@"),
  );
  return `?repos=${encoded.join(",")}`;
}

/** Daftar repo yang sedang dilihat, disimpan di URL supaya bisa dibagikan. */
export function useUrlRepos() {
  const [repos, setState] = useState<string[]>(readRepos);

  useEffect(() => {
    const onPop = () => setState(readRepos());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const setRepos = useCallback((next: string[]) => {
    const clean = dedupe(next).slice(0, MAX_REPOS);
    const url = `${window.location.pathname}${toSearch(clean)}`;
    window.history.pushState(null, "", url);
    setState(clean);
  }, []);

  return [repos, setRepos] as const;
}
