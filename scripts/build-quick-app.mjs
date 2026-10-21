import { build } from "esbuild";
import { mkdir, readFile, writeFile, copyFile, readdir, unlink } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outdir = path.join(root, "public/rapido");
await mkdir(outdir, { recursive: true });
// Only generated, flat assets inside this builder's own output directory.
for (const entry of await readdir(outdir, { withFileTypes: true })) {
  if (entry.isFile()) await unlink(path.join(outdir, entry.name));
}
const result = await build({
  absWorkingDir: root, entryPoints: ["src/quick-app/app.ts"], outdir,
  bundle: true, splitting: true, format: "esm", target: "es2022", minify: true,
  entryNames: "app-[hash]", chunkNames: "chunk-[hash]", assetNames: "asset-[hash]",
  tsconfig: "tsconfig.json", metafile: true, legalComments: "none",
  define: { "process.env.NODE_ENV": '"production"' },
});
const entry = Object.entries(result.metafile.outputs).find(([,info]) => info.entryPoint === "src/quick-app/app.ts");
if (!entry) throw new Error("Missing quick entry point");
const initialOutputs = new Set();
function visit(file) {
  if (initialOutputs.has(file)) return;
  initialOutputs.add(file);
  const output = result.metafile.outputs[file];
  for (const dependency of output?.imports ?? []) if (dependency.kind !== "dynamic-import" && !dependency.external) visit(dependency.path);
}
visit(entry[0]);
const inputs = [...initialOutputs].flatMap(file => Object.entries(result.metafile.outputs[file]?.inputs ?? {}).filter(([,info]) => info.bytesInOutput > 0).map(([name]) => name));
for (const forbidden of ["AppStore", "AppProviders", "CloudSync", "fiscal-models", "tax-model-diagnostic"]) {
  if (inputs.some((input) => input.includes(forbidden))) throw new Error(`Quick app pulled in ${forbidden}`);
}
const js = path.basename(entry[0]);
const css = path.basename(entry[1].cssBundle);
// This is an independent PWA, not a second rendering of the main Next app.
const source = await readFile(path.join(root,"src/quick-app/index.html"),"utf8");
await writeFile(path.join(outdir,"index.html"),source.replace("__QUICK_JS__",js).replace("__QUICK_CSS__",css));
for (const file of ["manifest.webmanifest","icon.svg"]) await copyFile(path.join(root,"src/quick-app",file),path.join(outdir,file));
const icon = await loadImage(await readFile(path.join(root,"src/quick-app/icon.svg")));
for (const size of [192,512]) {
  const canvas = createCanvas(size,size);
  canvas.getContext("2d").drawImage(icon,0,0,size,size);
  await writeFile(path.join(outdir,`icon-${size}.png`),canvas.toBuffer("image/png"));
}
const sw = await readFile(path.join(root,"src/quick-app/sw.js"),"utf8");
const shell = ["/rapido/index.html",...initialOutputs].map(file => file.startsWith("/rapido/") ? file : `/rapido/${path.basename(file)}`);
shell.push(`/rapido/${css}`,"/rapido/icon.svg","/rapido/icon-192.png","/rapido/icon-512.png");
await writeFile(path.join(outdir,"sw.js"),sw.replace("__QUICK_VERSION__",js).replace("__QUICK_SHELL__",JSON.stringify([...new Set(shell)])));
const entryBytes = (await Promise.all([...initialOutputs].map(async file => gzipSync(await readFile(path.resolve(root,file))).length))).reduce((a,b) => a+b,0);
if (entryBytes > 160_000) throw new Error(`Quick entry exceeds 160 KB gzip: ${entryBytes}`);
console.log(`Factu Rápido: independent shell, ${Math.round(entryBytes/1024)} KB gzip entry; PDF loaded on demand.`);
await writeFile(path.join(outdir,"build-info.json"),JSON.stringify({ initialGzipBytes:entryBytes, initialFiles:[...initialOutputs].map(file => path.basename(file)), initialInputs: inputs }));
