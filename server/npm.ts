import { parseGitHubRepo, type RepoRef } from "../src/lib/parseInput";
import { ReportError } from "./github";

interface NpmManifest {
  repository?: string | { url?: string };
  homepage?: string;
  bugs?: string | { url?: string };
}

/** Ubah nama package npm menjadi owner/repo GitHub lewat field `repository.url`. */
export async function resolveNpmPackage(
  name: string,
  fetchImpl: typeof fetch = fetch,
): Promise<RepoRef> {
  // Ambil manifest versi terbaru saja; dokumen package lengkap bisa berukuran beberapa MB.
  const res = await fetchImpl(`https://registry.npmjs.org/${name.replace("/", "%2F")}/latest`);
  if (res.status === 404) {
    throw new ReportError("NPM_NOT_FOUND", `Package npm "${name}" tidak ditemukan`, 404);
  }
  if (!res.ok) {
    throw new ReportError("UPSTREAM", `npm registry membalas ${res.status}`, 502);
  }

  const pkg = (await res.json()) as NpmManifest;
  const urlOf = (field: string | { url?: string } | undefined) =>
    typeof field === "string" ? field : field?.url;

  // `repository` adalah sumber utama; homepage/bugs jadi cadangan untuk package lama.
  for (const candidate of [urlOf(pkg.repository), pkg.homepage, urlOf(pkg.bugs)]) {
    const ref = candidate ? parseGitHubRepo(candidate) : null;
    if (ref) return ref;
  }
  throw new ReportError(
    "NPM_NO_REPO",
    `Package "${name}" tidak mencantumkan repo GitHub`,
    404,
  );
}
