import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(
  readFileSync(
    path.join(root, "src/lib/manual/screenshot-manifest.json"),
    "utf8",
  ),
);

const counts = manifest.captures.reduce(
  (result, capture) => {
    result[capture.review.status] =
      (result[capture.review.status] ?? 0) + 1;
    if (capture.usage === "orphan") result.orphaned += 1;
    return result;
  },
  { reviewed: 0, "pending-review": 0, "known-defect": 0, orphaned: 0 },
);
const referenced = manifest.captures.length - counts.orphaned;

console.log(
  `Manual visual: ${counts.reviewed}/${referenced} PNG referenciados aprobados; ` +
    `${counts["pending-review"]} pendientes; ${counts["known-defect"]} defectuosos; ` +
    `${counts.orphaned} huérfanos declarados.`,
);

const incomplete =
  counts.reviewed !== referenced ||
  counts["pending-review"] > 0 ||
  counts["known-defect"] > 0;

if (incomplete) {
  console.warn(
    "ADVERTENCIA: el contrato puede ser válido sin que exista cobertura visual aprobada. " +
      "AUD-P2-03/AUD-P2-04 deben recapturar y revisar estos estados.",
  );
}

if (process.argv.includes("--strict") && incomplete) {
  console.error("La cobertura visual estricta todavía no está completa.");
  process.exitCode = 1;
}
