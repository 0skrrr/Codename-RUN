import { createReadStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { buildLayers, layersBoundingBox, LAYER_NAMES, parseOsm } from "../index.ts";

const [inputPath, outputDirectory] = process.argv.slice(2);
if (!inputPath || !outputDirectory) {
  process.stderr.write("Usage: node src/cli/convert.ts <input.osm> <output-directory>\n");
  process.exit(1);
}

const startedAt = performance.now();
const data = await parseOsm(createReadStream(inputPath, { encoding: "utf8" }));
process.stdout.write(
  `Parsed ${data.nodes.size} nodes, ${data.ways.size} ways, ${data.relations.size} relations\n`,
);

const layers = buildLayers(data);
const bounds = layersBoundingBox(layers);
if (!bounds) {
  process.stderr.write("No map features found in the input file.\n");
  process.exit(1);
}

await mkdir(outputDirectory, { recursive: true });
const manifestLayers = [];
for (const name of LAYER_NAMES) {
  const file = `${name}.geojson`;
  const collection = layers[name];
  await writeFile(join(outputDirectory, file), JSON.stringify(collection));
  manifestLayers.push({ name, file, featureCount: collection.features.length });
  process.stdout.write(`  ${name}: ${collection.features.length} features\n`);
}

const manifest = { name: basename(outputDirectory), bounds, layers: manifestLayers };
await writeFile(join(outputDirectory, "manifest.json"), JSON.stringify(manifest, null, 2));
const seconds = ((performance.now() - startedAt) / 1000).toFixed(1);
process.stdout.write(`Wrote ${outputDirectory} in ${seconds}s\n`);
