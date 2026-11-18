import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { BASE_URL, JWT_SECRET, PORT } from "./support";

let server: ChildProcess | undefined;
const logs: string[] = [];

async function ready(url: string, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (server?.exitCode !== null && server?.exitCode !== undefined) {
      throw new Error(`next start exited with code ${server.exitCode}\n${logs.join("")}`);
    }
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // not listening yet
    }
    if (Date.now() > deadline) throw new Error(`Server did not become ready in time\n${logs.join("")}`);
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}

export async function setup() {
  // Testing an already running server (for example a preview deployment).
  if (process.env.SMOKE_BASE_URL) {
    await ready(`${BASE_URL}/robots.txt`, 30_000);
    return;
  }

  if (!existsSync(".next/BUILD_ID")) {
    throw new Error("No production build found. Run `npm run build` before `npm run test:smoke`.");
  }

  const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next");
  server = spawn(process.execPath, [nextBin, "start", "-p", String(PORT)], {
    env: {
      ...process.env,
      NODE_ENV: "production",
      NEXT_TELEMETRY_DISABLED: "1",
      // Fake credentials. MongoDB points at a closed port so that any
      // accidental database access fails instantly instead of hanging.
      NEXT_PUBLIC_OAUTH_CLIENT_ID: "smoke-client-id",
      MONGO_URI: "mongodb://127.0.0.1:1/smoke",
      JWT_SECRET,
      GENAI: "smoke",
      TAVILY_API: "smoke",
      RESEND_API: "re_smoke",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout?.on("data", (chunk) => logs.push(String(chunk)));
  server.stderr?.on("data", (chunk) => logs.push(String(chunk)));

  await ready(`${BASE_URL}/robots.txt`, 90_000);
}

export async function teardown() {
  if (!server || server.exitCode !== null) return;
  const exited = new Promise<void>((resolve) => server!.once("exit", () => resolve()));
  server.kill("SIGTERM");
  await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 5_000))]);
  if (server.exitCode === null) server.kill("SIGKILL");
}
