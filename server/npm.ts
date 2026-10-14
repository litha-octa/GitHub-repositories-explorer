import { parseGitHubRepo, type RepoRef } from "../src/lib/parseInput";
import { ReportError } from "./github";

interface NpmManifest {
  repository?: string | { url?: string };
  homepage?: string;
  bugs?: string | { url?: string };
}

/** Turn an npm package name into a GitHub owner/repo using its `repository.url` field. */
export async function resolveNpmPackage(
  name: string,
  fetchImpl: typeof fetch = fetch,
): Promise<RepoRef> {
  // Fetch only the latest version's manifest; the full package document can be several MB.
  const res = await fetchImpl(`https://registry.npmjs.org/${name.replace("/", "%2F")}/latest`);
  if (res.status === 404) {
    throw new ReportError("NPM_NOT_FOUND", `npm package "${name}" not found`, 404);
  }
  if (!res.ok) {
    throw new ReportError("UPSTREAM", `npm registry responded with ${res.status}`, 502);
  }

  const pkg = (await res.json()) as NpmManifest;
  const urlOf = (field: string | { url?: string } | undefined) =>
    typeof field === "string" ? field : field?.url;

  // `repository` is the main source; homepage/bugs are fallbacks for older packages.
  for (const candidate of [urlOf(pkg.repository), pkg.homepage, urlOf(pkg.bugs)]) {
    const ref = candidate ? parseGitHubRepo(candidate) : null;
    if (ref) return ref;
  }
  throw new ReportError("NPM_NO_REPO", `Package "${name}" doesn't list a GitHub repo`, 404);
}
