import { parseGitHubRepo, parseInput } from "./parseInput";

describe("parseInput", () => {
  it.each([
    ["pmndrs/zustand", "pmndrs", "zustand"],
    ["  reduxjs/redux  ", "reduxjs", "redux"],
    ["https://github.com/vercel/swr", "vercel", "swr"],
    ["https://github.com/vercel/swr/tree/main/src", "vercel", "swr"],
    ["github.com/facebook/react.git", "facebook", "react"],
    ["https://github.com/socketio/socket.io", "socketio", "socket.io"],
  ])("%s → repo GitHub %s/%s", (input, owner, repo) => {
    expect(parseInput(input)).toEqual({ kind: "github", owner, repo });
  });

  it.each([
    ["zustand", "zustand"],
    ["Lodash", "lodash"],
    ["@tanstack/react-query", "@tanstack/react-query"],
    ["lodash.debounce", "lodash.debounce"],
  ])("%s → package npm %s", (input, name) => {
    expect(parseInput(input)).toEqual({ kind: "npm", name });
  });

  it.each(["", "   ", "foo bar", "a/b/c", "https://gitlab.com/foo/bar"])(
    "%j tidak valid",
    (input) => {
      expect(parseInput(input)).toEqual({ kind: "invalid" });
    },
  );
});

describe("parseGitHubRepo (field repository dari npm)", () => {
  it.each([
    "git+https://github.com/pmndrs/zustand.git",
    "git://github.com/pmndrs/zustand.git",
    "git+ssh://git@github.com/pmndrs/zustand.git",
    "git@github.com:pmndrs/zustand.git",
    "github:pmndrs/zustand",
    "pmndrs/zustand",
    "https://github.com/pmndrs/zustand#readme",
  ])("%s", (url) => {
    expect(parseGitHubRepo(url)).toEqual({ owner: "pmndrs", repo: "zustand" });
  });

  it("menolak repo yang bukan di GitHub", () => {
    expect(parseGitHubRepo("git+https://gitlab.com/foo/bar.git")).toBeNull();
    expect(parseGitHubRepo("https://example.com")).toBeNull();
  });
});
