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
 * Extract owner/repo from the many ways a GitHub repo can be written:
 * `owner/repo`, `github:owner/repo`, https URLs, `git+https://…git`, `git@github.com:…`.
 * Returns null for repos that are not on GitHub.
 */
export function parseGitHubRepo(value: string): RepoRef | null {
  const text = value.trim();
  const match = SHORTHAND.exec(text) ?? GITHUB_URL.exec(text);
  return match ? clean(match[1], match[2]) : null;
}

/** Work out what the user typed: a GitHub repo or an npm package name. */
export function parseInput(raw: string): ParsedInput {
  const text = raw.trim();
  if (!text) return { kind: "invalid" };
  // Scoped npm packages (`@scope/name`) also contain "/", so check for them first.
  if (!text.startsWith("@")) {
    const repo = parseGitHubRepo(text);
    if (repo) return { kind: "github", ...repo };
  }
  const name = text.toLowerCase();
  if (NPM_NAME.test(name) && name.length <= 214) return { kind: "npm", name };
  return { kind: "invalid" };
}
