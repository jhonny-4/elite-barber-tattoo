import { commandResponse } from "../../../../server/demo/http";
export const runtime = "nodejs";
export const POST = (request: Request) =>
  commandResponse(request, ["team.save"]);
