export interface RepoRef {
  owner: string;
  repo: string;
}

export type ParsedInput =
  | ({ kind: "github" } & RepoRef)
  | { kind: "npm"; name: string }
  | { kind: "invalid" };

const OWNER = "[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?";
const REPO = "[A-Za-z0-9._-]+";
const SHORTHAND = new RegExp(`^(?:github:)?(${OWNER})/(${REPO})$`);
const GITHUB_URL = new RegExp(`github\\.com[/:](${OWNER})/(${REPO})(?:[/#?].*)?$`, "i");
const NPM_NAME = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

function clean(owner: string, repo: string): RepoRef | null {
  const name = repo.replace(/\.git$/, "");
  return name ? { owner, repo: name } : null;
}

/**
 * Ambil owner/repo dari berbagai bentuk penulisan repo GitHub:
 * `owner/repo`, `github:owner/repo`, URL https, `git+https://…git`, `git@github.com:…`.
 * Mengembalikan null untuk repo yang bukan di GitHub.
 */
export function parseGitHubRepo(value: string): RepoRef | null {
  const text = value.trim();
  const match = SHORTHAND.exec(text) ?? GITHUB_URL.exec(text);
  return match ? clean(match[1], match[2]) : null;
}

/** Tebak apa yang diketik pengguna: repo GitHub atau nama package npm. */
export function parseInput(raw: string): ParsedInput {
  const text = raw.trim();
  if (!text) return { kind: "invalid" };
  // Package npm ber-scope (`@scope/name`) juga mengandung "/", jadi cek dulu.
  if (!text.startsWith("@")) {
    const repo = parseGitHubRepo(text);
    if (repo) return { kind: "github", ...repo };
  }
  const name = text.toLowerCase();
  if (NPM_NAME.test(name) && name.length <= 214) return { kind: "npm", name };
  return { kind: "invalid" };
}
