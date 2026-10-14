import type { Config } from "@netlify/functions";
import { handleReportRequest } from "../../server/handler";

// Satu-satunya tempat token GitHub dipakai; browser tidak pernah melihatnya.
export default (req: Request) =>
  handleReportRequest(req, { token: process.env.GITHUB_TOKEN });

export const config: Config = {
  path: "/api/report",
};
