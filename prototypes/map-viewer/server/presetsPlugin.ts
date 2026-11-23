import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { join } from "node:path";
import type { Plugin } from "vite";
import { sanitizeSettings } from "../src/lab/settings.ts";
import { isValidPresetName, PRESET_FORMAT_VERSION, PRESETS_API_PATH } from "../src/lab/presetFormat.ts";

const MAX_BODY_BYTES = 64 * 1024;
const PRESET_EXTENSION = ".json";
const STATUS = { ok: 200, noContent: 204, badRequest: 400, notFound: 404, notAllowed: 405, tooLarge: 413 } as const;

export function presetsPlugin(directory: string): Plugin {
  return {
    name: "codename-run-presets",
    configureServer(server) {
      server.middlewares.use(PRESETS_API_PATH, (request, response) => {
        handle(directory, request, response).catch(() => send(response, STATUS.badRequest, { error: "invalid request" }));
      });
    },
  };
}

async function handle(directory: string, request: IncomingMessage, response: ServerResponse): Promise<void> {
  const name = decodeURIComponent((request.url ?? "/").split("?")[0]?.replace(/^\//, "") ?? "");

  if (name === "") {
    if (request.method !== "GET") return send(response, STATUS.notAllowed, { error: "method not allowed" });
    return send(response, STATUS.ok, { presets: await listPresets(directory) });
  }
  if (!isValidPresetName(name)) return send(response, STATUS.badRequest, { error: "invalid preset name" });

  const path = join(directory, `${name}${PRESET_EXTENSION}`);
  if (request.method === "GET") {
    const content = await readFile(path, "utf8").catch(() => undefined);
    if (content === undefined) return send(response, STATUS.notFound, { error: "preset not found" });
    const parsed = JSON.parse(content) as { settings?: unknown };
    return send(response, STATUS.ok, { settings: sanitizeSettings(parsed.settings) });
  }
  if (request.method === "PUT") {
    const body = await readBody(request);
    if (body === undefined) return send(response, STATUS.tooLarge, { error: "preset too large" });
    const parsed = JSON.parse(body) as { settings?: unknown };
    const preset = { version: PRESET_FORMAT_VERSION, settings: sanitizeSettings(parsed.settings) };
    await mkdir(directory, { recursive: true });
    await writeFile(path, `${JSON.stringify(preset, null, 2)}\n`);
    return send(response, STATUS.ok, { saved: name });
  }
  if (request.method === "DELETE") {
    await rm(path, { force: true });
    return send(response, STATUS.noContent, undefined);
  }
  return send(response, STATUS.notAllowed, { error: "method not allowed" });
}

async function listPresets(directory: string): Promise<string[]> {
  const files = await readdir(directory).catch(() => [] as string[]);
  return files
    .filter((file) => file.endsWith(PRESET_EXTENSION))
    .map((file) => file.slice(0, -PRESET_EXTENSION.length))
    .filter(isValidPresetName)
    .sort();
}

function readBody(request: IncomingMessage): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    request.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        resolve(undefined);
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function send(response: ServerResponse, status: number, body: unknown): void {
  response.statusCode = status;
  if (body === undefined) {
    response.end();
    return;
  }
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(body));
}
