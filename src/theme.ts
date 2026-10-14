import { extendTheme } from "@chakra-ui/react";
import type { RepoStatus } from "./lib/score";

export const theme = extendTheme({
  config: { initialColorMode: "system", useSystemColorMode: true },
  fonts: {
    heading: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`,
    body: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`,
    mono: `ui-monospace, "SF Mono", Menlo, Consolas, monospace`,
  },
});

export const STATUS_COLOR: Record<RepoStatus, string> = {
  active: "green",
  slowing: "orange",
  inactive: "red",
  archived: "gray",
};
