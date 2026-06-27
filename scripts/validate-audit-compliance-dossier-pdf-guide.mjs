import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("../", import.meta.url).pathname);
const guidePath = path.join(root, "docs/audit/compliance-dossier-pdf-snapshot-guide-v1.md");
const errors = [];

function fail(message) {
  errors.push(message);
}

const guide = fs.existsSync(guidePath) ? fs.readFileSync(guidePath, "utf8") : "";

if (!guide) fail("Missing PDF snapshot guide.");
for (const required of [
  "AUDIT3_COMPLIANCE_DOSSIER_PDF_SNAPSHOT_GUIDE_V1",
  "docs/compliance-evidence-v1.md",
  "source of truth",
  "Print to PDF",
  "Do not edit the PDF manually",
  "No PDF export script is added",
]) {
  if (!guide.includes(required)) fail(`PDF guide missing ${required}.`);
}

const auditDir = path.join(root, "docs/audit");
const pdfFiles = fs.existsSync(auditDir)
  ? fs
      .readdirSync(auditDir, { recursive: true })
      .map((entry) => String(entry))
      .filter((entry) => entry.toLowerCase().endsWith(".pdf"))
  : [];
if (pdfFiles.length > 0) fail(`PDF binary files are not authorized: ${pdfFiles.join(", ")}`);

if (errors.length > 0) {
  console.error("Audit PDF guide validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Audit PDF guide validation passed.");
