import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const appStore = source("../../context/AppStore.tsx");
const hook = source("../../hooks/useCentralCustomerCreate.ts");
const mutationHook = source("../../hooks/useCentralCustomerMutations.ts");
const documentHook = source(
  "../../hooks/useCentralDocumentCustomerUpsert.ts",
);
const documentForm = source("../../components/forms/DocumentForm.tsx");
const userIdHook = source("../../hooks/useCentralBusinessUserId.ts");
const customersPage = source("../../app/clientes/page.tsx");
const newCustomerPage = source("../../app/clientes/nuevo/page.tsx");
const eventApply = source("./events-app-data-sync.ts");

describe("central customer create canary wiring", () => {
  it("expone un commit durable con identidad compartida", () => {
    expect(appStore).toContain("addCustomerDurably");
    expect(appStore).toContain("commitDurableAppData(expected, (previous) =>");
    expect(appStore).toContain("identity.id");
    expect(appStore).toContain("identity.now");
  });

  it("usa la misma cola central al crear o editar el cliente desde un documento", () => {
    expect(documentHook).toContain(
      "upsertCustomerForDocumentWithCentralCanary",
    );
    expect(documentHook).toContain("createCustomer");
    expect(documentHook).toContain("updateCustomer");
    expect(documentForm).toContain("await upsertDocumentCustomer(");
  });

  it("conecta altas, edicion y borrado mediante autoridad central gradual", () => {
    expect(hook).toContain("createCustomerWithCentralCanary");
    expect(mutationHook).toContain("updateCustomerWithCentralCanary");
    expect(mutationHook).toContain("deleteCustomerWithCentralCanary");
    expect(customersPage).toContain("useCentralCustomerCreate");
    expect(customersPage).toContain("await createCustomer(payload)");
    expect(customersPage).toContain("await updateCustomer({");
    expect(customersPage).toContain("await deleteCustomer(deleteCandidate.id)");
    expect(newCustomerPage).toContain("useCentralCustomerCreate");
    expect(newCustomerPage).toContain("await createCustomer({");
  });

  it("carga las mutaciones centrales bajo demanda y falla de forma cerrada", () => {
    expect(hook).toContain(
      'await import(\n          "@/lib/central-business-authority/customer-create-canary"',
    );
    expect(mutationHook).toContain(
      'await import(\n          "@/lib/central-business-authority/customer-mutation-canary"',
    );
    expect(mutationHook).toContain(
      'import("@/lib/central-business-authority/durable-queue")',
    );
    expect(hook).toContain("No se ha cambiado ninguna ficha");
    expect(mutationHook).toContain("No se ha cambiado ninguna ficha");
    expect(mutationHook).toMatch(/catch \{\s+return true;\s+\}/u);
    expect(customersPage).toContain(
      "await includesCentralCustomer(selectedIds)",
    );
  });

  it("no depende de la copia completa pausada para resolver usuario central", () => {
    expect(userIdHook).toContain("getSupabaseClientAsync");
    expect(userIdHook).toContain("supabase.auth.getSession()");
    expect(userIdHook).toContain("supabase.auth.onAuthStateChange");
    expect(userIdHook).toContain("listener.subscription.unsubscribe()");
    expect(hook).toContain("useCentralBusinessResolvedUserId");
    expect(hook).toContain("await resolveCentralBusinessUserId(userId)");
    expect(hook).toContain("syncCentralBusinessEvents(resolvedUserId)");
    expect(mutationHook).toContain("useCentralBusinessResolvedUserId");
    expect(mutationHook).toContain("await resolveCentralBusinessUserId(userId)");
    expect(mutationHook).toContain("syncCentralBusinessEvents(resolvedUserId)");
  });

  it("aplica un borrado remoto con el contrato completo del maestro", () => {
    expect(eventApply).toContain("deleteCustomerMasterFromData");
    expect(appStore).toContain("deleteCustomerDurably");
    expect(appStore).toContain("updateCustomerDurably");
  });

  it("impide dobles envios mientras se confirma el guardado", () => {
    expect(customersPage).toContain("disabled={savingCustomer}");
    expect(newCustomerPage).toContain("disabled={savingCustomer}");
    expect(customersPage).toMatch(/savingCustomer\s*\?\s*"Guardando\.\.\."/u);
    expect(newCustomerPage).toMatch(/savingCustomer\s*\?\s*"Guardando\.\.\."/u);
    expect(customersPage).toContain("busy={deletingCustomer}");
  });
});
