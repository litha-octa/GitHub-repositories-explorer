import type { Config } from "@netlify/functions";
import { handleReportRequest } from "../../server/handler";

// The only place the GitHub token is used; the browser never sees it.
export default (req: Request) =>
  handleReportRequest(req, { token: process.env.GITHUB_TOKEN });

export const config: Config = {
  path: "/api/report",
};
