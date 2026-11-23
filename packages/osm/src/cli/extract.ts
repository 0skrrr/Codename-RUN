import { execFile, spawn } from "node:child_process";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

const DEFAULT_COUNTRY_PBF_URL = "https://download.geofabrik.de/europe/czech-republic-latest.osm.pbf";
const COUNTRY_PBF_FILE = "czech-republic-latest.osm.pbf";
const REFRESH_FLAG = "--refresh";
const BYTES_PER_MEGABYTE = 1_048_576;
const USER_AGENT = "codename-run-osm-extract/0.1";
const CURL_RETRIES = "20";
const CURL_RETRY_DELAY_SECONDS = "5";
const STALL_BYTES_PER_SECOND = "10000";
const STALL_SECONDS = "30";
const CURL_EXIT_RESUME_UNSUPPORTED = 33;
const OSMIUM_INSTALL_HINT = "Install osmium first: brew install osmium-tool (macOS) or apt install osmium-tool (Linux).";

const runFile = promisify(execFile);
const positional = process.argv.slice(2).filter((argument) => argument !== REFRESH_FLAG);
const refresh = process.argv.includes(REFRESH_FLAG);
const [relationArgument, outputPath] = positional;
const relationId = Number(relationArgument);
if (!Number.isInteger(relationId) || relationId <= 0 || !outputPath) {
  process.stderr.write("Usage: node src/cli/extract.ts <osm-relation-id> <output.osm> [--refresh]\n");
  process.exit(1);
}

await ensureOsmiumInstalled();
const dataDirectory = dirname(outputPath);
await mkdir(dataDirectory, { recursive: true });
const countryPbf = join(dataDirectory, COUNTRY_PBF_FILE);
await ensureCountryExtract(countryPbf, process.env.GEOFABRIK_PBF_URL || DEFAULT_COUNTRY_PBF_URL, refresh);

const boundaryFile = join(dataDirectory, `boundary-${relationId}.osm.pbf`);
process.stdout.write(`Extracting boundary relation ${relationId}…\n`);
await osmium(["getid", "--add-referenced", "--overwrite", "-o", boundaryFile, countryPbf, `r${relationId}`]);

process.stdout.write(`Cutting the area out of ${COUNTRY_PBF_FILE}…\n`);
await osmium([
  "extract",
  "--polygon",
  boundaryFile,
  "--strategy",
  "smart",
  "--overwrite",
  "-o",
  outputPath,
  countryPbf,
]);
await rm(boundaryFile, { force: true });

const { size } = await stat(outputPath);
process.stdout.write(`Saved ${outputPath} (${(size / BYTES_PER_MEGABYTE).toFixed(1)} MB)\n`);

async function ensureOsmiumInstalled(): Promise<void> {
  try {
    await runFile("osmium", ["--version"]);
  } catch {
    process.stderr.write(`${OSMIUM_INSTALL_HINT}\n`);
    process.exit(1);
  }
}

async function osmium(args: string[]): Promise<void> {
  await runFile("osmium", args, { maxBuffer: 16 * BYTES_PER_MEGABYTE });
}

async function ensureCountryExtract(destination: string, url: string, forceDownload: boolean): Promise<void> {
  const existing = await stat(destination).catch(() => undefined);
  if (existing && !forceDownload) {
    const age = existing.mtime.toISOString().slice(0, 10);
    process.stdout.write(`Using cached ${destination} from ${age} (pass ${REFRESH_FLAG} to download a fresh one)\n`);
    return;
  }

  const partialPath = `${destination}.partial`;
  const remote = await describeRemoteFile(url);
  await discardOutdatedPartial(partialPath, remote.lastModified, forceDownload);
  process.stdout.write(`Downloading ${remote.url} (${(remote.size / BYTES_PER_MEGABYTE).toFixed(0)} MB)\n`);

  await curlDownload(remote.url, partialPath);
  const { size } = await stat(partialPath);
  if (remote.size > 0 && size !== remote.size) {
    throw new Error(`Download incomplete (${size} of ${remote.size} bytes); run the command again to resume`);
  }
  await rename(partialPath, destination);
  process.stdout.write("Download complete\n");
}

interface RemoteFile {
  url: string;
  size: number;
  lastModified: string;
}

async function describeRemoteFile(url: string): Promise<RemoteFile> {
  const response = await fetch(url, { method: "HEAD", headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) throw new Error(`Could not reach ${url}: HTTP ${response.status}`);
  return {
    url: response.url,
    size: Number(response.headers.get("content-length") ?? 0),
    lastModified: response.headers.get("last-modified") ?? "",
  };
}

async function discardOutdatedPartial(partialPath: string, lastModified: string, forceDownload: boolean): Promise<void> {
  const partial = await stat(partialPath).catch(() => undefined);
  if (!partial) return;
  const remoteDate = Date.parse(lastModified);
  const partialIsCurrent = Number.isFinite(remoteDate) && partial.mtimeMs >= remoteDate;
  if (!forceDownload && partialIsCurrent) {
    process.stdout.write(`Resuming earlier download at ${(partial.size / BYTES_PER_MEGABYTE).toFixed(0)} MB\n`);
    return;
  }
  await rm(partialPath, { force: true });
}

function curlDownload(url: string, destination: string): Promise<void> {
  const args = [
    "--fail",
    "--location",
    "--continue-at",
    "-",
    "--retry",
    CURL_RETRIES,
    "--retry-delay",
    CURL_RETRY_DELAY_SECONDS,
    "--retry-all-errors",
    "--speed-limit",
    STALL_BYTES_PER_SECOND,
    "--speed-time",
    STALL_SECONDS,
    "--user-agent",
    USER_AGENT,
    "--output",
    destination,
    url,
  ];
  return new Promise((resolve, reject) => {
    const child = spawn("curl", args, { stdio: ["ignore", "inherit", "inherit"] });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) return resolve();
      const hint = code === CURL_EXIT_RESUME_UNSUPPORTED ? " (server refused to resume; delete the .partial file)" : "";
      reject(new Error(`curl exited with code ${code}${hint}; run the command again to resume`));
    });
  });
}
