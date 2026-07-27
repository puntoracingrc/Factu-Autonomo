import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function includes(source, text, label) {
  assert(source.includes(text), `${label} must contain ${text}`);
}

function excludes(source, text, label) {
  assert(!source.includes(text), `${label} must not contain ${text}`);
}

const component = read("src/components/cloud/CentralInvoiceAuthorityEventsSyncCard.tsx");
const accountPage = read("src/app/cuenta/page.tsx");
const doc = read("docs/architecture/central-invoice-authority-events-manual-ui-v1.md");

includes(component, "syncCentralInvoiceAuthorityEvents(data", "manual UI");
includes(component, "CENTRAL_AUTHORITY_EVENTS_MANUAL_LIMIT", "manual UI");
includes(component, "stale_precondition", "manual UI");
includes(component, "No se ha cambiado la lista local ni avanzado el cursor", "manual UI");
excludes(component, "syncNow(", "manual UI");
excludes(component, "forceDownloadFromCloud", "manual UI");
excludes(component, "prepareCloudRepairPreview", "manual UI");
excludes(component, "setInterval", "manual UI");

includes(accountPage, "CentralInvoiceAuthorityEventsSyncCard", "Cuenta");
assert(
  accountPage.indexOf("<CentralInvoiceAuthorityEventsSyncCard />") <
    accountPage.indexOf("<CloudDevicesCard />"),
  "manual UI must appear before device management in Cuenta sync section",
);

includes(doc, "no automatic polling", "manual UI ADR");
includes(doc, "stale_precondition", "manual UI ADR");
includes(doc, "do not replace documents", "manual UI ADR");

console.log("central invoice authority manual UI contract ok");
