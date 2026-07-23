/**
 * Tiny static server for PeopleSoft-shaped URLs so Chrome content_scripts match.
 * Paths like /psp/ps/EMPLOYEE/HRMS/c/MENU.COMP.GBL → fluid fixture.
 */
import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = resolve(__dirname, "../fixtures");

export const E2E_PORT = Number(process.env.MPU_E2E_PORT || 4173);
export const E2E_ORIGIN = `http://127.0.0.1:${E2E_PORT}`;

export const FLUID_COMPONENT_PATH = "/psp/ps/EMPLOYEE/HRMS/c/MENU.COMP.GBL";
export const CLASSIC_COMPONENT_PATH = "/psp/ps/EMPLOYEE/HRMS/c/CLASSIC.COMP.GBL";
export const HOMEPAGE_PATH = "/psp/ps/EMPLOYEE/HRMS/h/?tab=DEFAULT";

function htmlFor(urlPath: string): string | null {
  if (urlPath.includes("/c/CLASSIC.") || urlPath.includes("/c/classic.")) {
    return readFileSync(resolve(fixtures, "classic-component.html"), "utf8");
  }
  if (urlPath.includes("/c/") || urlPath.includes("/h/") || urlPath.includes("/s/")) {
    return readFileSync(resolve(fixtures, "fluid-component.html"), "utf8");
  }
  return null;
}

export function startFixtureServer(): Promise<Server> {
  const server = createServer((req, res) => {
    const url = req.url || "/";
    const body = htmlFor(url);
    if (!body) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(`No fixture for ${url}`);
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(body);
  });

  return new Promise((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(E2E_PORT, "127.0.0.1", () => resolvePromise(server));
  });
}

export async function stopFixtureServer(server: Server): Promise<void> {
  await new Promise<void>((resolvePromise, reject) => {
    server.close((err) => (err ? reject(err) : resolvePromise()));
  });
}
